import { describe, it, expect, beforeEach } from "vitest";
import {
  checkRateLimit,
  clientKeyFromHeaders,
  rateLimitHeaders,
  InMemoryRateLimitStore,
  RATE_LIMITS,
  resetDefaultStore,
} from "@/lib/shared/infrastructure/rate-limit";

beforeEach(() => resetDefaultStore());

describe("checkRateLimit", () => {
  it("libera enquanto está dentro do limite", async () => {
    const store = new InMemoryRateLimitStore();
    const { limit } = RATE_LIMITS.couponValidate;

    for (let i = 1; i <= limit; i++) {
      const r = await checkRateLimit("couponValidate", "1.1.1.1", store);
      expect(r.allowed, `requisição ${i} deveria passar`).toBe(true);
      expect(r.remaining).toBe(limit - i);
    }
  });

  it("bloqueia a requisição seguinte ao limite", async () => {
    const store = new InMemoryRateLimitStore();
    const { limit } = RATE_LIMITS.couponValidate;

    for (let i = 0; i < limit; i++) {
      await checkRateLimit("couponValidate", "1.1.1.1", store);
    }

    const blocked = await checkRateLimit("couponValidate", "1.1.1.1", store);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("isola chaves diferentes", async () => {
    const store = new InMemoryRateLimitStore();
    for (let i = 0; i < RATE_LIMITS.contact.limit; i++) {
      await checkRateLimit("contact", "1.1.1.1", store);
    }

    expect((await checkRateLimit("contact", "1.1.1.1", store)).allowed).toBe(
      false,
    );
    expect((await checkRateLimit("contact", "2.2.2.2", store)).allowed).toBe(
      true,
    );
  });

  it("isola rotas diferentes para o mesmo IP", async () => {
    const store = new InMemoryRateLimitStore();
    for (let i = 0; i < RATE_LIMITS.contact.limit; i++) {
      await checkRateLimit("contact", "1.1.1.1", store);
    }

    expect((await checkRateLimit("contact", "1.1.1.1", store)).allowed).toBe(
      false,
    );
    expect((await checkRateLimit("newsletter", "1.1.1.1", store)).allowed).toBe(
      true,
    );
  });

  it("libera de novo quando a janela expira", async () => {
    const store = new InMemoryRateLimitStore();
    const t0 = 1_000_000;
    const windowMs = RATE_LIMITS.couponValidate.windowSeconds * 1000;

    for (let i = 0; i < RATE_LIMITS.couponValidate.limit; i++) {
      await checkRateLimit("couponValidate", "1.1.1.1", store, t0);
    }
    expect(
      (await checkRateLimit("couponValidate", "1.1.1.1", store, t0)).allowed,
    ).toBe(false);

    const depois = t0 + windowMs + 1;
    expect(
      (await checkRateLimit("couponValidate", "1.1.1.1", store, depois))
        .allowed,
    ).toBe(true);
  });

  it("ainda bloqueia logo antes da janela virar", async () => {
    const store = new InMemoryRateLimitStore();
    const t0 = 1_000_000;
    const windowMs = RATE_LIMITS.couponValidate.windowSeconds * 1000;

    for (let i = 0; i < RATE_LIMITS.couponValidate.limit; i++) {
      await checkRateLimit("couponValidate", "1.1.1.1", store, t0);
    }

    const quase = t0 + windowMs - 1;
    expect(
      (await checkRateLimit("couponValidate", "1.1.1.1", store, quase)).allowed,
    ).toBe(false);
  });
});

describe("InMemoryRateLimitStore — contenção de memória", () => {
  it("não cresce além do teto de chaves", async () => {
    const store = new InMemoryRateLimitStore(5);
    const windowMs = 60_000;

    for (let i = 0; i < 50; i++) {
      await store.hit(`chave-${i}`, windowMs, 1_000 + i);
    }

    // Sonda: a primeira chave já deve ter sido descartada.
    const primeira = await store.hit("chave-0", windowMs, 1_000);
    expect(primeira.count).toBe(1);
  });

  it("descarta janelas expiradas antes de recorrer ao despejo", async () => {
    const store = new InMemoryRateLimitStore(3);
    const windowMs = 1_000;

    await store.hit("a", windowMs, 0);
    await store.hit("b", windowMs, 0);
    await store.hit("c", windowMs, 0);

    // Muito depois: as três expiraram e saem na limpeza.
    const nova = await store.hit("d", windowMs, 10_000);
    expect(nova.count).toBe(1);
  });
});

describe("clientKeyFromHeaders", () => {
  it("usa o primeiro IP de x-forwarded-for", () => {
    const h = new Headers({
      "x-forwarded-for": "203.0.113.5, 70.41.3.18, 150.172.238.178",
    });
    expect(clientKeyFromHeaders(h)).toBe("203.0.113.5");
  });

  it("cai para x-real-ip quando não há forwarded", () => {
    expect(
      clientKeyFromHeaders(new Headers({ "x-real-ip": "198.51.100.7" })),
    ).toBe("198.51.100.7");
  });

  it("devolve 'desconhecido' sem nenhum header de IP", () => {
    expect(clientKeyFromHeaders(new Headers())).toBe("desconhecido");
  });

  it("ignora x-forwarded-for vazio", () => {
    const h = new Headers({
      "x-forwarded-for": "",
      "x-real-ip": "198.51.100.7",
    });
    expect(clientKeyFromHeaders(h)).toBe("198.51.100.7");
  });
});

describe("rateLimitHeaders", () => {
  it("expõe limite e restante quando liberado", async () => {
    const store = new InMemoryRateLimitStore();
    const r = await checkRateLimit("contact", "1.1.1.1", store);
    const h = rateLimitHeaders("contact", r);

    expect(h["RateLimit-Limit"]).toBe(String(RATE_LIMITS.contact.limit));
    expect(h["RateLimit-Remaining"]).toBe(
      String(RATE_LIMITS.contact.limit - 1),
    );
    expect(h["Retry-After"]).toBeUndefined();
  });

  it("inclui Retry-After quando bloqueado", async () => {
    const store = new InMemoryRateLimitStore();
    for (let i = 0; i <= RATE_LIMITS.contact.limit; i++) {
      await checkRateLimit("contact", "1.1.1.1", store);
    }
    const r = await checkRateLimit("contact", "1.1.1.1", store);
    expect(rateLimitHeaders("contact", r)["Retry-After"]).toBeDefined();
  });
});

describe("RATE_LIMITS — sanidade das regras", () => {
  it("toda regra tem limite e janela positivos", () => {
    for (const [nome, regra] of Object.entries(RATE_LIMITS)) {
      expect(regra.limit, nome).toBeGreaterThan(0);
      expect(regra.windowSeconds, nome).toBeGreaterThan(0);
    }
  });

  it("couponValidate é a regra mais apertada por minuto", () => {
    const porMinuto = (r: { limit: number; windowSeconds: number }) =>
      (r.limit / r.windowSeconds) * 60;

    // O CEP é proxy de leitura e pode ser mais frouxo; comparamos com os
    // endpoints de escrita, que são os que criam linha no banco.
    expect(porMinuto(RATE_LIMITS.couponValidate)).toBeGreaterThan(
      porMinuto(RATE_LIMITS.contact),
    );
  });
});
