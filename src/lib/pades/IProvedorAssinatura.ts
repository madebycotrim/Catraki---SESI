/**
 * Contratos do Padrão Strategy para Provedores de Assinatura Digital ICP-Brasil
 * Permite alternar entre Certificado A1 (PKCS#12 em memória) e Provedores em Nuvem (PSC)
 */

export interface ICertificadoInfo {
  certificadoPem: string;
  cadeiaCertificadosPem: string[];
  numeroSerie: string;
  titular: string;
  cpfCnpj?: string;
  emissor: string;
  validadeInicio: Date;
  validadeFim: Date;
}

export interface IProvedorAssinatura {
  /**
   * Identificador do provedor (ex: 'A1_LOCAL', 'PSC_BIRDID', 'PSC_SAFEID')
   */
  readonly tipo: string;

  /**
   * Obtém informações do certificado e cadeia pública X.509
   */
  obterCertificadoInfo(): Promise<ICertificadoInfo>;

  /**
   * Assina o resumo criptográfico SHA-256 usando a chave privada
   */
  assinarHash(hashSha256Digest: Uint8Array): Promise<Uint8Array>;

  /**
   * Destrói ativamente da memória RAM todos os dados sensíveis e buffers de chaves
   */
  destruirCredenciais(): void;
}
