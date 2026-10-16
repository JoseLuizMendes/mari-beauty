/**
 * Orçamento de assets estáticos (`public/`).
 * ─────────────────────────────────────────────────────────────────────
 * Motivo (auditoria 2026-10, item 10): o pior erro de performance do
 * histórico deste repo não estava em código — estava em `public/`. Um PNG
 * de 1,5MB fazia o `/_next/image` reencodar na primeira requisição e o E2E
 * travava 60s esperando. O arquivo entrou num commit, passou no lint, no
 * typecheck, nos testes, e ficou meses.
 *
 * `public/` é servido **como está**: nada otimiza, nada avisa. Então a
 * guarda é aqui, e é por arquivo — um total agregado deixaria passar
 * exatamente o caso que doeu (um arquivo gigante entre muitos pequenos).
 *
 * Complementa `scripts/orcamento-performance.mjs`, que cuida do bundle e
 * precisa de build. Este não precisa de nada: roda no job `unit`.
 *
 * ⚠️ Os tetos de imagem e vídeo estão **colados na realidade atual**, que é
 * ruim de propósito — a hero de 1,8MB e os vídeos de 9MB existem hoje. O
 * orçamento congela o estrago e impede o próximo. Teto só desce.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, statSync, readFileSync } from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(__dirname, "../..");
const PUBLIC = path.join(RAIZ, "public");

const { assets: ORCAMENTO } = JSON.parse(
  readFileSync(path.join(RAIZ, "performance-budget.json"), "utf-8"),
) as { assets: Record<string, number> };

const KB = 1024;
const MB = 1024 * 1024;

type Asset = { rel: string; bytes: number; ext: string };

function listar(dir: string): Asset[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return listar(full);
    return [
      {
        rel: path.relative(PUBLIC, full).replace(/\\/g, "/"),
        bytes: statSync(full).size,
        ext: path.extname(e.name).slice(1).toLowerCase(),
      },
    ];
  });
}

const TODOS = listar(PUBLIC);

const IMAGENS = new Set(["png", "jpg", "jpeg", "webp", "avif", "gif"]);
const VIDEOS = new Set(["mp4", "webm", "mov"]);

/** Lista os estouros formatada, para a mensagem de falha ser acionável. */
function estouros(assets: Asset[], tetoKb: number): string[] {
  return assets
    .filter((a) => a.bytes > tetoKb * KB)
    .sort((a, b) => b.bytes - a.bytes)
    .map(
      (a) => `${a.rel} — ${(a.bytes / KB).toFixed(0)} KB (teto ${tetoKb} KB)`,
    );
}

describe("orçamento de assets em public/", () => {
  it("nenhuma imagem passa do teto por arquivo", () => {
    const fora = estouros(
      TODOS.filter((a) => IMAGENS.has(a.ext)),
      ORCAMENTO.imagemKb,
    );

    expect(
      fora,
      `Imagem acima do teto. Rode \`pnpm imagens:otimizar\` ou exporte em WebP/AVIF ` +
        `antes de commitar. Se for inevitável, suba o teto em \`performance-budget.json\` ` +
        `no mesmo commit e justifique.\n  ${fora.join("\n  ")}`,
    ).toEqual([]);
  });

  it("nenhum vídeo passa do teto por arquivo", () => {
    const fora = estouros(
      TODOS.filter((a) => VIDEOS.has(a.ext)),
      ORCAMENTO.videoKb,
    );

    expect(
      fora,
      `Vídeo acima do teto. Vídeo em \`public/\` é baixado inteiro pelo visitante — ` +
        `considere reencodar (H.264 CRF 28) ou hospedar fora.\n  ${fora.join("\n  ")}`,
    ).toEqual([]);
  });

  it("nenhum SVG passa do teto por arquivo", () => {
    const fora = estouros(
      TODOS.filter((a) => a.ext === "svg"),
      ORCAMENTO.svgKb,
    );

    expect(
      fora,
      `SVG acima do teto — quase sempre é um traço vetorizado de bitmap ou um ` +
        `export sem limpeza.\n  ${fora.join("\n  ")}`,
    ).toEqual([]);
  });

  it("o total de public/ cabe no orçamento", () => {
    const totalMb = TODOS.reduce((t, a) => t + a.bytes, 0) / MB;

    const maiores = [...TODOS]
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 5)
      .map((a) => `${a.rel} — ${(a.bytes / MB).toFixed(2)} MB`);

    expect(
      Number(totalMb.toFixed(2)),
      `public/ está em ${totalMb.toFixed(2)} MB (teto ${ORCAMENTO.totalPublicMb} MB). ` +
        `Tudo aqui vai pro deploy. Maiores:\n  ${maiores.join("\n  ")}`,
    ).toBeLessThanOrEqual(ORCAMENTO.totalPublicMb);
  });
});
