/**
 * Guarda de integridade das referências a `public/`.
 * ─────────────────────────────────────────────────────────────────────
 * Motivo: em 2026-10-15, varrendo `src/` atrás dos PNG/JPG para converter,
 * apareceram **onze caminhos de asset que não existiam** — e estavam em
 * produção:
 *
 *   - sete JPG da galeria de marca. Os arquivos reais são PNG em
 *     `/assets-removebg/`. Estes não chegaram a aparecer para ninguém:
 *     o componente que os usa não é montado em página nenhuma — o que
 *     é um segundo achado, não uma atenuante.
 *   - `/assets/newsletter-woman.jpg` — a foto da fundadora em `/sobre`.
 *   - `/assets/placeholder.svg` — o fallback de `productImageSrc()`, ou
 *     seja: **todo produto sem foto** servia 404, em toda a loja.
 *
 * Nenhum deles quebrava build, teste ou lint. Imagem que falta não derruba
 * nada: só aparece como buraco na tela, e só para quem abre a página — e,
 * quando o componente é órfão, nem isso.
 *
 * É o mesmo raciocínio do `claude-md-paths.test.ts` (auditoria P0.4), que
 * verifica caminhos citados nos `CLAUDE.md`, aplicado ao que o navegador
 * pede. Um caminho só falha quando ninguém o verifica.
 *
 * O que este teste NÃO pega: `src` montado em runtime (template string,
 * valor vindo do banco). Só literais. É o suficiente — os onze eram todos
 * literais.
 */

import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const PUBLIC_DIR = path.join(ROOT, "public");

const IGNORED_DIRS = new Set(["node_modules", ".next", ".git", "generated"]);

/** Só código de produção: mock de teste pode citar caminho fictício. */
const IGNORED_SRC = new Set(["test"]);

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);

    if (statSync(full).isDirectory()) {
      if (
        IGNORED_SRC.has(entry) &&
        path.dirname(full) === path.join(ROOT, "src")
      )
        continue;
      sourceFiles(full, found);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      found.push(full);
    }
  }
  return found;
}

/**
 * Caminhos absolutos de asset em string literal: `"/assets/x.png"`.
 *
 * Exige extensão de arquivo para não capturar rota (`/sobre`) nem o começo
 * de uma string montada por template.
 */
const ASSET_REF =
  /["'`](\/(?:assets|assets-removebg|images|media)\/[^"'`\s]+\.[a-z0-9]{2,5})["'`]/gi;

interface Reference {
  assetPath: string;
  file: string;
}

function collectReferences(): Reference[] {
  const refs: Reference[] = [];

  for (const file of sourceFiles(path.join(ROOT, "src"))) {
    const content = readFileSync(file, "utf-8");
    for (const match of content.matchAll(ASSET_REF)) {
      refs.push({
        assetPath: match[1],
        file: path.relative(ROOT, file).replace(/\\/g, "/"),
      });
    }
  }

  return refs;
}

describe("referências a public/", () => {
  const references = collectReferences();

  it("encontra referências para verificar (o regex não silenciou)", () => {
    // Guarda da guarda: se o regex parar de casar, o teste passaria vazio e
    // voltaríamos a não verificar nada.
    expect(references.length).toBeGreaterThan(10);
  });

  it("todo asset citado em src/ existe em public/", () => {
    const quebradas = references.filter(
      (ref) => !existsSync(path.join(PUBLIC_DIR, ref.assetPath)),
    );

    expect(
      quebradas.map((r) => `${r.assetPath}  ← ${r.file}`),
      "asset citado no código não existe em public/",
    ).toEqual([]);
  });
});

describe("conversão AVIF/WebP", () => {
  /** PNG/JPG servidos ao navegador. SVG é vetor e não entra. */
  function rasters(dir: string, found: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) rasters(full, found);
      else if (/\.(png|jpe?g)$/i.test(entry)) found.push(full);
    }
    return found;
  }

  it("todo PNG/JPG tem par AVIF e WebP", () => {
    // Canon (`Preferencias Dev` §Imagens e Mídia Web): AVIF é primeira
    // escolha, WebP é o fallback. Asset novo entra pelo
    // `pnpm imagens:otimizar`; sem isto o projeto volta a servir PNG de 1MB.
    const semPar = rasters(PUBLIC_DIR)
      .filter((file) => {
        const semExt = file.replace(/\.(png|jpe?g)$/i, "");
        return !existsSync(`${semExt}.avif`) || !existsSync(`${semExt}.webp`);
      })
      .map((f) => path.relative(ROOT, f).replace(/\\/g, "/"));

    expect(
      semPar,
      "rode `pnpm imagens:otimizar` para gerar os derivados",
    ).toEqual([]);
  });
});
