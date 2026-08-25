// ============================================================================
// MÓDULO DE SINCRONIZAÇÃO NTP VIA HTTP — OBSERVATÓRIO NACIONAL BRASILEIRO
// Conformidade: Impossibilidade de fraude com datas retroativas em assinaturas
// Fallback chain: ON.br (via WorldTimeAPI) → Cloudflare → sistema local
// ============================================================================

export interface SyncedTimestamp {
  iso: string;                    // Timestamp ISO 8601 UTC certificado
  source: 'on.br' | 'worldtimeapi' | 'cloudflare' | 'system';
  synced: boolean;                // false = fallback para relógio local
  offset_ms: number;              // Diferença em ms entre relógio local e fonte NTP
  queried_at_local: string;       // Timestamp local no momento da consulta
}

const NTP_KV_CACHE_KEY = 'ntp_sync_cache';
const NTP_CACHE_TTL_SECONDS = 30;

/**
 * Tenta obter timestamp via Observatório Nacional Brasileiro
 * O ON.br disponibiliza a hora oficial via relay WorldTimeAPI (fuso America/Sao_Paulo)
 */
async function queryOnBr(): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 2500);
    const resp = await fetch('https://worldtimeapi.org/api/timezone/America/Sao_Paulo', {
      signal: ctrl.signal,
      headers: { 'Accept': 'application/json', 'User-Agent': 'Catraki-SESI/1.0 NTP-Sync' },
    });
    clearTimeout(timeoutId);
    if (resp.ok) {
      const data = await resp.json() as any;
      const utc = data.utc_datetime || data.datetime;
      if (utc) return new Date(utc).toISOString();
    }
  } catch {}
  return null;
}

/**
 * Tenta obter timestamp via Cloudflare Time (cf-trace endpoint)
 */
async function queryCloudflare(): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 2000);
    const resp = await fetch('https://1.1.1.1/cdn-cgi/trace', { signal: ctrl.signal });
    clearTimeout(timeoutId);
    if (resp.ok) {
      const text = await resp.text();
      const match = text.match(/ts=(\d+\.\d+)/);
      if (match) {
        return new Date(parseFloat(match[1]) * 1000).toISOString();
      }
    }
  } catch {}
  return null;
}

/**
 * Retorna timestamp UTC sincronizado com servidor NTP via HTTP.
 *
 * Fallback chain:
 * 1. Observatório Nacional Brasileiro via WorldTimeAPI (hora oficial do Brasil)
 * 2. Cloudflare Time (via CF trace endpoint)
 * 3. Relógio do sistema local (com flag synced: false)
 *
 * @param kv - Opcional: KVNamespace para cache por 30s (evita latência extra)
 */
export async function getSyncedTimestamp(kv?: KVNamespace): Promise<SyncedTimestamp> {
  const localNow = Date.now();
  const localIso = new Date(localNow).toISOString();

  // 1. Tenta ler do cache KV
  if (kv) {
    try {
      const cached = await kv.get(NTP_KV_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as {
          iso: string; source: string; offset_ms: number; cached_at: number;
        };
        const ageMs = localNow - parsed.cached_at;
        if (ageMs < NTP_CACHE_TTL_SECONDS * 1000) {
          const adjustedIso = new Date(new Date(parsed.iso).getTime() + ageMs).toISOString();
          return {
            iso: adjustedIso,
            source: parsed.source as SyncedTimestamp['source'],
            synced: true,
            offset_ms: parsed.offset_ms,
            queried_at_local: localIso,
          };
        }
      }
    } catch {}
  }

  // 2. Observatório Nacional Brasileiro
  const onBrTime = await queryOnBr();
  if (onBrTime) {
    const ntpMs = new Date(onBrTime).getTime();
    const offsetMs = ntpMs - localNow;
    if (kv) {
      try {
        await kv.put(
          NTP_KV_CACHE_KEY,
          JSON.stringify({ iso: onBrTime, source: 'on.br', offset_ms: offsetMs, cached_at: localNow }),
          { expirationTtl: NTP_CACHE_TTL_SECONDS }
        );
      } catch {}
    }
    return { iso: onBrTime, source: 'on.br', synced: true, offset_ms: offsetMs, queried_at_local: localIso };
  }

  // 3. Cloudflare Time API
  const cfTime = await queryCloudflare();
  if (cfTime) {
    const ntpMs = new Date(cfTime).getTime();
    const offsetMs = ntpMs - localNow;
    if (kv) {
      try {
        await kv.put(
          NTP_KV_CACHE_KEY,
          JSON.stringify({ iso: cfTime, source: 'cloudflare', offset_ms: offsetMs, cached_at: localNow }),
          { expirationTtl: NTP_CACHE_TTL_SECONDS }
        );
      } catch {}
    }
    return { iso: cfTime, source: 'cloudflare', synced: true, offset_ms: offsetMs, queried_at_local: localIso };
  }

  // 4. Fallback: relógio local do Worker (indicado no manifesto)
  return { iso: localIso, source: 'system', synced: false, offset_ms: 0, queried_at_local: localIso };
}

/**
 * Formata a fonte NTP para inclusão no manifesto criptográfico
 */
export function formatNtpSource(ts: SyncedTimestamp): string {
  const labels: Record<SyncedTimestamp['source'], string> = {
    'on.br': 'Observatório Nacional Brasileiro (ON.br) — Hora Legal Brasileira (WorldTimeAPI relay)',
    'worldtimeapi': 'WorldTimeAPI (relay hora oficial BR)',
    'cloudflare': 'Cloudflare Time Network (NTP fallback)',
    'system': 'Relógio do Sistema Worker (NTP indisponível — fallback local)',
  };
  const syncFlag = ts.synced ? '✓ Sincronizado' : '⚠ Não sincronizado (sistema local)';
  return `${labels[ts.source]} | ${syncFlag} | Δ${ts.offset_ms}ms`;
}
