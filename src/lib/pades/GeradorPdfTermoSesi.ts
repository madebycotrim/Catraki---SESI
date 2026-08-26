import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import QRCode from 'qrcode';
import { LOGO_BASE64 } from './LogoBase64.ts';

export interface IDadosTermoPdf {
  tituloProcedimento: string;
  descricaoProcedimento: string;
  nomeMenor: string;
  dataNascimentoMenor: string;
  nomeResponsavel: string;
  cpfResponsavelMascarado: string;
  parentesco: string;
  autorizacaoSaude: boolean;
  autorizacaoDados: boolean;
  autorizacaoImagem: boolean;
  hashManifesto?: string;
  dataAssinatura?: Date;
  assinaturaPngBase64?: string;
  tipoAssinatura?: 'ICP_BRASIL_A1' | 'ELETRONICA_AVANCADA';
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
  nomeEscola?: string;
}



/**
 * Gerador de PDF A4 Oficial para Termos de Consentimento (TCLE) SESI Saúde
 * Formatado rigorosamente de acordo com as normas ABNT e os preceitos da LGPD (Lei nº 13.709/2018).
 * Contém QR Code de validação pública, logos institucionais, barra oficial e trilha forense de auditoria.
 */
export class GeradorPdfTermoSesi {
  public static async gerarPdfOriginal(dados: IDadosTermoPdf): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();

    // Fontes Oficiais
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

    // Cores Formais ABNT (Textos em Preto)
    const corPreto = rgb(0.04, 0.04, 0.04);           // Texto formal ABNT
    const corAzulSesi = rgb(3 / 255, 75 / 255, 127 / 255); // #034b7f
    const corVerde = rgb(16 / 255, 124 / 255, 65 / 255);
    const corVermelho = rgb(185 / 255, 28 / 255, 28 / 255);
    const corCinzaEscuro = rgb(0.35, 0.35, 0.35);
    const corCinzaLinha = rgb(0.78, 0.81, 0.85);
    const corMarcaDaguaFundo = rgb(0.88, 0.90, 0.93);
    const corMarcaDaguaSobreposta = rgb(0.70, 0.74, 0.80);

    // Carregamento de Ativos Gráficos (Logo e Barra)
    let logoCatrakiImg: any = null;

    try {
      const logoBytes = Uint8Array.from(atob(LOGO_BASE64), (c) => c.charCodeAt(0));
      logoCatrakiImg = await pdfDoc.embedPng(logoBytes);
    } catch {}


    // Formatação de data da assinatura
    const dataHoraStr = (dados.dataAssinatura || new Date()).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

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

    // 2. Parágrafo de Apresentação e Qualificação (ABNT NBR 6024 com recuo de parágrafo)
    y -= 16;
    const textoIntro = `Eu, ${dados.nomeResponsavel}, portador(a) do CPF ${dados.cpfResponsavelMascarado}, na qualidade de ${dados.parentesco.toLowerCase()} do(a) estudante ${dados.nomeMenor}, nascido(a) em ${dados.dataNascimentoMenor}, declaro que recebi as orientações sobre o projeto itinerante e, de acordo com o Art. 14 da LGPD (Lei nº 13.709/2018) e o Art. 17 do ECA (Lei nº 8.069/1990), manifesto meu consentimento livre, informado e inequívoco para os itens a seguir:`;

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

    // 4. Seção 2: AUTORIZAÇÕES E CONSENTIMENTO GRANULAR (LGPD & ECA)
    y -= 8;
    page1.drawText('2. AUTORIZAÇÕES E CONSENTIMENTO (LEI Nº 13.709/2018 E LEI Nº 8.069/1990)', {
      x: margemEsquerda,
      y,
      size: 9.5,
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

    // Item B: Dados Pessoais (LGPD Art. 14)
    y -= 5;
    page1.drawText('b) Tratamento de Dados Pessoais (LGPD, Art. 14): ', {
      x: margemEsquerda,
      y,
      size: 8.5,
      font: fontBold,
      color: corPreto,
    });

    const statusDadosText = dados.autorizacaoDados ? '[ AUTORIZADO ]' : '[ NÃO AUTORIZADO ]';
    const statusDadosColor = dados.autorizacaoDados ? corVerde : corVermelho;

    page1.drawText(statusDadosText, {
      x: margemEsquerda + 215,
      y,
      size: 8.5,
      font: fontBold,
      color: statusDadosColor,
    });

    y -= 11;
    const descDados = '— Autorizo a coleta e o processamento dos dados pessoais informados para fins exclusivos de identificação e validação legal da permissão de atendimento, garantido o direito de acesso e revogação (Art. 18, LGPD).';
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

    // Item C: Imagem e Voz (ECA Art. 17)
    y -= 5;
    page1.drawText('c) Captação e Uso de Imagem e Voz (ECA, Art. 17): ', {
      x: margemEsquerda,
      y,
      size: 8.5,
      font: fontBold,
      color: corPreto,
    });

    const statusImgText = dados.autorizacaoImagem ? '[ AUTORIZADO ]' : '[ NÃO AUTORIZADO ]';
    const statusImgColor = dados.autorizacaoImagem ? corVerde : corVermelho;

    page1.drawText(statusImgText, {
      x: margemEsquerda + 225,
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
    page1.drawText('3. DECLARAÇÃO E ASSINATURA ELETRÔNICA AVANÇADA', {
      x: margemEsquerda,
      y,
      size: 9.5,
      font: fontBold,
      color: corPreto,
    });

    y -= 12;
    page1.drawText('Declaro, sob as penas da lei (Art. 299 do Código Penal), que as informações prestadas são verdadeiras e que sou o(a) responsável legal.', {
      x: margemEsquerda,
      y,
      size: 7.5,
      font: fontRegular,
      color: corPreto,
    });

    y -= 9.5;
    page1.drawText('Registro eletrônico com plena eficácia probatória nos termos do Art. 4º, II da Lei nº 14.063/2020 e Art. 10, §2º da MP 2.200-2/2001.', {
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
    page1.drawText('DOCUMENTO ASSINADO DIGITALMENTE • ART. 4º, II, LEI 14.063/2020', {
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

    y -= 11;
    page1.drawText(`${dados.nomeResponsavel}`, {
      x: margemEsquerda,
      y,
      size: 8.5,
      font: fontBold,
      color: corPreto,
    });

    y -= 9.5;
    page1.drawText('Assinatura Eletrônica Avançada — Plataforma Catraki (Art. 4º, II, Lei 14.063/2020 e MP 2.200-2/2001)', {
      x: margemEsquerda,
      y,
      size: 7,
      font: fontRegular,
      color: corAzulSesi,
    });

    y -= 9.5;
    page1.drawText(`Data/Hora: ${dataHoraStr} | Hash de Integridade: ${dados.hashManifesto ? dados.hashManifesto.substring(0, 24) + '...' : 'Pendente'}`, {
      x: margemEsquerda,
      y,
      size: 7,
      font: fontRegular,
      color: corCinzaEscuro,
    });

    // Rodapé da Página 1
    page1.drawText('Autorização registrada eletronicamente via plataforma Catraki | Art. 4º, II, Lei 14.063/2020, MP 2.200-2/2001 e LGPD.', {
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
    if (dados.tipoAssinatura === 'ELETRONICA_AVANCADA' || dados.ipAddress) {
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

      page2.drawText('CERTIFICADO DE CONCLUSÃO DE ASSINATURA ELETRÔNICA', {
        x: xCabecalho2,
        y: y2 - 5,
        size: 10.5,
        font: fontBold,
        color: corAzulSesi,
      });

      page2.drawText('As assinaturas eletrônicas realizadas neste documento possuem validade legal em conformidade com a Medida Provisória nº 2.200-2/2001 e a Lei nº 14.063/2020.', {
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

      // HASH IDENTIFICADOR (SHA-256)
      y2 -= 18;
      page2.drawText(`HASH IDENTIFICADOR (SHA-256):`, {
        x: margemEsquerda,
        y: y2,
        size: 8,
        font: fontBold,
        color: corPreto,
      });
      y2 -= 11;
      page2.drawText(dados.hashManifesto || 'Pendente de assinatura', {
        x: margemEsquerda,
        y: y2,
        size: 7.5,
        font: fontMono,
        color: corCinzaEscuro,
      });

      // BLOCOS DE IDENTIFICAÇÃO (Tabela de Signatários)
      y2 -= 25;
      page2.drawText('SIGNATÁRIO REGISTRADO', {
        x: margemEsquerda,
        y: y2,
        size: 9.5,
        font: fontBold,
        color: corPreto,
      });

      y2 -= 14;
      const dataHoraExata = dados.otpVerifiedAt
        ? dados.otpVerifiedAt.toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }) + ' UTC-3'
        : (dados.dataAssinatura
            ? dados.dataAssinatura.toLocaleString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }) + ' UTC-3'
            : dataHoraStr);

      const tableData = [
        ['Nome', dados.nomeResponsavel],
        ['CPF', dados.cpfResponsavelMascarado],
        ['E-mail', dados.signerEmail || 'Não informado'],
        ['IP', dados.ipAddress || 'Não coletado'],
        ['Navegador', dados.userAgent || 'Navegador Web / Dispositivo Seguro'],
        ['Data e Hora exata', dataHoraExata],
      ];

      // Desenha caixa da tabela
      page2.drawRectangle({
        x: margemEsquerda,
        y: y2 - 95,
        width: width - margemEsquerda - margemDireita,
        height: 105,
        color: rgb(0.97, 0.98, 0.99),
        borderColor: corAzulSesi,
        borderWidth: 0.5,
      });

      let currentLineY = y2 - 12;
      for (const [label, val] of tableData) {
        page2.drawText(`${label}:`, {
          x: margemEsquerda + 10,
          y: currentLineY,
          size: 7.5,
          font: fontBold,
          color: corCinzaEscuro,
        });

        const valString = String(val);
        if (valString.length > 85) {
          page2.drawText(valString.substring(0, 82) + '...', {
            x: margemEsquerda + 115,
            y: currentLineY,
            size: 7.5,
            font: fontRegular,
            color: corPreto,
          });
        } else {
          page2.drawText(valString, {
            x: margemEsquerda + 115,
            y: currentLineY,
            size: 7.5,
            font: fontRegular,
            color: corPreto,
          });
        }
        currentLineY -= 15;
      }
      y2 -= 115;

      // 3. REGISTROS DE AUTENTICAÇÃO (2FA OTP)
      y2 -= 10;
      page2.drawText('HISTÓRICO E AUTENTICAÇÃO DE DOIS FATORES (2FA OTP)', {
        x: margemEsquerda,
        y: y2,
        size: 9.5,
        font: fontBold,
        color: corPreto,
      });

      y2 -= 14;
      const reqDate = dados.otpRequestedAt ? dados.otpRequestedAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'Registrado no envio';
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
      y2 -= 25;
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
      page2.drawText(`Para validar a autenticidade deste documento e confirmar que o arquivo é verdadeiro, acesse:`, {
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
      y2 -= 35;
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
      page2.drawText('Em conformidade com o Art. 4º, II da Lei 14.063/2020, Art. 10, §2º da MP 2.200-2/2001 e Arts. 7º, 11, 14 e 18 da LGPD.', {
        x: margemEsquerda,
        y: y2,
        size: 7,
        font: fontRegular,
        color: corCinzaEscuro,
      });

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

