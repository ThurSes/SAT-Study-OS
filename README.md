# SAT Study OS — starter enxuto para 1.0

Este pacote prepara o desenvolvimento. Contém 18 arquivos de orientação e configuração,
sem site, dependências instaladas, banco criado ou código de aplicação.
Uma única aplicação será construída gradualmente na pasta `sat-study-os`.

## Começar

1. Extraia `sat-study-os-starter-clean.zip` em uma pasta de trabalho nova. Abra a pasta interna
   `sat-study-os`; confirme que `AGENTS.md` e `.codex` estão na raiz. Não sobreponha um app existente.
2. No VS Code, use **Arquivo → Abrir Pasta**, selecione essa pasta e abra a extensão oficial
   **Codex, da OpenAI**. Entre com sua conta e escolha trabalhar localmente.
3. Leia o AGENTS e confira estes arquivos antes de confiar no projeto quando o cliente perguntar.
4. No chat do Codex, envie: **Leia e execute `prompts/START.md`.** Também pode copiar o conteúdo
   inteiro do arquivo para o chat. Ele examinará o ambiente e trará uma sequência curta de trabalho.
5. Aprove as decisões estruturais relevantes solicitadas. As escolhas deste kit são a proposta
   padrão; não é preciso aprovar cada biblioteca, tabela ou arquivo. Depois ele constrói a base e
   mostra dashboard e simulador representativos para aprovação visual, na própria aplicação.
6. Após avaliar as duas telas, envie os ajustes ou aprove e autorize continuar. O trabalho segue
   por funcionalidades e dependências, sem uma sequência obrigatória de checkpoints numerados.

Para o CLI já instalado, abra um terminal nessa pasta e execute `codex`; envie o mesmo START.
No app desktop do ChatGPT, selecione Codex, trabalho local e esta pasta como projeto principal;
envie o mesmo prompt. Abrir no VS Code é opcional nesse caminho.
Enquanto não houver package.json, não existe comando npm para iniciar o site. O START criará
os scripts e atualizará aqui as instruções de execução. Para implementar, tenha Node LTS
suportado pelas dependências selecionadas, npm e Git; confira versões ao iniciar.

## Os quatro prompts

| Necessidade | Como pedir no chat |
|---|---|
| Começar | Leia e execute `prompts/START.md`. |
| Implementar | Use `prompts/TASK.md`. Tarefa: registrar e listar resultados de simulados externos por origem. Aceite: salvar, recarregar e filtrar por origem. |
| Revisar | Use `prompts/REVIEW.md` para revisar o diff atual, com foco em salvamento de respostas. |
| Retomar | Leia e execute `prompts/RESUME.md`; continue o trabalho pendente. |

TASK recebe sua tarefa em linguagem natural; REVIEW recebe arquivos, funcionalidade ou diff.
Não há campos obrigatórios para preencher nem necessidade de produzir um plano em arquivo.
Uma autorização para implementar um conjunto de funções permite continuar esse conjunto; o agente
não deve pedir “posso continuar?” após cada etapa rotineira.

## Supabase hospedado, sem Docker

Comece a interface com fixtures identificadas como **dados de desenvolvimento**, na mesma app.
Quando chegar à persistência, crie ou selecione um projeto Supabase hospedado de desenvolvimento
e configure `.env.local` fora do Git: `NEXT_PUBLIC_SUPABASE_URL` e
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Uma chave pública não substitui as políticas RLS.
Configure URLs de redirecionamento Auth para o endereço local e, depois, para o host escolhido.
Chaves secretas/administrativas, se necessárias, ficam somente no servidor e fora do chat.

O Codex prepara SQL versionado em `supabase/migrations/`; aplique no SQL Editor do projeto
correto e registre brevemente no STATE o que foi aplicado. Dashboard e SDK permitem desenvolver
e verificar o banco remoto: Supabase CLI, PostgreSQL local e Docker Desktop não são necessários.
Use duas contas de teste sem dados reais para verificar isolamento. Sem acesso ao banco, marque
a integração pendente e continue UI/domínio independentes; não afirme que o banco foi testado.

## Codex: configuração conferida em 18/10/2026

O CLI e a extensão compartilham as camadas de configuração. Este kit limita subagentes por
`[agents].max_concurrent_threads_per_session = 3`, excluindo o principal. Os arquivos autônomos
em `.codex/agents/` declaram `name`, `description` e `developer_instructions`. Modelos são herdados.
Não há parâmetros de Agents API/SDK, chaves de aprovação ou permissões ampliadas neste kit.
Fontes: [subagentes](https://learn.chatgpt.com/docs/agent-configuration/subagents),
[configuração](https://learn.chatgpt.com/docs/config-file/config-basic) e
[configuração da extensão](https://learn.chatgpt.com/docs/ide/settings).

`AGENTS.md` é descoberto como instrução do repositório; a configuração de projeto depende de
confiança e políticas do ambiente. `docs`, `context` e `prompts` são convenções lidas sob demanda.
Fonte: [instruções AGENTS](https://learn.chatgpt.com/docs/agent-configuration/agents-md).
Reinicie a sessão após mudar configuração. Confira a versão do CLI com `codex --version`;
a extensão pode usar uma versão própria. Não há promessa de uma versão mínima universal.

No primeiro uso, peça que o Codex confirme a configuração carregada e os papéis disponíveis.
Se uma versão antiga rejeitar a chave, preserve o arquivo e retire temporariamente o bloco
`[agents]` do config; não substitua por uma chave imaginada. Se não descobrir agentes, o principal
pode ler as instruções dos três TOML e trabalhar sequencialmente. Registre a limitação sem
bloquear desenvolvimento ou afirmar que houve revisão independente. Atualizar o cliente é opção.

## O que mudou em relação ao ZIP anterior

Preservados: monólito modular, TypeScript strict, Supabase, proteção por usuário, questões
versionadas, honestidade das métricas, Source Serif 4 + Inter e visual editorial.
Eliminados: estrutura de 59 arquivos, 13 prompts extensos, sequência rígida C01–C11,
logs repetitivos, catálogo grande como pré-requisito e exigência de banco local para começar.
Agora há cinco documentos temáticos, quatro prompts e dois arquivos curtos de contexto.
Testes acompanham o risco da função; dependência externa pendente não bloqueia tudo.

## Verificação deste pacote e decisões posteriores

O pacote é documental: TOML, referências, estrutura e conteúdo são verificados na entrega;
isso não equivale a executar os agentes dentro da sua instalação nem testar um app inexistente.
Verificado em 18/10/2026: 18 arquivos não vazios, quatro TOML válidos, quatro prompts,
36 referências internas completas e 11 pares de contraste. AGENTS tem 49 linhas.
O ZIP foi conferido por integridade e comparação de todas as entradas com os arquivos originais.
Confirmar depois: versões exatas e lockfile, descoberta dos agentes, projeto/região Supabase,
variáveis de ambiente, redirects/e-mail de Auth, catálogo revisado e hospedagem/orçamento.
O SQL inicial será criado somente quando a funcionalidade precisar; não existe schema implantado.
Deploy público e serviços pagos dependem de autorização. Nenhum segredo precisa entrar no chat.

Referência de integração sem banco local:
[Supabase + Next.js](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs).
