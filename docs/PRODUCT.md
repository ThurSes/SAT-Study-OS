# Produto e escopo 1.0

Para um estudante brasileiro do Ensino Médio/técnico preparando o SAT para ingresso em 2028,
o produto deve responder: o que estudar agora, por que errei e como estou evoluindo?
Interface pt-BR; conteúdo de Reading and Writing em inglês. Datas no fuso do perfil.
O uso começa pessoal, com autenticação e dados isolados para receber outros estudantes.

## Funcionalidades e aceite essencial

| Área | Resultado esperado e como conferir |
|---|---|
| Dashboard | Progresso, meta de pontuação informada, avaliações recentes, desempenho por área, evolução de acertos e próxima atividade. Vazio orienta a começar, sem inventar métrica. |
| Estudos | Conteúdos por domínio/habilidade SAT, recurso por URL, dificuldade pessoal, status e agenda de estudo. Registrar sessão, concluir atividade e recarregar preserva os dados. |
| Diário de erros | Questão/versão, resposta dada e correta, explicação, causa, reflexão e histórico de revisão. Um erro continua ligado à tentativa original. |
| Avaliações externas | Registrar data, origem, material, pontuações e observação. Editar um registro não muda outras origens; filtros e gráficos preservam essa distinção. |
| Questões e treino | Catálogo original/licenciado com seção, habilidade, dificuldade e explicação; filtros e treino personalizado. Corrigir e concluir gera desempenho e erros rastreáveis. |
| Simulador | Sessões com módulos, cronômetro, navegação, marcação, salvamento e adaptação entre módulos. Reload restaura respostas confirmadas e o prazo correto. |
| Motor de estudo | Identifica dificuldade recorrente, agenda revisão e recomenda até três ações com razão e evidência. Sem histórico, sugere diagnóstico, sem falso domínio zero. |
| Relatórios | Evolução de acertos, áreas e avaliações com amostra, período e unidade. Resultados oficiais/impressos não compartilham escala com métricas experimentais. |
| Conta | Cadastro/login, logout, recuperação e perfil com meta/fuso. Usuário A não lê nem altera estudos, erros, respostas ou tentativas de B por UI, API ou acesso ao banco. |

Taxonomia inicial: RW com Information and Ideas, Craft and Structure, Expression of Ideas,
Standard English Conventions; Math com Algebra, Advanced Math, Problem-Solving and Data Analysis,
Geometry and Trigonometry. Habilidades se ligam a um domínio, com ID estável. Conferir o mapa
oficial ao preparar conteúdo; não inventar que uma classificação editorial é certificada.

## Honestidade dos resultados

- `official_self_reported`: nota oficial informada pelo usuário; o sistema não a verificou.
- `printed_estimate`: estimativa de PDF/impresso com material, edição e método de conversão.
- `experimental`: desempenho do nosso simulador; exibir acertos/total, tempo e caminho adotado.

Nota oficial reportada e estimativa usam validação de faixa/soma quando aplicável; nunca derivar
400–1600 de acurácia experimental sem fundamento. Meta de nota é objetivo do aluno, não previsão.
Não reproduzir questões protegidas, logotipos, algoritmo proprietário ou calibração do College Board.

## Construção incremental

Uma sugestão ajustável: base visual aprovada → dashboard/estudos com dados identificados →
login e persistência real → histórico/diário → questões/treino e simulador → recomendações/relatórios.
Correção pura pode avançar enquanto UI é avaliada; recursos persistidos precisam de auth/RLS.
A ordem depende do código existente, sem criar bloqueios globais ou novos documentos de etapa.
Uma sessão curta com catálogo pequeno permite construir o motor na mesma aplicação; não é
uma versão alternativa e não deve ser apresentada como prova completa. Ver `SAT_ENGINE.md`.

Fora do escopo: chatbot complexo, agentes autônomos dentro do site, gamificação elaborada,
pagamentos, social, proctoring, aplicativo nativo, cópia do Bluebook e funcionamento offline completo.
Exportação avançada, painéis administrativos e integrações externas só entram mediante escopo
específico; não acrescentar requisitos porque existiam no kit anterior.

## Pronto para uso

Fluxos acima funcionam com dados reais por usuário, revisão e recomendações explicáveis;
simulador persiste e retoma, conteúdo tem revisão/proveniência e UI é acessível/responsiva.
Verificações de `QUALITY.md` compatíveis com as mudanças foram executadas. Fixtures ou integração
pendente ficam declaradas e não contam como funcionalidade pronta. A versão de lançamento é 1.0.

Fontes de domínios consultadas em 18/10/2026:
[RW](https://satsuite.collegeboard.org/sat/whats-on-the-test/reading-writing) e
[Math](https://satsuite.collegeboard.org/sat/whats-on-the-test/math).
