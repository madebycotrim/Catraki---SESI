import { PDFDocument, PDFName, PDFHexString, PDFString, PDFNumber, PDFArray, PDFDict } from 'pdf-lib';
import forge from 'node-forge';
import type { IProvedorAssinatura } from './IProvedorAssinatura.ts';
import { ClienteCarimboTempoGratuito } from './ClienteCarimboTempoGratuito.ts';
import { ValidadorRevogacaoLcr } from './ValidadorRevogacaoLcr.ts';

export interface IOpcoesAssinaturaPAdES {
  razao?: string;
  localizacao?: string;
  contato?: string;
  aplicarCarimboTempo?: boolean;
  validarLcr?: boolean;
}

export interface IResultadoAssinaturaPAdES {
  pdfAssinadoBytes: Uint8Array;
  hashSha256Pdf: string;
  titular: string;
  emissor: string;
  numeroSerie: string;
  carimboTempoAplicado: boolean;
  autoridadeCarimbo?: string;
}

/**
 * Serviço de Assinatura Digital PAdES em conformidade com o padrão ICP-Brasil (DOC-ICP-15.01)
 * Realiza manipulação de baixo nível de bytes de PDF, injeção de ByteRange e montagem do contêiner PKCS#7/CMS.
 */
export class PAdESSignerService {
  // Tamanho do contêiner PKCS#7 reservado em bytes (Hex = 2x o tamanho)
  private static readonly TAMANHO_RESERVADO_BYTES = 16384;

  private readonly clienteCarimbo = new ClienteCarimboTempoGratuito();
  private readonly validadorRevogacao = new ValidadorRevogacaoLcr();

  public async assinar(
    pdfOriginalBytes: Uint8Array,
    provedor: IProvedorAssinatura,
    opcoes: IOpcoesAssinaturaPAdES = {}
  ): Promise<IResultadoAssinaturaPAdES> {
    const {
      razao = 'Documento assinado digitalmente no padrão ICP-Brasil (PAdES)',
      localizacao = 'São Paulo, Brasil',
      aplicarCarimboTempo = true,
      validarLcr = true,
    } = opcoes;

    // 1. Obtém dados do certificado
    const infoCert = await provedor.obterCertificadoInfo();

    // 2. Validação prévia de revogação LCR (se habilitado)
    if (validarLcr) {
      const resLcr = await this.validadorRevogacao.validarCertificado(infoCert.certificadoPem);
      if (!resLcr.valido) {
        throw new Error(`Validação ICP-Brasil falhou: ${resLcr.motivo}`);
      }
    }

    // 3. Prepara o PDF e injeta o Dicionário de Assinatura com ByteRange
    const pdfDoc = await PDFDocument.load(pdfOriginalBytes, { ignoreEncryption: true });
    const placeholderHex = '0'.repeat(PAdESSignerService.TAMANHO_RESERVADO_BYTES * 2);

    const sigDict = pdfDoc.context.obj({
      Type: 'Sig',
      Filter: 'Adobe.PPKLite',
      SubFilter: 'adbe.pkcs7.detached',
      ByteRange: [
        PDFNumber.of(0),
        PDFNumber.of(1000000000),
        PDFNumber.of(1000000000),
        PDFNumber.of(1000000000),
      ],
      Contents: PDFHexString.of(placeholderHex),
      Reason: PDFHexString.fromText(razao),
      Location: PDFHexString.fromText(localizacao),
      Name: PDFHexString.fromText(infoCert.titular),
      M: PDFString.fromDate(new Date()),
    });

    const sigRef = pdfDoc.context.register(sigDict);

    // Cria Widget de Assinatura na primeira página
    const widgetDict = pdfDoc.context.obj({
      Type: 'Annot',
      Subtype: 'Widget',
      FT: 'Sig',
      Rect: [0, 0, 0, 0],
      V: sigRef,
      T: PDFHexString.fromText(`Signature_ICP_${Date.now()}`),
      F: 4,
      P: pdfDoc.getPages()[0].ref,
    });

    const widgetRef = pdfDoc.context.register(widgetDict);
    pdfDoc.getPages()[0].node.addAnnot(widgetRef);

    const acroFormRef = pdfDoc.catalog.get(PDFName.of('AcroForm'));
    let acroForm: PDFDict;
    if (acroFormRef) {
      acroForm = pdfDoc.context.lookup(acroFormRef, PDFDict);
    } else {
      acroForm = pdfDoc.context.obj({
        Fields: [],
        SigFlags: 3,
      });
      pdfDoc.catalog.set(PDFName.of('AcroForm'), acroForm);
    }
    const fields = acroForm.lookup(PDFName.of('Fields'), PDFArray);
    fields.push(widgetRef);

    // Salva o PDF com o espaço reservado
    const pdfBytesIntermediario = await pdfDoc.save({ useObjectStreams: false });
    let pdfBuffer = new Uint8Array(pdfBytesIntermediario);

    // 4. Localiza o placeholder e calcula os offsets do ByteRange
    const placeholderHexBytes = new TextEncoder().encode(placeholderHex);
    const posContents = this.encontrarSubarray(pdfBuffer, placeholderHexBytes);

    if (posContents === -1) {
      throw new Error('Placeholder de assinatura não localizado no PDF.');
    }

    const inicioContents = posContents - 1; // Inclui o '<'
    const fimContents = posContents + placeholderHex.length + 1; // Inclui o '>'

    const offset1 = 0;
    const len1 = inicioContents;
    const offset2 = fimContents;
    const len2 = pdfBuffer.length - fimContents;

    const byteRange = [offset1, len1, offset2, len2];
    const byteRangeString = `/ByteRange [ ${byteRange.join(' ')} ]`;

    // Localiza a tag /ByteRange de forma flexível
    const tagByteRangeBytes = new TextEncoder().encode('/ByteRange');
    const posByteRangeTag = this.encontrarSubarray(pdfBuffer, tagByteRangeBytes);

    if (posByteRangeTag === -1) {
      throw new Error('Tag /ByteRange para substituição não localizada no PDF.');
    }

    // Encontra o fim do array do ByteRange (caractere ']')
    let posFimColchete = -1;
    for (let i = posByteRangeTag; i < posContents; i++) {
      if (pdfBuffer[i] === 0x5D) { // ']'
        posFimColchete = i;
        break;
      }
    }

    if (posFimColchete === -1) {
      throw new Error('Fechamento do array /ByteRange não localizado.');
    }

    const tamanhoOriginalByteRange = posFimColchete - posByteRangeTag + 1;
    let byteRangeFinalStr = byteRangeString;

    if (byteRangeFinalStr.length < tamanhoOriginalByteRange) {
      // Preenche com espaços antes do fecha colchete para manter o deslocamento de bytes 100% idêntico
      const espacos = ' '.repeat(tamanhoOriginalByteRange - byteRangeFinalStr.length);
      byteRangeFinalStr = `/ByteRange [ ${byteRange.join(' ')}${espacos} ]`;
    } else if (byteRangeFinalStr.length > tamanhoOriginalByteRange) {
      // Se a string formatada for maior, formata compacto sem espaços extras
      byteRangeFinalStr = `/ByteRange [${byteRange.join(' ')}]`;
    }

    const byteRangeFinalBytes = new TextEncoder().encode(byteRangeFinalStr.padEnd(tamanhoOriginalByteRange, ' '));
    pdfBuffer.set(byteRangeFinalBytes.subarray(0, tamanhoOriginalByteRange), posByteRangeTag);

    // 5. Calcula o resumo SHA-256 sobre as duas faixas válidas do ByteRange
    const parte1 = pdfBuffer.subarray(byteRange[0], byteRange[0] + byteRange[1]);
    const parte2 = pdfBuffer.subarray(byteRange[2], byteRange[2] + byteRange[3]);

    const mdPdf = forge.md.sha256.create();
    let binParte1 = '';
    for (let i = 0; i < parte1.length; i++) binParte1 += String.fromCharCode(parte1[i]);
    let binParte2 = '';
    for (let i = 0; i < parte2.length; i++) binParte2 += String.fromCharCode(parte2[i]);

    mdPdf.update(binParte1 + binParte2, 'raw');
    const digestSha256PdfHex = mdPdf.digest().toHex();

    const digestSha256PdfBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      digestSha256PdfBytes[i] = parseInt(digestSha256PdfHex.substring(i * 2, i * 2 + 2), 16);
    }

    // 6. Monta o envelope PKCS#7/CMS assinado
    const certTitular = forge.pki.certificateFromPem(infoCert.certificadoPem);
    const cadeiaCerts = infoCert.cadeiaCertificadosPem.map((pem) => forge.pki.certificateFromPem(pem));

    const p7 = forge.pkcs7.createSignedData();
    let binDigest = '';
    for (let i = 0; i < digestSha256PdfBytes.length; i++) binDigest += String.fromCharCode(digestSha256PdfBytes[i]);
    p7.content = forge.util.createBuffer(binDigest);

    p7.addCertificate(certTitular);
    for (const c of cadeiaCerts) {
      p7.addCertificate(c);
    }

    // Atributos Assinados Obrigatórios (DOC-ICP-15.01)
    const dataAssinatura = new Date();
    const atributosAssinados = [
      {
        type: forge.pki.oids.contentType,
        value: forge.pki.oids.data,
      },
      {
        type: forge.pki.oids.signingTime,
        value: dataAssinatura,
      },
      {
        type: forge.pki.oids.messageDigest,
        value: binDigest,
      },
    ];

    // Calcula o digest dos atributos assinados serializados e assina via Provedor
    const asn1Attrs = forge.asn1.create(
      forge.asn1.Class.UNIVERSAL,
      forge.asn1.Type.SET,
      true,
      atributosAssinados.map((attr) => {
        let valAsn1: any;
        if (attr.type === forge.pki.oids.contentType) {
          valAsn1 = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OID, false, forge.asn1.oidToDer(attr.value as string).getBytes());
        } else if (attr.type === forge.pki.oids.signingTime) {
          const utcTime = (attr.value as Date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
          valAsn1 = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.UTCTIME, false, utcTime.substring(2));
        } else {
          valAsn1 = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OCTETSTRING, false, attr.value as string);
        }

        return forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
          forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OID, false, forge.asn1.oidToDer(attr.type).getBytes()),
          forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SET, true, [valAsn1]),
        ]);
      })
    );

    const attrsDer = forge.asn1.toDer(asn1Attrs).getBytes();
    const mdAttrs = forge.md.sha256.create();
    mdAttrs.update(attrsDer, 'raw');
    const digestAttrsHex = mdAttrs.digest().toHex();

    const digestAttrsBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      digestAttrsBytes[i] = parseInt(digestAttrsHex.substring(i * 2, i * 2 + 2), 16);
    }

    const assinaturaRsaBytes = await provedor.assinarHash(digestAttrsBytes);
    let binAssinaturaRsa = '';
    for (let i = 0; i < assinaturaRsaBytes.length; i++) {
      binAssinaturaRsa += String.fromCharCode(assinaturaRsaBytes[i]);
    }

    // 7. Carimbo do Tempo RFC 3161 (Unsigned Attribute)
    let autoridadeCarimboNome: string | undefined;
    let unauthenticatedAttrs: any[] | undefined;

    if (aplicarCarimboTempo) {
      try {
        const carimbo = await this.clienteCarimbo.requisitarCarimboTempo(assinaturaRsaBytes);
        autoridadeCarimboNome = carimbo.autoridade;

        let binToken = '';
        for (let i = 0; i < carimbo.tokenDer.length; i++) {
          binToken += String.fromCharCode(carimbo.tokenDer[i]);
        }

        const timeStampAsn1 = forge.asn1.fromDer(binToken);

        unauthenticatedAttrs = [
          forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
            // id-aa-timeStampToken (1.2.840.113549.1.9.16.2.14)
            forge.asn1.create(
              forge.asn1.Class.UNIVERSAL,
              forge.asn1.Type.OID,
              false,
              forge.asn1.oidToDer('1.2.840.113549.1.9.16.2.14').getBytes()
            ),
            forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SET, true, [timeStampAsn1]),
          ]),
        ];
      } catch {
        // Se falhar o carimbo, mantém PAdES-AD-RB válido
      }
    }

    // 8. Montagem do ASN.1 ContentInfo PKCS#7
    const certIssuerAsn1 = certTitular.issuer.attributes.map((a: any) =>
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SET, true, [
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
          forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OID, false, forge.asn1.oidToDer(a.type).getBytes()),
          forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.PRINTABLESTRING, false, a.value),
        ]),
      ])
    );

    const signerInfoAsn1 = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
      // version: 1
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.INTEGER, false, forge.util.hexToBytes('01')),
      // issuerAndSerialNumber
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, certIssuerAsn1),
        forge.asn1.create(
          forge.asn1.Class.UNIVERSAL,
          forge.asn1.Type.INTEGER,
          false,
          forge.util.hexToBytes(certTitular.serialNumber)
        ),
      ]),
      // digestAlgorithm: SHA-256
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
        forge.asn1.create(
          forge.asn1.Class.UNIVERSAL,
          forge.asn1.Type.OID,
          false,
          forge.asn1.oidToDer('2.16.840.1.101.3.4.2.1').getBytes()
        ),
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.NULL, false, ''),
      ]),
      // authenticatedAttributes [0]
      forge.asn1.create(forge.asn1.Class.CONTEXT_SPECIFIC, 0, true, asn1Attrs.value),
      // digestEncryptionAlgorithm: RSA
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
        forge.asn1.create(
          forge.asn1.Class.UNIVERSAL,
          forge.asn1.Type.OID,
          false,
          forge.asn1.oidToDer('1.2.840.113549.1.1.1').getBytes()
        ),
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.NULL, false, ''),
      ]),
      // encryptedDigest
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OCTETSTRING, false, binAssinaturaRsa),
      // unauthenticatedAttributes [1] (se houver carimbo)
      ...(unauthenticatedAttrs
        ? [forge.asn1.create(forge.asn1.Class.CONTEXT_SPECIFIC, 1, true, unauthenticatedAttrs)]
        : []),
    ]);

    const signedDataAsn1 = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
      // OID signedData: 1.2.840.113549.1.7.2
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.OID,
        false,
        forge.asn1.oidToDer('1.2.840.113549.1.7.2').getBytes()
      ),
      forge.asn1.create(forge.asn1.Class.CONTEXT_SPECIFIC, 0, true, [
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
          // version: 1
          forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.INTEGER, false, forge.util.hexToBytes('01')),
          // digestAlgorithms
          forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SET, true, [
            forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
              forge.asn1.create(
                forge.asn1.Class.UNIVERSAL,
                forge.asn1.Type.OID,
                false,
                forge.asn1.oidToDer('2.16.840.1.101.3.4.2.1').getBytes()
              ),
              forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.NULL, false, ''),
            ]),
          ]),
          // encapContentInfo (data)
          forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
            forge.asn1.create(
              forge.asn1.Class.UNIVERSAL,
              forge.asn1.Type.OID,
              false,
              forge.asn1.oidToDer('1.2.840.113549.1.7.1').getBytes()
            ),
          ]),
          // certificates [0]
          forge.asn1.create(
            forge.asn1.Class.CONTEXT_SPECIFIC,
            0,
            true,
            [certTitular, ...cadeiaCerts].map((c) => forge.pki.certificateToAsn1(c))
          ),
          // signerInfos
          forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SET, true, [signerInfoAsn1]),
        ]),
      ]),
    ]);

    const pkcs7Der = forge.asn1.toDer(signedDataAsn1).getBytes();
    const pkcs7Hex = forge.util.bytesToHex(pkcs7Der);

    if (pkcs7Hex.length > placeholderHex.length) {
      throw new Error(`Contêiner PKCS#7 excede o tamanho reservado (${pkcs7Hex.length} > ${placeholderHex.length}).`);
    }

    const pkcs7HexFinal = pkcs7Hex.padEnd(placeholderHex.length, '0');
    const pkcs7HexBytes = new TextEncoder().encode(pkcs7HexFinal);
    pdfBuffer.set(pkcs7HexBytes, posContents);

    return {
      pdfAssinadoBytes: pdfBuffer,
      hashSha256Pdf: digestSha256PdfHex,
      titular: infoCert.titular,
      emissor: infoCert.emissor,
      numeroSerie: infoCert.numeroSerie,
      carimboTempoAplicado: !!autoridadeCarimboNome,
      autoridadeCarimbo: autoridadeCarimboNome,
    };
  }

  private encontrarSubarray(buffer: Uint8Array, pattern: Uint8Array): number {
    outer: for (let i = 0; i <= buffer.length - pattern.length; i++) {
      for (let j = 0; j < pattern.length; j++) {
        if (buffer[i + j] !== pattern[j]) {
          continue outer;
        }
      }
      return i;
    }
    return -1;
  }
}
