/**
 * ============================================================================
 * TEMPLATES DE E-MAIL TRANSACIONAL — PLATAFORMA CATRAKI
 * Design padronizado: folha A4, logo Catraki à esquerda, divisa azul
 * Conformidade: LGPD (Lei nº 13.709/2018 - Arts. 6º, VI e 18) e Marco Civil
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// DESIGN SYSTEM — CSS compartilhado por todos os templates
// ---------------------------------------------------------------------------

const EMAIL_BASE_CSS = `
  body {
    margin: 0;
    padding: 0;
    background-color: #e8edf4;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    -webkit-font-smoothing: antialiased;
  }
  .wrapper {
    width: 100%;
    background-color: #e8edf4;
    padding: 36px 12px;
  }
  /* Folha A4 */
  .sheet {
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    box-shadow: 0 4px 18px -2px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06);
    overflow: hidden;
  }
  /* Cabeçalho: logo esquerda, título direita */
  .sheet-header {
    padding: 24px 28px 18px 28px;
    display: block;
  }
  .sheet-header-table {
    width: 100%;
    border-collapse: collapse;
  }
  .logo-cell {
    vertical-align: middle;
    width: 44px;
    padding-right: 16px;
  }
  .logo-img {
    display: block;
    width: 44px;
    height: 44px;
    border-radius: 10px;
    border: none;
  }
  .title-cell {
    vertical-align: middle;
  }
  .doc-title {
    margin: 0;
    font-size: 14px;
    font-weight: 800;
    color: #034b7f;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    line-height: 1.2;
  }
  .doc-subtitle {
    display: block;
    margin-top: 3px;
    font-size: 9.5px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .header-divider {
    height: 2.5px;
    background-color: #034b7f;
    margin: 0 28px;
  }
  /* Corpo do documento */
  .sheet-body {
    padding: 28px 28px 24px 28px;
    font-size: 13.5px;
    color: #334155;
    line-height: 1.65;
  }
  .sheet-body p {
    margin: 0 0 14px 0;
  }
  /* Tabela de detalhes */
  .details-table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    background-color: #f8fafc;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
    font-size: 13px;
  }
  .details-table td {
    padding: 10px 14px;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: top;
  }
  .details-table tr:last-child td {
    border-bottom: none;
  }
  .details-table .label {
    font-weight: 700;
    color: #475569;
    width: 42%;
  }
  .details-table .value {
    color: #0f172a;
    font-weight: 500;
  }
  /* Caixa de destaque */
  .highlight-box {
    background: #f0f9ff;
    border: 1.5px solid #bae6fd;
    border-radius: 8px;
    padding: 18px 20px;
    margin: 18px 0;
    color: #0c4a6e;
    font-size: 13px;
    line-height: 1.6;
  }
  /* Caixa de alerta/aviso */
  .alert-box {
    background-color: #fffbeb;
    border-left: 4px solid #d97706;
    padding: 14px 16px;
    border-radius: 4px;
    margin: 18px 0;
    color: #92400e;
    font-size: 13px;
    line-height: 1.6;
  }
  /* Badge de status */
  .badge {
    display: inline-block;
    padding: 3px 9px;
    border-radius: 9999px;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 0.05em;
  }
  .badge-red    { background: #fee2e2; color: #991b1b; }
  .badge-blue   { background: #dbeafe; color: #1e3a8a; }
  .badge-green  { background: #dcfce7; color: #166534; }
  /* Hash / código monospace */
  .hash-box {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 12px 14px;
    font-size: 11px;
    font-family: monospace;
    color: #475569;
    margin: 14px 0;
    word-break: break-all;
  }
  /* Botão CTA */
  .btn-container {
    text-align: center;
    margin: 24px 0;
  }
  .btn {
    display: inline-block;
    padding: 11px 22px;
    background-color: #034b7f;
    color: #ffffff !important;
    font-weight: 700;
    font-size: 13px;
    text-decoration: none;
    border-radius: 6px;
    letter-spacing: 0.01em;
  }
  /* Bloco OTP */
  .otp-box {
    background: #f0f9ff;
    border: 2px solid #bae6fd;
    border-radius: 10px;
    padding: 22px;
    text-align: center;
    margin: 20px 0;
  }
  .otp-code {
    font-size: 38px;
    font-weight: 800;
    letter-spacing: 8px;
    color: #034b7f;
    font-family: monospace;
  }
  /* Rodapé */
  .sheet-footer {
    border-top: 1px solid #e2e8f0;
    background-color: #f8fafc;
    padding: 16px 28px;
    text-align: center;
    font-size: 10.5px;
    color: #94a3b8;
    line-height: 1.6;
  }
  .sheet-footer a {
    color: #034b7f;
    text-decoration: underline;
  }
`;

/**
 * Envolve o conteúdo no shell padrão de e-mail com design A4.
 * @param titleLine  Título principal em MAIÚSCULAS (ex: "ESCOLA CIDADÃ — SAÚDE EM MOVIMENTO")
 * @param subtitle   Subtítulo descritivo (ex: "Notificação de Cancelamento de Documento")
 * @param body       HTML interno do corpo do e-mail
 * @param footerExtra Texto opcional adicional no rodapé
 */
function buildEmailShell(
  titleLine: string,
  subtitle: string,
  body: string,
  footerExtra?: string,
): string {
  const footer = footerExtra
    ? `${footerExtra}<br>`
    : '';
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titleLine}</title>
  <style>${EMAIL_BASE_CSS}</style>
</head>
<body>
  <div class="wrapper">
    <div class="sheet">

      <!-- Cabeçalho -->
      <div class="sheet-header">
        <table class="sheet-header-table">
          <tr>
            <td class="logo-cell" style="vertical-align: middle; width: 44px; padding-right: 16px;">
              <img src="https://www.catraki.com.br/catraki.png" alt="Logo Catraki" class="logo-img" width="44" height="44" style="display: block; border-radius: 10px; width: 44px; height: 44px; border: none; outline: none;" />
            </td>
            <td class="title-cell" style="vertical-align: middle;">
              <p class="doc-title">${titleLine}</p>
              <span class="doc-subtitle">${subtitle}</span>
            </td>
          </tr>
        </table>
      </div>
      <div class="header-divider"></div>

      <!-- Corpo -->
      <div class="sheet-body">
        ${body}
      </div>

      <!-- Rodapé -->
      <div class="sheet-footer">
        ${footer}Assinatura Eletrônica Avançada &bull; Lei Federal nº&nbsp;14.063/2020 &bull; Plataforma Catraki<br>
        Para mais informações sobre como protegemos seus dados, consulte nossa
        <a href="https://www.catraki.com.br/privacidade">Política de Privacidade e Termos de Uso</a>.
      </div>
      <!-- Barra institucional azul (Padronizada) -->
      <div style="height: 10px; background-color: #034b7f; line-height: 10px; font-size: 1px;">&nbsp;</div>
    </div>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// INTERFACES
// ---------------------------------------------------------------------------

export interface CancellationEmailParams {
  parentName?: string;
  minorName?: string;
  documentId: string;
  documentTitle?: string;
  validationCode?: string;
  cancelledAtFormatted: string;
  institutionName?: string;
  reason?: string;
  supportEmail?: string;
  supportPhone?: string;
  dpoContact?: string;
  companyName?: string;
  companyWebsite?: string;
  documentHashSha256?: string;
  revokedByName?: string;
  revokedByEmail?: string;
  ntpTimestamp?: string;
  ntpSource?: string;
}

export function getRevocationEmailSubject(_minorName?: string): string {
  return `Escola Cidadã — Consentimento Revogado`;
}

export interface RevocationEmailParams {
  parentName: string;
  minorName: string;
  documentId: string;
  validationCode?: string;
  revokedAtFormatted: string;
  institutionName: string;
  reason: string;
  supportEmail?: string;
  dpoContact?: string;
  documentHashSha256?: string;
  ntpTimestamp?: string;
  ntpSource?: string;
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

// ---------------------------------------------------------------------------
// ASSUNTOS
// ---------------------------------------------------------------------------

export function getCancellationEmailSubject(): string {
  return `Escola Cidadã — Autorização Cancelada`;
}

export function getCompletionEmailSubject(_documentTitle: string): string {
  return `Escola Cidadã — Autorização Concluída`;
}

// ---------------------------------------------------------------------------
// CANCELAMENTO ADMINISTRATIVO
// ---------------------------------------------------------------------------

/**
 * Gera o template HTML padronizado (design A4) para notificação de cancelamento de documento.
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
    supportEmail = 'suporte@catraki.com.br',
    supportPhone = '',
    dpoContact = 'privacidade@catraki.com.br',
    companyName,
    companyWebsite = 'www.catraki.com.br',
    documentHashSha256,
    revokedByName,
    revokedByEmail,
  } = params;

  const docTitle = documentTitle || (minorName ? `Termo de Consentimento - ${minorName}` : 'Termo de Consentimento');
  const signerName = parentName || 'Responsável Legal';
  const authHash = documentHashSha256 || validationCode || `DOC-${documentId.substring(0, 8).toUpperCase()}`;
  const company = companyName || 'Plataforma Catraki';
  const cancelledBy = revokedByName || (revokedByEmail ? revokedByEmail : null) || company;
  const reasonText = reason || 'Inconsistência cadastral ou operacional detectada no sistema';
  const websiteUrl = companyWebsite.startsWith('http') ? companyWebsite : `https://${companyWebsite}`;

  const body = `
    <p>Olá, ${signerName},</p>

    <p>
      Informamos que o processo de assinatura do documento
      "<strong>${docTitle}</strong>" foi <strong>cancelado</strong>
      e ele não possui mais validade jurídica.
    </p>

    <p>
      Para garantir total transparência, conforme exigido pela
      <strong>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>,
      compartilhamos abaixo os detalhes deste cancelamento:
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
      ${institutionName ? `
      <tr>
        <td class="label">Escola / Instituição</td>
        <td class="value">${institutionName}</td>
      </tr>` : ''}
      <tr>
        <td class="label">Código de Autenticidade</td>
        <td class="value"><span style="font-family:monospace;font-weight:bold;">${authHash}</span></td>
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
        <td class="value"><span class="badge badge-red">CANCELADO POR ERRO</span></td>
      </tr>
      <tr>
        <td class="label">Motivo</td>
        <td class="value" style="font-style:italic;color:#475569;">"${reasonText}"</td>
      </tr>
    </table>

    <div class="highlight-box">
      <strong>O que acontece agora?</strong><br>
      Os links e acessos que você recebeu anteriormente para este documento foram desativados. Você não precisa realizar nenhuma ação. Se o processo precisar continuar, a equipe responsável enviará um novo documento atualizado. Seus dados continuam protegidos e registrados em ambiente criptografado para fins de auditoria (LGPD Art. 16).
    </div>

    <p style="font-size:13px;color:#64748b;">
      Dúvidas? Responda este e-mail ou entre em contato:<br>
      Suporte: <a href="mailto:${supportEmail}" style="color:#034b7f;">${supportEmail}</a>${supportPhone ? ` &bull; Tel: ${supportPhone}` : ''}<br>
      Encarregado de Dados (DPO): <a href="mailto:${dpoContact}" style="color:#034b7f;">${dpoContact}</a>
    </p>

    <p style="margin-top:24px;font-size:13px;color:#334155;">
      Atenciosamente,<br><br>
      <strong>Equipe ${company}</strong><br>
      <span style="font-size:12px;color:#64748b;">
        <a href="${websiteUrl}" style="color:#034b7f;text-decoration:none;">${companyWebsite}</a>
      </span>
    </p>
  `;

  return buildEmailShell(
    'PLATAFORMA CATRAKI — ASSINATURA ELETRÔNICA',
    'Aviso de Cancelamento de Autorização',
    body,
    'Este é um e-mail transacional automático emitido em conformidade com o Marco Civil da Internet (Lei nº 12.965/2014) e a LGPD (Lei nº 13.709/2018).',
  );
}

/**
 * Versão texto puro do e-mail de cancelamento.
 */
export function getTransactionalCancellationEmailText(params: CancellationEmailParams): string {
  const {
    parentName,
    minorName,
    documentId,
    documentTitle,
    validationCode,
    cancelledAtFormatted,
    reason,
    companyName,
    documentHashSha256,
    revokedByName,
    revokedByEmail,
  } = params;

  const docTitle = documentTitle || (minorName ? `Termo de Consentimento - ${minorName}` : 'Termo de Consentimento');
  const signerName = parentName || 'Signatário';
  const authHash = documentHashSha256 || validationCode || `DOC-${documentId.substring(0, 8).toUpperCase()}`;
  const company = companyName || 'Plataforma Catraki';
  const cancelledBy = revokedByName || (revokedByEmail ? revokedByEmail : null) || company;
  const reasonText = reason || 'Inconsistência cadastral ou operacional detectada no sistema';

  return `Assunto: Aviso: O documento "${docTitle}" foi cancelado

Olá, ${signerName}. Informamos que o processo de assinatura do documento '${docTitle}' foi cancelado e ele não possui mais validade. Detalhes: Código de Autenticidade (Hash): ${authHash}; Cancelado por: ${cancelledBy}; Data: ${cancelledAtFormatted}; Motivo: '${reasonText}'. Os links anteriores foram desativados. Seus dados continuam protegidos.`;
}

// ============================================================================
// REVOGAÇÃO DE CONSENTIMENTO (LGPD Art. 18 — Iniciado pelo Titular)
// ============================================================================

/**
 * Gera o template HTML padronizado (design A4) para revogação voluntária de consentimento.
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
    supportEmail = 'suporte@catraki.com.br',
    dpoContact = 'privacidade@catraki.com.br',
    documentHashSha256,
    ntpTimestamp,
    ntpSource,
  } = params;

  const docCode = validationCode || `DOC-${documentId.substring(0, 8).toUpperCase()}`;

  const body = `
    <p>Prezado(a) <strong>${parentName || 'Responsável Legal'}</strong>,</p>

    <p>
      Confirmamos que você exerceu seu <strong>direito de revogação do consentimento</strong>
      nos termos do <strong>Art. 18, VIII, da Lei Geral de Proteção de Dados
      (LGPD — Lei nº 13.709/2018)</strong>.
    </p>

    <p>
      A autorização de atendimento vinculada ao(à) estudante <strong>${minorName}</strong>
      na instituição <strong>${institutionName}</strong> foi
      <strong>revogada com sucesso</strong>.
    </p>

    <table class="details-table">
      <tr>
        <td class="label">Código do Documento</td>
        <td class="value" style="font-family:monospace;font-weight:bold;">${docCode}</td>
      </tr>
      <tr>
        <td class="label">Estudante</td>
        <td class="value">${minorName}</td>
      </tr>
      <tr>
        <td class="label">Escola / Instituição</td>
        <td class="value">${institutionName}</td>
      </tr>
      <tr>
        <td class="label">Data da Revogação</td>
        <td class="value">${revokedAtFormatted}</td>
      </tr>
      <tr>
        <td class="label">Situação</td>
        <td class="value"><span class="badge badge-blue">CONSENTIMENTO REVOGADO</span></td>
      </tr>
      <tr>
        <td class="label">Motivo Informado</td>
        <td class="value" style="font-style:italic;color:#475569;">${reason}</td>
      </tr>
      ${ntpTimestamp ? `
      <tr>
        <td class="label">Carimbo do Tempo (NTP)</td>
        <td class="value" style="font-family:monospace;font-size:12px;">${ntpTimestamp}</td>
      </tr>` : ''}
      ${ntpSource ? `
      <tr>
        <td class="label">Fonte Temporal</td>
        <td class="value" style="font-size:12px;color:#64748b;">${ntpSource}</td>
      </tr>` : ''}
    </table>

    ${documentHashSha256 ? `
    <div class="hash-box">
      <strong>🔐 Hash SHA-256 do Documento (Lei 14.063/2020):</strong><br>
      ${documentHashSha256}<br>
      <span style="font-size:10px;color:#64748b;">Este código é a impressão digital criptográfica única deste documento.</span>
    </div>` : ''}

    <div class="highlight-box">
      <strong>O que acontece agora?</strong><br>
      O documento foi invalidado imediatamente. Todos os links de acesso ao formulário foram
      desativados e nenhum atendimento poderá ser realizado com base nesta autorização. Os
      dados foram preservados em ambiente seguro conforme o Art. 16 da LGPD exclusivamente
      para fins de auditoria.
    </div>

    <p style="font-size:13px;color:#64748b;">
      Para dúvidas, acesse nosso DPO: <a href="mailto:${dpoContact}" style="color:#034b7f;">${dpoContact}</a><br>
      Suporte do projeto: <a href="mailto:${supportEmail}" style="color:#034b7f;">${supportEmail}</a>
    </p>

    <p style="margin-top:24px;font-size:13px;color:#334155;">
      Atenciosamente,<br><br>
      <strong>Equipe Plataforma Catraki</strong>
    </p>
  `;

  return buildEmailShell(
    'PLATAFORMA CATRAKI — ASSINATURA ELETRÔNICA',
    'Confirmação de Revogação de Consentimento — LGPD Art. 18',
    body,
    'E-mail transacional imutável emitido pela Plataforma Catraki em conformidade com a LGPD (Lei nº 13.709/2018, Art. 18) e Marco Civil da Internet (Lei nº 12.965/2014).',
  );
}

/**
 * Versão texto puro do e-mail de revogação voluntária de consentimento.
 */
export function getRevocationEmailText(params: RevocationEmailParams): string {
  const {
    parentName, minorName, documentId, validationCode, revokedAtFormatted,
    institutionName, reason, supportEmail = 'suporte@catraki.com.br',
    dpoContact = 'privacidade@catraki.com.br', documentHashSha256, ntpTimestamp, ntpSource,
  } = params;
  const docCode = validationCode || `DOC-${documentId.substring(0, 8).toUpperCase()}`;

  return `[Plataforma Catraki] Confirmação de Revogação de Consentimento — LGPD Art. 18

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
Equipe Plataforma Catraki`;
}

// ---------------------------------------------------------------------------
// CONCLUSÃO DE PROCESSO DE ASSINATURA
// ---------------------------------------------------------------------------

/**
 * Gera o template HTML padronizado (design A4) para e-mail de conclusão de processo de assinatura.
 */
export function getTransactionalCompletionEmailHtml(params: CompletionEmailParams): string {
  const {
    signerName,
    documentTitle,
    downloadUrl,
    companyName = 'Plataforma Catraki',
    companyWebsite = 'www.catraki.com.br',
    supportEmail = 'suporte@catraki.com.br',
    supportPhone = '',
  } = params;

  const websiteUrl = companyWebsite.startsWith('http') ? companyWebsite : `https://${companyWebsite}`;

  const body = `
    <p>Olá, <strong>${signerName}</strong>!</p>

    <p>
      O processo de assinatura foi <strong>concluído com sucesso</strong> ✅
    </p>

    <p>
      Todas as partes já assinaram o documento "<strong>${documentTitle}</strong>".
      Em anexo, você encontra o arquivo original e o Certificado de Conclusão,
      contendo a trilha de auditoria que garante a validade jurídica do processo.
    </p>

    <div class="btn-container">
      <a href="${downloadUrl}" target="_blank" class="btn">⬇ Baixar Documento Assinado</a>
    </div>

    <div class="highlight-box">
      🔒 <strong>Aviso de Segurança:</strong><br>
      Este arquivo PDF anexado é o documento original e imutável. Recomendamos que você
      faça o download e guarde este e-mail para seus registros.
    </div>

    <p style="margin-top:24px;font-size:13px;color:#334155;">
      Atenciosamente,<br><br>
      <strong>Equipe ${companyName}</strong><br>
      <span style="font-size:12px;color:#64748b;">
        <a href="${websiteUrl}" style="color:#034b7f;text-decoration:none;">${companyWebsite}</a>
        ${supportPhone ? ` &bull; ${supportPhone}` : ''} &bull; ${supportEmail}
      </span>
    </p>
  `;

  return buildEmailShell(
    'PLATAFORMA CATRAKI — ASSINATURA ELETRÔNICA',
    'Confirmação de Conclusão de Assinatura',
    body,
    'Este é um e-mail transacional automático emitido em conformidade com a MP 2.200-2/2001, Lei 14.063/2020 e LGPD (Lei nº 13.709/2018).',
  );
}

/**
 * Versão texto puro do e-mail de conclusão de processo de assinatura.
 */
export function getTransactionalCompletionEmailText(params: CompletionEmailParams): string {
  const {
    signerName,
    documentTitle,
    downloadUrl,
    companyName = 'Plataforma Catraki',
    companyWebsite = 'www.catraki.com.br',
    supportEmail = 'suporte@catraki.com.br',
    supportPhone = '',
  } = params;

  return `Assunto: ✅ Documento finalizado: "${documentTitle}"

Olá, ${signerName}! Todas as partes assinaram o documento. Em anexo, você encontra o arquivo original e o Certificado de Conclusão com a validade jurídica. Guarde este arquivo.

Link para download:
${downloadUrl}

Atenciosamente,

Equipe ${companyName}
${companyWebsite} | ${supportPhone ? `${supportPhone} | ` : ''}${supportEmail}`;
}
