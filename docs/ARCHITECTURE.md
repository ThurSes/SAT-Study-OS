# Uma aplicação, limites simples

Next.js App Router como monólito modular; Supabase Auth e PostgreSQL hospedados.
Server Components para leitura inicial; Client Components onde existe interação.
Server Actions ou Route Handlers autenticam e chamam a mesma regra quando necessário.
Não criar camadas de controller/service/repository para toda operação CRUD simples.

## Estrutura a criar conforme o uso

```text
src/app/                    rotas, layouts e adaptadores de entrada
src/components/             UI e composição reutilizável; ui/ para shadcn
src/features/               study, history, errors, questions, simulator, reports...
src/lib/sat/                regras puras e testes do motor
src/lib/supabase/           clientes browser/server e acesso ao banco
src/types/domain.ts         tipos canônicos de domínio, criados quando necessários
supabase/migrations/        SQL versionado aplicado ao projeto hospedado
```

Essa é uma direção, não uma ordem para gerar diretórios vazios. Dashboard compõe consultas e
componentes; não precisa de domínio próprio só para preencher pastas. Estado React atende a
interação local; não introduzir gerenciador global sem necessidade demonstrada.
UI não executa SQL nem importa gabarito. Regras educacionais não importam React ou Supabase.
Consultas podem ser funções pequenas; extrair abstração apenas quando duplicação real justificar.

## Contratos principais

Criar `src/types/domain.ts` durante a implementação, ampliando conforme a funcionalidade.
Não manter cópias de interfaces em cada tela. Validar entradas em runtime no servidor; tipagem
não valida dados recebidos. Tipos gerados do banco, se usados, ficam no adaptador e são mapeados.

| Contrato | Informação necessária |
|---|---|
| User/Profile | id Auth, nome, fuso, meta de pontuação e data-alvo opcional |
| Topic / Skill | domínio/seção, habilidade, descrição e IDs estáveis |
| StudyPlanItem / StudySession | dono, habilidade, data/status ou duração, recurso e notas |
| SkillProgress | dono/habilidade, dificuldade autodeclarada e estado de estudo |
| Question / QuestionOption | ID lógico + versão, seção/habilidade, formato, dificuldade editorial, enunciado, opções e proveniência |
| QuestionKey | versão, resposta e explicação; contrato somente do servidor |
| Answer | dono, sessão/módulo, versão da questão, valor ou branco, marcação, revisão e confirmação de gravação |
| PracticeSession / PracticeTest | filtro/lista de questões ou plano de módulos, parâmetros e versão da regra |
| TestAttempt / ModuleAttempt | dono, plano/seleção congelados, estado, prazo, caminho e revisão de concorrência |
| AssessmentResult | data, origem discriminada e nota reportada/estimada OU métrica experimental |
| ErrorRecord / ReviewEvent | resposta original, causa, reflexão, agenda e eventos de revisão |
| StudyRecommendation / MasteryEstimate | habilidade, razão, amostra, valor nullable, regra e data |

IDs UUID, timestamps UTC e datas civis explícitas. `null` indica ausência, nunca nota zero.
Questão publicada referenciada por tentativa é imutável: edição cria nova versão; seleção preserva
versão e ordem. Estados: tentativa created → in_progress → completed/abandoned; módulo
pending → active → submitted/expired. Sem reabrir módulo fechado ou concluir duas vezes.
O servidor rejeita transição inválida e só permite um módulo ativo por tentativa.

## Dados e autenticação na medida da função

Criar tabelas por necessidade: profiles, topics/skills, estudos/agenda, avaliações externas,
questões/versões/opções/gabaritos, sessões/tentativas/módulos/respostas e erros/revisões.
Recomendações/domínio podem ser calculados de dados existentes; não exigir tabela de cache,
cron ou evento distribuído. Aplicar migrations SQL ao Supabase hospedado pelo SQL Editor.
Versionar SQL antes da aplicação; anotar a última migration aplicada e ambiente em STATE.
Supabase CLI e tipos gerados são opcionais; não criar infraestrutura local por padrão.

Dados de desenvolvimento ficam em fixtures isoladas, identificadas na UI e acionadas apenas
em desenvolvimento. Quando a integração ficar pronta, os mesmos componentes recebem dados
reais; não manter uma segunda implementação nem publicar fixture como histórico de usuário.
Se credencial faltar, o servidor de desenvolvimento deve explicar a limitação sem impedir
trabalho em telas independentes. Produção não usa fixture como fallback silencioso.

Implementar Auth SSR com `@supabase/ssr`, clientes distintos por contexto e sessão validada no
servidor. user_id efetivo vem da sessão, não do corpo enviado pelo navegador. RLS nas tabelas
pessoais, USING e WITH CHECK de ownership e privilégios mínimos. Relações entre dados pessoais
validam também que pai e filho pertencem ao mesmo usuário, com FKs compostas ou validação
transacional equivalente. Catálogo de leitura não dá autorização de autoria ao aluno.

Gabaritos ficam sem SELECT de aluno em schema privado/tabela protegida; corrigir no servidor.
Chave administrativa não é atalho para ignorar autorização. Nenhuma resposta correta integra
HTML/payload de tentativa ativa. Funções SQL privilegiadas exigem checagem interna do dono e
search_path fixo, quando forem realmente necessárias.
Para salvamento/fechamento atômico, use constraints e uma função SQL/RPC pequena; não várias
escritas HTTP tratadas como transação. Protocolo concreto em `SAT_ENGINE.md`.

## Decisões e dependências

Orchestrator altera contratos compartilhados e integra; qualquer especialista pode sugerir melhoria.
Decisões estruturais novas voltam ao usuário, conforme START; implementação rotineira não.
Use npm e um lockfile. Confira engines/peers ao instalar; mantenha React/react-dom compatíveis
com Next, Tailwind v4 conforme shadcn e scripts ESLint separados do build. Não usar --force para
esconder conflito. Bibliotecas de gráficos/matemática entram só nas rotas que precisam.

Referências oficiais:
[Next](https://nextjs.org/docs/app/getting-started/installation),
[shadcn/Tailwind](https://ui.shadcn.com/docs/tailwind-v4),
[Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs) e
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
