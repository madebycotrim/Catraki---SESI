/**
 * ============================================================================
 * TEMPLATES DE E-MAIL TRANSACIONAL — PLATAFORMA CATRAKI / SESI SAÚDE
 * Conformidade: LGPD (Lei nº 13.709/2018 - Arts. 6º, VI e 18) e Marco Civil
 * ============================================================================
 */

export interface CancellationEmailParams {
  parentName?: string;
  minorName?: string;
  documentId: string;
  documentTitle?: string;         // [Nome do Documento]
  validationCode?: string;
  cancelledAtFormatted: string;
  institutionName?: string;
  reason?: string;
  supportEmail?: string;
  supportPhone?: string;
  dpoContact?: string;
  companyName?: string;           // [Nome da sua Empresa]
  companyWebsite?: string;        // [Site da Empresa]
  // Campos de transparência LGPD — Art. 18 e Marco Civil
  documentHashSha256?: string;    // Hash SHA-256 do documento ou código de autenticidade
  revokedByName?: string;         // Nome do Usuário ou Empresa que cancelou
  revokedByEmail?: string;        // E-mail do operador responsável
  ntpTimestamp?: string;          // Timestamp certificado NTP (Observatório Nacional)
  ntpSource?: string;             // Fonte do timestamp NTP (on.br, cloudflare, system)
}

/**
 * Retorna o assunto padronizado para o e-mail de notificação de cancelamento de documento.
 */
export function getCancellationEmailSubject(documentTitle?: string): string {
  const docName = documentTitle || 'Termo de Consentimento';
  return `Aviso: O documento "${docName}" foi cancelado`;
}

/**
 * Parâmetros para e-mail de revogação de consentimento (LGPD Art. 18 — iniciado pelo titular)
 * Diferente do cancelamento administrativo por erro operacional
 */
export interface RevocationEmailParams {
  parentName: string;
  minorName: string;
  documentId: string;
  validationCode?: string;
  revokedAtFormatted: string;
  institutionName: string;
  reason: string;                 // Motivo informado pelo titular
  supportEmail?: string;
  dpoContact?: string;
  documentHashSha256?: string;
  ntpTimestamp?: string;
  ntpSource?: string;
}

/**
 * Gera o template HTML responsivo e profissional para notificação de cancelamento de documento.
 */
export function getTransactionalCancellationEmailHtml(params: CancellationEmailParams): string {
  const {
    parentName,
    minorName,
    documentId,
    documentTitle,
    validationCode,
    cancelledAtFormatted,
    institutionName,
    reason,
    supportEmail = 'suporte.escolacidada@catraki.com.br',
    supportPhone = '(61) 3333-0000',
    dpoContact = 'privacidade@catraki.com.br',
    companyName,
    companyWebsite = 'www.sesidai.org.br',
    documentHashSha256,
    revokedByName,
    revokedByEmail,
  } = params;

  const docTitle = documentTitle || (minorName ? `Termo de Consentimento - ${minorName}` : 'Termo de Consentimento');
  const signerName = parentName || 'Signatário';
  const authHash = documentHashSha256 || validationCode || `DOC-${documentId.substring(0, 8).toUpperCase()}`;
  const company = companyName || institutionName || 'SESI Saúde / Escola Cidadã';
  const cancelledBy = revokedByName || (revokedByEmail ? `${revokedByEmail}` : null) || company;
  const reasonText = reason || 'Inconsistência cadastral ou operacional detectada no sistema';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aviso: O documento "${docTitle}" foi cancelado</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 32px 12px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #004b8d 0%, #002d59 100%);
      padding: 28px 24px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .header p {
      margin: 6px 0 0 0;
      font-size: 13px;
      color: #93c5fd;
    }
    .content {
      padding: 32px 24px;
      line-height: 1.6;
      font-size: 15px;
      color: #334155;
    }
    .greeting {
      font-size: 16px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 16px;
    }
    .alert-box {
      background-color: #fef3c7;
      border-left: 4px solid #d97706;
      padding: 16px;
      border-radius: 6px;
      margin: 20px 0;
      color: #92400e;
      font-size: 14px;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin: 24px 0;
      background-color: #f8fafc;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }
    .details-table td {
      padding: 12px 16px;
      font-size: 14px;
      border-bottom: 1px solid #e2e8f0;
    }
    .details-table tr:last-child td {
      border-bottom: none;
    }
    .details-table .label {
      font-weight: 600;
      color: #475569;
      width: 42%;
    }
    .details-table .value {
      color: #0f172a;
      font-weight: 500;
    }
    .steps-box {
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
    }
    .steps-box h3 {
      margin: 0 0 10px 0;
      font-size: 15px;
      color: #166534;
      font-weight: 700;
    }
    .steps-box p {
      margin: 0 0 10px 0;
      color: #15803d;
      font-size: 14px;
    }
    .steps-box ul {
      margin: 0;
      padding-left: 20px;
      color: #15803d;
      font-size: 14px;
    }
    .steps-box li {
      margin-bottom: 8px;
    }
    .security-badge {
      background-color: #f1f5f9;
      padding: 14px;
      border-radius: 8px;
      font-size: 13px;
      color: #475569;
      margin-top: 24px;
      border: 1px solid #e2e8f0;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
    .footer a {
      color: #004b8d;
      text-decoration: none;
    }
    .badge-status {
      display: inline-block;
      padding: 4px 10px;
      background-color: #fee2e2;
      color: #991b1b;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 12px;
      letter-spacing: 0.05em;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>${company}</h1>
        <p>Sistema Digital de Gestão de Documentos e Consentimento</p>
      </div>

      <div class="content">
        <div class="greeting">
          Olá, ${signerName},
        </div>

        <p>
          Informamos que o processo de assinatura do documento "<strong>${docTitle}</strong>" foi cancelado e ele não possui mais validade.
        </p>

        <p>
          Para garantir total transparência e a segurança das suas informações, compartilhamos abaixo os detalhes deste cancelamento:
        </p>

        <table class="details-table">
          <tr>
            <td class="label">Documento</td>
            <td class="value"><strong>${docTitle}</strong></td>
          </tr>
          ${minorName ? `
          <tr>
            <td class="label">Estudante / Aluno(a)</td>
            <td class="value">${minorName}</td>
          </tr>` : ''}
          <tr>
            <td class="label">Código de Autenticidade (Hash)</td>
            <td class="value"><span style="font-family: monospace; font-weight: bold;">${authHash}</span></td>
          </tr>
          <tr>
            <td class="label">Cancelado por</td>
            <td class="value">${cancelledBy}</td>
          </tr>
          <tr>
            <td class="label">Data do Cancelamento</td>
            <td class="value">${cancelledAtFormatted}</td>
          </tr>
          <tr>
            <td class="label">Situação</td>
            <td class="value"><span class="badge-status">CANCELADO POR ERRO</span></td>
          </tr>
          <tr>
            <td class="label">Motivo</td>
            <td class="value" style="font-style: italic; color: #475569;">"${reasonText}"</td>
          </tr>
        </table>

        <div class="steps-box">
          <h3>O que acontece agora?</h3>
          <p>
            Os links e acessos que você recebeu anteriormente para este documento foram desativados. Você não precisa realizar nenhuma ação neste momento.
          </p>
          <p>
            Se o processo precisar continuar, a equipe responsável enviará um novo documento atualizado para sua revisão e assinatura. Fique tranquilo(a), seus dados continuam protegidos e este aviso automático faz parte do nosso compromisso legal com a transparência.
          </p>
        </div>

        <div class="security-badge">
          🔒 <strong>Segurança e Privacidade Garantidas (LGPD):</strong><br>
          Os dados deste cancelamento foram salvaguardados em ambiente criptografado e seguro unicamente para fins de auditoria e conformidade legal (Lei nº 13.709/2018 - LGPD), sem qualquer compartilhamento indevido.
        </div>

        <p style="margin-top: 24px; font-size: 14px; color: #64748b;">
          Se tiver alguma dúvida sobre este cancelamento, basta responder a este e-mail ou entrar em contato com a nossa equipe em <a href="mailto:${supportEmail}" style="color: #004b8d; font-weight: 600;">${supportEmail}</a> ou DPO em <a href="mailto:${dpoContact}" style="color: #004b8d; font-weight: 600;">${dpoContact}</a>.
        </p>

        <p style="margin-top: 28px; font-size: 14px; color: #334155;">
          Atenciosamente,<br><br>
          <strong>Equipe ${company}</strong><br>
          <span style="font-size: 13px; color: #64748b;"><a href="${companyWebsite.startsWith('http') ? companyWebsite : 'https://' + companyWebsite}" style="color: #004b8d; text-decoration: none;">${companyWebsite}</a> | ${supportPhone ? `${supportPhone} | ` : ''}${supportEmail}</span>
        </p>
      </div>

      <div class="footer">
        Este é um e-mail transacional de notificação automática emitido em conformidade com o Marco Civil da Internet (Lei nº 12.965/2014) e a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Gera a versão em texto puro do e-mail de notificação de cancelamento de documento.
 */
export function getTransactionalCancellationEmailText(params: CancellationEmailParams): string {
  const {
    parentName,
    minorName,
    documentId,
    documentTitle,
    validationCode,
    cancelledAtFormatted,
    institutionName,
    reason,
    companyName,
    documentHashSha256,
    revokedByName,
    revokedByEmail,
  } = params;

  const docTitle = documentTitle || (minorName ? `Termo de Consentimento - ${minorName}` : 'Termo de Consentimento');
  const signerName = parentName || 'Signatário';
  const authHash = documentHashSha256 || validationCode || `DOC-${documentId.substring(0, 8).toUpperCase()}`;
  const company = companyName || institutionName || 'SESI Saúde / Escola Cidadã';
  const cancelledBy = revokedByName || (revokedByEmail ? `${revokedByEmail}` : null) || company;
  const reasonText = reason || 'Inconsistência cadastral ou operacional detectada no sistema';

  return `Assunto: Aviso: O documento "${docTitle}" foi cancelado

Olá, ${signerName}. Informamos que o processo de assinatura do documento '${docTitle}' foi cancelado e ele não possui mais validade. Detalhes: Código de Autenticidade (Hash): ${authHash}; Cancelado por: ${cancelledBy}; Data: ${cancelledAtFormatted}; Motivo: '${reasonText}'. Os links anteriores foram desativados. Seus dados continuam protegidos.`;
}

// ============================================================================
// E-MAIL DE REVOGAÇÃO DE CONSENTIMENTO (LGPD Art. 18 — Iniciado pelo Titular)
// Diferente do cancelamento administrativo — esta é a revogação voluntária
// ============================================================================

/**
 * Gera o template HTML para notificação de revogação voluntária de consentimento pelo titular.
 * LGPD Art. 18, VIII — Direito de revogação do consentimento a qualquer momento.
 */
export function getRevocationEmailHtml(params: RevocationEmailParams): string {
  const {
    parentName,
    minorName,
    documentId,
    validationCode,
    revokedAtFormatted,
    institutionName,
    reason,
    supportEmail = 'suporte.escolacidada@catraki.com.br',
    dpoContact = 'privacidade@catraki.com.br',
    documentHashSha256,
    ntpTimestamp,
    ntpSource,
  } = params;

  const docCode = validationCode || `DOC-${documentId.substring(0, 8).toUpperCase()}`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmação de Revogação de Consentimento — SESI Saúde / Escola Cidadã</title>
  <style>
    body { margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b; }
    .wrapper { width:100%;background:#f8fafc;padding:32px 12px; }
    .container { max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 6px -1px rgba(0,0,0,.05); }
    .header { background:linear-gradient(135deg,#1d4ed8 0%,#1e3a8a 100%);padding:28px 24px;text-align:center;color:#fff; }
    .header h1 { margin:0;font-size:20px;font-weight:700; }
    .header p { margin:6px 0 0;font-size:13px;color:#bfdbfe; }
    .content { padding:32px 24px;line-height:1.6;font-size:15px;color:#334155; }
    .info-box { background:#eff6ff;border-left:4px solid #3b82f6;padding:16px;border-radius:6px;margin:20px 0;color:#1e3a8a;font-size:14px; }
    .details-table { width:100%;border-collapse:collapse;margin:24px 0;background:#f8fafc;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0; }
    .details-table td { padding:12px 16px;font-size:14px;border-bottom:1px solid #e2e8f0; }
    .details-table tr:last-child td { border-bottom:none; }
    .details-table .label { font-weight:600;color:#475569;width:40%; }
    .details-table .value { color:#0f172a;font-weight:500; }
    .hash-box { background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:14px;font-size:11px;font-family:monospace;color:#475569;margin:16px 0;word-break:break-all; }
    .footer { background:#f8fafc;padding:24px;text-align:center;font-size:12px;color:#64748b;border-top:1px solid #e2e8f0; }
    .footer a { color:#1d4ed8;text-decoration:none; }
    .badge-revoked { display:inline-block;padding:4px 10px;background:#dbeafe;color:#1e3a8a;border-radius:9999px;font-weight:700;font-size:12px;letter-spacing:.05em; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>SESI Saúde &bull; Escola Cidadã</h1>
        <p>Confirmação de Revogação de Consentimento — LGPD Art. 18</p>
      </div>
      <div class="content">
        <p style="font-size:16px;font-weight:600;color:#0f172a;">Prezado(a) ${parentName || 'Responsável Legal'},</p>
        <p>Confirmamos que você exerceu seu <strong>direito de revogação do consentimento</strong> nos termos do <strong>Art. 18, VIII, da Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>.</p>
        <p>A autorização de atendimento vinculada ao(à) estudante <strong>${minorName}</strong> na instituição <strong>${institutionName}</strong> foi <strong>revogada com sucesso</strong>.</p>
        <div class="info-box">
          <strong>O que acontece agora?</strong><br>
          O documento foi invalidado imediatamente. Todos os links de acesso ao formulário foram desativados e nenhum atendimento poderá ser realizado com base nesta autorização. Os dados foram preservados em ambiente seguro conforme o Art. 16 da LGPD.
        </div>
        <table class="details-table">
          <tr><td class="label">Código do Documento</td><td class="value" style="font-family:monospace;font-weight:bold;">${docCode}</td></tr>
          <tr><td class="label">Estudante</td><td class="value">${minorName}</td></tr>
          <tr><td class="label">Escola / Instituição</td><td class="value">${institutionName}</td></tr>
          <tr><td class="label">Data da Revogação</td><td class="value">${revokedAtFormatted}</td></tr>
          <tr><td class="label">Situação</td><td class="value"><span class="badge-revoked">CONSENTIMENTO REVOGADO</span></td></tr>
          <tr><td class="label">Motivo Informado</td><td class="value" style="font-style:italic;color:#475569;">${reason}</td></tr>
          ${ntpTimestamp ? `<tr><td class="label">Carimbo do Tempo (NTP)</td><td class="value" style="font-family:monospace;font-size:12px;">${ntpTimestamp}</td></tr>` : ''}
          ${ntpSource ? `<tr><td class="label">Fonte Temporal</td><td class="value" style="font-size:12px;color:#64748b;">${ntpSource}</td></tr>` : ''}
        </table>
        ${documentHashSha256 ? `
        <div class="hash-box">
          <strong>🔐 Hash SHA-256 do Documento (Lei 14.063/2020):</strong><br>
          ${documentHashSha256}<br>
          <span style="font-size:10px;color:#64748b;">Este código é a impressão digital criptográfica única deste documento.</span>
        </div>` : ''}
        <p style="font-size:14px;color:#64748b;margin-top:24px;">
          Para dúvidas, acesse nosso DPO: <a href="mailto:${dpoContact}">${dpoContact}</a><br>
          Suporte do projeto: <a href="mailto:${supportEmail}">${supportEmail}</a>
        </p>
        <p style="font-size:14px;color:#334155;">Atenciosamente,<br>
          <strong>Equipe Escola Cidadã — Saúde em Movimento</strong><br>
          <span style="font-size:13px;color:#64748b;">SESI-DF &bull; Faculdade de Ciências da Saúde / UnB</span>
        </p>
      </div>
      <div class="footer">
        E-mail transacional imutável emitido pela Plataforma Catraki / SESI Saúde em conformidade com a LGPD (Lei nº 13.709/2018, Art. 18) e Marco Civil da Internet (Lei nº 12.965/2014).
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Gera a versão em texto puro do e-mail de revogação voluntária de consentimento.
 */
export function getRevocationEmailText(params: RevocationEmailParams): string {
  const {
    parentName, minorName, documentId, validationCode, revokedAtFormatted,
    institutionName, reason, supportEmail = 'suporte.escolacidada@catraki.com.br',
    dpoContact = 'privacidade@catraki.com.br', documentHashSha256, ntpTimestamp, ntpSource,
  } = params;
  const docCode = validationCode || `DOC-${documentId.substring(0, 8).toUpperCase()}`;

  return `[SESI Saúde / Escola Cidadã] Confirmação de Revogação de Consentimento — LGPD Art. 18

Prezado(a) ${parentName || 'Responsável Legal'},

Confirmamos que você exerceu seu direito de revogação do consentimento (LGPD Art. 18, VIII).
A autorização de atendimento vinculada ao(à) estudante ${minorName} na instituição "${institutionName}" foi REVOGADA COM SUCESSO.

DADOS DA REVOGAÇÃO:
- Código do Documento: ${docCode}
- Estudante: ${minorName}
- Escola / Unidade: ${institutionName}
- Data da Revogação: ${revokedAtFormatted}
- Situação: CONSENTIMENTO REVOGADO (LGPD Art. 18)
- Motivo: ${reason}
${ntpTimestamp ? `- Carimbo do Tempo (NTP): ${ntpTimestamp}\n` : ''}${ntpSource ? `- Fonte NTP: ${ntpSource}\n` : ''}${documentHashSha256 ? `\nHASH SHA-256 DO DOCUMENTO (Lei 14.063/2020):\n${documentHashSha256}\n` : ''}
O QUE ACONTECE AGORA:
Todos os links de acesso ao formulário foram desativados imediatamente. Os dados foram
preservados em ambiente seguro conforme o Art. 16 da LGPD exclusivamente para fins de auditoria.

Canais de Atendimento:
- Encarregado de Dados (DPO): ${dpoContact}
- Suporte do Projeto: ${supportEmail}

Atenciosamente,
Equipe Escola Cidadã — Saúde em Movimento
SESI-DF / Faculdade de Ciências da Saúde (FS/UnB)`;
}

export interface CompletionEmailParams {
  signerName: string;
  documentTitle: string;
  downloadUrl: string;
  companyName?: string;
  companyWebsite?: string;
  supportEmail?: string;
  supportPhone?: string;
}

/**
 * Retorna o assunto padronizado para o e-mail de conclusão de documento.
 */
export function getCompletionEmailSubject(documentTitle: string): string {
  return `✅ Documento finalizado: "${documentTitle}"`;
}

/**
 * Gera o template HTML responsivo e profissional para e-mail de conclusão de processo de assinatura.
 */
export function getTransactionalCompletionEmailHtml(params: CompletionEmailParams): string {
  const {
    signerName,
    documentTitle,
    downloadUrl,
    companyName = 'SESI Saúde / Escola Cidadã',
    companyWebsite = 'www.sesidai.org.br',
    supportEmail = 'suporte.escolacidada@catraki.com.br',
    supportPhone = '(61) 3333-0000',
  } = params;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>✅ Documento finalizado: "${documentTitle}"</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 32px 12px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #107c41 0%, #0b592e 100%);
      padding: 28px 24px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .header p {
      margin: 6px 0 0 0;
      font-size: 13px;
      color: #a7f3d0;
    }
    .content {
      padding: 32px 24px;
      line-height: 1.6;
      font-size: 15px;
      color: #334155;
    }
    .greeting {
      font-size: 16px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 16px;
    }
    .btn-container {
      text-align: center;
      margin: 28px 0;
    }
    .btn-action {
      display: inline-block;
      padding: 12px 24px;
      background-color: #107c41;
      color: #ffffff !important;
      font-weight: 600;
      font-size: 14px;
      text-decoration: none;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(16, 124, 65, 0.2);
      transition: background-color 0.2s;
    }
    .btn-action:hover {
      background-color: #0b592e;
    }
    .security-badge {
      background-color: #f1f5f9;
      padding: 14px;
      border-radius: 8px;
      font-size: 13px;
      color: #475569;
      margin-top: 24px;
      border: 1px solid #e2e8f0;
      text-align: left;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
    .footer a {
      color: #107c41;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>${companyName}</h1>
        <p>Processo de Assinatura Concluído com Sucesso</p>
      </div>

      <div class="content">
        <div class="greeting">
          Olá, ${signerName}!
        </div>

        <p>
          O processo de assinatura foi concluído com sucesso.
        </p>

        <p>
          Todas as partes já assinaram o documento "<strong>${documentTitle}</strong>". Em anexo, você encontra o arquivo original e o Certificado de Conclusão, contendo a trilha de auditoria que garante a validade jurídica do processo.
        </p>

        <div class="btn-container">
          <a href="${downloadUrl}" target="_blank" class="btn-action">Baixar Documento Assinado</a>
        </div>

        <div class="security-badge">
          🔒 <strong>Aviso de Segurança:</strong><br>
          Este arquivo PDF anexado é o documento original e imutável. Recomendamos que você faça o download e guarde este e-mail para seus registros.
        </div>

        <p style="margin-top: 28px; font-size: 14px; color: #334155;">
          Atenciosamente,<br><br>
          <strong>Equipe ${companyName}</strong><br>
          <span style="font-size: 13px; color: #64748b;"><a href="${companyWebsite.startsWith('http') ? companyWebsite : 'https://' + companyWebsite}" style="color: #107c41; text-decoration: none;">${companyWebsite}</a> | ${supportPhone ? `${supportPhone} | ` : ''}${supportEmail}</span>
        </p>
      </div>

      <div class="footer">
        Este é um e-mail transacional de notificação automática emitido em conformidade com a MP 2.200-2/2001, Lei 14.063/2020 e a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Gera a versão em texto puro do e-mail de conclusão de processo de assinatura.
 */
export function getTransactionalCompletionEmailText(params: CompletionEmailParams): string {
  const {
    signerName,
    documentTitle,
    downloadUrl,
    companyName = 'SESI Saúde / Escola Cidadã',
    companyWebsite = 'www.sesidai.org.br',
    supportEmail = 'suporte.escolacidada@catraki.com.br',
    supportPhone = '(61) 3333-0000',
  } = params;

  return `Assunto: ✅ Documento finalizado: "${documentTitle}"

Olá, ${signerName}! Todas as partes assinaram o documento. Em anexo, você encontra o arquivo original e o Certificado de Conclusão com a validade jurídica. Guarde este arquivo.

Link para download:
${downloadUrl}

Atenciosamente,

Equipe ${companyName}
${companyWebsite} | ${supportPhone ? `${supportPhone} | ` : ''}${supportEmail}`;
}
