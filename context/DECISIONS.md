# Decisões de base

| Decisão | Motivo |
|---|---|
| Uma aplicação Next.js App Router, monólito modular, lançamento 1.0 | construir de modo incremental sem duplicar produto |
| Supabase PostgreSQL hospedado + Auth/RLS | persistência real e isolamento sem exigir infraestrutura local |
| Contratos manuais em src/types/domain.ts quando implementados | consistência sem gerar tipos e camadas antes de serem usados |
| Source Serif 4 + Inter, visual editorial claro | preservar identidade útil e legibilidade; avaliar duas telas antes de expandir |
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
