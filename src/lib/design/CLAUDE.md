---
template: "Niche CLAUDE"
version: 1.0
status: "Ativo"
tags:
  - niche-claude
  - per-diretorio
  - bounded-context
  - hexagonal
  - design
nicho: "design"
escopo: "Bounded context Design — tokens visuais (OKLCH palette, tipografia, espaçamento)"
---

# `src/lib/design/` — Bounded Context Design

> **Hexagonal Architecture** — bounded context **design/** centraliza tokens visuais. Sem `application/`, `infrastructure/`, `presentation/` próprios — tokens são primitivos puros.
>
> Gerado na **Rodada 4.2** (2026-05-30) conforme `[[Ecommerce/Belessence/03-Planejamento]]`.

---

## 1. Escopo

- Paleta Mari Beauty em **hex**: wine `#47131C`, rosé `#FFD7E7`, marfim `#FFFDE9`
- Tipografia, espaçamento, sizing
- Perfil paramétrico do frasco 3D (`bottle-profile.ts`)

Tudo o que descreve **como o produto Mari Beauty parece** vive aqui. Mudanças aqui afetam TODO o sistema visual.

---

## 2. Estrutura Hexagonal

```
src/lib/design/
├── domain/
│   ├── tokens.ts           # ex-`src/lib/design-tokens.ts`
│   └── bottle-profile.ts   # frasco 3D como dado — spec 001
└── CLAUDE.md
```

Sem `application/`/`infrastructure/`/`presentation/`: design tokens não têm regras de negócio — são primitivos.

---

## 3. Diretrizes

- **Tokens são fonte da verdade.** Componentes que usam cores/fontes/espaçamento DEVEM importar daqui — nunca hardcode hex/RGB no componente.
- **Tailwind config** lê valores daqui via `tailwind.config.ts` (quando aplicável — Tailwind v4 lê do CSS).
- **Mudanças de paleta:** atualizar `tokens.ts` + `globals.css` (variáveis CSS) juntos. Sem isso, fica drift entre TS e CSS.

---

## 4. Stack Local

- TypeScript puro. Sem deps externas. Sem framework imports.

---

## 5. Testes

- `tokens.ts`: sem suite dedicada — valores literais, testes seriam tautológicos.
- `bottle-profile.ts`: `src/test/bottle-profile.test.ts` cobre as invariantes de geometria (líquido dentro da cavidade, tampa no topo, raio limitado).

---

## 6. Dependências Permitidas

Nenhuma — domain puro.

---

## 7. Histórico

- **2026-05-30 (Rodada 4.2):** `src/lib/design-tokens.ts` → `src/lib/design/domain/tokens.ts`. 1 consumer (`gsap-utils.ts`) atualizado.

---

## Referências

- `[[Preferencias Dev#3. Arquitetura Hexagonal]]`
- CLAUDE.md global do projeto
- `src/app/globals.css` — variáveis CSS espelhadas
