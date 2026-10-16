#!/usr/bin/env node
/**
 * Orçamento de performance do bundle.
 * ─────────────────────────────────────────────────────────────────────
 * Motivo (auditoria 2026-10, item 10): a Memória Imunológica do projeto tem
 * quatro erros de performance que passaram meses sem ninguém notar — entre
 * eles um PNG de 1,5MB que travava o E2E por 60s no `/_next/image`. Todos
 * passaram porque **nada media**. Lint, typecheck e teste não têm opinião
 * sobre quantos KB o visitante baixa.
 *
 * Agora têm. Este script lê o build de produção em `.next/` e compara com
 * `performance-budget.json`. Estourar o teto **quebra o CI**, igual ao piso
 * de cobertura do `vitest.config.ts` — e, pela mesma lógica, o teto só
 * desce. Subir o número para o CI passar é desligar a guarda.
 *
 * O que ele NÃO mede: tempo de render, LCP, CLS. Isso exige browser e vira
 * flake. Aqui é só aritmética sobre arquivo em disco: determinístico, roda
 * em 200ms e não tem como dar falso positivo por rede lenta.
 *
 * Uso:
 *   pnpm build && pnpm perf:orcamento
 */

import { readFileSync, readdirSync, existsSync, appendFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const RAIZ = path.resolve(import.meta.dirname, "..");
const NEXT = path.join(RAIZ, ".next");

/**
 * Nível 6 é o default do zlib e o que CDN costuma usar. Fixado de propósito:
 * o default do Node já mudou de versão para versão, e um orçamento que muda
 * de valor quando o runner atualiza não é orçamento, é sorteio.
 */
const NIVEL_GZIP = 6;

function gzipKb(arquivos) {
  const bytes = arquivos.reduce(
    (total, f) =>
      total + gzipSync(readFileSync(f), { level: NIVEL_GZIP }).length,
    0,
  );
  return bytes / 1024;
}

function listar(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? listar(path.join(dir, e.name)) : [path.join(dir, e.name)],
  );
}

if (!existsSync(path.join(NEXT, "build-manifest.json"))) {
  console.error(
    "✗ `.next/build-manifest.json` não existe. Rode `pnpm build` antes do orçamento.",
  );
  process.exit(1);
}

const orcamento = JSON.parse(
  readFileSync(path.join(RAIZ, "performance-budget.json"), "utf-8"),
).bundle;

const manifest = JSON.parse(
  readFileSync(path.join(NEXT, "build-manifest.json"), "utf-8"),
);

/**
 * Baseline = o que **todo** visitante baixa, em qualquer rota: polyfills +
 * os chunks do root layout. É a métrica que mais importa, porque é a única
 * que ninguém escapa.
 */
const baseline = [
  ...(manifest.polyfillFiles ?? []),
  ...(manifest.rootMainFiles ?? []),
].map((f) => path.join(NEXT, f));

const estaticos = listar(path.join(NEXT, "static"));
const js = estaticos.filter((f) => f.endsWith(".js"));
const css = estaticos.filter((f) => f.endsWith(".css"));

const porChunk = js
  .map((f) => ({ arquivo: path.relative(NEXT, f), kb: gzipKb([f]) }))
  .sort((a, b) => b.kb - a.kb);

const medicoes = [
  {
    chave: "baselineJsGzipKb",
    rotulo: "JS baseline (todo visitante)",
    valor: gzipKb(baseline),
    detalhe: `${baseline.length} arquivo(s) do root layout + polyfills`,
  },
  {
    chave: "maiorChunkJsGzipKb",
    rotulo: "Maior chunk individual",
    valor: porChunk[0]?.kb ?? 0,
    detalhe: porChunk[0]?.arquivo ?? "—",
  },
  {
    chave: "totalClientJsGzipKb",
    rotulo: "JS total em .next/static",
    valor: gzipKb(js),
    detalhe: `${js.length} chunk(s)`,
  },
  {
    chave: "cssGzipKb",
    rotulo: "CSS total",
    valor: gzipKb(css),
    detalhe: `${css.length} arquivo(s)`,
  },
];

const linhas = medicoes.map((m) => {
  const teto = orcamento[m.chave];
  const folga = teto - m.valor;
  return { ...m, teto, folga, passou: m.valor <= teto };
});

const estourou = linhas.filter((l) => !l.passou);

const tabela = [
  "| Métrica | Medido | Teto | Folga |",
  "| --- | --- | --- | --- |",
  ...linhas.map(
    (l) =>
      `| ${l.passou ? "✅" : "❌"} ${l.rotulo} | ${l.valor.toFixed(1)} KB | ${l.teto} KB | ${l.folga.toFixed(1)} KB |`,
  ),
].join("\n");

console.log("\nOrçamento de performance (gzip, nível " + NIVEL_GZIP + ")\n");
for (const l of linhas) {
  console.log(
    `  ${l.passou ? "✓" : "✗"} ${l.rotulo.padEnd(32)} ${l.valor.toFixed(1).padStart(8)} KB  /  ${String(l.teto).padStart(5)} KB   (${l.detalhe})`,
  );
}

console.log("\n  5 maiores chunks:");
for (const c of porChunk.slice(0, 5)) {
  console.log(`    ${c.kb.toFixed(1).padStart(7)} KB  ${c.arquivo}`);
}

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `## Orçamento de performance\n\n${tabela}\n\n<details><summary>5 maiores chunks</summary>\n\n${porChunk
      .slice(0, 5)
      .map((c) => `- \`${c.arquivo}\` — ${c.kb.toFixed(1)} KB`)
      .join("\n")}\n\n</details>\n\n`,
  );
}

if (estourou.length > 0) {
  console.error(
    `\n✗ ${estourou.length} métrica(s) acima do teto:\n` +
      estourou
        .map(
          (l) =>
            `    ${l.rotulo}: ${l.valor.toFixed(1)} KB > ${l.teto} KB (${(-l.folga).toFixed(1)} KB a mais)`,
        )
        .join("\n") +
      `\n\n  O teto está em \`performance-budget.json\`. Antes de pensar em subi-lo:` +
      `\n    1. o peso novo é necessário na primeira carga, ou dá para \`next/dynamic\`?` +
      `\n    2. a dependência tem alternativa menor?` +
      `\n    3. se é inevitável, suba o teto **no mesmo commit** e explique no corpo da mensagem.\n`,
  );
  process.exit(1);
}

console.log("\n✓ Tudo dentro do orçamento.\n");
