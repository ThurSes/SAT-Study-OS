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

Estas escolhas compõem a proposta do kit; o START confirma decisões estruturais relevantes
com o usuário quando ainda não houver autorização. Aprovação visual ficará em STATE.
Adicionar aqui apenas decisão durável: problema, escolha, motivo e consequência em poucas linhas.
Não usar como diário de commits ou repetir regras do AGENTS.
