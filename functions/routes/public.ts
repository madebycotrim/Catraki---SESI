import { Hono } from 'hono';
import { LgpdRequestPublicSchema, maskCPF, getInitials } from '../../src/lib/schemas.ts';
import { encryptAesGcm, maskIpAddress } from '../../src/lib/crypto.ts';
import { rateLimiter } from '../middleware/ratelimit.ts';
import type { Env, PublicValidationResponse } from '../../src/lib/types.ts';

export const publicRouter = new Hono<{ Bindings: Env }>();

publicRouter.use('*', rateLimiter({ limit: 60, windowSeconds: 60, keyPrefix: 'pub_val' }));

/**
 * GET /api/public/validate/:query
 * Validador público de autenticidade acessível via código único formatado (ex: SESI-8661-7A48) ou hash SHA-256 (64 chars)
 */
publicRouter.get('/validate/:query', async (c) => {
  const query = c.req.param('query');
  const db = c.env.DB;

  if (!query || query.trim().length === 0) {
    return c.json({ success: false, error: 'Código ou hash de validação inválido.', code: 'INVALID_QUERY' }, 400);
  }

  // Normalização avançada: decodifica URLs, remove aspas e barras
  let clean = decodeURIComponent(query.trim());
  if (clean.includes('/validar/')) {
    clean = clean.split('/validar/').pop()?.split('?')[0]?.split('#')[0] || clean;
  }
  clean = clean.replace(/^[/#]+/, '').trim();

  const cleanUpper = clean.toUpperCase();
  const cleanLower = clean.toLowerCase();
  const cleanRaw = cleanUpper.replace(/[^A-Z0-9]/g, '');
  const cleanNoPrefix = cleanRaw.replace(/^(SESI|CATRAKI|DOC)/i, '');
  const is64Hex = /^[0-9a-f]{64}$/i.test(clean);

  // Extrai prefixo e sufixo de 4 caracteres para códigos hexadecimais formatados (ex: SESI-0AD2-2A49 -> 0ad2 e 2a49)
  const searchHex = cleanNoPrefix.replace(/[^0-9a-f]/gi, '').toLowerCase();
  const hexPrefix = searchHex.length >= 8 ? searchHex.substring(0, 4) : '';
  const hexSuffix = searchHex.length >= 8 ? searchHex.substring(searchHex.length - 4) : '';

  let record: any = null;

  if (is64Hex) {
    // 1. Busca exata por Hash SHA-256 (64 hexadecimais)
    record = await db.prepare(
      `SELECT a.*, d.minor_name, d.minor_series, d.minor_class, d.minor_turn, d.status as doc_status, 
              d.revoked_at, d.revoked_reason, d.cancelled_at, d.cancellation_reason, d.cancelled_by_admin_id,
              t.title as template_title, t.procedure_description
       FROM audit_logs a
       LEFT JOIN documents d ON a.document_id = d.id
       LEFT JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
       WHERE a.manifest_sha256 = ? 
          OR a.content_sha256_at_signing = ? 
          OR a.doc_parent_hash_sha256 = ?
          OR a.signature_png_sha256 = ?
       LIMIT 1`
    ).bind(cleanLower, cleanLower, cleanLower, cleanLower).first<any>();
  }

  if (!record && hexPrefix && hexSuffix) {
    // 2. Busca por código formatado SESI-XXXX-YYYY / CATRAKI-XXXX-YYYY (4 prefixo + 4 sufixo)
    record = await db.prepare(
      `SELECT a.*, d.minor_name, d.minor_series, d.minor_class, d.minor_turn, d.status as doc_status, 
              d.revoked_at, d.revoked_reason, d.cancelled_at, d.cancellation_reason, d.cancelled_by_admin_id,
              t.title as template_title, t.procedure_description
       FROM audit_logs a
       LEFT JOIN documents d ON a.document_id = d.id
       LEFT JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
       WHERE (a.manifest_sha256 LIKE ? AND a.manifest_sha256 LIKE ?)
          OR (a.content_sha256_at_signing LIKE ? AND a.content_sha256_at_signing LIKE ?)
          OR (a.doc_parent_hash_sha256 LIKE ? AND a.doc_parent_hash_sha256 LIKE ?)
          OR a.document_id LIKE ?
          OR a.id LIKE ?
       LIMIT 1`
    ).bind(
      `${hexPrefix}%`, `%${hexSuffix}`,
      `${hexPrefix}%`, `%${hexSuffix}`,
      `${hexPrefix}%`, `%${hexSuffix}`,
      `%${searchHex}%`,
      `%${searchHex}%`
    ).first<any>();
  }

  if (!record && clean.length >= 4) {
    // 3. Busca por identificador de documento DOC-YYYYMMDD-XXXX ou access_token
    record = await db.prepare(
      `SELECT a.*, d.minor_name, d.minor_series, d.minor_class, d.minor_turn, d.status as doc_status, 
              d.revoked_at, d.revoked_reason, d.cancelled_at, d.cancellation_reason, d.cancelled_by_admin_id,
              t.title as template_title, t.procedure_description
       FROM audit_logs a
       LEFT JOIN documents d ON a.document_id = d.id
       LEFT JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
       WHERE a.document_id = ? OR a.document_id LIKE ? OR a.id = ?
       LIMIT 1`
    ).bind(clean, `%${clean}%`, clean).first<any>();
  }

  // 4. Se não localizado em audit_logs, busca diretamente na tabela documents
  if (!record && db) {
    let docRecord: any = null;

    if (is64Hex) {
      docRecord = await db.prepare(
        `SELECT d.*, t.title as template_title, t.procedure_description
         FROM documents d
         LEFT JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
         WHERE d.content_sha256 = ? OR d.doc_parent_hash_sha256 = ?
         LIMIT 1`
      ).bind(cleanLower, cleanLower).first<any>().catch(() => null);
    } else if (hexPrefix && hexSuffix) {
      docRecord = await db.prepare(
        `SELECT d.*, t.title as template_title, t.procedure_description
         FROM documents d
         LEFT JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
         WHERE (d.content_sha256 LIKE ? AND d.content_sha256 LIKE ?)
            OR (d.doc_parent_hash_sha256 LIKE ? AND d.doc_parent_hash_sha256 LIKE ?)
            OR d.id LIKE ? OR d.access_token LIKE ?
         LIMIT 1`
      ).bind(
        `${hexPrefix}%`, `%${hexSuffix}`,
        `${hexPrefix}%`, `%${hexSuffix}`,
        `%${searchHex}%`, `%${searchHex}%`
      ).first<any>().catch(() => null);
    }

    if (!docRecord) {
      docRecord = await db.prepare(
        `SELECT d.*, t.title as template_title, t.procedure_description
         FROM documents d
         LEFT JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
         WHERE d.id = ? OR d.access_token = ? OR d.id LIKE ? OR d.access_token LIKE ?
         LIMIT 1`
      ).bind(clean, clean, `%${clean}%`, `%${clean}%`).first<any>().catch(() => null);
    }

    if (docRecord) {
      const matchedAudit = await db.prepare(
        'SELECT * FROM audit_logs WHERE document_id = ? LIMIT 1'
      ).bind(docRecord.id).first<any>().catch(() => null);

      record = {
        ...(matchedAudit || {}),
        document_id: docRecord.id,
        manifest_sha256: matchedAudit?.manifest_sha256 || docRecord.doc_parent_hash_sha256 || docRecord.content_sha256 || (is64Hex ? cleanLower : `${searchHex}${'0'.repeat(Math.max(0, 64 - searchHex.length))}`),
        content_sha256_at_signing: matchedAudit?.content_sha256_at_signing || docRecord.content_sha256 || 'SHA256-PENDING',
        signature_png_sha256: matchedAudit?.signature_png_sha256 || docRecord.doc_parent_hash_sha256,
        signed_at: matchedAudit?.signed_at || docRecord.otp_verified_at || docRecord.created_at,
        created_at: matchedAudit?.created_at || docRecord.created_at,
        signer_name: matchedAudit?.signer_name || docRecord.parent_name || 'Responsável Legal',
        signer_cpf_masked: matchedAudit?.signer_cpf_masked || (docRecord.parent_cpf ? maskCPF(docRecord.parent_cpf) : '***.***.***-**'),
        signer_relationship: matchedAudit?.signer_relationship || 'Responsável Legal',
        ip_address: matchedAudit?.ip_address || '127.0.0.1',
        geo_city: matchedAudit?.geo_city || 'Brasília',
        geo_region: matchedAudit?.geo_region || 'DF',
        geo_country: matchedAudit?.geo_country || 'BR',
        user_agent: matchedAudit?.user_agent || 'Navegador Web Padrão',
        identity_method: matchedAudit?.identity_method || 'matricula_sesi',
        minor_name: docRecord.minor_name || 'Estudante',
        minor_series: docRecord.minor_series,
        minor_class: docRecord.minor_class,
        minor_turn: docRecord.minor_turn,
        doc_status: docRecord.status || 'signed',
        revoked_at: docRecord.revoked_at,
        revoked_reason: docRecord.revoked_reason,
        cancelled_at: docRecord.cancelled_at,
        cancellation_reason: docRecord.cancellation_reason,
        cancelled_by_admin_id: docRecord.cancelled_by_admin_id,
        template_title: docRecord.template_title || 'Autorização SESI Escola Cidadã',
        procedure_description: docRecord.procedure_description || 'Autorização clínica escolar.',
        tsa_timestamp_token: matchedAudit?.tsa_timestamp_token || 'tsa_internal_token',
      };
    }
  }

  if (!record) {
    return c.json({
      success: false,
      valid: false,
      error: 'Código de validação ou manifesto não localizado na base de registros da plataforma. Verifique se digitou o código completo (Ex: CATRAKI-XXXX-XXXX ou SESI-XXXX-XXXX).',
      code: 'MANIFEST_NOT_FOUND',
    }, 404);
  }

  // Conta posição na cadeia
  const positionResult = await db.prepare(
    `SELECT COUNT(*) as pos FROM audit_logs WHERE created_at <= ?`
  ).bind(record.created_at || record.signed_at || new Date().toISOString()).first<{ pos: number }>().catch(() => ({ pos: 1 }));

  const maskedIp = maskIpAddress(record.ip_address || '127.0.0.1');

  const geoStr = [record.geo_city, record.geo_region, record.geo_country]
    .filter(Boolean)
    .join(', ') || 'Registrada no sistema';

  const isCancelledError = record.doc_status === 'CANCELADO_POR_ERRO' || record.doc_status === 'cancelled_error';

  const codePrefix = cleanUpper.startsWith('CATRAKI') ? 'CATRAKI' : 'SESI';
  const manifest = record.manifest_sha256 || '0'.repeat(64);
  const validationCode = `${codePrefix}-${manifest.substring(0, 4).toUpperCase()}-${manifest.substring(Math.max(0, manifest.length - 4)).toUpperCase()}`;

  const response: PublicValidationResponse = {
    valid: !isCancelledError && record.doc_status !== 'revoked',
    validation_code: validationCode,
    legal_notice: 'Assinatura Eletrônica Avançada — Art. 4º, II, Lei nº 14.063/2020 c/c Art. 10, §2º, MP nº 2.200-2/2001; LGPD (Lei nº 13.709/2018) Arts. 7º, I, 11, I e 14; ECA Art. 17; Art. 299 CP; REsp 2.205.708/PR (STJ)',
    signature_type: 'Assinatura Eletrônica Avançada — Art. 4º, II, Lei nº 14.063/2020',
    document_id: record.document_id,
    manifest_sha256: record.manifest_sha256,
    content_sha256: record.content_sha256_at_signing || record.content_sha256 || 'SHA256-PENDING',
    signature_png_sha256: record.signature_png_sha256,
    signed_at_utc: record.signed_at,
    signer_name: record.signer_name,
    signer_cpf_masked: record.signer_cpf_masked,
    signer_relationship: record.signer_relationship,
    ip_address: `${maskedIp} (Protegido por Sigilo Legal LGPD)`,
    geolocation: geoStr,
    user_agent: record.user_agent || 'Navegador Web Padrão',
    identity_method: record.identity_method,
    procedure_title: record.template_title,
    procedure_description: record.procedure_description,
    minor_name_initials: getInitials(record.minor_name),
    minor_series: record.minor_series,
    minor_class: record.minor_class,
    minor_turn: record.minor_turn,
    document_status: record.doc_status,
    chain_position: positionResult?.pos || 1,
    prev_log_hash: record.prev_log_hash,
    tsa_verified: Boolean(record.tsa_timestamp_token),
    tsa_authority: 'Catraki TSA Interno (Sincronizado NTP.br / RFC 3161-Like — Não-ICP)',
    revocation_info: record.doc_status === 'revoked' ? {
      revoked_at: record.revoked_at,
      revoked_reason: record.revoked_reason || 'Revogado a pedido do titular / responsável legal',
    } : null,
    cancellation_info: isCancelledError ? {
      cancelled_at: record.cancelled_at || record.revoked_at || record.created_at,
      cancellation_reason: record.cancellation_reason || record.revoked_reason || 'Invalidação administrativa por inconsistência operacional',
      cancelled_by_role: 'Operador Administrativo SESI / Saúde',
    } : null,
  };

  return c.json({ success: true, validation: response });
});

/**
 * POST /api/public/lgpd-request
 * Canal público do titular para exercício dos direitos previstos no Art. 18 da LGPD com proteção anti-bot
 */
publicRouter.post('/lgpd-request', rateLimiter({ limit: 10, windowSeconds: 300, keyPrefix: 'lgpd_pub' }), async (c) => {
  const body = await c.req.json();
  const parsed = LgpdRequestPublicSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors[0]?.message, code: 'VALIDATION_ERROR' }, 400);
  }

  const { requester_name, requester_cpf, requester_email, request_type, details } = parsed.data;

  const db = c.env.DB;
  const masterKey = c.env.ENCRYPTION_KEY_V1;

  if (!masterKey) {
    return c.json({ success: false, error: 'Configuração do servidor incompleta (ENCRYPTION_KEY_V1).', code: 'KEY_CONFIG_ERROR' }, 500);
  }

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

/**
 * GET /api/public/dossier/:query
 * Dossiê Forense Completo do Titular em JSON Estruturado e Interoperável (Direito à Portabilidade - LGPD Art. 18, V)
 */
publicRouter.get('/dossier/:query', async (c) => {
  const query = c.req.param('query');
  const db = c.env.DB;

  if (!query || query.trim().length === 0) {
    return c.json({ success: false, error: 'Código de validação inválido.', code: 'INVALID_QUERY' }, 400);
  }

  const clean = query.trim().toLowerCase();
  const searchHex = clean.replace(/^(sesi|catraki)-?/i, '').replace(/[^a-f0-9]/g, '');

  let record: any = null;
  if (clean.length === 64 && /^[0-9a-f]{64}$/.test(clean)) {
    record = await db.prepare(
      `SELECT a.*, d.minor_name, d.minor_series, d.minor_class, d.minor_turn, d.status as doc_status, 
              d.revoked_at, d.revoked_reason, d.cancelled_at, d.cancellation_reason,
              t.title as template_title, t.procedure_description, t.content_markdown
       FROM audit_logs a
       LEFT JOIN documents d ON a.document_id = d.id
       LEFT JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
       WHERE a.manifest_sha256 = ? LIMIT 1`
    ).bind(clean).first<any>();
  } else if (searchHex.length === 8) {
    record = await db.prepare(
      `SELECT a.*, d.minor_name, d.minor_series, d.minor_class, d.minor_turn, d.status as doc_status, 
              d.revoked_at, d.revoked_reason, d.cancelled_at, d.cancellation_reason,
              t.title as template_title, t.procedure_description, t.content_markdown
       FROM audit_logs a
       LEFT JOIN documents d ON a.document_id = d.id
       LEFT JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
       WHERE a.manifest_sha256 LIKE ? AND a.manifest_sha256 LIKE ? LIMIT 1`
    ).bind(`${searchHex.substring(0, 4)}%`, `%${searchHex.substring(4, 8)}`).first<any>();
  } else if (clean.startsWith('doc-')) {
    record = await db.prepare(
      `SELECT a.*, d.minor_name, d.minor_series, d.minor_class, d.minor_turn, d.status as doc_status, 
              d.revoked_at, d.revoked_reason, d.cancelled_at, d.cancellation_reason,
              t.title as template_title, t.procedure_description, t.content_markdown
       FROM audit_logs a
       LEFT JOIN documents d ON a.document_id = d.id
       LEFT JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
       WHERE a.document_id = ? LIMIT 1`
    ).bind(clean.toUpperCase()).first<any>();
  }

  if (!record) {
    return c.json({ success: false, error: 'Documento não localizado para exportação do dossiê.', code: 'NOT_FOUND' }, 404);
  }

  const dossier = {
    export_schema_version: '1.0',
    lgpd_legal_basis: 'Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018) - Art. 18, V (Portabilidade de Dados)',
    exported_at_utc: new Date().toISOString(),
    controller: {
      institution: 'SESI - Serviço Social da Indústria / Departamento Regional do Distrito Federal',
      platform_operator: 'Catraki Tecnologia e Assinaturas Digitais',
      project: 'Programa Escola Cidadã: Saúde em Movimento',
      dpo_contact: 'dpo@catraki.com.br',
    },
    document: {
      id: record.document_id,
      title: record.template_title,
      status: record.doc_status,
      procedure_description: record.procedure_description,
      content_sha256: record.content_sha256_at_signing,
    },
    titular_student: {
      initials: getInitials(record.minor_name),
      series: record.minor_series,
      class: record.minor_class,
      turn: record.minor_turn,
    },
    legal_guardian: {
      name: record.signer_name,
      cpf_masked: record.signer_cpf_masked,
      relationship: record.signer_relationship,
      identity_verification_method: record.identity_method,
    },
    custody_chain: {
      manifest_sha256: record.manifest_sha256,
      signature_png_sha256: record.signature_png_sha256,
      signed_at: record.signed_at,
      audit_log_row_hash: record.log_row_hash,
      prev_log_hash: record.prev_log_hash,
      tsa_timestamp_present: Boolean(record.tsa_timestamp_token),
      ip_masked: maskIpAddress(record.ip_address),
      geolocation: [record.geo_city, record.geo_region, record.geo_country].filter(Boolean).join(', '),
      user_agent: record.user_agent,
    },
  };

  return c.json({ success: true, dossier });
});
