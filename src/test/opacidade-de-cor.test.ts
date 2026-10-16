/**
 * Guarda das classes de opacidade (`bg-brand-wine/80`).
 *
 * Motivo: durante meses **156 classes não geraram CSS nenhum**. As famílias
 * `brand-*`, `ink-*` e `surface-*` moravam só no `:root`, com utilitário
 * escrito à mão que cobria a forma simples. No Tailwind v4 o modificador de
 * opacidade só existe para cor **registrada no `@theme`** — então
 * `bg-brand-wine/80` não era 80% de vinho, era nada: 126 propriedades que
 * não eram aplicadas e 30 estados de `hover:` que não aconteciam.
 *
 * Não dava para ver: a classe está lá no JSX, o build passa, o lint passa.
 * Só olhando o CSS gerado.
 *
 * Este teste fecha o buraco sem precisar de build: toda família usada com
 * `/NN` no `src/` precisa estar declarada dentro do `@theme inline`. Quem
 * adicionar cor nova só no `:root` e usar `/NN` nela quebra aqui.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(__dirname, "../..");
const CSS = readFileSync(path.join(RAIZ, "src/app/globals.css"), "utf-8");

/** Corpo do bloco `@theme inline { … }`. */
function blocoTheme(): string {
  const inicio = CSS.indexOf("@theme inline {");
  if (inicio === -1) return "";
  let nivel = 0;
  for (let i = CSS.indexOf("{", inicio); i < CSS.length; i++) {
    if (CSS[i] === "{") nivel++;
    else if (CSS[i] === "}" && --nivel === 0) return CSS.slice(inicio, i);
  }
  return "";
}

const REGISTRADAS = new Set(
  [...blocoTheme().matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]),
);

function tsx(dir: string, achados: string[] = []): string[] {
  for (const entrada of readdirSync(dir)) {
    if (entrada === "generated" || entrada === "node_modules") continue;
    const full = path.join(dir, entrada);
    if (statSync(full).isDirectory()) tsx(full, achados);
    else if (full.endsWith(".tsx")) achados.push(full);
  }
  return achados;
}

/** `bg-brand-wine/80` → `brand-wine`. Só as famílias do projeto. */
const USO_COM_OPACIDADE =
  /\b(?:[a-z-]+:)*(?:bg|text|border|from|to|via|fill|stroke|ring|divide|outline)-((?:brand|ink|surface)-[a-z-]+?)\/\d+\b/g;

describe("modificador de opacidade em cor de marca", () => {
  it("o @theme inline declara as famílias de cor", () => {
    expect(REGISTRADAS.size).toBeGreaterThan(10);
    expect(REGISTRADAS.has("brand-wine")).toBe(true);
  });

  it("toda cor usada com /NN está registrada no @theme", () => {
    const orfas = new Map<string, string>();

    for (const arquivo of tsx(path.join(RAIZ, "src"))) {
      const conteudo = readFileSync(arquivo, "utf-8");
      for (const m of conteudo.matchAll(USO_COM_OPACIDADE)) {
        if (!REGISTRADAS.has(m[1])) {
          orfas.set(m[0], path.relative(RAIZ, arquivo));
        }
      }
    }

    expect(
      [...orfas].map(([classe, arq]) => `${classe} — ${arq}`),
      "Estas classes NÃO geram CSS: a cor não está no `@theme inline` do " +
        "globals.css, e o Tailwind v4 só monta `/NN` para cor registrada. " +
        "O resultado não é a cor opaca — é propriedade nenhuma. " +
        "Registre a cor no @theme (valor de runtime em `--<nome>`, ponteiro " +
        "em `--color-<nome>`) ou use a forma simples, sem `/NN`.",
    ).toEqual([]);
  });
});
