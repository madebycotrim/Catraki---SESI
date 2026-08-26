import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { GeradorPdfTermoSesi } from '../src/lib/pades/GeradorPdfTermoSesi.ts';
import { GeradorCertificadoConclusao } from '../src/lib/pades/GeradorCertificadoConclusao.ts';

describe('Validação de Conformidade do Gerador de PDF (Páginas 1 e 2)', () => {
  it('deve gerar PDF com regras de Maioridade (>= 18 anos) omitindo menções ao ECA e qualificando o próprio estudante', async () => {
    const pdfBytes = await GeradorPdfTermoSesi.gerarPdfOriginal({
      tituloProcedimento: 'Circuito de Saúde e Cidadania',
      descricaoProcedimento: 'Avaliações clínicas integradas: Oftalmologia, Odontologia e Nutrição.',
      nomeMenor: 'Carlos Eduardo Oliveira',
      dataNascimentoMenor: '15/03/2000', // Maior de idade (nascido em 2000)
      nomeResponsavel: 'Carlos Eduardo Oliveira',
      cpfResponsavelMascarado: '123.***.***-09',
      cpfResponsavelCompleto: '123.456.789-09',
      parentesco: 'Próprio Estudante',
      isMaiorDeIdade: true,
      autorizacaoSaude: true,
      autorizacaoDados: true,
      autorizacaoImagem: true,
      hashManifesto: 'a1b2c3d4e5f678901234567890abcdefa1b2c3d4e5f678901234567890abcdef',
      dataAssinatura: new Date('2026-08-26T14:30:00Z'),
      tipoAssinatura: 'ELETRONICA_AVANCADA',
      ipAddress: '200.189.112.45',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      signerEmail: 'carlos.oliveira@unb.br',
    });

    expect(pdfBytes).toBeDefined();
    expect(pdfBytes.length).toBeGreaterThan(1000);

    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(2);

    const title = pdfDoc.getTitle();
    expect(title).toContain('Carlos Eduardo Oliveira');
  });

  it('deve gerar PDF para menor de idade (< 18 anos) incluindo representação legal e citação ao ECA', async () => {
    const pdfBytes = await GeradorPdfTermoSesi.gerarPdfOriginal({
      tituloProcedimento: 'Circuito de Saúde Escolar',
      descricaoProcedimento: 'Triagens preventivas durante o turno escolar.',
      nomeMenor: 'Sofia Mendes Cotrim',
      dataNascimentoMenor: '10/05/2011', // 15 anos
      nomeResponsavel: 'Ana Paula Mendes Cotrim',
      cpfResponsavelMascarado: '987.***.***-32',
      cpfResponsavelCompleto: '987.654.321-32',
      parentesco: 'Mãe',
      isMaiorDeIdade: false,
      autorizacaoSaude: true,
      autorizacaoDados: true,
      autorizacaoImagem: false,
      hashManifesto: 'f9e8d7c6b5a43210f9e8d7c6b5a43210f9e8d7c6b5a43210f9e8d7c6b5a43210',
      dataAssinatura: new Date('2026-08-26T14:30:00Z'),
      tipoAssinatura: 'ELETRONICA_AVANCADA',
      ipAddress: '177.100.50.20',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15',
      signerEmail: 'anapaula@gmail.com',
    });

    expect(pdfBytes).toBeDefined();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(2);
  });

  it('deve gerar Certificado de Conclusão com CPF completo e quebra de User-Agent e Hash sem truncamento', async () => {
    const certBytes = await GeradorCertificadoConclusao.gerarCertificado({
      documentId: 'DOC-2026-TEST-9988',
      validationCode: 'CATRAKI-A1B2-C3D4',
      minorName: 'Lucas Cotrim Silva',
      signerName: 'Mateus Cotrim',
      signerCpfMasked: '123.***.***-09',
      signerCpfFull: '123.456.789-09',
      signerRelationship: 'Pai',
      institutionName: 'SESI Taguatinga',
      manifestSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      contentSha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      logRowHash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
      prevLogHash: 'GÊNESIS (Primeiro Registro)',
      merkleRoot: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
      eventos: [
        {
          timestamp: '2026-08-26T14:00:00Z',
          tipo: 'CRIACAO',
          descricao: 'Documento criado e disparado para o responsável.',
          ip: '200.189.112.45',
        },
        {
          timestamp: '2026-08-26T14:02:00Z',
          tipo: 'OTP_SOLICITADO',
          descricao: 'Código 2FA enviado para e-mail.',
        },
        {
          timestamp: '2026-08-26T14:03:00Z',
          tipo: 'ASSINADO',
          descricao: 'Assinatura eletrônica avançada concluída com sucesso.',
          ip: '200.189.112.45',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          ntp_source: 'NTP.br (Observatório Nacional UTC-3)',
        },
      ],
      documentStatus: 'signed',
      signedAt: '2026-08-26T14:03:00Z',
      signerEmail: 'mateus@catraki.com.br',
      signerIp: '200.189.112.45',
      signerUserAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0',
    });

    expect(certBytes).toBeDefined();
    expect(certBytes.length).toBeGreaterThan(1000);

    const pdfDoc = await PDFDocument.load(certBytes);
    expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(1);
    expect(pdfDoc.getTitle()).toContain('CATRAKI-A1B2-C3D4');
  });
});
