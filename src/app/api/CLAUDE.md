# CLAUDE.md — `src/app/api/` (Route Handlers)

> Endpoints HTTP do app. Cada subpasta com `route.ts` vira uma rota.
> **Estas rotas são consumidas só por client components do app e por
> webhooks/integrações externas.** RSC não fala com elas — chama
> `src/lib/*` direto.

---

## 1. Rotas existentes

| Rota                       | Método(s) | Propósito                            |
| -------------------------- | --------- | ------------------------------------ |
| `/api/products`            | GET       | Listar produtos, filtrar por `?ids=` |
| `/api/checkout`            | POST      | Criar Order, processar pagamento     |
| `/api/coupon/validate`     | POST      | Validar cupom server-side            |
| `/api/cep/[cep]`           | GET       | Proxy ViaCEP (cacheável)             |
| `/api/newsletter`          | POST      | Inscrever lead                       |
| `/api/contact`             | POST      | Mensagem do form de contato          |
| `/api/reviews/[productId]` | GET, POST | Reviews do produto                   |
| `/api/admin/cloudinary`    | POST      | Assinatura de upload (protegida)     |

## 2. Esqueleto obrigatório

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  /* ... */
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload inválido", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    // ... lógica via @/lib/*
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/...]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
```

## 3. Regras inegociáveis

1. **Toda entrada externa passa por Zod.** Sem `as` em payload — sempre
   `safeParse` (ou `parse` em try/catch).
2. **Preço, estoque, desconto sempre vêm do banco.** O client envia
   `productId` + `quantity`; servidor recalcula tudo. A conta vive em
   [`src/lib/orders/domain/checkout-pricing.ts`](../../lib/orders/domain/checkout-pricing.ts),
   orquestrada por
   [`place-order.ts`](../../lib/orders/application/place-order.ts) — **não**
   no handler, que só faz Zod e status.
3. **Transações Prisma** (`prisma.$transaction`) para qualquer mutação que
   toque múltiplas tabelas (Order + OrderItem + Product.stock +
   Coupon.usedCount). A transação mora no **repositório do contexto**, não
   no handler: `ordersRepository.criarPedido`.
4. **Status HTTP corretos**:
   - 200 sucesso GET, 201 criação, 204 sem corpo
   - 400 payload inválido, 401 não autenticado, 403 sem permissão
   - 404 não encontrado, 409 conflito (ex.: cupom expirado, sem estoque)
   - 422 entidade inválida (regra de negócio violada)
   - 500 erro interno
5. **Nunca vazar stack/erros do Prisma para o client.** Logue
   server-side; responda mensagem genérica.
6. **Logs**: usar `console.error("[/api/rota]", err)` — prefixo facilita
   grep.

## 4. Rotas admin (`/api/admin/*`)

- Protegidas pelo middleware (`admin_session` cookie). Se chegou no
  handler, **já está autenticado**.
- Ainda assim, validar Zod e checar regras de negócio. Auth não é
  autorização.
- Cuidado com `revalidatePath` após mutações: chamar para que páginas
  públicas reflitam as mudanças.

## 5. Webhooks e integrações

- **Mercado Pago / Resend / Cloudinary**: rotas de webhook devem **validar
  assinatura/secret** antes de processar.
- Webhook é **idempotente** — receber o mesmo evento 2x não pode duplicar
  Order/email/cobrança. Checar por `paymentId` ou `eventId`.
- Webhook responde **200 rapidamente**; processamento longo vai para job
  separado (quando existir fila).

## 6. Caching

- Por padrão Route Handlers são **dinâmicos**. Para cache:
  - `export const dynamic = 'force-static'` quando aplicável (raro).
  - Headers `Cache-Control` explícitos para proxies (ex.: `/api/cep`).
- Não cachear nada que dependa de cookie/sessão.

## 7. Não faça

- Não usar `app/api` como camada de serviço interna do RSC — chame
  `src/lib/*` direto.
- Não retornar HTML/redirect de route handler que serve JSON. Mantenha
  contrato JSON consistente.
- Não acessar `process.env.ADMIN_SECRET` fora de auth — está em escopo
  errado.
- Não persistir dados do client sem revalidação server-side.
