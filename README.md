# SAT Study OS 1.0

Uma aplicação Next.js App Router nesta raiz, com dashboard, agenda, conteúdos, questões,
diário de erros, avaliações externas e sessão curta experimental. Source Serif 4 + Inter,
tokens do kit e temas claro/escuro nos mesmos componentes.

## Executar

Node.js 24 LTS recomendado (mínimo 22 para o SDK Supabase) e npm.

```sh
npm ci
npm run dev
```

Abra http://127.0.0.1:3000. Sem Docker, Supabase CLI ou PostgreSQL local.
O servidor de desenvolvimento escuta somente no endereço local.

## Conectar o Supabase hospedado

1. Copie `.env.example` para `.env.local` e preencha a URL, a chave **publicável** e a URL da
   aplicação. `.env.local` é ignorado pelo Git. Não use `service_role` ou chave secreta.
2. No SQL Editor do projeto, execute uma vez, em ordem, os três arquivos de
   `supabase/migrations/`. Eles criam apenas as tabelas desta aplicação, RLS e funções.
3. Execute `supabase/tests/ownership.sql`: testa A/B/anônimo, gabaritos privados, tentativas
   imutáveis, retry e prazo do simulador. Todos os usuários/dados sintéticos são revertidos.
4. Em Authentication → URL Configuration, use Site URL `http://127.0.0.1:3000` e Redirect URL
   `http://127.0.0.1:3000/auth/callback**`. Em hospedagem, ajuste para o domínio real e HTTPS.
5. Abra `/login`, crie uma conta, confirme o e-mail quando solicitado e entre. O serviço de
   e-mail e seus limites seguem a configuração do projeto Supabase.

A sessão é validada no servidor, renovada por Proxy e transmitida por cookies. O dono de cada
mutação vem da sessão; RLS aplica o mesmo isolamento no acesso direto à API. Gabaritos ficam
no schema privado, sem leitura de aluno. A correção e a criação do erro ocorrem em uma RPC
atômica com UUID idempotente. Nenhuma chave administrativa é necessária na aplicação.

[SSR oficial](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
[Auth por senha](https://supabase.com/docs/guides/auth/passwords) e
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Publicar na Vercel

O arquivo `.env.local` não vai para o GitHub. No projeto Vercel, abra Settings → Environment
Variables e cadastre `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` com
os mesmos valores locais. Cadastre `NEXT_PUBLIC_SITE_URL` com a origem pública HTTPS do site
(sem caminho), por exemplo `https://sat-study-os-one.vercel.app`. Selecione Production e,
se necessário, Preview; previews precisam de origem e allow list próprias para o callback.
Os valores de `.env.example` são uma referência, não são carregados na hospedagem.

Em Supabase → Authentication → URL Configuration, configure Site URL com a origem pública
e adicione as URLs de retorno exatas: `https://sat-study-os-one.vercel.app/auth/callback`
e `https://sat-study-os-one.vercel.app/auth/callback?next=/recuperar`. Preserve a URL local
na lista se continuar desenvolvendo. Não use um wildcard que autorize todos os projetos Vercel.

Após alterar variáveis na Vercel, faça Redeploy em Deployments: variáveis `NEXT_PUBLIC_*`
também são incorporadas no build. Verifique que `/` redireciona para `/login`, que o formulário
está habilitado e que login, salvamento e retorno de confirmação/recuperação funcionam no domínio
publicado. Sem Site URL explícita, o código usa o domínio da implantação fornecido pela Vercel;
em produção não há fallback automático para localhost. Nenhuma chave administrativa é necessária.

[Variáveis da Vercel](https://vercel.com/docs/environment-variables),
[URLs de retorno do Supabase](https://supabase.com/docs/guides/auth/redirect-urls).

## Funcionalidades

- `/`: agenda real do dia, próxima atividade, histórico e amostra das últimas tentativas.
  Conta nova começa vazia; não recebe resultados ou meta inventados.
- `/estudos`: atividades, agenda, status, dificuldade pessoal, duração, recurso e notas.
- `/conteudos`: leitura pública de 32 aulas originais (11 RW/21 Math), oito domínios, objetivos,
  explicações, exemplos resolvidos e armadilhas. Conta autenticada salva notas e conclusão.
- `/questoes`: cinco questões RW originais, filtros e prática individual corrigida no servidor.
  Após errar, classifique interpretação, conteúdo ou falta de atenção e salve uma reflexão.
- `/erros`: resposta original preservada, explicação, causa/reflexão e eventos de revisão.
- `/historico`: avaliações por origem e período; resultados oficiais autodeclarados e estimativas
  impressas continuam separados de métricas experimentais. Notas externas validam 200–800/seção.
- `/simulador`: cinco minutos, alternativas, navegação, mapa e marcações. Conta autenticada
  preserva respostas e cronômetro. Prazo do banco é a autoridade; a UI usa relógio monotônico.
  Escritas usam revisão de concorrência e retry idempotente. Conflito entre abas pede recarregar.
- `/login` e `/recuperar`: cadastro, entrada, saída, confirmação e recuperação de senha.

Os componentes recebem dados e callbacks. Só exibem confirmação de salvamento após resposta
positiva do servidor; falhas preservam os campos. Tema usa localStorage; estudos não usam
persistência alternativa no navegador.

Sem configuração Supabase, desenvolvimento mantém exemplos identificados, sem salvamento,
em vez de simular integração. Produção mostra aviso nas áreas pessoais; conteúdos permanecem
públicos. Catálogo original de questões é compartilhado entre os mesmos componentes.

## Verificações

```sh
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
npm start
```

Vitest cobre sessão/prazo, avaliações, cobertura das aulas e validação de entradas/redirecionamentos.
Playwright/Edge cobre as jornadas de desenvolvimento e a leitura/login, teclado/foco e reflow
320/360/768/1440 nos dois temas. Capturas ficam em `artifacts/screenshots`, fora do Git.
As jornadas demonstrativas exigem servidor **sem** as variáveis Supabase; com projeto configurado,
execute `npm run test:e2e -- tests/content-auth.spec.ts` para os fluxos públicos. Persistência/Auth/RLS
exigem também verificações reais no projeto hospedado; mocks não comprovam a conexão.

O lockfile mantém ESLint 9 para respeitar os peers do Next. Há cinco alertas high transitivos
somente de lint (`braces` via `eslint-config-next`), sem patch publicado na última verificação.
Confira dependências de produção com `npm audit --omit=dev`; não use `--force` para esconder conflitos.

## Limites atuais

O simulado adaptativo está em `/simulador`, com quatro módulos, intervalo, prazos contínuos
no servidor, seleção de caminho por seção e relatório experimental de 90 itens pontuados.
O início exige conteúdo revisado suficiente para os dois caminhos. O banco pessoal importado
tem 224 questões revisadas dos testes #4 e #5; as extrações dos demais PDFs ainda não estão
liberadas. O treino curto anterior continua em `/simulador/treino`.

Para validar a interface em desenvolvimento, use `/dev/exam-preview` e
`npx playwright test tests/exam-ui.spec.ts`. Esse preview usa dados sintéticos, não comprova
persistência real e não fica disponível em produção. Os testes transacionais hospedados estão
em `supabase/tests/adaptive_exam.sql`; usam fixtures revertidas por rollback.
`exam_minimum_stock.sql` verifica o estoque mínimo exato; `exam_media.sql` cobre a mídia
privada com A/B/anônimo. O teste HTTP real em `scripts/test_sat_http.mjs` usa apenas contas
sintéticas confirmadas e dados clonados para elas: `init` gera SQL/credenciais no diretório
ignorado, `start higher lower` escolhe a combinação esperada, `stage`/`finish` verificam
transições e resultado. O desenvolvedor ajusta o relógio somente da tentativa sintética por
SQL. Ao terminar, executar `logout`, aplicar o `cleanup.sql` guardado e apagar os arquivos
locais com credenciais. Nunca executar essa jornada na conta pessoal.

### Importação privada

Os PDFs, recortes, gabaritos e decisões de revisão ficam em `artifacts/private-sat`, ignorado
pelo Git. Execute os scripts com Python e pdfplumber/pypdf/pypdfium2/Pillow instalados:

```powershell
python scripts/import_sat_pdfs.py inventory --source ../SAT
python scripts/import_sat_pdfs.py extract --source ../SAT --tests 4 --render
python scripts/attach_sat_keys.py --tests 4
python scripts/review_sat_import.py sheets --tests 4 --section rw --limit 12
python scripts/review_sat_import.py approve --decisions artifacts/private-sat/decisions.json
python scripts/review_sat_import.py export --owner <UUID>
python scripts/prepare_sat_load.py --owner <UUID> --decisions decisions-rw4.json decisions-rw5.json decisions-math4.json decisions-math-principal.json
python scripts/test_sat_import.py
```

Repita a extração por teste para retomar trabalhos interrompidos. `attach_sat_keys` exige
`references/key-N.json` com URL oficial e quatro tabelas completas; recusa chaves conflitantes
e preserva itens revisados. A associação não verifica a edição nem aprova a questão.
Decisões exigem inspeção visual, resposta, explicação, taxonomia, dificuldade, edição e
acessibilidade. O exportador valida o digest revisado e gera arquivos privados de carga;
não publica no banco automaticamente. Nunca copie esses arquivos para `public` ou para o Git.
`prepare_sat_load` revalida as decisões, hashes e figuras antes de gerar lotes SQL privados e
imutáveis em `artifacts/private-sat/load`. Aplique os lotes com a conexão de desenvolvedor,
começando pelas figuras; uma versão existente com conteúdo diferente faz a carga falhar.
Figuras deste lote ficam em `sat_private.exam_assets`, limitadas a 2 MB, e são servidas pela
rota autenticada `/api/exam-assets`; o navegador nunca recebe chave administrativa.

O gabarito online atual do teste #4 corresponde a outra edição. As respostas publicadas
foram resolvidas independentemente a partir do PDF local; essa verificação e a referência
substituída ficam no registro privado da revisão. Não aprove conteúdo apenas pelo número
do teste ou por uma tabela de respostas que ainda não foi comparada com a edição local.

A biblioteca oferece aulas introdutórias para o mapa de habilidades; não é material oficial nem
uma promessa de domínio. A prática individual compartilhada tem cinco questões RW. O treino curto permanece
sem correção/adaptação automática e não gera resultado no histórico; use a prática individual para
correção e diário. A pausa é didática, sem equivalência às regras de uma aplicação oficial.
Não há reagendamento automático de revisão. Leituras pessoais
são limitadas a 500 registros recentes por área (até 2000 eventos de revisão); ainda não há paginação.

[Estado](context/STATE.md), [decisões](context/DECISIONS.md), [produto](docs/PRODUCT.md),
[arquitetura](docs/ARCHITECTURE.md), [visual](docs/DESIGN_SYSTEM.md),
[motor](docs/SAT_ENGINE.md) e [qualidade](docs/QUALITY.md).
