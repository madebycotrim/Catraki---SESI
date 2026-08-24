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
  ipAddress?: string;
  userAgent?: string;
  geoCidade?: string;
  geoEstado?: string;
  geoPais?: string;
  otpRequestedAt?: Date;
  otpVerifiedAt?: Date;
}

/**
 * Gerador de PDF A4 Oficial para Termos de Consentimento (TCLE) SESI Saúde
 * Gera o documento estruturado em páginas A4 com QR Code de validação pública e marcas oficiais.
 * Inclui uma Página de Auditoria (Log de Assinatura) contendo todas as evidências digitais da assinatura.
 */
export class GeradorPdfTermoSesi {
  public static async gerarPdfOriginal(dados: IDadosTermoPdf): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    
    // ==========================================
    // PÁGINA 1: TERMO DE CONSENTIMENTO (TCLE)
    // ==========================================
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
    page.drawText('4. DECLARAÇÃO E ASSINATURA ELETRÔNICA (MP 2.200-2/2001 E LEI 14.063/2020)', {
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
      size: 7.5,
      font: fontRegular,
      color: corCinza,
    });

    y -= 10;
    page.drawText('As partes concordam em assinar este termo de forma eletrônica através da plataforma Catraki, reconhecendo a sua', {
      x: margemEsquerda,
      y,
      size: 7.5,
      font: fontRegular,
      color: corCinza,
    });

    y -= 10;
    page.drawText('validade jurídica e eficácia probatória nos termos da MP 2.200-2/2001 e da Lei nº 14.063/2020.', {
      x: margemEsquerda,
      y,
      size: 7.5,
      font: fontRegular,
      color: corCinza,
    });

    // Embed do QR Code de Validação Pública
    const urlValidacao = dados.hashManifesto
      ? `https://catraki.sesi.org.br/validar/${dados.hashManifesto}`
      : 'https://catraki.sesi.org.br/validar';

    try {
      const qrDataUrl = await QRCode.toDataURL(urlValidacao, {
        margin: 1,
        width: 90,
        color: { dark: '#000000', light: '#ffffff' },
      });
      const qrClean = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      const qrBytes = Uint8Array.from(atob(qrClean), (c) => c.charCodeAt(0));
      const qrImage = await pdfDoc.embedPng(qrBytes);

      page.drawImage(qrImage, {
        x: width - margemEsquerda - 80,
        y: y - 55,
        width: 75,
        height: 75,
      });

      page.drawText('Validação Pública', {
        x: width - margemEsquerda - 75,
        y: y - 65,
        size: 7,
        font: fontBold,
        color: rgb(0, 0, 0),
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
    page.drawText('Assinatura Eletrônica com validade jurídica (MP 2.200-2/2001 e Lei nº 14.063/2020)', {
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

    // Rodapé da Página 1
    page.drawText('Documento assinado eletronicamente através da plataforma Catraki com validade jurídica (MP 2.200-2/2001 e Lei 14.063/2020).', {
      x: margemEsquerda,
      y: 25,
      size: 6.5,
      font: fontRegular,
      color: corCinza,
    });

    // ==========================================
    // PÁGINA 2: REGISTRO DE AUDITORIA (LOG)
    // ==========================================
    if (dados.tipoAssinatura === 'ELETRONICA_AVANCADA' || dados.ipAddress) {
      const page2 = pdfDoc.addPage([595.28, 841.89]);
      let y2 = height - 50;

      // Cabeçalho da página 2
      page2.drawText('PLATAFORMA CATRAKI — REGISTRO DE AUDITORIA', {
        x: margemEsquerda,
        y: y2,
        size: 12,
        font: fontBold,
        color: corAzulSesi,
      });
      
      y2 -= 14;
      page2.drawText('Trilha de Evidências Digitais de Assinatura Eletrônica (MP 2.200-2/2001 e Lei 14.063/2020)', {
        x: margemEsquerda,
        y: y2,
        size: 8,
        font: fontRegular,
        color: corCinza,
      });

      y2 -= 10;
      page2.drawLine({
        start: { x: margemEsquerda, y: y2 },
        end: { x: width - margemEsquerda, y: y2 },
        thickness: 1.5,
        color: corAzulSesi,
      });

      // 1. DADOS DO SIGNATÁRIO E STATUS
      y2 -= 25;
      page2.drawText('1. DADOS DO SIGNATÁRIO E STATUS', {
        x: margemEsquerda,
        y: y2,
        size: 9,
        font: fontBold,
        color: corAzulSesi,
      });

      y2 -= 16;
      page2.drawText(`Nome Completo: ${dados.nomeResponsavel}`, {
        x: margemEsquerda,
        y: y2,
        size: 8.5,
        font: fontRegular,
        color: corTexto,
      });

      y2 -= 13;
      page2.drawText(`CPF Cadastrado: ${dados.cpfResponsavelMascarado} (Vínculo: ${dados.parentesco})`, {
        x: margemEsquerda,
        y: y2,
        size: 8.5,
        font: fontRegular,
        color: corTexto,
      });

      y2 -= 13;
      const statusAssinatura = dados.dataAssinatura ? 'ASSINADO E CONFIRMADO' : 'PENDENTE';
      page2.drawText(`Status do Documento: ${statusAssinatura}`, {
        x: margemEsquerda,
        y: y2,
        size: 8.5,
        font: fontBold,
        color: dados.dataAssinatura ? rgb(16/255, 124/255, 65/255) : rgb(200/255, 0, 0),
      });

      // 2. EVIDÊNCIAS DIGITAIS DE CONEXÃO
      y2 -= 25;
      page2.drawText('2. EVIDÊNCIAS DIGITAIS DE CONEXÃO', {
        x: margemEsquerda,
        y: y2,
        size: 9,
        font: fontBold,
        color: corAzulSesi,
      });

      y2 -= 16;
      page2.drawText(`Endereço de IP: ${dados.ipAddress || 'Não coletado'}`, {
        x: margemEsquerda,
        y: y2,
        size: 8.5,
        font: fontRegular,
        color: corTexto,
      });

      y2 -= 13;
      const geo = dados.geoCidade ? `${dados.geoCidade}/${dados.geoEstado || 'N/A'}/${dados.geoPais || 'BR'}` : 'Não coletada';
      page2.drawText(`Geolocalização aproximada: ${geo}`, {
        x: margemEsquerda,
        y: y2,
        size: 8.5,
        font: fontRegular,
        color: corTexto,
      });

      y2 -= 13;
      const uaQuebrado = this.quebrarTexto(dados.userAgent || 'Não coletado', 85);
      page2.drawText('Navegador / Dispositivo (User-Agent):', {
        x: margemEsquerda,
        y: y2,
        size: 8.5,
        font: fontBold,
        color: corTexto,
      });
      for (const uaLinha of uaQuebrado) {
        y2 -= 11;
        page2.drawText(uaLinha, {
          x: margemEsquerda + 10,
          y: y2,
          size: 7.5,
          font: fontRegular,
          color: corCinza,
        });
      }

      // 3. REGISTROS DE AUTENTICAÇÃO E HISTÓRICO (2FA OTP)
      y2 -= 25;
      page2.drawText('3. REGISTROS DE AUTENTICAÇÃO (2FA OTP)', {
        x: margemEsquerda,
        y: y2,
        size: 9,
        font: fontBold,
        color: corAzulSesi,
      });

      y2 -= 16;
      const reqDate = dados.otpRequestedAt ? dados.otpRequestedAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'Não registrado';
      page2.drawText(`[Passo 1] Código de segurança de uso único (OTP) solicitado em: ${reqDate}`, {
        x: margemEsquerda,
        y: y2,
        size: 8.5,
        font: fontRegular,
        color: corTexto,
      });

      y2 -= 13;
      const verDate = dados.otpVerifiedAt ? dados.otpVerifiedAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'Não registrado';
      page2.drawText(`[Passo 2] Autenticação confirmada e documento assinado em: ${verDate}`, {
        x: margemEsquerda,
        y: y2,
        size: 8.5,
        font: fontRegular,
        color: corTexto,
      });

      // 4. INTEGRIDADE CRIPTOGRÁFICA
      y2 -= 25;
      page2.drawText('4. INTEGRIDADE CRIPTOGRÁFICA', {
        x: margemEsquerda,
        y: y2,
        size: 9,
        font: fontBold,
        color: corAzulSesi,
      });

      y2 -= 16;
      page2.drawText(`Hash de Integridade do Manifesto (SHA-256):`, {
        x: margemEsquerda,
        y: y2,
        size: 8.5,
        font: fontBold,
        color: corTexto,
      });
      y2 -= 12;
      page2.drawText(dados.hashManifesto || 'Pendente de assinatura', {
        x: margemEsquerda + 10,
        y: y2,
        size: 8,
        font: fontRegular,
        color: corCinza,
      });

      // Nota de travamento
      y2 -= 25;
      page2.drawText('AVISO DE INTEGRIDADE: Este documento foi selado criptograficamente com resumo SHA-256.', {
        x: margemEsquerda,
        y: y2,
        size: 7.5,
        font: fontBold,
        color: corAzulSesi,
      });
      y2 -= 10;
      page2.drawText('Qualquer tentativa de alteração no conteúdo deste PDF invalidará permanentemente os hashes de auditoria.', {
        x: margemEsquerda,
        y: y2,
        size: 7,
        font: fontRegular,
        color: corCinza,
      });

      // Rodapé da página 2
      page2.drawText('PLATAFORMA CATRAKI — SISTEMA OFICIAL DE REGISTRO E CUSTÓDIA DE ASSINATURAS ELETRÔNICAS.', {
        x: margemEsquerda,
        y: 25,
        size: 6.5,
        font: fontRegular,
        color: corCinza,
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
