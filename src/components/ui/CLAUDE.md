# CLAUDE.md — `src/components/ui/`

> Primitivos de UI gerados pelo **shadcn/ui** (style `new-york`) + Radix
>
> - alguns motion helpers do projeto. **Esta pasta é parcialmente
>   "código gerado": trate as alterações com cuidado.**

---

## 1. O que mora aqui

Duas categorias:

1. **Primitivos shadcn** — gerados via `pnpm dlx shadcn@latest add <comp>`.
   Exemplos: `button.tsx`, `card.tsx`, `dialog.tsx`, `sheet.tsx`, `form.tsx`,
   `select.tsx`, `table.tsx`, `command.tsx`, `accordion.tsx`, ~50 outros.
2. **Motion / utilitários do projeto** — não shadcn, foram criados aqui:
   `fadeInUp.tsx`, `reveal-section.tsx`, `staggerContainer.tsx`,
   `split-text-animate.tsx`, `typewriter.tsx`, `animated-number.tsx`,
   `animated-price.tsx`.

## 2. Regras de edição

### Para primitivos shadcn:

- **Preferir reinstalar** (`pnpm dlx shadcn@latest add button --overwrite`)
  a editar à mão quando atualizar a versão.
- **Customizações permitidas**: alterar `cva` variants, adicionar tamanhos
  novos, ajustar tokens. **Manter API pública** (mesmas props) — outros
  componentes dependem.
- **Não remover componentes** mesmo que aparentemente sem uso — podem ser
  importados em rotas que você ainda não viu.
- Style oficial do projeto: **`new-york`** (definido em `components.json`).
  Não introduzir variantes de outros styles.

### Para os motion helpers locais:

- Não são shadcn — pode editar livremente.
- Documente props no topo do arquivo se ficar não-trivial.

## 3. Convenções shadcn

- **`cn()` helper**: importado de `@/shadcn-utils/utils` (peculiaridade do
  alias do projeto — `components.json` aponta `utils → @/shadcn-utils/utils`).
  Antes do rename de 2026-05-30 era `@/api/utils`.
- **`cva`** (`class-variance-authority`) para variants. Padrão:
  ```ts
  const buttonVariants = cva("base classes", {
    variants: { variant: { default: "...", outline: "..." } },
    defaultVariants: { variant: "default" },
  });
  ```
- **`asChild` + `Slot`**: respeitar a convenção Radix de delegar elemento.
- **`forwardRef`** em primitivos que recebem ref (React 19 mantém suporte,
  e shadcn usa).

## 4. Tokens e cores

- Classes Tailwind referenciam **variáveis CSS** definidas em
  `src/app/globals.css`: `bg-background`, `text-foreground`, `border-input`,
  `ring-ring`, etc.
- **Não hardcodar** cor em primitivo shadcn — quebra theming.
- Modo escuro vem via classe `.dark` no `<html>` (gerenciado por
  `next-themes`).

## 5. Ícones

- Library oficial: **`lucide-react`** (definido em `components.json`).
- Padronizar tamanho: `className="size-4"` (16px) para inline,
  `size-5` em botões maiores. Não misturar com `react-icons`.

## 6. Acessibilidade (Radix já cobre, mantenha)

- Não remover `aria-*` que o Radix injeta.
- Não envolver `<DialogTrigger>` em `<button>` extra — usa `asChild`.
- Manter `<VisuallyHidden>` em close buttons / labels invisíveis.

## 7. Não faça

- Não importar de `@/components/admin/*` aqui — `ui/` é genérico.
- Não importar do app (`@/app/*`).
- Não criar variantes que dependam de tokens que não existem em
  `globals.css`.
- Não substituir Radix por componente custom — perde a11y "de graça".
