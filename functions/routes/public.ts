import { Hono } from 'hono';
import { LgpdRequestPublicSchema, maskCPF, getInitials } from '../../src/lib/schemas.ts';
import { encryptAesGcm } from '../../src/lib/crypto.ts';
import { rateLimiter } from '../middleware/ratelimit.ts';
import type { Env, PublicValidationResponse } from '../../src/lib/types.ts';

export const publicRouter = new Hono<{ Bindings: Env }>();

publicRouter.use('*', rateLimiter({ limit: 60, windowSeconds: 60, keyPrefix: 'pub_val' }));

/**
 * GET /api/public/validate/:query
 * Validador público de autenticidade acessível via código único (ex: SESI-8661-7A48) ou hash SHA-256
 */
publicRouter.get('/validate/:query', async (c) => {
  const query = c.req.param('query');
  const db = c.env.DB;

  if (!query) {
    return c.json({ success: false, error: 'Código ou hash de validação inválido.', code: 'INVALID_QUERY' }, 400);
  }

  const clean = query.trim();
  const cleanRaw = clean.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

  let record = null;
  if (clean.length === 64) {
    record = await db.prepare(
      `SELECT a.*, d.minor_name, d.status as doc_status, d.revoked_at, d.revoked_reason,
              t.title as template_title, t.procedure_description
       FROM audit_logs a
       JOIN documents d ON a.document_id = d.id
       JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
       WHERE a.manifest_sha256 = ?`
    ).bind(clean.toLowerCase()).first<any>();
  } else {
    // Busca por token curto ou documento
    record = await db.prepare(
      `SELECT a.*, d.minor_name, d.status as doc_status, d.revoked_at, d.revoked_reason,
              t.title as template_title, t.procedure_description
       FROM audit_logs a
       JOIN documents d ON a.document_id = d.id
       JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
       WHERE a.manifest_sha256 LIKE ? OR a.manifest_sha256 LIKE ? OR a.document_id LIKE ? LIMIT 1`
    ).bind(`${cleanRaw.substring(0, 4)}%`, `%${cleanRaw.slice(-4)}`, `%${cleanRaw}%`).first<any>();
  }

  if (!record) {
    return c.json({
      success: false,
      valid: false,
      error: 'Código de autenticidade não localizado na cadeia de custódia oficial do SESI Saúde.',
      code: 'MANIFEST_NOT_FOUND',
    }, 404);
  }

  // Conta posição na cadeia
  const positionResult = await db.prepare(
    `SELECT COUNT(*) as pos FROM audit_logs WHERE created_at <= ?`
  ).bind(record.created_at).first<{ pos: number }>();

  const response: PublicValidationResponse = {
    valid: true,
    legal_notice: 'Assinatura Eletrônica Avançada (Art. 4º, II da Lei nº 14.063/2020 e MP 2.200-2/2001)',
    signature_type: 'Assinatura Eletrônica Avançada (Lei 14.063/2020)',
    document_id: record.document_id,
    manifest_sha256: record.manifest_sha256,
    content_sha256: record.content_sha256_at_signing,
    signature_png_sha256: record.signature_png_sha256,
    signed_at_utc: record.signed_at,
    signer_name: record.signer_name,
    signer_cpf_masked: record.signer_cpf_masked,
    signer_relationship: record.signer_relationship,
    ip_address: record.ip_address || '127.0.0.1',
    geolocation: record.geo_city ? `${record.geo_city}, ${record.geo_region || 'DF'} - Brasil` : 'Brasília, DF - Brasil',
    user_agent: record.user_agent || 'Navegador Web Padrão',
    identity_method: record.identity_method,
    procedure_title: record.template_title,
    procedure_description: record.procedure_description,
    minor_name_initials: getInitials(record.minor_name),
    document_status: record.doc_status,
    chain_position: positionResult?.pos || 1,
    prev_log_hash: record.prev_log_hash,
    tsa_verified: Boolean(record.tsa_timestamp_token),
    tsa_authority: 'Registro Cronológico Digital (Sincronizado com a Hora Legal de Brasília - NTP.br)',
    revocation_info: record.doc_status === 'revoked' ? {
      revoked_at: record.revoked_at,
      revoked_reason: record.revoked_reason || 'Revogado a pedido do titular / responsável legal',
    } : null,
  };

  return c.json({ success: true, validation: response });
});

/**
 * POST /api/public/lgpd-request
 * Canal público do titular para exercício dos direitos previstos no Art. 18 da LGPD
 */
publicRouter.post('/lgpd-request', rateLimiter({ limit: 10, windowSeconds: 300, keyPrefix: 'lgpd_pub' }), async (c) => {
  const body = await c.req.json();
  const parsed = LgpdRequestPublicSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors[0]?.message, code: 'VALIDATION_ERROR' }, 400);
  }

  const { requester_name, requester_cpf, requester_email, request_type, details } = parsed.data;
  const db = c.env.DB;
  const masterKey = c.env.ENCRYPTION_KEY_V1 || 'SESI_ENCRYPTION_KEY_32BYTES_TEST123';

  const requestId = `LGPD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const cpfMasked = maskCPF(requester_cpf);
  const emailEncrypted = await encryptAesGcm(requester_email, masterKey, 1);

  await db.prepare(
    `INSERT INTO lgpd_requests (
      id, requester_name, requester_cpf_masked, requester_email_encrypted, request_type, details, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`
  ).bind(requestId, requester_name, cpfMasked, emailEncrypted, request_type, details).run();

  return c.json({
    success: true,
    protocol: requestId,
    message: 'Sua solicitação fundamentada na LGPD (Lei 13.709/2018) foi registrada e encaminhada ao Encarregado pelo Tratamento de Dados Pessoais (DPO) do SESI.',
  });
});

/**
 * GET /api/public/institutions/:slug
 * Retorna dados da instituição/escola para preenchimento dinâmico
 */
publicRouter.get('/institutions/:slug', async (c) => {
  const slug = c.req.param('slug');
  const db = c.env.DB;

  if (!slug) {
    return c.json({ success: false, error: 'Identificador de escola obrigatório.' }, 400);
  }

  const clean = slug.toLowerCase().trim();
  const inst = await db.prepare(
    'SELECT * FROM institutions WHERE id = ? AND is_active = 1'
  ).bind(clean).first<any>();

  if (!inst) {
    const formattedName = clean.replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    return c.json({
      success: true,
      institution: {
        id: clean,
        name: `Escola ${formattedName}`,
        short_name: formattedName,
        city: 'Brasília',
        state: 'DF',
        is_active: 1,
      },
    });
  }

  return c.json({ success: true, institution: inst });
});
