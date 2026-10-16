# CLAUDE.md — `src/components/`

> Componentes React do domínio Belessence. Subpastas têm regras próprias:
>
> - [`ui/`](ui/CLAUDE.md) — primitivos shadcn/Radix (não editar à toa)
> - [`admin/`](admin/CLAUDE.md) — componentes do painel admin
> - [`providers/`](providers/CLAUDE.md) — providers globais
> - `auth/` — autenticação do cliente: `auth-form` (login/cadastro),
>   `auth-dialog` (modal de bloqueio de ações), `auth-panel` (páginas
>   /entrar e /cadastro), `account-menu` (header) e `auth-data-sync`
>   (hidrata carrinho/favoritos no login, limpa no logout).

---

## 1. Tipos de componente nesta pasta

1. **Componentes de domínio** (ex.: `product-card.tsx`, `cart-sheet.tsx`,
   `hero.tsx`, `newsletter.tsx`) — compõem a UI da loja.
2. **`*-client.tsx`** (ex.: `checkout-client.tsx`,
   `product-details-client.tsx`) — wrappers Client que recebem dados de RSC
   via props e adicionam interatividade (estado, motion, Zustand).

## 2. Decisão: Server ou Client?

| Precisa de...                                  | Tipo                 |
| ---------------------------------------------- | -------------------- |
| Renderizar dados, layout, slot                 | **Server** (default) |
| `useState`, `useEffect`, hook custom           | Client               |
| Animação GSAP, Lenis, Embla                    | Client               |
| Zustand store (`cart-store`, `wishlist-store`) | Client               |
| `react-hook-form`                              | Client               |
| `next-themes`, `nuqs`                          | Client               |

Padrão de composição: **Server faz fetch e passa dados como prop** para um
`*-client.tsx` filho.

## 3. Estilo visual

1. **Cor vive em `src/app/globals.css`** — é a fonte. **Nunca usar
   cor/espaçamento hardcoded.** Use token (`bg-primary`, `text-foreground`,
   `border-border`, `bg-brand-wine`, `text-ink-muted`).
   `@/lib/design/domain/tokens` tem **só motion do GSAP**, não cor.
   ⚠️ **Não escreva `/NN` em cor de marca:** `bg-brand-wine/80`,
   `text-brand-pink/60`, `bg-surface-base/90` **não geram CSS nenhum** —
   não é 80% de wine, é nada. São 165 classes mortas já no `src/`. Opacidade
   só funciona em cor registrada no `@theme`: `bg-muted/50`,
   `border-border/40`, `bg-primary/10`. Ver §7.2 de
   [`../lib/design/CLAUDE.md`](../lib/design/CLAUDE.md).
2. **Paleta** é a Mari Beauty: wine (`#47131C`), rosé (`#FFD7E7`) e
   marfim (`#FFFDE9`), definida em `src/app/globals.css`. Os valores são
   **hex**, não OKLCH. Nunca hardcodar — use os tokens.
3. **Tipografia**: Poppins (sans, em uso atualmente no `layout.tsx`).
   Playfair foi mencionada no design — verifique tokens antes de aplicar.
4. **Espaçamento**: respeitar a escala do Tailwind v4 (4px grid). Evitar
   valores arbitrários `[12px]` — usar `space-3`, `gap-6`, etc.

## 4. Composição e props

- **Props mínimas**: receba só o necessário; nunca passe objeto Prisma
  inteiro se só usa 3 campos.
- **Children > slots opcionais com tipos confusos**. Prefira composição
  explícita.
- **Sem prop-drilling profundo** (> 3 níveis). Considere
  composition pattern ou contexto local.
- **Tipos**: definir `interface Props` no arquivo do componente; não
  exportar a não ser que outro componente importe.

## 5. Animações

- **GSAP** é o motion engine padrão. Usar `@gsap/react`'s `useGSAP()`
  dentro de Client Components.
- Helpers em [`@/lib/motion/presentation/gsap-helpers`](../lib/motion/presentation/gsap-helpers.ts) (bounded context Motion).
- **Lenis** (smooth scroll) é montado uma vez em
  [`providers/lenis-provider.tsx`](providers/lenis-provider.tsx) — não
  duplicar.
- Componentes utilitários de motion existentes em `ui/`:
  `fadeInUp.tsx`, `reveal-section.tsx`, `staggerContainer.tsx`,
  `split-text-animate.tsx`, `typewriter.tsx`, `animated-number.tsx`,
  `animated-price.tsx`. **Reutilize antes de criar novo.**

## 6. Acessibilidade (a11y)

- Todo input com `<Label htmlFor>`.
- Botões: `<Button>` com texto claro **ou** `aria-label` quando icon-only.
- Dialogs/Sheets do Radix já têm focus trap — não criar custom modal.
- Imagens: `alt` obrigatório (string vazia se decorativo).
- Contraste: respeitar tokens (foreground/background do shadcn já cobrem
  AA).

## 7. Performance

- **`use client` infecta a árvore**: tudo importado fica no bundle do
  client. Mantenha client components folha.
- Lazy load com `next/dynamic({ ssr: false })` para libs pesadas
  (calendar, chart, recharts).
- `next/image` para tudo que seja imagem; nunca `<img>` cru.
- Evitar montar GSAP em layout root — só onde a animação acontece.

## 8. Naming

- Arquivo: `kebab-case.tsx` exportando `PascalCase`.
- Variantes via `class-variance-authority` (cva) — convenção shadcn.
- Hooks em arquivo separado em `lib/hooks/`, nunca dentro do componente.

## 9. Não faça

- Não importar de `@/app/*` em um componente — direção errada.
- Não chamar `prisma` em componente client — proibido por boundary.
- Não usar `framer-motion` (stack do projeto é GSAP).
- Não criar primitivos UI duplicados — verifique [`ui/`](ui/) antes.
