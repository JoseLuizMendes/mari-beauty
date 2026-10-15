---
template: "Niche CLAUDE"
version: 1.0
status: "Ativo"
tags:
  - niche-claude
  - per-diretorio
  - shadcn
nicho: "shadcn-utils"
escopo: "Helpers consumidos pelos primitivos shadcn — utils.ts (cn, formatPrice) + futura busca"
---

# `src/shadcn-utils/`

> **Esta pasta foi renomeada de `src/api/` em 2026-05-30 (Rodada 3).**
>
> **Não contém endpoints HTTP.** Endpoints HTTP ficam em
> [`src/app/api/`](../app/api/) (Route Handlers do App Router).
>
> Esta pasta existe por causa do **alias do shadcn**: `components.json` mapeia
> `"utils": "@/shadcn-utils/utils"` e `"lib": "@/shadcn-utils"`. Os helpers
> consumidos pelos primitivos shadcn vivem aqui.

---

## 1. Conteúdo atual

| Arquivo    | Papel                                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------------------- |
| `utils.ts` | `cn()` (twMerge + clsx) e `formatPrice()` (BRL)                                                       |
| `search/`  | Reservado para utilities de busca (autocomplete, fuzzy) consumidas por Client Components — hoje vazio |

---

## 2. Diretrizes Específicas

1. **Não duplicar lógica de `src/lib/`.** Se algo é regra de negócio, vai em `lib/`. Aqui só helpers de UI / fetch wrappers.
2. **`cn()` é o único helper de classes** — sempre importar daqui em componentes shadcn (`@/shadcn-utils/utils`).
3. **`formatPrice()` é a forma canônica de exibir preço.** Não inventar `formatBRL()` paralelo.
4. **Clientes HTTP daqui** consomem `/api/*` (Route Handlers) e só são usados em **Client Components**. RSC chama `src/lib/*-db` direto.
5. **Tipos compartilhados com Route Handler:** se ambos os lados precisam, defina em `src/lib/` e importe nos dois.

---

## 3. Stack Local

- TypeScript 5 (strict)
- `clsx` + `tailwind-merge` (para `cn()`)
- `Intl.NumberFormat` (para `formatPrice()`)

---

## 4. Testes

Componentes que usam `cn()` / `formatPrice()` são testados nos próprios testes via Vitest. Sem testes dedicados a `utils.ts` ainda — funções são triviais o suficiente.

---

## 5. Dependências Permitidas

Apenas helpers internos. Sem novas libs sem registrar em `[[05-Dev-Log]]`.

---

## 6. Não faça

- Não fazer fetch para domínios externos daqui — proxies vão em `src/app/api/*`.
- Não importar Prisma aqui (boundary client/server).
- Não logar erros silenciosamente em wrappers de fetch; propagar para quem chamou tratar.

---

## 7. Histórico

- **2026-05-30 (Rodada 3):** renomeado de `src/api/` → `src/shadcn-utils/`. Motivo: o nome `api/` era enganoso e confundia com `src/app/api/` (Route Handlers HTTP). Mudança envolveu `git mv` + update de `components.json` aliases + replace `@/shadcn-utils/` → `@/shadcn-utils/` em 72 arquivos. Registrado em `[[Ecommerce/Belessence/05-Dev-Log]]`.

---

## Referências

- `CLAUDE.md` global do projeto (raiz)
- `[[Preferencias Dev]]` — stack aprovada
- `[[Niche CLAUDE Template]]` — template canon
- `[[Ecommerce/Belessence/03-Planejamento]]` — Rodada 3 da refatoração
