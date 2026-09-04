/**
 * ============================================================================
 * TEMPLATES DE E-MAIL TRANSACIONAL — PLATAFORMA CATRAKI
 * Design padronizado: folha A4 digital, logo Catraki, cabeçalho institucional,
 * tabelas de metadados, caixas de destaque e bases legais completas.
 * Conformidade: MP nº 2.200-2/2001 (Art. 10, § 2º), Lei nº 14.063/2020,
 * Código Civil (Arts. 104 e 107), CPC (Arts. 411 e 441), LGPD (Lei nº 13.709/2018),
 * Marco Civil da Internet (Lei nº 12.965/2014) e STJ (REsp nº 2.205.708/PR).
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// DESIGN SYSTEM — CSS compartilhado e compatível com clientes de e-mail
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
  /* Folha A4 Digital */
  .sheet {
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08), 0 4px 10px -2px rgba(0,0,0,0.04);
    overflow: hidden;
  }
  /* Cabeçalho: logo à esquerda, identificador à direita */
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
  /* Tabela de detalhes / metadados */
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
  /* Caixa de destaque / informação */
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
  /* Caixa de anexo do documento */
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
  /* Caixa de conformidade legal */
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
  /* Caixa de alerta / cancelamento */
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
  /* Badges */
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
    color: #334155;
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
    padding: 12px 24px;
    background-color: #034b7f;
    color: #ffffff !important;
    font-weight: 700;
    font-size: 13px;
    text-decoration: none;
    border-radius: 6px;
    letter-spacing: 0.02em;
  }
  /* Bloco OTP */
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
  /* Rodapé */
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
`;

/**
 * Envolve o conteúdo no shell padrão de e-mail com design de folha A4 e cabeçalho institucional.
 * @param emailTitle Título principal (ex: "Comprovante de Assinatura Eletrônica")
 * @param body       HTML interno do corpo do e-mail
 * @param footerExtra Texto opcional adicional no rodapé
 * @param projectOwners Entidades controladoras do projeto
 */
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

  const footer = footerExtra
    ? `${footerExtra}<br>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailTitle}</title>
  <style>${EMAIL_BASE_CSS}</style>
</head>
<body>
  <div class="wrapper">
    <div class="sheet">

      <!-- Cabeçalho Oficial -->
      <div class="sheet-header">
        <table class="sheet-header-table">
          <tr>
            <td class="logo-cell">
              <img src="https://www.catraki.com.br/catraki.png" alt="Logo Catraki" class="logo-img" width="48" height="48" />
            </td>
            <td class="title-cell">
              <p class="platform-tag">PLATAFORMA CATRAKI — ASSINATURA ELETRÔNICA</p>
              <h1 class="doc-title">${emailTitle}</h1>
              <span class="doc-date">${dataHoje} • Horário de Brasília</span>
            </td>
          </tr>
        </table>
      </div>
      <div class="header-divider"></div>

      <!-- Corpo do E-mail -->
      <div class="sheet-body">
        ${body}
      </div>

      <!-- Rodapé Institucional e Legal -->
      <div class="sheet-footer">
        ${footer}<strong>Assinatura Eletrônica</strong> &bull; MP nº 2.200-2/2001 (Art. 10, § 2º) &bull; Lei Federal nº 14.063/2020 &bull; Código Civil (Arts. 104 e 107) &bull; Plataforma Catraki<br>
        <span style="font-size: 9.5px; color: #64748b; display: block; margin: 8px 0; line-height: 1.5;">
          A Plataforma Catraki atua exclusivamente como infraestrutura tecnológica para registro de log e emissão de hash probatório (sem CNPJ e sem acesso a dados de saúde). A responsabilidade legal e clínica pelos dados do projeto é dos Controladores: ${projectOwners}.
        </span>
        Para mais informações sobre governança e segurança, consulte nossa
        <a href="https://www.catraki.com.br/privacidade">Política de Privacidade</a> e nossos
        <a href="https://www.catraki.com.br/termos">Termos de Uso</a>.
      </div>
      <!-- Barra institucional azul sólida -->
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
}

// ---------------------------------------------------------------------------
// ASSUNTOS PADRONIZADOS
// ---------------------------------------------------------------------------

export function getCancellationEmailSubject(): string {
  return `Escola Cidadã — Autorização Cancelada`;
}

export function getRevocationEmailSubject(_minorName?: string): string {
  return `Escola Cidadã — Consentimento Revogado`;
}

export function getCompletionEmailSubject(_documentTitle: string): string {
  return `Escola Cidadã — Autorização Concluída`;
}

// ============================================================================
// 1. SOLICITAÇÃO DE CÓDIGO DE SEGURANÇA (OTP 2FA)
// ============================================================================

/**
 * Gera o template HTML padronizado para e-mail de envio de código OTP 2FA.
 */
export function getTransactionalOtpEmailHtml(params: { studentName: string; otpCode: string }): string {
  const { studentName, otpCode } = params;
  const body = `
    <p>Olá,</p>
    <p>
      Para autenticar e concluir com segurança a assinatura eletrônica do Termo de Consentimento do(a)
      estudante <strong>${studentName}</strong>, utilize o código de uso único (2FA OTP) abaixo:
    </p>

    <div class="otp-box">
      <span class="otp-code">${otpCode}</span>
    </div>

    <div class="highlight-box">
      ⏱️ <strong>Instruções de Segurança:</strong><br>
      • Este código é <strong>pessoal, intransferível e expira em 5 minutos</strong>.<br>
      • A Plataforma Catraki e o SESI-DF <strong>nunca solicitarão este código por telefone, WhatsApp ou SMS</strong>.<br>
      • Se você não solicitou este acesso, desconsidere este e-mail imediatamente.
    </div>

    <div class="legal-box">
      <strong>Base Legal:</strong> Validação de autoria e integridade por duplo fator de autenticação eletrônica (2FA), em conformidade com o <strong>Art. 10, § 2º da Medida Provisória nº 2.200-2/2001</strong>, a <strong>Lei Federal nº 14.063/2020</strong> e a <strong>LGPD (Lei nº 13.709/2018)</strong>.
    </div>
  `;

  return buildEmailShell(
    'Código de Confirmação (2FA)',
    body,
    'Este é um e-mail transacional automático emitido para validação de autoria por código eletrônico de uso único.',
  );
}

/**
 * Versão texto puro do e-mail de OTP.
 */
export function getTransactionalOtpEmailText(params: { studentName: string; otpCode: string }): string {
  const { studentName, otpCode } = params;
  return `Assunto: Código de Confirmação: ${otpCode}

Olá,

Para confirmar e concluir a assinatura eletrônica do Termo de Consentimento do(a) estudante ${studentName}, utilize o código de segurança (2FA OTP) abaixo:

${otpCode}

Este código expira em 5 minutos. Não o compartilhe com terceiros.
Plataforma Catraki • MP nº 2.200-2/2001 e Lei nº 14.063/2020`;
}

// ============================================================================
// 2. CONCLUSÃO DE PROCESSO DE ASSINATURA (COMPROVANTE + PDF ANEXO)
// ============================================================================

/**
 * Gera o template HTML padronizado para e-mail de conclusão de assinatura.
 */
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
  } = params;

  const websiteUrl = companyWebsite.startsWith('http') ? companyWebsite : `https://${companyWebsite}`;
  const docCode = validationCode || 'CATRAKI-VALID';

  const body = `
    <p>Olá, <strong>${signerName}</strong>!</p>

    <div style="background-color: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 14px 18px; margin: 16px 0; color: #166534;">
      <p style="margin: 0; font-size: 14px; font-weight: 700;">
        ✅ Tudo pronto! Sua autorização eletrônica foi registrada com sucesso.
      </p>
      <p style="margin: 4px 0 0 0; font-size: 12.5px; color: #15803d;">
        O aceite eletrônico foi registrado e o comprovante com as informações da autorização está disponível.
      </p>
    </div>

    <table class="details-table">
      <tr>
        <td class="label">Documento</td>
        <td class="value">${documentTitle}</td>
      </tr>
      ${minorName ? `
      <tr>
        <td class="label">Estudante / Aluno(a)</td>
        <td class="value">${minorName}</td>
      </tr>` : ''}
      <tr>
        <td class="label">Responsável Signatário</td>
        <td class="value">${signerName}</td>
      </tr>
      ${institutionName ? `
      <tr>
        <td class="label">Escola / Unidade</td>
        <td class="value">${institutionName}</td>
      </tr>` : ''}
      <tr>
        <td class="label">Código de Autenticidade</td>
        <td class="value"><span style="font-family:monospace;font-weight:800;color:#034b7f;">${docCode}</span></td>
      </tr>
      ${signedAtFormatted ? `
      <tr>
        <td class="label">Data de Registro</td>
        <td class="value">${signedAtFormatted}</td>
      </tr>` : ''}
      ${manifestSha256 ? `
      <tr>
        <td class="label">Resumo Criptográfico</td>
        <td class="value" style="font-family:monospace;font-size:10.5px;word-break:break-all;">${manifestSha256}</td>
      </tr>` : ''}
      <tr>
        <td class="label">Situação</td>
        <td class="value"><span class="badge badge-green">ASSINADO E VÁLIDO</span></td>
      </tr>
    </table>

    <div class="attachment-box">
      <strong>📎 DOCUMENTO ORIGINAL ANEXADO A ESTE E-MAIL (PDF):</strong><br>
      Em anexo a esta mensagem, você encontra o arquivo <strong>PDF oficial</strong> contendo:<br>
      • A via do <strong>Termo de Consentimento Livre e Esclarecido (TCLE)</strong> com sua assinatura eletrônica manuscrita e marca d'água de proteção;<br>
      • O <strong>Comprovante de Conclusão e Trilha de Auditoria</strong>, com endereço IP, User-Agent, resumo SHA-256 e código de validação pública.
    </div>

    <div class="btn-container">
      <a href="${downloadUrl}" target="_blank" class="btn">⬇ Validar e Acessar Documento Online</a>
    </div>

    <div class="legal-box">
      <strong>⚖️ Enquadramento Jurídico e Conformidade Normativa:</strong><br>
      Este ato foi firmado em estrita conformidade com o <strong>Art. 10, § 2º da Medida Provisória nº 2.200-2/2001</strong>, a <strong>Lei Federal nº 14.063/2020</strong>, o <strong>Código Civil (Arts. 104 e 107)</strong>, o <strong>Código de Processo Civil (Arts. 411 e 441)</strong>, a <strong>LGPD (Lei nº 13.709/2018 - Arts. 7º, 11 e 14)</strong> e a jurisprudência consolidada do <strong>Superior Tribunal de Justiça (STJ — REsp nº 2.205.708/PR)</strong>.
    </div>

    <p style="margin-top:20px;font-size:12.5px;color:#64748b;">
      Dúvidas sobre o projeto ou sobre o documento? Entre em contato pelo e-mail:
      <a href="mailto:${supportEmail}" style="color:#034b7f;font-weight:bold;">${supportEmail}</a>${supportPhone ? ` ou telefone ${supportPhone}` : ''}.
    </p>

    <p style="margin-top:20px;font-size:13px;color:#334155;">
      Atenciosamente,<br><br>
      <strong>Equipe ${companyName}</strong><br>
      <span style="font-size:11.5px;color:#64748b;">
        <a href="${websiteUrl}" style="color:#034b7f;text-decoration:none;">${companyWebsite}</a>
      </span>
    </p>
  `;

  return buildEmailShell(
    'Comprovante de Assinatura Eletrônica',
    body,
    'Este é um e-mail transacional automático emitido em conformidade com a legislação brasileira de assinaturas eletrônicas.',
  );
}

/**
 * Versão texto puro do e-mail de conclusão de assinatura.
 */
export function getTransactionalCompletionEmailText(params: CompletionEmailParams): string {
  const {
    signerName,
    documentTitle,
    downloadUrl,
    minorName,
    institutionName,
    validationCode,
    manifestSha256,
    companyName = 'Plataforma Catraki',
    companyWebsite = 'www.catraki.com.br',
    supportEmail = 'suporte@catraki.com.br',
    supportPhone = '',
  } = params;

  const docCode = validationCode || 'CATRAKI-VALID';

  return `Assunto: ✅ Documento finalizado: "${documentTitle}"

Olá, ${signerName}!

Sua autorização eletrônica foi registrada com sucesso.
Em anexo a este e-mail, você encontra o arquivo PDF oficial contendo o Termo de Consentimento e o Comprovante de Conclusão com o resumo e o registro de auditoria.

RESUMO DO DOCUMENTO:
- Documento: ${documentTitle}
${minorName ? `- Estudante: ${minorName}\n` : ''}- Responsável Signatário: ${signerName}
${institutionName ? `- Escola / Unidade: ${institutionName}\n` : ''}- Código de Autenticidade: ${docCode}
${manifestSha256 ? `- Hash SHA-256: ${manifestSha256}\n` : ''}- Situação: ASSINADO E REGISTRADO

Link para consulta e download online:
${downloadUrl}

BASE LEGAL:
Lei Federal nº 14.063/2020 (Assinatura Eletrônica Simples), Medida Provisória nº 2.200-2/2001 (Art. 10, § 2º) e LGPD (Lei nº 13.709/2018).

Atenciosamente,
Equipe ${companyName}
${companyWebsite} | ${supportPhone ? `${supportPhone} | ` : ''}${supportEmail}`;
}

// ============================================================================
// 3. REVOGAÇÃO DE CONSENTIMENTO (LGPD Art. 18 — Iniciado pelo Titular)
// ============================================================================

/**
 * Gera o template HTML padronizado para revogação voluntária de consentimento.
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
    dpoContact = 'suporte@catraki.com.br',
    documentHashSha256,
  } = params;

  const docCode = validationCode || `CATRAKI-${documentId.substring(0, 4).toUpperCase()}-${documentId.substring(Math.max(0, documentId.length - 4)).toUpperCase()}`;

  const body = `
    <p>Prezado(a) <strong>${parentName || 'Responsável Legal'}</strong>,</p>

    <p>
      Confirmamos que você exerceu o seu <strong>direito de revogação de consentimento</strong>,
      em estrita observância ao <strong>Artigo 18, inciso VIII da Lei Geral de Proteção de Dados
      (LGPD — Lei nº 13.709/2018)</strong> e ao <strong>Artigo 8º, § 5º da mesma lei</strong>.
    </p>

    <p>
      A autorização de atendimento vinculada ao(à) estudante <strong>${minorName}</strong>
      na instituição <strong>${institutionName}</strong> foi
      <strong>revogada com sucesso</strong>.
    </p>

    <table class="details-table">
      <tr>
        <td class="label">Código do Documento</td>
        <td class="value"><span style="font-family:monospace;font-weight:800;color:#034b7f;">${docCode}</span></td>
      </tr>
      <tr>
        <td class="label">Estudante</td>
        <td class="value">${minorName}</td>
      </tr>
      <tr>
        <td class="label">Escola / Unidade</td>
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
        <td class="value" style="font-style:italic;color:#475569;">"${reason}"</td>
      </tr>
    </table>

    ${documentHashSha256 ? `
    <div class="hash-box">
      <strong>🔐 Resumo Criptográfico SHA-256 do Documento:</strong><br>
      ${documentHashSha256}<br>
      <span style="font-size:10px;color:#64748b;">Este código constitui a impressão digital imutável da trilha de auditoria.</span>
    </div>` : ''}

    <div class="highlight-box">
      ℹ️ <strong>Efeitos e Guarda de Registros:</strong><br>
      • Os links de acesso ao formulário foram desativados e nenhum novo atendimento clínico será realizado com base nesta autorização.<br>
      • Os registros históricos das ações realizadas até o momento da revogação permanecem guardados em ambiente seguro e sigiloso, conforme exige o <strong>Art. 16 da LGPD</strong>, para cumprimento de obrigação legal e auditoria.
    </div>

    <p style="font-size:12.5px;color:#64748b;">
      Para dúvidas sobre seus dados ou atendimento de privacidade:<br>
      Encarregado de Dados (DPO) e Suporte: <a href="mailto:${dpoContact || supportEmail}" style="color:#034b7f;font-weight:bold;">${dpoContact || supportEmail}</a>
    </p>

    <p style="margin-top:20px;font-size:13px;color:#334155;">
      Atenciosamente,<br><br>
      <strong>Equipe Plataforma Catraki</strong>
    </p>
  `;

  return buildEmailShell(
    'Revogação de Consentimento',
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
    dpoContact = 'suporte@catraki.com.br', documentHashSha256,
  } = params;
  const docCode = validationCode || `CATRAKI-${documentId.substring(0, 4).toUpperCase()}-${documentId.substring(Math.max(0, documentId.length - 4)).toUpperCase()}`;

  return `[Plataforma Catraki] Confirmação de Revogação de Consentimento — LGPD Art. 18

Prezado(a) ${parentName || 'Responsável Legal'},

Confirmamos que você exerceu o direito de revogação de consentimento (LGPD Art. 18, VIII e Art. 8º, § 5º).
A autorização de atendimento vinculada ao(à) estudante ${minorName} na instituição "${institutionName}" foi REVOGADA COM SUCESSO.

DADOS DA REVOGAÇÃO:
- Código do Documento: ${docCode}
- Estudante: ${minorName}
- Escola / Unidade: ${institutionName}
- Data da Revogação: ${revokedAtFormatted}
- Situação: CONSENTIMENTO REVOGADO (LGPD Art. 18)
- Motivo: ${reason}
${documentHashSha256 ? `\nHASH SHA-256 DO DOCUMENTO:\n${documentHashSha256}\n` : ''}
O QUE ACONTECE AGORA:
Os links de acesso foram desativados. Os dados históricos foram preservados em ambiente seguro conforme o Art. 16 da LGPD para fins de auditoria legal.

Canal de Atendimento:
- DPO e Suporte do Projeto: ${dpoContact || supportEmail}

Atenciosamente,
Equipe Plataforma Catraki`;
}

// ============================================================================
// 4. CANCELAMENTO ADMINISTRATIVO POR ERRO OU INCONSISTÊNCIA
// ============================================================================

/**
 * Gera o template HTML padronizado para notificação de cancelamento de documento.
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
    dpoContact = 'suporte@catraki.com.br',
    companyName = 'Plataforma Catraki',
    companyWebsite = 'www.catraki.com.br',
    documentHashSha256,
    revokedByName,
    revokedByEmail,
  } = params;

  const docTitle = documentTitle || (minorName ? `Termo de Consentimento - ${minorName}` : 'Termo de Consentimento');
  const signerName = parentName || 'Responsável Legal';
  const authHash = validationCode || documentHashSha256 || `CATRAKI-${documentId.substring(0, 4).toUpperCase()}-${documentId.substring(Math.max(0, documentId.length - 4)).toUpperCase()}`;
  const cancelledBy = revokedByName || (revokedByEmail ? revokedByEmail : null) || companyName;
  const reasonText = reason || 'Inconsistência cadastral ou operacional detectada no sistema';
  const websiteUrl = companyWebsite.startsWith('http') ? companyWebsite : `https://${companyWebsite}`;

  const body = `
    <p>Olá, <strong>${signerName}</strong>,</p>

    <p>Informamos que o processo de assinatura do documento <strong>«${docTitle}»</strong> foi cancelado administrativamente pela equipe do projeto.</p>

    <div class="alert-box">
      <strong>Aviso de Cancelamento:</strong> Os links de acesso gerados para este documento foram desativados por motivo de inconsistência ou duplicidade cadastral.
    </div>

    <table class="details-table">
      <tr>
        <td class="label">Documento</td>
        <td class="value">${docTitle}</td>
      </tr>
      ${minorName ? `
      <tr>
        <td class="label">Estudante / Aluno(a)</td>
        <td class="value">${minorName}</td>
      </tr>` : ''}
      ${institutionName ? `
      <tr>
        <td class="label">Escola / Unidade</td>
        <td class="value">${institutionName}</td>
      </tr>` : ''}
      <tr>
        <td class="label">Código de Autenticidade</td>
        <td class="value"><span style="font-family:monospace;font-weight:bold;color:#034b7f;">${authHash}</span></td>
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
        <td class="label">Justificativa</td>
        <td class="value" style="font-style:italic;color:#0f172a;">"${reasonText}"</td>
      </tr>
    </table>

    <div class="highlight-box">
      ℹ️ <strong>O que acontece agora?</strong><br>
      • <strong>Nenhuma ação é necessária da sua parte.</strong><br>
      • Caso a participação do(a) estudante no projeto deva continuar, a coordenação escolar ou a equipe do SESI enviará um novo link de autorização com os dados corrigidos.<br>
      • Seus dados continuam protegidos em estrita conformidade com a <strong>LGPD (Lei nº 13.709/2018)</strong>.
    </div>

    <p style="font-size:12.5px;color:#64748b;">
      Dúvidas? Entre em contato pelos canais oficiais:<br>
      Suporte: <a href="mailto:${supportEmail}" style="color:#034b7f;font-weight:bold;">${supportEmail}</a>${supportPhone ? ` &bull; Tel: ${supportPhone}` : ''}<br>
      Encarregado de Dados (DPO): <a href="mailto:${dpoContact}" style="color:#034b7f;font-weight:bold;">${dpoContact}</a>
    </p>

    <p style="margin-top:20px;font-size:13px;color:#334155;">
      Atenciosamente,<br><br>
      <strong>Equipe ${companyName}</strong><br>
      <span style="font-size:11.5px;color:#64748b;">
        <a href="${websiteUrl}" style="color:#034b7f;text-decoration:none;">${companyWebsite}</a>
      </span>
    </p>
  `;

  return buildEmailShell(
    'Cancelamento de Autorização',
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
    companyName = 'Plataforma Catraki',
    documentHashSha256,
    revokedByName,
    revokedByEmail,
  } = params;

  const docTitle = documentTitle || (minorName ? `Termo de Consentimento - ${minorName}` : 'Termo de Consentimento');
  const signerName = parentName || 'Signatário';
  const authHash = validationCode || documentHashSha256 || `CATRAKI-${documentId.substring(0, 4).toUpperCase()}-${documentId.substring(Math.max(0, documentId.length - 4)).toUpperCase()}`;
  const cancelledBy = revokedByName || (revokedByEmail ? revokedByEmail : null) || companyName;
  const reasonText = reason || 'Inconsistência cadastral ou operacional detectada no sistema';

  return `Assunto: Aviso: O documento "${docTitle}" foi cancelado

Olá, ${signerName}.

Informamos que o processo de assinatura do documento '${docTitle}' foi cancelado administrativamente.

DETALHES DO CANCELAMENTO:
- Documento: ${docTitle}
- Código de Autenticidade: ${authHash}
- Cancelado por: ${cancelledBy}
- Data: ${cancelledAtFormatted}
- Situação: CANCELADO POR ERRO
- Justificativa: "${reasonText}"

O que acontece agora?
Os links de acesso foram desativados. Nenhuma ação é necessária da sua parte. Seus dados continuam protegidos conforme a LGPD.

Atenciosamente,
Equipe ${companyName}`;
}
