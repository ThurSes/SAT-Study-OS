# Decisões de base

| Decisão | Motivo |
|---|---|
| Uma aplicação Next.js App Router, monólito modular, lançamento 1.0 | construir de modo incremental sem duplicar produto |
| Supabase PostgreSQL hospedado + Auth/RLS | persistência real e isolamento sem exigir infraestrutura local |
| Contratos manuais em src/types/domain.ts quando implementados | consistência sem gerar tipos e camadas antes de serem usados |
| Source Serif 4 + Inter, visual editorial claro/escuro | preservar a composição aprovada; tema escuro usa overrides dos mesmos tokens |
| Motor determinístico com resultado experimental explícito | explicar e testar heurísticas sem alegar pontuação oficial |
| npm e um lockfile na implementação | instalação simples e reproduzível |
| Delegação proporcional a três papéis existentes | ganho de especialização sem criar coordenação desnecessária |

Estrutura e conjunto inicial aprovados pelo usuário em 18/10/2026: fundação, contratos antes
das telas e componentes definitivos de dashboard/simulador. A aprovação visual permanece separada.

| Decisão da fundação | Motivo e consequência |
|---|---|
| Fixtures só no servidor e em desenvolvimento; componentes recebem dados/callbacks | integrar Supabase futuramente sem substituir a composição visual; produção mostra aviso |
| Sessão curta de cinco questões/cinco minutos, estado só em memória | interações úteis agora, sem banco alternativo ou falsa persistência; pausa explicitamente demonstrativa |
| Fontes locais via pacotes OFL e next/font | manter identidade sem requisição de fontes externas durante build ou uso |
| Tema inicial do sistema; alternância explícita persistida apenas no navegador | preferência visual sobrevive a reload sem banco ou dependência; respostas continuam somente em memória |

## Integração autorizada após a expansão visual

| Decisão | Motivo e consequência |
|---|---|
| Auth SSR por e-mail/senha e gravações por Server Actions, sem chave administrativa | sessão verificada no servidor; RLS e ownership também no acesso direto à API |
| Correção individual e eventos de sessão/revisão em RPCs pequenas | transação e retries idempotentes; gabaritos privados, resposta original imutável e prazo controlado pelo banco |
| Mesmo catálogo de questões original em desenvolvimento e produção | fixtures continuam apenas para dados pessoais sintéticos; componentes não precisam ser reconstruídos |
| Biblioteca pública; notas/conclusão pessoais autenticadas | leitura útil sem conta, progresso persistido somente quando a conexão confirmar |

Estas decisões substituem o limite de estado exclusivamente em memória quando Supabase está
configurado. A sessão curta continua experimental, com pausa didática e sem adaptação/correção
automática. Aplicação e verificação das migrations hospedadas são acompanhadas em STATE.

## Simulado adaptativo autorizado

- `/simulador` recebe a prova completa; `/simulador/treino` preserva a sessão didática.
- Prazo contínuo e correção ficam no servidor. São 98 itens apresentados, 90 pontuados,
  com corte editorial de 65% para o segundo módulo; não há conversão para 400–1600.
- Questões dos PDFs pertencem à conta importadora e ficam separadas do banco de prática
  legado. Extração e associação de gabarito não constituem revisão editorial.
- Publicação exige conteúdo revisado suficiente para os primeiros módulos e os dois
  caminhos seguintes, sem repetição lógica na tentativa. Estoque incompleto bloqueia início.
- Integração Desmos depende de chave pública; indisponibilidade oferece calculadora oficial
  externa e não interrompe o relógio. Resultados Bluebook são autodeclarados e identificados.
- Reservar todos os itens pontuados dos seis conjuntos antes de selecionar os não pontuados:
  evita que um item livre consuma estoque obrigatório de um módulo posterior.
- Figuras importadas podem ser carregadas pelo desenvolvedor no schema privado do PostgreSQL
  e lidas por RPC/rota autenticada com ownership. Isso conclui a carga sem distribuir chave
  administrativa de Storage; arquivos limitados a 2 MB e sem cache público.
- Gabaritos com o mesmo número de teste exigem comparação de edição. Divergências são
  resolvidas e documentadas a partir do enunciado local, com explicação independente.
