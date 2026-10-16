/**
 * /api/checkout — POST
 * ─────────────────────────────────────────────────────────────────────
 * Fronteira HTTP e nada além disso: valida o corpo com Zod, chama o use
 * case e traduz o resultado em status.
 *
 * A regra de negócio vive em
 * [`placeOrder`](../../../lib/orders/application/place-order.ts) — este
 * arquivo tinha 233 linhas com `prisma.$transaction`, cálculo de frete e
 * chamada de gateway no meio, contra o `CLAUDE.md` da raiz ("não espalhe
 * regra em route handler") e o do contexto `orders` ("o único arquivo do
 * contexto que conhece o Prisma é o repositório").
 */

import { NextRequest, NextResponse } from "next/server";
import { checkoutSchema } from "@/lib/shared/domain/zod-schemas";
import { placeOrder } from "@/lib/orders/application/place-order";
import { z } from "zod";

// ─── Schema do body ──────────────────────────────────────────────────────────

const cartItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
});

const checkoutBodySchema = z.object({
  customer: checkoutSchema.shape.customer,
  address: checkoutSchema.shape.address,
  items: z.array(cartItemSchema).min(1, "Carrinho vazio"),
  couponCode: z.string().optional(),
});

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const parsed = checkoutBodySchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const resultado = await placeOrder(parsed.data);

    // Toda recusa do domínio é 400: são todas culpa do pedido (produto
    // sumiu, estoque acabou, cupom não vale), não do servidor.
    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.mensagem }, { status: 400 });
    }

    return NextResponse.json({
      orderId: resultado.orderId,
      status: resultado.status,
      paymentMethod: resultado.paymentMethod,
    });
  } catch (error) {
    console.error("[/api/checkout] Erro:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao processar pedido",
      },
      { status: 500 },
    );
  }
}
