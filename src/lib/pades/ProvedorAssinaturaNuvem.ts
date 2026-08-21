import type { IProvedorAssinatura, ICertificadoInfo } from './IProvedorAssinatura.ts';

export interface IConfigPscNuvem {
  tipoPsc: 'BIRD_ID' | 'SAFE_ID' | 'REMOTE_ID' | 'VIDAAS' | 'NEOID';
  tokenAcessoOAuth2: string;
  urlBasePsc: string;
  aliasCertificado?: string;
}

/**
 * Estratégia de Assinatura com Certificado Digital em Nuvem (PSC - Provedor de Serviço de Confiança)
 * Arquitetura desacoplada para conexão futura com BirdID, SafeID, RemoteID, VIDaaS e NeoID via API REST.
 */
export class ProvedorAssinaturaNuvem implements IProvedorAssinatura {
  public readonly tipo: string;

  constructor(private config: IConfigPscNuvem) {
    this.tipo = `PSC_${config.tipoPsc}`;
  }

  public async obterCertificadoInfo(): Promise<ICertificadoInfo> {
    // Chamada à API REST do PSC para recuperar o certificado X.509 público e a cadeia
    // Exemplo: GET /oauth/v1/certificates
    const resp = await fetch(`${this.config.urlBasePsc}/oauth/v1/certificates`, {
      headers: {
        Authorization: `Bearer ${this.config.tokenAcessoOAuth2}`,
      },
    });

    if (!resp.ok) {
      throw new Error(`Falha ao obter certificado do PSC ${this.config.tipoPsc}: status ${resp.status}`);
    }

    const data = await resp.json() as any;
    return {
      certificadoPem: data.certificate,
      cadeiaCertificadosPem: data.chain || [],
      numeroSerie: data.serialNumber || 'PSC-REMOTE',
      titular: data.commonName || 'Signatário em Nuvem',
      cpfCnpj: data.cpfCnpj,
      emissor: data.issuer || 'AC Homologada ICP-Brasil',
      validadeInicio: new Date(data.validFrom || Date.now()),
      validadeFim: new Date(data.validTo || Date.now() + 365 * 24 * 60 * 60 * 1000),
    };
  }

  public async assinarHash(hashSha256Digest: Uint8Array): Promise<Uint8Array> {
    // Chamada à API REST do PSC para assinar o Hash SHA-256 via HSM remoto
    // Exemplo: POST /oauth/v1/signatures/sign-hash
    let hexHash = '';
    for (let i = 0; i < hashSha256Digest.length; i++) {
      hexHash += hashSha256Digest[i].toString(16).padStart(2, '0');
    }

    const resp = await fetch(`${this.config.urlBasePsc}/oauth/v1/signatures/sign-hash`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.tokenAcessoOAuth2}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hash: hexHash,
        algorithm: 'SHA-256',
        alias: this.config.aliasCertificado,
      }),
    });

    if (!resp.ok) {
      throw new Error(`Falha na assinatura remota do hash pelo PSC ${this.config.tipoPsc}`);
    }

    const data = await resp.json() as any;
    const rawSignature = atob(data.signatureBase64);
    const signatureBytes = new Uint8Array(rawSignature.length);
    for (let i = 0; i < rawSignature.length; i++) {
      signatureBytes[i] = rawSignature.charCodeAt(i);
    }

    return signatureBytes;
  }

  public destruirCredenciais(): void {
    // Para PSC em nuvem, expira as credenciais em memória
    this.config.tokenAcessoOAuth2 = '';
  }
}
