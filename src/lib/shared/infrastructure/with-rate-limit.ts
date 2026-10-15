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

export async function enforceRateLimit(
  req: Request,
  name: RateLimitName,
): Promise<NextResponse | null> {
  const key = clientKeyFromHeaders(req.headers);
  const result = await checkRateLimit(name, key);
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
