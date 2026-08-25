import { MiddlewareHandler } from 'hono';
import { hmacSha256, constantTimeEqual } from '../../src/lib/crypto.ts';
import type { AdminRole, Env } from '../../src/lib/types.ts';

export interface JwtPayload {
  sub: string;
  name: string;
  email: string;
  role: AdminRole;
  exp: number;
  iat: number;
}

/**
 * Assina um JWT usando HMAC-SHA256 com Web Crypto
 */
export async function signJwt(payload: Omit<JwtPayload, 'iat'>, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const fullPayload: JwtPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
  };

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(fullPayload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signature = await hmacSha256(dataToSign, secret);
  return `${dataToSign}.${signature}`;
}

/**
 * Valida e decodifica um JWT
 */
export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const dataToSign = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = await hmacSha256(dataToSign, secret);

    if (!constantTimeEqual(signature, expectedSignature)) {
      return null;
    }

    const payloadJson = atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson) as JwtPayload;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Middleware RBAC para proteção de rotas administrativas
 */
export function requireAuth(allowedRoles?: AdminRole[]): MiddlewareHandler<{ Bindings: Env; Variables: { user: JwtPayload } }> {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      const cookieHeader = c.req.header('Cookie') || '';
      const match = cookieHeader.match(/sesi_admin_token=([^;]+)/);
      if (match) {
        token = match[1];
      }
    }

    if (!token) {
      return c.json({ success: false, error: 'Acesso não autorizado. Autenticação obrigatória.', code: 'UNAUTHORIZED' }, 401);
    }

    const secret = c.env.JWT_ADMIN_SECRET;
    if (!secret) {
      return c.json({ success: false, error: 'Configuração de segurança do servidor incompleta (JWT_ADMIN_SECRET ausente).', code: 'SERVER_MISCONFIGURED' }, 500);
    }
    const payload = await verifyJwt(token, secret);

    if (!payload) {
      return c.json({ success: false, error: 'Sessão inválida ou expirada.', code: 'INVALID_TOKEN' }, 401);
    }

    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(payload.role)) {
      return c.json(
        {
          success: false,
          error: `Acesso negado. Seu perfil (${payload.role}) não tem permissão para este recurso.`,
          code: 'FORBIDDEN',
        },
        403
      );
    }

    // Verificação de usuário ativo no banco de dados D1 (Segurança de Sessão e Revogação Imediata)
    if (c.env.DB) {
      try {
        const dbUser = await c.env.DB.prepare(
          'SELECT is_active, role FROM admin_users WHERE (id = ? OR email = ?) AND is_active = 1'
        ).bind(payload.sub, payload.email).first<{ is_active: number; role: AdminRole }>();

        if (!dbUser) {
          return c.json(
            {
              success: false,
              error: 'Acesso revogado. Usuário administrativo inativo ou desativado.',
              code: 'USER_DEACTIVATED',
            },
            401
          );
        }

        // Garante que o role do JWT reflete o role atualizado no banco
        if (dbUser.role) {
          payload.role = dbUser.role;
        }
      } catch {
        // Fallback gracioso caso a tabela esteja em migração inicial
      }
    }

    c.set('user', payload);
    await next();
  };
}
