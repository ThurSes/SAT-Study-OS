# SAT Study OS 1.0

Simplicidade primeiro, qualidade sempre. Uma aplicação, um monólito modular e um lançamento 1.0.
Implemente funcionalidades úteis; mantenha a aplicação funcional nas integrações relevantes.

## Como trabalhar
- Comece pelo pedido, pelo código afetado e por `context/STATE.md` quando precisar situar a tarefa.
- Inspecione Git e preserve mudanças existentes. Sem Git, informe e prepare-o quando útil.
- Consulte documentos por assunto; não releia todo o kit a cada tarefa.
- Para tarefa simples, bastam algumas frases no chat. Não crie plano, log ou checklist separado.
- Implemente na mesma raiz. Não crie app paralelo, reescrita geral ou versões alternativas.
- Reutilize componentes e funções existentes; acrescente dependências só com benefício concreto.
- Se faltar uma integração, continue partes independentes e descreva o que ficou pendente.
- Docker, Supabase CLI e PostgreSQL local não são pré-requisitos.

## Stack e responsabilidades
Next.js App Router, React, TypeScript strict, Tailwind CSS, shadcn/ui, Lucide e Supabase PostgreSQL.
Recharts, KaTeX e Motion entram quando a funcionalidade precisar. Vitest testa regras;
Playwright testa jornadas relevantes. Fixe versões compatíveis em um lockfile npm.
Regras educacionais ficam independentes da UI; autorização e correção ficam no servidor.
Dados de desenvolvimento são permitidos com identificação explícita e sem simular integração real.

## Agentes
Orchestrator é o principal: decide contratos, coordena e integra. Use `frontend`, `sat-engine`
ou `qa` somente se a especialização ou o paralelismo trouxer ganho real. Máximo três subagentes;
não criar outros papéis nem subdelegar. Tarefa pequena pode ser resolvida pelo principal.
Na delegação, indique objetivo, arquivos e aceite no chat. Um dono por arquivo, inclusive testes.
Agentes não revertem alterações alheias. Contratos compartilhados mudam pelo Orchestrator;
especialistas propõem antes de editar. QA revisa sem reescrever implementação por iniciativa própria.

## Consultar quando necessário
- Escopo e aceite: `docs/PRODUCT.md`.
- Estrutura, contratos e dados: `docs/ARCHITECTURE.md`.
- Visual, tokens e aprovação das duas telas: `docs/DESIGN_SYSTEM.md`.
- Questões, tempo, adaptação e revisão: `docs/SAT_ENGINE.md`.
- Testes proporcionais e segurança: `docs/QUALITY.md`.
- Decisões relevantes: `context/DECISIONS.md`; situação atual: `context/STATE.md`.

## Qualidade sem burocracia
Teste o comportamento alterado conforme o risco em QUALITY. Build completo em integrações
relevantes, não após cada ajuste de espaçamento. Banco, auth, respostas e correção exigem
verificações rigorosas. Nunca desabilite segurança ou apague testes para esconder falhas.
“Salvo” exige confirmação de persistência; nunca expor gabarito durante tentativa ativa.
Resultados oficiais, impressos e experimentais têm origens distintas. Não prometer nota oficial.
Não pedir aprovação repetida de escolhas já aceitas. Decisões estruturais novas e a proposta
visual seguem o START; implementação rotineira segue o escopo autorizado.
Use commits pequenos em pontos úteis. Atualize STATE só quando houver progresso, pendência
ou bloqueio relevante; DECISIONS apenas para decisões duráveis. Nenhum relatório extenso obrigatório.
Conclua com comportamento entregue, verificações feitas, limitação real e próximo passo, em poucas linhas.
