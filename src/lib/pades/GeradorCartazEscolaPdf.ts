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

/**
 * Calcula o maior tamanho de fonte (até minSize) para caber em maxWidth sem vazar da caixa.
 */
function fitFontSize(text: string, font: PDFFont, maxFontSize: number, minFontSize: number, maxWidth: number): number {
  let size = maxFontSize;
  while (size > minFontSize && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 0.4;
  }
  return Math.max(minFontSize, Number(size.toFixed(1)));
}

function drawBox(
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
 * Desenha cantoneiras de mira ao redor do QR Code para reforçar a leitura com câmera.
 */
function drawQrCornerBrackets(
  page: PDFPage,
  x: number,
  y: number,
  size: number,
  color: ReturnType<typeof rgb>
) {
  const len = 14;
  const thick = 2.4;
  // Inferior esquerdo
  page.drawLine({ start: { x, y }, end: { x: x + len, y }, thickness: thick, color });
  page.drawLine({ start: { x, y }, end: { x, y: y + len }, thickness: thick, color });
  // Inferior direito
  page.drawLine({ start: { x: x + size, y }, end: { x: x + size - len, y }, thickness: thick, color });
  page.drawLine({ start: { x: x + size, y }, end: { x: x + size, y: y + len }, thickness: thick, color });
  // Superior esquerdo
  page.drawLine({ start: { x, y: y + size }, end: { x: x + len, y: y + size }, thickness: thick, color });
  page.drawLine({ start: { x, y: y + size }, end: { x, y: y + size - len }, thickness: thick, color });
  // Superior direito
  page.drawLine({ start: { x: x + size, y: y + size }, end: { x: x + size - len, y: y + size }, thickness: thick, color });
  page.drawLine({ start: { x: x + size, y: y + size }, end: { x: x + size, y: y + size - len }, thickness: thick, color });
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
    const margin = 34;
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
    const corVerde = rgb(0.04, 0.52, 0.33);
    const corFundoVerde = rgb(0.92, 0.985, 0.955);
    const corTexto = rgb(0.11, 0.16, 0.24);
    const corTextoSuave = rgb(0.35, 0.42, 0.51);
    const corBranco = rgb(1, 1, 1);

    // =========================================================================
    // 1. CABEÇALHO INSTITUCIONAL (BANNER SUPERIOR)
    // =========================================================================
    const headerHeight = 92;
    page.drawRectangle({
      x: 0,
      y: pageHeight - headerHeight,
      width: pageWidth,
      height: headerHeight,
      color: corAzulEscuro,
    });
    page.drawRectangle({
      x: 0,
      y: pageHeight - headerHeight - 4,
      width: pageWidth,
      height: 4,
      color: corAzulClaro,
    });

    let hasLogo = false;
    try {
      const logoBytes = Uint8Array.from(atob(LOGO_BASE64), (c) => c.charCodeAt(0));
      const logoImg = await pdfDoc.embedPng(logoBytes);
      drawBox(page, margin, pageHeight - 72, 52, 52, corBranco);
      page.drawImage(logoImg, {
        x: margin + 5,
        y: pageHeight - 67,
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
      y: pageHeight - 34,
      size: 15.5,
      font: fontBold,
      color: corBranco,
    });
    page.drawText('AUTORIZAÇÃO ELETRÔNICA PARA ATENDIMENTO PREVENTIVO EM SAÚDE', {
      x: titleX,
      y: pageHeight - 51,
      size: 8.3,
      font: fontBold,
      color: rgb(0.75, 0.9, 1),
    });
    page.drawText('Realização: SESI-DF & Universidade de Brasília (UnB)  •  Plataforma Catraki', {
      x: titleX,
      y: pageHeight - 67,
      size: 8,
      font: fontRegular,
      color: rgb(0.86, 0.93, 0.99),
    });

    // =========================================================================
    // 2. CARTÃO DE IDENTIFICAÇÃO DA UNIDADE ESCOLAR
    // =========================================================================
    let cursorY = pageHeight - headerHeight - 18;
    const schoolBoxHeight = 68;
    drawBox(
      page,
      margin,
      cursorY - schoolBoxHeight,
      contentWidth,
      schoolBoxHeight,
      corFundoClaro,
      corAzulEscuro,
      1.2
    );
    page.drawRectangle({
      x: margin,
      y: cursorY - schoolBoxHeight,
      width: 6,
      height: schoolBoxHeight,
      color: corAzulEscuro,
    });

    const badgeText = (institution.short_name || institution.id).toUpperCase();
    const badgeFontSize = fitFontSize(badgeText, fontBold, 8.5, 6.8, 170);
    const badgeWidth = Math.max(66, fontBold.widthOfTextAtSize(badgeText, badgeFontSize) + 18);
    page.drawRectangle({
      x: margin + 16,
      y: cursorY - 24,
      width: badgeWidth,
      height: 16,
      color: corAzulEscuro,
    });
    page.drawText(badgeText, {
      x: margin + 25,
      y: cursorY - 19,
      size: badgeFontSize,
      font: fontBold,
      color: corBranco,
    });

    const locText = `${institution.city || 'Brasília'} / ${institution.state || 'DF'}  •  /autorizar/${institution.id}`;
    const maxLocW = contentWidth - badgeWidth - 38;
    const locFontSize = fitFontSize(locText, fontBold, 8, 6.2, maxLocW);
    const locW = fontBold.widthOfTextAtSize(locText, locFontSize);
    page.drawText(locText, {
      x: margin + contentWidth - locW - 12,
      y: cursorY - 19,
      size: locFontSize,
      font: fontBold,
      color: corTextoSuave,
    });

    const schoolNameLines = wrapText(institution.name, fontBold, 12, contentWidth - 32).slice(0, 2);
    let schoolNameY = cursorY - 41;
    for (const line of schoolNameLines) {
      page.drawText(line, {
        x: margin + 16,
        y: schoolNameY,
        size: 12,
        font: fontBold,
        color: corTexto,
      });
      schoolNameY -= 15;
    }

    // =========================================================================
    // 3. ÁREA CENTRAL DE DESTAQUE DO QR CODE
    // =========================================================================
    cursorY = cursorY - schoolBoxHeight - 14;
    const qrBoxHeight = 258;
    drawBox(page, margin, cursorY - qrBoxHeight, contentWidth, qrBoxHeight, corBranco, corBorda, 1);

    // Subfaixa de chamada
    page.drawRectangle({
      x: margin,
      y: cursorY - 28,
      width: contentWidth,
      height: 28,
      color: corFundoVerde,
    });
    const callTitle = 'APONTE A CÂMERA DO CELULAR PARA AUTORIZAR O(A) ESTUDANTE';
    const callFontSize = fitFontSize(callTitle, fontBold, 10.2, 8, contentWidth - 24);
    const callTitleW = fontBold.widthOfTextAtSize(callTitle, callFontSize);
    page.drawText(callTitle, {
      x: (pageWidth - callTitleW) / 2,
      y: cursorY - 18,
      size: callFontSize,
      font: fontBold,
      color: corVerde,
    });

    // QR Code com moldura e cantoneiras de mira
    const qrSize = 166;
    const qrX = (pageWidth - qrSize) / 2;
    const qrY = cursorY - 42 - qrSize;
    const framePad = 10;

    drawBox(page, qrX - framePad, qrY - framePad, qrSize + framePad * 2, qrSize + framePad * 2, corBranco, corBorda, 0.8);
    drawQrCornerBrackets(page, qrX - framePad, qrY - framePad, qrSize + framePad * 2, corAzulEscuro);

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

    // Link direto ajustado automaticamente para nunca vazar da caixa
    const linkLabel = 'Ou acesse diretamente pelo navegador do celular ou computador:';
    const linkLabelW = fontRegular.widthOfTextAtSize(linkLabel, 7.8);
    page.drawText(linkLabel, {
      x: (pageWidth - linkLabelW) / 2,
      y: qrY - 22,
      size: 7.8,
      font: fontRegular,
      color: corTextoSuave,
    });

    const urlFontSize = fitFontSize(targetUrl, fontMono, 9.5, 6.8, contentWidth - 28);
    const urlW = fontMono.widthOfTextAtSize(targetUrl, urlFontSize);
    page.drawText(targetUrl, {
      x: (pageWidth - urlW) / 2,
      y: qrY - 36,
      size: urlFontSize,
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
      size: 9.2,
      font: fontBold,
      color: corAzulEscuro,
    });

    cursorY -= 9;
    const stepCardGap = 10;
    const stepCardW = (contentWidth - stepCardGap * 2) / 3;
    const stepCardH = 84;

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
      drawBox(page, cardX, cardY, stepCardW, stepCardH, corFundoCinza, corBorda, 0.8);

      page.drawCircle({
        x: cardX + 20,
        y: cardY + stepCardH - 19,
        size: 10,
        color: corAzulEscuro,
      });
      page.drawText(step.num, {
        x: cardX + 17.3,
        y: cardY + stepCardH - 22.2,
        size: 9.5,
        font: fontBold,
        color: corBranco,
      });

      page.drawText(step.title, {
        x: cardX + 36,
        y: cardY + stepCardH - 22,
        size: 9.2,
        font: fontBold,
        color: corTexto,
      });

      const descLines = wrapText(step.desc, fontRegular, 7.6, stepCardW - 20).slice(0, 4);
      let descY = cardY + stepCardH - 39;
      for (const l of descLines) {
        page.drawText(l, {
          x: cardX + 10,
          y: descY,
          size: 7.6,
          font: fontRegular,
          color: corTextoSuave,
        });
        descY -= 10.2;
      }
    });

    // =========================================================================
    // 5. ESPECIALIDADES & INFORMAÇÕES IMPORTANTES (2 COLUNAS)
    // =========================================================================
    cursorY = cursorY - stepCardH - 14;
    const colGap = 12;
    const colW = (contentWidth - colGap) / 2;
    const infoBoxH = 166;
    const colTextMaxW = colW - 24;

    // Coluna Esquerda
    drawBox(page, margin, cursorY - infoBoxH, colW, infoBoxH, corFundoClaro, corBorda, 0.8);
    page.drawRectangle({ x: margin, y: cursorY - 24, width: colW, height: 24, color: corAzulEscuro });
    page.drawText('ATENDIMENTOS PREVENTIVOS (GRATUITO)', {
      x: margin + 12,
      y: cursorY - 15.5,
      size: 8.2,
      font: fontBold,
      color: corBranco,
    });

    const leftBullets = [
      '• Oftalmologia (triagem e acuidade visual)',
      '• Odontologia preventiva e higiene bucal',
      '• Fonoaudiologia (triagem e audiometria)',
      '• Terapia Comunitária Integrativa',
      '• Oficinas de Nutrição e Saúde Alimentar',
      '• Exclusivo para estudantes da unidade',
      '• Maiores de 18 anos assinam o próprio termo',
    ];
    let leftY = cursorY - 40;
    for (const item of leftBullets) {
      const sz = fitFontSize(item, fontRegular, 7.8, 6.6, colTextMaxW);
      page.drawText(item, {
        x: margin + 12,
        y: leftY,
        size: sz,
        font: fontRegular,
        color: corTexto,
      });
      leftY -= 16.5;
    }

    // Coluna Direita
    const rightX = margin + colW + colGap;
    drawBox(page, rightX, cursorY - infoBoxH, colW, infoBoxH, corFundoCinza, corBorda, 0.8);
    page.drawRectangle({ x: rightX, y: cursorY - 24, width: colW, height: 24, color: corAzulEscuro });
    page.drawText('SEGURANÇA, LGPD E DIREITOS', {
      x: rightX + 12,
      y: cursorY - 15.5,
      size: 8.2,
      font: fontBold,
      color: corBranco,
    });

    const rightItems: Array<{ text: string; mono?: boolean; gap?: number }> = [
      { text: '• Assinatura eletrônica com validade jurídica' },
      { text: '  (Lei nº 14.063/2020 e MP nº 2.200-2/2001).', gap: 14 },
      { text: '• Dados protegidos com criptografia AES-256' },
      { text: '  conforme LGPD (Arts. 11 e 14 — Menores).', gap: 14 },
      { text: '• Autorização de imagem e voz é opcional.', gap: 15 },
      { text: '• Validar comprovante:', gap: 10 },
      { text: `  ${validatorUrl}`, mono: true, gap: 14 },
      { text: '• Revogar autorização:', gap: 10 },
      { text: `  ${revokeUrl}`, mono: true, gap: 12 },
    ];
    let rightY = cursorY - 40;
    for (const item of rightItems) {
      const activeFont = item.mono ? fontMono : fontRegular;
      const sz = fitFontSize(item.text, activeFont, item.mono ? 7.3 : 7.8, 6.0, colTextMaxW);
      page.drawText(item.text, {
        x: rightX + 12,
        y: rightY,
        size: sz,
        font: activeFont,
        color: item.mono ? corAzulEscuro : corTexto,
      });
      rightY -= item.gap || 11.5;
    }

    // =========================================================================
    // 6. RODAPÉ INSTITUCIONAL (SEM COLISÃO)
    // =========================================================================
    const emitidoEm = formatBrasiliaDateTime(new Date());
    page.drawLine({
      start: { x: margin, y: 42 },
      end: { x: pageWidth - margin, y: 42 },
      thickness: 0.7,
      color: corBorda,
    });
    page.drawText(`Material exclusivo da unidade ${badgeText}  •  Gerado em ${emitidoEm} (Brasília)`, {
      x: margin,
      y: 29,
      size: 7,
      font: fontRegular,
      color: corTextoSuave,
    });
    const helpText = 'Dúvidas? Procure a coordenação ou secretaria da escola.';
    page.drawText(helpText, {
      x: margin,
      y: 19,
      size: 7.2,
      font: fontBold,
      color: corAzulEscuro,
    });

    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: 11,
      color: corAzulEscuro,
    });

    return await pdfDoc.save();
  }
}
