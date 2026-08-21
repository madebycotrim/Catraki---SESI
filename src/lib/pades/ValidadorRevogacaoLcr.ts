import forge from 'node-forge';

/**
 * Validador de Revogação de Certificados ICP-Brasil via LCR (Lista de Certificados Revogados - CRL)
 * Faz download das LCRs públicas diretamente das ACs com cache em memória RAM.
 */
export class ValidadorRevogacaoLcr {
  private static cacheLcr: Map<string, { lcrDer: string; expiraEm: number }> = new Map();

  /**
   * Valida se o certificado foi revogado em sua LCR
   */
  public async validarCertificado(certificadoPem: string): Promise<{ valido: boolean; urlLcr?: string; motivo?: string }> {
    try {
      const cert = forge.pki.certificateFromPem(certificadoPem);

      // 1. Checa validade temporal básica
      const agora = new Date();
      if (agora < cert.validity.notBefore) {
        return { valido: false, motivo: `Certificado ainda não é válido (inicia em ${cert.validity.notBefore.toLocaleDateString('pt-BR')})` };
      }
      if (agora > cert.validity.notAfter) {
        return { valido: false, motivo: `Certificado expirou em ${cert.validity.notAfter.toLocaleDateString('pt-BR')}` };
      }

      // 2. Extrai URL da LCR (OID 2.5.29.31)
      const urlLcr = this.extrairUrlLcr(cert);
      if (!urlLcr) {
        return { valido: true };
      }

      // 3. Obtém a LCR binária
      const lcrDer = await this.obterLcrComCache(urlLcr);
      if (!lcrDer) {
        // Se a LCR estiver inacessível temporariamente, não bloqueia o fluxo offline
        return { valido: true, urlLcr };
      }

      // 4. Inspeciona a lista de números de série revogados
      const lcrAsn1 = forge.asn1.fromDer(lcrDer) as any;
      const tbsCertList = Array.isArray(lcrAsn1.value) ? lcrAsn1.value[0] : null;
      const revokedCertificates = tbsCertList?.value?.find(
        (elemento: any) => elemento.type === forge.asn1.Type.SEQUENCE && Array.isArray(elemento.value) && elemento.value.length > 0
      );

      if (revokedCertificates && Array.isArray(revokedCertificates.value)) {
        const serialAlvo = cert.serialNumber.toLowerCase().replace(/^0+/, '');

        for (const entry of revokedCertificates.value) {
          if (entry.value && entry.value[0]) {
            const serialRevogado = forge.util.bytesToHex(entry.value[0].value).toLowerCase().replace(/^0+/, '');
            if (serialRevogado === serialAlvo) {
              return {
                valido: false,
                urlLcr,
                motivo: `Certificado revogado na LCR da Autoridade Certificadora emissora.`,
              };
            }
          }
        }
      }

      return { valido: true, urlLcr };
    } catch (erro: any) {
      return { valido: true, motivo: `Validação LCR ignorada: ${erro?.message || erro}` };
    }
  }

  private extrairUrlLcr(cert: forge.pki.Certificate): string | null {
    const ext = cert.extensions.find((e) => e.id === '2.5.29.31' || e.name === 'cRLDistributionPoints');
    if (!ext) return null;

    try {
      const asn1Ext = forge.asn1.fromDer(ext.value);
      const json = JSON.stringify(asn1Ext);
      const match = json.match(/http[s]?:\/\/[^"\\]+\.crl/i) || json.match(/http[s]?:\/\/[^"\\]+/i);
      return match ? match[0] : null;
    } catch {
      return null;
    }
  }

  private async obterLcrComCache(url: string): Promise<string | null> {
    const agora = Date.now();
    const emCache = ValidadorRevogacaoLcr.cacheLcr.get(url);

    if (emCache && emCache.expiraEm > agora) {
      return emCache.lcrDer;
    }

    try {
      const resp = await fetch(url);
      if (!resp.ok) return null;

      const buffer = new Uint8Array(await resp.arrayBuffer());
      let binary = '';
      for (let i = 0; i < buffer.length; i++) {
        binary += String.fromCharCode(buffer[i]);
      }

      // Cache de 30 minutos para evitar downloads pesados da AC
      ValidadorRevogacaoLcr.cacheLcr.set(url, {
        lcrDer: binary,
        expiraEm: agora + 30 * 60 * 1000,
      });

      return binary;
    } catch {
      return null;
    }
  }
}
