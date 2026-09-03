import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import QRCode from 'qrcode';
import { LOGO_BASE64 } from './LogoBase64.ts';
import { calcularIdade, formatBrasiliaDateTime } from '../schemas.ts';

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
    } catch {}

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

    // 1. Cabeçalho Institucional ABNT com Logo Catraki
    if (logoCatrakiImg) {
      page1.drawImage(logoCatrakiImg, {
        x: margemEsquerda,
        y: y - 20,
        width: 75,
        height: 24,
      });
    }

    const xCabecalhoTexto = logoCatrakiImg ? margemEsquerda + 85 : margemEsquerda;

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

    // Numeração de Página ABNT (Canto Superior Direito)
    page1.drawText('Folha 1 / 2', {
      x: width - margemDireita - 48,
      y: y - 5,
      size: 8,
      font: fontBold,
      color: corCinzaEscuro,
    });

    y -= 30;

    // Linha divisória superior
    page1.drawLine({
      start: { x: margemEsquerda, y },
      end: { x: width - margemDireita, y },
      thickness: 1.2,
      color: corAzulSesi,
    });

    // 2. Parágrafo de Apresentação e Qualificação (com Controladores CNPJ e Lógica de Maioridade ECA vs CC)
    y -= 16;
    const cpfIntro = dados.cpfResponsavelCompleto || dados.minorCpfCompleto || dados.cpfResponsavelMascarado || dados.minorCpfMascarado || '***.***.***-**';
    const textoIntro = isMaior
      ? `Eu, ${dados.nomeMenor}, portador(a) do CPF ${cpfIntro}, nascido(a) em ${dados.dataNascimentoMenor}, declaro que recebi as orientações sobre o projeto itinerante "${nomeProjeto}", realizado por ${controladoresStr}. Manifesto meu consentimento livre, informado e inequívoco, aplicável ao tratamento de dados sensíveis conforme o Art. 11, I e Art. 18 da LGPD (Lei nº 13.709/2018) e autorização de imagem (Art. 20 da Lei nº 10.406/2002 - Código Civil), para os itens selecionados abaixo:`
      : `Eu, ${dados.nomeResponsavel}, portador(a) do CPF ${cpfIntro}, na qualidade de responsável legal do(a) estudante ${dados.nomeMenor}, nascido(a) em ${dados.dataNascimentoMenor}, declaro que recebi as orientações sobre o projeto itinerante "${nomeProjeto}", realizado por ${controladoresStr}. Manifesto meu consentimento livre, informado e inequívoco, nos termos do Art. 14 e Art. 18 da LGPD (Lei nº 13.709/2018) e do Art. 17 do ECA (Lei nº 8.069/1990), para os itens selecionados abaixo:`;

    const linhasIntro = this.quebrarTexto(textoIntro, 92);
    for (let i = 0; i < linhasIntro.length; i++) {
      page1.drawText(linhasIntro[i], {
        x: margemEsquerda + (i === 0 ? 25 : 0), // Recuo ABNT no 1º parágrafo
        y,
        size: 8.5,
        font: fontRegular,
        color: corPreto,
      });
      y -= 11.5;
    }

    // 3. Seção 1: DO OBJETO E ATENDIMENTO DE SAÚDE
    y -= 8;
    page1.drawText(`1. DO PROCEDIMENTO: ${dados.tituloProcedimento.toUpperCase()}`, {
      x: margemEsquerda,
      y,
      size: 9.5,
      font: fontBold,
      color: corPreto,
    });

    y -= 12;
    const linhasDescricao = this.quebrarTexto(dados.descricaoProcedimento, 92);
    for (const linha of linhasDescricao) {
      page1.drawText(linha, {
        x: margemEsquerda,
        y,
        size: 8,
        font: fontRegular,
        color: corPreto,
      });
      y -= 10.5;
    }

    // 4. Seção 2: AUTORIZAÇÕES E CONSENTIMENTO GRANULAR
    y -= 8;
    const tituloSecao2 = isMaior
      ? '2. AUTORIZAÇÕES E CONSENTIMENTO (ART. 11, I E ART. 18 DA LEI Nº 13.709/2018 E ART. 20 DO CÓDIGO CIVIL)'
      : '2. AUTORIZAÇÕES E CONSENTIMENTO (ART. 14 E ART. 18 DA LEI Nº 13.709/2018 E ART. 17 DO ECA)';

    page1.drawText(tituloSecao2, {
      x: margemEsquerda,
      y,
      size: 9,
      font: fontBold,
      color: corPreto,
    });

    // Item A: Saúde
    y -= 13;
    page1.drawText('a) Circuito de Saúde e Especialidades: ', {
      x: margemEsquerda,
      y,
      size: 8.5,
      font: fontBold,
      color: corPreto,
    });

    const statusSaudeText = dados.autorizacaoSaude ? '[ AUTORIZADO ]' : '[ NÃO AUTORIZADO ]';
    const statusSaudeColor = dados.autorizacaoSaude ? corVerde : corVermelho;

    page1.drawText(statusSaudeText, {
      x: margemEsquerda + 175,
      y,
      size: 8.5,
      font: fontBold,
      color: statusSaudeColor,
    });

    y -= 11;
    const descSaude = '— Fica autorizada a realização de triagens preventivas e avaliações clínicas integradas no circuito móvel do projeto: Oftalmologia, Audiometria, Odontologia, Psicologia e Nutrição, durante o turno escolar.';
    const linhasDescSaude = this.quebrarTexto(descSaude, 94);
    for (const linha of linhasDescSaude) {
      page1.drawText(linha, {
        x: margemEsquerda + 12,
        y,
        size: 7.5,
        font: fontRegular,
        color: corPreto,
      });
      y -= 9.5;
    }

    // Item B: Dados Pessoais (LGPD Art. 14 para menores vs Art. 11, I para maiores)
    y -= 5;
    const labelDados = isMaior
      ? 'b) Tratamento de Dados Pessoais e Sensíveis (LGPD, Art. 11, I e Art. 18): '
      : 'b) Tratamento de Dados Pessoais do Menor (LGPD, Art. 14 e Art. 18): ';

    page1.drawText(labelDados, {
      x: margemEsquerda,
      y,
      size: 8.5,
      font: fontBold,
      color: corPreto,
    });

    const statusDadosText = dados.autorizacaoDados ? '[ AUTORIZADO ]' : '[ NÃO AUTORIZADO ]';
    const statusDadosColor = dados.autorizacaoDados ? corVerde : corVermelho;

    const xOffsetStatusDados = isMaior ? 285 : 245;
    page1.drawText(statusDadosText, {
      x: margemEsquerda + xOffsetStatusDados,
      y,
      size: 8.5,
      font: fontBold,
      color: statusDadosColor,
    });

    y -= 11;
    const descDados = isMaior
      ? '— Autorizo a coleta e o tratamento dos meus dados pessoais e dados de saúde para fins exclusivos de identificação e validação legal da permissão de atendimento, garantido o direito de acesso e revogação (Art. 18, LGPD).'
      : '— Autorizo a coleta e o processamento dos dados pessoais informados para fins exclusivos de identificação e validação legal da permissão de atendimento do menor, garantido o direito de acesso e revogação (Art. 18, LGPD).';

    const linhasDescDados = this.quebrarTexto(descDados, 94);
    for (const linha of linhasDescDados) {
      page1.drawText(linha, {
        x: margemEsquerda + 12,
        y,
        size: 7.5,
        font: fontRegular,
        color: corPreto,
      });
      y -= 9.5;
    }

    // Item C: Imagem e Voz (ECA Art. 17 para menores vs Código Civil Art. 20 para maiores)
    y -= 5;
    const labelImg = isMaior
      ? 'c) Captação e Uso de Imagem e Voz (Art. 20 do Código Civil): '
      : 'c) Captação e Uso de Imagem e Voz (ECA, Art. 17): ';

    page1.drawText(labelImg, {
      x: margemEsquerda,
      y,
      size: 8.5,
      font: fontBold,
      color: corPreto,
    });

    const statusImgText = dados.autorizacaoImagem ? '[ AUTORIZADO ]' : '[ NÃO AUTORIZADO ]';
    const statusImgColor = dados.autorizacaoImagem ? corVerde : corVermelho;

    const xOffsetStatusImg = isMaior ? 260 : 225;
    page1.drawText(statusImgText, {
      x: margemEsquerda + xOffsetStatusImg,
      y,
      size: 8.5,
      font: fontBold,
      color: statusImgColor,
    });

    y -= 11;
    const descImg = '— Autorização de caráter gratuito para registro institucional e relatórios de prestação de contas do projeto, com vedação expressa de exploração comercial ou fins vexatórios.';
    const linhasDescImg = this.quebrarTexto(descImg, 94);
    for (const linha of linhasDescImg) {
      page1.drawText(linha, {
        x: margemEsquerda + 12,
        y,
        size: 7.5,
        font: fontRegular,
        color: corPreto,
      });
      y -= 9.5;
    }

    // 5. Seção 3: DECLARAÇÃO DE VERACIDADE E ASSINATURA ELETRÔNICA
    y -= 12;
    page1.drawText('3. DECLARAÇÃO E ASSINATURA ELETRÔNICA', {
      x: margemEsquerda,
      y,
      size: 9.5,
      font: fontBold,
      color: corPreto,
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

    // Embed do QR Code de Validação Pública
    const urlValidacao = `https://www.catraki.com.br/validar/${validationCode}`;

    try {
      const qrDataUrl = await QRCode.toDataURL(urlValidacao, {
        margin: 1,
        width: 80,
        color: { dark: '#000000', light: '#ffffff' },
      });
      const qrClean = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      const qrBytes = Uint8Array.from(atob(qrClean), (c) => c.charCodeAt(0));
      const qrImage = await pdfDoc.embedPng(qrBytes);

      page1.drawImage(qrImage, {
        x: width - margemDireita - 75,
        y: y - 62,
        width: 70,
        height: 70,
      });

      page1.drawText('Validação Pública', {
        x: width - margemDireita - 72,
        y: y - 71,
        size: 6.5,
        font: fontBold,
        color: corPreto,
      });
    } catch {}

    // Linha de assinatura
    y -= 38;

    // Marca d'água de proteção contra cópia / fraude (Watermark de Segurança Anti-Cópia)
    page1.drawText('CATRAKI DIGITAL • USO EXCLUSIVO NESTE TERMO • NÃO COPIAR', {
      x: margemEsquerda + 8,
      y: y + 20,
      size: 5.5,
      font: fontRegular,
      color: corMarcaDaguaFundo,
      rotate: degrees(6),
    });
    page1.drawText('DOCUMENTO ASSINADO ELETRONICAMENTE • ART. 10, § 2º, MP 2.200-2/2001', {
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
        page1.drawImage(signatureImage, {
          x: margemEsquerda + 20,
          y: y + 2,
          width: 145,
          height: 28,
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
    page1.drawText('Assinatura Eletrônica — Plataforma Catraki (Art. 10, § 2º, MP 2.200-2/2001 c/c Lei nº 14.063/2020)', {
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
    page1.drawText('Autorização registrada eletronicamente via plataforma Catraki | Art. 10, § 2º, MP 2.200-2/2001, Lei 14.063/2020, CC e LGPD.', {
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
    // PÁGINA 2: REGISTRO DE AUDITORIA E CUSTÓDIA DIGITAL (EVIDÊNCIAS DIGITAIS)
    // ========================================================================
    if (dados.tipoAssinatura === 'ELETRONICA' || dados.ipAddress) {
      const page2 = pdfDoc.addPage([595.28, 841.89]);
      let y2 = height - 40;

      // Cabeçalho da página 2 com Logo Catraki
      if (logoCatrakiImg) {
        page2.drawImage(logoCatrakiImg, {
          x: margemEsquerda,
          y: y2 - 20,
          width: 75,
          height: 24,
        });
      }

      const xCabecalho2 = logoCatrakiImg ? margemEsquerda + 85 : margemEsquerda;

      page2.drawText('COMPROVANTE DE REGISTRO DE ASSINATURA ELETRÔNICA', {
        x: xCabecalho2,
        y: y2 - 5,
        size: 10.5,
        font: fontBold,
        color: corAzulSesi,
      });

      page2.drawText('Assinatura eletrônica simples realizada nos termos da Lei Federal nº 14.063/2020 e Art. 10, § 2º da MP nº 2.200-2/2001.', {
        x: xCabecalho2,
        y: y2 - 17,
        size: 5.8,
        font: fontRegular,
        color: corCinzaEscuro,
      });

      page2.drawText('Folha 2 / 2', {
        x: width - margemDireita - 48,
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

      // HASH IDENTIFICADOR (SHA-256) SEM TRUNCAMENTO
      y2 -= 16;
      page2.drawText('HASH IDENTIFICADOR DO MANIFESTO (SHA-256):', {
        x: margemEsquerda,
        y: y2,
        size: 8,
        font: fontBold,
        color: corPreto,
      });
      y2 -= 11;
      const fullManifestHash = dados.hashManifesto || 'Pendente de assinatura';
      page2.drawText(fullManifestHash, {
        x: margemEsquerda,
        y: y2,
        size: 7,
        font: fontMono,
        color: corCinzaEscuro,
      });

      // BLOCOS DE IDENTIFICAÇÃO (Tabela de Signatários)
      y2 -= 20;
      page2.drawText('SIGNATÁRIO REGISTRADO', {
        x: margemEsquerda,
        y: y2,
        size: 9.5,
        font: fontBold,
        color: corPreto,
      });

      y2 -= 14;
      const dataHoraExata = dados.otpVerifiedAt
        ? formatBrasiliaDateTime(dados.otpVerifiedAt) + ' UTC-3'
        : (dados.dataAssinatura
            ? formatBrasiliaDateTime(dados.dataAssinatura) + ' UTC-3'
            : dataHoraStr);

      // CPF Completo na Folha 2 para validade pericial material em juízo
      const cpfCompletoSignatario = isMaior
        ? (dados.minorCpfCompleto || dados.cpfResponsavelCompleto || dados.minorCpfMascarado || dados.cpfResponsavelMascarado || 'Não informado')
        : (dados.cpfResponsavelCompleto || dados.cpfResponsavelMascarado || 'Não informado');

      const nomeSignatarioFolha2 = isMaior ? dados.nomeMenor : dados.nomeResponsavel;

      // Quebra de linha do User-Agent para impressão completa sem reticências
      const rawUserAgent = dados.userAgent || 'Navegador Web / Dispositivo Seguro';
      const linhasUserAgent = this.quebrarTexto(rawUserAgent, 65);

      const tableItems: Array<{ label: string; values: string[] }> = [
        { label: 'Nome', values: [nomeSignatarioFolha2] },
        { label: 'CPF (Completo)', values: [cpfCompletoSignatario] },
        { label: 'E-mail', values: [dados.signerEmail || 'Não informado'] },
        { label: 'IP de Acesso', values: [dados.ipAddress || 'Não coletado'] },
        { label: 'Navegador / User-Agent', values: linhasUserAgent },
        { label: 'Data e Hora Exata', values: [dataHoraExata] },
      ];

      // Calcula a altura dinâmica da tabela
      let totalLinhasTabela = 0;
      for (const item of tableItems) {
        totalLinhasTabela += Math.max(item.values.length, 1);
      }
      const alturaTabela = Math.max(totalLinhasTabela * 14 + 14, 110);

      // Desenha caixa da tabela
      page2.drawRectangle({
        x: margemEsquerda,
        y: y2 - alturaTabela + 10,
        width: width - margemEsquerda - margemDireita,
        height: alturaTabela,
        color: rgb(0.97, 0.98, 0.99),
        borderColor: corAzulSesi,
        borderWidth: 0.5,
      });

      let currentLineY = y2 - 4;
      for (const item of tableItems) {
        page2.drawText(`${item.label}:`, {
          x: margemEsquerda + 10,
          y: currentLineY,
          size: 7.5,
          font: fontBold,
          color: corCinzaEscuro,
        });

        for (let idx = 0; idx < item.values.length; idx++) {
          page2.drawText(item.values[idx], {
            x: margemEsquerda + 125,
            y: currentLineY - (idx * 11),
            size: 7.2,
            font: fontRegular,
            color: corPreto,
          });
        }
        currentLineY -= Math.max(item.values.length * 11 + 4, 15);
      }

      y2 -= (alturaTabela + 12);

      // 3. REGISTROS DE AUTENTICAÇÃO (2FA OTP)
      page2.drawText('HISTÓRICO E AUTENTICAÇÃO DE DOIS FATORES (2FA OTP)', {
        x: margemEsquerda,
        y: y2,
        size: 9.5,
        font: fontBold,
        color: corPreto,
      });

      y2 -= 14;
      const reqDate = dados.otpRequestedAt ? formatBrasiliaDateTime(dados.otpRequestedAt) : 'Registrado no envio';
      page2.drawText(`[Passo 1] Código de segurança de uso único (OTP 6 dígitos) enviado em: ${reqDate}`, {
        x: margemEsquerda,
        y: y2,
        size: 8,
        font: fontRegular,
        color: corPreto,
      });

      y2 -= 12;
      page2.drawText(`[Passo 2] Autenticação confirmada e assinatura eletrônica concluída em: ${dataHoraExata}`, {
        x: margemEsquerda,
        y: y2,
        size: 8,
        font: fontRegular,
        color: corPreto,
      });

      // 4. VALIDAÇÃO PÚBLICA / QR CODE
      y2 -= 22;
      page2.drawText('VALIDAÇÃO DE AUTENTICIDADE', {
        x: margemEsquerda,
        y: y2,
        size: 9.5,
        font: fontBold,
        color: corPreto,
      });

      y2 -= 14;
      page2.drawText(`Código de Validação Pública: ${validationCode}`, {
        x: margemEsquerda,
        y: y2,
        size: 8.5,
        font: fontBold,
        color: corAzulSesi,
      });

      y2 -= 12;
      const linkValidacao = `https://catraki.com.br/validar/${validationCode}`;
      page2.drawText('Para validar a autenticidade deste documento e confirmar que o arquivo é verdadeiro, acesse:', {
        x: margemEsquerda,
        y: y2,
        size: 8,
        font: fontRegular,
        color: corPreto,
      });
      y2 -= 11;
      page2.drawText(linkValidacao, {
        x: margemEsquerda,
        y: y2,
        size: 8,
        font: fontMono,
        color: corAzulSesi,
      });

      // QR Code ao lado
      const QR_SIZE = 75;
      const qrX = width - margemDireita - QR_SIZE;
      const qrY = y2 - 10;

      try {
        const qrDataUrl = await QRCode.toDataURL(linkValidacao, {
          errorCorrectionLevel: 'M',
          width: 100,
          margin: 1,
        });
        const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
        const qrBytes = Uint8Array.from(atob(qrBase64), c => c.charCodeAt(0));
        const qrImage = await pdfDoc.embedPng(qrBytes);

        page2.drawRectangle({
          x: qrX - 4,
          y: qrY - 4,
          width: QR_SIZE + 8,
          height: QR_SIZE + 8,
          color: rgb(0.97, 0.98, 0.99),
          borderColor: corAzulSesi,
          borderWidth: 0.5,
        });
        page2.drawImage(qrImage, { x: qrX, y: qrY, width: QR_SIZE, height: QR_SIZE });
      } catch {}

      // 5. AVISO DE INTEGRIDADE JURÍDICA E LGPD
      y2 -= 32;
      page2.drawText('AVISO DE INTEGRIDADE E CONFORMIDADE LEGAL:', {
        x: margemEsquerda,
        y: y2,
        size: 8,
        font: fontBold,
        color: corAzulSesi,
      });

      y2 -= 11;
      page2.drawText('Este documento foi selado criptograficamente com resumo SHA-256. Qualquer tentativa de alteração invalidará os hashes.', {
        x: margemEsquerda,
        y: y2,
        size: 7.5,
        font: fontRegular,
        color: corPreto,
      });

      y2 -= 10;
      const textoIntegridadeLegal = isMaior
        ? 'Em conformidade com o Art. 10, § 2º da MP 2.200-2/2001, Lei 14.063/2020, Arts. 104 e 107 do CC, Arts. 411 e 441 do CPC, Arts. 7º, 11, I e 18 da LGPD, e Art. 20 do CC.'
        : 'Em conformidade com o Art. 10, § 2º da MP 2.200-2/2001, Lei 14.063/2020, Arts. 104 e 107 do CC, Arts. 411 e 441 do CPC, Arts. 7º, 11, 14 e 18 da LGPD, e Art. 17 do ECA.';

      page2.drawText(textoIntegridadeLegal, {
        x: margemEsquerda,
        y: y2,
        size: 7,
        font: fontRegular,
        color: corCinzaEscuro,
      });

      // 6. DISCLAIMER OBRIGATÓRIO DA PLATAFORMA CATRAKI (MÓDULO 4)
      y2 -= 16;
      const disclaimerTexto = 'A Plataforma Catraki atua exclusivamente como operadora e infraestrutura tecnológica para registro de log e emissão de hash probatório, não possuindo CNPJ, acesso ou ingerência sobre os dados de saúde ou o conteúdo firmado entre as partes controladoras.';
      const linhasDisclaimer = this.quebrarTexto(disclaimerTexto, 98);
      for (const l of linhasDisclaimer) {
        page2.drawText(l, {
          x: margemEsquerda,
          y: y2,
          size: 6.2,
          font: fontRegular,
          color: corCinzaEscuro,
        });
        y2 -= 8.5;
      }

      // Rodapé da página 2
      page2.drawText('PLATAFORMA CATRAKI — SISTEMA DE GESTÃO DE ASSINATURAS ELETRÔNICAS.', {
        x: margemEsquerda,
        y: 24,
        size: 6.5,
        font: fontRegular,
        color: corCinzaEscuro,
      });

      // Linha de rodapé estilizada Catraki folha 2
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
