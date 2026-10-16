/**
 * Guarda de integridade dos CLAUDE.md
 * ─────────────────────────────────────────────────────────────────────
 * Motivo (auditoria 2026-10, P0.4): o refactor "Rodada 4 Hexagonal" moveu
 * `src/lib/` inteiro e nenhum CLAUDE.md acompanhou. Durante 123 commits o
 * arquivo que todo agente lê primeiro apontava para cinco caminhos mortos
 * (`src/lib/prisma.ts`, `src/lib/validations.ts`, `@/api/utils`…) e descrevia
 * um modelo de segurança que já tinha sido substituído.
 *
 * Nada verificava isso. Agora verifica: todo caminho de arquivo citado em
 * qualquer CLAUDE.md do repo precisa existir no disco.
 *
 * O que este teste NÃO pega: afirmações em prosa ("o middleware usa JWT").
 * Essas continuam sendo responsabilidade do checklist de PR.
 */

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");

/** Diretórios que nunca contêm CLAUDE.md nosso. */
const IGNORED_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "coverage",
  "test-results",
  "playwright-report",
  "src/generated",
]);

function findClaudeMds(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const rel = path.relative(ROOT, full).replace(/\\/g, "/");
    if (IGNORED_DIRS.has(entry) || IGNORED_DIRS.has(rel)) continue;

    if (statSync(full).isDirectory()) {
      findClaudeMds(full, found);
    } else if (entry === "CLAUDE.md") {
      found.push(full);
    }
  }
  return found;
}

const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|css|json|md|prisma|yml|yaml)$/;

/**
 * Linhas que descrevem um arquivo que ainda NÃO existe — intenção documentada,
 * não referência quebrada. A prosa precisa dizer isso explicitamente; se disser,
 * respeitamos. É o que permite documentar o roadmap sem o teste reclamar.
 */
const PLANNED_MARKER =
  /\b(a criar|pendente|futuro|quando promovid|caso troque|planejad|ainda não|não existe)/i;

/**
 * Linhas que registram de ONDE um arquivo veio — o espelho do marcador acima.
 * Uma nota de migração ("`src/lib/prisma.ts` → `.../prisma-client.ts`") cita um
 * caminho que *deve* estar morto: é o registro de que ele morreu. Verificar
 * essas linhas forçaria a reescrever a história a cada refactor, que foi
 * exatamente o estrago que a primeira versão desta varredura causou.
 */
const HISTORICAL_MARKER =
  /(\bex-`|→|\bmovid[oa]s?\b|\bantes d[eo]\b|^#+\s*Histórico)/i;

/** Ferramenta do vault Dev (fora deste repo) citada no cabeçalho de origem. */
const EXTERNAL_PATHS = new Set(["tools/generate-claude-md.js"]);

/**
 * Artefato gerado, que não existe em checkout limpo.
 *
 * `/src/generated` é gitignored (cliente do Prisma). O CI falhou aqui na
 * primeira rodada justamente por isso: a doc cita `@/generated/prisma`
 * corretamente, mas o diretório só passa a existir depois do generate — e
 * nem sempre nesse caminho. Caminho gerado não é responsabilidade da doc.
 *
 * `.next/` entrou pelo mesmo motivo, e o CI pegou do mesmo jeito: o
 * `scripts/CLAUDE.md` cita `.next/build-manifest.json` ao explicar o
 * orçamento de performance, o que está **certo** — é o arquivo que o script
 * lê. Só que o job `unit` não builda, então o caminho não existe lá, e o
 * teste passava na minha máquina só porque eu tinha acabado de buildar.
 * Obrigar a doc a falar por rodeios para o teste passar seria piorar a doc
 * para agradar a guarda.
 */
const GENERATED_PREFIXES = ["@/generated", "src/generated", ".next"];

/**
 * Convenções do App Router citadas como padrão, não como arquivo concreto.
 * `[slug]/page.tsx` na tabela de nomenclatura é exemplo de forma, não um path.
 */
const CONVENTION_PATHS = new Set([
  "[slug]/page.tsx",
  "route.ts",
  "page.tsx",
  "layout.tsx",
  "opengraph-image.tsx",
]);

/**
 * Extrai caminhos de arquivo citados no markdown.
 *
 * Pega duas formas:
 *   - link markdown:  [texto](src/lib/foo.ts)
 *   - code span:      `src/lib/foo.ts` (inclusive com alias `@/lib/foo`)
 *
 * Ignora: URLs, globs, placeholders, linhas de roadmap ou de histórico,
 * convenções do App Router e ferramentas externas ao repo.
 */
function extractPaths(markdown: string): string[] {
  const paths = new Set<string>();

  for (const line of markdown.split("\n")) {
    if (PLANNED_MARKER.test(line) || HISTORICAL_MARKER.test(line)) continue;

    for (const [, href] of line.matchAll(/\[[^\]]*\]\(([^)]+)\)/g))
      paths.add(href);
    for (const [, span] of line.matchAll(/`([^`\n]+)`/g)) paths.add(span);
  }

  return [...paths]
    .map((p) => p.trim())
    .filter((p) => {
      if (/^(https?:|mailto:|#)/.test(p)) return false;
      if (/[<>*\s|]/.test(p)) return false;
      if (EXTERNAL_PATHS.has(p) || CONVENTION_PATHS.has(p)) return false;
      if (GENERATED_PREFIXES.some((prefix) => p.startsWith(prefix)))
        return false;
      if (p.startsWith("@/")) return true;
      if (!p.includes("/")) return false;
      return SOURCE_EXT.test(p);
    });
}

/** Resolve o caminho citado para posições possíveis no disco. */
function candidatesFor(cited: string, mdDir: string): string[] {
  if (cited.startsWith("@/")) {
    const base = path.join(ROOT, "src", cited.slice(2));
    return [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")];
  }
  // Caminho relativo ao CLAUDE.md que o cita, ou à raiz do app.
  return [path.resolve(mdDir, cited), path.resolve(ROOT, cited)];
}

describe("CLAUDE.md — integridade dos caminhos citados", () => {
  const claudeMds = findClaudeMds(ROOT);

  it("encontra os CLAUDE.md do repo", () => {
    expect(claudeMds.length).toBeGreaterThan(5);
  });

  it.each(
    claudeMds.map((f) => [path.relative(ROOT, f).replace(/\\/g, "/"), f]),
  )("%s cita apenas caminhos que existem", (_rel, file) => {
    const mdDir = path.dirname(file);
    const cited = extractPaths(readFileSync(file, "utf8"));

    const missing = cited.filter(
      (p) => !candidatesFor(p, mdDir).some(existsSync),
    );

    expect(
      missing,
      `Caminhos citados que não existem no disco:\n  ${missing.join("\n  ")}\n` +
        `Se você moveu um arquivo, atualize o CLAUDE.md do diretório.`,
    ).toEqual([]);
  });
});
