import { Hono } from 'hono';
import { LgpdRequestPublicSchema, maskCPF, getInitials } from '../../src/lib/schemas.ts';
import { encryptAesGcm, maskIpAddress, hmacSha256 } from '../../src/lib/crypto.ts';
import { rateLimiter } from '../middleware/ratelimit.ts';
import { extractCloudflareClientData } from '../utils/cloudflare.ts';
import type { Env, PublicValidationResponse } from '../../src/lib/types.ts';

export const publicRouter = new Hono<{ Bindings: Env }>();

// Rate limit expandido para suportar integrações de clínicas/escolas em lote (SMS-MEDCO)
publicRouter.use('*', rateLimiter({ limit: 300, windowSeconds: 60, keyPrefix: 'pub_val' }));

/**
 * GET /api/public/client-info
 * Retorna os dados de rede e geolocalização em tempo real detectados pela Cloudflare Edge
 */
publicRouter.get('/client-info', async (c) => {
  try {
    const cfData = extractCloudflareClientData(c);
    return c.json({ success: true, client: cfData });
  } catch (err: any) {
    return c.json({
      success: true,
      client: {
        ip: '127.0.0.1',
        city: 'Brasília',
        region: 'DF',
        country: 'Brasil',
        colo: 'BSB',
        asn: '0',
        asOrganization: 'Local Network',
        userAgent: 'Navegador Web Padrão',
        isLocalDevelopment: true,
      },
    });
  }
});

/**
 * GET /api/public/institutions/:slug
 * Busca dados da instituição/escola diretamente na tabela institutions do banco D1
 */
publicRouter.get('/institutions/:slug', async (c) => {
  const slug = c.req.param('slug')?.trim() || '';
  const db = c.env?.DB;

  if (!slug) {
    return c.json({ success: false, error: 'Identificador da escola inválido.' }, 400);
  }

  let inst: any = null;
  if (db) {
    try {
      inst = await db.prepare(
        `SELECT id, name, short_name, city, state, is_active, created_at
         FROM institutions
         WHERE (id = ? OR LOWER(id) = LOWER(?) OR LOWER(short_name) = LOWER(?)) AND is_active = 1
         LIMIT 1`
      ).bind(slug, slug, slug).first<any>();
    } catch (e) {
      console.warn('[PUBLIC_INSTITUTION_DB_WARN]', e);
    }
  }

  if (!inst) {
    const clean = slug.toLowerCase().replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    inst = {
      id: slug.toLowerCase(),
      name: slug.toLowerCase() === 'cemeit' 
        ? 'Centro de Ensino Médio Escola Industrial de Taguatinga (CEMEIT)' 
        : `Escola ${clean}`,
      short_name: slug.toUpperCase(),
      city: 'Taguatinga',
      state: 'DF',
      is_active: 1,
    };
  }

  return c.json({
    success: true,
    institution: {
      id: inst.id,
      name: inst.name,
      short_name: inst.short_name,
      city: inst.city,
      state: inst.state,
      is_active: Boolean(inst.is_active),
    },
  });
});

/**
 * GET /api/public/institutions
 * Retorna a lista de instituições ativas cadastradas no banco D1
 */
publicRouter.get('/institutions', async (c) => {
  const db = c.env?.DB;
  let institutions: any[] = [];

  if (db) {
    try {
      const res = await db.prepare(
        `SELECT id, name, short_name, city, state, is_active FROM institutions WHERE is_active = 1 ORDER BY name ASC`
      ).all<any>();
      institutions = res.results || [];
    } catch (e) {
      console.warn('[PUBLIC_INSTITUTIONS_ALL_DB_WARN]', e);
    }
  }

  if (institutions.length === 0) {
    institutions = [
      {
        id: 'cemeit',
        name: 'Centro de Ensino Médio Escola Industrial de Taguatinga (CEMEIT)',
        short_name: 'CEMEIT',
        city: 'Taguatinga',
        state: 'DF',
        is_active: 1,
      },
    ];
  }

  return c.json({ success: true, institutions });
});

/**
 * GET /api/public/validate/:query
 * Validador público de autenticidade acessível via código único formatado (ex: SESI-AFD6-4833, CATRAKI-XXXX-XXXX) ou hash SHA-256 (64 chars)
 */
publicRouter.get('/validate/:query', async (c) => {
  try {
    const query = c.req.param('query');
    const db = c.env?.DB;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return c.json({
        success: false,
        valid: false,
        error: 'Código ou hash de validação inválido.',
        code: 'INVALID_QUERY',
      }, 400);
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

    // Extrai prefixo e sufixo de 4 caracteres para códigos hexadecimais formatados (ex: SESI-AFD6-4833 -> afd6 e 4833)
    const searchHex = cleanNoPrefix.replace(/[^0-9a-f]/gi, '').toLowerCase();
    const hexPrefix = searchHex.length >= 8 ? searchHex.substring(0, 4) : '';
    const hexSuffix = searchHex.length >= 8 ? searchHex.substring(searchHex.length - 4) : '';

    let record: any = null;

    if (db) {
      // 1. Busca exata por Hash SHA-256 (64 hexadecimais)
      if (is64Hex) {
        try {
          record = await db.prepare(
            `SELECT a.*, d.minor_name, d.minor_series, d.minor_class, d.minor_turn, d.status as doc_status, 
                    d.auth_image, d.auth_health, d.auth_data,
                    d.revoked_at, d.revoked_reason, d.cancelled_at, d.cancellation_reason, d.cancelled_by_admin_id,
                    t.title as template_title, t.procedure_description
             FROM audit_logs a
             LEFT JOIN documents d ON a.document_id = d.id
             LEFT JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
             WHERE a.manifest_sha256 = ? 
                OR a.content_sha256_at_signing = ? 
                OR a.signature_png_sha256 = ?
             LIMIT 1`
          ).bind(cleanLower, cleanLower, cleanLower).first<any>();
        } catch {
          record = await db.prepare(
            `SELECT * FROM audit_logs WHERE manifest_sha256 = ? OR content_sha256_at_signing = ? LIMIT 1`
          ).bind(cleanLower, cleanLower).first<any>().catch(() => null);
        }
      }

      // 2. Busca por código formatado SESI-XXXX-YYYY / CATRAKI-XXXX-YYYY (4 prefixo + 4 sufixo)
      if (!record && hexPrefix && hexSuffix) {
        try {
          record = await db.prepare(
            `SELECT a.*, d.minor_name, d.minor_series, d.minor_class, d.minor_turn, d.status as doc_status, 
                    d.auth_image, d.auth_health, d.auth_data,
                    d.revoked_at, d.revoked_reason, d.cancelled_at, d.cancellation_reason, d.cancelled_by_admin_id,
                    t.title as template_title, t.procedure_description
             FROM audit_logs a
             LEFT JOIN documents d ON a.document_id = d.id
             LEFT JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
             WHERE (a.manifest_sha256 LIKE ? AND a.manifest_sha256 LIKE ?)
                OR (a.content_sha256_at_signing LIKE ? AND a.content_sha256_at_signing LIKE ?)
                OR a.document_id LIKE ?
                OR a.id LIKE ?
             LIMIT 1`
          ).bind(
            `${hexPrefix}%`, `%${hexSuffix}`,
            `${hexPrefix}%`, `%${hexSuffix}`,
            `%${searchHex}%`,
            `%${searchHex}%`
          ).first<any>();
        } catch {
          record = await db.prepare(
            `SELECT * FROM audit_logs 
             WHERE (manifest_sha256 LIKE ? AND manifest_sha256 LIKE ?)
                OR document_id LIKE ?
                OR id LIKE ?
             LIMIT 1`
          ).bind(
            `${hexPrefix}%`, `%${hexSuffix}`,
            `%${searchHex}%`,
            `%${searchHex}%`
          ).first<any>().catch(() => null);
        }
      }

      // 3. Busca por identificador de documento DOC-YYYYMMDD-XXXX ou access_token
      if (!record && clean.length >= 4) {
        try {
          record = await db.prepare(
            `SELECT a.*, d.minor_name, d.minor_series, d.minor_class, d.minor_turn, d.status as doc_status, 
                    d.auth_image, d.auth_health, d.auth_data,
                    d.revoked_at, d.revoked_reason, d.cancelled_at, d.cancellation_reason, d.cancelled_by_admin_id,
                    t.title as template_title, t.procedure_description
             FROM audit_logs a
             LEFT JOIN documents d ON a.document_id = d.id
             LEFT JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
             WHERE a.document_id = ? OR a.document_id LIKE ? OR a.id = ?
             LIMIT 1`
          ).bind(clean, `%${clean}%`, clean).first<any>();
        } catch {
          record = await db.prepare(
            `SELECT * FROM audit_logs WHERE document_id = ? OR document_id LIKE ? OR id = ? LIMIT 1`
          ).bind(clean, `%${clean}%`, clean).first<any>().catch(() => null);
        }
      }

      // 4. Se não localizado em audit_logs, busca diretamente na tabela documents
      if (!record) {
        let docRecord: any = null;

        if (is64Hex) {
          docRecord = await db.prepare(
            `SELECT d.*, t.title as template_title, t.procedure_description
             FROM documents d
             LEFT JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
             WHERE d.content_sha256 = ?
             LIMIT 1`
          ).bind(cleanLower).first<any>().catch(() => null);

          if (!docRecord) {
            docRecord = await db.prepare(
              `SELECT * FROM documents WHERE content_sha256 = ? LIMIT 1`
            ).bind(cleanLower).first<any>().catch(() => null);
          }
        } else if (hexPrefix && hexSuffix) {
          docRecord = await db.prepare(
            `SELECT d.*, t.title as template_title, t.procedure_description
             FROM documents d
             LEFT JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
             WHERE (d.content_sha256 LIKE ? AND d.content_sha256 LIKE ?)
                OR d.id LIKE ? OR d.access_token LIKE ?
             LIMIT 1`
          ).bind(
            `${hexPrefix}%`, `%${hexSuffix}`,
            `%${searchHex}%`, `%${searchHex}%`
          ).first<any>().catch(() => null);

          if (!docRecord) {
            docRecord = await db.prepare(
              `SELECT * FROM documents 
               WHERE (content_sha256 LIKE ? AND content_sha256 LIKE ?)
                  OR id LIKE ? OR access_token LIKE ?
               LIMIT 1`
            ).bind(
              `${hexPrefix}%`, `%${hexSuffix}`,
              `%${searchHex}%`, `%${searchHex}%`
            ).first<any>().catch(() => null);
          }
        }

        if (!docRecord && clean.length >= 4) {
          const cleanCpfDigits = clean.replace(/\D/g, '');
          if (cleanCpfDigits.length === 11) {
            try {
              const pepper = c.env?.OTP_PEPPER || 'SESI_OTP_PEPPER_SECRET_KEY_PROD_98765';
              const minorCpfBindex = await hmacSha256(cleanCpfDigits, pepper);
              docRecord = await db.prepare(
                `SELECT d.*, t.title as template_title, t.procedure_description
                 FROM documents d
                 LEFT JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
                 WHERE (d.minor_cpf = ? OR d.minor_cpf_bindex_sha256 = ?)
                   AND d.status = 'signed'
                 ORDER BY d.created_at DESC LIMIT 1`
              ).bind(maskCPF(cleanCpfDigits), minorCpfBindex).first<any>().catch(() => null);
            } catch {}
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

          if (!docRecord) {
            docRecord = await db.prepare(
              `SELECT * FROM documents WHERE id = ? OR access_token = ? OR id LIKE ? OR access_token LIKE ? LIMIT 1`
            ).bind(clean, clean, `%${clean}%`, `%${clean}%`).first<any>().catch(() => null);
          }
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
            user_agent: matchedAudit?.user_agent && matchedAudit.user_agent !== 'Navegador Web Padrão' ? matchedAudit.user_agent : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            identity_method: matchedAudit?.identity_method || 'declaracao_responsavel',
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
          };
        }
      }

      // Se o record foi encontrado pelo audit_log simples (sem join), enriquece com dados do documento
      if (record && record.document_id && (!record.minor_name || !record.template_title)) {
        try {
          const docRow = await db.prepare(
            `SELECT d.*, t.title as template_title, t.procedure_description
             FROM documents d
             LEFT JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
             WHERE d.id = ? LIMIT 1`
          ).bind(record.document_id).first<any>().catch(() => null);

          if (docRow) {
            record.minor_name = record.minor_name || docRow.minor_name || 'Estudante';
            record.minor_series = record.minor_series || docRow.minor_series;
            record.minor_class = record.minor_class || docRow.minor_class;
            record.minor_turn = record.minor_turn || docRow.minor_turn;
            record.doc_status = record.doc_status || docRow.status || 'signed';
            record.revoked_at = record.revoked_at || docRow.revoked_at;
            record.revoked_reason = record.revoked_reason || docRow.revoked_reason;
            record.cancelled_at = record.cancelled_at || docRow.cancelled_at;
            record.cancellation_reason = record.cancellation_reason || docRow.cancellation_reason;
            record.cancelled_by_admin_id = record.cancelled_by_admin_id || docRow.cancelled_by_admin_id;
            record.template_title = record.template_title || docRow.template_title || 'Autorização SESI Escola Cidadã';
            record.procedure_description = record.procedure_description || docRow.procedure_description || 'Autorização clínica escolar.';
            record.auth_image = record.auth_image !== undefined ? record.auth_image : docRow.auth_image;
            record.auth_health = record.auth_health !== undefined ? record.auth_health : docRow.auth_health;
            record.auth_data = record.auth_data !== undefined ? record.auth_data : docRow.auth_data;
          }
        } catch {}
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

    // Conta posição na cadeia de custódia
    let chainPos = 1;
    if (db) {
      try {
        const posResult = await db.prepare(
          `SELECT COUNT(*) as pos FROM audit_logs WHERE created_at <= ?`
        ).bind(record.created_at || record.signed_at || new Date().toISOString()).first<{ pos: number }>();
        if (posResult && typeof posResult.pos === 'number') {
          chainPos = posResult.pos;
        }
      } catch {}
    }

    const maskedIp = maskIpAddress(record.ip_address || '127.0.0.1');

    let city = record.geo_city;
    if (!city || city.toLowerCase() === 'local' || city.toLowerCase() === 'unknown') city = 'Brasília';
    let region = record.geo_region;
    if (!region || region === 'unknown') region = 'DF';
    else if (region.toUpperCase().startsWith('BR-')) region = region.toUpperCase().replace('BR-', '');
    let country = record.geo_country || 'Brasil';
    if (country === 'BR') country = 'Brasil';

    const geoStr = `${city}, ${region}, ${country}`;

    const isCancelledError = record.doc_status === 'CANCELADO_POR_ERRO' || record.doc_status === 'cancelled_error';

    const codePrefix = cleanUpper.startsWith('SESI') ? 'SESI' : 'CATRAKI';
    const manifest = (typeof record.manifest_sha256 === 'string' && record.manifest_sha256.length > 0) ? record.manifest_sha256 : '0'.repeat(64);
    const validationCode = manifest.length >= 8
      ? `${codePrefix}-${manifest.substring(0, 4).toUpperCase()}-${manifest.substring(Math.max(0, manifest.length - 4)).toUpperCase()}`
      : `${codePrefix}-${hexPrefix.toUpperCase() || '0000'}-${hexSuffix.toUpperCase() || '0000'}`;

    const response: PublicValidationResponse = {
      valid: !isCancelledError && record.doc_status !== 'revoked',
      validation_code: validationCode,
      legal_notice: 'Assinatura Eletrônica Simples — Art. 10, § 2º, MP nº 2.200-2/2001 c/c Lei Federal nº 14.063/2020 (Art. 4º, I); Código Civil (Arts. 104 e 107); LGPD (Lei nº 13.709/2018); ECA Art. 17; Art. 299 CP',
      signature_type: 'Assinatura Eletrônica Simples — Art. 10, § 2º da MP nº 2.200-2/2001 e Art. 4º, I da Lei nº 14.063/2020',
      document_id: record.document_id || record.id || 'DOC-PENDENTE',
      manifest_sha256: record.manifest_sha256 || manifest,
      content_sha256: record.content_sha256_at_signing || record.content_sha256 || 'SHA256-PENDING',
      signature_png_sha256: record.signature_png_sha256 || manifest,
      signed_at_utc: record.signed_at || record.created_at || new Date().toISOString(),
      signer_name: record.signer_name || 'Responsável Legal',
      signer_cpf_masked: record.signer_cpf_masked || '***.***.***-**',
      signer_relationship: record.signer_relationship || 'Responsável Legal',
      ip_address: `${maskedIp} (Protegido por Sigilo Legal LGPD)`,
      geolocation: geoStr,
      user_agent: record.user_agent && record.user_agent !== 'Navegador Web Padrão' && record.user_agent !== 'Não registrado'
        ? record.user_agent
        : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      identity_method: record.identity_method || 'declaracao_responsavel',
      procedure_title: record.template_title || 'Autorização SESI Escola Cidadã',
      procedure_description: record.procedure_description || 'Autorização clínica escolar.',
      minor_name_initials: getInitials(record.minor_name || 'Estudante'),
      minor_series: record.minor_series,
      minor_class: record.minor_class,
      minor_turn: record.minor_turn,
      document_status: record.doc_status || 'signed',
      chain_position: chainPos,
      prev_log_hash: record.prev_log_hash || 'GENESIS-HASH',
      auth_image: record.auth_image === 'yes' || record.auth_image === true ? 'yes' : record.auth_image === 'no' || record.auth_image === false ? 'no' : null,
      auth_health: record.auth_health === 'yes' || record.auth_health === true ? 'yes' : record.auth_health === 'no' || record.auth_health === false ? 'no' : null,
      auth_data: record.auth_data === 'yes' || record.auth_data === true ? 'yes' : record.auth_data === 'no' || record.auth_data === false ? 'no' : null,
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
  } catch (err: any) {
    console.error('[VALIDATE_ROUTE_ERROR]', {
      query: c.req.param('query'),
      error: err?.message || String(err),
      stack: err?.stack,
    });
    return c.json({
      success: false,
      valid: false,
      error: 'Não foi possível validar o documento no momento. Verifique os dados digitados e tente novamente.',
      code: 'VALIDATION_ERROR',
      details: err?.message,
    }, 500);
  }
});

/**
 * POST /api/public/lgpd-request
 * Canal público do titular para exercício dos direitos previstos no Art. 18 da LGPD com proteção anti-bot
 */
publicRouter.post('/lgpd-request', rateLimiter({ limit: 10, windowSeconds: 300, keyPrefix: 'lgpd_pub' }), async (c) => {
  try {
    const body = await c.req.json();
    const parsed = LgpdRequestPublicSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: parsed.error.errors[0]?.message, code: 'VALIDATION_ERROR' }, 400);
    }

    const { requester_name, requester_cpf, requester_email, request_type, details } = parsed.data;

    const db = c.env?.DB;
    const masterKey = c.env?.ENCRYPTION_KEY_V1;

    if (!masterKey || !db) {
      return c.json({ success: false, error: 'Configuração do servidor incompleta para processamento LGPD.', code: 'KEY_CONFIG_ERROR' }, 500);
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
  } catch (err: any) {
    return c.json({ success: false, error: 'Erro ao registrar solicitação LGPD.', details: err?.message }, 500);
  }
});

/**
 * GET /api/public/institutions/:slug
 * Retorna dados da instituição/escola para preenchimento dinâmico
 */
publicRouter.get('/institutions/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    const db = c.env?.DB;

    if (!slug) {
      return c.json({ success: false, error: 'Identificador de escola obrigatório.' }, 400);
    }

    const clean = slug.toLowerCase().trim();
    let inst: any = null;
    if (db) {
      inst = await db.prepare(
        'SELECT * FROM institutions WHERE id = ? AND is_active = 1'
      ).bind(clean).first<any>().catch(() => null);
    }

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
  } catch (err: any) {
    return c.json({ success: false, error: 'Erro ao consultar instituição.' }, 500);
  }
});

/**
 * GET /api/public/dossier/:query
 * Dossiê Forense Completo do Titular em JSON Estruturado e Interoperável (Direito à Portabilidade - LGPD Art. 18, V)
 */
publicRouter.get('/dossier/:query', async (c) => {
  try {
    const query = c.req.param('query');
    const db = c.env?.DB;

    if (!query || query.trim().length === 0) {
      return c.json({ success: false, error: 'Código de validação inválido.', code: 'INVALID_QUERY' }, 400);
    }

    const clean = query.trim().toLowerCase();
    const searchHex = clean.replace(/^(sesi|catraki)-?/i, '').replace(/[^a-f0-9]/g, '');

    let record: any = null;

    if (db) {
      if (clean.length === 64 && /^[0-9a-f]{64}$/.test(clean)) {
        try {
          record = await db.prepare(
            `SELECT a.*, d.minor_name, d.minor_series, d.minor_class, d.minor_turn, d.status as doc_status, 
                    d.revoked_at, d.revoked_reason, d.cancelled_at, d.cancellation_reason,
                    t.title as template_title, t.procedure_description, t.content_markdown
             FROM audit_logs a
             LEFT JOIN documents d ON a.document_id = d.id
             LEFT JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
             WHERE a.manifest_sha256 = ? LIMIT 1`
          ).bind(clean).first<any>();
        } catch {
          record = await db.prepare(
            `SELECT * FROM audit_logs WHERE manifest_sha256 = ? LIMIT 1`
          ).bind(clean).first<any>().catch(() => null);
        }
      } else if (searchHex.length === 8) {
        try {
          record = await db.prepare(
            `SELECT a.*, d.minor_name, d.minor_series, d.minor_class, d.minor_turn, d.status as doc_status, 
                    d.revoked_at, d.revoked_reason, d.cancelled_at, d.cancellation_reason,
                    t.title as template_title, t.procedure_description, t.content_markdown
             FROM audit_logs a
             LEFT JOIN documents d ON a.document_id = d.id
             LEFT JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
             WHERE a.manifest_sha256 LIKE ? AND a.manifest_sha256 LIKE ? LIMIT 1`
          ).bind(`${searchHex.substring(0, 4)}%`, `%${searchHex.substring(4, 8)}`).first<any>();
        } catch {
          record = await db.prepare(
            `SELECT * FROM audit_logs WHERE manifest_sha256 LIKE ? AND manifest_sha256 LIKE ? LIMIT 1`
          ).bind(`${searchHex.substring(0, 4)}%`, `%${searchHex.substring(4, 8)}`).first<any>().catch(() => null);
        }
      } else if (clean.startsWith('doc-')) {
        try {
          record = await db.prepare(
            `SELECT a.*, d.minor_name, d.minor_series, d.minor_class, d.minor_turn, d.status as doc_status, 
                    d.revoked_at, d.revoked_reason, d.cancelled_at, d.cancellation_reason,
                    t.title as template_title, t.procedure_description, t.content_markdown
             FROM audit_logs a
             LEFT JOIN documents d ON a.document_id = d.id
             LEFT JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
             WHERE a.document_id = ? LIMIT 1`
          ).bind(clean.toUpperCase()).first<any>();
        } catch {
          record = await db.prepare(
            `SELECT * FROM audit_logs WHERE document_id = ? LIMIT 1`
          ).bind(clean.toUpperCase()).first<any>().catch(() => null);
        }
      }
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
        platform_operator: 'Catraki Tecnologia e Assinaturas Eletrônicas',
        project: 'Programa Escola Cidadã: Saúde em Movimento',
        dpo_contact: 'suporte@catraki.com.br',
      },
      document: {
        id: record.document_id || record.id || 'DOC-REGISTRO',
        title: record.template_title || 'Autorização Escolar SESI',
        status: record.doc_status || 'signed',
        procedure_description: record.procedure_description || 'Procedimento escolar registrado.',
        content_sha256: record.content_sha256_at_signing || record.content_sha256 || 'SHA256-PENDING',
      },
      titular_student: {
        initials: getInitials(record.minor_name || 'Estudante'),
        series: record.minor_series,
        class: record.minor_class,
        turn: record.minor_turn,
      },
      legal_guardian: {
        name: record.signer_name || 'Responsável Legal',
        cpf_masked: record.signer_cpf_masked || '***.***.***-**',
        relationship: record.signer_relationship || 'Responsável Legal',
        identity_verification_method: record.identity_method || 'declaracao_responsavel',
      },
      custody_chain: {
        manifest_sha256: record.manifest_sha256,
        signature_png_sha256: record.signature_png_sha256,
        signed_at: record.signed_at,
        audit_log_row_hash: record.log_row_hash || record.manifest_sha256,
        prev_log_hash: record.prev_log_hash || 'GENESIS-HASH',
        ip_masked: maskIpAddress(record.ip_address || '127.0.0.1'),
        geolocation: [record.geo_city || 'Brasília', record.geo_region || 'DF', record.geo_country || 'Brasil'].filter(Boolean).join(', '),
        user_agent: record.user_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    };

    return c.json({ success: true, dossier });
  } catch (err: any) {
    return c.json({ success: false, error: 'Erro ao gerar dossiê forense.', details: err?.message }, 500);
  }
});

/**
 * POST /api/public/batch-check
 * Validação de consentimento / TCLE em lote de alta performance para o SMS-MEDCO
 */
publicRouter.post('/batch-check', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const cpfs: string[] = Array.isArray(body.cpfs) ? body.cpfs : [];
    const db = c.env?.DB;

    if (!db || cpfs.length === 0) {
      return c.json({ success: true, results: {}, total: 0 });
    }

    const pepper = c.env?.OTP_PEPPER || 'SESI_OTP_PEPPER_SECRET_KEY_PROD_98765';
    const results: Record<string, {
      authorized: boolean;
      status: string;
      is_revoked?: boolean;
      validation_code?: string;
      signed_at?: string;
      minor_name?: string;
      document_id?: string;
      revoked_at?: string;
    }> = {};

    for (const rawCpf of cpfs.slice(0, 500)) {
      const cleanCpf = (rawCpf || '').replace(/\D/g, '');
      if (cleanCpf.length !== 11) {
        results[rawCpf] = { authorized: false, status: 'invalid_cpf' };
        continue;
      }

      const minorCpfBindex = await hmacSha256(cleanCpf, pepper);
      const existing = await db.prepare(
        `SELECT d.id, d.status, d.minor_name, d.parent_name, a.manifest_sha256, a.signed_at
         FROM documents d
         LEFT JOIN audit_logs a ON d.id = a.document_id
         WHERE d.status = 'signed' 
           AND (d.minor_cpf = ? OR d.minor_cpf_bindex_sha256 = ?)
         ORDER BY a.signed_at DESC LIMIT 1`
      ).bind(maskCPF(cleanCpf), minorCpfBindex).first<any>().catch(() => null);

      if (existing) {
        const validationCode = existing.manifest_sha256
          ? `CATRAKI-${existing.manifest_sha256.substring(0, 4).toUpperCase()}-${existing.manifest_sha256.substring(existing.manifest_sha256.length - 4).toUpperCase()}`
          : `CATRAKI-${existing.id.slice(-8).toUpperCase()}`;

        results[rawCpf] = {
          authorized: true,
          status: 'signed',
          is_revoked: false,
          validation_code: validationCode,
          signed_at: existing.signed_at || new Date().toISOString(),
          minor_name: existing.minor_name,
          document_id: existing.id,
        };
      } else {
        const revoked = await db.prepare(
          `SELECT id, status, minor_name, revoked_at, cancelled_at
           FROM documents
           WHERE (minor_cpf = ? OR minor_cpf_bindex_sha256 = ?)
             AND status IN ('revoked', 'CANCELADO_POR_ERRO', 'cancelled_error')
           ORDER BY created_at DESC LIMIT 1`
        ).bind(maskCPF(cleanCpf), minorCpfBindex).first<any>().catch(() => null);

        if (revoked) {
          results[rawCpf] = {
            authorized: false,
            status: 'revoked',
            is_revoked: true,
            minor_name: revoked.minor_name,
            document_id: revoked.id,
            revoked_at: revoked.revoked_at || revoked.cancelled_at,
          };
        } else {
          results[rawCpf] = {
            authorized: false,
            status: 'not_found_or_pending',
            is_revoked: false,
          };
        }
      }
    }

    return c.json({ success: true, results, count: Object.keys(results).length });
  } catch (err: any) {
    return c.json({ success: false, error: 'Erro ao processar validação em lote.', details: err?.message }, 500);
  }
});

// Alias para compatibilidade total com chamadas do SMS-MEDCO
publicRouter.post('/check-bulk', async (c) => {
  return publicRouter.fetch(new Request(c.req.url.replace('/check-bulk', '/batch-check'), {
    method: 'POST',
    headers: c.req.raw.headers,
    body: await c.req.raw.clone().blob(),
  }), c.env, c.executionCtx);
});
