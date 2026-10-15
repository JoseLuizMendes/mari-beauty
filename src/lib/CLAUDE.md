# CLAUDE.md — `src/lib/`

> Coração lógico do app: acesso a dados, regras de negócio, stores,
> tokens de design, integrações.
>
> **Organizado por bounded context**, não por tipo de arquivo. Cada pasta
> de primeiro nível é um domínio com `CLAUDE.md` próprio — leia o do
> domínio em que for mexer.

---

## 1. Mapa atual

A profundidade de camadas **varia de propósito**: domínio com regra de
negócio real ganha `domain/` e `application/`; CRUD e wrapper de SDK ficam
só em `infrastructure/`.

| Contexto    | Camadas                                              | Conteúdo                                                                                                       |
| ----------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `shared/`   | `domain/` + `infrastructure/`                        | `zod-schemas.ts` (schemas globais), `prisma-client.ts` (singleton)                                             |
| `orders/`   | `domain/` + `application/` + `infrastructure/`       | Máquina de estados do pedido, `confirm-payment`, `orders-repository`                                           |
| `health/`   | `domain/` + `application/ports/` + `infrastructure/` | Probes de liveness/readiness                                                                                   |
| `products/` | `domain/` + `infrastructure/`                        | `product-status` (regras puras), `collections` (mapa público), `products-repository`, `product-image`          |
| `seo/`      | `domain/` + `infrastructure/`                        | `json-ld` (schema.org), `og-palette` (hex p/ satori), `site-url` (origem canônica)                             |
| `design/`   | `domain/`                                            | `tokens.ts`                                                                                                    |
| `auth/`     | `infrastructure/` + `presentation/`                  | `admin-auth` (Edge), `admin-login` (bcrypt+TOTP), `admin-google`, `auth.ts`, `auth-actions`, `auth-gate-store` |
| `cart/`     | `infrastructure/` + `presentation/`                  | `cart-repository`, `cart-actions`, `cart-store`                                                                |
| `wishlist/` | `infrastructure/` + `presentation/`                  | `wishlist-repository`, `wishlist-actions`, `wishlist-store`                                                    |
| `coupons/`  | `infrastructure/`                                    | `coupons-repository`                                                                                           |
| `reviews/`  | `infrastructure/`                                    | `reviews-repository`                                                                                           |
| `shipping/` | `infrastructure/`                                    | `shipping.ts` (ViaCEP + frete por UF)                                                                          |
| `payment/`  | `infrastructure/`                                    | `payment-provider.ts` — **hoje é mock**                                                                        |
| `motion/`   | `presentation/`                                      | `gsap-helpers.ts` — **client-only**                                                                            |
| `hooks/`    | —                                                    | React hooks client-only (ver [hooks/CLAUDE.md](hooks/CLAUDE.md))                                               |

Convenção de sufixo: `*-repository.ts` (Prisma), `*-actions.ts`
(Server Actions, `"use server"`), `*-store.ts` (Zustand, client-only).

> **Carrinho e favoritos são privados por usuário, no banco.** As stores
> Zustand (`cart-store`/`wishlist-store`) **não** usam `localStorage`:
> são cache hidratado do servidor no login e zerado no logout (ver
> `src/components/auth/auth-data-sync.tsx`). Mutações são otimistas e
> sincronizam via Server Actions com rollback. **Nunca** voltar a persistir
> esses dados em `localStorage` global — vaza dados entre usuários.

## 2. Regras gerais

1. **Server-only é estrito**: arquivos que tocam Prisma, Mercado Pago,
   Resend, ou `process.env.*` que não sejam `NEXT_PUBLIC_*` **nunca** podem
   ser importados em Client Components. Se houver risco, marque com
   `import "server-only"` no topo.
2. **Client-only**: Zustand stores e GSAP helpers devem usar
   `import "client-only"` (ou viver atrás de `"use client"` em quem
   importa).
3. **Sem React aqui** (exceto `hooks/` e `*-store.ts`). `lib/` é lógica —
   fica testável e reutilizável.
4. **Funções puras > classes.** Não há motivo para classes nesta camada.
5. **Erros de domínio** devem ter mensagens em pt-BR estáveis (vão para
   toasts). Erros de programação podem ser em inglês.
6. **Regra de negócio nova** num contexto que só tem `infrastructure/`:
   crie o `domain/` dele. Não espalhe regra em route handler nem em
   repository.

## 3. Prisma singleton

[`shared/infrastructure/prisma-client.ts`](shared/infrastructure/prisma-client.ts)
é o **único** lugar onde `PrismaClient` é instanciado. Importar dele em
todos os `*-repository.ts` e Route Handlers:

```ts
import { prisma } from "@/lib/shared/infrastructure/prisma-client";
```

**Não** criar `new PrismaClient()` em nenhum outro arquivo — em dev gera
múltiplas conexões e vaza pool.

## 4. Validações Zod

- Schemas em [`shared/domain/zod-schemas.ts`](shared/domain/zod-schemas.ts)
  são a fonte única de verdade para shape de input **compartilhado**. Forms
  (RHF + `zodResolver`) e Route Handlers (`safeParse`) consomem o mesmo
  schema.
- Schema usado por um único bounded context fica junto do use case dele,
  não aqui.
- Helpers (CPF, CEP) já existem — reutilize antes de criar novos.
- Mensagens de erro Zod em **pt-BR** (`.min(1, "Nome obrigatório")`).

## 5. Stores Zustand

- Stores são **client-only** e vivem em `<contexto>/presentation/`.
- **Sem `persist`** em carrinho e favoritos — ver nota da seção 1.
- Hidratação: cuidado com mismatch SSR ↔ client. Usar `useHasMounted`
  (ver [hooks/CLAUDE.md](hooks/CLAUDE.md)).
- Selectors finos para evitar re-render geral: `useCartStore(s => s.count)`.

## 6. Pagamento e dinheiro

- Preços vêm como **`Decimal`** do Prisma. **Nunca usar `number` para
  cálculo monetário** — converter para string ou usar lib `decimal.js`.
- [`payment/infrastructure/external/payment-provider.ts`](payment/infrastructure/external/payment-provider.ts)
  é a **única** porta para o gateway. Trocar provedor = trocar essa
  implementação, contrato externo se mantém.
- ⚠️ **O provider hoje é mock e sempre retorna `approved`.** Ver P0.1 em
  [`docs/AUDITORIA-2026-10.md`](../../docs/AUDITORIA-2026-10.md).
- [`orders/application/confirm-payment.ts`](orders/application/confirm-payment.ts)
  é idempotente por `paymentId` e já aceita `source: "webhook"` — o caminho
  para o gateway real está pavimentado.

## 7. Tokens de design

- [`design/domain/tokens.ts`](design/domain/tokens.ts) é a **fonte única**
  em TypeScript; os valores CSS vivem em `src/app/globals.css`. Cores
  (**hex**, não OKLCH), tipografia, espaçamento. Nunca hardcodar paleta em
  componente.
- Se precisar de cor que não está nos tokens: **adicione ao tokens
  primeiro**, depois use.

## 8. Não faça

- Não importar de `@/components/*` ou `@/app/*` aqui (direção errada).
- Não escrever query SQL crua (`prisma.$queryRaw`) sem motivo claro —
  perde tipos e segurança.
- Não esconder erro de banco em `try/catch` vazio — propague ou logue.
- Não duplicar validação Zod em handler + form; importe do mesmo lugar.
- Não mover arquivo sem atualizar o `CLAUDE.md` do diretório — o CI
  verifica (`src/test/claude-md-paths.test.ts`).
