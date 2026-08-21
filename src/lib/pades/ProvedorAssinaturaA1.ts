import forge from 'node-forge';
import type { IProvedorAssinatura, ICertificadoInfo } from './IProvedorAssinatura.ts';

/**
 * Estratégia de Assinatura com Certificado Digital A1 (.pfx / .p12)
 * Carrega a chave privada e cadeia em memória volátil (RAM) e executa sanitização imediata (Zero-Scrub).
 */
export class ProvedorAssinaturaA1 implements IProvedorAssinatura {
  public readonly tipo = 'A1_LOCAL';

  private bufferPfx: Uint8Array | null = null;
  private chavePrivadaForge: forge.pki.rsa.PrivateKey | null = null;
  private certificadoPem: string | null = null;
  private cadeiaCertsPem: string[] = [];
  private infoCertificado: ICertificadoInfo | null = null;

  constructor(pfxArrayBufferOrBytes: ArrayBuffer | Uint8Array, senha: string) {
    this.bufferPfx = new Uint8Array(pfxArrayBufferOrBytes);
    this.carregarCertificado(senha);
  }

  private carregarCertificado(senha: string): void {
    if (!this.bufferPfx) {
      throw new Error('Buffer do certificado A1 não fornecido.');
    }

    try {
      // Converte bytes para string binária suportada pelo node-forge
      let pfxBinary = '';
      for (let i = 0; i < this.bufferPfx.length; i++) {
        pfxBinary += String.fromCharCode(this.bufferPfx[i]);
      }

      const p12Asn1 = forge.asn1.fromDer(pfxBinary);
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, senha);

      // 1. Extração da Chave Privada (PKCS#8 Shrouded Key Bag ou Key Bag)
      const bagsChave = p12.getBags({
        bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
      });
      const bagChave = bagsChave[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];

      if (!bagChave || !bagChave.key) {
        // Tenta keyBag comum caso não seja shrouded
        const bagsChaveNormal = p12.getBags({ bagType: forge.pki.oids.keyBag });
        const bagNormal = bagsChaveNormal[forge.pki.oids.keyBag]?.[0];
        if (!bagNormal || !bagNormal.key) {
          throw new Error('Chave privada não encontrada no arquivo .pfx/.p12 ou senha incorreta.');
        }
        this.chavePrivadaForge = bagNormal.key as forge.pki.rsa.PrivateKey;
      } else {
        this.chavePrivadaForge = bagChave.key as forge.pki.rsa.PrivateKey;
      }

      // 2. Extração dos Certificados (Titular + Cadeia ICP-Brasil)
      const bagsCert = p12.getBags({ bagType: forge.pki.oids.certBag });
      const listaCerts = bagsCert[forge.pki.oids.certBag] || [];

      if (listaCerts.length === 0) {
        throw new Error('Nenhum certificado digital X.509 encontrado no contêiner PKCS#12.');
      }

      // Encontra o certificado correspondente à chave privada
      let certTitular: forge.pki.Certificate | null = null;
      const certificadosExtraidos: forge.pki.Certificate[] = [];

      for (const bag of listaCerts) {
        if (bag.cert) {
          certificadosExtraidos.push(bag.cert);
        }
      }

      // Identifica o certificado do titular (geralmente o que tem o mesmo modulus da chave privada)
      if (this.chavePrivadaForge && certificadosExtraidos.length > 0) {
        const nChave = this.chavePrivadaForge.n.toString(16);
        for (const cert of certificadosExtraidos) {
          const pubKey = cert.publicKey as forge.pki.rsa.PublicKey;
          if (pubKey && pubKey.n && pubKey.n.toString(16) === nChave) {
            certTitular = cert;
            break;
          }
        }
      }

      // Fallback para o primeiro se não encontrar casamento de módulo
      if (!certTitular && certificadosExtraidos.length > 0) {
        certTitular = certificadosExtraidos[0];
      }

      if (!certTitular) {
        throw new Error('Certificado X.509 do titular não localizado.');
      }

      this.certificadoPem = forge.pki.certificateToPem(certTitular);

      // Cadeia das ACs emissoras
      this.cadeiaCertsPem = certificadosExtraidos
        .filter((c) => c !== certTitular)
        .map((c) => forge.pki.certificateToPem(c));

      // Extrai dados cadastrais ICP-Brasil
      const subjectAttrs = certTitular.subject.attributes;
      const commonName = (subjectAttrs.find((a) => a.name === 'commonName')?.value as string) || 'Signatário ICP-Brasil';
      const issuerAttrs = certTitular.issuer.attributes;
      const emissorName = (issuerAttrs.find((a) => a.name === 'commonName')?.value as string) || 'Autoridade Certificadora';

      // Extrai CPF/CNPJ se presente no CommonName (padrão ICP-Brasil: "NOME:00000000000")
      let cpfCnpj: string | undefined;
      const matchCpf = commonName.match(/:(\d{11}|\d{14})/);
      if (matchCpf) {
        cpfCnpj = matchCpf[1];
      }

      this.infoCertificado = {
        certificadoPem: this.certificadoPem,
        cadeiaCertificadosPem: this.cadeiaCertsPem,
        numeroSerie: certTitular.serialNumber,
        titular: commonName,
        cpfCnpj,
        emissor: emissorName,
        validadeInicio: certTitular.validity.notBefore,
        validadeFim: certTitular.validity.notAfter,
      };
    } finally {
      // Sobrescreve o buffer original de entrada
      if (this.bufferPfx) {
        this.bufferPfx.fill(0);
        this.bufferPfx = null;
      }
    }
  }

  public async obterCertificadoInfo(): Promise<ICertificadoInfo> {
    if (!this.infoCertificado) {
      throw new Error('Certificado não inicializado ou já destruído da memória.');
    }
    return this.infoCertificado;
  }

  public async assinarHash(hashSha256Digest: Uint8Array): Promise<Uint8Array> {
    if (!this.chavePrivadaForge) {
      throw new Error('Chave privada não disponível para assinatura.');
    }

    // Assinatura RSA PKCS#1 v1.5 com SHA-256 usando node-forge puro
    let binaryHash = '';
    for (let i = 0; i < hashSha256Digest.length; i++) {
      binaryHash += String.fromCharCode(hashSha256Digest[i]);
    }

    // Monta o DigestInfo PKCS#1 para SHA-256
    const md = forge.md.sha256.create();
    md.update(binaryHash, 'raw');

    const signatureRaw = this.chavePrivadaForge.sign(md);

    const signatureBytes = new Uint8Array(signatureRaw.length);
    for (let i = 0; i < signatureRaw.length; i++) {
      signatureBytes[i] = signatureRaw.charCodeAt(i);
    }

    return signatureBytes;
  }

  /**
   * Limpa rigorosamente a memória RAM para proteger a chave privada
   */
  public destruirCredenciais(): void {
    if (this.bufferPfx) {
      this.bufferPfx.fill(0);
      this.bufferPfx = null;
    }
    this.chavePrivadaForge = null;
    this.certificadoPem = null;
    this.cadeiaCertsPem = [];
    this.infoCertificado = null;
  }
}
