---
template: "Niche CLAUDE"
version: 1.0
status: "Ativo"
tags:
  - niche-claude
  - per-diretorio
  - hexagonal
  - domain
nicho: "design/domain"
escopo: "Camada Domain do bounded context design — tokens visuais puros"
---

# `src/lib/design/domain/` — Domain layer

> **Camada Domain (Hexagonal):** tokens visuais como primitivos puros. ZERO imports de framework.

## Diretrizes

- **Imports proibidos:** qualquer coisa de Next.js, Tailwind plugins, GSAP, framework UI.
- **Imports permitidos:** TypeScript stdlib apenas.
- **Convenção de nome:** valores em camelCase (`brandGold`, `brandChampagne`). Helpers começam com `resolve*` ou `get*`.
- **Funções são puras.** Sem side effects.

## Conteúdo

- `tokens.ts` — tokens de **motion do GSAP**, e só isso. Existe em TS
  porque o GSAP quer número (`duration: 0.8`) e easing nomeado
  (`power4.out`), não string CSS. Os outros 10 exports (cor em OKLCH,
  tipografia, spacing…) eram da paleta pré-rebrand, não tinham consumidor
  e foram apagados — ver §7.1 do `CLAUDE.md` de `src/lib/design/`.
- `bottle-profile.ts` — perfil paramétrico do frasco 3D: tipos, perfil padrão derivado de `public/assets/hero1.png`, e as funções puras que derivam silhueta, volume de líquido e tampa. **Sem Three.js aqui** — quem vira malha é `src/components/bottle-3d/`.
- `scene-palette.ts` — hex da cena 3D. Existe porque WebGL recebe string e
  desenha: `var(--color-scene-backdrop)` viraria preto. Espelha o
  `globals.css` com teste.
- `contrast.ts` — razão de contraste WCAG (luminância relativa, `passaAA`).
  Aritmética pura, sem dependência de CSS.

## Stack Local

TypeScript puro.

## Testes

- `src/test/bottle-profile.test.ts` — invariantes do frasco.
- `src/test/scene-palette.test.ts` — espelho do `globals.css`.
- `src/test/contrast-aa.test.ts` — pares de contraste declarados no CSS.
- `tokens.ts` não tem suite: são valores literais de motion.

## Referências

- CLAUDE.md de `src/lib/design/`
- `[[Preferencias Dev#3. Arquitetura Hexagonal]]`
