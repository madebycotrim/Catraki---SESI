import type { Env } from '../../src/lib/types.ts';

export interface EmailAttachment {
  filename: string;
  content: string; // base64
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  sent: boolean;
  provider: 'resend' | 'resend_fallback' | 'mailchannels' | 'none';
  messageId: string | null;
  error?: string;
}

const DEFAULT_FROM = 'Escola Cidadã — Saúde em Movimento <autorizacoes@catraki.com.br>';
const DEFAULT_TIMEOUT_MS = 8000;

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries = 1
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const resp = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      });
      if (resp.status >= 500 && attempt < maxRetries) {
        const delayMs = 300 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      return resp;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delayMs = 300 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Email network failure');
}

/**
 * Envia e-mail transacional via Resend (com fallback para onboarding@resend.dev se domínio não verificado e MailChannels).
 */
export async function sendTransactionalEmail(
  env: Partial<Env> & Record<string, any>,
  input: SendEmailInput
): Promise<SendEmailResult> {
  const resendApiKey = env.RESEND_API_KEY as string | undefined;
  const fromAddress = (env.EMAIL_FROM as string | undefined) || DEFAULT_FROM;
  const toList = Array.isArray(input.to) ? input.to : [input.to];

  if (resendApiKey) {
    try {
      const payload: Record<string, unknown> = {
        from: fromAddress,
        to: toList,
        subject: input.subject,
        html: input.html,
      };
      if (input.text) payload.text = input.text;
      if (input.attachments?.length) payload.attachments = input.attachments;

      const resp = await fetchWithRetry('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (resp.ok) {
        const data = (await resp.json().catch(() => ({}))) as { id?: string };
        return {
          sent: true,
          provider: 'resend',
          messageId: data.id || `resend_${Date.now()}`,
        };
      }

      const errText = await resp.text().catch(() => '');
      console.warn(`[EMAIL] Resend falhou (${resp.status})`);

      // Fallback para domínio sandbox do Resend apenas se não estiver usando onboarding@resend.dev
      if (!fromAddress.includes('onboarding@resend.dev') && resp.status >= 400 && resp.status < 500) {
        const fallbackResp = await fetchWithRetry('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...payload,
            from: 'Catraki SESI <onboarding@resend.dev>',
          }),
        });
        if (fallbackResp.ok) {
          const fbData = (await fallbackResp.json().catch(() => ({}))) as { id?: string };
          return {
            sent: true,
            provider: 'resend_fallback',
            messageId: fbData.id || `resend_fb_${Date.now()}`,
          };
        }
      }
      if (errText) {
        console.warn('[EMAIL] Resend error body length:', errText.length);
      }
    } catch (err: any) {
      console.error('[EMAIL] Exceção ao enviar via Resend:', err?.message || err);
    }
  }

  // Fallback MailChannels (sem anexos binários grandes ou com texto/html)
  try {
    const mcResp = await fetchWithRetry(
      'https://api.mailchannels.net/tx/v1/send',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: toList.map((email) => ({ email })) }],
          from: {
            email: 'autorizacoes@catraki.com.br',
            name: 'Escola Cidadã — Saúde em Movimento',
          },
          subject: input.subject,
          content: [
            ...(input.text ? [{ type: 'text/plain', value: input.text }] : []),
            { type: 'text/html', value: input.html },
          ],
        }),
      },
      0
    );

    if (mcResp.ok || mcResp.status === 202) {
      return {
        sent: true,
        provider: 'mailchannels',
        messageId: `mc_${Date.now()}`,
      };
    }
  } catch (mcErr: any) {
    console.warn('[EMAIL] Exceção no fallback MailChannels:', mcErr?.message || mcErr);
  }

  return {
    sent: false,
    provider: 'none',
    messageId: null,
    error: 'Falha ao enviar e-mail pelos provedores configurados.',
  };
}
