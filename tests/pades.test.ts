import { describe, it, expect } from 'vitest';
import forge from 'node-forge';
import {
  ProvedorAssinaturaA1,
  PAdESSignerService,
  GeradorPdfTermoSesi,
  ClienteCarimboTempoGratuito,
} from '../src/lib/pades/index.ts';

describe('Motor de Assinatura Digital PAdES / ICP-Brasil', () => {
  /**
   * Helper para criar um certificado A1 (.pfx) de teste em memória
   */
  function gerarCertificadoA1TesteEmMemoria(senha = 'senha123'): Uint8Array {
    // 1. Gera par de chaves RSA 2048 bits
    const keys = forge.pki.rsa.generateKeyPair(2048);

    // 2. Cria certificado X.509
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01' + Date.now().toString(16);
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

    const attrs = [
      { name: 'commonName', value: 'JOAO SILVA:12345678909' },
      { name: 'countryName', value: 'BR' },
      { name: 'organizationName', value: 'ICP-Brasil' },
      { name: 'organizationalUnitName', value: 'Autoridade Certificadora Teste' },
    ];
    cert.setSubject(attrs);
    cert.setIssuer(attrs);

    // Auto-assina o certificado com SHA-256
    cert.sign(keys.privateKey, forge.md.sha256.create());

    // 3. Empacota em PKCS#12 (.pfx)
    const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], senha, {
      generateLocalKeyId: true,
      friendlyName: 'Certificado A1 Teste ICP-Brasil',
    });

    const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
    const p12Bytes = new Uint8Array(p12Der.length);
    for (let i = 0; i < p12Der.length; i++) {
      p12Bytes[i] = p12Der.charCodeAt(i);
    }

    return p12Bytes;
  }

  it('deve extrair metadados e assinar hash com ProvedorAssinaturaA1 e zerar memória', async () => {
    const pfxBytes = gerarCertificadoA1TesteEmMemoria('minhasenha');
    const provedor = new ProvedorAssinaturaA1(pfxBytes, 'minhasenha');

    const info = await provedor.obterCertificadoInfo();
    expect(info.titular).toBe('JOAO SILVA:12345678909');
    expect(info.cpfCnpj).toBe('12345678909');
    expect(info.certificadoPem).toContain('BEGIN CERTIFICATE');

    // Assina um hash SHA-256 de teste
    const hashTeste = new Uint8Array(32).fill(7);
    const assinatura = await provedor.assinarHash(hashTeste);
    expect(assinatura).toBeDefined();
    expect(assinatura.length).toBe(256); // 2048 bits = 256 bytes

    // Destrói credenciais e valida proteção em memória
    provedor.destruirCredenciais();
    await expect(provedor.obterCertificadoInfo()).rejects.toThrow();
  });

  it('deve gerar PDF oficial do SESI e assinar no perfil PAdES com SHA-256', async () => {
    // 1. Gera PDF do Termo
    const pdfOriginal = await GeradorPdfTermoSesi.gerarPdfOriginal({
      tituloProcedimento: 'Avaliação Médica e Odontológica Escolar',
      descricaoProcedimento: 'Triagem antropométrica, acuidade visual e avaliação bucal preventiva.',
      nomeMenor: 'Lucas Silva',
      dataNascimentoMenor: '15/03/2015',
      nomeResponsavel: 'João Silva',
      cpfResponsavelMascarado: '***.456.789-**',
      parentesco: 'PAI',
      autorizacaoSaude: true,
      autorizacaoDados: true,
      autorizacaoImagem: false,
      hashManifesto: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      tipoAssinatura: 'ICP_BRASIL_A1',
    });

    expect(pdfOriginal).toBeDefined();
    expect(pdfOriginal.length).toBeGreaterThan(1000);

    // 2. Prepara Provedor A1
    const pfxBytes = gerarCertificadoA1TesteEmMemoria('segredo');
    const provedor = new ProvedorAssinaturaA1(pfxBytes, 'segredo');

    // 3. Executa Assinatura PAdES
    const signer = new PAdESSignerService();
    const resultado = await signer.assinar(pdfOriginal, provedor, {
      razao: 'Termo de Autorização SESI Escola Cidadã',
      aplicarCarimboTempo: true,
      validarLcr: false, // Desliga LCR online em teste unitário
    });

    expect(resultado.pdfAssinadoBytes).toBeDefined();
    expect(resultado.pdfAssinadoBytes.length).toBeGreaterThan(pdfOriginal.length);
    expect(resultado.hashSha256Pdf).toHaveLength(64);
    expect(resultado.titular).toBe('JOAO SILVA:12345678909');

    // Converte PDF assinado para texto e valida injeção de ByteRange e Dicionário /Sig
    const pdfStr = new TextDecoder('latin1').decode(resultado.pdfAssinadoBytes);
    expect(pdfStr).toContain('/ByteRange [');
    expect(pdfStr).toContain('/SubFilter /adbe.pkcs7.detached');
    expect(pdfStr).toContain('/Type /Sig');

    provedor.destruirCredenciais();
  });

  it('deve emitir token de carimbo do tempo RFC 3161 autônomo com custo zero', async () => {
    const clienteTs = new ClienteCarimboTempoGratuito();
    const hashDigest = new Uint8Array(32).fill(42);
    const carimbo = await clienteTs.requisitarCarimboTempo(hashDigest);

    expect(carimbo.tokenDer).toBeDefined();
    expect(carimbo.tokenDer.length).toBeGreaterThan(20);
    expect(carimbo.autoridade).toMatch(/FreeTSA|RFC 3161|ACT/i);
    expect(carimbo.dataHora).toBeInstanceOf(Date);
  });
});
