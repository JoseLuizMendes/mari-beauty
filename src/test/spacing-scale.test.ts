/**
 * Guarda da escala de espaçamento (8pt).
 *
 * A escala existe para ser respeitada, e escala sem guarda apodrece: basta
 * um `--spacing-xs: 0.375rem` entrar "só dessa vez" para a grade deixar de
 * ser grade. O Design System Blueprint diz isso com todas as letras — "o
 * primeiro valor fora do sistema é permissão pros próximos 50".
 *
 * Este teste lê o `globals.css` e afirma duas coisas:
 *   1. os seis passos existem;
 *   2. **todo** token do namespace `--spacing-*` cai num múltiplo de 8px —
 *      inclusive os que alguém adicionar depois, que é o ponto.
 *
 * Mesmo padrão do `og-palette.test.ts`: duplicata ou convenção que ninguém
 * verifica diverge em silêncio.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const CSS = readFileSync(
  path.resolve(__dirname, "../app/globals.css"),
  "utf-8",
);

/** Todos os `--spacing-<nome>: <valor>;` declarados no arquivo. */
function spacingTokens(): Array<{ name: string; raw: string }> {
  const out: Array<{ name: string; raw: string }> = [];
  const re = /--spacing-([a-z0-9-]+)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(CSS)) !== null) {
    out.push({ name: m[1], raw: m[2].trim() });
  }
  return out;
}

/** Converte `0.5rem` ou `8px` em pixels. Devolve null se não for nenhum dos dois. */
function toPx(raw: string): number | null {
  const rem = raw.match(/^([\d.]+)rem$/);
  if (rem) return parseFloat(rem[1]) * 16;
  const px = raw.match(/^([\d.]+)px$/);
  if (px) return parseFloat(px[1]);
  return null;
}

const ESPERADOS: Record<string, number> = {
  tight: 8,
  control: 16,
  card: 24,
  block: 32,
  section: 48,
  rhythm: 64,
};

describe("escala de espaçamento", () => {
  it("declara os seis passos da grade de 8pt", () => {
    const encontrados = Object.fromEntries(
      spacingTokens().map((t) => [t.name, toPx(t.raw)]),
    );

    for (const [nome, px] of Object.entries(ESPERADOS)) {
      expect(encontrados[nome], `--spacing-${nome} não existe`).toBe(px);
    }
  });

  it("não aceita passo fora da grade de 8pt", () => {
    for (const { name, raw } of spacingTokens()) {
      const px = toPx(raw);
      expect(px, `--spacing-${name}: ${raw} não é rem nem px`).not.toBeNull();
      expect(
        px! % 8,
        `--spacing-${name} vale ${px}px, que não é múltiplo de 8`,
      ).toBe(0);
    }
  });

  it("não usa nome numérico, que sequestraria a escala do Tailwind", () => {
    // `--spacing-1` faria `p-1` deixar de valer 4px e passar a valer o token.
    // São 1.038 utilitários numéricos em src/ — todos mudariam em silêncio.
    for (const { name } of spacingTokens()) {
      expect(
        /^\d+$/.test(name),
        `--spacing-${name} tem nome numérico e colide com a escala do Tailwind`,
      ).toBe(false);
    }
  });
});
