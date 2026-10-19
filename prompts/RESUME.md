# Retomar sem recomeçar

Retome o SAT Study OS 1.0 preservando a arquitetura e o trabalho existente.
Leia `AGENTS.md` e `context/STATE.md`. Consulte `context/DECISIONS.md` apenas para esclarecer
uma decisão afetada. Inspecione status/branch/log/diff do Git, incluindo arquivos não rastreados,
e compare o estado registrado com o código real. Sem Git, use arquivos existentes e informe o limite.

Identifique a última funcionalidade verificada, trabalho incompleto, aprovação visual pendente,
acesso externo que falta e alterações que pertencem ao usuário. Se havia agentes, verifique
se ainda estão trabalhando antes de editar os mesmos arquivos; não duplique tarefas.
O histórico do chat não prova que um teste foi executado; use evidência disponível ou refaça
a menor verificação necessária. Não rode auditoria completa só porque a conversa é nova.

Resuma situação e próxima ação em até oito linhas. Continue a menor tarefa incompleta já
autorizada usando `prompts/TASK.md` e consulte só o documento dela. Se a única parte bloqueada
depender de Supabase/credenciais, avance trabalho independente autorizado. Se realmente faltar
decisão obrigatória ou aprovação visual, faça uma pergunta concreta e preserve o estado.

Não replaneje todo o produto, reinstale tudo, recrie o banco ou reescreva o app para começar
uma nova sessão. Atualize STATE quando corrigir uma divergência ou concluir avanço relevante.
Ao finalizar, informe comportamento recuperado/entregue, verificação e próxima ação de forma curta.
