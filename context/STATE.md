# Estado atual

- Simulado completo implementado em /simulador (21/10/2026); treino curto preservado em
  /simulador/treino. Quatro módulos, intervalo, prazos contínuos sem pausa/avanço antecipado,
  adaptação por seção, salvamento idempotente com revisão e resultado de 90 itens pontuados
  com revisão das 98 questões, domínios/habilidades e diário de erros. Sem conversão 400–1600.
- Carregadas e confirmadas no Supabase 224 questões únicas, revisadas dos PDFs4/5, e dez
  figuras privadas; estoque cobre todos os caminhos em20seeds. Leituras privadas por dono;
  figuras em sat_private.exam_assets via RPC/rota autenticada, sem chave administrativa web.
  Gabarito online atual4 pertence a outra edição: respostas resolvidas independentemente e
  referências substituídas documentadas em artifacts/private-sat/publish.reviews.json (ignorado).
- Oito PDFs inventariados (444páginas) e extraídos em candidatos privados. Carga deste
  conjunto:65RW4+61RW5+54Math4+44Math5. Itens com corte/continuação/inconsistência não
  resolvida estão fora da prova; demais candidatos não revisados permanecem indisponíveis.
  Nenhum PDF, enunciado importado, solução ou figura protegida entrou no Git ou em public.
- Aplicadas migrations 202610190001,202610210001–003: motor adaptativo, anotações estritas,
  reserva de cotas pontuadas antes de não pontuadas, mídia privada. SuiteSQL A/B/anônimo,
  quatro caminhos, correção/prazos/recibos e legacy isolation passou na revisão anterior;
  novos testes mídia e estoque mínimo147 em12seeds passaram. Rerun extenso do conector
  retornou requestState expirado; validação HTTP real confirmou os quatro caminhos,
  concorrência (um vencedor), conflito de revisão, retry pós-commit, fechamento único e
  relatório98/90. Dados das contas de teste são isolados da conta pessoal e removidos ao fim.
- Typecheck,64Vitest,20Python,lint,build e13Playwright passaram. Segunda execução E2E
  reutilizou servidor Next e encerrou exit0; primeira reproduziu travamento do runnerWindows
  ao encerrar seu próprio servidor. Capturas RW/Math desktop/320px/texto200% conferidas.
  Testes antigos ajustados para /simulador/treino ainda sem rerun completo de fixtures antigas.
- Desmos sem chave mantém alternativa oficial externa; API embutida testada com stub,
  aguardando chave válida para validação contra serviço real. Hospedagem continua sem
  publicação automática. Audit npm desta rodada não concluiu por falha de rede no endpoint.
- Produção local autenticada validada: /simulador200semgabarito, figura privada200comSHA
  correto/no-store, contaB404 e anônimo401. Servidor local precisa de rede para Supabase;
  sessão60525 foi iniciada com rede autorizada. Harness genérico em scripts/test_sat_http.mjs;
  credenciais, chaves de respostas e SQL de fixtures ficam somente no diretório ignorado.
- Limpeza final confirmada:224questões e10figuras pessoais preservadas, zero contas e
  sessões sintéticas restantes; tokens revogados e arquivos locais de credenciais removidos.
- Prova completa pronta no código e banco pessoal. Domínio público precisa receber a nova
  versão e suas variáveis Vercel antes da validação publicada; sem publicação automática.

- Diagnóstico Vercel: https://sat-study-os-one.vercel.app responde 200 com aviso de configuração
  ausente e login desabilitado. Variáveis locais não são carregadas pela hospedagem; cadastro
  das três NEXT_PUBLIC_* e redeploy no painel Vercel pendentes (sem acesso ao painel nesta sessão).
  Projeto Supabase ACTIVE_HEALTHY; consulta remota confirmou oito tabelas sat_* com RLS.
  Corrigida origem de confirmação/recuperação: domínio confiável da implantação como fallback,
  bloqueio de localhost na Vercel, validação de origem e trim nas variáveis Supabase. README
  documenta variáveis e allow list Auth. 47 unitários, typecheck, lint, build e duas jornadas de
  login/proteção de rotas passaram. Smoke de produção com ambiente Vercel confirmou login 200
  e callback inválido 307 para o domínio HTTPS, sem localhost nem redirecionamento externo.
  Validação autenticada no domínio publicado ainda pendente.
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
