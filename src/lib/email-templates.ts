/**
 * ============================================================================
 * TEMPLATES DE E-MAIL TRANSACIONAL — PLATAFORMA CATRAKI (Versão Definitiva)
 * Design padronizado: folha A4 digital, logo Catraki, cabeçalho institucional,
 * tabelas de metadados, caixas de destaque e bases legais completas.
 * Conformidade: MP nº 2.200-2/2001 (Art. 10, § 2º), Lei nº 14.063/2020,
 * Código Civil (Arts. 104 e 107), CPC (Arts. 411 e 441), LGPD (Lei nº 13.709/2018),
 * Marco Civil da Internet (Lei nº 12.965/2014) e STJ (REsp nº 2.205.708/PR).
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// UTILITÁRIO DE SEGURANÇA (Sanitização contra injeção de HTML / XSS)
// ---------------------------------------------------------------------------
export function escapeHtml(str?: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ---------------------------------------------------------------------------
// DESIGN SYSTEM — CSS Responsivo compatível com Webmail e Mobile (Dark/Light)
// ---------------------------------------------------------------------------
const EMAIL_BASE_CSS = `
  body {
    margin: 0;
    padding: 0;
    background-color: #eef2f7;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    -webkit-font-smoothing: antialiased;
  }
  .wrapper {
    width: 100%;
    background-color: #eef2f7;
    padding: 32px 12px;
  }
  /* Folha A4 Oficial Digital */
  .sheet {
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08), 0 4px 10px -2px rgba(0,0,0,0.04);
    overflow: hidden;
  }
  .sheet-header {
    padding: 24px 28px 18px 28px;
    background-color: #ffffff;
  }
  .sheet-header-table {
    width: 100%;
    border-collapse: collapse;
  }
  .logo-cell {
    vertical-align: middle;
    width: 52px;
    padding-right: 16px;
    text-align: left;
  }
  .logo-img {
    display: block;
    width: 48px;
    height: 48px;
    border-radius: 10px;
    border: none;
  }
  .title-cell {
    vertical-align: middle;
    text-align: right;
  }
  .platform-tag {
    margin: 0;
    font-size: 10px;
    font-weight: 700;
    color: #034b7f;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    line-height: 1.2;
  }
  .doc-title {
    margin: 3px 0 0 0;
    font-size: 16px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.3;
  }
  .doc-date {
    display: block;
    margin-top: 3px;
    font-size: 10.5px;
    color: #64748b;
    font-weight: 500;
  }
  .header-divider {
    height: 3px;
    background-color: #034b7f;
    margin: 0;
  }
  .sheet-body {
    padding: 28px 28px 24px 28px;
    font-size: 13.5px;
    color: #334155;
    line-height: 1.65;
  }
  .sheet-body p {
    margin: 0 0 14px 0;
  }
  .details-table {
    width: 100%;
    border-collapse: collapse;
    margin: 18px 0;
    background-color: #f8fafc;
    border-radius: 8px;
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
    width: 40%;
    background-color: #f1f5f9;
  }
  .details-table .value {
    color: #0f172a;
    font-weight: 600;
  }
  .highlight-box {
    background: #f0f9ff;
    border: 1.5px solid #bae6fd;
    border-radius: 8px;
    padding: 16px 18px;
    margin: 18px 0;
    color: #0369a1;
    font-size: 12.5px;
    line-height: 1.6;
  }
  .attachment-box {
    background: #f8fafc;
    border: 1.5px solid #cbd5e1;
    border-radius: 8px;
    padding: 16px 18px;
    margin: 18px 0;
    color: #1e293b;
    font-size: 12.5px;
    line-height: 1.6;
  }
  .legal-box {
    background-color: #f8fafc;
    border-left: 4px solid #034b7f;
    padding: 14px 16px;
    border-radius: 4px;
    margin: 18px 0;
    color: #334155;
    font-size: 11.5px;
    line-height: 1.6;
  }
  .alert-box {
    background-color: #fef2f2;
    border-left: 4px solid #ef4444;
    padding: 14px 16px;
    border-radius: 4px;
    margin: 18px 0;
    color: #991b1b;
    font-size: 12.5px;
    line-height: 1.6;
  }
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
  .hash-box {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 12px 14px;
    font-size: 11px;
    font-family: monospace;
    color: #334155;
    margin: 14px 0;
    word-break: break-all;
  }
  .btn-container {
    text-align: center;
    margin: 24px 0;
  }
  .btn {
    display: inline-block;
    padding: 12px 24px;
    background-color: #034b7f;
    color: #ffffff !important;
    font-weight: 700;
    font-size: 13px;
    text-decoration: none;
    border-radius: 6px;
    letter-spacing: 0.02em;
  }
  .otp-box {
    background: #f0f9ff;
    border: 2px solid #0284c7;
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
  .sheet-footer {
    border-top: 1px solid #e2e8f0;
    background-color: #f8fafc;
    padding: 18px 28px;
    text-align: center;
    font-size: 10.5px;
    color: #64748b;
    line-height: 1.6;
  }
  .sheet-footer a {
    color: #034b7f;
    text-decoration: underline;
    font-weight: 600;
  }

  /* Responsividade mobile para smartphones */
  @media screen and (max-width: 600px) {
    .wrapper { padding: 0 !important; }
    .sheet { border: none !important; border-radius: 0 !important; box-shadow: none !important; }
    .sheet-header { padding: 18px 16px 12px 16px !important; }
    .sheet-body { padding: 18px 16px !important; }
    .sheet-footer { padding: 16px !important; }
  }
`;

function buildEmailShell(
  emailTitle: string,
  body: string,
  footerExtra?: string,
  projectOwners: string = 'SESI-DF e FS/UnB'
): string {
  const dataHoje = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());

  const footer = footerExtra ? `${footerExtra}<br>` : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(emailTitle)}</title>
  <style>${EMAIL_BASE_CSS}</style>
</head>
<body>
  <div class="wrapper">
    <div class="sheet">
      <div class="sheet-header">
        <table class="sheet-header-table">
          <tr>
            <td class="logo-cell">
              <img src="https://www.catraki.com.br/catraki.png" alt="Logo Catraki" class="logo-img" width="48" height="48" />
            </td>
            <td class="title-cell">
              <p class="platform-tag">PLATAFORMA CATRAKI — ASSINATURA ELETRÔNICA</p>
              <h1 class="doc-title">${escapeHtml(emailTitle)}</h1>
              <span class="doc-date">${dataHoje} • Horário de Brasília</span>
            </td>
          </tr>
        </table>
      </div>
      <div class="header-divider"></div>
      <div class="sheet-body">
        ${body}
      </div>
      <div class="sheet-footer">
        ${footer}<strong>Assinatura Eletrônica</strong> &bull; MP nº 2.200-2/2001 (Art. 10, § 2º) &bull; Lei Federal nº 14.063/2020 &bull; Código Civil (Arts. 104 e 107) &bull; Plataforma Catraki<br>
        <span style="font-size: 9.5px; color: #64748b; display: block; margin: 8px 0; line-height: 1.5;">
          A Plataforma Catraki atua exclusivamente como infraestrutura tecnológica para registro de log e emissão de hash probatório (sem CNPJ e sem acesso a dados de saúde). A responsabilidade legal e clínica pelos dados do projeto é dos Controladores: ${escapeHtml(projectOwners)}.
        </span>
        Para mais informações sobre governança e segurança, consulte nossa
        <a href="https://www.catraki.com.br/privacidade">Política de Privacidade</a> e nossos
        <a href="https://www.catraki.com.br/termos">Termos de Uso</a>.
      </div>
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
  projectOwners?: string;
}

export interface CompletionEmailParams {
  signerName: string;
  documentTitle: string;
  downloadUrl: string;
  minorName?: string;
  parentName?: string;
  institutionName?: string;
  validationCode?: string;
  manifestSha256?: string;
  signedAtFormatted?: string;
  companyName?: string;
  companyWebsite?: string;
  supportEmail?: string;
  supportPhone?: string;
  dpoContact?: string;
  projectOwners?: string;
}

// ---------------------------------------------------------------------------
// ASSUNTOS INSTITUCIONAIS DINÂMICOS
// ---------------------------------------------------------------------------
export function getCancellationEmailSubject(documentTitle?: string): string {
  return `Comunicado Oficial: Atualização no documento ${documentTitle ? `"${documentTitle}"` : 'eletrônico'}`;
}

export function getCompletionEmailSubject(documentTitle: string): string {
  return `Comprovante de Conclusão e Assinatura: "${documentTitle}"`;
}

// ============================================================================
// 1. CÓDIGO DE SEGURANÇA (OTP 2FA)
// ============================================================================
export function getTransactionalOtpEmailHtml(params: { studentName: string; otpCode: string; projectOwners?: string }): string {
  const { studentName, otpCode, projectOwners } = params;
  const safeStudent = escapeHtml(studentName);
  const safeOtp = escapeHtml(otpCode);

  const body = `
    <p>Prezado(a) Senhor(a),</p>
    <p>
      Para autenticar e conferir validade jurídica à assinatura eletrônica do Termo de Consentimento referente ao(à) estudante 
      <strong>${safeStudent}</strong>, utilize o código de validação de uso único (2FA OTP) apresentado abaixo:
    </p>

    <div class="otp-box">
      <span class="otp-code">${safeOtp}</span>
    </div>

    <div class="highlight-box">
      🔒 <strong>Protocolo de Segurança e Autoria:</strong><br>
      • Este código é <strong>estritamente pessoal, intransferível e possui validade de 5 minutos</strong>.<br>
      • A Plataforma Catraki e as equipes institucionais parceiras <strong>jamais solicitam este código por telefone, WhatsApp ou SMS</strong>.<br>
      • Caso não reconheça esta solicitação, desconsidere esta mensagem. Seus dados continuam rigorosamente protegidos.
    </div>

    <div class="legal-box">
      <strong>Base Legal:</strong> Validação de autoria, integridade e duplo fator de autenticação (2FA) em conformidade com o 
      <strong>Art. 10, § 2º da Medida Provisória nº 2.200-2/2001</strong>, a <strong>Lei Federal nº 14.063/2020</strong> e a <strong>LGPD (Lei nº 13.709/2018)</strong>.
    </div>
  `;

  return buildEmailShell('Código de Confirmação e Autenticação (2FA)', body, 'Mensagem transacional gerada automaticamente para validação criptográfica de autoria.', projectOwners);
}

// ============================================================================
// 2. CONCLUSÃO DE PROCESSO DE ASSINATURA (COMPROVANTE + PDF ANEXO)
// ============================================================================
export function getTransactionalCompletionEmailHtml(params: CompletionEmailParams): string {
  const {
    signerName,
    documentTitle,
    downloadUrl,
    minorName,
    institutionName,
    validationCode,
    manifestSha256,
    signedAtFormatted,
    companyName = 'Plataforma Catraki',
    companyWebsite = 'www.catraki.com.br',
    supportEmail = 'suporte@catraki.com.br',
    supportPhone = '',
    projectOwners,
  } = params;

  const websiteUrl = companyWebsite.startsWith('http') ? companyWebsite : `https://${companyWebsite}`;
  const docCode = validationCode || 'CATRAKI-VALID';

  const body = `
    <p>Prezado(a) <strong>${escapeHtml(signerName)}</strong>,</p>

    <div style="background-color: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 14px 18px; margin: 16px 0; color: #166534;">
      <p style="margin: 0; font-size: 14px; font-weight: 700;">
        ✨ Assinatura Eletrônica Registrada com Sucesso
      </p>
      <p style="margin: 4px 0 0 0; font-size: 12.5px; color: #15803d;">
        O termo foi assinado eletronicamente e a respectiva trilha de auditoria probatória foi emitida.
      </p>
    </div>

    <table class="details-table">
      <tr>
        <td class="label">Documento</td>
        <td class="value">${escapeHtml(documentTitle)}</td>
      </tr>
      ${minorName ? `
      <tr>
        <td class="label">Estudante / Aluno(a)</td>
        <td class="value">${escapeHtml(minorName)}</td>
      </tr>` : ''}
      <tr>
        <td class="label">Responsável Legal (Signatário)</td>
        <td class="value">${escapeHtml(signerName)}</td>
      </tr>
      ${institutionName ? `
      <tr>
        <td class="label">Instituição / Unidade</td>
        <td class="value">${escapeHtml(institutionName)}</td>
      </tr>` : ''}
      <tr>
        <td class="label">Código de Autenticidade</td>
        <td class="value"><span style="font-family:monospace;font-weight:800;color:#034b7f;">${escapeHtml(docCode)}</span></td>
      </tr>
      ${signedAtFormatted ? `
      <tr>
        <td class="label">Data e Hora do Registro</td>
        <td class="value">${escapeHtml(signedAtFormatted)}</td>
      </tr>` : ''}
      ${manifestSha256 ? `
      <tr>
        <td class="label">Assinatura Criptográfica (SHA-256)</td>
        <td class="value" style="font-family:monospace;font-size:10.5px;word-break:break-all;">${escapeHtml(manifestSha256)}</td>
      </tr>` : ''}
      <tr>
        <td class="label">Status Jurídico</td>
        <td class="value"><span class="badge badge-green">VÁLIDO E IMUTÁVEL</span></td>
      </tr>
    </table>

    <div class="attachment-box">
      <strong>📎 DOCUMENTO OFICIAL EM ANEXO (PDF):</strong><br>
      Disponibilizamos em anexo a este e-mail o arquivo contendo:<br>
      • O <strong>Termo de Consentimento Livre e Esclarecido (TCLE)</strong> formalizado com o seu aceite eletrônico;<br>
      • O <strong>Comprovante de Conclusão e Trilha de Auditoria Técnica</strong> (contendo carimbo de tempo, IP, metadados e o Hash SHA-256 de garantia contra fraudes).
    </div>

    <div class="btn-container">
      <a href="${escapeHtml(downloadUrl)}" target="_blank" class="btn">🔍 Validar Documento no Portal Online</a>
    </div>

    <div class="legal-box">
      <strong>⚖️ Garantia de Validade Jurídica e Não-Repúdio:</strong><br>
      Este ato jurídico digital assegura a autoria e a integridade das manifestações de vontade, amparado pelo <strong>Art. 10, § 2º da Medida Provisória nº 2.200-2/2001</strong>, <strong>Lei Federal nº 14.063/2020</strong>, <strong>CPC (Arts. 411 e 441)</strong>, <strong>Código Civil</strong> e jurisprudência do <strong>STJ (REsp nº 2.205.708/PR)</strong>.
    </div>

    <p style="margin-top:20px;font-size:12.5px;color:#64748b;">
      Em caso de dúvidas a respeito do conteúdo ou do projeto, entre em contato através do canal oficial:
      <a href="mailto:${escapeHtml(supportEmail)}" style="color:#034b7f;font-weight:bold;">${escapeHtml(supportEmail)}</a>${supportPhone ? ` ou pelo telefone ${escapeHtml(supportPhone)}` : ''}.
    </p>

    <p style="margin-top:20px;font-size:13px;color:#334155;">
      Atenciosamente,<br><br>
      <strong>Equipe ${escapeHtml(companyName)}</strong><br>
      <span style="font-size:11.5px;color:#64748b;">
        <a href="${escapeHtml(websiteUrl)}" style="color:#034b7f;text-decoration:none;">${escapeHtml(companyWebsite)}</a>
      </span>
    </p>
  `;

  return buildEmailShell('Comprovante de Assinatura Eletrônica', body, 'E-mail transacional probatório emitido em conformidade com as normas brasileiras de assinaturas eletrônicas.', projectOwners);
}

export function getTransactionalCompletionEmailText(params: CompletionEmailParams): string {
  const { signerName, documentTitle, downloadUrl, minorName, institutionName, validationCode, manifestSha256, companyName = 'Plataforma Catraki', supportEmail = 'suporte@catraki.com.br' } = params;
  const docCode = validationCode || 'CATRAKI-VALID';

  return `Assunto: Comprovante de Conclusão: "${documentTitle}"

Olá, ${signerName}!
Sua autorização eletrônica foi registrada com sucesso e o arquivo PDF oficial encontra-se em anexo a esta mensagem.

DADOS DA CONCLUSÃO:
- Documento: ${documentTitle}
${minorName ? `- Estudante: ${minorName}\n` : ''}- Responsável: ${signerName}
${institutionName ? `- Unidade: ${institutionName}\n` : ''}- Código de Autenticidade: ${docCode}
${manifestSha256 ? `- Hash SHA-256: ${manifestSha256}\n` : ''}- Status: VÁLIDO E REGISTRADO

Acesse o documento online: ${downloadUrl}

BASE LEGAL: Lei Federal nº 14.063/2020 e MP nº 2.200-2/2001.
Atenciosamente, Equipe ${companyName} | ${supportEmail}`;
}

// ============================================================================
// 4. CANCELAMENTO ADMINISTRATIVO (Com linguagem humanizada e sem alarmismo)
// ============================================================================
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
    dpoContact = 'suporte@catraki.com.br',
    companyName = 'Plataforma Catraki',
    companyWebsite = 'www.catraki.com.br',
    documentHashSha256,
    revokedByName,
    revokedByEmail,
    projectOwners,
  } = params;

  const docTitle = documentTitle || (minorName ? `Termo de Consentimento - ${minorName}` : 'Termo de Consentimento');
  const signerName = parentName || 'Responsável Legal';
  const authHash = validationCode || documentHashSha256 || `CATRAKI-${documentId.substring(0, 4).toUpperCase()}-${documentId.substring(Math.max(0, documentId.length - 4)).toUpperCase()}`;
  const cancelledBy = revokedByName || (revokedByEmail ? revokedByEmail : null) || companyName;
  const reasonText = reason || 'Adequação cadastral ou operacional identificada pela gestão';
  const websiteUrl = companyWebsite.startsWith('http') ? companyWebsite : `https://${companyWebsite}`;

  const body = `
    <p>Olá, <strong>${escapeHtml(signerName)}</strong>,</p>

    <div style="background-color: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 14px 18px; margin: 16px 0; color: #1e293b;">
      <p style="margin: 0; font-size: 13.5px; font-weight: 600; color: #0f172a;">
        ℹ️ Fique tranquilo(a): esta alteração é uma rotina interna para ajustes cadastrais e operacionais.
      </p>
    </div>

    <p>
      Comunicamos que o processo de formalização referente ao documento <strong>«${escapeHtml(docTitle)}»</strong> foi 
      <strong>cancelado administrativamente</strong> pela equipe gestora do projeto. Os links de acesso anteriores foram desativados por segurança.
    </p>

    <table class="details-table">
      <tr>
        <td class="label">Documento</td>
        <td class="value">${escapeHtml(docTitle)}</td>
      </tr>
      ${minorName ? `
      <tr>
        <td class="label">Estudante / Aluno(a)</td>
        <td class="value">${escapeHtml(minorName)}</td>
      </tr>` : ''}
      ${institutionName ? `
      <tr>
        <td class="label">Instituição / Unidade</td>
        <td class="value">${escapeHtml(institutionName)}</td>
      </tr>` : ''}
      <tr>
        <td class="label">Código de Autenticidade</td>
        <td class="value"><span style="font-family:monospace;font-weight:bold;color:#034b7f;">${escapeHtml(authHash)}</span></td>
      </tr>
      <tr>
        <td class="label">Atualizado por</td>
        <td class="value">${escapeHtml(cancelledBy)}</td>
      </tr>
      <tr>
        <td class="label">Data da Atualização</td>
        <td class="value">${escapeHtml(cancelledAtFormatted)}</td>
      </tr>
      <tr>
        <td class="label">Status do Processo</td>
        <td class="value"><span class="badge badge-red">CANCELADO ADMINISTRATIVAMENTE</span></td>
      </tr>
      <tr>
        <td class="label">Contexto / Justificativa</td>
        <td class="value" style="font-style:italic;color:#0f172a;">"${escapeHtml(reasonText)}"</td>
      </tr>
    </table>

    <div class="highlight-box">
      <strong>O que acontece agora?</strong><br>
      • <strong>Nenhuma providência é exigida de sua parte neste momento.</strong><br>
      • Caso a participação ou o atendimento do(a) estudante mantenha-se ativo, a coordenação responsável enviará um novo convite com as informações devidamente regularizadas.<br>
      • Seus dados pessoais continuam protegidos em total conformidade com a <strong>LGPD (Lei nº 13.709/2018)</strong>.
    </div>

    <p style="font-size:12.5px;color:#64748b;">
      Em caso de dúvidas sobre este procedimento, utilize os canais oficiais de atendimento:<br>
      Suporte Técnico: <a href="mailto:${escapeHtml(supportEmail)}" style="color:#034b7f;font-weight:bold;">${escapeHtml(supportEmail)}</a>${supportPhone ? ` &bull; Tel: ${escapeHtml(supportPhone)}` : ''}<br>
      Encarregado de Dados (DPO): <a href="mailto:${escapeHtml(dpoContact)}" style="color:#034b7f;font-weight:bold;">${escapeHtml(dpoContact)}</a>
    </p>

    <p style="margin-top:20px;font-size:13px;color:#334155;">
      Atenciosamente,<br><br>
      <strong>Equipe ${escapeHtml(companyName)}</strong><br>
      <span style="font-size:11.5px;color:#64748b;">
        <a href="${escapeHtml(websiteUrl)}" style="color:#034b7f;text-decoration:none;">${escapeHtml(companyWebsite)}</a>
      </span>
    </p>
  `;

  return buildEmailShell('Atualização de Documento e Cancelamento Administrativo', body, 'E-mail transacional automático emitido em conformidade com o Marco Civil da Internet e a LGPD.', projectOwners);
}

export function getTransactionalCancellationEmailText(params: CancellationEmailParams): string {
  const { parentName, minorName, documentId, documentTitle, validationCode, cancelledAtFormatted, reason, companyName = 'Plataforma Catraki', documentHashSha256, revokedByName, revokedByEmail } = params;
  const docTitle = documentTitle || (minorName ? `Termo de Consentimento - ${minorName}` : 'Termo de Consentimento');
  const signerName = parentName || 'Signatário';
  const authHash = validationCode || documentHashSha256 || `CATRAKI-${documentId.substring(0, 4).toUpperCase()}`;
  const cancelledBy = revokedByName || revokedByEmail || companyName;
  const reasonText = reason || 'Adequação cadastral ou operacional identificada pela gestão';

  return `Assunto: Comunicado Oficial: Atualização no documento "${docTitle}"

Olá, ${signerName}.
Fique tranquilo(a): tratam-se de ajustes cadastrais rotineiros. O processo de assinatura do documento '${docTitle}' foi cancelado administrativamente para fins de atualização ou correção.

DETALHES:
- Documento: ${docTitle}
- Código: ${authHash}
- Atualizado por: ${cancelledBy}
- Data: ${cancelledAtFormatted}
- Motivo: "${reasonText}"

O que acontece agora? Os links anteriores foram desativados. Se necessário, um novo convite será enviado. Seus dados permanecem protegidos conforme a LGPD.

Atenciosamente, Equipe ${companyName}`;
}