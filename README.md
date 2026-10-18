# SAT Study OS 1.0

Uma aplicação Next.js App Router, construída nesta raiz. A fundação inclui dashboard e uma
sessão curta experimental de Reading and Writing, com componentes definitivos e reutilizáveis.
A proposta visual foi aprovada; o modo escuro foi acrescentado aos mesmos componentes.

## Rodar localmente

Requer Node.js 24 LTS e npm. As versões exatas estão em package.json e package-lock.json.

```sh
npm ci
npm run dev
```

Abra http://127.0.0.1:3000 para o dashboard e http://127.0.0.1:3000/simulador para a sessão.
Não é necessário configurar variáveis, Docker, Supabase CLI, banco local ou serviços externos.
O servidor escuta somente no endereço local. Não houve publicação.

## O que funciona nesta etapa

- Dashboard responsivo com próxima atividade, agenda, habilidades/amostras, histórico por origem
  e meta separada de resultados. Agenda, métricas e histórico exibidos são dados sintéticos.
- Cinco questões originais de desenvolvimento, seleção de alternativa, navegação anterior/próxima,
  mapa e marcação para revisão. A seleção é preservada ao navegar dentro da sessão.
- Cronômetro local monotônico de cinco minutos, parametrizado no plano, com iniciar, pausar,
  retomar e reiniciar mediante confirmação. Prazo exato bloqueia edição; navegação continua livre.
- Controles por teclado, foco preservado, diálogo acessível, reduced-motion e reflow em 320 px.
- Tokens canônicos em src/app/globals.css; fontes Source Serif 4 e Inter empacotadas localmente
  via next/font. As licenças OFL acompanham os respectivos pacotes @fontsource-variable.

Respostas e marcações ficam **somente em memória**. Recarregar, sair da rota ou fechar a aba
perde a sessão; não há persistência de respostas, login, salvamento remoto, correção, nota ou adaptação real.
A pausa é demonstrativa. Esta sessão curta não equivale a uma aplicação oficial do SAT.

Fixtures são carregadas no servidor somente em NODE_ENV=development. Componentes recebem dados
e callbacks, sem importar fixtures ou banco. Contratos canônicos ficam em src/types/domain.ts;
regras puras de sessão ficam em src/lib/sat/session.ts. Nenhum gabarito integra esses contratos.

```sh
npm run build
npm start
```

Produção exibe um aviso de configuração; não apresenta exemplos como histórico real. Isso é
intencional enquanto conta e persistência não forem implementadas. Para avaliar as duas telas,
use npm run dev.

## Verificar

```sh
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Vitest cobre respostas, versões, marcações, estados e fronteiras do prazo com relógio injetado.
Playwright cobre a jornada integrada, teclado/foco, expiração acelerada, reload e layouts
320/360/768/1440. As capturas ficam em artifacts/screenshots, fora do Git.
E2E usa Microsoft Edge instalado. Sem Edge, instale Chromium com npx playwright install chromium
e remova channel: "msedge" do projeto em playwright.config.ts.

O lockfile mantém ESLint 9 para respeitar os peers dos plugins React/acessibilidade do Next.
O npm audit identifica cinco alertas transitivos de desenvolvimento na cadeia
eslint-config-next → fast-glob → micromatch → braces (GHSA-vfj7-8cjw-p6xm); a versão publicada
mais recente de braces ainda é afetada. Não foi aplicado downgrade do Next nem --force.
A auditoria de dependências de produção deve ser conferida com npm audit --omit=dev.

## Direção visual e próximos limites

Preservados os tokens do kit, espaçamento e Source Serif 4 + Inter. Os cabeçalhos das duas telas
oferecem alternância entre claro e escuro. A preferência inicial acompanha o sistema; a escolha
explícita é guardada em localStorage somente para o tema. Se o armazenamento estiver bloqueado,
a alternância ainda funciona na página atual. Respostas e marcações não usam esse armazenamento.
Foi avaliado o [loader de Nawsome no Uiverse](https://uiverse.io/Nawsome/brave-turtle-26), licença
MIT. Não foi incorporado: animação e gradiente sem ganho neste fluxo; loading usa texto de status.
Controles simples usam HTML nativo e botão/diálogo shadcn com Radix para o foco do diálogo.

Agentes reconhecidos: frontend, sat-engine e qa. O principal mantém contratos e integração;
a delegação usa arquivos exclusivos, sem subdelegação. next.config.ts desativa a geração automática
de instruções pelo Next para preservar AGENTS.md e fixa a raiz do Turbopack neste repositório.

[Estado atual](context/STATE.md), [decisões](context/DECISIONS.md), [produto](docs/PRODUCT.md),
[arquitetura](docs/ARCHITECTURE.md), [visual](docs/DESIGN_SYSTEM.md),
[motor](docs/SAT_ENGINE.md) e [qualidade](docs/QUALITY.md) permanecem as referências do projeto.
Os prompts START, TASK, REVIEW e RESUME continuam em prompts/.

Dashboard e simulador tiveram a proposta visual aprovada. Supabase hospedado, Auth/RLS, estudos
persistidos e expansão do motor pertencem às etapas futuras; nenhum serviço externo foi
configurado nesta entrega.
