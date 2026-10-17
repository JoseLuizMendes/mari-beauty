# Product

## Register

brand

> A vitrine (home, catálogo, PDP) é o registro padrão: ali o design **é** o produto.
> Carrinho, checkout e `/admin` operam no registro **product** (o design serve a tarefa).
> Quando uma tela estiver no meio do caminho, vale a pergunta: a pessoa está decidindo
> ou está executando? Decidindo é brand. Executando é product.

## Users

Mulher que compra para si, quase sempre pelo celular, com uma mão, à noite. Chega por
Instagram, por anúncio ou por indicação de alguém em quem confia. O perfume custa mais de
R$ 300: ela compra **um**, não seis, e a decisão é de desejo e de confiança, não de
comparação de preço.

O trabalho que ela precisa fazer, nesta ordem:

1. Entender o que é o cheiro, sem poder cheirar.
2. Confiar que a marca é séria o bastante para o preço.
3. Comprar sem criar conta e sem preencher formulário longo.
4. Saber onde o pedido está, depois.

## Product Purpose

Vitrine da Mari Beauty, perfumaria boutique brasileira de ticket alto e poucos SKUs.

O site existe para fazer uma pessoa que nunca cheirou o produto pagar R$ 300 por ele. Isso
só acontece se o site parecer tão cuidado quanto a embalagem. Hoje não parece: ele parece
template, e a distância entre a cara do site e o preço do produto é o problema de negócio.

Sucesso: a pessoa chega pelo celular, entende a marca em uma tela, e compra em poucos
toques, sem conta.

## Brand Personality

**Sensorial, precisa, calorosa.**

Fala de cheiro, de memória e de ritual, em frase curta. Primeira pessoa quando couber.
Nunca adjetivo vazio ("incrível", "exclusivo", "queridinha"), nunca urgência fabricada,
nunca superlativo. O calor vem da palavra escolhida e do papel creme, nunca de ornamento.

Referência de voz: Le Labo e Diptyque. Apotecário, não boutique de shopping.

## Anti-references

Cinco. Cada uma é uma regra, não um gosto:

1. **SaaS feito no Lovable / v0.** Seção centralizada com eyebrow em caixa alta, título,
   subtítulo e três cards iguais com ícone em círculo. Gradiente em CTA. É o que o site é
   hoje, e é a razão desta reforma.
2. **Shopify genérica.** Carrossel de banner, selo de frete grátis, contador de escassez,
   grade de quatro cards idênticos, botão redondo verde.
3. **Farmácia online.** Preço riscado gritando, "de R$ X por R$ Y", estrelinha amarela,
   badge vermelho de desconto, densidade de supermercado.
4. **Luxo clichê.** Fundo preto, serifada dourada, brilho, partícula flutuando. O reflexo
   automático de "perfume caro" e, por isso, o mais datado de todos.
5. **Fofo rosa bebê.** Rosa saturado em tudo, coração, fonte manuscrita, glíter. O risco
   real aqui, porque a paleta tem rosé: rosé é tarja, não é tema.

## Design Principles

**1. O rótulo é o sistema.**
Toda decisão visual se resolve com uma pergunta: como isso apareceria numa embalagem
impressa? Rótulo não tem canto arredondado, não tem sombra, não tem gradiente. Tem papel,
tinta, fio e hierarquia de corpo de letra. O site é o rótulo do Sublime Oil ampliado.

**2. Vender na primeira tela.**
A home abre com produto, não com manifesto. Foto inteira, nome, preço, um botão. Quem veio
de anúncio compra em dois toques; quem veio conhecer rola e encontra a marca logo abaixo.

**3. O calor vem da palavra e do papel.**
Quando uma tela parecer fria, a correção é na copy e na proporção do creme, nunca em
arredondar canto, adicionar sombra ou ligar um gradiente.

**4. Tudo alcançável com o polegar.**
Mobile-first literal. Nenhuma informação ou ação existe só no hover. Hover é enfeite de
desktop; no celular o equivalente é a entrada em viewport e o scroll.

**5. Menos decisões, repetidas.**
Uma escala de tipo, uma escala de espaço, um raio (zero), três sombras, uma curva de
easing. O primeiro valor fora do sistema autoriza os próximos cinquenta. Já aconteceu
neste repo duas vezes: dez exports mortos no `tokens.ts` e vinte e sete utilitários mortos
no `globals.css`.

## Accessibility & Inclusion

- **WCAG 2.1 AA**, verificado no CI por `src/test/contrast-aa.test.ts`. Texto 4.5:1,
  elemento não textual 3:1. A margem de `--muted-foreground` é de 0,02, então qualquer
  mexida em cor roda esse teste primeiro.
- **`prefers-reduced-motion` obrigatório** em toda animação, GSAP e CSS. Já é regra do
  projeto e do cofre; a reforma não abre exceção.
- **Alvo de toque mínimo 44 × 44 px.** Canto reto não reduz área clicável: o alvo é o
  padding, não a borda.
- **Nada depende só de cor.** Esgotado, promoção e erro precisam de palavra, não só de
  tom. Teste em escala de cinza: se a hierarquia some sem cor, a hierarquia não existe.
- Português do Brasil. Preço em `pt-BR`, CEP e CPF com máscara, teclado numérico nos
  campos numéricos.
