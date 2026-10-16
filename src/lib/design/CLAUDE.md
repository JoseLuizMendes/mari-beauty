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

- Perfil paramétrico do frasco 3D (`bottle-profile.ts`)
- Cor da cena 3D (`scene-palette.ts`) — espelho de `--color-scene-backdrop`
- Aritmética de contraste WCAG (`contrast.ts`)
- `tokens.ts` — material de referência do estudo de design; **não** é a
  paleta em uso (ver §7.1)

> ⚠️ **A paleta Mari Beauty não vive aqui.** Ela vive em
> [`src/app/globals.css`](../../app/globals.css): wine `#47131C`, rosé
> `#FFD7E7`, marfim `#FFFDE9`. Esta seção afirmava o contrário e estava
> errada — ver §7.1.

---

## 2. Estrutura Hexagonal

```
src/lib/design/
├── domain/
│   ├── tokens.ts           # ex-`src/lib/design-tokens.ts` — ver §7.1
│   ├── bottle-profile.ts   # frasco 3D como dado — spec 001
│   ├── scene-palette.ts    # hex da cena 3D (WebGL não lê var())
│   └── contrast.ts         # razão de contraste WCAG — aritmética pura
└── CLAUDE.md
```

Sem `application/`/`infrastructure/`/`presentation/`: design tokens não têm regras de negócio — são primitivos.

---

## 3. Diretrizes

- **`globals.css` é a fonte da verdade de cor.** Componente usa token
  (`bg-primary`, `text-ink-muted`, `bg-scene-backdrop`) — nunca hex/RGB
  solto. Isto não mudou; o que mudou é de onde o token vem.
- **Cor nova:** declarar em `globals.css`. Se ficar fora do `@theme inline`
  — como as `--color-brand-*`, `--color-ink-*` e `--color-scene-backdrop`
  ficam — o utilitário **precisa ser declarado à mão** no
  `@layer utilities`, senão a classe não gera CSS e o estilo some em
  silêncio.
- **Espelho em TS só com motivo técnico:** o renderizador não lê CSS.
  Hoje são dois (`scene-palette.ts` aqui, `../seo/domain/og-palette.ts` lá), e
  cada um tem teste de espelho. Não crie um terceiro por conveniência.
- **Não** mande ninguém "adicionar ao `tokens.ts` primeiro". Era o que esta
  seção dizia, e seguir isso leva a cor para um arquivo que ninguém lê.

---

## 4. Stack Local

- TypeScript puro. Sem deps externas. Sem framework imports.

---

## 5. Testes

- `tokens.ts`: sem suite dedicada — valores literais, e hoje quase todos
  sem consumidor (§7.1).
- `bottle-profile.ts`: `src/test/bottle-profile.test.ts` cobre as invariantes de geometria (líquido dentro da cavidade, tampa no topo, raio limitado).
- `scene-palette.ts`: `src/test/scene-palette.test.ts` — espelho do
  `globals.css` **e** existência do utilitário `.bg-scene-backdrop`.
- `contrast.ts`: `src/test/contrast-aa.test.ts` (ver §9).

---

## 6. Dependências Permitidas

Nenhuma — domain puro.

---

## 7. Histórico

- **2026-05-30 (Rodada 4.2):** `src/lib/design-tokens.ts` → `src/lib/design/domain/tokens.ts`. 1 consumer (`gsap-utils.ts`) atualizado.

### 7.1 O que o `tokens.ts` realmente é

Três `CLAUDE.md` afirmavam que ele é a fonte única de cor em TypeScript e
que componente **deve** importar dele. Medido em 2026-10-16, nenhuma das
três afirmações era verdadeira:

| Afirmação                                | Realidade                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| "Paleta Mari Beauty em **hex**"          | `colors` é gold/ivory em **OKLCH** — a paleta anterior ao rebrand         |
| "Componentes DEVEM importar daqui"       | **0** componentes importam                                                |
| "Fonte única; `globals.css` é o espelho" | É o contrário: `globals.css` é a fonte e nada em TS espelha a paleta dela |

Dos **11 exports**, **10 têm zero consumidor** (`colors`, `typography`,
`spacing`, `radius`, `gradients`, `shadows`, `breakpoints`, `glass`,
`grid`, `lorealSystem`). O único vivo é **`motion`**, importado por
`src/lib/motion/presentation/gsap-helpers.ts`.

**Por que isso importa mais do que parece:** o `og-palette.ts` já tinha
registrado no cabeçalho dele que `tokens.ts` divergia — e a nota ficou lá,
sozinha, enquanto os `CLAUDE.md` continuavam mandando o próximo agente para
o arquivo errado. Seguir a instrução ao pé da letra para a cor da cena 3D
teria enterrado um token novo num arquivo que ninguém lê.

É o mesmo P0.4 da auditoria (caminho morto no `CLAUDE.md`), só que em prosa
— e o `claude-md-paths.test.ts` diz explicitamente que não pega prosa. Os
caminhos continuam verificados; as **afirmações** não.

**O que NÃO foi feito aqui:** apagar os 10 exports mortos. É material do
estudo de referência (Byredo/Aesop/MFK/L'Oréal) e a decisão de descartar ou
reaproveitar é do dev, não de quem passou por aqui corrigindo hex.

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
