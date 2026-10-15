---
template: "Niche CLAUDE"
version: 1.0
status: "Ativo"
tags:
  - niche-claude
  - per-diretorio
nicho: "public"
escopo: "Arquivos estáticos servidos por Next.js"
---

# public

> **Nota de Uso:** Acessados via `/<path>`. Imagens devem ser otimizadas pelo `<Image>` quando possível. Cloudinary é o storage primário; aqui são fallbacks / arquivos locais.
>
> Gerado por `tools/generate-claude-md.js` em 2026-05-30 conforme regra **R8** (`[[CLAUDE]]` raiz + `[[Preferencias Dev#4. CLAUDE.md Universal]]`).

---

## Escopo do Diretório

Acessados via `/<path>`. Imagens devem ser otimizadas pelo `<Image>` quando possível. Cloudinary é o storage primário; aqui são fallbacks / arquivos locais.

---

## Diretrizes Específicas

- Arquivos servidos como estáticos via `/path/file.ext`.
- Imagens grandes preferencialmente no Cloudinary (`res.cloudinary.com`) — aqui só fallbacks / favicons / arquivos pequenos.
- Sem código executável.
- **Todo PNG/JPG tem par AVIF + WebP.** Asset novo entra por
  `pnpm imagens:otimizar` (`scripts/otimizar-imagens.mjs`), que varre este
  diretório e gera os dois derivados ao lado do original. O original fica: é a
  fonte para reconverter quando a matriz de qualidade mudar.
- **O original não é apagado nem renomeado.** O `<Image>` do Next deriva os
  breakpoints a partir dele, e `images.formats` no `next.config.ts` já negocia
  AVIF/WebP na entrega — inclusive para as fotos do Cloudinary, que nenhum
  script local converte.
- **Caminho citado em `src/` precisa existir aqui.** Em 2026-10-15 havia onze
  que não existiam, incluindo o `placeholder.svg` que é o fallback de todo
  produto sem foto. Hoje `src/test/asset-refs.test.ts` falha o CI quando isso
  volta a acontecer.

---

## Stack Local

Arquivos estáticos (PNG/JPG + derivados AVIF/WebP, SVG, MP4). Sem código.
Conversão via `sharp` (devDependency).

---

## Testes

`src/test/asset-refs.test.ts` — verifica que todo asset citado no código
existe e que todo raster tem par AVIF/WebP.

---

## Dependências Permitidas

N/A.

---

## Referências

- `CLAUDE.md` global do projeto (raiz)
- `[[Preferencias Dev]]` — stack aprovada
- `[[Niche CLAUDE Template]]` — template canon
