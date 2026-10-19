# Implementar uma funcionalidade

Execute a tarefa que descrevo junto a este prompt, dentro do SAT Study OS 1.0.
Se eu não indicar aceite, deduza o comportamento observável mais simples que atende ao pedido.
Pergunte apenas se faltar informação indispensável que mudaria o resultado. Se nenhuma tarefa
for fornecida, use a próxima ação concreta autorizada em `context/STATE.md`; se não houver,
peça a descrição da tarefa, sem inventar escopo.

Leia `AGENTS.md`, o código afetado e somente o documento relevante:
`docs/PRODUCT.md` para escopo, `docs/ARCHITECTURE.md` para contratos/dados,
`docs/DESIGN_SYSTEM.md` para UI, `docs/SAT_ENGINE.md` para regras de estudo ou
`docs/QUALITY.md` para risco e verificações. Consulte STATE se precisar de situação atual.
Não reabra a discussão de arquitetura se a tarefa cabe no padrão existente.

Inspecione Git/diff e preserve trabalho em andamento. Explique a solução em poucas frases e
implemente nos arquivos necessários. Não crie documento de planejamento para registrar a tarefa.
Se útil delegar, atribua a um dos três especialistas um objetivo, arquivos e aceite; contratos
compartilhados ficam com o principal e dependências diretas são resolvidas antes do paralelismo.
Não faça refatoração geral por causa de bug local nem duplique componente existente.

Respeite aprovação visual registrada em STATE. Se UI ainda não foi aprovada, prepare/ajuste a
proposta representativa do START antes de expandir o design; trabalho independente pode seguir.
Para integração de dados, use Supabase hospedado e autorização real; sem acesso, prepare código
e SQL/testes possíveis, declare a integração pendente e continue somente partes independentes.
Não substituir PostgreSQL por persistência de mentira nem reduzir RLS para contornar problema.

Execute as verificações pertinentes ao comportamento e risco, conforme QUALITY. Corrija falhas
introduzidas, revise diff e integre na mesma aplicação. Faça commit em ponto útil se Git estiver
configurado, sem incluir alterações alheias ou segredos. Atualize STATE só se o estado mudou;
registre em DECISIONS apenas mudança estrutural relevante aprovada.

Finalize em poucas linhas: comportamento entregue, verificações reais, limitação e próxima ação.
Não marque uma função como pronta se o seu teste essencial não foi executado.
