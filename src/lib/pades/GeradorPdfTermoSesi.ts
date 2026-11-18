import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { LOGO_BASE64 } from './LogoBase64.ts';
import { calcularIdade, formatBrasiliaDateTime } from '../schemas.ts';
import { desenharQrCodeVetorial } from './qr-pdf.ts';

export interface IDadosTermoPdf {
  tituloProcedimento: string;
  descricaoProcedimento: string;
  nomeMenor: string;
  dataNascimentoMenor: string;
  nomeResponsavel: string;
  cpfResponsavelMascarado: string;
  cpfResponsavelCompleto?: string;
  parentesco: string;
  autorizacaoSaude: boolean;
  autorizacaoDados: boolean;
  autorizacaoImagem: boolean;
  hashManifesto?: string;
  dataAssinatura?: Date;
  assinaturaPngBase64?: string;
  tipoAssinatura?: 'ELETRONICA';
  ipAddress?: string;
  userAgent?: string;
  geoCidade?: string;
  geoEstado?: string;
  geoPais?: string;
  geoLocalizacaoCompleta?: string;
  ipVersion?: 'IPv4' | 'IPv6';
  provedorAsn?: string;
  otpRequestedAt?: Date;
  otpVerifiedAt?: Date;
  signerEmail?: string;
  signerPhone?: string;
  minorCpfMascarado?: string;
  minorCpfCompleto?: string;
  nomeEscola?: string;
  isMaiorDeIdade?: boolean;
  nomeProjeto?: string;
  instituicao1Nome?: string;
  instituicao1Cnpj?: string;
  instituicao2Nome?: string;
  instituicao2Cnpj?: string;
  termosVersao?: string;
  privacyPolicyVersion?: string;
}

/**
 * Gerador de PDF A4 Oficial para Termos de Consentimento (TCLE) SESI Saúde / Catraki
 * Formatado rigorosamente de acordo com as normas ABNT e os preceitos da LGPD (Lei nº 13.709/2018),
 * Medida Provisória nº 2.200-2/2001 (Art. 10, § 2º), Lei nº 14.063/2020, Código Civil (Arts. 104, 107 e 225),
 * Código de Processo Civil (Arts. 411 e 441), Código Penal (Art. 299) e ECA (Lei nº 8.069/1990).
 */
export class GeradorPdfTermoSesi {
  public static async gerarPdfOriginal(dados: IDadosTermoPdf): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();

    // Metadados do PDF
    pdfDoc.setTitle(`Termo de Consentimento — ${dados.nomeMenor}`);
    pdfDoc.setAuthor('Plataforma Catraki');
    pdfDoc.setSubject('Termo de Consentimento Livre e Esclarecido (TCLE) — Escola Cidadã');
    pdfDoc.setKeywords(['LGPD', 'MP 2.200-2/2001', 'Lei 14.063/2020', 'Código Civil', 'CPC', 'Catraki', 'SESI-DF', 'UnB', 'Assinatura Eletrônica']);
    pdfDoc.setCreationDate(dados.dataAssinatura || new Date());
    pdfDoc.setModificationDate(dados.dataAssinatura || new Date());

    // Fontes Oficiais
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

    // Cores Formais ABNT (Textos em Preto)
    const corPreto = rgb(0.04, 0.04, 0.04);
    const corAzulSesi = rgb(3 / 255, 75 / 255, 127 / 255); // #034b7f
    const corVerde = rgb(16 / 255, 124 / 255, 65 / 255);
    const corVermelho = rgb(185 / 255, 28 / 255, 28 / 255);
    const corCinzaEscuro = rgb(0.35, 0.35, 0.35);
    const corCinzaLinha = rgb(0.78, 0.81, 0.85);
    const corMarcaDaguaFundo = rgb(0.88, 0.90, 0.93);
    const corMarcaDaguaSobreposta = rgb(0.70, 0.74, 0.80);

    // Determina a maioridade do estudante (>= 18 anos)
    let isMaior = !!dados.isMaiorDeIdade;
    if (!isMaior && dados.dataNascimentoMenor) {
      let birthDateObj: Date | null = null;
      if (dados.dataNascimentoMenor.includes('/')) {
        const [d, m, y] = dados.dataNascimentoMenor.split('/');
        birthDateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      } else if (dados.dataNascimentoMenor.includes('-')) {
        birthDateObj = new Date(dados.dataNascimentoMenor);
      }
      if (birthDateObj && !isNaN(birthDateObj.getTime())) {
        const age = calcularIdade(birthDateObj, dados.dataAssinatura || new Date());
        if (age >= 18) {
          isMaior = true;
        }
      }
    }

    // Parametrização dos Controladores e Projeto
    const nomeProjeto = dados.nomeProjeto || 'Escola Cidadã: Saúde em Movimento';
    const inst1Nome = dados.instituicao1Nome || 'Universidade de Brasília (UnB)';
    const inst1Cnpj = dados.instituicao1Cnpj || '00.038.174/0001-43';
    const inst2Nome = dados.instituicao2Nome || 'Serviço Social da Indústria (SESI-DF)';
    const inst2Cnpj = dados.instituicao2Cnpj || '03.777.341/0001-08';
    const controladoresStr = `${inst1Nome} - CNPJ ${inst1Cnpj} e ${inst2Nome} - CNPJ ${inst2Cnpj}`;

    // Carregamento do Logo Catraki
    let logoCatrakiImg: any = null;
    try {
      const logoBytes = Uint8Array.from(atob(LOGO_BASE64), (c) => c.charCodeAt(0));
      logoCatrakiImg = await pdfDoc.embedPng(logoBytes);
    } catch (err) {
      console.warn('[PDF] Falha ao incorporar logo Catraki:', err);
    }

    // Formatação de data da assinatura no Horário Oficial de Brasília
    const dataHoraStr = formatBrasiliaDateTime(dados.dataAssinatura || new Date());

    // Código de validação curto
    const validationCode = dados.hashManifesto
      ? `CATRAKI-${dados.hashManifesto.substring(0, 4).toUpperCase()}-${dados.hashManifesto.substring(dados.hashManifesto.length - 4).toUpperCase()}`
      : 'CATRAKI-PENDENTE';

    // ========================================================================
    // PÁGINA 1: TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO (TCLE)
    // ========================================================================
    const page1 = pdfDoc.addPage([595.28, 841.89]); // A4 padrão (210 x 297 mm)
    const { width, height } = page1.getSize();
    const margemEsquerda = 45;
    const margemDireita = 45;

    let y = height - 40;

    // 1. Cabeçalho Institucional ABNT com Logo Catraki (preservando proporção original)
    const logoDims = logoCatrakiImg ? logoCatrakiImg.scaleToFit(28, 28) : null;
    if (logoCatrakiImg && logoDims) {
      page1.drawImage(logoCatrakiImg, {
        x: margemEsquerda,
        y: y - 22,
        width: logoDims.width,
        height: logoDims.height,
      });
    }

    const xCabecalhoTexto = logoDims ? margemEsquerda + logoDims.width + 10 : margemEsquerda;

    page1.drawText('PLATAFORMA CATRAKI', {
      x: xCabecalhoTexto,
      y: y - 5,
      size: 11,
      font: fontBold,
      color: corAzulSesi,
    });

    page1.drawText('Termo de Consentimento Livre e Esclarecido (TCLE)', {
      x: xCabecalhoTexto,
      y: y - 17,
      size: 7.5,
      font: fontRegular,
      color: corCinzaEscuro,
    });

    // Numeração de Página ABNT + Protocolo (Canto Superior Direito)
    const folha1Label = 'Folha 1 / 2';
    page1.drawText(folha1Label, {
      x: width - margemDireita - fontBold.widthOfTextAtSize(folha1Label, 8),
      y: y - 5,
      size: 8,
      font: fontBold,
      color: corCinzaEscuro,
    });
    const protoTop = `Protocolo: ${validationCode}`;
    page1.drawText(protoTop, {
      x: width - margemDireita - fontMono.widthOfTextAtSize(protoTop, 7),
      y: y - 16,
      size: 7,
      font: fontMono,
      color: corAzulSesi,
    });

    y -= 28;

    // Linha divisória superior
    page1.drawLine({
      start: { x: margemEsquerda, y },
      end: { x: width - margemDireita, y },
      thickness: 1.5,
      color: corAzulSesi,
    });

    // Quadro Resumo de Identificação das Partes (2 colunas)
    y -= 10;
    const resumoH = 44;
    const contentWidth = width - margemEsquerda - margemDireita;
    page1.drawRectangle({
      x: margemEsquerda,
      y: y - resumoH,
      width: contentWidth,
      height: resumoH,
      color: rgb(0.97, 0.98, 0.99),
      borderColor: corCinzaLinha,
      borderWidth: 0.6,
    });
    page1.drawLine({
      start: { x: margemEsquerda + contentWidth / 2, y: y - 4 },
      end: { x: margemEsquerda + contentWidth / 2, y: y - resumoH + 4 },
      thickness: 0.5,
      color: corCinzaLinha,
    });

    const cpfIntro = isMaior
      ? (dados.minorCpfCompleto || dados.cpfResponsavelCompleto || dados.minorCpfMascarado || dados.cpfResponsavelMascarado || '***.***.***-**')
      : (dados.cpfResponsavelCompleto || dados.minorCpfCompleto || dados.cpfResponsavelMascarado || dados.minorCpfMascarado || '***.***.***-**');

    page1.drawText(isMaior ? 'TITULAR (ESTUDANTE MAIOR DE IDADE)' : 'ESTUDANTE / BENEFICIÁRIO(A)', {
      x: margemEsquerda + 8,
      y: y - 11,
      size: 6.5,
      font: fontBold,
      color: corAzulSesi,
    });
    page1.drawText(dados.nomeMenor.trim().slice(0, 38), {
      x: margemEsquerda + 8,
      y: y - 22,
      size: 8,
      font: fontBold,
      color: corPreto,
    });
    const estudanteSub = `Nasc.: ${dados.dataNascimentoMenor}${dados.nomeEscola ? ` • ${dados.nomeEscola.slice(0, 26)}` : ''}`;
    page1.drawText(estudanteSub, {
      x: margemEsquerda + 8,
      y: y - 33,
      size: 6.8,
      font: fontRegular,
      color: corCinzaEscuro,
    });

    const colDirX = margemEsquerda + contentWidth / 2 + 10;
    page1.drawText(isMaior ? 'SIGNATÁRIO (PRÓPRIO ESTUDANTE)' : 'RESPONSÁVEL LEGAL (SIGNATÁRIO)', {
      x: colDirX,
      y: y - 11,
      size: 6.5,
      font: fontBold,
      color: corAzulSesi,
    });
    const nomeSig = (isMaior ? dados.nomeMenor : dados.nomeResponsavel).trim().slice(0, 38);
    page1.drawText(nomeSig, {
      x: colDirX,
      y: y - 22,
      size: 8,
      font: fontBold,
      color: corPreto,
    });
    page1.drawText(`CPF: ${cpfIntro} • Vínculo: ${isMaior ? 'Titular' : dados.parentesco}`, {
      x: colDirX,
      y: y - 33,
      size: 6.8,
      font: fontRegular,
      color: corCinzaEscuro,
    });

    y -= resumoH + 12;

    // 2. Parágrafo de Apresentação e Qualificação (com Controladores CNPJ e Lógica de Maioridade ECA vs CC)
    const textoIntro = isMaior
      ? `Eu, ${dados.nomeMenor.trim()}, portador(a) do CPF ${cpfIntro}, nascido(a) em ${dados.dataNascimentoMenor}, declaro que recebi as orientações sobre o projeto itinerante "${nomeProjeto}", realizado por ${controladoresStr}. Manifesto meu consentimento livre, informado e inequívoco, aplicável ao tratamento de dados sensíveis conforme o Art. 11, I e Art. 18 da LGPD (Lei nº 13.709/2018) e autorização de imagem (Art. 20 da Lei nº 10.406/2002 - Código Civil), para os itens selecionados abaixo:`
      : `Eu, ${dados.nomeResponsavel.trim()}, portador(a) do CPF ${cpfIntro}, na qualidade de responsável legal do(a) estudante ${dados.nomeMenor.trim()}, nascido(a) em ${dados.dataNascimentoMenor}, declaro que recebi as orientações sobre o projeto itinerante "${nomeProjeto}", realizado por ${controladoresStr}. Manifesto meu consentimento livre, informado e inequívoco, nos termos do Art. 14 e Art. 18 da LGPD (Lei nº 13.709/2018) e do Art. 17 do ECA (Lei nº 8.069/1990), para os itens selecionados abaixo:`;

    const linhasIntro = this.quebrarTexto(textoIntro, 94);
    for (let i = 0; i < linhasIntro.length; i++) {
      page1.drawText(linhasIntro[i], {
        x: margemEsquerda + (i === 0 ? 22 : 0),
        y,
        size: 8.2,
        font: fontRegular,
        color: corPreto,
      });
      y -= 10.8;
    }

    // 3. Seção 1: DO OBJETO E ATENDIMENTO DE SAÚDE
    y -= 6;
    page1.drawRectangle({ x: margemEsquerda, y: y - 3, width: 3, height: 11, color: corAzulSesi });
    page1.drawText(`1. DO PROCEDIMENTO: ${dados.tituloProcedimento.toUpperCase()}`, {
      x: margemEsquerda + 8,
      y,
      size: 9,
      font: fontBold,
      color: corAzulSesi,
    });

    y -= 11;
    const linhasDescricao = this.quebrarTexto(dados.descricaoProcedimento, 95).slice(0, 4);
    for (const linha of linhasDescricao) {
      if (y < 140) break;
      page1.drawText(linha, {
        x: margemEsquerda,
        y,
        size: 7.8,
        font: fontRegular,
        color: corPreto,
      });
      y -= 10;
    }

    // 4. Seção 2: OPÇÕES DE CONSENTIMENTO E DECLARAÇÃO MARCADAS
    y -= 6;
    const tituloSecao2 = isMaior
      ? '2. OPÇÕES DE CONSENTIMENTO E DECLARAÇÃO MARCADAS (LGPD ARTS. 11, I E 18 • CC ART. 20)'
      : '2. OPÇÕES DE CONSENTIMENTO E DECLARAÇÃO MARCADAS (LGPD ARTS. 14 E 18 • ECA ART. 17)';

    page1.drawRectangle({ x: margemEsquerda, y: y - 3, width: 3, height: 11, color: corAzulSesi });
    page1.drawText(tituloSecao2, {
      x: margemEsquerda + 8,
      y,
      size: 8.6,
      font: fontBold,
      color: corAzulSesi,
    });

    const desenharBadgeStatus = (autorizado: boolean, linhaY: number, labelPositivo = 'AUTORIZADO', labelNegativo = 'NÃO AUTORIZADO') => {
      const texto = autorizado ? labelPositivo : labelNegativo;
      const corTexto = autorizado ? corVerde : corVermelho;
      const corFundo = autorizado ? rgb(0.93, 0.98, 0.95) : rgb(0.99, 0.94, 0.94);
      const badgeW = fontBold.widthOfTextAtSize(texto, 6.8) + 10;
      const badgeX = width - margemDireita - badgeW;
      page1.drawRectangle({
        x: badgeX,
        y: linhaY - 2.5,
        width: badgeW,
        height: 11.5,
        color: corFundo,
        borderColor: corTexto,
        borderWidth: 0.5,
      });
      page1.drawText(texto, {
        x: badgeX + 5,
        y: linhaY + 0.5,
        size: 6.8,
        font: fontBold,
        color: corTexto,
      });
    };

    const desenharItemOpcao = (
      titulo: string,
      descricao: string,
      marcado: boolean,
      labelPositivo = 'AUTORIZADO',
      labelNegativo = 'NÃO AUTORIZADO'
    ) => {
      y -= 13;
      const checkPrefix = marcado ? '[x]' : '[ ]';
      page1.drawText(`${checkPrefix} ${titulo}`, {
        x: margemEsquerda,
        y,
        size: 8,
        font: fontBold,
        color: corPreto,
      });
      desenharBadgeStatus(marcado, y, labelPositivo, labelNegativo);

      y -= 10;
      for (const linha of this.quebrarTexto(descricao, 98)) {
        page1.drawText(linha, {
          x: margemEsquerda + 12,
          y,
          size: 7.1,
          font: fontRegular,
          color: corCinzaEscuro,
        });
        y -= 8.8;
      }
      y -= 2;
    };

    desenharItemOpcao(
      'a) Atendimento Preventivo de Saúde (Circuito Móvel):',
      'Autorização para triagens preventivas e avaliações clínicas nas especialidades de Oftalmologia, Odontologia, Fonoaudiologia (Audiometria), Terapia Comunitária Integrativa e Oficinas de Alimentação Saudável (Nutrição), durante o período escolar.',
      dados.autorizacaoSaude
    );

    desenharItemOpcao(
      isMaior
        ? 'b) Tratamento de Dados Pessoais e Sensíveis (LGPD, Art. 11, I e Art. 18):'
        : 'b) Tratamento de Dados Pessoais do Menor (LGPD, Art. 14 e Art. 18):',
      isMaior
        ? 'Autorização para coleta e tratamento de dados pessoais e dados de saúde exclusivamente para identificação e validação legal da permissão de atendimento, garantido o direito de acesso e revogação.'
        : 'Autorização para coleta e processamento dos dados pessoais informados exclusivamente para identificação e validação legal da permissão de atendimento do menor, garantido o direito de acesso e revogação.',
      dados.autorizacaoDados
    );

    desenharItemOpcao(
      isMaior
        ? 'c) Registro Fotográfico / Audiovisual (Código Civil, Art. 20 — Opcional):'
        : 'c) Registro Fotográfico / Audiovisual (ECA, Art. 17 — Opcional):',
      'Registro institucional e prestação de contas oficial do projeto Escola Cidadã — Saúde em Movimento (SESI-DF e UnB), vedada qualquer exploração comercial ou vexatória.',
      dados.autorizacaoImagem
    );

    const versaoTermo = dados.termosVersao || '1.0.2026';
    desenharItemOpcao(
      `d) Aceite do Termo e Assinatura Eletrônica Simples (Versão ${versaoTermo}):`,
      'Declaração de leitura, concordância com o Termo de Consentimento, adoção de assinatura eletrônica simples (Art. 4º, I da Lei nº 14.063/2020, Art. 10, § 2º da MP nº 2.200-2/2001 e Art. 190 do CPC) e veracidade sob as penas da lei (Art. 299 do Código Penal).',
      true,
      'ACEITO',
      'PENDENTE'
    );

    const versaoPrivacidade = dados.privacyPolicyVersion || '1.1.2026';
    desenharItemOpcao(
      `e) Política de Privacidade e Registro de Aceite (Versão ${versaoPrivacidade}):`,
      'Ciência e aceite integral da Política de Privacidade da Plataforma Catraki, autorizando o registro da data, hora e versão deste aceite em conformidade com a LGPD (Lei nº 13.709/2018).',
      true,
      'ACEITO',
      'PENDENTE'
    );

    // 5. Seção 3: CONTROLADORES E DIREITOS DO TITULAR (LGPD ART. 18)
    y -= 10;
    page1.drawRectangle({ x: margemEsquerda, y: y - 3, width: 3, height: 11, color: corAzulSesi });
    page1.drawText('3. CONTROLADORES, RETENÇÃO E DIREITOS DO TITULAR (LGPD)', {
      x: margemEsquerda + 8,
      y,
      size: 9,
      font: fontBold,
      color: corAzulSesi,
    });

    y -= 11;
    const textoLgpdResumo = `Controladores Conjuntos: ${controladoresStr}. Os dados são tratados exclusivamente para execução do projeto "${nomeProjeto}" e prestação de contas institucional. O titular/responsável pode exercer seus direitos de acesso, correção ou revogação do consentimento a qualquer momento (Art. 18 da LGPD) em https://www.catraki.com.br/revogar.`;
    for (const linhaLgpd of this.quebrarTexto(textoLgpdResumo, 96)) {
      page1.drawText(linhaLgpd, {
        x: margemEsquerda,
        y,
        size: 7.3,
        font: fontRegular,
        color: corCinzaEscuro,
      });
      y -= 9.5;
    }

    // 6. Seção 4: DECLARAÇÃO DE VERACIDADE E ASSINATURA ELETRÔNICA
    y -= 9;
    page1.drawRectangle({ x: margemEsquerda, y: y - 3, width: 3, height: 11, color: corAzulSesi });
    page1.drawText('4. DECLARAÇÃO DE VERACIDADE E ASSINATURA ELETRÔNICA', {
      x: margemEsquerda + 8,
      y,
      size: 9,
      font: fontBold,
      color: corAzulSesi,
    });

    y -= 12;
    const textoDeclaracao = isMaior
      ? 'Declaração de Veracidade: Declaro, sob as penas da lei (Art. 299 do Código Penal), que as informações prestadas e a identidade declarada são verdadeiras.'
      : 'Declaração de Veracidade: Declaro, sob as penas da lei (Art. 299 do Código Penal), que as informações prestadas são verdadeiras e que sou o responsável legal do menor.';

    page1.drawText(textoDeclaracao, {
      x: margemEsquerda,
      y,
      size: 7.5,
      font: fontRegular,
      color: corPreto,
    });

    y -= 9.5;
    page1.drawText('Registro eletrônico com eficácia probatória nos termos do Art. 10, § 2º da MP 2.200-2/2001, Lei 14.063/2020 e Arts. 104 e 107 do CC.', {
      x: margemEsquerda,
      y,
      size: 7.5,
      font: fontRegular,
      color: corCinzaEscuro,
    });

    // Embed do QR Code Vetorial de Validação Pública (funciona 100% em Edge/Workers sem Canvas)
    const urlValidacao = `https://www.catraki.com.br/validar/${validationCode}`;
    try {
      const qrSize1 = 70;
      const qrX1 = width - margemDireita - qrSize1 - 4;
      const qrY1 = y - 72;
      page1.drawRectangle({
        x: qrX1 - 4,
        y: qrY1 - 14,
        width: qrSize1 + 8,
        height: qrSize1 + 18,
        color: rgb(0.97, 0.98, 0.99),
        borderColor: corCinzaLinha,
        borderWidth: 0.6,
      });
      desenharQrCodeVetorial(page1, urlValidacao, qrX1, qrY1, qrSize1);
      page1.drawText('Validação Pública', {
        x: qrX1 + 6,
        y: qrY1 - 10,
        size: 6.4,
        font: fontBold,
        color: corAzulSesi,
      });
    } catch (err) {
      console.warn('[PDF] Falha ao gerar QR Code vetorial da folha 1:', err);
    }

    // Linha de assinatura
    y -= 38;

    // Marca d'água de proteção contra cópia / fraude (Watermark de Segurança Anti-Cópia)
    page1.drawText('CATRAKI • USO EXCLUSIVO NESTE TERMO • NÃO COPIAR', {
      x: margemEsquerda + 8,
      y: y + 20,
      size: 5.5,
      font: fontRegular,
      color: corMarcaDaguaFundo,
      rotate: degrees(6),
    });
    page1.drawText('ASSINATURA ELETRÔNICA SIMPLES • ART. 10, § 2º, MP 2.200-2/2001 E LEI 14.063/2020', {
      x: margemEsquerda + 12,
      y: y + 6,
      size: 5,
      font: fontRegular,
      color: corMarcaDaguaFundo,
      rotate: degrees(6),
    });

    if (dados.assinaturaPngBase64 && dados.assinaturaPngBase64.startsWith('data:image/')) {
      try {
        const cleanPng = dados.assinaturaPngBase64.replace(/^data:image\/png;base64,/, '');
        const pngBytes = Uint8Array.from(atob(cleanPng), (c) => c.charCodeAt(0));
        const signatureImage = await pdfDoc.embedPng(pngBytes);
        const sigDims = signatureImage.scaleToFit(150, 32);
        page1.drawImage(signatureImage, {
          x: margemEsquerda + 16,
          y: y + 2,
          width: sigDims.width,
          height: sigDims.height,
        });

        // Marca d'água sobreposta à assinatura (inutiliza recortes e cópias forjadas)
        const vHash = dados.hashManifesto ? dados.hashManifesto.substring(0, 16).toUpperCase() : 'CATRAKI-TERMO';
        page1.drawText(`VINCULADO AO TERMO CATRAKI • ${vHash} • CÓPIA PROIBIDA`, {
          x: margemEsquerda + 16,
          y: y + 10,
          size: 6,
          font: fontBold,
          color: corMarcaDaguaSobreposta,
          rotate: degrees(8),
          opacity: 0.60,
        });
      } catch (e) {
        console.error('Erro ao embutir assinatura no PDF:', e);
      }
    } else {
      // Selo institucional de assinatura eletrônica (quando assinado pelo computador sem desenho manual)
      const boxW = 250;
      const boxH = 30;
      page1.drawRectangle({
        x: margemEsquerda,
        y: y + 3,
        width: boxW,
        height: boxH,
        color: rgb(0.95, 0.97, 0.99),
        borderColor: corAzulSesi,
        borderWidth: 0.75,
      });
      page1.drawText('ASSINATURA ELETRÔNICA CONFIRMADA VIA E-MAIL (OTP 2FA)', {
        x: margemEsquerda + 8,
        y: y + 21,
        size: 6.4,
        font: fontBold,
        color: corAzulSesi,
      });
      page1.drawText(`Protocolo: ${validationCode}  •  Registro: ${dataHoraStr}`, {
        x: margemEsquerda + 8,
        y: y + 10,
        size: 6.2,
        font: fontMono,
        color: corCinzaEscuro,
      });
    }

    page1.drawLine({
      start: { x: margemEsquerda, y },
      end: { x: margemEsquerda + 260, y },
      thickness: 1,
      color: corCinzaLinha,
    });

    const nomeSignatarioFolha1 = isMaior ? dados.nomeMenor : dados.nomeResponsavel;

    y -= 11;
    page1.drawText(`${nomeSignatarioFolha1}`, {
      x: margemEsquerda,
      y,
      size: 8.5,
      font: fontBold,
      color: corPreto,
    });

    y -= 9.5;
    page1.drawText('Assinatura Eletrônica Simples — Plataforma Catraki (Art. 4º, I, Lei nº 14.063/2020 e Art. 10, § 2º, MP 2.200-2/2001)', {
      x: margemEsquerda,
      y,
      size: 7,
      font: fontRegular,
      color: corAzulSesi,
    });

    y -= 9.5;
    // Quebra o hash sem truncar na folha 1
    const rawHashFolha1 = dados.hashManifesto || 'Pendente de assinatura';
    page1.drawText(`Data/Hora: ${dataHoraStr} | Hash SHA-256: ${rawHashFolha1.slice(0, 36)}`, {
      x: margemEsquerda,
      y,
      size: 6.8,
      font: fontMono,
      color: corCinzaEscuro,
    });
    if (rawHashFolha1.length > 36) {
      y -= 8;
      page1.drawText(`                ${rawHashFolha1.slice(36)}`, {
        x: margemEsquerda,
        y,
        size: 6.8,
        font: fontMono,
        color: corCinzaEscuro,
      });
    }

    // Rodapé da Página 1
    page1.drawText('Autorização registrada eletronicamente (Assinatura Simples) via Catraki | MP 2.200-2/2001, Lei 14.063/2020 e LGPD.', {
      x: margemEsquerda,
      y: 24,
      size: 6.5,
      font: fontRegular,
      color: corCinzaEscuro,
    });

    // Linha de rodapé estilizada Catraki
    page1.drawLine({
      start: { x: 0, y: 6 },
      end: { x: width, y: 6 },
      thickness: 12,
      color: corAzulSesi,
    });

    // ========================================================================
    // PÁGINA 2: COMPROVANTE DE ASSINATURA ELETRÔNICA & CONFORMIDADE LGPD (ABNT)
    // ========================================================================
    if (dados.tipoAssinatura === 'ELETRONICA' || dados.ipAddress) {
      const page2 = pdfDoc.addPage([595.28, 841.89]);
      const corFundoSuave = rgb(0.97, 0.98, 0.99);
      const corDivisoria = rgb(0.88, 0.91, 0.95);
      const larguraUtil = width - margemEsquerda - margemDireita;
      let y2 = height - 40;

      // Cabeçalho institucional ABNT da Página 2
      const logoDims2 = logoCatrakiImg ? logoCatrakiImg.scaleToFit(28, 28) : null;
      if (logoCatrakiImg && logoDims2) {
        page2.drawImage(logoCatrakiImg, {
          x: margemEsquerda,
          y: y2 - 22,
          width: logoDims2.width,
          height: logoDims2.height,
        });
      }

      const xCabecalho2 = logoDims2 ? margemEsquerda + logoDims2.width + 10 : margemEsquerda;

      page2.drawText('PLATAFORMA CATRAKI', {
        x: xCabecalho2,
        y: y2 - 5,
        size: 11,
        font: fontBold,
        color: corAzulSesi,
      });

      page2.drawText('Comprovante de Assinatura Eletrônica e Conformidade LGPD', {
        x: xCabecalho2,
        y: y2 - 17,
        size: 7.5,
        font: fontRegular,
        color: corCinzaEscuro,
      });

      const folha2Label = 'Folha 2 / 2';
      page2.drawText(folha2Label, {
        x: width - margemDireita - fontBold.widthOfTextAtSize(folha2Label, 8),
        y: y2 - 5,
        size: 8,
        font: fontBold,
        color: corCinzaEscuro,
      });

      y2 -= 30;

      page2.drawLine({
        start: { x: margemEsquerda, y: y2 },
        end: { x: width - margemDireita, y: y2 },
        thickness: 1.2,
        color: corAzulSesi,
      });

      // Título centralizado + Protocolo
      y2 -= 18;
      const tituloP2 = 'COMPROVANTE DE ASSINATURA ELETRÔNICA';
      page2.drawText(tituloP2, {
        x: (width - fontBold.widthOfTextAtSize(tituloP2, 11.5)) / 2,
        y: y2,
        size: 11.5,
        font: fontBold,
        color: corPreto,
      });

      y2 -= 12;
      const subtituloP2 = `Protocolo: ${validationCode}  •  Assinatura Eletrônica Simples (Lei nº 14.063/2020, Art. 4º, I e MP nº 2.200-2/2001, Art. 10, § 2º)`;
      page2.drawText(subtituloP2, {
        x: (width - fontRegular.widthOfTextAtSize(subtituloP2, 7.2)) / 2,
        y: y2,
        size: 7.2,
        font: fontRegular,
        color: corAzulSesi,
      });

      // ----------------------------------------------------------------------
      // 1. IDENTIFICAÇÃO DO SIGNATÁRIO E EVIDÊNCIAS TÉCNICAS
      // ----------------------------------------------------------------------
      y2 -= 20;
      page2.drawText('1. IDENTIFICAÇÃO DO SIGNATÁRIO E EVIDÊNCIAS TÉCNICAS', {
        x: margemEsquerda,
        y: y2,
        size: 9,
        font: fontBold,
        color: corAzulSesi,
      });

      y2 -= 10;
      const dataHoraExata = dados.otpVerifiedAt
        ? formatBrasiliaDateTime(dados.otpVerifiedAt) + ' (UTC-3)'
        : (dados.dataAssinatura
            ? formatBrasiliaDateTime(dados.dataAssinatura) + ' (UTC-3)'
            : `${dataHoraStr} (UTC-3)`);

      const cpfCompletoSignatario = isMaior
        ? (dados.minorCpfCompleto || dados.cpfResponsavelCompleto || dados.minorCpfMascarado || dados.cpfResponsavelMascarado || 'Não informado')
        : (dados.cpfResponsavelCompleto || dados.cpfResponsavelMascarado || 'Não informado');

      const nomeSignatarioFolha2 = isMaior ? dados.nomeMenor : dados.nomeResponsavel;
      const rawUserAgent = dados.userAgent || 'Navegador Web / Dispositivo Seguro';
      const linhasUserAgent = this.quebrarTexto(rawUserAgent, 66);

      const ipFormatado = dados.ipAddress && dados.ipAddress !== 'Não coletado'
        ? `${dados.ipAddress} (${dados.ipVersion || (dados.ipAddress.includes(':') ? 'IPv6' : 'IPv4')})`
        : 'Não coletado';

      const localizacaoStr = dados.geoLocalizacaoCompleta
        || [dados.geoCidade, dados.geoEstado, dados.geoPais].filter(Boolean).join(', ')
        || 'Localização não informada';

      const modalidadeAssinatura = dados.assinaturaPngBase64 && dados.assinaturaPngBase64.startsWith('data:image/')
        ? 'Assinatura Eletrônica Simples (OTP 2FA + Rubrica Manual)'
        : 'Assinatura Eletrônica Simples (OTP 2FA por E-mail)';

      const tableItems: Array<{ label: string; values: string[] }> = [
        {
          label: isMaior ? 'Titular / Estudante' : 'Responsável Legal',
          values: [nomeSignatarioFolha2],
        },
        { label: 'CPF (Signatário)', values: [cpfCompletoSignatario] },
        {
          label: 'Vínculo Jurídico',
          values: [isMaior ? 'Próprio Estudante (Maior de Idade)' : (dados.parentesco || 'Responsável Legal')],
        },
        { label: 'E-mail Confirmado', values: [dados.signerEmail || 'Não informado'] },
        ...(!isMaior ? [{ label: 'Estudante Beneficiado(a)', values: [dados.nomeMenor] }] : []),
        ...(dados.nomeEscola ? [{ label: 'Unidade Escolar', values: this.quebrarTexto(dados.nomeEscola, 64) }] : []),
        { label: 'Modalidade', values: [modalidadeAssinatura] },
        { label: 'Data e Hora Exata', values: [dataHoraExata] },
        { label: 'Endereço IP', values: [ipFormatado] },
        { label: 'Geolocalização / Rede', values: [localizacaoStr] },
        ...(dados.provedorAsn ? [{ label: 'Provedor / ASN', values: [dados.provedorAsn] }] : []),
        { label: 'Dispositivo / Navegador', values: linhasUserAgent },
      ];

      let alturaTabela = 10;
      for (const item of tableItems) {
        alturaTabela += Math.max(item.values.length * 9.5 + 4.5, 14);
      }

      page2.drawRectangle({
        x: margemEsquerda,
        y: y2 - alturaTabela,
        width: larguraUtil,
        height: alturaTabela,
        color: corFundoSuave,
        borderColor: corAzulSesi,
        borderWidth: 0.6,
      });

      let currentLineY = y2 - 12;
      for (let i = 0; i < tableItems.length; i++) {
        const item = tableItems[i];
        page2.drawText(`${item.label}:`, {
          x: margemEsquerda + 10,
          y: currentLineY,
          size: 7.3,
          font: fontBold,
          color: corCinzaEscuro,
        });

        for (let idx = 0; idx < item.values.length; idx++) {
          page2.drawText(item.values[idx], {
            x: margemEsquerda + 128,
            y: currentLineY - (idx * 9.5),
            size: 7.2,
            font: fontRegular,
            color: corPreto,
          });
        }

        const rowAdvance = Math.max(item.values.length * 9.5 + 4.5, 14);
        if (i < tableItems.length - 1) {
          page2.drawLine({
            start: { x: margemEsquerda + 8, y: currentLineY - (item.values.length - 1) * 9.5 - 3.5 },
            end: { x: width - margemDireita - 8, y: currentLineY - (item.values.length - 1) * 9.5 - 3.5 },
            thickness: 0.3,
            color: corDivisoria,
          });
        }
        currentLineY -= rowAdvance;
      }

      y2 -= (alturaTabela + 14);

      // ----------------------------------------------------------------------
      // 2. REGISTRO DE CONSENTIMENTOS E AUTENTICAÇÃO (2FA OTP)
      // ----------------------------------------------------------------------
      page2.drawText('2. REGISTRO DE CONSENTIMENTOS E AUTENTICAÇÃO (2FA OTP)', {
        x: margemEsquerda,
        y: y2,
        size: 9,
        font: fontBold,
        color: corAzulSesi,
      });

      y2 -= 8;
      const reqDate = dados.otpRequestedAt ? formatBrasiliaDateTime(dados.otpRequestedAt) : 'Registrado no envio';
      const passo1Linhas = this.quebrarTexto(
        `[1] Consentimentos granulares: Atendimento de Saúde (${dados.autorizacaoSaude ? 'Autorizado' : 'Não'}), Tratamento de Dados LGPD (${dados.autorizacaoDados ? 'Autorizado' : 'Não'}), Uso de Imagem/Voz (${dados.autorizacaoImagem ? 'Autorizado' : 'Não'}), Termo v${dados.termosVersao || '1.0.2026'}, Política de Privacidade v${dados.privacyPolicyVersion || '1.1.2026'}.`,
        92
      );
      const passo2Linhas = [`[2] Envio de código único (OTP 6 dígitos) para o e-mail do signatário em: ${reqDate}.`];
      const passo3Linhas = [`[3] Autenticação confirmada, aceite formalizado e selo SHA-256 gerado em: ${dataHoraExata}.`];
      const todosPassos = [...passo1Linhas, ...passo2Linhas, ...passo3Linhas];
      const alturaPassos = todosPassos.length * 10 + 12;

      page2.drawRectangle({
        x: margemEsquerda,
        y: y2 - alturaPassos,
        width: larguraUtil,
        height: alturaPassos,
        color: rgb(1, 1, 1),
        borderColor: corCinzaLinha,
        borderWidth: 0.5,
      });

      let passoY = y2 - 12;
      for (const linha of todosPassos) {
        page2.drawText(linha, {
          x: margemEsquerda + 10,
          y: passoY,
          size: 7.1,
          font: fontRegular,
          color: corPreto,
        });
        passoY -= 10;
      }

      y2 -= (alturaPassos + 14);

      // ----------------------------------------------------------------------
      // 3. INTEGRIDADE CRIPTOGRÁFICA E VALIDAÇÃO PÚBLICA (SHA-256 & QR CODE)
      // ----------------------------------------------------------------------
      page2.drawText('3. INTEGRIDADE CRIPTOGRÁFICA E VALIDAÇÃO PÚBLICA', {
        x: margemEsquerda,
        y: y2,
        size: 9,
        font: fontBold,
        color: corAzulSesi,
      });

      y2 -= 8;
      const QR_SIZE = 72;
      const cardHeight = 92;
      const cardBottomY = y2 - cardHeight;

      page2.drawRectangle({
        x: margemEsquerda,
        y: cardBottomY,
        width: larguraUtil,
        height: cardHeight,
        color: corFundoSuave,
        borderColor: corAzulSesi,
        borderWidth: 0.6,
      });

      const qrX = width - margemDireita - QR_SIZE - 9;
      const qrY = cardBottomY + (cardHeight - QR_SIZE) / 2;
      const fullManifestHash = dados.hashManifesto || 'Pendente de assinatura';
      const linkValidacao = `https://www.catraki.com.br/validar/${validationCode}`;

      let textY = y2 - 14;
      page2.drawText(`Código de Validação: ${validationCode}`, {
        x: margemEsquerda + 10,
        y: textY,
        size: 8.5,
        font: fontBold,
        color: corAzulSesi,
      });

      textY -= 12;
      page2.drawText('Hash SHA-256 do Manifesto (Inviolabilidade):', {
        x: margemEsquerda + 10,
        y: textY,
        size: 7.1,
        font: fontBold,
        color: corCinzaEscuro,
      });

      textY -= 9.5;
      page2.drawText(fullManifestHash, {
        x: margemEsquerda + 10,
        y: textY,
        size: 6.3,
        font: fontMono,
        color: corPreto,
      });

      textY -= 12;
      for (const linhaVal of this.quebrarTexto(
        'Aponte a câmera para o QR Code ou acesse o validador público oficial:',
        64
      )) {
        page2.drawText(linhaVal, {
          x: margemEsquerda + 10,
          y: textY,
          size: 7.1,
          font: fontRegular,
          color: corCinzaEscuro,
        });
        textY -= 9.5;
      }

      page2.drawText(linkValidacao, {
        x: margemEsquerda + 10,
        y: textY,
        size: 7.2,
        font: fontMono,
        color: corAzulSesi,
      });

      try {
        page2.drawRectangle({
          x: qrX - 3,
          y: qrY - 3,
          width: QR_SIZE + 6,
          height: QR_SIZE + 6,
          color: rgb(1, 1, 1),
          borderColor: corCinzaLinha,
          borderWidth: 0.5,
        });
        desenharQrCodeVetorial(page2, linkValidacao, qrX, qrY, QR_SIZE);
      } catch (err) {
        console.warn('[PDF] Falha ao gerar QR Code vetorial da folha 2:', err);
      }

      y2 = cardBottomY - 14;

      // ----------------------------------------------------------------------
      // 4. TRANSPARÊNCIA E INFORMAÇÕES OBRIGATÓRIAS (LGPD — LEI Nº 13.709/2018)
      // ----------------------------------------------------------------------
      page2.drawText('4. TRANSPARÊNCIA E CONFORMIDADE LGPD (ART. 8º, 9º, 18 E 41)', {
        x: margemEsquerda,
        y: y2,
        size: 9,
        font: fontBold,
        color: corAzulSesi,
      });

      y2 -= 8;
      const blocosLgpd: Array<{ titulo: string; texto: string }> = [
        {
          titulo: 'Controladores e Responsabilidades (Art. 9º, III e VI):',
          texto: `${inst1Nome} (CNPJ ${inst1Cnpj}) e ${inst2Nome} (CNPJ ${inst2Cnpj}) são os controladores responsáveis pelo atendimento clínico e pelos dados assistenciais. A Plataforma Catraki atua exclusivamente como operadora tecnológica para registro de log e emissão de hash probatório (sem CNPJ e sem acesso a dados de saúde).`,
        },
        {
          titulo: 'Finalidade, Base Legal e Compartilhamento (Art. 9º, I e V):',
          texto: `Execução das triagens preventivas do projeto ${nomeProjeto} mediante consentimento específico e destacado (${isMaior ? 'LGPD Art. 7º, I e Art. 11, I' : 'LGPD Art. 7º, I, Art. 11, I e Art. 14, § 1º; ECA Art. 17'}). Acesso restrito às equipes clínicas e escolares da UnB/SESI-DF, sem cessão comercial a terceiros.`,
        },
        {
          titulo: 'Forma, Duração e Segurança (Art. 9º, II e Art. 46):',
          texto: `Armazenamento eletrônico criptografado (AES-256-GCM) com cadeia imutável SHA-256 e guarda legal por até 20 anos (Res. CFM nº 1.821/2007 • Política v${dados.privacyPolicyVersion || '1.1.2026'}). Qualquer alteração no arquivo invalida os hashes criptográficos.`,
        },
        {
          titulo: 'Encarregado (DPO) e Direitos do Titular (Art. 8º, § 5º; Art. 9º, IV e VII; Art. 18 e 41):',
          texto: 'Contato DPO: suporte@catraki.com.br (prazo legal de resposta: até 15 dias — Art. 19, II). O titular pode solicitar acesso, correção, portabilidade, eliminação ou revogar gratuitamente este consentimento a qualquer momento em https://www.catraki.com.br/titular ou https://www.catraki.com.br/revogar.',
        },
      ];

      const linhasRenderLgpd: Array<{ isTitle: boolean; text: string }> = [];
      for (const bloco of blocosLgpd) {
        linhasRenderLgpd.push({ isTitle: true, text: bloco.titulo });
        for (const l of this.quebrarTexto(bloco.texto, 96)) {
          linhasRenderLgpd.push({ isTitle: false, text: l });
        }
      }

      const alturaLgpdBox = blocosLgpd.length * 10 + linhasRenderLgpd.filter((l) => !l.isTitle).length * 8.5 + 12;
      page2.drawRectangle({
        x: margemEsquerda,
        y: y2 - alturaLgpdBox,
        width: larguraUtil,
        height: alturaLgpdBox,
        color: rgb(1, 1, 1),
        borderColor: corCinzaLinha,
        borderWidth: 0.5,
      });

      let lgpdY = y2 - 11;
      for (const item of linhasRenderLgpd) {
        page2.drawText(item.text, {
          x: margemEsquerda + 10,
          y: lgpdY,
          size: item.isTitle ? 7 : 6.6,
          font: item.isTitle ? fontBold : fontRegular,
          color: item.isTitle ? corAzulSesi : corCinzaEscuro,
        });
        lgpdY -= item.isTitle ? 9.5 : 8.5;
      }

      // Rodapé ABNT da página 2
      page2.drawText('PLATAFORMA CATRAKI — ASSINATURA ELETRÔNICA SIMPLES (LEI Nº 14.063/2020 • MP Nº 2.200-2/2001 • LGPD)', {
        x: margemEsquerda,
        y: 22,
        size: 6.3,
        font: fontRegular,
        color: corCinzaEscuro,
      });

      page2.drawLine({
        start: { x: 0, y: 6 },
        end: { x: width, y: 6 },
        thickness: 12,
        color: corAzulSesi,
      });
    }

    return await pdfDoc.save();
  }

  private static quebrarTexto(texto: string, maxCaracteres: number): string[] {
    if (!texto) return [];
    const palavras = texto.split(' ');
    const linhas: string[] = [];
    let linhaAtual = '';

    for (const palavra of palavras) {
      if ((linhaAtual + ' ' + palavra).trim().length <= maxCaracteres) {
        linhaAtual = (linhaAtual + ' ' + palavra).trim();
      } else {
        if (linhaAtual) linhas.push(linhaAtual);
        linhaAtual = palavra;
      }
    }
    if (linhaAtual) linhas.push(linhaAtual);
    return linhas;
  }
}
