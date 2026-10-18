# Verificar o que a mudança pode quebrar

Uma alteração está pronta quando seu comportamento foi verificado e as limitações são claras.
Escolher testes pelo risco; não abrir uma auditoria completa para cada tarefa.

| Mudança | Verificação proporcional |
|---|---|
| Texto, cor ou espaçamento local | inspeção no navegador, responsividade/foco se afetados; sem E2E ou build completo automático |
| Componente ou formulário | typecheck/lint do escopo e interação/validação; teste de componente se houver regra relevante |
| Correção, seleção, estatística, revisão ou tempo | unitários Vitest de casos normais, fronteiras, nulos e regressão; relógio/seed controlados |
| Auth, RLS, migração, salvamento ou transição | integração real no projeto hospedado de desenvolvimento; casos positivos/negativos de ownership, duplicação e falha |
| Jornada integrada ou alteração transversal | E2E Playwright afetado, typecheck/lint e build; smoke de inicialização |
| Dependências, configuração de framework ou entrega completa | instalação reproduzível, typecheck, lint, testes relevantes, build e smoke; sem fazer isso após cada pixel |

Criar scripts quando necessários: `dev` para next dev, `build` para next build, `typecheck`
para tsc --noEmit, `lint` para ESLint CLI, `test` para vitest run; `test:e2e` para playwright test
quando a primeira jornada existir. Scripts/documentação devem refletir configuração real.
Não depender de build para rodar lint. Sem metas arbitrárias de cobertura, testes espelhando
implementação ou dezenas de casos de infraestrutura antes de uma funcionalidade existir.

## Casos que merecem rigor

- Correção: opção de outra questão, branco, entrada inválida, racionais equivalentes e denom zero.
- Seleção/adaptação: seed, sem repetição, estoque insuficiente e fronteira 0.65.
- Métricas: amostra 0/4/5, repetição, período/fuso e ausência de dado sem zero artificial.
- Revisão: good/hard/again e retry que não duplica evento ou intervalo.
- Sessão: prazo exato, clock skew, aba suspensa, reload, timeout e módulo fechado.
- Persistência: retry antes/depois do commit, submit duplicado, duas abas, login expirado e
  retomada de resposta confirmada. Não esperar duração inteira de prova em testes de navegador.
- Usuários: A/B/anônimo tentando ler/escrever/excluir dados alheios, IDs conhecidos, RPC direta
  e vínculo filho→pai de outro dono. Filtro de UI não conta como autorização.

## Banco hospedado sem infraestrutura local

Use projeto Supabase de desenvolvimento e contas sintéticas. SQL versionado, aplicado pelo
Dashboard/SQL Editor; teste via SDK/HTTP autenticado com A/B/anônimo, sem chave que burle RLS.
Inclua INSERT/SELECT/UPDATE/DELETE aplicáveis e confirmação após reload. Limpe apenas registros
de teste identificados; não fazer reset do projeto nem migrations destrutivas em dados pessoais.
Se não houver credencial/acesso, marque esse teste bloqueado e continue testes independentes.
Mock valida regra isolada, não comprova RLS nem persistência real. Nunca desabilite RLS para
“desbloquear” um teste. Antes de migração arriscada, faça backup e ensaie em dados de teste.

## Segurança indispensável

TypeScript strict e validação de entrada; sessão verificada no servidor; RLS e grants mínimos;
dono da sessão em cada mutação; gabarito protegido; erros sem SQL/tokens/PII; segredo fora do Git.
Não renderizar HTML arbitrário de questão. KaTeX com trust=false, tratamento de erro e limite
de entrada/expansão apropriado. Mutações protegidas contra origem indevida/CSRF pelo mecanismo
adotado. Valide redirecionamentos Auth. Medidas contra abuso acompanham endpoints públicos
quando expostos; não introduzir Redis como pré-requisito para rate limiting.

## UI, acessibilidade e performance

Verifique os estados de sucesso/vazio/carregando/erro, uso por teclado, foco e nomes acessíveis.
Design segue `DESIGN_SYSTEM.md`; revise em mobile, zoom e reduced-motion quando afetados.
Fluxos centrais recebem teste manual com leitor de tela ao integrar, sem exigir isso por texto.
Gráficos têm alternativa textual/tabular e não misturam escalas/origens.
Evitar queries N+1, carregar todo o banco, rerender de tela a cada segundo e bibliotecas pesadas
na rota de prova. Paginar listas crescentes; importar Recharts/KaTeX/Motion onde forem usados.
Medir bundle ou consulta quando houver suspeita/evidência de lentidão; não montar plataforma de
observabilidade antecipada. Manter seleção local responsiva enquanto confirmação vem da rede.

## Review e integração

QA é útil após auth/dados, mudanças no motor, persistência e fluxos integrados. Ajuste visual
trivial pode ser revisado pelo principal. Não chamar todos os agentes para cumprir ritual.
P0 crítico: exposição grave/perda generalizada; P1 alto: autorização quebrada, resposta confirmada
perdida, correção ou sessão central incorreta; P2 médio: função degradada com alternativa;
P3 baixo: acabamento. Relatar arquivo/linha, reprodução, impacto e recomendação objetiva.
Não reescrever antes de demonstrar problema; revisão não autoriza alterações por si só.

Inspecionar diff, integrar e criar commit em ponto funcional útil. Resumo curto com resultado,
verificações executadas e limitação; evidência importante pode ficar em STATE, sem novo log.
Entrega 1.0 exige funções de PRODUCT verificadas, UI aprovada, banco/auth reais, fluxos críticos
testados e ausência de falhas graves ou requisito obrigatório conhecido quebrado. Teste bloqueado
da função impede chamá-la pronta, mas não bloqueia funções independentes. Publicação é outra ação.

Referências: [Vitest](https://vitest.dev/guide/) e [Playwright](https://playwright.dev/docs/intro).
