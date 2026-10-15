/**
 * Origem canônica do site.
 *
 * A ordem da cadeia de resolução é o que este teste realmente protege.
 * `VERCEL_URL` muda a cada deploy; se ela ganhasse do alias de produção,
 * o sitemap passaria a anunciar um hostname descartável e o Google
 * indexaria um deploy específico como se fosse a loja.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { siteUrl, absoluteUrl } from "@/lib/seo/infrastructure/site-url";

const KEYS = [
  "NEXT_PUBLIC_SITE_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL",
] as const;

const original: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of KEYS) {
    original[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

describe("siteUrl", () => {
  it("cai em localhost quando não há nada definido", () => {
    expect(siteUrl()).toBe("http://localhost:3000");
  });

  it("usa NEXT_PUBLIC_SITE_URL acima de tudo", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://maribeauty.com.br";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "belessence.vercel.app";
    process.env.VERCEL_URL = "belessence-abc123.vercel.app";

    expect(siteUrl()).toBe("https://maribeauty.com.br");
  });

  it("prefere o alias de produção ao hostname do deploy", () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "belessence.vercel.app";
    process.env.VERCEL_URL = "belessence-abc123.vercel.app";

    expect(siteUrl()).toBe("https://belessence.vercel.app");
  });

  it("usa o hostname do deploy só quando é o que existe (preview)", () => {
    process.env.VERCEL_URL = "belessence-abc123.vercel.app";
    expect(siteUrl()).toBe("https://belessence-abc123.vercel.app");
  });

  it("acrescenta https em hostname sem esquema", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "maribeauty.com.br";
    expect(siteUrl()).toBe("https://maribeauty.com.br");
  });

  it("remove barra final para não gerar URL com barra dupla", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://maribeauty.com.br/";
    expect(siteUrl()).toBe("https://maribeauty.com.br");
    expect(absoluteUrl("/sobre")).toBe("https://maribeauty.com.br/sobre");
  });

  it("não cacheia entre chamadas — preview e produção dividem o bundle", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://a.com";
    expect(siteUrl()).toBe("https://a.com");

    process.env.NEXT_PUBLIC_SITE_URL = "https://b.com";
    expect(siteUrl()).toBe("https://b.com");
  });
});

describe("absoluteUrl", () => {
  it("prefixa caminho relativo com a origem", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://maribeauty.com.br";
    expect(absoluteUrl("sobre")).toBe("https://maribeauty.com.br/sobre");
    expect(absoluteUrl("/sobre")).toBe("https://maribeauty.com.br/sobre");
  });

  it("devolve URL já absoluta sem tocar", () => {
    expect(absoluteUrl("https://res.cloudinary.com/a.jpg")).toBe(
      "https://res.cloudinary.com/a.jpg",
    );
  });
});
