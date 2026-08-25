# Plano de Resposta a Incidentes de Segurança da Informação e Privacidade
## Sistema de Assinatura Eletrônica SESI Saúde

**Data de Aprovação:** 19 de Agosto de 2026  
**Classificação:** Confidencial / Corporativo  
**Conformidade:** LGPD (Lei 13.709/2018 Art. 48), Resolução CD/ANPD nº 15/2024 e ISO/IEC 27035.

---

## 1. Comitê de Gestão de Crise e Resposta a Incidentes (CSIRT)

| Papel | Responsável | Atribuição Principal |
|---|---|---|
| **Incident Commander (Líder da Crise)** | Gerente de Segurança da Informação (CISO) | Coordenação geral, tomada de decisões de contenção e isolamento. |
| **Encarregado pelo Tratamento de Dados (DPO)** | Comitê de Privacidade Catraki (`dpo@catraki.com.br`) | Avaliação de riscos aos titulares, comunicação com a ANPD e órgãos reguladores. |
| **Líder Técnico / AppSec** | Arquiteto de Software & Engenharia Cloud | Análise forense, aplicação de patches, rotação de chaves e restauração de dados. |
| **Representante Jurídico / Médico** | Assessoria Jurídica e Diretoria de Saúde SESI | Validação de impactos em procedimentos médicos em andamento. |

---

## 2. Níveis de Severidade de Incidentes

- **SEV-1 (Crítico):** Vazamento de chaves mestras de criptografia (`ENCRYPTION_KEY_V1`), quebra na cadeia de integridade (`audit_logs`), ou acesso não autorizado em massa ao banco D1/R2.
- **SEV-2 (Alto):** Comprometimento de conta administrativa com perfil `admin_master`, ou indisponibilidade crítica do validador de autenticidade durante horário de procedimentos médicos.
- **SEV-3 (Médio):** Falhas consecutivas no serviço de envio de OTP ou tentativas isoladas de brute force bloqueadas pelo rate limiting.
- **SEV-4 (Baixo):** Anomalias de telemetria sem impacto na confidencialidade ou integridade dos dados.

---

## 3. Playbooks Operacionais de Resposta

### 🚨 Playbook A: Suspeita de Vazamento da Base D1 (SQLite)

1. **Identificação & Isolamento (0–30 min):**
   - Verificar logs de acesso e métricas Cloudflare Logpush.
   - Restringir temporariamente a rotação de tokens de acesso de novos documentos.
2. **Análise de Impacto (30–60 min):**
   - Avaliar os campos exportados. Como os dados sensíveis (CPF, e-mail, telefone, rubrica) são armazenados sob criptografia **AES-GCM-256 com chaves segregadas**, confirmar se as chaves mestras permaneceram seguras nos Secrets da Cloudflare.
3. **Comunicação e Mitigação (Até 48h):**
   - Caso confirmada a exfiltração indevida com risco relevante aos titulares, o DPO notificará a **ANPD** e os representantes legais afetados nos termos do **Art. 48 da LGPD**.

---

### 🔑 Playbook B: Comprometimento de Chave de Criptografia Mestra

1. **Revogação e Ativação de Nova Chave (`key_version`):**
   - Gerar imediatamente nova chave segura de 256 bits via CSPRNG.
   - Definir `ENCRYPTION_KEY_V2` via comando Cloudflare Secrets:
     ```bash
     wrangler secret put ENCRYPTION_KEY_V2
     ```
   - Atualizar a variável de ambiente `DEFAULT_KEY_VERSION = "2"` no `wrangler.toml` e realizar o deploy do Worker.
2. **Re-criptografia Gradual do Acervo Histórico:**
   - Executar job assíncrono que lê registros com `key_version = 1`, decripta com `ENCRYPTION_KEY_V1` e re-encripta com `ENCRYPTION_KEY_V2`, gravando `key_version = 2` de forma controlada sem interromper o serviço.
3. **Desativação da Chave Comprometida:**
   - Após a migração completa, excluir o segredo `ENCRYPTION_KEY_V1`.

---

### 🛡️ Playbook C: Comprometimento de Conta Administrativa

1. **Invalidação Imediata de Sessões:**
   - Rotacionar o segredo `JWT_ADMIN_SECRET` no Cloudflare Secrets para invalidar instantaneamente todos os tokens JWT ativos.
   - Desativar a conta afetada no banco D1 (`UPDATE admin_users SET is_active = 0 WHERE id = ?`).
2. **Auditoria de Ações:**
   - Consultar a tabela `admin_audit_logs` para rastrear todos os termos emitidos ou revisões manuais aprovadas pelo usuário comprometido no período suspeito.
   - Reverter termos emitidos fraudulentamente alterando o status para `revoked` e comunicando a equipe médica responsável.

---

### 🔗 Playbook D: Quebra da Cadeia de Auditoria Criptográfica (*Hash Chain Tampering*)

1. **Detecção:**
   - A rotina de verificação `/admin/verify-chain` aponta `isValid = false` com indicação do `corruptedBlockIndex`.
2. **Contenção:**
   - Congelar novos cadastros para análise de causa raiz.
   - Comparar os registros do banco D1 com as cópias JSON imutáveis armazenadas no bucket **Cloudflare R2 (WORM com Object Lock)**.
3. **Restauração e Evidência:**
   - Como os triggers físicos SQLite impedem `UPDATE`/`DELETE` em condições normais de aplicação, a quebra indica adulteração direta em nível de infraestrutura ou corrupção de storage.
   - Restaurar a trilha a partir do manifesto R2 e documentar o relatório forense.

---

## 4. Comunicação Regulatória (ANPD) e Notificação aos Pais

Conforme a Resolução CD/ANPD nº 15/2024, qualquer incidente envolvendo **dados sensíveis de saúde de crianças e adolescentes** será objeto de comunicação à Autoridade Nacional de Proteção de Dados contendo:
- Natureza dos dados afetados;
- Informações sobre os titulares (menores representados);
- Medidas de segurança e mitigação adotadas (ex: criptografia de dados em repouso);
- Riscos e medidas de proteção disponíveis aos responsáveis legais.
