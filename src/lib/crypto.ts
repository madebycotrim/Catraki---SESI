// ============================================================================
// MÓDULO CRIPTOGRÁFICO DE ALTA SEGURANÇA (WEB CRYPTO API NATIVA)
// Conformidade: AES-GCM-256, HMAC-SHA256, RFC 3161 TSA, Constant-Time Compare
// ============================================================================

/**
 * Converte Uint8Array para string Hexadecimal
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converte string Hexadecimal para Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '');
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Converte Uint8Array para Base64
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converte Uint8Array para Base64URL sem padding (RFC 7636 / OAuth PKCE)
 */
export function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Gera Code Challenge PKCE S256 conforme RFC 7636 (Base64URL do hash SHA-256 binário)
 */
export async function generatePkceChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as any);
  return bytesToBase64Url(new Uint8Array(hashBuffer));
}

/**
 * Gera um Code Verifier PKCE criptograficamente seguro (43-128 caracteres, RFC 7636)
 */
export function generatePkceVerifier(): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return bytesToBase64Url(randomBytes);
}

/**
 * Converte Base64 para Uint8Array
 */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Calcula SHA-256 determinístico de string ou buffer
 */
export async function sha256(data: string | Uint8Array): Promise<string> {
  const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer as any);
  return bytesToHex(new Uint8Array(hashBuffer));
}

/**
 * Calcula HMAC-SHA256 para OTP Peppered
 */
export async function hmacSha256(data: string, secretKey: string): Promise<string> {
  if (!secretKey) {
    throw new Error('HMAC secret key é obrigatória. Verifique a configuração de OTP_PEPPER/JWT_ADMIN_SECRET.');
  }
  const encoder = new TextEncoder();
  const keyBuffer = encoder.encode(secretKey);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer as any,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data) as any);
  return bytesToHex(new Uint8Array(signature));
}

/**
 * Comparação em tempo constante para prevenir timing attacks
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  let result = a.length ^ b.length;
  for (let i = 0; i < maxLen; i++) {
    const ca = i < a.length ? a.charCodeAt(i) : 0;
    const cb = i < b.length ? b.charCodeAt(i) : 0;
    result |= ca ^ cb;
  }
  return result === 0;
}

/**
 * Gera token criptográfico de 256 bits (32 bytes) em formato Hex
 */
export function generateSecureToken(byteLength = 32): string {
  const array = new Uint8Array(byteLength);
  crypto.getRandomValues(array);
  return bytesToHex(array);
}

/**
 * Gera OTP de 6 dígitos numéricos aleatórios via CSPRNG
 */
export function generateOtp(): string {
  const range = 900000;
  const maxValid = Math.floor(0x100000000 / range) * range;
  const array = new Uint32Array(1);
  let rand: number;
  do {
    crypto.getRandomValues(array);
    rand = array[0];
  } while (rand >= maxValid);
  const code = 100000 + (rand % range);
  return code.toString();
}

/**
 * Importa chave AES-GCM a partir de Base64 ou texto puro
 */
async function importAesKey(keyRaw: string): Promise<CryptoKey> {
  if (!keyRaw || !keyRaw.trim()) {
    throw new Error('AES master key cannot be empty');
  }
  let keyBytes: Uint8Array;
  try {
    keyBytes = base64ToBytes(keyRaw);
    if (keyBytes.length !== 32) {
      throw new Error('Invalid key length');
    }
  } catch {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(keyRaw) as any);
    keyBytes = new Uint8Array(hash);
  }

  return await crypto.subtle.importKey(
    'raw',
    keyBytes as any,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export interface EncryptedPayloadEnvelope {
  v: number;
  iv: string;
  ct: string;
}

/**
 * Encripta dado sensível em repouso com AES-GCM-256
 */
export async function encryptAesGcm(
  plainText: string,
  masterKey: string,
  keyVersion = 1
): Promise<string> {
  if (!plainText) return '';
  const cryptoKey = await importAesKey(masterKey);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const encodedData = new TextEncoder().encode(plainText);
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as any },
    cryptoKey,
    encodedData as any
  );

  const envelope: EncryptedPayloadEnvelope = {
    v: keyVersion,
    iv: bytesToBase64(iv),
    ct: bytesToBase64(new Uint8Array(encryptedBuffer)),
  };

  return JSON.stringify(envelope);
}

/**
 * Decripta dado sensível com AES-GCM-256
 */
export async function decryptAesGcm(
  encryptedPayloadJson: string,
  masterKey: string
): Promise<string> {
  if (!encryptedPayloadJson) return '';
  
  let envelope: EncryptedPayloadEnvelope;
  try {
    envelope = JSON.parse(encryptedPayloadJson);
  } catch {
    throw new Error('Encrypted payload is not valid JSON');
  }

  if (!envelope || !envelope.iv || !envelope.ct) {
    throw new Error('Encrypted payload envelope missing iv or ct');
  }

  const cryptoKey = await importAesKey(masterKey);
  const iv = base64ToBytes(envelope.iv);
  const cipherBytes = base64ToBytes(envelope.ct);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as any },
    cryptoKey,
    cipherBytes as any
  );

  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Serialização JSON canônica determinística com chaves ordenadas
 */
export function canonicalJson(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map((item) => (item === undefined ? 'null' : canonicalJson(item))).join(',') + ']';
  }
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
  const pairs = keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`);
  return '{' + pairs.join(',') + '}';
}

/**
 * Sanitização de metadados EXIF/ancilares de imagens (JPEG/PNG) para proteger geolocalização e PII
 */
export function stripExifFromBase64Image(base64Data: string): string {
  if (!base64Data.includes('base64,')) {
    return base64Data;
  }
  const [header, content] = base64Data.split('base64,');
  const bytes = base64ToBytes(content);

  // JPEG (SOI = 0xFF 0xD8): remove APP1 (0xE1 EXIF/XMP) e APP2 (0xE2 ICC)
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    const cleanBytes: number[] = [0xff, 0xd8];
    let i = 2;
    while (i < bytes.length) {
      if (bytes[i] === 0xff && i + 3 < bytes.length) {
        const marker = bytes[i + 1];
        if (marker === 0xe1 || marker === 0xe2) {
          const length = (bytes[i + 2] << 8) + bytes[i + 3];
          if (length >= 2 && i + 2 + length <= bytes.length) {
            i += 2 + length;
            continue;
          }
        }
      }
      cleanBytes.push(bytes[i]);
      i++;
    }
    return `${header}base64,${bytesToBase64(new Uint8Array(cleanBytes))}`;
  }

  // PNG (signature 89 50 4E 47 0D 0A 1A 0A): remove chunks de metadados (eXIf, tEXt, zTXt, iTXt, tIME)
  if (
    bytes.length > 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    const metadataChunks = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);
    const cleanBytes: number[] = Array.from(bytes.slice(0, 8));
    let i = 8;
    while (i + 12 <= bytes.length) {
      const length = ((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0;
      const chunkEnd = i + 12 + length;
      if (chunkEnd > bytes.length) {
        return base64Data;
      }
      const type = String.fromCharCode(bytes[i + 4], bytes[i + 5], bytes[i + 6], bytes[i + 7]);
      if (!metadataChunks.has(type)) {
        for (let j = i; j < chunkEnd; j++) {
          cleanBytes.push(bytes[j]);
        }
      }
      i = chunkEnd;
      if (type === 'IEND') break;
    }
    return `${header}base64,${bytesToBase64(new Uint8Array(cleanBytes))}`;
  }

  return base64Data;
}

// ============================================================================
// HASHING SEGURO DE SENHAS (PBKDF2-SHA256 — WEB CRYPTO API NATIVA)
// ============================================================================

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEY_LENGTH = 256; // 32 bytes

/**
 * Deriva um hash criptográfico seguro para senhas usando PBKDF2-SHA256 com salt aleatório.
 * Formato resultante: pbkdf2$<iterations>$<saltHex>$<derivedHex>
 */
export async function hashPasswordPbkdf2(
  password: string,
  saltHex?: string,
  iterations = PBKDF2_ITERATIONS
): Promise<string> {
  const encoder = new TextEncoder();
  let saltBytes: Uint8Array;

  if (saltHex) {
    saltBytes = hexToBytes(saltHex);
  } else {
    saltBytes = new Uint8Array(16);
    crypto.getRandomValues(saltBytes);
  }

  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password) as any,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as any,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    PBKDF2_KEY_LENGTH
  );

  const finalSaltHex = bytesToHex(saltBytes);
  const derivedHex = bytesToHex(new Uint8Array(derivedBits));

  return `pbkdf2$${iterations}$${finalSaltHex}$${derivedHex}`;
}

/**
 * Verifica se a senha em texto claro confere com o hash PBKDF2 armazenado em tempo constante.
 */
export async function verifyPasswordPbkdf2(
  password: string,
  storedHashWithSalt: string
): Promise<boolean> {
  if (!password || !storedHashWithSalt) return false;

  const parts = storedHashWithSalt.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
    // Caso o hash no banco ainda seja SHA-256 legado simples de 64 chars
    if (storedHashWithSalt.length === 64 && /^[0-9a-fA-F]{64}$/.test(storedHashWithSalt)) {
      const sha = await sha256(password);
      return constantTimeEqual(sha, storedHashWithSalt.toLowerCase());
    }
    return false;
  }

  const iterations = parseInt(parts[1], 10);
  const saltHex = parts[2];
  const expectedHashHex = parts[3];

  if (isNaN(iterations) || !saltHex || !expectedHashHex) {
    return false;
  }

  const computedFullHash = await hashPasswordPbkdf2(password, saltHex, iterations);
  const computedHashHex = computedFullHash.split('$')[3];

  return constantTimeEqual(computedHashHex, expectedHashHex);
}

// NOTA: A validação de Turnstile é feita exclusivamente via functions/utils/turnstile.ts
// A função duplicada que retornava 'true' foi removida por vulnerabilidade de segurança (CRIT-04).

/**
 * Mascaramento de endereço IP para exibição pública em conformidade com a LGPD (Minimização de Dados)
 */
export function maskIpAddress(ip?: string): string {
  if (!ip || ip.trim().length === 0) return 'IP Protegido';
  const cleanIp = ip.trim();

  if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === 'Local') {
    return '127.0.***.***';
  }

  if (cleanIp.includes('.')) {
    const parts = cleanIp.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.***`;
    }
  } else if (cleanIp.includes(':')) {
    const parts = cleanIp.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}:****:****`;
    }
  }

  return '***.***.***.***';
}

// ============================================================================
// VERIFICAÇÃO DE INTEGRIDADE DOCUMENTAL (Lei 14.063/2020 + LGPD Art. 46)
// Detecta adulteração em nível de bit entre o hash armazenado e o conteúdo atual
// ============================================================================

export interface DocumentIntegrityResult {
  intact: boolean;               // true = íntegro; false = adulteração detectada
  storedHash: string;            // Hash SHA-256 original armazenado no momento da assinatura
  recomputedHash: string;        // Hash SHA-256 recalculado do conteúdo atual
  divergenceBits?: number;       // Quantidade de bits divergentes (0 se íntegro)
  alertMessage?: string;         // Mensagem de alerta para o log de auditoria
}

/**
 * Verifica a integridade criptográfica de um documento comparando seu hash SHA-256
 * armazenado com o hash recalculado do conteúdo atual.
 *
 * Se um único bit divergir, o sistema alerta sobre adulteração e invalida a prova jurídica.
 * Conformidade: Lei 14.063/2020 Art. 4º, II; LGPD Art. 46
 */
export async function verifyDocumentIntegrity(
  storedHash: string,
  currentContent: string | Uint8Array
): Promise<DocumentIntegrityResult> {
  const recomputedHash = await sha256(currentContent);

  if (storedHash.toLowerCase() === recomputedHash.toLowerCase()) {
    return {
      intact: true,
      storedHash,
      recomputedHash,
      divergenceBits: 0,
    };
  }

  // Calcula quantos bits divergem (análise forense)
  const storedBytes = hexToBytes(storedHash.toLowerCase());
  const recomputedBytes = hexToBytes(recomputedHash.toLowerCase());
  let divergenceBits = 0;

  for (let i = 0; i < Math.min(storedBytes.length, recomputedBytes.length); i++) {
    let xor = storedBytes[i] ^ recomputedBytes[i];
    // Conta bits set no XOR (Hamming distance)
    while (xor) {
      divergenceBits += xor & 1;
      xor >>= 1;
    }
  }

  return {
    intact: false,
    storedHash,
    recomputedHash,
    divergenceBits,
    alertMessage: `ADULTERAÇÃO DETECTADA: Hash SHA-256 armazenado (${storedHash.slice(0, 16)}...) diverge do hash recalculado (${recomputedHash.slice(0, 16)}...) em ${divergenceBits} bit(s). Prova jurídica INVALIDADA. Conformidade: Lei 14.063/2020.`,
  };
}

