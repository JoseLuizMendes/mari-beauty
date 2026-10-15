# CLAUDE.md — `src/`

> Camada de código-fonte. Regras transversais a todos os subdiretórios.

---

## 1. Mapa do diretório

| Pasta           | Papel                                                                |
| --------------- | -------------------------------------------------------------------- |
| `app/`          | App Router: páginas, layouts, Route Handlers, route groups.          |
| `components/`   | Componentes React (UI shadcn + de domínio + admin).                  |
| `lib/`          | Lógica server-side, acesso ao banco, regras de negócio, stores.      |
| `lib/hooks/`    | React hooks client-only.                                             |
| `shadcn-utils/` | Utilitários do shadcn (alias `@/shadcn-utils` em `components.json`). |
| `test/`         | Setup e suites Vitest.                                               |
| `generated/`    | **Prisma client gerado — proibido editar.**                          |
| `middleware.ts` | Auth de `/admin/*` e `/api/admin/*`.                                 |

## 2. Regras de fronteira (importantes)

Manter direções de import unidirecionais para evitar ciclos e leaks
client/server:

```
app/    ──┐
          ├──► components/  ──► lib/
admin/  ──┘                    ▲
                               │
          components/admin/ ───┘
```

- `lib/` **não importa** de `components/` ou `app/`.
- `components/` **não importa** de `app/`.
- `app/api/*` (Route Handlers) consome **apenas** `lib/`, nunca
  `components/`.
- `lib/hooks/` é client-only — não importar dentro de `lib/*.ts` que rode
  no server.

## 3. Server vs Client — checklist mental

Antes de adicionar `"use client"`:

1. Preciso de `useState`, `useEffect`, `useRef`, evento de DOM, ou contexto
   client? Se **não**, deixe RSC.
2. O componente fala com browser APIs (window, localStorage)? → client.
3. Usa Zustand, GSAP, React Hook Form, `nuqs`, `next-themes`? → client.
4. Faz apenas render baseado em props/dados? → **RSC** (default).

**Composition pattern**: passe Server Components como `children` para
Client Components em vez de tornar a árvore inteira client.

## 4. Boundaries de dados

- Acesso ao Prisma só em arquivos server (sem `"use client"`) e Route
  Handlers. Para garantir, prefira importar `prisma` apenas em
  `src/lib/*-db.ts` e nos handlers de `app/api/`.
- Schemas Zod em [`src/lib/shared/domain/zod-schemas.ts`](lib/shared/domain/zod-schemas.ts) são
  **compartilhados** client+server (forms + handlers).
- Tipos do Prisma podem ser re-exportados de `lib/` para uso em
  componentes; **nunca** importar de `src/generated/` direto fora de
  `lib/`.

## 5. Estilo, naming, organização

- **Componentes**: `PascalCase` em arquivos `kebab-case.tsx`
  (ex.: `product-card.tsx` exporta `ProductCard`).
- **Hooks**: `use-*.ts` → exportam `useFoo`.
- **Server libs**: nome funcional (`products-db.ts`, `coupons.ts`).
- **Rotas pt-BR**: pastas em pt-BR (`/sobre`, `/contato`). Componentes
  ainda em inglês.
- **Sem default exports** para utilitários — apenas para pages/layouts
  (exigência do App Router).

## 6. Erros e respostas

- Em Route Handlers: sempre `try/catch` com `NextResponse.json({error}, {status})`.
- Em RSC: deixar Next renderizar `error.tsx` mais próximo; não esconder
  erros com fallback silencioso.
- No client: toasts com `sonner` (já configurado em `app/layout.tsx`).
