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

A biblioteca oferece aulas introdutórias para o mapa de habilidades; não é material oficial nem
uma promessa de domínio. O banco ainda tem apenas cinco questões RW. Simulador curto permanece
sem correção/adaptação automática e não gera resultado no histórico; use a prática individual para
correção e diário. A pausa é didática, sem equivalência às regras de uma aplicação oficial.
Não há reagendamento automático de revisão ou relatórios completos. Leituras pessoais
são limitadas a 500 registros recentes por área (até 2000 eventos de revisão); ainda não há paginação.

[Estado](context/STATE.md), [decisões](context/DECISIONS.md), [produto](docs/PRODUCT.md),
[arquitetura](docs/ARCHITECTURE.md), [visual](docs/DESIGN_SYSTEM.md),
[motor](docs/SAT_ENGINE.md) e [qualidade](docs/QUALITY.md).
