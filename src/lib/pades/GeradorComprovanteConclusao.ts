import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { formatBrasiliaDateTime, isProprioEstudante } from '../schemas';
import { desenharQrCodeVetorial } from './qr-pdf.ts';

// ============================================================================
// GERADOR DE COMPROVANTE DE CONCLUSÃO — RELATÓRIO FINAL DE AUDITORIA FORENSE
// Conformidade: MP nº 2.200-2/2001 (Art. 10, § 2º); Lei nº 14.063/2020; Código Civil; CPC; LGPD Art. 46
// Chancelado com hash SHA-256 original — qualquer adulteração invalida o documento
// ============================================================================

export interface EventoComprovante {
  timestamp: string;              // ISO 8601 UTC
  tipo: 'CRIACAO' | 'VISUALIZACAO' | 'OTP_SOLICITADO' | 'OTP_VERIFICADO' | 'ASSINADO' | 'REVOGADO' | 'CANCELADO_POR_ERRO';
  descricao: string;
  ip?: string | null;
  user_agent?: string | null;
  geo?: string | null;
}

export interface IDadosComprovanteConclusao {
  // Identificadores
  documentId: string;
  validationCode: string;
  // Conteúdo
  minorName: string;
  signerName: string;
  signerCpfMasked: string;
  signerCpfFull?: string;
  signerRelationship: string;
  institutionName: string;
  // Criptografia
  manifestSha256: string;         // Hash SHA-256 do manifesto no momento da assinatura
  contentSha256: string;          // Hash SHA-256 do conteúdo do TCLE
  logRowHash: string;             // Hash da linha de auditoria (encadeamento)
  prevLogHash?: string | null;    // Hash da linha anterior (prova de encadeamento)
  merkleRoot?: string | null;     // Raiz de Merkle da cadeia completa
  // Linha do Tempo
  eventos: EventoComprovante[];
  // Status final
  documentStatus: string;
  signedAt?: string | null;
  revokedAt?: string | null;
  revocationReason?: string | null;
  signerEmail?: string;
  signerIp?: string;
  signerUserAgent?: string;
  // URL de validação pública
  validationBaseUrl?: string;
}

const COR_AZUL_SESI = rgb(3 / 255, 75 / 255, 127 / 255);   // #034b7f
const COR_PRETO = rgb(0.04, 0.04, 0.04);
const COR_CINZA = rgb(0.45, 0.45, 0.45);
const COR_VERDE = rgb(16 / 255, 124 / 255, 65 / 255);
const COR_VERMELHO = rgb(0.72, 0.11, 0.11);
const COR_FUNDO_CLARO = rgb(0.97, 0.97, 0.98);

function formatarDataBr(isoDate?: string | null): string {
  if (!isoDate) return '—';
  try {
    return formatBrasiliaDateTime(isoDate) + ' (BRT)';
  } catch {
    return isoDate;
  }
}

function labelEvento(tipo: EventoComprovante['tipo']): string {
  const labels: Record<EventoComprovante['tipo'], string> = {
    'CRIACAO': '[CRIAÇÃO] Documento Criado no Sistema',
    'VISUALIZACAO': '[VISUALIZAÇÃO] Documento Aberto pelo Signatário',
    'OTP_SOLICITADO': '[OTP E-MAIL] Código de Confirmação Solicitado',
    'OTP_VERIFICADO': '[OTP E-MAIL] Código de Confirmação Validado com Sucesso',
    'ASSINADO': '[ASSINATURA] Assinatura Eletrônica Registrada',
    'REVOGADO': '[REVOGAÇÃO] Consentimento Revogado (LGPD Art. 18)',
    'CANCELADO_POR_ERRO': '[CANCELAMENTO] Documento Cancelado por Erro Operacional',
  };
  return labels[tipo] || tipo;
}

function quebrarTexto(texto: string, maxCaracteres: number): string[] {
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

/**
 * Gerador do Comprovante de Conclusão em PDF — Relatório Final de Linha do Tempo e Auditoria
 * Produz documento forense com toda a cadeia de custódia eletrônica do termo de consentimento eletrônico.
 */
export class GeradorComprovanteConclusao {
  public static async gerarComprovante(dados: IDadosComprovanteConclusao): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();

    // Metadados PDF
    pdfDoc.setTitle(`Comprovante de Conclusão — ${dados.validationCode}`);
    pdfDoc.setAuthor('Plataforma Catraki');
    pdfDoc.setSubject(`Relatório Forense de Linha do Tempo — Documento ${dados.documentId}`);
    pdfDoc.setKeywords(['LGPD', 'Lei 14.063/2020', 'Catraki', 'Assinatura Eletrônica', 'Auditoria', 'Comprovante']);
    pdfDoc.setCreationDate(new Date());
    pdfDoc.setModificationDate(new Date());

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

    const PAGE_W = 595.28;  // A4 largura pts
    const PAGE_H = 841.89;  // A4 altura pts
    const MARGIN = 42;
    const CONTENT_W = PAGE_W - MARGIN * 2;

    let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - MARGIN;

    const novaLinha = (delta = 14) => { y -= delta; };

    const checkPage = (needed = 60) => {
      if (y < MARGIN + needed) {
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - MARGIN;
        // Cabeçalho mini nas páginas subsequentes
        page.drawRectangle({ x: 0, y: PAGE_H - 28, width: PAGE_W, height: 28, color: COR_AZUL_SESI });
        page.drawText('CATRAKI — COMPROVANTE DE CONCLUSÃO (CONTINUAÇÃO)', {
          x: MARGIN, y: PAGE_H - 20, size: 7, font: fontBold, color: rgb(1, 1, 1),
        });
        y = PAGE_H - 42;
      }
    };

    const drawLine = (x1: number, y1: number, x2: number, y2: number, thickness = 0.5) => {
      page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color: COR_CINZA });
    };

    // ── CABEÇALHO ABNT INSTITUCIONAL ────────────────────────────────────────
    page.drawText('PLATAFORMA CATRAKI', {
      x: MARGIN, y: PAGE_H - 42, size: 11, font: fontBold, color: COR_AZUL_SESI,
    });
    page.drawText('COMPROVANTE DE CONCLUSÃO E AUDITORIA FORENSE', {
      x: MARGIN, y: PAGE_H - 55, size: 8, font: fontRegular, color: COR_CINZA,
    });
    const codeText = dados.validationCode;
    page.drawText(`Protocolo: ${codeText}`, {
      x: PAGE_W - MARGIN - fontMono.widthOfTextAtSize(`Protocolo: ${codeText}`, 8),
      y: PAGE_H - 42, size: 8, font: fontMono, color: COR_AZUL_SESI,
    });
    page.drawText('Folha 1', {
      x: PAGE_W - MARGIN - fontBold.widthOfTextAtSize('Folha 1', 8),
      y: PAGE_H - 55, size: 8, font: fontBold, color: COR_CINZA,
    });
    page.drawLine({
      start: { x: MARGIN, y: PAGE_H - 64 },
      end: { x: PAGE_W - MARGIN, y: PAGE_H - 64 },
      thickness: 1.2,
      color: COR_AZUL_SESI,
    });

    y = PAGE_H - 80;

    // ── STATUS DO DOCUMENTO E HASH SHA-256 ──────────────────────────────────
    const statusLabel = dados.documentStatus === 'signed' ? 'ASSINADO (CONCLUÍDO)'
      : dados.documentStatus === 'revoked' ? 'REVOGADO'
      : dados.documentStatus === 'CANCELADO_POR_ERRO' ? 'CANCELADO POR ERRO'
      : dados.documentStatus.toUpperCase();
    const statusColor = dados.documentStatus === 'signed' ? COR_VERDE : COR_VERMELHO;

    page.drawRectangle({ x: MARGIN, y: y - 22, width: CONTENT_W, height: 28, color: COR_FUNDO_CLARO, borderColor: COR_AZUL_SESI, borderWidth: 0.5 });
    page.drawText('STATUS:', { x: MARGIN + 8, y: y - 12, size: 7.5, font: fontBold, color: COR_PRETO });
    page.drawText(statusLabel, { x: MARGIN + 55, y: y - 12, size: 8.5, font: fontBold, color: statusColor });
    page.drawText(`ID: ${dados.documentId}`, { x: MARGIN + 275, y: y - 12, size: 7, font: fontMono, color: COR_CINZA });

    novaLinha(36);

    // ── 1. IDENTIFICAÇÃO DO SIGNATÁRIO E DO PROCESSO ───────────────────────
    page.drawText('1. IDENTIFICAÇÃO DO SIGNATÁRIO E DO PROCESSO', { x: MARGIN, y, size: 8.5, font: fontBold, color: COR_AZUL_SESI });
    novaLinha(12);
    drawLine(MARGIN, y, PAGE_W - MARGIN, y);
    novaLinha(10);

    const formattedSignDate = dados.signedAt
      ? formatBrasiliaDateTime(dados.signedAt) + ' (BRT)'
      : 'Pendente';

    const selfSigner = isProprioEstudante(dados.signerRelationship);
    // CPF completo na página de comprovante para prova jurídica irrefutável
    const cpfDisplay = dados.signerCpfFull || dados.signerCpfMasked;
    const userAgentVal = dados.signerUserAgent || dados.eventos.find(e => e.user_agent)?.user_agent || 'Navegador Web / Dispositivo Seguro';

    const fields: Array<[string, string | string[]]> = [
      [selfSigner ? 'Titular / Estudante' : 'Responsável Legal (Signatário)', dados.signerName],
      ['CPF do Signatário (Completo)', cpfDisplay],
      ['Vínculo Declarado', selfSigner ? 'Próprio Estudante (Maior de Idade)' : dados.signerRelationship],
      ...(!selfSigner ? [['Estudante Beneficiado(a)', dados.minorName] as [string, string]] : []),
      ['E-mail de Confirmação (OTP)', dados.signerEmail || 'Não informado'],
      ['IP do Acesso', dados.signerIp || dados.eventos.find(e => e.ip)?.ip || 'Não coletado'],
      ['Navegador / Dispositivo', quebrarTexto(userAgentVal, 60)],
      ['Data e Hora Exata', formattedSignDate],
    ];

    for (const [label, value] of fields) {
      page.drawText(`${label}:`, { x: MARGIN, y, size: 7.5, font: fontBold, color: COR_CINZA });
      
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          page.drawText(value[i], { x: MARGIN + 140, y: y - (i * 10), size: 7.2, font: fontRegular, color: COR_PRETO });
        }
        novaLinha(Math.max(value.length * 10 + 3, 13));
      } else {
        const valStr = String(value);
        page.drawText(valStr, { x: MARGIN + 140, y, size: 7.5, font: fontRegular, color: COR_PRETO });
        novaLinha(13);
      }
    }

    novaLinha(6);

    // ── 2. HASHES CRIPTOGRÁFICOS ───────────────────────────────────────────
    checkPage(95);
    page.drawText('2. REGISTRO CRIPTOGRÁFICO DE INTEGRIDADE (SHA-256)', { x: MARGIN, y, size: 8.5, font: fontBold, color: COR_AZUL_SESI });
    novaLinha(12);
    drawLine(MARGIN, y, PAGE_W - MARGIN, y);
    novaLinha(10);

    const hashFields: Array<[string, string]> = [
      ['Hash do Manifesto', dados.manifestSha256 || 'PENDENTE'],
      ['Hash da Auditoria', dados.logRowHash || '—'],
      ['Bloco Anterior (Chain)', dados.prevLogHash || 'GÊNESIS (Primeiro Registro)'],
    ];
    if (dados.merkleRoot) {
      hashFields.push(['Raiz de Merkle', dados.merkleRoot]);
    }

    for (const [label, value] of hashFields) {
      page.drawText(`${label}:`, { x: MARGIN, y, size: 7, font: fontBold, color: COR_CINZA });
      page.drawText(String(value).slice(0, 88), { x: MARGIN + 115, y, size: 6.4, font: fontMono, color: COR_PRETO });
      novaLinha(13);
    }

    novaLinha(6);

    // ── 3. LINHA DO TEMPO ──────────────────────────────────────────────────
    checkPage(80);
    page.drawText('3. LINHA DO TEMPO DE AÇÕES — CADEIA DE CUSTÓDIA ELETRÔNICA', { x: MARGIN, y, size: 8.5, font: fontBold, color: COR_AZUL_SESI });
    novaLinha(12);
    drawLine(MARGIN, y, PAGE_W - MARGIN, y);
    novaLinha(14);

    for (let i = 0; i < dados.eventos.length; i++) {
      const ev = dados.eventos[i];
      checkPage(70);

      // Bolinha da timeline
      const dotColor = ev.tipo === 'ASSINADO' ? COR_VERDE
        : ev.tipo === 'REVOGADO' || ev.tipo === 'CANCELADO_POR_ERRO' ? COR_VERMELHO
        : COR_AZUL_SESI;

      page.drawCircle({ x: MARGIN + 5, y: y + 3, size: 4, color: dotColor });
      if (i < dados.eventos.length - 1) {
        page.drawLine({ start: { x: MARGIN + 5, y: y - 2 }, end: { x: MARGIN + 5, y: y - 28 }, thickness: 0.8, color: rgb(0.8, 0.8, 0.85) });
      }

      // Evento
      page.drawText(labelEvento(ev.tipo), { x: MARGIN + 15, y, size: 8, font: fontBold, color: COR_PRETO });
      const tsFormatted = formatarDataBr(ev.timestamp);
      page.drawText(tsFormatted, { x: PAGE_W - MARGIN - fontRegular.widthOfTextAtSize(tsFormatted, 7) - 4, y, size: 7, font: fontRegular, color: COR_CINZA });
      novaLinha(11);

      const descLines = quebrarTexto(ev.descricao || '', 85);
      for (const descLine of descLines) {
        page.drawText(descLine, { x: MARGIN + 15, y, size: 7, font: fontRegular, color: COR_CINZA });
        novaLinha(10);
      }
      if (ev.geo) {
        page.drawText(`Localidade: ${ev.geo}`, { x: MARGIN + 15, y, size: 6.5, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });
        novaLinha(9);
      }
      novaLinha(5);
    }

    // ── QR CODE DE VALIDAÇÃO ───────────────────────────────────────────────
    checkPage(140);
    const baseUrl = dados.validationBaseUrl || 'https://www.catraki.com.br/validar';
    const validationUrl = `${baseUrl}/${dados.validationCode}`;

    try {
      const QR_SIZE = 90;
      const qrX = PAGE_W - MARGIN - QR_SIZE;
      const qrY = y - QR_SIZE;

      page.drawRectangle({ x: qrX - 6, y: qrY - 6, width: QR_SIZE + 12, height: QR_SIZE + 12, color: COR_FUNDO_CLARO, borderColor: COR_AZUL_SESI, borderWidth: 0.5 });
      desenharQrCodeVetorial(page, validationUrl, qrX, qrY, QR_SIZE);
      page.drawText('Validar Autenticidade', { x: qrX - 2, y: qrY - 12, size: 6, font: fontBold, color: COR_AZUL_SESI });

      // Texto ao lado do QR
      page.drawText('VERIFICAÇÃO PÚBLICA DE AUTENTICIDADE', { x: MARGIN, y, size: 8, font: fontBold, color: COR_AZUL_SESI });
      novaLinha(13);
      page.drawText('Qualquer pessoa pode verificar a autenticidade deste documento em:', { x: MARGIN, y, size: 7, font: fontRegular, color: COR_PRETO });
      novaLinha(11);
      page.drawText(validationUrl, { x: MARGIN, y, size: 7, font: fontMono, color: COR_AZUL_SESI });
      novaLinha(11);
      page.drawText('O QR Code ao lado leva diretamente à página de validação.', { x: MARGIN, y, size: 7, font: fontRegular, color: COR_CINZA });
      novaLinha(50);
    } catch (err) {
      console.warn('[PDF] Falha ao gerar QR Code do comprovante:', err);
      novaLinha(10);
    }

    // ── 4. TRANSPARÊNCIA E INFORMAÇÕES OBRIGATÓRIAS (LGPD ART. 9º, 18 E 41) ──
    checkPage(95);
    page.drawText('4. TRANSPARÊNCIA E CONFORMIDADE LGPD (LEI Nº 13.709/2018)', { x: MARGIN, y, size: 8.5, font: fontBold, color: COR_AZUL_SESI });
    novaLinha(12);
    drawLine(MARGIN, y, PAGE_W - MARGIN, y);
    novaLinha(11);

    const lgpdLines = [
      'Controladores (Art. 9º, III e VI): Universidade de Brasília (UnB — CNPJ 00.038.174/0001-43) e SESI-DF (CNPJ 03.777.341/0001-08).',
      'Operadora Tecnológica: Plataforma Catraki (emissão, registro de log e custódia SHA-256, sem acesso a dados clínicos).',
      'Guarda e Segurança (Art. 9º, II e Art. 46): Retenção legal de até 20 anos (Res. CFM nº 1.821/2007), sob criptografia AES-256-GCM.',
      'DPO e Direitos (Art. 8º, § 5º; Art. 18; Art. 41): suporte@catraki.com.br (prazo: 15 dias) | https://www.catraki.com.br/titular e /revogar.',
      'Base legal: Lei nº 14.063/2020 (Art. 4º, I), MP nº 2.200-2/2001 (Art. 10, § 2º), LGPD e Marco Civil (Lei nº 12.965/2014).',
    ];

    for (const line of lgpdLines) {
      for (const wrapped of quebrarTexto(line, 96)) {
        page.drawText(wrapped, { x: MARGIN, y, size: 6.4, font: fontRegular, color: COR_CINZA });
        novaLinha(9);
      }
    }

    novaLinha(4);
    page.drawText(`Gerado em: ${formatarDataBr(new Date().toISOString())} | Plataforma Catraki`, {
      x: MARGIN, y, size: 6.2, font: fontRegular, color: rgb(0.55, 0.55, 0.6),
    });

    return await pdfDoc.save();
  }

  // Alias estático para manter retrocompatibilidade
  public static async gerarCertificado(dados: IDadosComprovanteConclusao): Promise<Uint8Array> {
    return this.gerarComprovante(dados);
  }
}

// Alias de retrocompatibilidade
export const GeradorCertificadoConclusao = GeradorComprovanteConclusao;
