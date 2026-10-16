/**
 * Guarda de contraste (WCAG 2.1 AA) sobre a paleta real.
 *
 * Lê o `globals.css`, resolve a cadeia de `var(--x)` até o hex e checa os
 * pares **que o próprio CSS declara como par** — `--background` com
 * `--foreground`, `--primary` com `--primary-foreground`, e assim por
 * diante, nos dois temas.
 *
 * Checar par declarado, e não todas as combinações, é deliberado: o que
 * importa é o que de fato se encosta na tela. Combinar 167 tokens dois a
 * dois daria 13.861 pares, quase todos irreais, e um relatório que ninguém
 * lê não protege nada.
 *
 * ⚠️ Esta paleta é a de hoje. Quando a identidade visual final entrar, os
 * hex mudam e este teste é a primeira coisa a rodar — ele é a diferença
 * entre descobrir o problema agora e descobrir depois de a marca estar
 * aplicada em dezenas de componentes.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  razaoDeContraste,
  formatarRazao,
  AA,
  type NivelAA,
} from "@/lib/design/domain/contrast";

const CSS = readFileSync(
  path.resolve(__dirname, "../app/globals.css"),
  "utf-8",
);

/** Recorta o corpo de um seletor de topo (`:root { … }`). */
function escopo(seletor: string): string {
  const inicio = CSS.indexOf(`${seletor} {`);
  if (inicio === -1) return "";
  let nivel = 0;
  for (let i = CSS.indexOf("{", inicio); i < CSS.length; i++) {
    if (CSS[i] === "{") nivel++;
    else if (CSS[i] === "}" && --nivel === 0) return CSS.slice(inicio, i);
  }
  return "";
}

/** Todas as declarações `--nome: valor;` de um escopo. */
function declaracoes(corpo: string): Map<string, string> {
  const mapa = new Map<string, string>();
  const re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(corpo)) !== null) mapa.set(m[1], m[2].trim());
  return mapa;
}

/**
 * Resolve `var(--a)` → `var(--b)` → `#hex`.
 * O `:root` serve de fallback para o tema escuro, que só redeclara o que muda.
 */
function resolver(
  nome: string,
  tema: Map<string, string>,
  base: Map<string, string>,
  profundidade = 0,
): string | null {
  if (profundidade > 10) return null;
  const bruto = tema.get(nome) ?? base.get(nome);
  if (!bruto) return null;
  if (bruto.startsWith("#")) return bruto;
  const ref = bruto.match(/^var\((--[a-z0-9-]+)\)$/);
  return ref ? resolver(ref[1], tema, base, profundidade + 1) : null;
}

const CLARO = declaracoes(escopo(":root"));
const ESCURO = declaracoes(escopo(".dark"));

/** Pares que o CSS declara como fundo↔texto, com o nível exigido. */
const PARES: Array<{ fundo: string; texto: string; nivel: NivelAA }> = [
  { fundo: "--background", texto: "--foreground", nivel: "textoNormal" },
  { fundo: "--card", texto: "--card-foreground", nivel: "textoNormal" },
  { fundo: "--popover", texto: "--popover-foreground", nivel: "textoNormal" },
  { fundo: "--primary", texto: "--primary-foreground", nivel: "textoNormal" },
  {
    fundo: "--secondary",
    texto: "--secondary-foreground",
    nivel: "textoNormal",
  },
  { fundo: "--accent", texto: "--accent-foreground", nivel: "textoNormal" },
  { fundo: "--muted", texto: "--muted-foreground", nivel: "textoNormal" },
];

/**
 * Componentes não-textuais (WCAG 1.4.11) — mínimo 3:1.
 *
 * Só o anel de foco entra como asserção. É o item mais crítico da norma
 * (sem ele não se sabe onde o teclado está) e passa com folga nos dois
 * temas.
 *
 * `--border` e `--input` **não** entram, e o motivo está documentado em
 * `src/lib/design/CLAUDE.md` §9: hoje reprovam, a correção exige escolher
 * cor nova, e a identidade visual final — que redefine a paleta inteira —
 * ainda não chegou. Travar o CI num valor que vai mudar não protege nada.
 */
const COMPONENTES: Array<{ fundo: string; frente: string }> = [
  { fundo: "--background", frente: "--ring" },
];

const TEMAS: Array<[string, Map<string, string>]> = [
  ["claro", CLARO],
  ["escuro", ESCURO],
];

describe("contraste WCAG AA da paleta", () => {
  it("o globals.css declara os dois temas", () => {
    expect(CLARO.size).toBeGreaterThan(20);
    expect(ESCURO.size).toBeGreaterThan(5);
  });

  for (const [nomeTema, tema] of TEMAS) {
    for (const { fundo, texto, nivel } of PARES) {
      it(`${nomeTema}: ${texto} sobre ${fundo} passa em AA`, () => {
        const hexFundo = resolver(fundo, tema, CLARO);
        const hexTexto = resolver(texto, tema, CLARO);

        expect(hexFundo, `${fundo} não resolve para hex`).not.toBeNull();
        expect(hexTexto, `${texto} não resolve para hex`).not.toBeNull();

        const razao = razaoDeContraste(hexFundo!, hexTexto!);
        expect(razao).not.toBeNull();
        expect(
          razao!,
          `${hexTexto} sobre ${hexFundo} dá ${formatarRazao(razao!)}, ` +
            `abaixo do mínimo de ${AA[nivel]}:1 para ${nivel}`,
        ).toBeGreaterThanOrEqual(AA[nivel]);
      });
    }

    for (const { fundo, frente } of COMPONENTES) {
      it(`${nomeTema}: ${frente} sobre ${fundo} passa em 1.4.11 (3:1)`, () => {
        const hexFundo = resolver(fundo, tema, CLARO);
        const hexFrente = resolver(frente, tema, CLARO);

        expect(hexFundo).not.toBeNull();
        expect(hexFrente).not.toBeNull();

        const razao = razaoDeContraste(hexFundo!, hexFrente!);
        expect(
          razao!,
          `${hexFrente} sobre ${hexFundo} dá ${formatarRazao(razao!)}, ` +
            `abaixo de ${AA.componente}:1`,
        ).toBeGreaterThanOrEqual(AA.componente);
      });
    }
  }
});
