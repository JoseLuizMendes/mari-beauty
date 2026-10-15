/**
 * /api/reviews — POST
 * ─────────────────────────────────────────────────────────────────────
 * Cria uma nova review e atualiza o rating médio do produto.
 *
 * Auto-aprovação habilitada (`approved: true`) por padrão para mock.
 * Em produção, mudar para `approved: false` e ter um admin aprovando.
 *
 * Body: { productId, authorName, authorEmail, rating (1-5), text? (max 250) }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/shared/infrastructure/prisma-client";
import { reviewSchema } from "@/lib/shared/domain/zod-schemas";
import { enforceRateLimit } from "@/lib/shared/infrastructure/with-rate-limit";

export async function POST(req: NextRequest) {
  const blocked = await enforceRateLimit(req, "reviews");
  if (blocked) return blocked;

  try {
    const body = await req.json();
    const parsed = reviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { productId, authorName, authorEmail, rating, text } = parsed.data;

    // Verifica se produto existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Produto não encontrado" },
        { status: 404 },
      );
    }

    // Cria review + recalcula média do produto em transação
    const review = await prisma.$transaction(async (tx) => {
      const newReview = await tx.review.create({
        data: {
          productId,
          authorName,
          authorEmail: authorEmail.toLowerCase(),
          rating,
          text: text ?? null,
          approved: true, // auto-aprovação
        },
      });

      // Recalcula rating médio e count
      const approvedReviews = await tx.review.findMany({
        where: { productId, approved: true },
        select: { rating: true },
      });

      const avgRating =
        approvedReviews.length > 0
          ? approvedReviews.reduce((acc, r) => acc + r.rating, 0) /
            approvedReviews.length
          : 0;

      await tx.product.update({
        where: { id: productId },
        data: {
          rating: Math.round(avgRating * 10) / 10, // 1 casa decimal
          reviews: approvedReviews.length,
        },
      });

      return newReview;
    });

    return NextResponse.json({
      success: true,
      review,
      message: "Sua avaliação foi publicada. Obrigada!",
    });
  } catch (error) {
    console.error("[/api/reviews] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao publicar avaliação" },
      { status: 500 },
    );
  }
}
