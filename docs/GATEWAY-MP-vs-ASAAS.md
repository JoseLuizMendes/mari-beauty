---
documento: "Comparativo de gateway de pagamento"
status: "Insumo de decisão — não é decisão"
criado: 2026-10-15
decide: "Mercado Pago × ASAAS para o Belessence"
---

# Mercado Pago × ASAAS — comparativo para o Belessence

> **O que este documento é:** o material para você decidir, com as contas feitas sobre
> o catálogo real da loja.
>
> **O que ele não é:** a decisão. Ela depende de números que só a sua conta mostra
> (§1) e de uma aposta sobre conversão que nenhuma tabela resolve (§5).

---

## 1. Antes das tabelas: a qualidade das fontes

Isto precisa vir primeiro, porque muda como ler tudo o que vem depois.

| | |
|---|---|
| **As páginas oficiais dos dois provedores estão inacessíveis** deste ambiente (política de rede bloqueou `mercadopago.com.br`, `asaas.com` e `docs.asaas.com`) | Nenhum número abaixo foi lido na fonte primária |
| Os valores vêm de **agregadores e guias de setembro–outubro de 2026** | E eles **divergem entre si** — a divergência está marcada célula a célula |
| **Os dois provedores negociam taxa por conta** (faturamento, segmento, tempo de casa) | A tabela pública é o **teto**, não o seu preço |
| O Mercado Pago só mostra a taxa de parcelamento efetiva **dentro da conta**, em "Taxas e parcelas" | Mesmo a fonte oficial pública é incompleta |

> **Portanto:** use as tabelas abaixo para entender a **forma** do custo de cada um —
> que é o que realmente diferencia os dois e não muda com negociação. Para fechar o
> número, abra as duas contas (ambas são gratuitas) e leia a taxa que cada uma te
> oferece. É meia hora de trabalho e vale mais que qualquer comparativo, este incluído.

---

## 2. Contexto da loja — o que torna esta comparação diferente de um blog

Levantado no código, não suposto:

| Fato do Belessence | Onde | Por que muda a conta |
|---|---|---|
| **A loja não oferece parcelamento** | Nenhum componente de parcelamento em `src/components` | **Elimina a maior diferença de preço entre os dois.** Parcelado é onde as taxas disparam (2,03% a 14,80% no MP conforme as parcelas). Enquanto for tudo à vista, essa coluna não entra |
| Ticket médio do catálogo: **R$ 244,34** | 9 produtos, R$ 159,90 a R$ 349,90 | É o número que decide o Pix — ver §3.1 |
| Frete grátis acima de **R$ 199** | `shipping.ts:18` | Empurra o pedido para **cima** do limiar; o ticket real tende a ficar acima da média do catálogo |
| A porta de pagamento é **única e já isolada** | `payment/infrastructure/external/payment-provider.ts` | Trocar de provedor é trocar uma implementação. O custo de integração é parecido para os dois |
| `confirm-payment` é **idempotente por `paymentId`** e já aceita `source: "webhook"` | `orders/application/confirm-payment.ts` | O caminho mais difícil de uma integração de pagamento já está pronto, para qualquer provedor |
| O schema tem **`mpPaymentId` e `mpStatus`** | `prisma/schema.prisma:110-111` | Nome de fornecedor gravado no banco. Escolher ASAAS custa uma migration de renomeação — pequena, mas real. Ver §6 |
| `MP_ACCESS_TOKEN` já está no schema de env como grupo de feature | `env.ts:89,117` | Nada que não se refaça em 10 minutos, mas o MP está meio-caminho fiado |

---

## 3. As taxas, pela forma do custo

### 3.1 Pix — e aqui está o achado mais específico desta análise

| | Mercado Pago | ASAAS |
|---|---|---|
| Cobrança | **0,99% do valor** | **R$ 1,99 fixo** (fontes divergem: há relato de 100 primeiras/mês isentas via chave estática, e de promo R$ 0,99 por 3 meses) |
| Recebimento | Na hora | Na hora |

**Percentual contra fixo é a diferença inteira.** O ponto de equilíbrio:

```
0,99% × T = R$ 1,99   →   T = R$ 201
```

| Ticket | Pix no MP | Pix no ASAAS | Mais barato |
|---|---|---|---|
| R$ 159,90 (produto mais barato, sem frete grátis) | R$ 1,58 | R$ 1,99 | **MP** |
| R$ 199,00 (limiar do frete grátis) | R$ 1,97 | R$ 1,99 | empate técnico |
| **R$ 244,34 (ticket médio)** | R$ 2,42 | R$ 1,99 | **ASAAS** (−R$ 0,43) |
| R$ 349,90 (produto mais caro) | R$ 3,46 | R$ 1,99 | **ASAAS** (−R$ 1,47) |

> **O ponto de equilíbrio cai quase em cima do seu limiar de frete grátis (R$ 199).**
> Isso não é coincidência administrável: significa que a sua política de frete empurra
> o pedido justamente para a faixa onde o ASAAS fica mais barato no Pix. Quanto mais a
> promoção de frete funcionar, mais o ASAAS ganha nessa linha.

### 3.2 Cartão de crédito à vista

| | Mercado Pago | ASAAS |
|---|---|---|
| Taxa | 3,98% (D+30) · 4,49% (D+14) · **4,98% (na hora)** | **2,99% + R$ 0,49** (padrão) · 1,99% + R$ 0,49 nos 3 primeiros meses |
| Prazo padrão | D+30 para a taxa cheia | D+32 |

No ticket médio de **R$ 244,34**:

| Cenário | Custo | Dinheiro em |
|---|---|---|
| MP, recebendo em 30 dias | **R$ 9,72** | D+30 |
| MP, recebendo na hora | **R$ 12,17** | D+0 |
| ASAAS, padrão | **R$ 7,80** | D+32 |
| ASAAS, nos 3 primeiros meses | R$ 5,35 | D+32 |

**Diferença entre os prazos comparáveis (MP D+30 × ASAAS D+32): R$ 1,93 por pedido, ou
0,79% do ticket.** Guarde esse número — o §5 mostra o que o anula.

### 3.3 Boleto

| | Mercado Pago | ASAAS |
|---|---|---|
| Tarifa | R$ 3,49 (uma fonte diz R$ 3,99 no Link de Pagamento) | R$ 1,99 padrão (fontes divergem: há quem informe R$ 3,49; a página de link fala em R$ 0,99 promocional → R$ 1,99) |
| Liberação | até 3 dias | — |

Boleto tende a ser fatia pequena em perfumaria com Pix disponível. **Não decida por
esta linha.**

### 3.4 Antecipação

| | Mercado Pago | ASAAS |
|---|---|---|
| Custo | Taxa de recebimento mais alta já embute (4,98% na hora vs. 3,98% em 30 dias — **1,00 pp pelos 30 dias**) | A partir de **1,25% ao mês** no cartão; 5,79% ao mês em boleto |

Os dois cobram essencialmente o mesmo pelo dinheiro adiantado (~1% ao mês). **Esta linha
empata.**

---

## 4. Simulação consolidada — 100 pedidos no ticket médio

Três mixes, porque o mix muda o vencedor:

| Mix | MP (D+30) | ASAAS (padrão) | Diferença |
|---|---|---|---|
| **Pix-pesado** — 70% Pix, 25% cartão, 5% boleto | R$ 169,33 + R$ 243,12 + R$ 17,45 = **R$ 429,90** | R$ 139,30 + R$ 194,89 + R$ 9,95 = **R$ 344,14** | ASAAS **−R$ 85,75** (−19,9%) |
| **Equilibrado** — 45% Pix, 50% cartão, 5% boleto | R$ 108,85 + R$ 486,24 + R$ 17,45 = **R$ 612,54** | R$ 89,55 + R$ 389,79 + R$ 9,95 = **R$ 489,29** | ASAAS **−R$ 123,25** (−20,1%) |
| **Cartão-pesado** — 25% Pix, 70% cartão, 5% boleto | R$ 60,47 + R$ 680,73 + R$ 17,45 = **R$ 758,66** | R$ 49,75 + R$ 545,70 + R$ 9,95 = **R$ 605,40** | ASAAS **−R$ 153,25** (−20,2%) |

> Receita bruta dos 100 pedidos: **R$ 24.434**. As contas usam o ticket médio exato
> (R$ 244,34) e arredondam só na exibição; conferidas uma a uma. A economia do ASAAS fica entre
> **0,35% e 0,63% do faturamento**, conforme o mix.

**Em números absolutos, para calibrar a expectativa:** a 100 pedidos/mês, o ASAAS
economiza de **R$ 86 a R$ 153 por mês**. Isso é real, e é pequeno perto de qualquer
coisa que mexa em conversão.

---

## 5. O que nenhuma tabela resolve, e que provavelmente decide

A economia do ASAAS no cartão à vista é de **0,79% do ticket**.

> **Se o Mercado Pago converter 0,8% melhor que o ASAAS, a economia some.** Não 8% —
> **menos de um ponto percentual.**

Os argumentos de cada lado, sem exagerar nenhum:

| A favor do Mercado Pago | A favor do ASAAS |
|---|---|
| Carteira própria com saldo e cartão salvo: parcela dos compradores brasileiros paga em dois toques, sem digitar cartão | Custo menor e, mais importante, **previsível** — tarifa fixa no Pix não cresce com o ticket |
| Marca reconhecida no checkout reduz atrito de desconfiança em loja nova, que é exatamente o seu caso | Estrutura de conta digital PJ, se isso interessar à operação |
| Quando a loja **passar a parcelar**, o MP é o ecossistema mais maduro para isso no Brasil | Taxas promocionais nos 3 primeiros meses dão fôlego no começo |
| Antifraude próprio, calibrado no volume do Mercado Livre | — |

**Nada disto é mensurável antes de vender.** É aposta, e deve ser tratada como tal.

---

## 6. Custo de integração — o mais parecido do que parece

| | Mercado Pago | ASAAS |
|---|---|---|
| Porta já existe | ✅ `payment-provider.ts` — igual para os dois | ✅ |
| Webhook idempotente | ✅ `confirm-payment` já aceita `source: "webhook"` e deduplica por `paymentId` — igual para os dois | ✅ |
| Checkout transparente | ✅ | ✅ (a doc exige HTTPS quando a aplicação captura o cartão — já é o caso) |
| Sandbox | ✅ | ✅ (`api-sandbox.asaas.com`) |
| Env já previsto | ✅ `MP_ACCESS_TOKEN` já está no schema como grupo de feature | ❌ a criar (10 min) |
| **Colunas do banco** | ✅ `mpPaymentId`, `mpStatus` já batem | ⚠️ **Migration de renomeação** — o nome do fornecedor está gravado no schema |

> **O item da migration é pequeno, mas tem uma lição maior do que ele.** `mpPaymentId`
> é acoplamento de nome a fornecedor num lugar que deveria ser neutro. Independente da
> escolha, vale renomear para `paymentProviderId` / `paymentProviderStatus` com um
> campo `paymentProvider` — porque a próxima troca de gateway custa o mesmo de novo.
> **Se a decisão for ASAAS, faça as duas coisas na mesma migration.**

---

## 7. Recomendação

**Comece pelo Mercado Pago. Reavalie com dados reais em 3 a 6 meses.**

O raciocínio, e não só a conclusão:

1. **A economia do ASAAS é real, mas pequena no volume atual** — R$ 86 a R$ 153 por mês
   a 100 pedidos. É menor que a margem de erro das tabelas do §1, que vêm de fontes de
   terceiros que divergem entre si.
2. **O risco de conversão é maior que a economia.** Em loja nova, sem marca, o selo de
   um meio de pagamento conhecido é uma das poucas coisas que reduzem desconfiança —
   e bastam 0,8% de diferença para o cálculo inverter.
3. **O MP está meio-caminho fiado no código.** Não é um bom motivo sozinho, mas é um
   desempate honesto quando os outros fatores estão próximos.
4. **A decisão é barata de reverter**, que é o argumento mais forte de todos. A porta
   está isolada, o webhook é idempotente. Trocar depois custa a implementação nova e
   uma migration — não custa refazer o checkout.

### O que faria escolher ASAAS agora

Qualquer um destes inverte a recomendação:

- O ticket médio real subir bem acima de R$ 244 e **Pix dominar o mix** — é o cenário
  em que a tarifa fixa do ASAAS ganha de goleada da porcentagem do MP;
- Você precisar de **conta digital PJ** integrada, e não só de gateway;
- Volume crescer a ponto de **0,5% do faturamento** deixar de ser ruído;
- O MP te oferecer, na conta aberta, taxa pior que a tabela pública do §3.

### O que fazer antes de assinar qualquer um

1. Abrir as duas contas (gratuitas) e **ler a taxa que cada uma oferece para o seu
   CNPJ** — substituindo as tabelas do §3, que são teto público.
2. Confirmar o **prazo de repasse** na proposta, não no blog: D+30 contra D+32 muda
   capital de giro mais do que 0,79% de taxa.
3. Perguntar aos dois sobre **taxa de parcelamento**, mesmo sem usar hoje: é a linha
   que mais pesa quando a loja passar a parcelar, e é onde a negociação rende mais.

---

## 8. Fontes

Todas de terceiros — as oficiais estavam inacessíveis (§1). Datas de setembro e outubro
de 2026 salvo indicação.

- [Taxas de gateway de pagamento no Brasil: tabela 2026 — HeroPay](https://heropay.ai/guias/taxas-de-pagamento)
- [Taxas Mercado Pago 2026: O Guia Completo Para Vendedores — SellSync](https://sellsync.ai/pt/blog/taxa-mercado-pago-2026-guia-completo/)
- [Calculadora de Taxas do Mercado Pago 2026 — Marreira Digital](https://marreiradigital.com.br/calculadora-mercadopago/)
- [Taxas Checkout Mercado Pago — Negócios Financeiros](https://www.negociosfinanceiros.com/taxas-mercado-pago-checkout-transparente-como-funcionam/)
- [Taxas Asaas: pague apenas por cobrança recebida — blog oficial](https://blog.asaas.com/taxas-asaas/)
- [Link de pagamento — Asaas](https://www.asaas.com/link-pagamento)
- [Antecipação de recebíveis — Asaas](https://www.asaas.com/antecipacao-de-recebiveis)
- [Asaas Review 2026 — Runzos](https://runzos.com/asaas-review-2026/)
- [Cobranças via cartão de crédito — docs.asaas.com](https://docs.asaas.com/docs/cobrancas-via-cartao-de-credito)
- [Criar novo webhook — docs.asaas.com](https://docs.asaas.com/reference/criar-novo-webhook)
- [Gateways de Pagamento Online no Brasil 2026 — Mind Group](https://mindconsulting.com.br/2026/07/gateways-pagamento-online-brasil-comparativo-2026/)
