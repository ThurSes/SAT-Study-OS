# Estado atual

- Existe: aplicação única Next 16.4.2/React 19.3.1, TypeScript strict, Tailwind 4, componentes
  shadcn/Radix, fontes locais e tokens do kit; contratos canônicos antes das telas, npm lockfile e Git.
- Funciona em desenvolvimento: dashboard representativo e /simulador com cinco questões originais,
  seleção, navegação/mapa, revisão e cronômetro monotônico de cinco minutos com pausa/retomada/reset.
  Reinício confirma descarte, prazo bloqueia edição e teclado preserva foco. Sem gabaritos no cliente.
- Dados: fixtures de servidor apenas em desenvolvimento; respostas em memória, perdidas ao
  recarregar/sair. Sem auth, persistência, correção ou adaptação real. Produção mostra aviso explícito.
- Aprovações: estrutura e conjunto inicial aprovados em 18/10/2026. Avaliação visual das duas telas
  pendente; não expandir interface antes dela. Nenhum serviço externo ou Docker configurado.
- Verificado: npm ci --offline reproduziu o lockfile; typecheck, lint sem avisos, 18 casos Vitest
  e quatro jornadas Playwright/Edge passaram;
  layouts 320/360/768/1440, zoom CSS 200%, teclado/foco, reduced-motion, expiração acelerada e
  reload cobertos. Build e smoke HTTP de ambas as rotas em produção passaram, sem fixtures.
  Capturas desktop/mobile inspecionadas em artifacts/screenshots (fora do Git).
- Dependências: sem peers inválidos e audit de produção sem vulnerabilidades. Cinco alertas high
  transitivos apenas de lint (braces via eslint-config-next), sem patch publicado; ver README.
- Agentes: frontend e sat-engine entregaram arquivos independentes; qa revisou sem editar.
  Fontes e foco apontados na revisão foram corrigidos. Nenhuma reserva de arquivo ativa.
- Próxima ação: apresentar preview local e capturas para avaliação visual; depois seguir somente
  o escopo autorizado. Supabase/Auth/RLS e persistência pertencem à etapa futura.
