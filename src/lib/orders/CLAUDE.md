# `src/lib/orders/` — Bounded Context Orders

## Estrutura

```
src/lib/orders/
├── domain/
│   ├── order-types.ts        # OrderStatus + canTransition() (state machine pura)
│   ├── order-tracking.ts     # TrackingOrderData (DTO consumido pelo modal)
│   └── checkout-pricing.ts   # catálogo, estoque e dinheiro — funções puras
├── application/
│   ├── place-order.ts        # use case do checkout (orquestra tudo)
│   ├── confirm-payment.ts    # approved → PAYMENT_CONFIRMED → PREPARING (idempotente)
│   ├── get-order-by-id.ts    # leitura para /sucesso e modal
│   └── list-orders-by-email.ts  # leitura para /meus-pedidos
└── infrastructure/
    └── persistence/
        └── orders-repository.ts  # único acesso direto ao Prisma
```

## Diretrizes

- **Server-only:** todos os arquivos têm `import "server-only"`. Domain compartilha tipos com o cliente, mas não importa Prisma.
- **Idempotência (`confirmPayment`):** o repositório checa `OrderEvent` por `metadata.paymentId` antes de gravar. Chamada repetida do mesmo webhook é no-op.
- **State machine:** `canTransition` em `domain/order-types.ts` é a fonte única das transições válidas. Use ao adicionar novos pontos de mutação (ex.: admin marcando SHIPPED).
- **OrderEvent:** event log imutável. Toda transição de status grava uma linha. Não há "rollback" — para reverter, gravar nova transição (ex.: `CANCELLED`).
- **Boundary:** `infrastructure/persistence/orders-repository.ts` é o único arquivo do contexto que conhece o Prisma. `application/` depende do shape do objeto exportado, não do Prisma Client.
  - ⚠️ Esta regra esteve **quebrada** até 2026-10-16: o `POST /api/checkout` montava o `prisma.$transaction` do pedido à mão, fora do contexto. Virou `ordersRepository.criarPedido` (item 9 da auditoria).
  - `place-order.ts` ainda chama `prisma.product.findMany` direto para ler o catálogo. É leitura de **outro** contexto (`products`), não do `orders` — mover exigiria um `productsRepository.findManyByIds`, que não existe. Fica registrado.
- **Dinheiro é `number`, e não deveria.** `checkout-pricing.ts` trabalha com `Number(product.price)`, como o handler já fazia. O `src/lib/CLAUDE.md` §6 manda não usar `number` em cálculo monetário; a troca para `Decimal` é PR próprio, não carona de refactor.

## Camadas do checkout — quem faz o quê

| Camada      | Arquivo                                           | Responsabilidade                                                                                                                                            |
| ----------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTTP        | `src/app/api/checkout/route.ts`                   | Zod no corpo, traduzir resultado em status. **72 linhas**, nenhuma regra.                                                                                   |
| Application | `application/place-order.ts`                      | Ordem dos passos, cupom, frete, gateway. Devolve resultado discriminado (`ok` / `motivo`) — **não conhece HTTP**, por isso serve a webhook e Server Action. |
| Domain      | `domain/checkout-pricing.ts`                      | Catálogo, estoque e aritmética. Sem IO.                                                                                                                     |
| Infra       | `infrastructure/persistence/orders-repository.ts` | `criarPedido` (pedido + estoque + cupom numa transação), `registrarTentativaDePagamento`.                                                                   |

> **A regra que a extração tornou afirmável:** o frete sai do subtotal **já
> com desconto**. A isenção é em R$ 199, então um cupom de R$ 20 sobre um
> pedido de R$ 210 derruba o cliente para baixo da faixa e ele passa a
> pagar frete. Antes isso era consequência de onde a linha ficava no
> handler; agora é `baseDeCalculoDoFrete` com teste em cima.

## Pontos de chamada da regra `approved → PREPARING`

- `src/lib/orders/application/place-order.ts` — checkout síncrono com mock retornando `approved`. (Era o `route.ts`; mudou no item 9 da auditoria.)
- `src/app/api/webhooks/mercado-pago/route.ts` — **a criar** quando o gateway real for plugado. Mesmo use case, `source: "webhook"`.

## Histórico

- **2026-10-16 (auditoria item 9):** `POST /api/checkout` caiu de 233 para 72 linhas. A regra virou `application/place-order.ts` + `domain/checkout-pricing.ts`, e a transação virou `ordersRepository.criarPedido`. Comportamento preservado: `src/test/api-checkout.test.ts` passou **sem uma linha alterada**, e o E2E `checkout-flow` (Postgres real, estoque e cupom) passou.
- **2026-06-01:** criado. Migração de `prisma` direto em `/sucesso` e `/meus-pedidos` para o contexto. Nova tabela `OrderEvent`.
