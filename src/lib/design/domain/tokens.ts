/**
 * Tokens de motion para GSAP.
 * ─────────────────────────────────────────────────────────────────────
 * Este arquivo era o "Belessence Design Tokens — v2": 11 exports com cor,
 * tipografia, espaçamento, raio, gradiente, sombra, breakpoint, glass,
 * grid e um extrato do sistema da L'Oréal, extraídos de um estudo de
 * Byredo/Aesop/MFK. O cabeçalho dizia "fonte única da verdade. Todos os
 * componentes referenciam estes tokens".
 *
 * Nenhum referenciava. Medido em 2026-10-16: **10 dos 11 exports tinham
 * zero consumidor**, e o `colors` descrevia a paleta gold/ivory em OKLCH
 * — anterior ao rebrand wine/rosé e no espaço de cor que o `CLAUDE.md` da
 * raiz diz que o projeto não usa. Enquanto isso quatro `CLAUDE.md`
 * mandavam adicionar cor nova aqui. Os dez foram apagados.
 *
 * Sobrou o `motion`, que tem consumidor real:
 * `src/lib/motion/presentation/gsap-helpers.ts`. Ele existe em TS, e não
 * no `globals.css`, porque o GSAP precisa de **número** (`duration: 0.8`)
 * e de nome de easing dele (`power4.out`) — não de string CSS.
 *
 * ⚠️ O `globals.css` tem o próprio conjunto de motion para transições CSS
 * (`--ease-smooth/shift/soft`, `--duration-fast/base/slow`). Os valores se
 * sobrepõem em parte e os nomes não combinam (`--duration-base: 0.8s` é o
 * `slow: 0.8` daqui). Unificar a nomenclatura é trabalho à parte; por ora,
 * saiba que são dois conjuntos e que o de CSS manda em CSS.
 */

export const motion = {
  ease: {
    // GSAP named easings
    linear: "none",
    out: "power2.out",
    inOut: "power2.inOut",
    expo: "expo.out", // Snap energético
    back: "back.out(1.4)", // Micro-bounce sutil
    elastic: "elastic.out(1, 0.4)",
    luxury: "power4.out", // Hero entries — MFK signature
    silk: "power3.inOut", // Hover transitions suaves — MFK
    editorial: "power1.inOut", // Scroll reveals lentos — Byredo
    // CSS equivalents (para transitions sem GSAP)
    cssLuxury: "cubic-bezier(0.16, 1, 0.3, 1)", // power4.out approx
    cssSilk: "cubic-bezier(0.45, 0, 0.55, 1)", // power3.inOut approx
    cssEditorial: "cubic-bezier(0.25, 0.1, 0.25, 1)", // power1.inOut approx
  },
  duration: {
    instant: 0.1, // Micro-feedback
    fast: 0.25, // Hover states
    normal: 0.45, // Standard transitions
    slow: 0.8, // Scroll reveals
    cinematic: 1.2, // Hero entries — Byredo
    theatrical: 1.8, // Page transitions editorial
  },
  stagger: {
    tight: 0.04,
    normal: 0.08,
    loose: 0.15,
    slow: 0.2,
  },
  // prefers-reduced-motion — acessibilidade obrigatória
  reduced: {
    duration: 0,
    stagger: 0,
  },
  // Presets compostos para GSAP
  presets: {
    heroEntry: { duration: 1.2, ease: "power4.out", y: 40 },
    fadeUp: { duration: 0.8, ease: "power2.out", y: 24 },
    fadeIn: { duration: 0.6, ease: "power1.inOut", opacity: 0 },
    cardHover: { duration: 0.25, ease: "power3.inOut", y: -4, scale: 1.01 },
    scrollReveal: { duration: 0.9, ease: "expo.out", y: 32, start: "top 85%" },
  },
} as const;
