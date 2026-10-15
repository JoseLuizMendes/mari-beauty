/**
 * Testes — contador de rate limit no Postgres.
 *
 * O que o unit pode provar aqui: a leitura da linha devolvida, a
 * degradação quando o banco falha e a limpeza oportunista.
 *
 * O que ele **não** pode provar: que o `INSERT ... ON CONFLICT` é atômico
 * sob concorrência — isso é comportamento do Postgres, não do TypeScript,
 * e está coberto contra banco real em `e2e/rate-limit.spec.ts`, com uma
 * rajada simultânea e asserção exata. Mesma divisão de camadas que o
 * `CLAUDE.md` de `src/test` descreve para o checkout.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { prisma } from "@/lib/shared/infrastructure/prisma-client";
import { PostgresRateLimitStore } from "@/lib/shared/infrastructure/rate-limit-store-postgres";

const queryRaw = vi.mocked(prisma.$queryRaw);
const deleteMany = vi.mocked(prisma.rateLimitWindow.deleteMany);

const AGORA = 1_700_000_000_000;
const JANELA = 60_000;

describe("PostgresRateLimitStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    // Fora da faixa de limpeza, para o caso comum não disparar DELETE.
    vi.spyOn(Math, "random").mockReturnValue(0.99);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("devolve o contador e o início da janela que o banco retornou", async () => {
    queryRaw.mockResolvedValue([
      { count: 3, windowStart: new Date(AGORA - 10_000) },
    ]);

    const store = new PostgresRateLimitStore();
    const hit = await store.hit("couponValidate:1.2.3.4", JANELA, AGORA);

    expect(hit).toEqual({ count: 3, windowStart: AGORA - 10_000 });
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it("aceita contador em BigInt (o driver devolve assim em alguns casos)", async () => {
    queryRaw.mockResolvedValue([
      { count: BigInt(7), windowStart: new Date(AGORA) },
    ]);

    const store = new PostgresRateLimitStore();
    const hit = await store.hit("contact:1.2.3.4", JANELA, AGORA);

    expect(hit.count).toBe(7);
    expect(typeof hit.count).toBe("number");
  });

  it("degrada para o contador em memória quando o banco falha", async () => {
    queryRaw.mockRejectedValue(new Error("conexão recusada"));

    const store = new PostgresRateLimitStore();
    const primeiro = await store.hit("contact:1.2.3.4", JANELA, AGORA);
    const segundo = await store.hit("contact:1.2.3.4", JANELA, AGORA + 10);

    // Degradar é continuar contando, não liberar.
    expect(primeiro.count).toBe(1);
    expect(segundo.count).toBe(2);
  });

  it("não deixa o aviso de degradação virar flood de log", async () => {
    queryRaw.mockRejectedValue(new Error("conexão recusada"));
    const erro = vi.mocked(console.error);

    const store = new PostgresRateLimitStore();
    await store.hit("contact:1.2.3.4", JANELA, AGORA);
    await store.hit("contact:1.2.3.4", JANELA, AGORA + 1_000);
    await store.hit("contact:1.2.3.4", JANELA, AGORA + 30_000);

    expect(erro).toHaveBeenCalledTimes(1);

    // Passada a janela de silêncio, volta a avisar.
    await store.hit("contact:1.2.3.4", JANELA, AGORA + 61_000);
    expect(erro).toHaveBeenCalledTimes(2);
  });

  it("limpa janelas vencidas de vez em quando, e não a cada chamada", async () => {
    queryRaw.mockResolvedValue([{ count: 1, windowStart: new Date(AGORA) }]);
    const store = new PostgresRateLimitStore();

    vi.spyOn(Math, "random").mockReturnValue(0.99);
    await store.hit("cep:1.2.3.4", JANELA, AGORA);
    expect(deleteMany).not.toHaveBeenCalled();

    vi.spyOn(Math, "random").mockReturnValue(0.001);
    await store.hit("cep:1.2.3.4", JANELA, AGORA);
    expect(deleteMany).toHaveBeenCalledTimes(1);
  });

  it("falha na limpeza não derruba a requisição em curso", async () => {
    queryRaw.mockResolvedValue([{ count: 2, windowStart: new Date(AGORA) }]);
    deleteMany.mockRejectedValue(new Error("deadlock"));
    vi.spyOn(Math, "random").mockReturnValue(0.001);

    const store = new PostgresRateLimitStore();

    await expect(store.hit("cep:1.2.3.4", JANELA, AGORA)).resolves.toEqual({
      count: 2,
      windowStart: AGORA,
    });
  });

  it("trata resposta vazia do banco como falha, e degrada", async () => {
    queryRaw.mockResolvedValue([]);

    const store = new PostgresRateLimitStore();
    const hit = await store.hit("newsletter:1.2.3.4", JANELA, AGORA);

    expect(hit.count).toBe(1);
  });
});
