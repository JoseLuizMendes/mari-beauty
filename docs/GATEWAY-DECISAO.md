---
documento: "Decisão de gateway de pagamento"
status: "Decidido — aguardando confirmação de taxa na conta aberta"
criado: 2026-10-15
revisado: 2026-10-16
decide: "Qual provedor de pagamento usar no site e na loja física"
---

# Gateway de pagamento — decisão e o raciocínio inteiro

> **Veredito:** **ASAAS** no site. **InfinitePay ou Stone** no balcão, se a loja física existir.
> Um gateway só no site é suficiente.
>
> Este documento guarda **o porquê**, não só a conclusão — inclusive o erro de
> recomendação que foi corrigido no caminho. Substitui `GATEWAY-MP-vs-ASAAS.md`,
> cuja conclusão (Mercado Pago) está **revogada**; o motivo está na §7.

---

## 1. O erro de comparação que explica quase toda confusão

Ao pesquisar taxa de pagamento aparecem números como **0,74% no débito** (Stone) e
**crédito a partir de 1,37%** (InfinitePay). Eles são reais — e **não valem para o site**.

| | Cartão presente (maquininha) | Cartão não presente (e-commerce) |
|---|---|---|
| Onde | Balcão, com chip e senha | Site, só os números digitados |
| Risco de fraude | Baixo | Alto |
| Quem responde pelo chargeback | Emissor, em boa parte dos casos | **O lojista** |
| Taxa de crédito à vista | 0,74% a 2,99% | **2,99% a 4,98%** |

São dois mercados de risco diferentes, com preços diferentes. **Nenhum gateway cobra
1,37% em venda online.** Comparar as duas tabelas leva à conclusão errada de que todo
gateway online é caro — eles são caros *em relação à maquininha*, e isso é estrutural.

---

## 2. Os números, só de gateway online

Fontes primárias: tabela oficial do Mercado Pago (03/11/2025), páginas de preço do
ASAAS, da AbacatePay e da Stripe. Custo por pedido no ticket médio do catálogo
(**R$ 244,34**).

| | Pix | Cartão 1x | Boleto | Prazo cartão |
|---|---|---|---|---|
| **AbacatePay** | **R$ 0,80** | R$ 9,15 | R$ 2,50 | D+30 |
| **ASAAS** | R$ 1,99 | **R$ 7,80** | **R$ 1,99** | D+32 |
| **Mercado Pago** | R$ 2,42 | R$ 9,75 | R$ 3,49 | D+30 |
| **Stripe** | R$ 2,91 | R$ 10,14 | R$ 3,45 | — |

A 100 pedidos/mês (R$ 24.434 de faturamento):

| Mix | 1º | 2º | 3º | 4º |
|---|---|---|---|---|
| Pix-pesado (70/25/5) | AbacatePay R$ 297 | ASAAS R$ 344 | MP R$ 431 | Stripe R$ 474 |
| Equilibrado (50/45/5) | ASAAS R$ 460 | AbacatePay R$ 464 | MP R$ 577 | Stripe R$ 619 |
| Cartão-pesado (30/65/5) | ASAAS R$ 576 | AbacatePay R$ 631 | MP R$ 724 | Stripe R$ 764 |

**O Mercado Pago é o terceiro em todos os cenários**, R$ 117 a R$ 147/mês acima do
primeiro — entre 0,5% e 0,6% do faturamento.

---

## 3. O peso usado no ranking

A ordem só faz sentido com o critério explícito. Para uma loja que está começando:

1. **Risco de não conseguir vender** (peso alto) — provedor que trava saque ou não
   libera cartão custa venda, não centavo.
2. **Encaixe técnico** (peso alto) — sem checkout transparente e tokenização, a
   integração não encaixa na arquitetura que já existe.
3. **Custo** (peso médio) — a diferença é R$ 50 a R$ 150/mês. Real, não decisiva.

### 1º — ASAAS

Ganha os três ao mesmo tempo, **sem contrapartida**:

- Mais barato na linha que mais pesa (cartão à vista: R$ 7,80 contra R$ 9,75 do MP — 20% menos).
- Tarifa **fixa** no Pix. Com ticket alto isso importa: a R$ 300 o Pix do MP sobe para R$ 2,97 e o do ASAAS continua R$ 1,99.
- Instituição de pagamento autorizada pelo BCB (código 461), 3,8 mi de contas, R$ 171 bi movimentados. Não é startup.
- A API oficial declara exatamente o que o projeto precisa: **checkout transparente, tokenização de cartão, split e sandbox**.
- Promoção de 3 meses (cartão 1,99% + R$ 0,49, Pix e boleto R$ 0,99) justamente no trimestre em que o caixa aperta.

### 2º — Mercado Pago

O mais caro dos três, mas o mais maduro: nenhum limite de saque, nenhuma análise para
liberar cartão, o melhor antifraude do país. **Paga caro por uma segurança que
provavelmente não será necessária — mas é o único que a tem.**

### 3º — AbacatePay

Seria o 1º se o critério fosse só preço (Pix a R$ 0,80, metade do ASAAS). Cai para 3º
por três travas publicadas na própria página de preços:

- Limite de saída inicial de **R$ 5.000 diurno / R$ 1.000 noturno** — com R$ 24 mil/mês você passa o mês sacando em pedaços.
- Aumento de limite leva **até 7 dias úteis** e passa por análise.
- Cartão liberado **"após análise do time"** — risco de abrir a loja sem aceitar cartão.

A terceira é a pior: é risco de lançamento, não de custo.

### Fora — Stripe

A mais cara nas duas linhas que importam (Pix 1,19%, cartão 3,99% + R$ 0,39) e no boleto.
A melhor API do mundo não compensa, porque o que se compra aqui é taxa brasileira.
**Só entra na conversa se houver venda para fora do Brasil.**

---

## 4. Um gateway só no site é suficiente

Um gateway já entrega Pix + boleto + cartão — "um gateway" não é "uma forma de pagamento".

**Por que não dois:**

- Cada integração é um webhook, uma conciliação e um conjunto de testes. Dobra a superfície que quebra, no lugar mais sensível do sistema.
- Dois gateways resolvem **problema medido** (taxa de aprovação ruim, queda frequente), não medo. Não há medição ainda.
- A conta do risco: a 100 pedidos/mês, **uma hora de queda custa ~R$ 34**, e a maior parte desses clientes volta.

**O que torna isso reversível:** a arquitetura isola o gateway atrás de uma porta única
(`src/lib/payment/infrastructure/external/payment-provider.ts`). Um segundo provedor é
implementar a mesma porta de novo — não é refazer o checkout.

**Quando revisitar:** taxa de aprovação abaixo de ~85% no cartão, ou faturamento que
torne uma hora de queda cara.

---

## 5. Loja física usa outro provedor — e isso é o certo

Pela §1, o melhor online quase nunca é o melhor no balcão:

| | Loja física | Site |
|---|---|---|
| InfinitePay | Pix **zero**, crédito a partir de 1,37% | — |
| Stone | Débito 0,74%, crédito a partir de 2,99% | — |
| ASAAS Tap | Débito 1,25%, crédito 2,99% | — |
| ASAAS online | — | Cartão 2,99% + R$ 0,49, Pix R$ 1,99 |

**Recomendação: InfinitePay ou Stone no balcão, ASAAS no site.**

O que se perde ao separar é **um painel só** — concilia-se duas fontes no fim do mês.
Chateação contábil, não problema técnico, e não custa venda. O que se ganha é mais da
metade da taxa de crédito presencial. Unificar só valeria se a diferença fosse pequena.

⚠️ As taxas presenciais são "a partir de": a InfinitePay só chega a 0,75% acima de
R$ 80 mil/mês (começa em 1,37%) e a Stone trabalha com proposta personalizada.

---

## 6. Antes de assinar

1. Abrir as contas (gratuitas) e **ler a taxa oferecida ao seu CNPJ** — a tabela pública é teto, não preço.
2. Confirmar o **prazo de repasse** na proposta: D+30 contra D+32 mexe mais em capital de giro do que a diferença de taxa.
3. Perguntar a taxa de **parcelamento** mesmo sem usar hoje — ver §8.
4. **InfinitePay:** perguntar se o Pix taxa zero vale na API/link online e se há tokenização de cartão. Se sim nos dois, refazer a conta desta decisão.

---

## 7. A recomendação anterior era Mercado Pago. Por que mudou

A versão anterior deste documento recomendava o MP, apoiada num argumento de
**conversão**: marca conhecida no checkout, carteira com saldo, cartão já salvo.

O argumento era mais fraco do que foi apresentado, e o motivo estava no próprio código.
O projeto é construído para **checkout transparente** — o cartão é capturado no
formulário da loja, no domínio da loja. **O cliente nunca vê a marca do gateway.** A
vantagem da carteira e do cartão salvo do MP só existe se for usado o checkout *deles*,
com redirecionamento ou botão de carteira. Nesta arquitetura, paga-se o preço do MP sem
receber o benefício que justificava o preço.

Fica registrado porque é uma armadilha de raciocínio que volta: **vantagem de marca de
gateway não se aplica a checkout transparente.**

---

## 8. Quando a loja passar a parcelar, a diferença aumenta

Hoje a loja **não oferece parcelamento** — nenhum componente de parcelamento em
`src/components`. Isso elimina a maior diferença de preço entre provedores, e é parte do
motivo pelo qual as diferenças acima são modestas.

Quando passar a parcelar:

| 6x sem acréscimos | Custo |
|---|---|
| Mercado Pago (D+30) | **13,95%** |
| ASAAS (2 a 6x) | 3,49% + R$ 0,49, recebendo em 6 parcelas |
| ASAAS antecipando tudo | ≈ 3,49% + ~5,9% (1,70%/mês) ≈ **9,4%** |

A diferença sai de ~20% para ~1/3 do custo. **É a linha que mais vai pesar no futuro, e
onde a negociação rende mais.**

---

## 9. Pegadinha do ASAAS

A página de preços cobra **R$ 0,99 por transação** pelo pacote de notificações de
e-mail/SMS deles. É **opcional** — o e-mail transacional da loja será próprio, então não
se aplica. Registrado para não ser ativado por engano.

---

## 10. Fontes

Primárias, lidas na íntegra:

- Mercado Pago — Tabela de Taxas e Tarifas, 03/11/2025 (seção "Parcelamento Online via Checkout": Pix 0,99%, boleto R$ 3,49, crédito 1x D0 4,98% / D14 4,49% / D30 3,99%)
- ASAAS — Preços e taxas (asaas.com/precos-e-taxas)
- AbacatePay — Preços (abacatepay.com/pricing)
- Stripe — Preços e tarifas Brasil (stripe.com/br/pricing)
- InfinitePay — Maquininha (infinitepay.io/maquina-cartao) — **presencial**
- Stone — Máquina de cartão (stone.com.br/maquina-de-cartao) — **presencial**
