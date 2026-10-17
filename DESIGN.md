---
name: Mari Beauty
description: O rótulo do frasco, ampliado até virar site. Papel creme, tinta vinho, tarja rosé, canto reto.
colors:
  paper: "#FFFDE9"
  paper-warm: "#FFF3E8"
  ink: "#47131C"
  ink-soft: "#5A2A33"
  ink-muted: "#8A6770"
  tarja: "#FFD7E7"
  tarja-soft: "#FFE8F0"
  rule: "#E5DCCC"
  edge: "#8A6770"
  alert: "#B84040"
typography:
  display:
    fontFamily: "Marcellus, Optima, Georgia, serif"
    fontSize: "clamp(2.75rem, 11vw, 7rem)"
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: "-0.02em"
  heading:
    fontFamily: "Marcellus, Optima, Georgia, serif"
    fontSize: "clamp(2rem, 7vw, 4rem)"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "-0.015em"
  subheading:
    fontFamily: "Marcellus, Optima, Georgia, serif"
    fontSize: "clamp(1.5rem, 4.5vw, 2.25rem)"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  body:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0"
  body-lead:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0"
  label:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.16em"
  label-sm:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.2em"
rounded:
  none: "0px"
spacing:
  tight: "8px"
  control: "16px"
  card: "24px"
  block: "32px"
  section: "48px"
  rhythm: "64px"
  canvas: "96px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "18px 32px"
    height: "56px"
  button-primary-hover:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "18px 32px"
    height: "56px"
  button-secondary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  tag:
    backgroundColor: "{colors.tarja}"
    textColor: "{colors.ink}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.none}"
    padding: "6px 10px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "16px 0"
    height: "56px"
  product-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0"
  product-card-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
---

# Design System: Mari Beauty

## 1. Overview

**O site é o rótulo do frasco, ampliado.**

Um rótulo impresso não tem canto arredondado, não tem sombra, não tem gradiente. Tem
papel, tinta, fio e hierarquia de corpo de letra. É assim que esta loja se parece cara,
e é assim que ela deixa de parecer template de IA: não por somar efeito, por tirar.

Três papéis, e um só:

| Papel     | Cor             | Quanto da tela                | Função                                                                                        |
| --------- | --------------- | ----------------------------- | --------------------------------------------------------------------------------------------- |
| **Papel** | creme `#FFFDE9` | 80% ou mais                   | O canvas. Fundo de toda página, de toda seção, por padrão.                                    |
| **Tarja** | rosé `#FFD7E7`  | uma ou duas faixas por página | Faixa sangrada de borda a borda que separa um capítulo do outro. Também a etiqueta de estado. |
| **Tinta** | vinho `#47131C` | o resto                       | Texto, fio, moldura, preenchimento de botão. Vinho é tinta, não é parede.                     |

A inversão que define a interação: no desktop, o que estava em tinta vira papel no hover,
e o que estava em papel vira tinta. Como virar o rótulo. No celular não existe hover, e o
equivalente é a entrada em viewport.

**Registro.** A vitrine (home, catálogo, PDP) é _brand_: o design é o produto. Carrinho,
checkout e `/admin` são _product_: o design serve à tarefa. Na dúvida, a pergunta é se a
pessoa está decidindo (brand) ou executando (product). No registro product, densidade e
clareza vencem gesto: botão menor, espaçamento menor, nenhuma animação de entrada.

**Grid.** Coluna única no celular, com calha de 16px; 24px a partir de 640px; 32px a
partir de 1024px. Largura máxima 1280px. Grade de produto: 2 colunas no celular, 2 no
tablet, 3 no desktop. Nunca 4: o produto custa mais de R$ 300 e precisa de tamanho.

**Ritmo vertical em três degraus, nunca um só.** 48px entre blocos de uma mesma ideia,
64px entre seções irmãs, 96px antes e depois de uma tarja. Seção que recebe o mesmo
padding da anterior some na leitura, e foi o que aconteceu no site antigo: sete seções com
`py-16 sm:py-24 md:py-28` idêntico.

**Primeira tela no celular.** Um produto, foto inteira, nome, preço, um botão. Sem
carrossel, sem slogan, sem barra de cupom empilhada. A marca aparece ao rolar.

## 2. Colors

Hex, não OKLCH: é a doutrina já registrada no `CLAUDE.md` da raiz e o `@theme inline` do
Tailwind v4 depende dela. Nenhum branco puro e nenhum preto puro: o creme é um
branco-quebrado quente e o vinho é um quase-preto tingido.

### Primary

`paper` `#FFFDE9`. O canvas. Toda página começa aqui. Fundo do `<body>`, fundo de toda
seção que não seja tarja.

`paper-warm` `#FFF3E8`. Segundo papel, meio grau mais quente. Usado para alternar seções
vizinhas sem recorrer a borda. Contraste contra `paper` é de apenas 1,13, então ele separa
só em área grande: serve para uma seção inteira, nunca para um card.

### Secondary

`tarja` `#FFD7E7`. Faixa sangrada. Uma, no máximo duas por página. Também o preenchimento
da etiqueta de estado (lançamento, promoção, esgotado).

`tarja-soft` `#FFE8F0`. Variante para a etiqueta quando ela cai sobre a própria tarja.

### Tertiary

Não existe. Uma terceira cor de acento é a porta de entrada da deriva.

### Neutral

`ink` `#47131C` (texto e títulos), `ink-soft` `#5A2A33` (texto secundário),
`ink-muted` `#8A6770` (legenda, placeholder, borda funcional).

`rule`: fio decorativo, `rgba(71, 19, 28, 0.14)`. O hex `#E5DCCC` da frontmatter é esse
valor achatado sobre o papel, para ferramenta que não lê alpha; no CSS o token é a rgba,
porque ele precisa funcionar sobre papel **e** sobre tarja.

`edge` `#8A6770`: fio funcional, sólido. A borda de um campo de formulário é a única
coisa que diz onde se clica para digitar, então ela não é decoração.

`alert` `#B84040`: erro. A única cor fora da paleta, e só em mensagem de erro.

### Named Rules

**Medidas, não opiniões.** Todas verificadas; `src/test/contrast-aa.test.ts` guarda no CI.

| Par                      | Razão    | Veredito                  |
| ------------------------ | -------- | ------------------------- |
| vinho sobre creme        | 14,86    | texto e display           |
| vinho sobre rosé         | 11,70    | texto sobre a tarja       |
| creme sobre vinho        | 14,86    | botão em repouso          |
| rosé sobre vinho         | 11,70    | detalhe sobre tinta       |
| ink-soft sobre creme     | 11,29    | texto secundário          |
| ink-soft sobre rosé      | 8,89     | texto secundário na tarja |
| ink-muted sobre creme    | 4,81     | legenda, borda de campo   |
| **ink-muted sobre rosé** | **3,79** | **reprova. Proibido.**    |

1. **Nada de `ink-muted` sobre a tarja.** Dá 3,79 e reprova o mínimo de 4,5 da WCAG
   1.4.3. Texto secundário dentro de uma tarja é `ink-soft`, que dá 8,89.
2. **Fio em alpha nunca é afordância.** Vinho a 40% sobre papel chega a 2,45, abaixo do
   mínimo de 3:1 da WCAG 1.4.11. Fio que carrega informação (borda de campo, limite de
   área clicável) é `edge` sólido. Alpha só para fio decorativo.
3. **Nunca um bloco creme sobre fundo rosé.** A razão entre os dois é 1,27: o bloco
   simplesmente não aparece. A tarja é uma faixa, não um recipiente de cards. Se um
   elemento claro precisa existir sobre a tarja, ele leva fio de tinta.
4. **Vinho não é parede.** O único lugar onde vinho vira superfície é o botão primário em
   repouso, o rodapé e o estado hover de um card. Seção inteira em vinho é a
   anti-referência "luxo clichê".
5. **Teste em escala de cinza.** Se a hierarquia da tela some sem cor, a hierarquia não
   existe. Corrija em tamanho e peso, não em tom.

## 3. Typography

Três vozes, nenhuma fonte nova. As três já estão carregadas via `next/font`.

- **Marcellus** (serifada humanista, prima do Optima, que é fonte de embalagem de
  cosmético): display e títulos. É o nome no rótulo.
- **DM Sans**: corpo. É o parágrafo de descrição.
- **Geist Mono**: a voz do rótulo. Volume, notas olfativas, preço, SKU, estado, navegação,
  micro-rótulo. Caixa alta, tracking largo, tabular. É ela que faz a tela parecer
  embalagem e não landing page.

Promover a mono a voz de rótulo é a decisão que mais muda a cara do site, e custa zero
quilobyte: ela já estava no projeto, usada só em número de KPI do admin.

### Hierarchy

| Token        | Tamanho                       | LH   | Tracking | Caixa      | Família    |
| ------------ | ----------------------------- | ---- | -------- | ---------- | ---------- |
| `display`    | clamp(2.75rem, 11vw, 7rem)    | 0.92 | -0.02em  | Frase      | Marcellus  |
| `heading`    | clamp(2rem, 7vw, 4rem)        | 0.98 | -0.015em | Frase      | Marcellus  |
| `subheading` | clamp(1.5rem, 4.5vw, 2.25rem) | 1.05 | -0.01em  | Frase      | Marcellus  |
| `body-lead`  | 18px                          | 1.55 | 0        | Frase      | DM Sans    |
| `body`       | 16px                          | 1.6  | 0        | Frase      | DM Sans    |
| `label`      | 12px                          | 1    | +0.16em  | CAIXA ALTA | Geist Mono |
| `label-sm`   | 11px                          | 1    | +0.2em   | CAIXA ALTA | Geist Mono |

### Named Rules

1. **Entrelinha aperta quando o corpo cresce; tracking anda ao contrário.** 7rem com
   entrelinha de corpo (1.5) lê como parágrafo, não como afirmação.
2. **Caixa alta só em `label` e `label-sm`.** Título em caixa alta é a assinatura do luxo
   clichê.
3. **Linha de texto entre 65 e 75 caracteres.** Em coluna única no celular isso já
   acontece; no desktop exige `max-width`, não a largura do container.
4. **Nenhum tamanho arbitrário.** `text-[10px]`, `text-[9.5px]` e
   `text-[clamp(2rem,4.5vw,3.4rem)]` estão espalhados pelo código antigo. Se um tamanho
   não está na tabela, falta um degrau na escala, não um valor avulso.
5. **Marcellus não tem itálico.** Onde o código antigo escreve `italic` junto de
   `font-playfair`, o navegador sintetiza uma inclinação falsa. Remover.

## 4. Elevation

**Rótulo impresso não tem sombra. No registro brand, a sombra é zero.**

A separação entre superfícies segue uma ordem, e para na primeira que resolver:

1. **Fill**: cor de fundo diferente (`paper` contra `paper-warm`, ou a tarja).
2. **Fio**: `rule` decorativo, `edge` quando carrega informação.
3. **Espaço**: às vezes nada separa melhor que 96px.

Sombra não está na lista. O site antigo tinha oito (`shadow-card`, `shadow-card-hover`,
`shadow-gold`, `shadow-luxury`, `shadow-hairline`, `shadow-petal-1/2/3`), e é parte do que
dava o aspecto de card genérico.

### Shadow Vocabulary

Só no registro **product**, e só onde a elevação é real, isto é, onde algo flutua de fato
sobre o conteúdo: sheet do carrinho, dialog, dropdown, toast.

```css
--shadow-sm: 0 1px 2px rgba(46, 11, 18, 0.06);
--shadow-md: 0 8px 24px rgba(46, 11, 18, 0.1);
--shadow-lg: 0 20px 50px rgba(46, 11, 18, 0.16);
```

Tingidas na tinta, nunca em preto puro. Opacidade nunca passa de 0,16. Blur e offset
crescem juntos.

### Named Rules

1. **Nenhuma sombra em card de produto, seção, botão, input ou badge.** Nunca.
2. **Nenhum `backdrop-filter` decorativo.** O header pode escurecer ao rolar por mudança
   de fundo, não por vidro. As quatro classes `glass-*` do sistema antigo saem.
3. **Zero gradiente.** Seis existiam; nenhum sobrevive. A única exceção é o degradê de
   legibilidade sobre foto, quando há texto em cima dela, e ele é preto-tinta a alpha,
   não cor de marca.

## 5. Components

**Raio zero em absolutamente tudo.** Esta é uma divergência consciente do
[[Design System Blueprint]] do cofre, que manda nunca usar canto reto. O Blueprint está
certo para interface de produto; aqui o conceito é um impresso, e impresso é refilado
reto. A decisão é do dono do projeto e vale para botão, card, input, etiqueta, imagem,
avatar e modal.

Canto reto não encolhe alvo de toque: o alvo é o padding, e o mínimo continua 44 × 44 px.

### Buttons

| Estado             | Primário                                             | Secundário                              |
| ------------------ | ---------------------------------------------------- | --------------------------------------- |
| Repouso            | fundo tinta, texto papel                             | fundo papel, fio tinta 1px, texto tinta |
| Hover (só desktop) | **inverte**: fundo papel, texto tinta, fio tinta 1px | **inverte**: fundo tinta, texto papel   |
| Ativo              | tinta a 92% de luminosidade, sem deslocar            | idem                                    |
| Foco               | contorno `edge` 2px com offset de 2px                | idem                                    |
| Desabilitado       | fundo `rule`, texto `ink-muted`, cursor padrão       | idem                                    |

Tipografia `label`: mono, caixa alta, 12px, tracking +0.16em. Altura 56px, padding
18px/32px. Transição só em `background-color` e `color`, 240ms na curva de assinatura.

**O fio na inversão não é opcional.** Sobre a tarja, um botão que inverte para fundo papel
fica a 1,27 de contraste contra a faixa e desaparece. O fio de tinta mantém a forma.

### Chips

Etiqueta de estado (`Lançamento`, `Promoção`, `Esgotado`, `Edição limitada`). Retângulo de
tarja com texto tinta em `label-sm`, padding 6px/10px. Sem raio, sem borda, sem sombra.

Uma por produto, no máximo. O card antigo empilhava até cinco por ordem de prioridade.

### Cards / Containers

**Card de produto não é um card.** Não tem fundo próprio, não tem borda, não tem sombra:
é a foto, e abaixo dela um bloco de texto sobre o papel da página. O que separa um produto
do vizinho é a calha da grade, não uma moldura.

- Foto em `aspect-[3/4]`, ocupando a largura inteira da coluna.
- Abaixo: nome em `subheading`, notas em `label` cor `ink-muted`, preço em `label` tabular.
- Hover (só desktop): o bloco de texto inverte para fundo tinta e texto papel, e a foto
  escurece 4%. 240ms, curva de assinatura.
- Celular: nenhum hover. O card entra em cena com fade e 24px de subida quando cruza o
  viewport, com stagger de 80ms entre vizinhos.

Nunca aninhar container. Nunca repetir o mesmo card em grade de quatro iguais.

### Inputs / Fields

Campo sem caixa: fundo transparente sobre o papel, **fio inferior apenas**, `edge` sólido
1px. Rótulo acima em `label`, nunca placeholder como rótulo. Altura 56px.

- Foco: o fio engrossa para 2px em tinta e cresce da esquerda para a direita em 240ms.
- Erro: fio em `alert`, mensagem abaixo em `body` cor `alert`, com texto, nunca só cor.
- Teclado numérico (`inputMode`) em CEP, CPF, telefone, número e quantidade.

### Navigation

Header fino, fundo papel, fio inferior `rule`. Logo à esquerda, busca e sacola à direita.
Links em `label`.

- Hover de link (desktop): nenhuma troca de cor. Um fio de tinta cresce de 0 a 100% da
  largura, 240ms. É o equivalente de rótulo para o sublinhado, e resolve o caso em que a
  inversão é impossível: texto tinta sobre papel não pode virar papel sobre papel.
- Celular: sheet de tela cheia, fundo papel, links em `heading`, alinhados à esquerda,
  um por linha. Sem acordeão, sem submenu.
- Ao rolar: só o fio inferior ganha opacidade. Nada de blur progressivo, nada de sombra.

### Signature Component: o frasco

A primeira tela da home é o frasco girando em 3D conforme o scroll, sobre o papel creme.
É a foto de produto, não enfeite. Técnica: a mesma do More Nutrition (SOTD Awwwards),
verificada no código deles: **sequência de frames desenhada num `<canvas>` 2D**, com o
índice do frame amarrado ao scroll por GSAP ScrollTrigger (`scrub`). Não é WebGL em
runtime.

**Os frames são renderizados offline com o three.js que já está no repo.** O modelo
paramétrico de `bottle-profile.ts` + `bottle-mesh.tsx` ganha um preset `spray` (corpo
cilíndrico, ombro arredondado, válvula e sobretampa), usando como referência de forma o
frasco rosa de `public/assets/inspiration/spray-bottles.png`. Um script roda a cena
headless e exporta a volta completa. Por que assim e não de outro jeito:

| Caminho                      | Problema                                                                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| three.js ao vivo             | 265,7 KB gzip de chunk, risco em celular fraco, precisa fallback                                                            |
| 200 frames gerados por IA    | a IA não mantém o mesmo objeto em 200 imagens; o rótulo alucina (a foto de referência já tem "An⅀e IALE" no lugar do texto) |
| foto chapada com escala      | não gira; uma foto só tem um lado                                                                                           |
| **render offline do modelo** | **determinístico, rótulo é textura nossa, zero JS 3D no cliente**                                                           |

Bônus: com o hero fora do WebGL, o three.js some do bundle de produção (só a bancada
`/lab/bottle` continua usando).

**Cor do objeto.** Corpo em rosé fosco puxado da paleta (não o `#876459` amarronzado da
foto), válvula e sobretampa creme, rótulo em tinta vinho com o texto real da marca. Fundo
transparente (alpha), para o frasco pousar direto no papel.

**Orçamento, obrigatório:**

- 120 frames, WebP com alpha. Dois jogos: 1080 px (desktop) e 720 px (celular), escolhido
  por `matchMedia` antes de baixar. Alvo: ~2 MB no celular, ~4 MB no desktop. O More
  Nutrition usa 200 frames de 1920 px e ~10 MB; não precisamos disso.
- Carregamento progressivo: primeiro 1 a cada 8 frames (a volta já funciona, em
  degraus), depois o resto preenche. O frame 0 é um `<img>` comum com `priority`, para o
  LCP não esperar o canvas.
- Os frames saem de `public/`, contam em `performance-budget.json` e ganham teto próprio.
- `prefers-reduced-motion`: só o frame 0, parado.

### Parallax e scroll

O parallax fica, é pedido explícito do dono, e o Lenis é a base: scroll suave em todo o
site, montado uma vez no `LenisProvider`, com o ScrollTrigger sincronizado nele.

- **Hero:** três planos em velocidades diferentes. Frasco (gira e sobe devagar), texto
  (sobe mais rápido e sai antes), fio e rótulo de preço (fixos até o fim do pin). O hero
  fica _pinned_ durante a volta do frasco, ~150vh no celular, ~200vh no desktop.
- **Grade de produto:** cada foto desloca de 6 a 10% (`yPercent`) dentro do próprio
  recorte enquanto o card atravessa a tela. Recorte com `overflow: hidden`, então a moldura
  não mexe, só a imagem dentro dela.
- **Tarja:** o texto entra com leve atraso em relação à faixa.
- Tudo em `transform` com `scrub`; nada de animar `top`, `margin` ou altura.
- O parallax funciona igual no celular, porque é scroll, não hover.
- `prefers-reduced-motion: reduce` desliga pin, parallax e sequência; Lenis cai para scroll
  nativo.

### Signature Component: a tarja

A faixa rosé sangrada de borda a borda é o componente que dá identidade ao site. Regras:

- Largura total da viewport, ignorando o container.
- 96px de respiro antes e depois.
- Conteúdo dentro dela em tinta e `ink-soft`. Nunca `ink-muted`.
- Uma por página, duas no máximo em página longa.
- Entra com um varrido vertical de 900ms na curva de assinatura quando cruza o viewport,
  nunca com fade simples.

### Motion

Uma curva de easing para estado e entrada, duas durações. O movimento ligado ao scroll
(pin, sequência, parallax) não usa duração: segue o dedo, via `scrub`.

```css
--ease-signature: cubic-bezier(0.16, 1, 0.3, 1);
--dur-ui: 240ms; /* feedback, hover, foco, troca de estado */
--dur-entrance: 900ms; /* entrada de seção em viewport */
```

- **Celular não tem hover.** Nenhuma informação ou ação depende dele. O repertório do
  celular é entrada em viewport e scroll, só. Hover fica atrás de
  `@media (hover: hover) and (pointer: fine)`, não atrás de um breakpoint de largura:
  tablet com toque e tela grande existe.
- Entrada = fade mais 24 a 40px de subida, stagger de 80 a 120ms. Nunca deslize vindo de
  fora da tela, nunca bounce, nunca elastic.
- Nunca animar propriedade de layout. Só `transform`, `opacity`, `background-color`,
  `color`, `border-color`.
- `prefers-reduced-motion: reduce` desliga entrada e scroll-linked, e mantém só a troca de
  estado em 1ms. GSAP via `useGSAP`, Lenis montado uma única vez no provider.

## 6. Do's and Don'ts

### Do:

- Começar toda tela no papel creme e perguntar o que precisa de tinta.
- Resolver separação por fill, depois fio, depois espaço. Nessa ordem, parando na
  primeira que funcionar.
- Usar a mono para tudo que é dado: preço, volume, notas, SKU, estado, data, quantidade.
- Variar o ritmo vertical entre os três degraus. Seção sem contraste de respiro não lê
  como seção.
- Escrever frase curta. Quando a tela parecer fria, melhorar a palavra, não arredondar o
  canto.
- Rodar `pnpm test:run src/test/contrast-aa.test.ts` antes de qualquer outra coisa ao
  mexer em cor. A margem de `--muted-foreground` é de 0,02.

### Don't:

- Nenhum raio. Nenhuma sombra fora de sheet, dialog, dropdown e toast. Nenhum gradiente.
- Nenhum vidro, nenhum blur decorativo, nenhum brilho, nenhuma partícula.
- Nenhum `ink-muted` sobre a tarja, e nenhum bloco creme sobre a tarja sem fio.
- Nenhum ícone dentro de círculo. Nenhuma fileira de três selos de confiança com ícone,
  título e corpo: é a assinatura de site gerado por IA, e era o `features.tsx`.
- Nenhum eyebrow em caixa alta seguido de título centralizado seguido de fio de 48px. A
  fórmula aparecia em cinco seções do site antigo.
- Nenhuma grade de quatro cards iguais. Nenhum card dentro de card.
- Nenhum carrossel de banner, contador de escassez, selo de frete grátis, preço riscado
  gritando ou estrela amarela.
- Nenhum texto em caixa alta acima de 12px.
- Nenhum valor fora da escala. Se falta um valor, falta um token.
