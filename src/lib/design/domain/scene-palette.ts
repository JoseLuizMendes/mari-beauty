/**
 * Cores literais da cena 3D.
 * ─────────────────────────────────────────────────────────────────────
 * O canon proíbe hex solto em componente, e com razão. Aqui há a mesma
 * exceção técnica que já justifica o `og-palette.ts`: WebGL não resolve
 * `var(--color-scene-backdrop)`. O material da cena recebe uma string e
 * desenha o que vier — `var(...)` viraria preto.
 *
 * A diferença em relação ao satori é que aqui as duas pontas convivem na
 * mesma tela: o `<div>` da página é CSS e o plano de fundo da cena é
 * WebGL. **É o vidro do frasco que refrata essa cor**, então as duas
 * precisam ser a mesma — se divergirem, o frasco para de parecer
 * transparente. Era exatamente o que estava acontecendo: dois literais
 * `#0f5a58` independentes, um em cada ponta, sem nada que os ligasse.
 *
 * A regra que sobra é a do `og-palette.ts`: o valor existe **neste arquivo
 * e no `globals.css`**, em nenhum outro lugar. Quem desenha em CSS usa
 * `bg-scene-backdrop`; quem desenha em WebGL importa daqui.
 *
 * ⚠️ Espelha `--color-scene-backdrop` do `globals.css`. Mudou lá, muda
 * aqui — `src/test/scene-palette.test.ts` falha se divergirem.
 */

export const scenePalette = {
  /** Fundo da cena do frasco. Igual ao fundo da página que a contém. */
  backdrop: "#0f5a58",
} as const;
