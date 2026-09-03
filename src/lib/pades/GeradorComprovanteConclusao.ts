import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { formatBrasiliaDateTime } from '../schemas';

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
  ntp_source?: string | null;
}

// Alias de retrocompatibilidade
export type EventoCertificado = EventoComprovante;

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

// Alias de retrocompatibilidade
export type IDadosCertificadoConclusao = IDadosComprovanteConclusao;

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
 * Produz documento forense com toda a cadeia de custódia digital do termo de consentimento eletrônico.
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

    // ── CABEÇALHO ──────────────────────────────────────────────────────────
    page.drawRectangle({ x: 0, y: PAGE_H - 80, width: PAGE_W, height: 80, color: COR_AZUL_SESI });

    page.drawText('PLATAFORMA CATRAKI', {
      x: MARGIN, y: PAGE_H - 28, size: 9, font: fontBold, color: rgb(1, 1, 1),
    });
    page.drawText('COMPROVANTE DE CONCLUSÃO DE ASSINATURA ELETRÔNICA SIMPLES', {
      x: MARGIN, y: PAGE_H - 44, size: 8, font: fontBold, color: rgb(0.85, 0.92, 1),
    });
    page.drawText('Assinatura Eletrônica Simples nos termos do Art. 10, § 2º da MP nº 2.200-2/2001 e Art. 4º, I da Lei Federal nº 14.063/2020.', {
      x: MARGIN, y: PAGE_H - 58, size: 6, font: fontRegular, color: rgb(0.75, 0.85, 1),
    });

    // Código de validação no cabeçalho
    const codeText = dados.validationCode;
    page.drawText(codeText, {
      x: PAGE_W - MARGIN - fontMono.widthOfTextAtSize(codeText, 9) - 4,
      y: PAGE_H - 36, size: 9, font: fontMono, color: rgb(1, 1, 0.8),
    });
    page.drawText('Protocolo Forense', {
      x: PAGE_W - MARGIN - 80,
      y: PAGE_H - 47, size: 6, font: fontRegular, color: rgb(0.75, 0.85, 1),
    });

    y = PAGE_H - 80 - 16;

    // ── STATUS DO DOCUMENTO E HASH SHA-256 ──────────────────────────────────
    const statusLabel = dados.documentStatus === 'signed' ? 'ASSINADO (CONCLUÍDO)'
      : dados.documentStatus === 'revoked' ? 'REVOGADO'
      : dados.documentStatus === 'CANCELADO_POR_ERRO' ? 'CANCELADO POR ERRO'
      : dados.documentStatus.toUpperCase();
    const statusColor = dados.documentStatus === 'signed' ? COR_VERDE : COR_VERMELHO;

    page.drawRectangle({ x: MARGIN, y: y - 36, width: CONTENT_W, height: 44, color: COR_FUNDO_CLARO, borderColor: COR_AZUL_SESI, borderWidth: 0.5 });
    page.drawText('STATUS DO DOCUMENTO:', { x: MARGIN + 8, y: y - 12, size: 7.5, font: fontBold, color: COR_PRETO });
    page.drawText(statusLabel, { x: MARGIN + 130, y: y - 12, size: 8.5, font: fontBold, color: statusColor });
    page.drawText(`ID: ${dados.documentId}`, { x: MARGIN + 320, y: y - 12, size: 7, font: fontMono, color: COR_CINZA });
    
    // Hash no topo da área do status sem truncar
    page.drawText('HASH IDENTIFICADOR (SHA-256):', { x: MARGIN + 8, y: y - 28, size: 7, font: fontBold, color: COR_CINZA });
    page.drawText(dados.manifestSha256 || 'PENDENTE DE ASSINATURA', { x: MARGIN + 160, y: y - 28, size: 6.5, font: fontMono, color: COR_PRETO });
    
    novaLinha(52);

    // ── DADOS DO DOCUMENTO E DO SIGNATÁRIO ─────────────────────────────────
    page.drawText('IDENTIFICAÇÃO DO SIGNATÁRIO E DO PROCESSO', { x: MARGIN, y, size: 8, font: fontBold, color: COR_AZUL_SESI });
    novaLinha(12);
    drawLine(MARGIN, y, PAGE_W - MARGIN, y);
    novaLinha(10);

    const formattedSignDate = dados.signedAt
      ? formatBrasiliaDateTime(dados.signedAt) + ' UTC-3'
      : 'Pendente';

    // CPF completo na página de comprovante para prova jurídica irrefutável
    const cpfDisplay = dados.signerCpfFull || dados.signerCpfMasked;
    const userAgentVal = dados.signerUserAgent || dados.eventos.find(e => e.user_agent)?.user_agent || 'Navegador Web / Dispositivo Seguro';

    const fields: Array<[string, string | string[]]> = [
      ['Nome do Signatário', dados.signerName],
      ['CPF do Signatário (Completo)', cpfDisplay],
      ['E-mail de Confirmação (OTP)', dados.signerEmail || 'Não informado'],
      ['IP do Acesso', dados.signerIp || dados.eventos.find(e => e.ip)?.ip || 'Não coletado'],
      ['Navegador / Dispositivo', quebrarTexto(userAgentVal, 60)],
      ['Data e Hora Exata', formattedSignDate],
      ['Estudante Vinculado', dados.minorName],
      ['Vínculo Declarado', dados.signerRelationship],
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

    // ── HASHES CRIPTOGRÁFICOS ──────────────────────────────────────────────
    checkPage(120);
    page.drawText('REGISTRO CRIPTOGRÁFICO DE INTEGRIDADE (SHA-256 — MP 2.200-2/2001 E LEI 14.063/2020)', { x: MARGIN, y, size: 8, font: fontBold, color: COR_AZUL_SESI });
    novaLinha(12);
    drawLine(MARGIN, y, PAGE_W - MARGIN, y);
    novaLinha(10);

    const hashFields = [
      ['Hash do Manifesto (SHA-256)', dados.manifestSha256],
      ['Hash do Conteúdo TCLE (SHA-256)', dados.contentSha256],
      ['Hash da Linha de Auditoria', dados.logRowHash],
      ['Hash do Bloco Anterior', dados.prevLogHash || 'GÊNESIS (Primeiro Registro)'],
      ['Raiz de Merkle da Cadeia', dados.merkleRoot || '(calculada no próximo cron)'],
    ];

    for (const [label, value] of hashFields) {
      page.drawText(`${label}:`, { x: MARGIN, y, size: 7, font: fontBold, color: COR_CINZA });
      novaLinha(11);
      // Quebra o hash em linha
      const MAX_CHARS = 95;
      const strValue = String(value);
      if (strValue.length > MAX_CHARS) {
        page.drawText(strValue.slice(0, MAX_CHARS), { x: MARGIN + 8, y, size: 6.5, font: fontMono, color: COR_PRETO });
        novaLinha(9);
        page.drawText(strValue.slice(MAX_CHARS), { x: MARGIN + 8, y, size: 6.5, font: fontMono, color: COR_PRETO });
      } else {
        page.drawText(strValue, { x: MARGIN + 8, y, size: 6.5, font: fontMono, color: COR_PRETO });
      }
      novaLinha(14);
    }

    novaLinha(6);

    // ── LINHA DO TEMPO ─────────────────────────────────────────────────────
    checkPage(80);
    page.drawText('LINHA DO TEMPO DE AÇÕES — CADEIA DE CUSTÓDIA DIGITAL', { x: MARGIN, y, size: 8, font: fontBold, color: COR_AZUL_SESI });
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

      page.drawText(ev.descricao, { x: MARGIN + 15, y, size: 7, font: fontRegular, color: COR_CINZA });
      novaLinha(10);

      if (ev.ip) {
        page.drawText(`IP: ${ev.ip}`, { x: MARGIN + 15, y, size: 6.5, font: fontMono, color: rgb(0.5, 0.5, 0.5) });
        novaLinha(9);
      }
      if (ev.user_agent) {
        const uaLines = quebrarTexto(ev.user_agent, 75);
        for (const uaL of uaLines) {
          page.drawText(`Navegador: ${uaL}`, { x: MARGIN + 15, y, size: 6.2, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });
          novaLinha(8);
        }
      }
      if (ev.geo) {
        page.drawText(`Geo: ${ev.geo}`, { x: MARGIN + 15, y, size: 6.5, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });
        novaLinha(9);
      }
      if (ev.ntp_source) {
        page.drawText(`NTP: ${ev.ntp_source}`, { x: MARGIN + 15, y, size: 6, font: fontRegular, color: rgb(0.6, 0.6, 0.7) });
        novaLinha(9);
      }
      novaLinha(6);
    }

    // ── QR CODE DE VALIDAÇÃO ───────────────────────────────────────────────
    checkPage(140);
    const baseUrl = dados.validationBaseUrl || 'https://catraki.com.br/validar';
    const validationUrl = `${baseUrl}/${dados.validationCode}`;

    try {
      const qrDataUrl = await QRCode.toDataURL(validationUrl, {
        errorCorrectionLevel: 'M',
        width: 120,
        margin: 1,
      });
      const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      const qrBytes = Uint8Array.from(atob(qrBase64), c => c.charCodeAt(0));
      const qrImage = await pdfDoc.embedPng(qrBytes);

      const QR_SIZE = 90;
      const qrX = PAGE_W - MARGIN - QR_SIZE;
      const qrY = y - QR_SIZE;

      page.drawRectangle({ x: qrX - 6, y: qrY - 6, width: QR_SIZE + 12, height: QR_SIZE + 12, color: COR_FUNDO_CLARO, borderColor: COR_AZUL_SESI, borderWidth: 0.5 });
      page.drawImage(qrImage, { x: qrX, y: qrY, width: QR_SIZE, height: QR_SIZE });
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
    } catch {
      novaLinha(10);
    }

    // ── RODAPÉ JURÍDICO & DISCLAIMER OBRIGATÓRIO (MÓDULO 4) ────────────────
    checkPage(100);
    drawLine(MARGIN, y, PAGE_W - MARGIN, y);
    novaLinha(14);

    page.drawText('REGISTRO DE ACEITE E HISTÓRICO DE AUDITORIA', { x: MARGIN, y, size: 7.5, font: fontBold, color: COR_PRETO });
    novaLinha(11);

    const disclaimer = [
      'Este Comprovante de Conclusão e Registro de Assinatura Eletrônica Simples é gerado automaticamente pela Plataforma Catraki,',
      'contendo o identificador SHA-256 e o histórico temporal registrado no momento da confirmação do aceite eletrônico por e-mail (OTP).',
      'O presente registro atesta a manifestação da vontade para os devidos fins de controle institucional e conformidade.',
      '',
      'BASE LEGAL: Lei Federal nº 14.063/2020 (Assinatura Eletrônica Simples); MP nº 2.200-2/2001 (Art. 10, § 2º);',
      'Código Civil (Arts. 104 e 107); LGPD — Lei nº 13.709/2018 (Arts. 11 e 14); Marco Civil da Internet (Lei nº 12.965/2014).',
      '',
      'A Plataforma Catraki atua exclusivamente como infraestrutura tecnológica para registro de logs e emissão de comprovantes,',
      'não possuindo CNPJ, acesso ou ingerência sobre os dados de saúde ou o conteúdo firmado entre as partes.',
    ];

    for (const line of disclaimer) {
      if (!line) { novaLinha(4); continue; }
      page.drawText(line, { x: MARGIN, y, size: 6.2, font: fontRegular, color: COR_CINZA });
      novaLinha(9.5);
    }

    novaLinha(6);
    page.drawText(`Gerado em: ${formatarDataBr(new Date().toISOString())} | Plataforma Catraki — Infraestrutura Tecnológica`, {
      x: MARGIN, y, size: 6, font: fontRegular, color: rgb(0.6, 0.6, 0.65),
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
