/**
 * /api/coupon/validate — POST
 * ─────────────────────────────────────────────────────────────────────
 * Valida um código de cupom contra um subtotal e retorna o desconto calculado.
 * Não incrementa o usedCount — isso só acontece no /api/checkout.
 *
 * Body: { code: string, subtotal: number }
 * Response: { valid, discount, message?, code?, type?, value? }
 */

import { NextRequest, NextResponse } from "next/server";
import { validateCoupon } from "@/lib/coupons/infrastructure/persistence/coupons-repository";
import { couponValidateSchema } from "@/lib/shared/domain/zod-schemas";
import { enforceRateLimit } from "@/lib/shared/infrastructure/with-rate-limit";

export async function POST(req: NextRequest) {
  const blocked = await enforceRateLimit(req, "couponValidate");
  if (blocked) return blocked;

  try {
    const body = await req.json();
    const parsed = couponValidateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          valid: false,
          discount: 0,
          message: "Dados inválidos",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const result = await validateCoupon(
      parsed.data.code,
      parsed.data.orderSubtotal,
    );

    return NextResponse.json(result, {
      status: result.valid ? 200 : 400,
    });
  } catch (error) {
    console.error("[/api/coupon/validate] Erro:", error);
    return NextResponse.json(
      {
        valid: false,
        discount: 0,
        message: "Erro interno ao validar cupom",
      },
      { status: 500 },
    );
  }
}
