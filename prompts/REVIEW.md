# Revisar uma mudança

Revise a funcionalidade, os arquivos ou o diff que eu indicar no SAT Study OS 1.0.
Sem indicação, revise as mudanças atuais do Git. Se não houver diff, informe isso e solicite
o alvo; não faça auditoria do projeto inteiro por padrão.

Leia `AGENTS.md`, a mudança e `docs/QUALITY.md`. Consulte contratos/código e, conforme o assunto,
`docs/ARCHITECTURE.md`, `docs/SAT_ENGINE.md` ou `docs/DESIGN_SYSTEM.md`.
Use PRODUCT somente se houver dúvida de escopo. Não releia o kit inteiro.

Priorize bugs, autorização, segurança dos dados, contratos e regressões. Em UI, verifique
semântica, foco, responsividade e conformidade visual; em consultas/bundle, performance quando
houver impacto plausível. Em regras centrais, teste fronteiras relevantes; em auth/persistência,
confira integração real e limitações de ambiente. Não exija banco para revisar espaçamento.

O QA pode fazer revisão independente se trouxer benefício; não convocar três agentes por rotina.
Revise sem editar implementação ou testes. Primeiro identifique problemas com evidência;
correções serão uma tarefa separada quando eu ou o Orchestrator as autorizar.
Não execute ação destrutiva em dados reais para reproduzir um defeito.

Relate somente problemas acionáveis: severidade P0/P1/P2/P3 conforme QUALITY, arquivo/linha,
reprodução ou condição concreta, impacto e recomendação curta. Diferencie teste executado de
análise estática. Liste do mais grave ao menos grave, sem comentários triviais de estilo.
Se não houver achados, diga isso e resuma verificações/limites. Não afirme conformidade total
por ter passado um lint ou revisão sem execução. Não crie relatório extenso em arquivo.
