import { describe, it, expect } from 'vitest';
import {
  sha256,
  hmacSha256,
  constantTimeEqual,
  generateSecureToken,
  generateOtp,
  encryptAesGcm,
  decryptAesGcm,
  canonicalJson,
  generateTsaTimestampToken,
} from '../src/lib/crypto.ts';

describe('Núcleo Criptográfico SESI Saúde (crypto.ts)', () => {
  it('deve calcular hash SHA-256 determinístico corretamente', async () => {
    const hashEmpty = await sha256('');
    expect(hashEmpty).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');

    const hashText = await sha256('SESI_SAUDE_AUTORIZACAO_MEDICA_2026');
    expect(hashText).toHaveLength(64);
    expect(hashText).toMatch(/^[0-9a-f]{64}$/);
  });

  it('deve encriptar e decriptar dados sensíveis com AES-GCM-256 e chave versionada', async () => {
    const masterKey = 'SESI_MASTER_KEY_32BYTES_TEST_12345';
    const plainText = '123.456.789-09';

    const encryptedPayloadJson = await encryptAesGcm(plainText, masterKey, 1);
    expect(encryptedPayloadJson).toBeDefined();

    const envelope = JSON.parse(encryptedPayloadJson);
    expect(envelope.v).toBe(1);
    expect(envelope.iv).toBeDefined();
    expect(envelope.ct).toBeDefined();

    const decryptedText = await decryptAesGcm(encryptedPayloadJson, masterKey);
    expect(decryptedText).toBe(plainText);
  });

  it('deve comparar strings em tempo constante prevenindo timing attacks', () => {
    const secretA = 'hash_secreto_autenticacao_12345';
    const secretB = 'hash_secreto_autenticacao_12345';
    const secretWrong = 'hash_secreto_autenticacao_99999';

    expect(constantTimeEqual(secretA, secretB)).toBe(true);
    expect(constantTimeEqual(secretA, secretWrong)).toBe(false);
    expect(constantTimeEqual(secretA, 'curto')).toBe(false);
  });

  it('deve calcular HMAC-SHA256 com segredo pepper para OTP', async () => {
    const otp = '123456';
    const pepper = 'PEPPER_SECRET_KEY_SESI';

    const hmac1 = await hmacSha256(otp, pepper);
    const hmac2 = await hmacSha256(otp, pepper);
    const hmacOther = await hmacSha256('654321', pepper);

    expect(hmac1).toBe(hmac2);
    expect(hmac1).not.toBe(hmacOther);
    expect(hmac1).toHaveLength(64);
  });

  it('deve gerar tokens criptográficos seguros de 256 bits', () => {
    const token1 = generateSecureToken(32);
    const token2 = generateSecureToken(32);

    expect(token1).toHaveLength(64); // 32 bytes = 64 hex chars
    expect(token2).toHaveLength(64);
    expect(token1).not.toBe(token2);
  });

  it('deve gerar OTP numérico de 6 dígitos uniforme', () => {
    for (let i = 0; i < 20; i++) {
      const otp = generateOtp();
      expect(otp).toHaveLength(6);
      expect(parseInt(otp, 10)).toBeGreaterThanOrEqual(100000);
      expect(parseInt(otp, 10)).toBeLessThanOrEqual(999999);
    }
  });

  it('deve serializar JSON de forma canônica determinística com ordenação de chaves', () => {
    const objA = { z: 1, a: 2, m: { y: 10, b: 20 } };
    const objB = { a: 2, m: { b: 20, y: 10 }, z: 1 };

    const jsonA = canonicalJson(objA);
    const jsonB = canonicalJson(objB);

    expect(jsonA).toBe(jsonB);
    expect(jsonA).toBe('{"a":2,"m":{"b":20,"y":10},"z":1}');
  });

  it('deve gerar token de carimbo do tempo RFC 3161 assinado', async () => {
    const manifestHash = 'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef';
    const tsa = await generateTsaTimestampToken(manifestHash);

    expect(tsa.token).toBeDefined();
    expect(tsa.verified).toBe(true);
    expect(tsa.tsaName).toContain('Autoridade de Carimbo do Tempo');
  });
});
