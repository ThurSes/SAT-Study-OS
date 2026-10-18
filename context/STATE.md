# Estado atual

- Existe: aplicação única Next 16.4.2/React 19.3.1, TypeScript strict, Tailwind 4, componentes
  shadcn/Radix, fontes locais e tokens do kit; contratos canônicos antes das telas, npm lockfile e Git.
- Funciona em desenvolvimento: dashboard representativo e /simulador com cinco questões originais,
  seleção, navegação/mapa, revisão e cronômetro monotônico de cinco minutos com pausa/retomada/reset.
  Reinício confirma descarte, prazo bloqueia edição e teclado preserva foco. Sem gabaritos no cliente.
  Temas claro/escuro nos mesmos componentes; botão no cabeçalho de ambas as telas, preferência
  inicial do sistema e escolha explícita persistida somente para o tema. Sem novas dependências.
- Dados: fixtures de servidor apenas em desenvolvimento; respostas em memória, perdidas ao
  recarregar/sair. Sem auth, persistência, correção ou adaptação real. Produção mostra aviso explícito.
- Aprovações: estrutura, conjunto inicial e visual das duas telas aprovados. Modo escuro solicitado
  após essa avaliação e implementado. Nenhum serviço externo ou Docker configurado.
- Verificado: npm ci --offline reproduziu o lockfile; typecheck, lint sem avisos, 18 casos Vitest
  passaram na fundação; alteração de tema verificada com typecheck, lint, build e seis jornadas
  Playwright/Edge, incluindo preferência/reload, sessão preservada e storage bloqueado;
  layouts 320/360/768/1440, zoom CSS 200%, teclado/foco, reduced-motion, expiração acelerada e
  reload cobertos. Build e smoke HTTP de ambas as rotas em produção passaram, sem fixtures.
  Contraste do tema escuro: nove pares de texto/controle/foco atendem aos limiares testados.
  Capturas claro/escuro desktop/mobile em artifacts/screenshots (fora do Git), com inspeção visual.
- Dependências: sem peers inválidos e audit de produção sem vulnerabilidades. Cinco alertas high
  transitivos apenas de lint (braces via eslint-config-next), sem patch publicado; ver README.
- Agentes: frontend e sat-engine entregaram arquivos independentes; qa revisou sem editar.
  Fontes e foco apontados na revisão foram corrigidos. Nenhuma reserva de arquivo ativa.
- Próxima ação: continuar as funcionalidades conforme escopo autorizado; Supabase/Auth/RLS e
  persistência pertencem à etapa futura e não foram configurados nesta entrega.
