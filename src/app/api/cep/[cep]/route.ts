/**
 * /api/cep/[cep] — GET
 * ─────────────────────────────────────────────────────────────────────
 * Busca endereço no ViaCEP e calcula custo de frete para o subtotal informado.
 *
 * Query params: ?subtotal=199.90 (opcional, default 0)
 * Response: { cep, street, neighborhood, city, state, shippingCost, isFreeShippingEligible }
 */

import { NextRequest, NextResponse } from "next/server";
import { getShippingFromCEP } from "@/lib/shipping/infrastructure/external/shipping";
import { enforceRateLimit } from "@/lib/shared/infrastructure/with-rate-limit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cep: string }> },
) {
  const blocked = await enforceRateLimit(req, "cep");
  if (blocked) return blocked;

  try {
    const { cep } = await params;
    const subtotalParam = req.nextUrl.searchParams.get("subtotal");
    const subtotal = subtotalParam ? Number(subtotalParam) : 0;

    if (Number.isNaN(subtotal) || subtotal < 0) {
      return NextResponse.json({ error: "Subtotal inválido" }, { status: 400 });
    }

    const result = await getShippingFromCEP(cep, subtotal);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao consultar CEP";
    const status = message.includes("não encontrado")
      ? 404
      : message.includes("inválido")
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
