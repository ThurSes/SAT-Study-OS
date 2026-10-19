# Começar o SAT Study OS

Atue como Orchestrator desta aplicação 1.0. Meu objetivo é construir o produto descrito neste kit.
Leia `AGENTS.md`, `context/STATE.md`, `docs/PRODUCT.md` e `docs/ARCHITECTURE.md` uma vez para
se situar. Leia `docs/DESIGN_SYSTEM.md` antes da proposta visual; consulte `docs/SAT_ENGINE.md`
e `docs/QUALITY.md` apenas quando a tarefa tocar nesses assuntos. Não leia tudo repetidamente.

Inspecione arquivos, Git e mudanças existentes, Node/npm e o cliente Codex. Confira as versões
compatíveis das dependências antes de instalar. Verifique os três papéis de `.codex/agents/`
e a configuração; se indisponíveis, siga com o principal sem inventar flags ou novos agentes.
Não exija Docker, Supabase CLI, banco local, CI ou catálogo grande para começar.

Proponha em até dez linhas uma sequência orientada por dependências e o primeiro conjunto de
funcionalidades. Padrão: fundação mínima e telas representativas de dashboard/simulador, depois
estudos e persistência real conforme acesso ao Supabase hospedado. Ajuste à situação encontrada.
Mostre somente decisões estruturais que precisem da minha aprovação: arquitetura diferente,
mudança de escopo ou compromisso externo relevante. Se o conjunto inicial ainda não foi
autorizado, peça uma única aprovação dele; se já autorizei, prossiga sem repetir a pergunta.
Não peça confirmação de cada diretório, componente ou rotina já prevista pelo kit.

Após essa aprovação, construa a base nesta raiz, preservando documentos e usando uma aplicação
Next App Router. Escolha uma implementação simples, contratos únicos e scripts suficientes para
iniciar, verificar tipos e lint. Acrescente ferramentas de teste ao primeiro uso real.
Crie os componentes reais e as duas telas visuais representativas, com dados de desenvolvimento
identificados. Mostre preview/capturas em desktop e mobile e solicite minha aprovação visual
antes de expandir o design completo. Preserve esses componentes no produto. Enquanto aguarda,
pode avançar regras puras ou tarefas independentes já autorizadas.

Depois da aprovação visual, continue o conjunto de funcionalidades autorizado, usando TASK como
procedimento reutilizável. Delegue só se houver ganho; defina arquivos sem sobreposição e
integre pelo principal. Falta de credenciais bloqueia integração real, não trabalho independente.
Não apresente fixtures como salvamento ou login funcionando. Não publique nem contrate serviço.

Verifique cada entrega conforme QUALITY, mantenha a aplicação inicializável e registre em STATE
apenas avanço, evidência essencial, bloqueio e próximo passo relevantes. DECISIONS só para
decisão durável. Ao concluir, explique em poucas linhas o que funciona, como rodar, o que foi
testado e o que ainda depende de configuração ou aprovação. Não termine só com planejamento
quando a implementação correspondente já estiver autorizada.
