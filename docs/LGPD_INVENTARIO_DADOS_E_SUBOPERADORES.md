# Inventário LGPD — Telas de Coleta, Direitos do Titular e Serviços Externos

**Versão da Política de Privacidade vigente:** `1.1.2026`  
**Atualização:** 16 de novembro de 2026  
**Prazo legal de resposta a pedidos de acesso/titulares:** até **15 dias** (LGPD Art. 19, II)

---

## 1. Telas que Solicitam Dados Pessoais e Suas Finalidades

| Rota / Tela | Componente | Dados Pessoais Solicitados | Finalidade Exibida na Tela | Aceite da Política (Data, Hora e Versão) |
| :--- | :--- | :--- | :--- | :--- |
| `/autorizar/:escola` (Etapa 2) | [Step2FormData.tsx](file:///c:/Users/mateus.cotrim/Projetos/Catraki%20-%20SESI/src/components/signer/Step2FormData.tsx) | Responsável: Nome, CPF, vínculo, telefone e e-mail. Estudante: Nome, nascimento, CPF, série, turma e turno. | Identificar o responsável e o estudante na escola, evitar autorizações duplicadas, enviar código OTP 2FA e PDF por e-mail, e permitir contato escolar. | Link para Política v`1.1.2026` exibido; aceite formal gravado na Etapa 3. |
| `/autorizar/:escola` (Etapa 3) | [Step3OtpAndSignature.tsx](file:///c:/Users/mateus.cotrim/Projetos/Catraki%20-%20SESI/src/components/signer/Step3OtpAndSignature.tsx) e [ConsentOptions.tsx](file:///c:/Users/mateus.cotrim/Projetos/Catraki%20-%20SESI/src/components/signer/ConsentOptions.tsx) | Código OTP (6 dígitos), assinatura manuscrita (PNG), opções de consentimento e metadados de dispositivo/IP/geolocalização. | Comprovar a autoria, integridade e manifestação inequívoca de vontade na assinatura eletrônica simples (Lei 14.063/2020 e MP 2.200-2/2001). | **Sim** — Checkbox obrigatório registra `privacy_policy_version`, `privacy_policy_accepted_at` (ISO-8601 UTC) em `documents` e no manifesto SHA-256. |
| `/revogar` | [RevocationPortal.tsx](file:///c:/Users/mateus.cotrim/Projetos/Catraki%20-%20SESI/src/components/revocation/RevocationPortal.tsx) | Protocolo/Token, CPF do responsável signatário, motivo da revogação, IP e User-Agent. | Validar a legitimidade do responsável signatário para revogar o consentimento e suspender novos atendimentos. | **Sim** — Checkbox obrigatório registra data, hora e versão `1.1.2026` no envio. |
| `/titular` (e `/lgpd`) | [TitularPortal.tsx](file:///c:/Users/mateus.cotrim/Projetos/Catraki%20-%20SESI/src/components/lgpd/TitularPortal.tsx) | Nome completo, CPF, e-mail, tipo de solicitação LGPD e detalhes. | Localizar registros vinculados ao titular e responder pedidos de acesso, retificação, exportação ou anonimização em até 15 dias. | **Sim** — Checkbox obrigatório grava `privacy_policy_version`, `privacy_policy_accepted_at` e `response_deadline_at` (+15 dias) em `lgpd_requests`. |
| `/validar/:codigo` | [PublicValidator.tsx](file:///c:/Users/mateus.cotrim/Projetos/Catraki%20-%20SESI/src/components/validator/PublicValidator.tsx) | Apenas código de validação ou hash SHA-256 (não coleta dados cadastrais; exibe dados minimizados/mascarados). | Conferência pública da autenticidade e integridade do comprovante assinado. | N/A (consulta pública sem coleta de dados pessoais do consulente). |
| `/admin` | [AdminLogin.tsx](file:///c:/Users/mateus.cotrim/Projetos/Catraki%20-%20SESI/src/components/admin/AdminLogin.tsx) | Nome, e-mail institucional Microsoft (`@sistemafibra.org.br` e domínios homologados), IP e User-Agent. | Controle de acesso RBAC para operadores/DPO e trilha de auditoria do Marco Civil (Art. 15) e LGPD. | Ciência exibida com link para Política v`1.1.2026`. |

---

## 2. Rotinas de Exportação e Anonimização (Direitos do Titular)

- **Implementação central:** [lgpd-titular.ts](file:///c:/Users/mateus.cotrim/Projetos/Catraki%20-%20SESI/functions/utils/lgpd-titular.ts)
- **Endpoints administrativos (RBAC `admin_master` e `dpo`):**
  - `POST /api/admin/lgpd/export` — Exporta em JSON estruturado todos os dados vinculados ao **CPF ou e-mail** (`documents`, `audit_logs`, `lgpd_requests`), descriptografando campos AES-GCM-256 e registrando `LGPD_DATA_EXPORT` em `admin_audit_logs`.
  - `POST /api/admin/lgpd/anonymize` — Anonimiza todos os dados pessoais identificáveis em `documents` e `lgpd_requests` vinculados ao **CPF ou e-mail**, **sem quebrar o histórico obrigatório**: preserva a integridade referencial e mantém intacta a Hash Chain criptográfica imutável em `audit_logs` (protegida pelos triggers `prevent_audit_update`, `prevent_audit_delete` e `prevent_document_delete`, conforme Art. 16, I da LGPD e Lei 14.063/2020). Registra `LGPD_DATA_ANONYMIZATION` em `admin_audit_logs`.
- **Painel DPO / Admin:** [AdminLgpdPanel.tsx](file:///c:/Users/mateus.cotrim/Projetos/Catraki%20-%20SESI/src/components/admin/AdminLgpdPanel.tsx) (aba **LGPD / Titulares** no `AdminDashboard`).

---

## 3. Serviços Externos que Recebem Dados Pessoais (Suboperadores)

| Serviço Externo | Provedor | O que Recebe | País / Região | Fora do Brasil? |
| :--- | :--- | :--- | :--- | :--- |
| **Cloudflare Pages, Workers, D1, KV e R2** | Cloudflare, Inc. | IP, User-Agent, geolocalização aproximada, dados cadastrais criptografados/mascarados (D1), tokens temporários (KV), PDFs assinados e manifestos (R2). | Estados Unidos / Rede Global Edge | **SIM — FORA DO BRASIL** |
| **Cloudflare Turnstile** | Cloudflare, Inc. | Token de desafio anti-bot, IP e sinais de navegador. | Estados Unidos / Rede Global Edge | **SIM — FORA DO BRASIL** |
| **Resend API** (`api.resend.com`) | Resend, Inc. | E-mail do responsável, nome do responsável, nome do estudante, escola, código OTP de 6 dígitos e PDF assinado em anexo. | Estados Unidos (AWS `us-east-1`) | **SIM — FORA DO BRASIL** |
| **MailChannels API** (`api.mailchannels.net`, fallback) | MailChannels Corp. | Somente em fallback se o Resend falhar: e-mail, nome do responsável, nome do estudante e conteúdo do e-mail transacional. | Estados Unidos / Canadá | **SIM — FORA DO BRASIL** |
| **Microsoft Entra ID & Graph** (`login.microsoftonline.com`, `graph.microsoft.com`) | Microsoft Corp. | Credenciais OAuth 2.0 PKCE de gestores/DPO; retorna nome e e-mail institucional (`/v1.0/me`). Não recebe dados de alunos/famílias. | Estados Unidos / Global | **SIM — FORA DO BRASIL** |
