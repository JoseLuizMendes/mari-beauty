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
  Tokens em [`src/app/globals.css`](src/app/globals.css); helpers tipados em
  [`src/lib/design/domain/tokens.ts`](src/lib/design/domain/tokens.ts).
  Os tokens de marca são **hex** (`--color-brand-wine: #47131C`), com uma
  camada de compatibilidade semântica para o shadcn. Não são OKLCH.
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

| O quê                      | Onde                                             |
| -------------------------- | ------------------------------------------------ |
| Singleton do Prisma        | `src/lib/shared/infrastructure/prisma-client.ts` |
| Schemas Zod compartilhados | `src/lib/shared/domain/zod-schemas.ts`           |
| Tokens de design           | `src/lib/design/domain/tokens.ts`                |
| `cn()` (merge de classes)  | `src/shadcn-utils/utils.ts`                      |
| Auth do admin (Edge-safe)  | `src/lib/auth/presentation/admin-auth.ts`        |
| Confirmação de pagamento   | `src/lib/orders/application/confirm-payment.ts`  |

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
```

`postinstall` roda `prisma generate` — não removê-lo.

## 5. Variáveis de ambiente

`DATABASE_URL`, `ADMIN_SECRET`, `AUTH_SECRET`, credenciais Mercado Pago,
Cloudinary e Resend. Lista canônica em `.env.example`.

- Em código server-side, ler via `process.env.*`.
- Em client-side só `NEXT_PUBLIC_*`.

> ⚠️ Ainda **não há validação de ambiente no boot** — a app sobe com variável
> faltando e quebra na primeira requisição que precisar dela. Está na Onda 0
> de [`docs/AUDITORIA-2026-10.md`](docs/AUDITORIA-2026-10.md).

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
  no servidor via Prisma (ver `src/app/api/checkout/route.ts`).
- Toda entrada externa passa por **Zod** (`src/lib/shared/domain/zod-schemas.ts`).
- Rate limit hoje existe **só no login admin**
  (`src/lib/auth/infrastructure/persistence/admin-login.ts`). As rotas públicas
  (`/api/contact`, `/api/newsletter`, `/api/reviews`, `/api/coupon/validate`,
  `/api/cep/[cep]`) estão sem — ver Onda 0 da auditoria.

### 6.3 Performance

- Imagens externas: usar `<Image>` do Next; domínios permitidos em
  `next.config.ts` (atualmente `res.cloudinary.com`).
- Animações pesadas (GSAP) são opt-in client-side; evitar carregar GSAP em
  RSC ou layout root.
- Prisma client é singleton — não instanciar manualmente.

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
