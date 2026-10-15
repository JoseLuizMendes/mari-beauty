# CLAUDE.md — `src/app/`

> Diretório do **App Router** do Next.js 16. Páginas, layouts, route
> handlers e route groups vivem aqui.

---

## 1. Anatomia das rotas

| Convenção                          | Arquivo                                    |
| ---------------------------------- | ------------------------------------------ |
| Página                             | `page.tsx`                                 |
| Layout (compartilhado/persistente) | `layout.tsx`                               |
| Template (remount por navegação)   | `template.tsx`                             |
| Loading UI                         | `loading.tsx`                              |
| Error boundary                     | `error.tsx` (Client) ou `global-error.tsx` |
| Not found                          | `not-found.tsx`                            |
| Route Handler                      | `route.ts`                                 |
| Route group (não vira URL)         | `(grupo)/`                                 |
| Param dinâmico                     | `[slug]/page.tsx`                          |

Rotas pt-BR atuais: `/`, `/sobre`, `/contato`, `/ajuda`, `/favoritos`,
`/meus-pedidos`, `/checkout`, `/sucesso/[id]`, `/collections/[slug]`,
`/product/[slug]`, `/allProducts`, `/entrar`, `/cadastro`, `/admin/*`.

**Autenticação do cliente (Auth.js v5):** o route handler
`api/auth/[...nextauth]/route.ts` expõe `/api/auth/*`. As páginas `/entrar`
e `/cadastro` usam `AuthPanel`. A sessão é JWT (provider de credenciais);
config em [`src/lib/auth/infrastructure/external/auth.ts`](../lib/auth/infrastructure/external/auth.ts). **É separada do admin** —
`/admin/*` continua protegido pelo cookie `admin_session` no middleware,
que **não** foi alterado. `/checkout` valida sessão no servidor (`auth()`)
e redireciona para `/entrar?callbackUrl=/checkout` se deslogado.

## 2. Regras de RSC (default)

1. `page.tsx` e `layout.tsx` são **Server Components**. Não adicione
   `"use client"` aqui — extraia a parte interativa para um componente
   filho em `components/*-client.tsx` (padrão já adotado:
   `checkout-client.tsx`, `favoritos-client.tsx`, `product-details-client.tsx`).
2. **Data fetching em RSC**: chamar funções de `@/lib/*-db` direto. Não
   fazer `fetch('/api/...')` dentro de RSC.
3. **Params/searchParams**: no Next 15+, são **Promise**. Aguardar:
   ```ts
   export default async function Page({
     params,
   }: {
     params: Promise<{ slug: string }>;
   }) {
     const { slug } = await params;
   }
   ```
4. Server Components podem ser `async`. Client Components **não**.

## 3. Metadata e SEO

- Layout raiz exporta `metadata` com `title.template`. Páginas
  individuais devem exportar `metadata` ou `generateMetadata(props)` com
  `title` específico — o template formata para `"X | Mari Beauty"`.
- Pages dinâmicas (`[slug]/page.tsx`) usam `generateMetadata` para puxar
  título/descrição do produto.
- Para Open Graph com imagem dinâmica, usar `opengraph-image.tsx` no
  segmento.

## 4. Caching e revalidação (Next 16)

- Por padrão, **fetches são uncached** no Next 15+. Para cachear:
  `fetch(url, { cache: 'force-cache' })` ou rota estática.
- Para invalidar após mutação (admin):
  - `revalidatePath('/path')` ou `revalidateTag('tag')` dentro de Route
    Handlers/Server Actions.
- `dynamic = 'force-static' | 'force-dynamic'` em casos extremos; preferir
  deixar Next inferir.

## 5. Server Actions

- Quando usar: mutations disparadas por form/UI sem necessidade de API
  pública. Marcar com `"use server"` no topo da função/arquivo.
- Validar input com Zod **antes** de tocar no Prisma.
- Sempre `revalidatePath`/`revalidateTag` ao final para refletir UI.
- Tratar erros retornando objeto `{ error: string }`; não jogar exceção
  silenciosa.

## 6. Route Groups e organização

- `(authenticated)` em `app/admin/` agrupa páginas que dependem de cookie
  válido — **a proteção real é o middleware**, o grupo é apenas
  organizacional.
- Não criar route group novo apenas para "agrupar visualmente"; tem custo
  de leitura.

## 7. Loading e error

- Toda página com fetch lento deve ter `loading.tsx` no segmento.
- `error.tsx` é **Client Component** obrigatório (`"use client"`), recebe
  `{ error, reset }`.
- Não capture o erro só para silenciar — logue (e em prod envie para
  observabilidade quando existir).

## 8. Não faça

- Não importar de `components/admin/*` dentro de rotas públicas (vaza
  bundle).
- Não usar `next/router` (Pages Router). Use `next/navigation`
  (`useRouter`, `usePathname`, `useSearchParams`).
- Não fazer redirect com `window.location` — `redirect()` em RSC ou
  `router.push()` em client.
- Não criar `layout.tsx` que apenas envolva `<div>{children}</div>` sem
  motivo; é peso extra na árvore.
