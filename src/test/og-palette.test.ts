/**
 * Guarda da paleta das imagens OG.
 *
 * `og-palette.ts` existe porque `satori` não resolve `var(--color-*)` —
 * precisa do hex literal. O custo disso é uma segunda cópia da paleta,
 * e cópia sem guarda diverge. Este teste lê o `globals.css` e compara.
 *
 * É a mesma lição do P0.4 da auditoria aplicada a cor em vez de caminho:
 * duplicata que ninguém verifica apodrece em silêncio.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ogPalette } from "@/lib/seo/domain/og-palette";

const CSS = readFileSync(
  path.resolve(__dirname, "../app/globals.css"),
  "utf-8",
);

/** Lê `--color-x: #HEX;` do globals.css. */
function cssToken(name: string): string | null {
  const match = CSS.match(
    new RegExp(`--${name}\\s*:\\s*(#[0-9a-fA-F]{3,8})\\s*;`),
  );
  return match ? match[1].toUpperCase() : null;
}

const MAPPING: Array<[keyof typeof ogPalette, string]> = [
  ["wine", "color-brand-wine"],
  ["wineSoft", "color-brand-wine-soft"],
  ["wineDeep", "color-brand-wine-deep"],
  ["pink", "color-brand-pink"],
  ["pinkSoft", "color-brand-pink-soft"],
  ["inkStrong", "color-ink-strong"],
  ["inkSoft", "color-ink-soft"],
];

describe("ogPalette espelha globals.css", () => {
  it.each(MAPPING)("%s === --%s", (key, token) => {
    const fromCss = cssToken(token);

    expect(
      fromCss,
      `--${token} não foi encontrado em src/app/globals.css`,
    ).not.toBeNull();

    expect(ogPalette[key].toUpperCase()).toBe(fromCss);
  });
});
