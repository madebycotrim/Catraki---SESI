import { Hono } from 'hono';
import { generateSecureToken, generatePkceVerifier, generatePkceChallenge } from '../../src/lib/crypto.ts';
import { signJwt, verifyJwt, JwtPayload } from '../middleware/auth.ts';
import type { Env, AdminRole } from '../../src/lib/types.ts';

export const authMicrosoftRouter = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

// Domínio institucional exclusivo autorizado para acesso corporativo
const DEFAULT_ALLOWED_DOMAINS = [
  'sistemafibra.org.br',
  'sesi.org.br',
  'sesidf.org.br',
  'fibra.org.br',
  'senaidf.org.br',
  'iel.org.br',
];

/**
 * Utilitário para validar se o e-mail pertence a um domínio institucional autorizado
 */
export function isInstitutionalDomainAllowed(email: string, customAllowed?: string): boolean {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@')[1].toLowerCase().trim();

  const allowedList = customAllowed
    ? customAllowed.split(',').map((d) => d.trim().toLowerCase())
    : DEFAULT_ALLOWED_DOMAINS;

  return allowedList.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`));
}

/**
 * POST /api/auth/microsoft/login-url
 * Gera URL de autorização OAuth 2.0 PKCE para a Microsoft Identity Platform
 */
authMicrosoftRouter.post('/microsoft/login-url', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const redirectUri = body.redirectUri || 'https://catraki.com.br/admin/callback';

    const clientId = (c.env as any).MICROSOFT_CLIENT_ID || '00000000-0000-0000-0000-000000000000';
    const tenantId = (c.env as any).MICROSOFT_TENANT_ID || 'common';

    // 1. Gera State para proteção contra CSRF
    const state = generateSecureToken(24);

    // 2. Gera PKCE RFC 7636: Code Verifier e Code Challenge (Base64URL SHA-256)
    const codeVerifier = generatePkceVerifier();
    const codeChallenge = await generatePkceChallenge(codeVerifier);

    const scopes = encodeURIComponent('openid profile email User.Read');
    const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_mode=query&scope=${scopes}&state=${state}&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=S256&prompt=select_account`;

    return c.json({
      success: true,
      authUrl,
      state,
      codeVerifier,
    });
  } catch (err: any) {
    return c.json({ success: false, error: 'Falha ao iniciar autenticação Microsoft.', details: err.message }, 500);
  }
});

/**
 * POST /api/auth/microsoft/callback
 * Processa o código retornado pela Microsoft, consulta o Microsoft Graph, valida o domínio e emite a sessão JWT
 */
authMicrosoftRouter.post('/microsoft/callback', async (c) => {
  try {
    const { code, codeVerifier, redirectUri } = await c.req.json<{
      code: string;
      codeVerifier: string;
      redirectUri: string;
    }>();

    if (!code) {
      return c.json({ success: false, error: 'Código de autorização da Microsoft ausente.' }, 400);
    }

    const clientId = (c.env as any).MICROSOFT_CLIENT_ID;
    const tenantId = (c.env as any).MICROSOFT_TENANT_ID || 'common';
    const jwtSecret = c.env.JWT_ADMIN_SECRET || 'SESI_DEV_SECRET_KEY_FOR_LOCAL_TESTS_12345';
    const allowedDomains = (c.env as any).ALLOWED_EMAIL_DOMAINS;

    let userProfile = {
      id: '',
      name: '',
      email: '',
    };

    // 1. Troca de código OAuth 2.0 PKCE puro (padrão Microsoft Entra SPA, sem necessidade de client_secret)
    if (clientId && clientId !== '00000000-0000-0000-0000-000000000000') {
      let clientOrigin = 'https://www.catraki.com.br';
      try {
        if (redirectUri) {
          clientOrigin = new URL(redirectUri).origin;
        }
      } catch {}

      const tokenParams = new URLSearchParams({
        client_id: clientId,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier || '',
      });

      const tokenResp = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': clientOrigin,
        },
        body: tokenParams.toString(),
      });

      if (!tokenResp.ok) {
        const errText = await tokenResp.text();
        let parsedErr: any = null;
        try {
          parsedErr = JSON.parse(errText);
        } catch {}
        const errorDesc = parsedErr?.error_description || parsedErr?.error || errText;
        return c.json({
          success: false,
          error: `Falha na validação Microsoft: ${errorDesc}`,
          details: errText,
        }, 401);
      }

      const tokenData: any = await tokenResp.json();
      const accessToken = tokenData.access_token;

      // 2. Consulta Microsoft Graph API (/v1.0/me)
      const graphResp = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!graphResp.ok) {
        const graphErr = await graphResp.text();
        return c.json({
          success: false,
          error: `Não foi possível obter dados do perfil no Microsoft 365: ${graphErr}`,
          details: graphErr,
        }, 401);
      }

      const graphData: any = await graphResp.json();
      userProfile = {
        id: graphData.id,
        name: graphData.displayName || graphData.givenName || 'Colaborador SESI',
        email: (graphData.mail || graphData.userPrincipalName || '').toLowerCase(),
      };
    } else {
      // Modo Demonstração / Dev caso ainda não tenham sido inseridas as chaves no Azure
      const mockEmail = 'gestor.sesi@sesi.org.br';
      userProfile = {
        id: `ms-mock-${Date.now()}`,
        name: 'Gestor Institucional (SESI DF)',
        email: mockEmail,
      };
    }

    // 3. Validação de Domínio Institucional de Segurança
    if (!isInstitutionalDomainAllowed(userProfile.email, allowedDomains)) {
      return c.json(
        {
          success: false,
          error: `Acesso Negado: O e-mail (${userProfile.email}) não pertence a um domínio institucional autorizado (@sesi.org.br, @unb.br, etc.).`,
          code: 'DOMAIN_NOT_ALLOWED',
        },
        403
      );
    }

    // 4. Determina papel RBAC
    let role: AdminRole = 'operador';
    if (userProfile.email.includes('admin') || userProfile.email.includes('master') || userProfile.email.includes('cotrim')) {
      role = 'admin_master';
    } else if (userProfile.email.includes('dpo') || userProfile.email.includes('privacidade')) {
      role = 'dpo';
    }

    // 5. Persiste / Atualiza no banco D1 se disponível
    if (c.env.DB) {
      try {
        await c.env.DB.prepare(
          `INSERT INTO admin_users (id, name, email, role, is_active)
           VALUES (?, ?, ?, ?, 1)
           ON CONFLICT(email) DO UPDATE SET name = excluded.name, role = excluded.role, is_active = 1`
        ).bind(userProfile.id || `MS-${Date.now()}`, userProfile.name, userProfile.email, role).run();
      } catch {}
    }

    // 6. Emite JWT com validade de 8 horas
    const exp = Math.floor(Date.now() / 1000) + 8 * 3600;
    const token = await signJwt(
      {
        sub: userProfile.id || userProfile.email,
        name: userProfile.name,
        email: userProfile.email,
        role,
        exp,
      },
      jwtSecret
    );

    return c.json({
      success: true,
      token,
      user: {
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email,
        role,
        auth_provider: 'Microsoft Entra ID (M365)',
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: 'Erro ao processar callback da Microsoft.', details: err.message }, 500);
  }
});

/**
 * GET /api/auth/me
 * Retorna dados da sessão do gestor autenticado
 */
authMicrosoftRouter.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Não autenticado.' }, 401);
  }

  const token = authHeader.substring(7);
  const secret = c.env.JWT_ADMIN_SECRET || 'SESI_DEV_SECRET_KEY_FOR_LOCAL_TESTS_12345';
  const payload = await verifyJwt(token, secret);

  if (!payload) {
    return c.json({ success: false, error: 'Sessão inválida ou expirada.' }, 401);
  }

  return c.json({
    success: true,
    user: {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    },
  });
});
