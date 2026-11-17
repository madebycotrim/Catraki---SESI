import type { PDFPage } from 'pdf-lib';
import { rgb } from 'pdf-lib';
import QRCode from 'qrcode';

/**
 * Desenha um QR Code vetorial diretamente na página PDF usando `QRCode.create` + `drawRectangle`.
 * Funciona 100% em Cloudflare Workers / Edge, navegadores e Node.js (sem dependência de Canvas).
 */
export function desenharQrCodeVetorial(
  page: PDFPage,
  conteudo: string,
  x: number,
  y: number,
  tamanho: number
): void {
  const qr = QRCode.create(conteudo, { errorCorrectionLevel: 'M' });
  const count = qr.modules.size;
  const quietZone = 2;
  const totalModules = count + quietZone * 2;
  const moduleSize = tamanho / totalModules;

  page.drawRectangle({
    x,
    y,
    width: tamanho,
    height: tamanho,
    color: rgb(1, 1, 1),
  });

  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.modules.get(row, col)) {
        page.drawRectangle({
          x: x + (col + quietZone) * moduleSize,
          y: y + tamanho - (row + 1 + quietZone) * moduleSize,
          width: moduleSize + 0.05,
          height: moduleSize + 0.05,
          color: rgb(0, 0, 0),
        });
      }
    }
  }
}
