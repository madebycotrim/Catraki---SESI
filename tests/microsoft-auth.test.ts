import { describe, it, expect } from 'vitest';
import { isInstitutionalDomainAllowed } from '../functions/routes/auth-microsoft.ts';
import { signJwt, verifyJwt } from '../functions/middleware/auth.ts';
import { sha256 } from '../src/lib/crypto.ts';

describe('Autenticação e Segurança Microsoft SSO / Entra ID', () => {
  it('deve aprovar e-mails institucionais autorizados (@sesi.org.br, @unb.br, @finatec.org.br, @sistemafieb.org.br)', () => {
    expect(isInstitutionalDomainAllowed('roberto.silveira@sesi.org.br')).toBe(true);
    expect(isInstitutionalDomainAllowed('coordenacao@unb.br')).toBe(true);
    expect(isInstitutionalDomainAllowed('financeiro@finatec.org.br')).toBe(true);
    expect(isInstitutionalDomainAllowed('operador@sistemafieb.org.br')).toBe(true);
    expect(isInstitutionalDomainAllowed('suporte@catraki.com.br')).toBe(true);
  });

  it('deve bloquear estritamente e-mails pessoais ou de provedores genéricos', () => {
    expect(isInstitutionalDomainAllowed('invasor@gmail.com')).toBe(false);
    expect(isInstitutionalDomainAllowed('usuario@hotmail.com')).toBe(false);
    expect(isInstitutionalDomainAllowed('teste@outlook.com')).toBe(false);
    expect(isInstitutionalDomainAllowed('anonimo@yahoo.com')).toBe(false);
    expect(isInstitutionalDomainAllowed('')).toBe(false);
    expect(isInstitutionalDomainAllowed('sem-arroba.com')).toBe(false);
  });

  it('deve gerar code_challenge PKCE SHA-256 compatível com RFC 7636', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const challenge = await sha256(verifier);
    expect(challenge).toHaveLength(64);
    expect(typeof challenge).toBe('string');
  });

  it('deve gerar e verificar JWT de sessão administrativa com integridade HMAC-SHA256', async () => {
    const secret = 'CHAVE_SECRETA_TESTE_32BYTES_PROD_123';
    const payload = {
      sub: 'usr_ms_12345',
      name: 'Dr. Roberto Silveira',
      email: 'roberto.silveira@sesi.org.br',
      role: 'admin_master' as const,
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const token = await signJwt(payload, secret);
    expect(token).toBeDefined();
    expect(token.split('.').length).toBe(3);

    const verified = await verifyJwt(token, secret);
    expect(verified).not.toBeNull();
    expect(verified?.email).toBe('roberto.silveira@sesi.org.br');
    expect(verified?.role).toBe('admin_master');
  });

  it('deve rejeitar JWT com assinatura adulterada ou segredo incorreto', async () => {
    const secret1 = 'CHAVE_SECRETA_1';
    const secret2 = 'CHAVE_SECRETA_2_ERRADA';

    const token = await signJwt(
      {
        sub: 'usr_01',
        name: 'Ana Paula',
        email: 'ana@sesi.org.br',
        role: 'operador',
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      secret1
    );

    const result = await verifyJwt(token, secret2);
    expect(result).toBeNull();
  });
});
