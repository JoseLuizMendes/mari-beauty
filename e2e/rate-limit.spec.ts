import { test, expect } from "@playwright/test";
import { RATE_LIMITS } from "../src/lib/shared/infrastructure/rate-limit";

/**
 * E2E — Rate limit distribuído (contador no Postgres).
 * ─────────────────────────────────────────────────────────────────────
 * Este teste existe por um motivo específico: **só concorrência prova o
 * que mudou.** Uma implementação que lê o contador, decide em TypeScript
 * e grava de volta passa num teste sequencial e falha aqui — duas
 * requisições simultâneas leem `9`, as duas gravam `10`, e passaram 11.
 *
 * Por isso os pedidos saem todos juntos (`Promise.all`) e a asserção é
 * **exata**: nem "pelo menos um 429", nem "no máximo tantos". Exatamente
 * `limit` passam.
 *
 * O alvo é `/api/coupon/validate` porque é a rota mais sensível do
 * conjunto: sem throttle dá para enumerar códigos de cupom por força
 * bruta.
 */

const REGRA = "couponValidate" as const;
const LIMITE = RATE_LIMITS[REGRA].limit;
const RAJADA = LIMITE + 5;

/**
 * IP próprio, de uso exclusivo deste spec.
 *
 * A chave do contador é `<regra>:<cliente>`, e o cliente sai do
 * `x-forwarded-for`. Sem um IP só nosso, esta rajada consumiria a cota de
 * cupom do `checkout-flow`, que valida `BELES10` no meio do fluxo — e o
 * teste de receita quebraria por culpa deste aqui. Faixa TEST-NET-3
 * (RFC 5737), reservada para documentação e teste.
 */
const IP = `203.0.113.${10 + Math.floor(Math.random() * 200)}`;

test("rajada concorrente: exatamente `limit` passam, o resto leva 429", async ({
  request,
}) => {
  const respostas = await Promise.all(
    Array.from({ length: RAJADA }, () =>
      request.post("/api/coupon/validate", {
        headers: { "x-forwarded-for": IP },
        // Código inexistente de propósito: queremos exercitar o contador,
        // não o cupom. A rota responde 400 (cupom inválido) nas que
        // passam pelo limite, e 429 nas barradas — é a distinção que
        // interessa.
        data: { code: "NAO-EXISTE-NUNCA", orderSubtotal: 100 },
        failOnStatusCode: false,
      }),
    ),
  );

  const status = respostas.map((r) => r.status());
  const barradas = status.filter((s) => s === 429).length;
  const passaram = status.length - barradas;

  expect(
    passaram,
    `esperado exatamente ${LIMITE} passando; ${passaram} passaram. ` +
      `Mais que isso significa contador com corrida (leitura e escrita ` +
      `em passos separados).`,
  ).toBe(LIMITE);
  expect(barradas).toBe(RAJADA - LIMITE);
});

test("resposta barrada traz os headers que o cliente precisa", async ({
  request,
}) => {
  const ipLocal = `203.0.113.${10 + Math.floor(Math.random() * 200)}`;

  let barrada = null;
  for (let i = 0; i < LIMITE + 1; i++) {
    const r = await request.post("/api/coupon/validate", {
      headers: { "x-forwarded-for": ipLocal },
      data: { code: "NAO-EXISTE-NUNCA", orderSubtotal: 100 },
      failOnStatusCode: false,
    });
    if (r.status() === 429) barrada = r;
  }

  expect(barrada, "a requisição extra deveria ter sido barrada").not.toBeNull();
  const headers = barrada!.headers();
  expect(headers["ratelimit-limit"]).toBe(String(LIMITE));
  expect(headers["ratelimit-remaining"]).toBe("0");
  expect(Number(headers["retry-after"])).toBeGreaterThan(0);
});
