# Jurisprudência de Referência Legal — STJ REsp 2.205.708-PR

Este documento registra a decisão do Superior Tribunal de Justiça (STJ) que respalda legalmente a arquitetura de assinaturas eletrônicas avançadas (como a verificação por código OTP e trilha de custódia de rede) adotada pela plataforma Catraki.

---

## 1. Resumo da Decisão

O STJ decidiu, no **REsp 2.205.708-PR**, que as assinaturas eletrônicas não certificadas pela ICP-Brasil são **válidas e eficazes**, desde que seja possível comprovar a autoria e a integridade do documento eletrônico. A Corte reafirmou que o uso da ICP-Brasil é uma opção de segurança com presunção legal de autoria, e não uma obrigação exclusiva (em conformidade com o Art. 10, § 2º da MP 2.200-2/2001).

---

## 2. A Tese Fixada pelo STJ

> *"Assinaturas eletrônicas realizadas fora da ICP-Brasil são válidas e eficazes, desde que reconhecida a autenticidade e a integridade do documento."*

Isso significa que documentos de consentimento, autorizações escolares, contratos ou termos civis assinados eletronicamente por métodos alternativos e dotados de evidências digitais possuem plena eficácia jurídica.

---

## 3. Fundamentos Jurídicos e Doutrinários

1.  **MP 2.200-2/2001 (Art. 10, § 2º):** A utilização da ICP-Brasil é estritamente facultativa. Outros meios de comprovação de autoria e integridade são aceitos se as partes concordarem expressamente ou se a autenticidade puder ser confirmada de forma objetiva.
2.  **Código de Processo Civil (CPC - Art. 441 e 434):** Admite o uso e a juntada de documentos eletrônicos sob a condição de autenticidade verificável.
3.  **Princípio da Autonomia Privada:** Respeita a manifestação de vontade das partes em convencionar a utilização de plataformas eletrônicas privadas para manifestação de aceite.
4.  **Princípio da Instrumentalidade das Formas:** Prioriza-se o conteúdo e a manifestação da vontade sobre ritos formais arcaicos, preservando a eficiência e a segurança jurídica.

---

## 4. O Raciocínio da Corte sobre Evidências Digitais

O STJ destaca que, na ausência de certificado ICP-Brasil, a validade e a autoria do ato assinado eletronicamente devem ser verificadas através de:
*   **Trilhas de Auditoria Digital (Logs):** Registros contendo endereço IP do signatário, data e hora exatas do evento (carimbo do tempo/timestamp).
*   **Códigos de Autenticação (OTP):** Confirmações via e-mail ou SMS para atestar a autoria.
*   **Hash Criptográfico (SHA-256):** Resumo criptográfico que atesta que o documento não sofreu alteração pós-assinatura (integridade digital).

---

## 5. Alinhamento com a Plataforma Catraki

A plataforma Catraki foi projetada em estrita aderência a esse entendimento jurisprudencial:
*   **Autoria:** Verificada por meio de código eletrônico OTP de 6 dígitos enviado ao e-mail/celular verificado e dados do dispositivo (User-Agent/Canvas Fingerprint).
*   **Integridade:** Assegurada pela geração de hash SHA-256 exclusivo do manifesto, assinatura do bloco na cadeia hash (`log_row_hash`) e âncora na Árvore de Merkle.
*   **Temporalidade:** Carimbo do tempo sincronizado via Time Stamping Authority (TSA).
*   **Validador Público:** Canal que permite a terceiros auditar a trilha e o certificado de autenticidade a qualquer momento.

---

## 6. Documento Complementar e Parecer Técnico-Jurídico Completo

Para aprofundamento doutrinário e fundamentação detalhada conforme os padrões da ABNT, consulte o [Parecer Técnico-Jurídico sobre Assinaturas Eletrônicas e REsp 2.205.708-PR](file:///c:/Users/Cotrim/Projetos/Catraki---SESI/docs/parecer-juridico-assinaturas-eletronicas.md).

