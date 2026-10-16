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

## 9. Contraste (WCAG 2.1 AA)

`src/test/contrast-aa.test.ts` lê o `globals.css`, resolve a cadeia de
`var()` até o hex e checa os pares **que o próprio CSS declara como par**,
nos dois temas. Checar par declarado, e não todas as combinações, é
deliberado: combinar 167 tokens dois a dois daria 13.861 pares, quase todos
irreais, e relatório que ninguém lê não protege nada.

A aritmética fica em [`domain/contrast.ts`](domain/contrast.ts) — pura,
testável, sem dependência de CSS.

### O que passa

Todos os sete pares de texto, nos dois temas, e o anel de foco.

|                                                  | Razão      |                   |
| ------------------------------------------------ | ---------- | ----------------- |
| `--foreground` sobre `--background` (claro)      | 17,46:1    | ✓                 |
| `--primary-foreground` sobre `--primary` (claro) | 14,86:1    | ✓                 |
| `--ring` sobre `--background` (claro)            | 14,86:1    | ✓                 |
| **`--muted-foreground` sobre `--muted` (claro)** | **4,52:1** | ⚠️ passa por 0,02 |

> **O `--muted-foreground` está no fio da navalha.** O mínimo é 4,5:1 e ele
> dá 4,52:1. Qualquer escurecimento do fundo ou clareamento da tinta
> reprova. O teste pega — é literalmente por isso que ele existe.

### O que reprova, e por que não foi corrigido aqui

**WCAG 1.4.11 (componentes não-textuais, mínimo 3:1):**

| Token      | Tema claro | Tema escuro |
| ---------- | ---------- | ----------- |
| `--input`  | **1,58:1** | **2,15:1**  |
| `--border` | 1,21:1     | 1,55:1      |

O `--input` é violação real: o `Input` é `bg-transparent` no tema claro, então
**a borda é a única coisa que marca onde o campo está**. Não é só número —
é "onde eu clico pra digitar".

O `--border` em card é discutível: o card tem `bg-card` e `--shadow-card`,
e borda de agrupamento que não identifica controle nem estado é
tratada como decorativa pela norma. Fica registrado, não afirmado.

**Nenhum dos dois foi corrigido aqui, de propósito.** A correção exige
escolher uma cor nova, e a identidade visual final — que redefine a paleta
inteira — ainda não chegou. Escolher agora é escolher duas vezes, e inventar
valor de marca não é decisão de quem escreve o teste.

### Quando a identidade final entrar

Rodar este teste é a **primeira** coisa a fazer. Ele é a diferença entre
descobrir o problema com a paleta na mão e descobrir depois de a marca estar
aplicada em dezenas de componentes. E aí o `--input` entra junto na mesma
decisão.

---

## Referências

- `[[Preferencias Dev#3. Arquitetura Hexagonal]]`
- CLAUDE.md global do projeto
- `src/app/globals.css` — variáveis CSS espelhadas
