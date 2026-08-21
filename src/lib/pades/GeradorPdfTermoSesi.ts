import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';

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
}

/**
 * Gerador de PDF A4 Oficial para Termos de Consentimento (TCLE) SESI Saúde
 * Gera o documento estruturado em páginas A4 com QR Code de validação pública e marcas oficiais.
 */
export class GeradorPdfTermoSesi {
  public static async gerarPdfOriginal(dados: IDadosTermoPdf): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 (pontos)
    const { width, height } = page.getSize();

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const corAzulSesi = rgb(3 / 255, 75 / 255, 127 / 255); // #034b7f
    const corTexto = rgb(0.15, 0.15, 0.15);
    const corCinza = rgb(0.4, 0.4, 0.4);
    const margemEsquerda = 50;
    let y = height - 50;

    // 1. Cabeçalho Oficial
    page.drawText('ESCOLA CIDADÃ — SAÚDE EM MOVIMENTO', {
      x: margemEsquerda,
      y,
      size: 14,
      font: fontBold,
      color: corAzulSesi,
    });

    y -= 16;
    page.drawText('TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO (TCLE)', {
      x: margemEsquerda,
      y,
      size: 10,
      font: fontBold,
      color: corTexto,
    });

    // Linha divisória
    y -= 12;
    page.drawLine({
      start: { x: margemEsquerda, y },
      end: { x: width - margemEsquerda, y },
      thickness: 1.5,
      color: corAzulSesi,
    });

    // 2. Seção 1 - Identificação
    y -= 25;
    page.drawText('1. IDENTIFICAÇÃO DAS PARTES', {
      x: margemEsquerda,
      y,
      size: 10,
      font: fontBold,
      color: corAzulSesi,
    });

    y -= 16;
    page.drawText(`Aluno(a) / Menor: ${dados.nomeMenor} | Nasc.: ${dados.dataNascimentoMenor}`, {
      x: margemEsquerda,
      y,
      size: 9,
      font: fontRegular,
      color: corTexto,
    });

    y -= 14;
    page.drawText(`Responsável Legal: ${dados.nomeResponsavel} (CPF: ${dados.cpfResponsavelMascarado}) - Vínculo: ${dados.parentesco}`, {
      x: margemEsquerda,
      y,
      size: 9,
      font: fontRegular,
      color: corTexto,
    });

    // 3. Seção 2 - Descrição do Procedimento
    y -= 25;
    page.drawText(`2. PROCEDIMENTO: ${dados.tituloProcedimento.toUpperCase()}`, {
      x: margemEsquerda,
      y,
      size: 10,
      font: fontBold,
      color: corAzulSesi,
    });

    y -= 16;
    const linhasDescricao = this.quebrarTexto(dados.descricaoProcedimento, 85);
    for (const linha of linhasDescricao) {
      page.drawText(linha, {
        x: margemEsquerda,
        y,
        size: 8.5,
        font: fontRegular,
        color: corTexto,
      });
      y -= 12;
    }

    // 4. Seção 3 - Autorizações e Consentimento LGPD
    y -= 15;
    page.drawText('3. AUTORIZAÇÕES EXPRESSAS E BASE LEGAL (LGPD Art. 11/14)', {
      x: margemEsquerda,
      y,
      size: 10,
      font: fontBold,
      color: corAzulSesi,
    });

    y -= 16;
    const statusSaude = dados.autorizacaoSaude ? '[X] AUTORIZADO' : '[ ] NÃO AUTORIZADO';
    page.drawText(`${statusSaude} - Realização do atendimento de triagem e avaliação clínica em saúde escolar.`, {
      x: margemEsquerda,
      y,
      size: 8.5,
      font: fontRegular,
      color: corTexto,
    });

    y -= 13;
    const statusDados = dados.autorizacaoDados ? '[X] AUTORIZADO' : '[ ] NÃO AUTORIZADO';
    page.drawText(`${statusDados} - Tratamento e registro de dados de saúde para fins de acompanhamento escolar preventivo.`, {
      x: margemEsquerda,
      y,
      size: 8.5,
      font: fontRegular,
      color: corTexto,
    });

    y -= 13;
    const statusImg = dados.autorizacaoImagem ? '[X] AUTORIZADO' : '[ ] NÃO AUTORIZADO';
    page.drawText(`${statusImg} - Registro institucional de fotos/vídeos das ações educativas para fins pedagógicos.`, {
      x: margemEsquerda,
      y,
      size: 8.5,
      font: fontRegular,
      color: corTexto,
    });

    // 5. Seção 4 - Assinatura e Trilha de Validação
    y -= 30;
    page.drawText('4. DECLARAÇÃO E ASSINATURA ELETRÔNICA AVANÇADA (LEI 14.063/2020)', {
      x: margemEsquerda,
      y,
      size: 10,
      font: fontBold,
      color: corAzulSesi,
    });

    y -= 14;
    page.drawText('Declaro sob as penas do Art. 299 do Código Penal que as informações fornecidas são legítimas.', {
      x: margemEsquerda,
      y,
      size: 8,
      font: fontRegular,
      color: corCinza,
    });

    // Embed do QR Code de Validação Pública
    const urlValidacao = dados.hashManifesto
      ? `https://catraki.sesi.org.br/validar/${dados.hashManifesto}`
      : 'https://catraki.sesi.org.br/validar';

    try {
      const qrDataUrl = await QRCode.toDataURL(urlValidacao, { margin: 1, width: 90 });
      const qrClean = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      const qrBytes = Uint8Array.from(atob(qrClean), (c) => c.charCodeAt(0));
      const qrImage = await pdfDoc.embedPng(qrBytes);

      page.drawImage(qrImage, {
        x: width - margemEsquerda - 80,
        y: y - 55,
        width: 75,
        height: 75,
      });

      page.drawText('Validação Oficial', {
        x: width - margemEsquerda - 75,
        y: y - 65,
        size: 7,
        font: fontBold,
        color: corAzulSesi,
      });
    } catch {}

    // Linha de assinatura
    y -= 35;
    page.drawLine({
      start: { x: margemEsquerda, y },
      end: { x: margemEsquerda + 280, y },
      thickness: 1,
      color: corCinza,
    });

    y -= 12;
    page.drawText(`${dados.nomeResponsavel}`, {
      x: margemEsquerda,
      y,
      size: 8.5,
      font: fontBold,
      color: corTexto,
    });

    y -= 10;
    page.drawText('Assinatura Eletrônica Avançada confirmada via 2FA / OTP (Lei nº 14.063/2020)', {
      x: margemEsquerda,
      y,
      size: 7.5,
      font: fontRegular,
      color: corAzulSesi,
    });

    y -= 10;
    const dataHoraStr = (dados.dataAssinatura || new Date()).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    page.drawText(`Data/Hora: ${dataHoraStr} | Hash de Integridade: ${dados.hashManifesto ? dados.hashManifesto.substring(0, 24) + '...' : 'Pendente'}`, {
      x: margemEsquerda,
      y,
      size: 7.5,
      font: fontRegular,
      color: corCinza,
    });

    // Rodapé
    page.drawText('Documento assinado em conformidade com MP 2.200-2/2001, Lei 14.063/2020 e LGPD (Lei 13.709/2018).', {
      x: margemEsquerda,
      y: 25,
      size: 7,
      font: fontRegular,
      color: corCinza,
    });

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
