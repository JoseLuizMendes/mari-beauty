/**
 * Guarda de rate limit para Route Handlers.
 * ─────────────────────────────────────────────────────────────────────
 * Uso no topo do handler:
 *
 *   export async function POST(req: NextRequest) {
 *     const blocked = await enforceRateLimit(req, "contact");
 *     if (blocked) return blocked;
 *     ...
 *   }
 *
 * Devolve `null` quando a requisição pode seguir, ou a resposta 429 pronta
 * quando deve ser barrada. O formato explícito (em vez de um wrapper que
 * engole o handler) mantém a tipagem do Route Handler intacta e deixa o
 * controle visível na primeira linha de quem lê o arquivo.
 */

import { NextResponse } from "next/server";
import {
  checkRateLimit,
  clientKeyFromHeaders,
  rateLimitHeaders,
  type RateLimitName,
} from "./rate-limit";
import { PostgresRateLimitStore } from "./rate-limit-store-postgres";

/**
 * Este módulo é a raiz de composição do rate limit: é aqui que se escolhe
 * o store, e por isso é o único lugar que importa Prisma.
 *
 * `rate-limit.ts` fica sem dependência de banco de propósito — assim o
 * motor e as regras continuam testáveis em unit, rápido, sem subir nada.
 *
 * O store é instanciado uma vez por processo. O `InMemoryRateLimitStore`
 * que ele carrega dentro só entra em cena se o Postgres falhar; ver o
 * cabeçalho de `rate-limit-store-postgres.ts`.
 */
const store = new PostgresRateLimitStore();

export async function enforceRateLimit(
  req: Request,
  name: RateLimitName,
): Promise<NextResponse | null> {
  const key = clientKeyFromHeaders(req.headers);
  const result = await checkRateLimit(name, key, store);
  const headers = rateLimitHeaders(name, result);

  if (result.allowed) return null;

  return NextResponse.json(
    {
      error: "Muitas requisições. Tente novamente em instantes.",
      retryAfterSeconds: result.retryAfterSeconds,
    },
    { status: 429, headers },
  );
}

/**
 * Só para testes — zera o contador que este módulo usa.
 *
 * `resetDefaultStore()` de `rate-limit.ts` não alcança este store: são
 * contadores diferentes, e o que atende os handlers é este.
 */
export function resetRateLimitStore(): void {
  store.clear();
}
