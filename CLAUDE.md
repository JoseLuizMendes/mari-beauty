# CLAUDE.md — App Belessence (Next.js 16)

> Diretrizes para o aplicativo. Subdiretórios em `src/`, `prisma/`, `public/`
> têm `CLAUDE.md` próprio com regras locais. **Esta página é o ponto de
> entrada.**
>
> ⚠️ **Regra de manutenção:** refactor que move arquivo só fecha quando este
> arquivo move junto. Os caminhos abaixo são verificados no CI por
> `src/test/claude-md-paths.test.ts` — se você mover um módulo e não atualizar
> aqui, o build quebra de propósito.

---

## 1. O que é este projeto

E-commerce fullstack (B2C) de perfumes premium. Branding visível: **Mari
Beauty**. Nome do package: `mari-beauty`.

- **Frontend público** — vitrine, busca, carrinho, checkout, pedido.
- **Painel admin** (`/admin/*`) — CRUD de produtos, pedidos, cupons,
  mensagens. Protegido por cookie `admin_session` validado no middleware.
- **Backend** — Route Handlers em `src/app/api/*` falando com Postgres via
  Prisma.

## 2. Stack e versões

- **Next.js 16** com **App Router** (RSC + Route Handlers). **Sem `pages/`.**
- **React 19** — usar `use()`, Server Actions, `useFormStatus` quando
  apropriado.
- **TypeScript** com paths `@/*` → `src/*` (ver `tsconfig.json`).
- **Tailwind v4** (PostCSS). **Não há `tailwind.config.ts`** — v4 lê do CSS.
  Tokens em [`src/app/globals.css`](src/app/globals.css) — é a fonte, não
  há espelho em TS da paleta.
  [`src/lib/design/domain/tokens.ts`](src/lib/design/domain/tokens.ts) tem
  **só motion do GSAP**; já disse que era a fonte de cor e não era (ver
  [`src/lib/design/CLAUDE.md`](src/lib/design/CLAUDE.md) §7.1).
  ⚠️ **`bg-brand-wine/80` e afins não geram CSS** — 165 classes mortas,
  diagnóstico em §7.2 do mesmo arquivo.
  Os tokens de marca são **hex** (`--color-brand-wine: #47131C`), com uma
  camada de compatibilidade semântica para o shadcn. Não são OKLCH.
  **Espaçamento tem escala de 8pt com nomes semânticos** (`p-card`,
  `gap-block`, `py-section`) — nunca numéricos, que colidiriam com a escala
  do Tailwind. Ver [`src/lib/design/CLAUDE.md`](src/lib/design/CLAUDE.md) §8.
- **Prisma 7** com `@prisma/adapter-pg` (driver `pg`). Cliente gerado em
  `src/generated/` (não tocar). Schema em `prisma/schema.prisma`.
- **shadcn/ui** — style `new-york`, icon library `lucide`. Os aliases do
  `components.json` apontam `utils → @/shadcn-utils/utils` e
  `lib → @/shadcn-utils` (peculiaridade do projeto).

## 3. Arquitetura de `src/lib`

Cada domínio é uma pasta em `src/lib/<dominio>/`. A profundidade de camadas
**varia de propósito** e não é acidente:

| Domínio                                                                 | Camadas                                                | Por quê                                                      |
| ----------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| `orders`, `health`                                                      | `domain/` + `application/` + `infrastructure/`         | Regra de negócio real (máquina de estados de pedido, probes) |
| `products`, `design`                                                    | `domain/` + `infrastructure/`                          | Tem invariante de domínio, não tem orquestração              |
| `cart`, `coupons`, `reviews`, `wishlist`, `shipping`, `payment`, `auth` | só `infrastructure/` (+ `presentation/` quando tem UI) | CRUD ou wrapper de SDK externo                               |

> Se for adicionar regra de negócio a um domínio "só infrastructure", crie o
> `domain/` nele. Não espalhe regra em route handler.

### Caminhos que mais se procura

| O quê                      | Onde                                                                |
| -------------------------- | ------------------------------------------------------------------- |
| Singleton do Prisma        | `src/lib/shared/infrastructure/prisma-client.ts`                    |
| Schemas Zod compartilhados | `src/lib/shared/domain/zod-schemas.ts`                              |
| Tokens de design (cor)     | `src/app/globals.css` (fonte) — ver `src/lib/design/CLAUDE.md` §7.1 |
| `cn()` (merge de classes)  | `src/shadcn-utils/utils.ts`                                         |
| Auth do admin (Edge-safe)  | `src/lib/auth/presentation/admin-auth.ts`                           |
| Confirmação de pagamento   | `src/lib/orders/application/confirm-payment.ts`                     |
| Regra do checkout          | `src/lib/orders/application/place-order.ts`                         |

## 4. Scripts (sempre via pnpm)

```bash
pnpm dev            # next dev
pnpm build          # prisma generate && next build
pnpm start          # produção
pnpm lint           # eslint
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest (watch)
pnpm test:run       # vitest run
pnpm test:coverage  # vitest run --coverage (CI usa este)
pnpm test:e2e       # playwright
pnpm db:up          # docker compose up -d
pnpm migrate        # prisma migrate dev
pnpm db:seed        # prisma db seed
pnpm perf:orcamento # orçamento de performance do bundle (exige build antes)
```

`postinstall` roda `prisma generate` — não removê-lo.

## 5. Variáveis de ambiente

Lista canônica em `.env.example`. **O ambiente é validado com Zod no boot** —
[`src/lib/shared/infrastructure/env.ts`](src/lib/shared/infrastructure/env.ts),
disparado por [`instrumentation.ts`](instrumentation.ts).

O schema tem dois níveis:

| Nível                 | Variáveis                                           | Se faltar                                                             |
| --------------------- | --------------------------------------------------- | --------------------------------------------------------------------- |
| **Núcleo**            | `DATABASE_URL`, `ADMIN_SECRET`, `AUTH_SECRET`       | O servidor **não sobe**. O erro lista todas as pendências de uma vez. |
| **Grupos de feature** | Cloudinary, OAuth Google, login admin, Mercado Pago | A feature é desligada e o boot **avisa no console** quais e por quê.  |

- Em server-side, importar de `@/lib/shared/infrastructure/env` em vez de ler
  `process.env` direto. As duas exceções estão documentadas no `CLAUDE.md`
  daquele diretório.
- Em client-side só `NEXT_PUBLIC_*`, e sempre literal — o Next precisa do
  texto `process.env.NEXT_PUBLIC_X` para inlinar no bundle.

> O núcleo é exatamente o que o CI define. Promover variável a núcleo sem
> acrescentá-la ao workflow quebra o pipeline.

## 6. Regras de alto nível

### 6.1 Server-first

- Componentes são **Server Components por padrão**. Só usar `"use client"`
  quando precisar de estado, efeito, evento de DOM, ou hook client-only.
- Buscas de dados em RSC chamam `src/lib/*` diretamente — **não** fetchar a
  própria API por HTTP.
- Route Handlers (`src/app/api/*`) são para clientes externos / componentes
  client. RSC não consome Route Handler.

### 6.2 Segurança

- O middleware [`src/middleware.ts`](src/middleware.ts) protege `/admin/*` e
  `/api/admin/*`. O cookie `admin_session` é um **JWT assinado em HS256**
  (`jose`) com `ADMIN_SECRET` como chave, com `exp` real e `TOKEN_VERSION`
  para revogação em massa. **O cookie não é o segredo.** Não regredir isso
  para comparação em texto puro.
- `admin-auth.ts` roda no **Edge runtime**: só pode depender de `jose`.
  Nada de bcrypt, otplib, prisma ou arctic nesse módulo.
- **Nunca confiar em preço, estoque ou cupom vindo do client.** Re-validar
  no servidor via Prisma — a conta está em
  [`src/lib/orders/domain/checkout-pricing.ts`](src/lib/orders/domain/checkout-pricing.ts)
  e a orquestração em
  [`src/lib/orders/application/place-order.ts`](src/lib/orders/application/place-order.ts).
  O handler só faz Zod e status.
- Toda entrada externa passa por **Zod** (`src/lib/shared/domain/zod-schemas.ts`).
- **Rota pública nova entra com rate limit e, se for formulário, honeypot.**
  - Limites em `src/lib/shared/infrastructure/rate-limit.ts`; aplicar com
    `enforceRateLimit(req, "<regra>")` na primeira linha do handler.
  - Honeypot: `src/components/ui/honeypot-field.tsx` no form + checagem de
    `HONEYPOT_FIELD_NAME` no handler, respondendo **sucesso falso**.
  - O contador é **compartilhado via Postgres**
    (`rate-limit-store-postgres.ts`, tabela `rate_limit_windows`), porque
    em serverless um `Map` por instância não detém quem ataca com
    concorrência. O upsert é um único `INSERT ... ON CONFLICT` — ler,
    decidir e gravar em passos separados reintroduz a corrida. Se o banco
    não responder, degrada para o contador em memória; não abre a rota.

### 6.3 Performance

- Imagens externas: usar `<Image>` do Next; domínios permitidos em
  `next.config.ts` (atualmente `res.cloudinary.com`).
- Animações pesadas (GSAP) são opt-in client-side; evitar carregar GSAP em
  RSC ou layout root.
- Prisma client é singleton — não instanciar manualmente.
- **Há orçamento de performance, e ele quebra o CI.** Tetos em
  [`performance-budget.json`](performance-budget.json), medidos em dois
  lugares:

  | O quê                                     | Onde roda                                 | Como                                                                     |
  | ----------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------ |
  | Bundle (JS baseline, maior chunk, CSS)    | job `e2e`, depois do build que ele já faz | [`scripts/orcamento-performance.mjs`](scripts/orcamento-performance.mjs) |
  | Assets de `public/` (por arquivo e total) | job `unit`                                | [`src/test/orcamento-assets.test.ts`](src/test/orcamento-assets.test.ts) |

  Por arquivo, e não só no total, porque o erro que custou caro foi **um**
  PNG de 1,5MB entre dezenas de arquivos pequenos — média não pega isso.
  Peso novo que não é necessário na primeira carga vai em `next/dynamic`.
  É assim que o `three.js` já está: 265KB gzip fora do baseline.

### 6.4 Testes

- Unit/component: Vitest + `@testing-library/react` (`jsdom`). Setup em
  `src/test/setup.ts`.
- E2E: Playwright em `e2e/`.
- Não mockar Prisma em testes que afirmam comportamento de checkout/estoque
  — usar banco de teste ou fixtures reais.
- `test.skip` só com motivo **e** prazo. Skip condicional de dado ausente
  (ex.: seed sem produto comprável) é a única exceção permanente.

### 6.5 Convenções de código

- **`async/await`**, sem `.then()` encadeado.
- **TS estrito**: nada de `any`, preferir `unknown` + narrow.
- Imports relativos curtos via alias `@/*`.
- `cn()` para merge de classes.
- Commits em **conventional commits, em pt-BR** (`feat(escopo): …`),
  como o histórico já faz.

## 7. Não faça

- Não rodar `npm install` / `yarn install` — pnpm é o único.
- Não tocar em `src/generated/` (Prisma client) ou `prisma.config.ts` sem
  motivo claro.
- Não renomear rotas em pt-BR (`/sobre`, `/contato`, `/favoritos`,
  `/meus-pedidos`, `/sucesso`) — fazem parte da URL pública.
- Não criar componentes UI à mão se existe um em `src/components/ui/`.
- Não usar `framer-motion` — o projeto padronizou GSAP. (README menciona
  framer historicamente; ignorar.)
- Não baixar o piso de cobertura do `vitest.config.ts` para fazer o CI passar.
  Ratchet só sobe.
- Não subir teto do `performance-budget.json` para fazer o CI passar. Ratchet
  só desce. Se o peso é inevitável, o teto sobe **no mesmo commit** e a
  mensagem explica por quê — assim fica no histórico quem autorizou.
