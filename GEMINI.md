# Regras Globais e Automação do Projeto (Catraki - SESI)

## 1. Economia Extrema de Tokens (Caveman Mode)
- Siga estritamente as regras da skill `caveman` em todas as respostas.
- Elimine saudações, introduções, explicações óbvias, resumos finais e perguntas de acompanhamento ("Posso ajudar em mais algo?").
- Execute primeiro, explique apenas o estritamente necessário em frases curtas e diretas.
- Mantenha blocos de código, caminhos de arquivos e mensagens de erro 100% completos e intactos.

## 2. Boas Práticas e Padrões de Código (PT-BR)
- **Idioma do Código:** Escreva todas as variáveis, funções, classes, interfaces, comentários, mensagens de erro e logs estritamente em **Português do Brasil (pt-BR)** (ex: `buscarUsuarioPorId`, `validarAcessoCatraca`, `erroConexaoBanco`).
- **Clean Code e Modularidade:** Crie funções pequenas e coesas com responsabilidade única (SRP). Evite funções gigantes ou lógica duplicada (DRY).
- **Legibilidade e Tipagem:** Use nomes descritivos e sem abreviações obscuras. Mantenha tipagem forte e explícita sempre que aplicável.
- **Segurança e Tratamento de Erros:** Valide e sanitize todas as entradas externas (inputs, params, payloads). Nunca exponha chaves, tokens ou detalhes sensíveis nas respostas de erro.
- **Comentários Úteis:** Adicione comentários breves apenas para explicar o *porquê* de regras de negócio complexas, nunca para narrar o óbvio que o código já diz.

## 3. Fluxo de Engenharia e Planejamento (Superpowers)
- Antes de criar ou modificar qualquer arquivo, acione automaticamente o fluxo de planejamento e verificação da skill `superpowers`.
- Nunca gere código apressado sem mapear o impacto nos arquivos existentes.
- Valide tipagens, rotas e dependências antes de concluir a tarefa.

## 4. Memória Persistente (Antigravity-Mem)
- No início de cada sessão, consulte a memória do `antigravity-mem` para recuperar o contexto, arquitetura e decisões anteriores do projeto.
- Ao finalizar qualquer feature, correção de bug ou alteração estrutural, salve automaticamente um resumo técnico conciso na memória sem perguntar.

## 5. Execução Paralela e Leitura Cirúrgica (Swarm & Contexto)
- Para tarefas que envolvam múltiplos arquivos independentes (ex: frontend e backend simultaneamente), delegue subtarefas em paralelo usando o plugin `swarm`.
- Nunca leia arquivos inteiros desnecessariamente: busque apenas as funções, símbolos ou linhas específicas relevantes para a tarefa.
- Ignore completamente pastas pesadas (`node_modules`, `.git`, `dist`, `build`) e arquivos de lock (`package-lock.json`).
