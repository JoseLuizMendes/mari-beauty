/**
 * sitemap.ts e robots.ts.
 *
 * Os dois precisam concordar: URL anunciada no sitemap que o robots
 * bloqueia é sinal contraditório, e o Google reporta como erro no Search
 * Console. O teste cruza as duas listas.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const getAllProducts = vi.fn();

vi.mock(
  "@/lib/products/infrastructure/persistence/products-repository",
  () => ({ getAllProducts: () => getAllProducts() }),
);

const ENV_KEYS = [
  "NEXT_PUBLIC_SITE_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL",
  "VERCEL_ENV",
] as const;

const original: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    original[key] = process.env[key];
    delete process.env[key];
  }
  process.env.NEXT_PUBLIC_SITE_URL = "https://belessence.vercel.app";
  getAllProducts.mockReset();
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

async function loadSitemap() {
  const mod = await import("@/app/sitemap");
  return mod.default();
}

async function loadRobots() {
  const mod = await import("@/app/robots");
  return mod.default();
}

describe("sitemap", () => {
  it("inclui estáticas, coleções e produtos do banco", async () => {
    getAllProducts.mockResolvedValue([
      { slug: "essencia-noturna", updatedAt: new Date("2026-10-01") },
      { slug: "elegancia-diurna", updatedAt: new Date("2026-10-02") },
    ]);

    const entries = await loadSitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain("https://belessence.vercel.app/");
    expect(urls).toContain("https://belessence.vercel.app/allProducts");
    expect(urls).toContain(
      "https://belessence.vercel.app/collections/essencia-noturna",
    );
    expect(urls).toContain(
      "https://belessence.vercel.app/product/essencia-noturna",
    );
  });

  it("sobrevive ao banco fora do ar com as páginas estáticas", async () => {
    getAllProducts.mockRejectedValue(new Error("ECONNREFUSED"));

    const entries = await loadSitemap();

    // Um sitemap parcial vale mais que um 500: erro repetido faz o Google
    // parar de pedir o arquivo.
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.map((e) => e.url)).toContain(
      "https://belessence.vercel.app/",
    );
  });

  it("não anuncia nenhuma rota que o robots bloqueia", async () => {
    getAllProducts.mockResolvedValue([]);
    process.env.VERCEL_ENV = "production";

    const entries = await loadSitemap();
    const robots = await loadRobots();
    const rules = robots.rules as { disallow?: string[] };
    const disallowed = rules.disallow ?? [];

    for (const entry of entries) {
      const pathname = new URL(entry.url).pathname;
      for (const blocked of disallowed) {
        expect(
          pathname.startsWith(blocked),
          `${pathname} está no sitemap e bloqueado por "${blocked}"`,
        ).toBe(false);
      }
    }
  });
});

describe("robots", () => {
  it("bloqueia tudo fora de produção — preview duplicaria o catálogo", async () => {
    process.env.VERCEL_ENV = "preview";

    const robots = await loadRobots();

    expect(robots.rules).toEqual({ userAgent: "*", disallow: "/" });
    expect(robots.sitemap).toBeUndefined();
  });

  it("em produção libera o site e aponta o sitemap", async () => {
    process.env.VERCEL_ENV = "production";

    const robots = await loadRobots();
    const rules = robots.rules as { allow?: string; disallow?: string[] };

    expect(rules.allow).toBe("/");
    expect(rules.disallow).toContain("/admin/");
    expect(rules.disallow).toContain("/api/");
    expect(rules.disallow).toContain("/lab/");
    expect(robots.sitemap).toBe("https://belessence.vercel.app/sitemap.xml");
  });
});
