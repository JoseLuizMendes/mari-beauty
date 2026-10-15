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

- `tokens.ts` — paleta (hex) + tipografia + spacing + helpers.
- `bottle-profile.ts` — perfil paramétrico do frasco 3D: tipos, perfil padrão derivado de `public/assets/hero1.png`, e as funções puras que derivam silhueta, volume de líquido e tampa. **Sem Three.js aqui** — quem vira malha é `src/components/bottle-3d/`.

## Stack Local

TypeScript puro.

## Testes

- `src/test/bottle-profile.test.ts` — invariantes do frasco.
- `tokens.ts` não tem suite: são valores literais.

## Referências

- CLAUDE.md de `src/lib/design/`
- `[[Preferencias Dev#3. Arquitetura Hexagonal]]`
