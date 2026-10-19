# Motor de estudo e simulador experimental

O motor é nosso: regras pequenas, determinísticas e testáveis sem React ou banco.
Ele organiza prática e identifica lacunas; não reproduz psicometria ou pontuação oficial.

## Referência pública do SAT

Na consulta de 18/10/2026: Reading and Writing tem dois módulos de 27 questões/32 minutos;
Math tem dois de 22 questões/35 minutos. Intervalo entre seções: 10 minutos.
O desempenho do primeiro módulo influencia o segundo de cada seção.
Antes de implementar o simulador, confirmar a estrutura vigente no
[College Board](https://satsuite.collegeboard.org/sat/whats-on-the-test/structure), guardar data
da consulta junto aos parâmetros e explicitar diferenças. Essa referência não autoriza copiar itens.

## Começar pequeno, com o mesmo motor

Usar um conjunto pequeno de questões originais/fixtures e plano de sessão curto para construir
correção, navegação e adaptação. Contagem e duração são parâmetros do plano, não código duplicado.
Rotular “Sessão curta experimental” e dados de desenvolvimento onde aplicável. Não exigir
centenas de questões, cotas perfeitas ou revisão de catálogo inteiro antes de começar a lógica.
Para oferecer uma forma completa, verificar estoque revisado para os módulos e ambos os caminhos
que aquele plano pode selecionar. Se não houver, não iniciar essa forma: informar a limitação e
oferecer a curta disponível. Isso não cria outra versão do produto nem certifica prova oficial.
Itens publicados precisam de autoria/licença e revisão de enunciado, resposta e explicação.

## Questões, seleção e correção

Cada questão tem ID lógico, versão, seção, domínio/habilidade, dificuldade editorial e formato.
MCQ tem quatro opções/uma correta; Math pode ter entrada numérica. Passagem é opcional.
Solução fica protegida no servidor. Tentativa conserva versão/ordem mesmo se catálogo mudar.
Não repetir questão lógica dentro de uma tentativa, ainda que tenha mais de uma versão.
Selecionar por seção/habilidade e preferências de dificuldade, com seed persistida para reproduzir.
Em estoque pequeno, admitir mistura de dificuldades sem repetir e registrar composição real;
se nem a quantidade única existir, retornar erro explicável, sem duplicar silenciosamente.

MCQ valida que opção pertence à versão. Numeric aceita inteiro, decimal e fração simples,
com denominador diferente de zero e limite de comprimento. Normalizar ponto/vírgula segundo
a regra de entrada documentada. Usar comparação racional exata; alternativas arredondadas são
registradas explicitamente no gabarito do item, sem tolerância genérica ou eval.
Separar entrada inválida, resposta incorreta e branco. Treino pode revelar correção após envio;
simulado só revela soluções ao concluir a tentativa. Nunca enviar gabarito antes no HTML/payload.

## Adaptação própria em dois estágios

Primeiro módulo com mistura de dificuldade; segundo recebe caminho higher se acertos/total
for >=0.65, lower caso contrário. Branco conta incorreto; decisão independente para RW e Math.
O threshold é heurística experimental inicial, testada no limite, sem alegação de calibração.
Higher prioriza itens hard/medium; lower easy/medium, sem prometer equivalência com o SAT.
Escolher o caminho uma vez, congelar seleção e registrar versão da regra, seed e resultado.
Se mudar heurística, preservar a versão da regra nas tentativas antigas; o app continua 1.0.

## Cronômetro, respostas e retomada

Quando persistência for implementada, banco/servidor é autoridade de prazo e estado.
Ao ativar módulo, salvar startedAt e deadlineAt. Timer visual calcula restante com serverNow
e relógio monotônico; setInterval apenas redesenha. Recalibrar após retornar à aba ou recarregar.
Alterar relógio do computador, suspender aba ou perder login não pausa o prazo ativo.

Salvar seleção/marcação com revisão esperada e ID de operação. Escrita repetida com mesmo ID
e payload retorna o mesmo resultado; ID reutilizado com outro payload gera conflito.
Uma operação SQL transacional verifica sessão, dono, pertinência da questão, estado, prazo e
revisão, e grava alteração/recibo. Constraints reforçam unicidade. Serializar saves por questão.
Não implementar mensageria ou sistema genérico de eventos para esse protocolo.
Uma segunda aba não sobrescreve resposta nova com revisão antiga: recarregar estado canônico
e resolver conflito explicitamente. Chave de correção não entra no recibo de save.

Mostrar “Salvando” até confirmação real; falha preserva seleção em memória e mostra
“Não sincronizado” com retry. Sem promessa de offline: fechar a aba pode perder pendências.
Tudo que foi confirmado deve sobreviver ao reload. Não usar localStorage como banco alternativo.

Ao finalizar, confirmar operações pendentes e enviar fechamento idempotente. Servidor fecha/corrige
e prepara próximo módulo atomicamente; duas submissões não criam dois módulos/resultados.
Em timeout, fechar com as respostas já gravadas e manter brancos no denominador. Save que chega
ao banco no prazo exato ou depois é rejeitado. Módulo fechado não admite edição ou retorno.
Próximo módulo pending começa só na ativação confirmada; intervalo tem breakEndsAt persistido.
Na retomada de módulo vencido, finalizar esse módulo antes de ativar o seguinte. Informar que
a ativação entre módulos pode diferir da administração oficial; não vender como réplica do Bluebook.

## Erros, domínio e recomendações

Registrar erro com resposta/versão, tipo (conceito, leitura, cálculo, tempo, chute ou desconhecido),
reflexão e próxima ação. Conservar histórico de revisão sem reescrever a resposta original.
Agenda simples: intervalos [1,3,7,14,30] dias. Novo erro step=0, devido em 1 dia. Revisão good
avança um step e agenda pelo novo intervalo; good em step=4 resolve. again volta a step=0/1 dia;
hard conserva step/1 dia. Evento de revisão idempotente não avança agenda duas vezes.
Usar UTC e exibir no fuso do perfil; um dia significa 24h nesta regra inicial.

Domínio: até 30 respostas de sessões concluídas nos últimos 90 dias por habilidade, contando
apenas primeira exposição de cada questão no intervalo. Com menos de cinco itens distintos,
mostrar evidência insuficiente/valor null; com cinco ou mais, acertos/total como estimativa observada.
Não tratar percentual como nota SAT nem probabilidade psicométrica. Informar amostra e janela.

Priorizar revisão vencida mais antiga, depois habilidade com evidência suficiente e acerto <70%,
depois falta de evidência na ordem da taxonomia. Uma ação por habilidade, até três; empates
resolvidos por ID estável. Explicar motivo e amostra. Sem dados, recomendar diagnóstico inicial.
Recalcular ao concluir estudo/treino/revisão ou abrir dashboard; não precisa de cron, Redis ou IA.
Estatísticas incluem brancos no total, excluem abandonadas e preservam null em ausência de tempo.
Separar visão de todas as tentativas da estimativa sem repetição; não inferir habilidade por nota
oficial agregada. Testar essas regras conforme `QUALITY.md`.
