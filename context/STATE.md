# Estado atual

- Aplicação única Next 16.4.2/React 19.3.1, TypeScript strict, Tailwind 4, componentes
  shadcn/Radix, fontes locais Source Serif 4 + Inter e temas claro/escuro. Git e npm lockfile.
- Interface: dashboard, agenda, biblioteca /conteudos, questões, diário, histórico e simulador.
  Biblioteca pública tem 32 aulas originais (11 RW/21 Math), oito domínios, explicações,
  objetivos, exemplos resolvidos e armadilhas; não é material oficial nem mede domínio.
- Implementado no código: login/cadastro/saída/recuperação Supabase SSR, Proxy de renovação,
  sessão validada no servidor e callbacks para estudos, notas/progresso, avaliações e revisões.
  Confirmação só após resposta positiva. Dashboard conectado parte de dados reais/vazios.
- Questões: cinco itens RW originais compartilhados, prática individual via RPC atômica;
  gabarito em schema privado. Erro concluído permite interpretação, conteúdo ou falta de atenção,
  reflexão e diário, preservando resposta original. Retry usa UUID, sem escrita de nota pelo aluno.
- Simulador: persistência de respostas/marcações/tempo implementada com RPC, revisão de
  concorrência e prazo do banco; UI mantém relógio monotônico. Pausa didática, sem correção,
  adaptação ou resultado no histórico. Revisões ainda sem reagendamento automático.
- Conexão hospedada: projeto lrhpgpmszdajpbqvlevo informado pelo usuário; URL/chave publicável
  em .env.local ignorado pelo Git. Auth/API respondem; confirmação de e-mail habilitada.
  Migrations 202610180001–003 aplicadas via SQL Editor; usuário confirmou o resultado final
  dos testes transacionais A/B/anônimo, retry, gabaritos privados e prazo. API anônima negou
  leitura de estudos e execução da correção (401/42501), verificado diretamente. Não há chave
  administrativa na aplicação. Inspeção da aba compartilhada foi bloqueada pela política do
  navegador. Usuário confirmou login real e a jornada manual: atividade criada, nota/conclusão
  de aula, causa/reflexão no diário e seleção/marcação/pausa do simulador permaneceram após reload.
- Verificações: typecheck, lint, build passaram; 35 casos Vitest passaram. Três jornadas públicas
  Playwright/Edge passaram para aulas, filtros/notas, login/recuperação e layouts
  320/360/768/1440 nos dois temas. Capturas em artifacts/screenshots (fora do Git).
  As 16 jornadas demonstrativas passaram; proteção de sete rotas pessoais e callback seguro
  passou separadamente com projeto configurado (17 casos únicos). npm ci reproduziu o lockfile.
  Login real confirmado pelo usuário. Smoke de produção passou: aulas/login disponíveis e sete
  áreas pessoais protegidas, sem fixtures. Persistência e retomada pela UI confirmadas manualmente
  pelo usuário; não foram automatizadas usando a conta pessoal por causa do bloqueio da aba.
- Sem Supabase configurado, fixtures pessoais só em desenvolvimento e explicitamente locais;
  produção orienta configurar. Catálogo didático é público e autoral em ambos os ambientes.
- Dependências: SDKs oficiais @supabase/ssr 0.12.7 e supabase-js 2.118.0; mínimo Node 22,
  Node 24 recomendado. Audit de produção zero vulnerabilidades; cinco high apenas de lint
  transitivo (braces via eslint-config-next), conforme README. Sem Docker/CLI/banco local.
- Delegação: frontend entregou biblioteca e sat-engine a prática individual em arquivos exclusivos.
  Principal integrou e revisou auth/SQL/dados; revisão QA independente não chegou a executar.
- Entrega solicitada concluída: Supabase/Auth, salvamento, biblioteca e três causas de erro.
  Recuperação de senha está implementada, mas seu envio/retorno por e-mail não teve jornada real
  nesta validação. Leituras atuais limitadas a 500 registros por área/2000 revisões, sem paginação.
