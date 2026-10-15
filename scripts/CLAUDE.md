---
template: "Niche CLAUDE"
version: 1.0
status: "Ativo"
tags:
  - niche-claude
  - per-diretorio
nicho: "scripts"
escopo: "Scripts pontuais (admin setup, seed extras, manutenção)"
---

# scripts

> **Nota de Uso:** Rodar via `pnpm <script>` ou `node scripts/<file>` / `tsx scripts/<file>`. Cada arquivo deve ser autocontido.
>
> Gerado por `tools/generate-claude-md.js` em 2026-05-30 conforme regra **R8** (`[[CLAUDE]]` raiz + `[[Preferencias Dev#4. CLAUDE.md Universal]]`).

---

## Escopo do Diretório

Rodar via `pnpm <script>` ou `node scripts/<file>` / `tsx scripts/<file>`. Cada arquivo deve ser autocontido.

---

## Diretrizes Específicas

- Scripts utilitários standalone — admin setup, seed extras, manutenção.
- Rodar via `tsx scripts/<file>` ou `node scripts/<file.mjs>`.
- Não importar `src/lib/*` server-only se rodar fora do Next runtime.

### Conteúdo

- `otimizar-imagens.mjs` — converte os rasters de `public/` para AVIF + WebP
  (`pnpm imagens:otimizar`). Portado do `otimizar-fotos.mjs` do
  `dr-gabriel-cavalcante-web`, com duas mudanças documentadas no cabeçalho do
  arquivo: emite AVIF além de WebP, e varre o diretório em vez de ter receita
  por foto.

---

## Stack Local

Conforme `[[Preferencias Dev]]`.

---

## Testes

Smoke-test manual após mudanças. O resultado do `otimizar-imagens.mjs` é
verificado no CI por `src/test/asset-refs.test.ts`, que falha se algum
PNG/JPG ficar sem par AVIF/WebP.

---

## Dependências Permitidas

Apenas libs da Stack Principal / Estendida; sem novas deps sem registrar em `[[05-Dev-Log]]`.

---

## Referências

- `CLAUDE.md` global do projeto (raiz)
- `[[Preferencias Dev]]` — stack aprovada
- `[[Niche CLAUDE Template]]` — template canon
