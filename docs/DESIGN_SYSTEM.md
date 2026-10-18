# Identidade editorial e Expressive Minimalism

Visual de caderno editorial com precisão analítica: espaço em branco, hierarquia forte,
alinhamento e densidade intencional. Personalidade vem de composição e tipografia.
Toda tela deve esclarecer onde o aluno está, o significado dos dados e a próxima ação.
Tema claro é a direção inicial; não criar um segundo design system.

## Aprovação visual na mesma aplicação

Antes de expandir o design para todas as telas, criar dashboard e interface do simulador
representativos usando os componentes reais que continuarão no produto. Mostrar desktop e
mobile por preview local ou capturas, com loading/vazio/erro relevantes e dados de desenvolvimento
identificados. Apresentar decisões visuais em até cinco pontos e pedir avaliação do usuário.
Aplicar ajustes nesses mesmos componentes; não criar protótipo descartável ou app paralelo.
Enquanto aguarda, regras puras e outras tarefas independentes podem continuar. A implementação
completa do visual depende dessa aprovação, já solicitada pelo escopo do projeto.

## Fontes e hierarquia

Preservar Source Serif 4 + Inter: serif dá identidade a títulos; sans mantém legibilidade nos
controles e números. A combinação continua adequada à leitura e análise pretendidas.
Usar pesos 400/500/600 conforme a família, sem baixar todas as variantes. Carregar com next/font,
fallback Georgia/Arial e subset latino com acentos pt-BR; arquivos locais licenciados são opção
quando build não tem rede. Manter licença da fonte distribuída.

| Papel | Família / tamanho | Altura / tracking |
|---|---|---|
| display pontual | Source Serif 4; clamp(2.5rem,4vw,3.5rem) | 1.12 / -0.025em |
| título da página | Source Serif 4; clamp(2rem,3vw,2.75rem) | 1.2 / -0.015em |
| seção | Inter 600; clamp(1.5rem,2vw,2rem) | 1.25 / -0.015em |
| subtítulo | Inter 600; 1.25rem | 1.3 / 0 |
| corpo | Inter 400; 1rem | 1.55 / 0 |
| passagem longa | Inter 400; 1rem | 1.7 / 0; máximo 68ch |
| metadata / legenda | Inter; 0.875rem / 0.75rem | 1.4 / 0 |
| métrica / timer | Inter 500 ou 600; conforme hierarquia | tabular-nums; sem contador animado |

Display não é padrão para todo cabeçalho. Enunciados mantêm pelo menos 16 px e não usam
tracking comprimido. Conteúdo crítico não depende de tooltip ou truncamento.
Fonte grande não substitui agrupamento correto. Fórmulas precisam caber sem reduzir legibilidade.

## Especificação inicial de tokens

Esta é a fonte inicial de valores. Ao implementar, colocar os tokens em um único arquivo de
estilos e fazê-lo canônico; componentes consomem nomes semânticos. Atualizar este documento
somente se a intenção visual mudar, sem exigir gerador de tokens ou manter duas listas manuais.
Os exemplos CSS abaixo são especificação, não uma aplicação já criada.

```css
:root {
  --color-canvas: #F7F6F2;
  --color-surface: #FFFFFF;
  --color-surface-muted: #EEEDE7;
  --color-ink: #1D292B;
  --color-text-muted: #526264;
  --color-brand: #134E5E;
  --color-on-brand: #FFFFFF;
  --color-border: #D3D8D5;
  --color-border-control: #788784;
  --color-focus: #006C84;
  --color-hover: #E6EEEC;
  --color-selected: #DDECEE;
  --color-brand-hover: #103F4D;
  --color-brand-active: #0C3440;
  --color-success: #246B42;
  --color-success-surface: #E8F3EB;
  --color-warning: #805400;
  --color-warning-surface: #FFF2D2;
  --color-danger: #B42332;
  --color-danger-surface: #FCEBEC;
  --color-info: #205B85;
  --color-info-surface: #EAF1F8;
  --color-disabled-text: #687471;
  --color-disabled-surface: #EEEDE7;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
  --space-24: 96px;
  --radius-control: 6px;
  --radius-panel: 8px;
  --radius-dialog: 12px;
  --radius-pill: 999px;
  --border-width: 1px;
  --focus-width: 2px;
  --focus-offset: 2px;
  --shadow-none: none;
  --shadow-popover: 0 4px 16px rgb(29 41 43 / 0.10);
  --shadow-dialog: 0 8px 32px rgb(29 41 43 / 0.14);
  --container-app: 1200px;
  --container-simulator: 1440px;
  --container-reading: 68ch;
  --container-form: 440px;
  --target-min: 44px;
  --duration-fast: 120ms;
  --duration-standard: 180ms;
  --duration-panel: 240ms;
  --ease-standard: cubic-bezier(0.2,0,0,1);
  --ease-exit: cubic-bezier(0.4,0,1,1);
  --z-sticky: 10;
  --z-dropdown: 20;
  --z-overlay: 30;
  --z-dialog: 40;
  --z-toast: 50;
}
```

Transformar também a escala tipográfica acima em tokens no mesmo arquivo. No Tailwind v4,
mapear cores/fontes semânticas via `@theme inline` quando precisarem referenciar variáveis
de runtime. A escala de spacing base 4 px atende às medidas; usar utilitários compatíveis com
ela. Breakpoints min-width: sm 640, md 768, lg 1024, xl 1280 px; declarar em `@theme` como
40rem/48rem/64rem/80rem. Não depender de var() comum dentro de media query.
Não criar configuração v3 por memória; consultar integração oficial ao implementar.

## Layout e ritmo

- Container central até 1200 px; gutters 16 mobile, 24 tablet e 32 desktop.
- Grid com 1 coluna mobile, 8 tablet, 12 desktop; gap 24 px. Sidebar não deve causar overflow.
- Entre seções: 48 desktop/32 mobile. Cabeçalho → conteúdo: 24; título → descrição: 8.
- Painéis: padding 32 desktop/16 mobile; usar painel quando o agrupamento precisar de limite.
- Formulário até 440 px: label → input 8; input → mensagem 4; entre campos 24.
- Tabelas: padding de célula 12 vertical/16 horizontal, cabeçalho claro, números alinhados à direita.
  Overflow fica dentro da tabela e é perceptível; não comprimir fonte até ficar ilegível.
- Radius 6/8/12 por função, pill só quando fizer sentido. Sombras reservadas para sobreposição.

Dashboard: primeira região editorial com próxima atividade e motivo, agenda ao lado; abaixo,
habilidades com amostra e histórico/evolução. Variar composição por informação, em vez de repetir
cards iguais. Mobile empilha prioridade, agenda, desempenho e histórico. Meta e resultado têm
rótulos diferentes; ausência mostra orientação para começar.

Simulador: cabeçalho compacto com módulo, timer e status de gravação; enunciado/alternativas,
passagem lado a lado em telas largas e empilhados no mobile; navegação no rodapé e mapa de
questões. Áreas fixas não cobrem foco ou conteúdo. Sem sidebar ou gráfico concorrendo com prova.

## Controles e estados

Botão primário usa brand/on-brand; hover e active usam seus tokens. Secundário usa superfície e
borda de controle. Foco tem anel de 2 px e offset 2 px. Selected combina contorno/indicador
com cor; disabled usa semântica e tokens próprios, sem tornar texto explicativo ilegível.
Controles têm alvo de projeto >=44x44 px; erros associam mensagem ao campo.
“Salvando”, “Salvo” e “Não sincronizado” são estados distintos e incluem texto, não só ícone.
Dialog mantém/retorna foco; radio/checkbox usam semântica correta; botão de ícone tem nome.
Gráfico tem resumo/tabela equivalente, unidade, período e amostra. Lucide só para ações/estados úteis.

## Movimento

CSS para hover/focus e seleção: 120 ms. Feedback salvo/erro/progresso: até 180 ms.
Painel: até 240 ms, deslocamento discreto <=8 px; easing standard ou exit conforme ação.
Motion via `motion/react` somente se presença/layout trouxer benefício que CSS não atende.
Não animar timer, atrasar resposta, bloquear navegação ou aplicar entrada a cada elemento.
Com prefers-reduced-motion, remover transform e animação de layout; preservar texto/contorno
instantaneamente. Loader não é a única informação de atividade.

## Uiverse e escolha de componentes

Para controles ou feedback com microinteração útil, considerar opções de [Uiverse](https://uiverse.io/).
Prioridade: HTML nativo para simples; shadcn para comportamento complexo acessível; Uiverse
quando trouxer ganho funcional; custom para composição específica do estudo.
Se avaliar peça externa, anotar URL, autor, licença e adoção/rejeição na tarefa ou comentário
pertinente. Se incorporar, guardar avisos de licença exigidos junto à distribuição.
Verificar teclado, foco, mobile, reduced-motion, tokens, tamanho e scripts. Remover CSS e
animação sem função. Se não houver acesso/licença clara, usar alternativa nativa e informar;
a avaliação não bloqueia toda a UI. Nenhuma peça foi incorporada neste starter.

## Acessibilidade e revisão visual

Meta WCAG 2.2 AA: texto normal >=4.5:1; texto grande e limites essenciais >=3:1.
Os pares ink/canvas, muted/canvas e on-brand/brand são a base; testar estados compostos também.
Não usar borda decorativa clara como único limite de controle. Não depender somente de cor.
Landmarks, um h1, labels persistentes, skip link, foco visível/não coberto e ordem DOM coerente.
Passagens em inglês com lang=en; interface pt-BR. KaTeX com alternativa acessível adequada.
Testar teclado, zoom 200%, 320 CSS px para reflow e 360/768/1440 para composição.
Timer anuncia marcos úteis, não cada segundo; salvar usa status discreto e falha anunciada.

Evitar gradiente roxo/azul genérico, glow/neon, glassmorphism excessivo, sombras enormes,
radius exagerado, excesso de badges/ícones, hero vazio, robôs/cérebros de IA e KPIs sem contexto.
Exceção deve ter função concreta. Review confere hierarquia, tokens, conteúdo longo e estados;
valor arbitrário precisa de justificativa, não de uma nova camada de fiscalização.

Referências: [next/font](https://nextjs.org/docs/app/getting-started/fonts),
[licença Source Serif 4](https://github.com/google/fonts/blob/main/ofl/sourceserif4/OFL.txt),
[licença Inter](https://github.com/google/fonts/blob/main/ofl/inter/OFL.txt),
[Tailwind/shadcn](https://ui.shadcn.com/docs/tailwind-v4) e
[theme variables](https://tailwindcss.com/docs/theme),
[WCAG](https://www.w3.org/WAI/WCAG22/quickref/).
