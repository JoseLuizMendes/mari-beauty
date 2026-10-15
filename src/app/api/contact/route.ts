/**
 * POST /api/contact — Recebe mensagens do formulário /contato
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/shared/infrastructure/prisma-client";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/shared/infrastructure/with-rate-limit";
import { HONEYPOT_FIELD_NAME } from "@/components/ui/honeypot-field";

const contactSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  subject: z.string().min(3, "Assunto deve ter pelo menos 3 caracteres"),
  message: z.string().min(10, "Mensagem deve ter pelo menos 10 caracteres"),
});

export async function POST(req: NextRequest) {
  const blocked = await enforceRateLimit(req, "contact");
  if (blocked) return blocked;

  try {
    const body = await req.json();
    // Honeypot: humano não vê o campo, bot preenche. Respondemos como
    // sucesso de propósito — devolver erro ensina o bot a tentar de novo
    // sem o campo. Para ele, parece que funcionou; nada foi gravado.
    if (
      typeof body?.[HONEYPOT_FIELD_NAME] === "string" &&
      body[HONEYPOT_FIELD_NAME].length > 0
    ) {
      console.warn(
        "[/api/contact] honeypot acionado — descartado silenciosamente",
      );
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    await prisma.contactMessage.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        subject: parsed.data.subject,
        message: parsed.data.message,
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("[/api/contact] erro:", error);
    return NextResponse.json(
      { error: "Erro ao enviar mensagem" },
      { status: 500 },
    );
  }
}
