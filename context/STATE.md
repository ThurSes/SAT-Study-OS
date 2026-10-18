# Estado atual

- Existe: aplicação única Next 16.4.2/React 19.3.1, TypeScript strict, Tailwind 4, componentes
  shadcn/Radix, fontes locais e tokens do kit; contratos canônicos antes das telas, npm lockfile e Git.
- Funciona em desenvolvimento: dashboard representativo e /simulador com cinco questões originais,
  seleção, navegação/mapa, revisão e cronômetro monotônico de cinco minutos com pausa/retomada/reset.
  Reinício confirma descarte, prazo bloqueia edição e teclado preserva foco. Sem gabaritos no cliente.
  Temas claro/escuro nos mesmos componentes; botão no cabeçalho de ambas as telas, preferência
  inicial do sistema e escolha explícita persistida somente para o tema. Sem novas dependências.
- Interface expandida: /estudos (agenda, filtros, atividades/status/notas locais), /questoes
  (busca/filtros e consulta sem gabarito), /erros (tentativas concluídas, reflexão e revisão local)
  e /historico (origem/período, detalhes e registro externo com validação). Navegação e atalhos
  do dashboard integrados; componentes e contratos reutilizados nos dois temas.
- Dados: fixtures de servidor apenas em desenvolvimento; respostas em memória, perdidas ao
  recarregar/sair. Sem auth, persistência, correção ou adaptação real. Produção mostra aviso explícito.
- Aprovações: estrutura, conjunto inicial e visual das duas telas aprovados. Modo escuro solicitado
  após essa avaliação e implementado. Expansão da interface autorizada posteriormente. Nenhum
  serviço externo ou Docker configurado.
- Verificado na expansão: typecheck, lint, build e 26 casos Vitest passaram. Seis jornadas
  Playwright/Edge anteriores passaram como regressão e seis novas passaram para agenda, filtros,
  avaliações, revisão, descarte ao recarregar e foco após remoção de itens filtrados. Responsividade
  das quatro áreas conferida em 320/360/768/1440 nos dois temas, sem overflow ou erros de console.
  Smoke HTTP das seis páginas em produção passou com aviso de configuração e sem fixtures.
  Fundação já cobria cronômetro/expiração, teclado, reduced-motion, tema/reload/storage bloqueado
  e contraste de nove pares no tema escuro. Capturas desktop/mobile em artifacts/screenshots
  (fora do Git), com inspeção visual; lockfile reproduzido anteriormente via npm ci --offline.
- Dependências: sem peers inválidos e audit de produção sem vulnerabilidades. Cinco alertas high
  transitivos apenas de lint (braces via eslint-config-next), sem patch publicado; ver README.
- Agentes: frontend e sat-engine entregaram arquivos independentes; qa revisou sem editar.
  Na expansão, frontend entregou Estudos/Questões e sat-engine validou avaliações (oito casos).
  QA apontou foco/feedback ao editar itens que saem do filtro; corrigido e coberto em E2E.
  Nenhuma reserva de arquivo ativa.
- Próxima ação: continuar as funcionalidades conforme escopo autorizado; Supabase/Auth/RLS e
  persistência pertencem à etapa futura e não foram configurados nesta entrega.
