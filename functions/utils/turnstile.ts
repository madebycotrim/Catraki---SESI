/**
 * Validação de token do Cloudflare Turnstile no backend (Edge / Cloudflare Pages Functions)
 * Conformidade: Proteção contra automação, botnets, DDoS e consumo indevido de cotas de e-mail.
 * Referência: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
export async function verifyTurnstileToken(
  token: string | undefined | null,
  secretKey: string | undefined | null,
  remoteIp?: string
): Promise<{ success: boolean; error?: string }> {
  // Se a chave secreta não estiver configurada no ambiente ou for placeholder, ignora verificação (fallback gracioso para dev local)
  if (!secretKey || secretKey.startsWith('COLE_AQUI') || secretKey === 'dummy_secret') {
    return { success: true };
  }

  // Em produção com chave configurada, o token é obrigatório
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return { success: false, error: 'Validação de segurança anti-robô obrigatória. Atualize a página e tente novamente.' };
  }

  // Tokens de teste da Cloudflare Turnstile (staging / testes locais)
  if (token.startsWith('1x00000000000000000000AA') || token === 'dummy-turnstile-token') {
    return { success: true };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token.trim());
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      return { success: false, error: 'Serviço de validação anti-robô temporariamente indisponível.' };
    }

    const data = (await response.json()) as { success: boolean; 'error-codes'?: string[] };
    if (data.success) {
      return { success: true };
    }

    return {
      success: false,
      error: 'Verificação anti-robô não validada. Por favor, tente novamente.',
    };
  } catch (err: any) {
    // Falha de rede no siteverify
    return { success: false, error: `Erro na comunicação com Cloudflare Turnstile: ${err.message}` };
  }
}
