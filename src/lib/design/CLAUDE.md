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

## 8. Escala de espaçamento (8pt)

Os seis passos vivem no `@theme` do
[`globals.css`](../../app/globals.css) e geram utilitários nomeados:

| Token               | Valor | Utilitário             | Uso                                  |
| ------------------- | ----- | ---------------------- | ------------------------------------ |
| `--spacing-tight`   | 8px   | `p-tight`, `gap-tight` | ícone↔rótulo, inline apertado        |
| `--spacing-control` | 16px  | `px-control`           | padding de controle, item de lista   |
| `--spacing-card`    | 24px  | `p-card`               | padding de card, blocos relacionados |
| `--spacing-block`   | 32px  | `gap-block`            | entre componentes de uma seção       |
| `--spacing-section` | 48px  | `py-section`           | padding interno de seção             |
| `--spacing-rhythm`  | 64px  | `mt-rhythm`            | ritmo vertical entre seções          |

### Por que os nomes são semânticos e não numéricos

No Tailwind v4 a escala numérica (`p-4`, `gap-2`) deriva de um multiplicador
único, `--spacing` (0.25rem), enquanto o namespace `--spacing-*` gera
utilitários **nomeados**. Um token chamado `--spacing-1` sequestraria o `p-1`:
há **1.038 utilitários numéricos** em `src/`, e todos mudariam de valor sem
ninguém notar. Nome semântico elimina a colisão — e ainda cumpre a §9 do
`[[Design System Blueprint]]`, que manda nomear pelo significado.

> Verificado no CSS do build: `.p-card{padding:1.5rem}` ao lado de
> `.p-4{padding:calc(var(--spacing)*4)}`, com `--spacing:.25rem` intacto.

### Regra

**Espaçamento novo usa os passos nomeados.** Se o valor que você quer não
está na tabela, o problema é o valor, não a tabela — a grade de 8pt é o
contrato. `src/test/spacing-scale.test.ts` recusa passo fora da grade e
recusa nome numérico.

### O que ainda não foi migrado

**469 dos 1.170 usos de espaçamento (40%) estão fora da grade de 8pt** —
`p-1`, `p-3`, `p-5` e afins. Eles **não** foram migrados: sem teste de
regressão visual, trocar 469 valores de uma vez é mudar o layout do site
inteiro às cegas. A migração acontece por componente, conforme cada um for
tocado por outro motivo.

> `tokens.ts` exporta um `spacing` que são **strings de classe** com presets
> responsivos de seção, não valores — e hoje sem nenhum consumidor. Não é a
> escala; não confundir.

---

## Referências

- `[[Preferencias Dev#3. Arquitetura Hexagonal]]`
- CLAUDE.md global do projeto
- `src/app/globals.css` — variáveis CSS espelhadas
