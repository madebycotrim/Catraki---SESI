import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  GeradorPdfTermoSesi,
  GeradorCertificadoConclusao,
} from '../src/lib/pades/index.ts';
import { sha256 } from '../src/lib/crypto.ts';

describe('Geração de Documentos de Assinatura Eletrônica (TCLE e Comprovante)', () => {
  it('deve gerar PDF oficial do TCLE (2 páginas) com integridade SHA-256 e sem dependência de certificados X.509', async () => {
    const pdfOriginal = await GeradorPdfTermoSesi.gerarPdfOriginal({
      tituloProcedimento: 'Avaliação Médica e Odontológica Escolar',
      descricaoProcedimento: 'Triagem antropométrica, acuidade visual e avaliação bucal preventiva.',
      nomeMenor: 'Lucas Silva Santos',
      dataNascimentoMenor: '15/03/2015',
      nomeResponsavel: 'João Silva Santos',
      cpfResponsavelMascarado: '***.456.789-**',
      cpfResponsavelCompleto: '123.456.789-00',
      parentesco: 'PAI',
      autorizacaoSaude: true,
      autorizacaoDados: true,
      autorizacaoImagem: false,
      hashManifesto: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      tipoAssinatura: 'ELETRONICA',
      ipAddress: '189.6.24.112',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0 Safari/537.36',
    });

    expect(pdfOriginal).toBeDefined();
    expect(pdfOriginal.length).toBeGreaterThan(1000);

    const pdfDoc = await PDFDocument.load(pdfOriginal);
    expect(pdfDoc.getPageCount()).toBe(2);

    const pdfHash = await sha256(pdfOriginal);
    expect(pdfHash).toHaveLength(64);
  });

  it('deve gerar Comprovante Oficial de Conclusão e Trilha de Auditoria Forense com QR Code', async () => {
    const pdfCertificado = await GeradorCertificadoConclusao.gerarCertificado({
      documentId: 'DOC-2026-TESTE-001',
      validationCode: 'CATRAKI-A1B2-C3D4',
      minorName: 'Lucas Silva Santos',
      signerName: 'João Silva Santos',
      signerCpfMasked: '123.***.***-00',
      signerCpfFull: '123.456.789-00',
      signerRelationship: 'PAI',
      institutionName: 'Escola SESI Taguatinga',
      manifestSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      contentSha256: 'a1b2c3d4e5f678901234567890abcdefa1b2c3d4e5f678901234567890abcdef',
      logRowHash: 'f9e8d7c6b5a43210f9e8d7c6b5a43210f9e8d7c6b5a43210f9e8d7c6b5a43210',
      documentStatus: 'signed',
      signedAt: '2026-08-26T14:30:00Z',
      signerEmail: 'joao.silva@email.com',
      signerIp: '189.6.24.112',
      eventos: [
        {
          timestamp: '2026-08-26T14:20:00Z',
          tipo: 'CRIACAO',
          descricao: 'Documento criado no sistema',
        },
        {
          timestamp: '2026-08-26T14:25:00Z',
          tipo: 'OTP_VERIFICADO',
          descricao: 'Código OTP confirmado por e-mail',
        },
        {
          timestamp: '2026-08-26T14:30:00Z',
          tipo: 'ASSINADO',
          descricao: 'Assinatura eletrônica concluída',
          ip: '189.6.24.112',
        },
      ],
    });

    expect(pdfCertificado).toBeDefined();
    expect(pdfCertificado.length).toBeGreaterThan(1000);

    const pdfDoc = await PDFDocument.load(pdfCertificado);
    expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(1);

    const certHash = await sha256(pdfCertificado);
    expect(certHash).toHaveLength(64);
  });
});
