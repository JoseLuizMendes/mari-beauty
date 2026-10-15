/**
 * Paleta literal para as imagens Open Graph.
 * ─────────────────────────────────────────────────────────────────────
 * O canon proíbe hex solto em componente, e com razão. Aqui existe uma
 * exceção técnica real: `ImageResponse` (satori) renderiza **fora do
 * navegador** e não resolve `var(--color-brand-wine)` — recebe a string
 * literal e desenha preto. Então os valores precisam existir em TS.
 *
 * A regra que sobra é: eles existem **neste arquivo e em nenhum outro**.
 * Componente nenhum importa daqui; quem desenha na tela continua usando
 * os tokens de `src/app/globals.css`.
 *
 * ⚠️ Estes valores espelham `--color-brand-*` do `globals.css`. Mudou lá,
 * muda aqui — `src/test/og-palette.test.ts` falha se divergirem.
 *
 * Nota: `src/lib/design/domain/tokens.ts` NÃO serve como fonte aqui.
 * Ele ainda descreve a paleta antiga (gold/ivory em OKLCH) e diverge do
 * `globals.css`, que é a paleta real wine/rosé. Ver auditoria §8.7.
 */

export const ogPalette = {
  wine: "#47131C",
  wineSoft: "#6B1F2C",
  wineDeep: "#2E0B12",
  pink: "#FFD7E7",
  pinkSoft: "#FFE8F0",
  inkStrong: "#2E0B12",
  inkSoft: "#5A2A33",
} as const;
