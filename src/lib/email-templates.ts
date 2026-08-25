/**
 * ============================================================================
 * TEMPLATES DE E-MAIL TRANSACIONAL — PLATAFORMA CATRAKI / SESI SAÚDE
 * Conformidade: LGPD (Lei nº 13.709/2018 - Arts. 6º, VI e 18) e Marco Civil
 * ============================================================================
 */

export interface CancellationEmailParams {
  parentName: string;
  minorName: string;
  documentId: string;
  validationCode?: string;
  cancelledAtFormatted: string;
  institutionName: string;
  reason?: string;
  supportEmail?: string;
  dpoContact?: string;
}

/**
 * Gera o template HTML responsivo, acolhedor e profissional para notificação de cancelamento por inconsistência operacional.
 */
export function getTransactionalCancellationEmailHtml(params: CancellationEmailParams): string {
  const {
    parentName,
    minorName,
    documentId,
    validationCode,
    cancelledAtFormatted,
    institutionName,
    reason,
    supportEmail = 'suporte.escolacidada@catraki.com.br',
    dpoContact = 'privacidade@catraki.com.br',
  } = params;

  const docCode = validationCode || `DOC-${documentId.substring(0, 8).toUpperCase()}`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notificação de Invalidação de Documento — SESI Saúde / Escola Cidadã</title>
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
      width: 40%;
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
        <h1>SESI Saúde &bull; Escola Cidadã</h1>
        <p>Sistema Digital de Gestão de Autorizações e Consentimento</p>
      </div>

      <div class="content">
        <div class="greeting">
          Prezado(a) ${parentName || 'Responsável Legal'},
        </div>

        <p>
          Esperamos que você esteja bem. Entramos em contato para comunicar com total transparência que a autorização de atendimento vinculada ao(à) estudante <strong>${minorName}</strong> foi <strong>invalidada administrativamente por motivo de inconsistência operacional</strong>.
        </p>

        <div class="alert-box">
          <strong>O que isso significa?</strong><br>
          O formulário/documento anterior foi desativado e perdeu qualquer validade para a realização de atendimentos. Nenhum procedimento será executado com base no termo anterior.
        </div>

        <table class="details-table">
          <tr>
            <td class="label">Código do Documento</td>
            <td class="value"><span style="font-family: monospace; font-weight: bold;">${docCode}</span></td>
          </tr>
          <tr>
            <td class="label">Estudante / Aluno(a)</td>
            <td class="value">${minorName}</td>
          </tr>
          <tr>
            <td class="label">Escola / Instituição</td>
            <td class="value">${institutionName}</td>
          </tr>
          <tr>
            <td class="label">Data da Invalidação</td>
            <td class="value">${cancelledAtFormatted}</td>
          </tr>
          <tr>
            <td class="label">Situação Atual</td>
            <td class="value"><span class="badge-status">CANCELADO POR ERRO</span></td>
          </tr>
          ${reason ? `
          <tr>
            <td class="label">Motivo Informado</td>
            <td class="value" style="font-style: italic; color: #475569;">${reason}</td>
          </tr>` : ''}
        </table>

        <div class="steps-box">
          <h3>📋 Próximos Passos</h3>
          <ul>
            <li><strong>Emissão de Nova Via:</strong> Caso o(a) estudante ainda deseje participar dos atendimentos de saúde do projeto, a equipe escolar ou o SESI emitirá um novo link oficial para preenchimento correto dos dados.</li>
            <li><strong>Nenhuma Ação Imediata é Exigida:</strong> Você não precisa responder a este e-mail. Caso receba um novo link oficial enviado pela escola, basta realizar a leitura e assinar a nova via atualizada.</li>
            <li><strong>Atendimentos Seguros:</strong> O SESI e a Universidade de Brasília reafirmam o compromisso de realizar atendimentos somente com consentimento plenamente válido e atualizado.</li>
          </ul>
        </div>

        <div class="security-badge">
          🔒 <strong>Segurança e Privacidade Garantidas (LGPD):</strong><br>
          Os dados do documento invalidado foram preservados em ambiente criptografado e seguro unicamente para fins de conformidade legal, registro de auditoria e prestação de contas (Art. 16 da Lei nº 13.709/2018 e Art. 15 da Lei nº 12.965/2014), sem qualquer uso comercial ou compartilhamento indevido.
        </div>

        <p style="margin-top: 24px; font-size: 14px; color: #64748b;">
          Em caso de dúvidas sobre o projeto ou sobre o tratamento de seus dados pessoais, você pode contatar nosso Encarregado de Dados (DPO) através do e-mail <a href="mailto:${dpoContact}" style="color: #004b8d; font-weight: 600;">${dpoContact}</a> ou o suporte do projeto em <a href="mailto:${supportEmail}" style="color: #004b8d; font-weight: 600;">${supportEmail}</a>.
        </p>

        <p style="margin-top: 28px; font-size: 14px; color: #334155;">
          Atenciosamente,<br>
          <strong>Equipe Escola Cidadã — Saúde em Movimento</strong><br>
          <span style="font-size: 13px; color: #64748b;">SESI-DF &bull; Faculdade de Ciências da Saúde / UnB</span>
        </p>
      </div>

      <div class="footer">
        Este é um e-mail transacional de notificação automática emitido pela plataforma oficial Catraki / SESI Saúde em conformidade com o Marco Civil da Internet (Lei nº 12.965/2014) e a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Gera a versão em texto puro do e-mail de notificação de cancelamento por inconsistência operacional.
 */
export function getTransactionalCancellationEmailText(params: CancellationEmailParams): string {
  const {
    parentName,
    minorName,
    documentId,
    validationCode,
    cancelledAtFormatted,
    institutionName,
    reason,
    supportEmail = 'suporte.escolacidada@catraki.com.br',
    dpoContact = 'privacidade@catraki.com.br',
  } = params;

  const docCode = validationCode || `DOC-${documentId.substring(0, 8).toUpperCase()}`;

  return `[SESI Saúde / Escola Cidadã] Notificação de Invalidação de Documento

Prezado(a) ${parentName || 'Responsável Legal'},

Comunicamos que a autorização de atendimento vinculada ao(à) estudante ${minorName} na instituição "${institutionName}" foi INVALIDADA ADMINISTRATIVAMENTE por motivo de inconsistência operacional na plataforma Catraki / SESI Saúde.

DADOS DA OCORRÊNCIA:
- Código do Documento: ${docCode}
- Estudante: ${minorName}
- Escola / Unidade: ${institutionName}
- Data da Invalidação: ${cancelledAtFormatted}
- Situação: CANCELADO POR ERRO
${reason ? `- Motivo Registrado: ${reason}\n` : ''}
O QUE ISSO SIGNIFICA:
O documento anterior perdeu qualquer validade jurídica e operacional para a realização de atendimentos no âmbito do projeto. Nenhum procedimento médico ou odontológico será realizado com base no formulário cancelado.

PRÓXIMOS PASSOS:
1. Caso o(a) estudante ainda vá participar do projeto, a equipe escolar ou o SESI disponibilizará um novo link para emissão de uma via correta e atualizada.
2. Nenhuma providência imediata é necessária de sua parte neste momento.

SEGURANÇA E PRIVACIDADE (LGPD):
Em estrita conformidade com a LGPD (Lei nº 13.709/2018, Art. 16) e com o Marco Civil da Internet (Lei nº 12.965/2014, Art. 15), o histórico deste documento foi arquivado de forma criptografada e imutável exclusivamente para fins de auditoria forense e salvaguarda de direitos, com acesso bloqueado para novas alterações.

Canais de Atendimento e DPO:
- Encarregado de Dados (DPO): ${dpoContact}
- Suporte do Projeto: ${supportEmail}

Atenciosamente,
Equipe Escola Cidadã — Saúde em Movimento
SESI-DF / Faculdade de Ciências da Saúde (FS/UnB)`;
}
