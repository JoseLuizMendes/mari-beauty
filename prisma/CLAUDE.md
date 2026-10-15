# CLAUDE.md — `prisma/`

> Schema e migrações do banco. **Prisma 7** com **PostgreSQL** via
> `@prisma/adapter-pg`. Cliente gerado em [`src/generated/`](../src/generated/)
> — **não editar à mão.**

---

## 1. Conteúdo

- `schema.prisma` — modelo de dados:
  - **Catálogo/pedidos:** Product (com enum `Gender`), Order, OrderItem,
    Review, Coupon, ContactMessage, NewsletterSubscriber.
  - **Auth (Auth.js):** User, Account, Session, VerificationToken. Campos
    OAuth em snake_case são exigência do `@auth/prisma-adapter` — não
    renomear. `User.passwordHash` guarda o hash bcrypt das contas de
    credenciais (null em contas só-OAuth).
  - **Dados privados por usuário:** WishlistItem e CartItem, ambos com
    `userId` (FK `onDelete: Cascade`) e `@@unique([userId, productId])`.
  - **Segurança do admin:** AdminLoginAttempt (`key` @unique = IP, `attempts`,
    `lockedUntil`) — lockout do login admin via senha+TOTP.
- `seed.ts` — popula banco de dev (produtos já recebem `gender`). Script
  registrado em `package.json` (`"prisma": { "seed": "tsx prisma/seed.ts" }`).
- `sql/` — SQL manual (extensões, RLS, índices que o Prisma não cobre).

> Histórico: o banco de dev (Neon) vem sendo sincronizado via
> `prisma db push` (sem pasta `migrations/`). Mudanças aditivas (colunas com
> default, tabelas novas) são seguras por push. **Evitar `migrate dev` sobre
> esse banco sem baseline** — ele detecta drift e pode propor reset
> (perda de dados).

## 2. Fluxo de mudança de schema

1. Editar `schema.prisma`.
2. Em dev: `pnpm prisma migrate dev --name <descricao>` — cria migração e
   regenera client.
3. Em prod: `pnpm prisma migrate deploy` (CI/deploy hook).
4. Após mudar schema, **sempre** rodar `pnpm prisma generate` (já roda em
   `postinstall` e em `pnpm build`).
5. Atualizar `seed.ts` se a mudança quebrar dados existentes.

**Nunca rodar `prisma db push`** em produção — só é aceitável em scratch
local que vai ser descartado.

## 3. Convenções do schema

- **IDs**: `String @id @default(uuid())` (já é o padrão).
- **Timestamps**: `createdAt DateTime @default(now())` +
  `updatedAt DateTime @updatedAt`.
- **Decimal monetário**: `Decimal @db.Decimal(10, 2)`. **Nunca `Float`**.
- **Enums em UPPERCASE** (`ProductStatus.NORMAL`, `OrderStatus.PENDING`).
- **`@@map("snake_case")`** para o nome real da tabela; modelos no client
  em PascalCase.
- **Relações** sempre com `onDelete` explícito (`Cascade`, `SetNull`,
  `Restrict`) — não deixar default implícito.
- **Índices**: `@@index([campoConsultado])` em campos usados em
  `where`/`orderBy` frequentes. Slug e foreign keys já indexados via
  `@unique`/`@relation`.

## 4. Migrações

- Uma migração por mudança lógica. Nome descritivo:
  `add_promotion_window_to_product`, não `update`.
- **Nunca editar migração já aplicada em prod.** Para corrigir, criar nova
  migração.
- Cuidado com migrações destrutivas (`DROP COLUMN`, `ALTER TYPE`) — em prod
  exigem janela de manutenção ou estratégia em duas fases (deploy código
  novo que aceita ambos os formatos → migra dados → deploy que remove
  fallback).
- SQL custom (extensões `uuid-ossp`, RLS, full-text) vai em `sql/` e é
  aplicado manualmente ou via migração customizada.

## 5. Seed

- `seed.ts` deve ser **idempotente**: rodar duas vezes não duplica.
  Usar `upsert` por slug/email/etc.
- Dados de seed são de **demonstração**, não realistas-realistas.
- Não comitar seed com PII ou credenciais.

## 6. Performance

- **N+1**: usar `include` / `select` no Prisma para trazer relações em uma
  query. Em loops, prefira `findMany` único com `where: { id: { in } }`.
- **Pagination**: cursor-based para listas longas; offset só para admin.
- **Connection pool**: gerenciado pelo `Pool` em `src/lib/shared/infrastructure/prisma-client.ts`.
  Em ambiente serverless, considerar PgBouncer/Neon pooler.

## 7. Status de ciclo de vida (Product/Order)

O domínio tem máquinas de estado documentadas no schema (`ProductStatus`,
`OrderStatus`). Transições válidas:

- **Order**: `PENDING → PAID → SHIPPED → DELIVERED` (ou `CANCELED` de
  qualquer ponto antes de `SHIPPED`).
- **Product**: `NORMAL ↔ PROMOTION`, `COMING_SOON → NORMAL`,
  `* → DISCONTINUED`.

Lógica de transição vive em `src/lib/products/domain/product-status.ts` — não duplicar.

## 8. Não faça

- Não editar `src/generated/` (regerado em todo build).
- Não usar `Float` para dinheiro.
- Não criar relação sem `onDelete` explícito.
- Não rodar `migrate dev` em branch sem commitar a migration; vai
  divergir do time.
- Não usar `$queryRaw` quando uma query Prisma tipada resolve.
