import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';
import QRCode from 'qrcode';
import { LOGO_BASE64 } from './LogoBase64.ts';
import { formatBrasiliaDateTime } from '../schemas.ts';
import type { Institution } from '../types.ts';

export interface CartazEscolaInput {
  institution: Institution;
  baseUrl?: string;
}

/**
 * Quebra texto longo em múltiplas linhas respeitando a largura máxima em pontos.
 */
function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = (text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const candidate = `${currentLine} ${words[i]}`;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      currentLine = candidate;
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }
  lines.push(currentLine);
  return lines;
}

function drawRoundedBorderBox(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  fillColor: ReturnType<typeof rgb>,
  borderColor?: ReturnType<typeof rgb>,
  borderWidth = 1
) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: fillColor,
    borderColor,
    borderWidth: borderColor ? borderWidth : 0,
  });
}

/**
 * Gera um Cartaz / Informativo A4 personalizado em PDF para impressão na escola,
 * contendo QR Code em alta resolução, link direto, passo a passo para os pais
 * e informações legais/sanitárias do Projeto Escola Cidadã — Saúde em Movimento.
 */
export class GeradorCartazEscolaPdf {
  public static async gerarCartaz(input: CartazEscolaInput): Promise<Uint8Array> {
    const { institution } = input;
    const baseUrl = (input.baseUrl || 'https://www.catraki.com.br').replace(/\/+$/, '');
    const targetUrl = `${baseUrl}/autorizar/${institution.id}`;
    const validatorUrl = `${baseUrl}/validar`;
    const revokeUrl = `${baseUrl}/revogar`;

    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle(`Cartaz QR Code — ${institution.short_name || institution.name}`);
    pdfDoc.setSubject('Autorização Eletrônica — Escola Cidadã: Saúde em Movimento');
    pdfDoc.setCreator('Plataforma Catraki — SESI-DF / UnB');

    // A4 Portrait (595.28 x 841.89 pt)
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 36;
    const contentWidth = pageWidth - margin * 2;
    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontMono = await pdfDoc.embedFont(StandardFonts.CourierBold);

    // Paleta institucional
    const corAzulEscuro = rgb(0.012, 0.294, 0.498); // #034b7f
    const corAzulClaro = rgb(0.055, 0.647, 0.914); // #0ea5e9
    const corFundoClaro = rgb(0.953, 0.973, 0.996); // #f3f8fe
    const corFundoCinza = rgb(0.973, 0.98, 0.988); // #f8fafc
    const corBorda = rgb(0.82, 0.87, 0.92);
    const corVerde = rgb(0.04, 0.55, 0.35);
    const corFundoVerde = rgb(0.93, 0.99, 0.96);
    const corTexto = rgb(0.11, 0.16, 0.24);
    const corTextoSuave = rgb(0.35, 0.42, 0.51);
    const corBranco = rgb(1, 1, 1);

    // =========================================================================
    // 1. CABEÇALHO INSTITUCIONAL (BANNER SUPERIOR)
    // =========================================================================
    const headerHeight = 96;
    page.drawRectangle({
      x: 0,
      y: pageHeight - headerHeight,
      width: pageWidth,
      height: headerHeight,
      color: corAzulEscuro,
    });
    // Faixa de acento inferior do banner
    page.drawRectangle({
      x: 0,
      y: pageHeight - headerHeight - 4,
      width: pageWidth,
      height: 4,
      color: corAzulClaro,
    });

    // Logo Catraki em caixa branca arredondada à esquerda
    let hasLogo = false;
    try {
      const logoBytes = Uint8Array.from(atob(LOGO_BASE64), (c) => c.charCodeAt(0));
      const logoImg = await pdfDoc.embedPng(logoBytes);
      drawRoundedBorderBox(page, margin, pageHeight - 74, 52, 52, corBranco);
      page.drawImage(logoImg, {
        x: margin + 5,
        y: pageHeight - 69,
        width: 42,
        height: 42,
      });
      hasLogo = true;
    } catch (err) {
      console.warn('[PDF_CARTAZ] Falha ao incorporar logo:', err);
    }

    const titleX = hasLogo ? margin + 66 : margin;
    page.drawText('ESCOLA CIDADÃ — SAÚDE EM MOVIMENTO', {
      x: titleX,
      y: pageHeight - 36,
      size: 16,
      font: fontBold,
      color: corBranco,
    });
    page.drawText('AUTORIZAÇÃO ELETRÔNICA PARA ATENDIMENTO PREVENTIVO EM SAÚDE', {
      x: titleX,
      y: pageHeight - 53,
      size: 8.5,
      font: fontBold,
      color: rgb(0.75, 0.9, 1),
    });
    page.drawText('Realização: SESI-DF & Universidade de Brasília (UnB)  •  Plataforma Catraki', {
      x: titleX,
      y: pageHeight - 69,
      size: 8,
      font: fontRegular,
      color: rgb(0.86, 0.93, 0.99),
    });

    // =========================================================================
    // 2. CARTÃO DE IDENTIFICAÇÃO DA UNIDADE ESCOLAR
    // =========================================================================
    let cursorY = pageHeight - headerHeight - 22;
    const schoolBoxHeight = 68;
    drawRoundedBorderBox(
      page,
      margin,
      cursorY - schoolBoxHeight,
      contentWidth,
      schoolBoxHeight,
      corFundoClaro,
      corAzulEscuro,
      1.2
    );

    // Barra lateral esquerda do cartão escolar
    page.drawRectangle({
      x: margin,
      y: cursorY - schoolBoxHeight,
      width: 6,
      height: schoolBoxHeight,
      color: corAzulEscuro,
    });

    const badgeText = (institution.short_name || institution.id).toUpperCase();
    const badgeWidth = Math.max(70, fontBold.widthOfTextAtSize(badgeText, 8.5) + 18);
    page.drawRectangle({
      x: margin + 16,
      y: cursorY - 24,
      width: badgeWidth,
      height: 16,
      color: corAzulEscuro,
    });
    page.drawText(badgeText, {
      x: margin + 25,
      y: cursorY - 19.5,
      size: 8.5,
      font: fontBold,
      color: corBranco,
    });

    const locText = `${institution.city || 'Brasília'} / ${institution.state || 'DF'}  •  Rota: /autorizar/${institution.id}`;
    page.drawText(locText, {
      x: margin + 24 + badgeWidth,
      y: cursorY - 19.5,
      size: 8,
      font: fontBold,
      color: corTextoSuave,
    });

    const schoolNameLines = wrapText(institution.name, fontBold, 12.5, contentWidth - 30).slice(0, 2);
    let schoolNameY = cursorY - 41;
    for (const line of schoolNameLines) {
      page.drawText(line, {
        x: margin + 16,
        y: schoolNameY,
        size: 12.5,
        font: fontBold,
        color: corTexto,
      });
      schoolNameY -= 15;
    }

    // =========================================================================
    // 3. ÁREA CENTRAL DE DESTAQUE DO QR CODE
    // =========================================================================
    cursorY = cursorY - schoolBoxHeight - 16;
    const qrBoxHeight = 264;
    drawRoundedBorderBox(
      page,
      margin,
      cursorY - qrBoxHeight,
      contentWidth,
      qrBoxHeight,
      corBranco,
      corBorda,
      1
    );

    // Subfaixa de chamada acima do QR Code
    page.drawRectangle({
      x: margin,
      y: cursorY - 30,
      width: contentWidth,
      height: 30,
      color: corFundoVerde,
    });
    const callTitle = 'APONTE A CÂMERA DO CELULAR PARA AUTORIZAR O(A) ESTUDANTE';
    const callTitleW = fontBold.widthOfTextAtSize(callTitle, 10.5);
    page.drawText(callTitle, {
      x: (pageWidth - callTitleW) / 2,
      y: cursorY - 19,
      size: 10.5,
      font: fontBold,
      color: corVerde,
    });

    // Gera QR Code PNG em alta resolução
    const qrSize = 176;
    const qrX = (pageWidth - qrSize) / 2;
    const qrY = cursorY - 42 - qrSize;

    // Moldura do QR Code
    drawRoundedBorderBox(page, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, corBranco, corAzulEscuro, 1.8);

    try {
      const qrDataUrl = await QRCode.toDataURL(targetUrl, {
        errorCorrectionLevel: 'H',
        width: 600,
        margin: 1,
        color: { dark: '#034b7f', light: '#ffffff' },
      });
      const qrClean = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      const qrBytes = Uint8Array.from(atob(qrClean), (c) => c.charCodeAt(0));
      const qrImage = await pdfDoc.embedPng(qrBytes);
      page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
    } catch (err) {
      console.warn('[PDF_CARTAZ] Falha ao gerar QR Code:', err);
    }

    // Link direto legível abaixo do QR Code
    const linkLabel = 'Ou acesse diretamente pelo navegador do celular ou computador:';
    const linkLabelW = fontRegular.widthOfTextAtSize(linkLabel, 8);
    page.drawText(linkLabel, {
      x: (pageWidth - linkLabelW) / 2,
      y: qrY - 21,
      size: 8,
      font: fontRegular,
      color: corTextoSuave,
    });

    const urlW = fontMono.widthOfTextAtSize(targetUrl, 9.5);
    page.drawText(targetUrl, {
      x: (pageWidth - urlW) / 2,
      y: qrY - 35,
      size: 9.5,
      font: fontMono,
      color: corAzulEscuro,
    });

    // =========================================================================
    // 4. PASSO A PASSO PARA OS PAIS (3 CARDS HORIZONTAIS)
    // =========================================================================
    cursorY = cursorY - qrBoxHeight - 16;
    page.drawText('COMO ASSINAR A AUTORIZAÇÃO EM MENOS DE 2 MINUTOS:', {
      x: margin,
      y: cursorY,
      size: 9.5,
      font: fontBold,
      color: corAzulEscuro,
    });

    cursorY -= 10;
    const stepCardGap = 10;
    const stepCardW = (contentWidth - stepCardGap * 2) / 3;
    const stepCardH = 88;

    const steps = [
      {
        num: '1',
        title: 'Leia o Termo',
        desc: 'Escaneie o QR Code acima e confira as informações do projeto de saúde escolar.',
      },
      {
        num: '2',
        title: 'Preencha os Dados',
        desc: 'Informe os dados do(a) estudante (CPF e nascimento) e do responsável legal.',
      },
      {
        num: '3',
        title: 'Valide e Assine',
        desc: 'Digite o código de 6 dígitos enviado ao seu e-mail e assine na tela do celular.',
      },
    ];

    steps.forEach((step, idx) => {
      const cardX = margin + idx * (stepCardW + stepCardGap);
      const cardY = cursorY - stepCardH;
      drawRoundedBorderBox(page, cardX, cardY, stepCardW, stepCardH, corFundoCinza, corBorda, 0.8);

      // Círculo numerado
      page.drawCircle({
        x: cardX + 20,
        y: cardY + stepCardH - 20,
        size: 10,
        color: corAzulEscuro,
      });
      page.drawText(step.num, {
        x: cardX + 17.3,
        y: cardY + stepCardH - 23.2,
        size: 9.5,
        font: fontBold,
        color: corBranco,
      });

      page.drawText(step.title, {
        x: cardX + 36,
        y: cardY + stepCardH - 23,
        size: 9.5,
        font: fontBold,
        color: corTexto,
      });

      const descLines = wrapText(step.desc, fontRegular, 7.8, stepCardW - 20).slice(0, 4);
      let descY = cardY + stepCardH - 41;
      for (const l of descLines) {
        page.drawText(l, {
          x: cardX + 10,
          y: descY,
          size: 7.8,
          font: fontRegular,
          color: corTextoSuave,
        });
        descY -= 10.5;
      }
    });

    // =========================================================================
    // 5. ESPECIALIDADES & INFORMAÇÕES IMPORTANTES (2 COLUNAS)
    // =========================================================================
    cursorY = cursorY - stepCardH - 16;
    const colGap = 12;
    const colW = (contentWidth - colGap) / 2;
    const infoBoxH = 148;

    // Coluna Esquerda: Especialidades & Público
    drawRoundedBorderBox(page, margin, cursorY - infoBoxH, colW, infoBoxH, corFundoClaro, corBorda, 0.8);
    page.drawText('ATENDIMENTOS PREVENTIVOS', {
      x: margin + 12,
      y: cursorY - 18,
      size: 8.8,
      font: fontBold,
      color: corAzulEscuro,
    });

    const leftBullets = [
      '• Oftalmologia (triagem e acuidade visual)',
      '• Odontologia preventiva e higiene bucal',
      '• Fonoaudiologia (triagem / audiometria)',
      '• Terapia Comunitária Integrativa',
      '• Oficinas de Nutrição e Saúde Alimentar',
      '• Serviço 100% gratuito na unidade escolar',
      '• Estudantes >= 18 anos assinam o próprio termo',
    ];
    let leftY = cursorY - 35;
    for (const item of leftBullets) {
      page.drawText(item, {
        x: margin + 12,
        y: leftY,
        size: 7.7,
        font: fontRegular,
        color: corTexto,
      });
      leftY -= 14.5;
    }

    // Coluna Direita: Segurança, LGPD e Direitos
    const rightX = margin + colW + colGap;
    drawRoundedBorderBox(page, rightX, cursorY - infoBoxH, colW, infoBoxH, corFundoCinza, corBorda, 0.8);
    page.drawText('SEGURANÇA E CONFORMIDADE LEGAL', {
      x: rightX + 12,
      y: cursorY - 18,
      size: 8.8,
      font: fontBold,
      color: corAzulEscuro,
    });

    const rightBullets = [
      '• Assinatura eletrônica com validade jurídica',
      '  (Lei nº 14.063/2020 e MP nº 2.200-2/2001).',
      '• Dados protegidos com criptografia AES-256',
      '  conforme LGPD (Arts. 11 e 14 — Menores).',
      '• Autorização de imagem e voz é opcional.',
      `• Validar comprovante: ${validatorUrl}`,
      `• Revogar autorização: ${revokeUrl}`,
    ];
    let rightY = cursorY - 35;
    for (const item of rightBullets) {
      const isHighlight = item.includes('http');
      page.drawText(item, {
        x: rightX + 12,
        y: rightY,
        size: isHighlight ? 7.1 : 7.7,
        font: isHighlight ? fontMono : fontRegular,
        color: isHighlight ? corAzulEscuro : corTexto,
      });
      rightY -= 14.5;
    }

    // =========================================================================
    // 6. RODAPÉ INSTITUCIONAL
    // =========================================================================
    const emitidoEm = formatBrasiliaDateTime(new Date());
    page.drawLine({
      start: { x: margin, y: 42 },
      end: { x: pageWidth - margin, y: 42 },
      thickness: 0.7,
      color: corBorda,
    });
    page.drawText(`Material informativo exclusivo da unidade ${badgeText}  •  Gerado em ${emitidoEm} (Horário de Brasília)`, {
      x: margin,
      y: 28,
      size: 7.2,
      font: fontRegular,
      color: corTextoSuave,
    });
    page.drawText('Dúvidas? Procure a coordenação/secretaria da escola.', {
      x: pageWidth - margin - fontBold.widthOfTextAtSize('Dúvidas? Procure a coordenação/secretaria da escola.', 7.2),
      y: 28,
      size: 7.2,
      font: fontBold,
      color: corAzulEscuro,
    });

    // Barra inferior sólida
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: 12,
      color: corAzulEscuro,
    });

    return await pdfDoc.save();
  }
}
