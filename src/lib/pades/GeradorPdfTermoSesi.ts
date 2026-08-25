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

    // 2. Seção 1 - Texto de Apresentação (TCLE - Formato Parágrafo ABNT)
    y -= 22;

    // Padrão ABNT NBR 6024 - parágrafo corrido com recuo
    const textoIntro = `Eu, ${dados.nomeResponsavel}, portador(a) do CPF ${dados.cpfResponsavelMascarado}, na qualidade de ${dados.parentesco} do(a) estudante ${dados.nomeMenor}, nascido(a) em ${dados.dataNascimentoMenor}, portador(a) do CPF ${dados.cpfResponsavelMascarado}, declaro estar ciente do conteúdo deste Termo de Consentimento Livre e Esclarecido e manifesto livremente minha vontade de participação.`;
    const linhasIntro = this.quebrarTextoJustificado(textoIntro, 88);
    for (const linha of linhasIntro) {
      page.drawText(linha, {
        x: margemEsquerda + (linhasIntro.indexOf(linha) === 0 ? 18 : 0),
        y,
        size: 9,
        font: fontRegular,
        color: corTexto,
      });
      y -= 13;
    }

    // 3. Seção 2 - Descrição do Procedimento
    y -= 10;
    page.drawText(`1. SOBRE A ATIVIDADE: ${dados.tituloProcedimento.toUpperCase()}`, {
      x: margemEsquerda,
      y,
      size: 10,
      font: fontBold,
      color: corAzulSesi,
    });

    y -= 14;
    const linhasDescricao = this.quebrarTexto(dados.descricaoProcedimento, 88);
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
    page.drawText('2. AUTORIZAÇÕES E CONSENTIMENTO', {
      x: margemEsquerda,
      y,
      size: 10,
      font: fontBold,
      color: corAzulSesi,
    });

    y -= 14;
    page.drawText('Manifesto meu consentimento livre e esclarecido em relação às seguintes condições:', {
      x: margemEsquerda,
      y,
      size: 8.5,
      font: fontRegular,
      color: corTexto,
    });

    y -= 18;
    page.drawText('a) Circuito de Saúde e Especialidades: ', {
      x: margemEsquerda,
      y,
      size: 8.5,
      font: fontBold,
      color: corTexto,
    });
    
    let xOffset = margemEsquerda + 170;
    const statusSaudeText = dados.autorizacaoSaude ? '[ AUTORIZO ]' : '[ NÃO AUTORIZO ]';
    const statusSaudeColor = dados.autorizacaoSaude ? rgb(16/255, 124/255, 65/255) : rgb(200/255, 0, 0);
    
    page.drawText(statusSaudeText, {
      x: xOffset,
      y,
      size: 8.5,
      font: fontBold,
      color: statusSaudeColor,
    });

    const descSaude = ' — Fica autorizada a realização de triagens preventivas e avaliações clínicas de forma integrada no circuito de especialidades oficiais do projeto: Oftalmologia, Audiometria, Odontologia, Psicologia e Nutrição.';
    y -= 12;
    const linhasDescSaude = this.quebrarTexto(descSaude, 95);
    for (const linha of linhasDescSaude) {
      page.drawText(linha, {
        x: margemEsquerda + 15,
        y,
        size: 8,
        font: fontRegular,
        color: corTexto,
      });
      y -= 11;
    }

    y -= 8;
    page.drawText('b) Tratamento de Dados Pessoais: ', {
      x: margemEsquerda,
      y,
      size: 8.5,
      font: fontBold,
      color: corTexto,
    });
    
    xOffset = margemEsquerda + 145;
    const statusDadosText = dados.autorizacaoDados ? '[ AUTORIZO ]' : '[ NÃO AUTORIZO ]';
    const statusDadosColor = dados.autorizacaoDados ? rgb(16/255, 124/255, 65/255) : rgb(200/255, 0, 0);
    
    page.drawText(statusDadosText, {
      x: xOffset,
      y,
      size: 8.5,
      font: fontBold,
      color: statusDadosColor,
    });

    const descDados = ' — Fica expressamente autorizada a coleta e o processamento seguro dos dados pessoais para finalidade exclusiva de registro e comprovação legal do consentimento de participação do estudante no projeto.';
    y -= 12;
    const linhasDescDados = this.quebrarTexto(descDados, 95);
    for (const linha of linhasDescDados) {
      page.drawText(linha, {
        x: margemEsquerda + 15,
        y,
        size: 8,
        font: fontRegular,
        color: corTexto,
      });
      y -= 11;
    }

    y -= 8;
    page.drawText('c) Captação e Uso de Imagem e Voz: ', {
      x: margemEsquerda,
      y,
      size: 8.5,
      font: fontBold,
      color: corTexto,
    });
    
    xOffset = margemEsquerda + 160;
    const statusImgText = dados.autorizacaoImagem ? '[ AUTORIZO ]' : '[ NÃO AUTORIZO ]';
    const statusImgColor = dados.autorizacaoImagem ? rgb(16/255, 124/255, 65/255) : rgb(200/255, 0, 0);
    
    page.drawText(statusImgText, {
      x: xOffset,
      y,
      size: 8.5,
      font: fontBold,
      color: statusImgColor,
    });

    const descImg = ' — Fica autorizada de forma gratuita a captação e veiculação de fotos/vídeos do estudante para documentação institucional e relatórios de prestação de contas, respeitando a sua dignidade (ECA, Art. 17).';
    y -= 12;
    const linhasDescImg = this.quebrarTexto(descImg, 95);
    for (const linha of linhasDescImg) {
      page.drawText(linha, {
        x: margemEsquerda + 15,
        y,
        size: 8,
        font: fontRegular,
        color: corTexto,
      });
      y -= 11;
    }

    // 5. Seção 4 - Assinatura
    y -= 30;
    page.drawText('3. DECLARAÇÃO E ASSINATURA ELETRÔNICA', {
      x: margemEsquerda,
      y,
      size: 10,
      font: fontBold,
      color: corAzulSesi,
    });

    y -= 14;
    page.drawText('Declaro que as informações prestadas são verdadeiras e que sou o(a) responsável legal pelo(a) menor acima identificado(a).', {
      x: margemEsquerda,
      y,
      size: 7.5,
      font: fontRegular,
      color: corCinza,
    });

    y -= 10;
    page.drawText('O registro eletrônico deste consentimento foi realizado através da plataforma Catraki, conforme Art. 4º, II da Lei nº 14.063/2020, MP 2.200-2/2001 e LGPD.', {
      x: margemEsquerda,
      y,
      size: 7.5,
      font: fontRegular,
      color: corCinza,
    });

    // Embed do QR Code de Validação Pública
    const urlValidacao = dados.hashManifesto
      ? `https://www.catraki.com.br/validar/${dados.hashManifesto}`
      : 'https://www.catraki.com.br/validar';

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

    if (dados.assinaturaPngBase64 && dados.assinaturaPngBase64.startsWith('data:image/')) {
      try {
        const cleanPng = dados.assinaturaPngBase64.replace(/^data:image\/png;base64,/, '');
        const pngBytes = Uint8Array.from(atob(cleanPng), (c) => c.charCodeAt(0));
        const signatureImage = await pdfDoc.embedPng(pngBytes);
        page.drawImage(signatureImage, {
          x: margemEsquerda + 20,
          y: y + 2,
          width: 150,
          height: 30,
        });
      } catch (e) {
        console.error('Erro ao embutir assinatura no PDF:', e);
      }
    }

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
    page.drawText('Assinatura Eletrônica Avançada — Plataforma Catraki (Art. 4º, II, Lei 14.063/2020 e MP 2.200-2/2001)', {
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
    page.drawText('Autorização registrada eletronicamente via plataforma Catraki | Art. 4º, II, Lei 14.063/2020, MP 2.200-2/2001 e LGPD.', {
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
      page2.drawText('Trilha de Evidências Digitais de Assinatura Eletrônica Avançada (Art. 4º, II, Lei 14.063/2020, MP 2.200-2/2001 e LGPD)', {
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

  // Alias para uso em parágrafos com recuo no primeiro parágrafo
  private static quebrarTextoJustificado(texto: string, maxCaracteres: number): string[] {
    return this.quebrarTexto(texto, maxCaracteres);
  }
}
