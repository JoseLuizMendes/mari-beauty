/**
 * Guarda da paleta da cena 3D.
 *
 * Mesmo motivo do `og-palette.test.ts`: cópia que ninguém verifica
 * diverge em silêncio. Aqui o estrago é visível — a cor da cena é o que o
 * vidro do frasco refrata, então se ela sair do tom do fundo da página o
 * frasco deixa de parecer transparente.
 *
 * O teste afirma duas coisas:
 *   1. o literal em TS é igual ao `--color-scene-backdrop` do CSS;
 *   2. o utilitário `.bg-scene-backdrop` existe — sem ele a classe na
 *      página seria morta (as cores fora do `@theme` precisam de
 *      utilitário declarado à mão neste projeto).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { scenePalette } from "@/lib/design/domain/scene-palette";

const CSS = readFileSync(
  path.resolve(__dirname, "../app/globals.css"),
  "utf-8",
);

describe("scenePalette espelha globals.css", () => {
  it("backdrop === --color-scene-backdrop", () => {
    const match = CSS.match(
      /--color-scene-backdrop\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/,
    );

    expect(
      match,
      "--color-scene-backdrop não foi encontrado em src/app/globals.css",
    ).not.toBeNull();

    expect(scenePalette.backdrop.toUpperCase()).toBe(match![1].toUpperCase());
  });

  it("o utilitário .bg-scene-backdrop está declarado", () => {
    expect(
      /\.bg-scene-backdrop\s*\{\s*background-color:\s*var\(--color-scene-backdrop\)/.test(
        CSS,
      ),
      "sem o utilitário declarado à mão, `bg-scene-backdrop` não gera CSS " +
        "neste projeto — as cores fora do @theme inline não viram utilitário " +
        "automaticamente no Tailwind v4",
    ).toBe(true);
  });
});
