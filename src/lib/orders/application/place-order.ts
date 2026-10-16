/**
 * placeOrder — use case do checkout.
 * ─────────────────────────────────────────────────────────────────────
 * Orquestra o pedido inteiro: confere catálogo e estoque, recalcula o
 * dinheiro a partir do banco, aplica cupom, cobra frete, persiste em
 * transação e chama o gateway.
 *
 * Isto morava no `POST /api/checkout` — 233 linhas onde regra de negócio,
 * `NextResponse` e `prisma.$transaction` dividiam o mesmo escopo. Três
 * coisas quebravam com isso:
 *
 *  1. o `CLAUDE.md` da raiz diz "não espalhe regra em route handler" e
 *     o deste contexto diz que só o `orders-repository` conhece o Prisma.
 *     O handler violava os dois;
 *  2. a regra só era exercitável subindo uma `NextRequest` falsa;
 *  3. o webhook do gateway real vai precisar de parte desta orquestração,
 *     e copiar de dentro de um handler é como ela diverge.
 *
 * **O que NÃO mudou:** a ordem dos passos, os textos de erro, os status
 * devolvidos e o momento de cada escrita. É refactor — `api-checkout.test.ts`
 * passou sem uma linha alterada, e é essa a prova.
 */
import "server-only";
import { prisma } from "@/lib/shared/infrastructure/prisma-client";
import { validateCoupon } from "@/lib/coupons/infrastructure/persistence/coupons-repository";
import { getShippingCostByState } from "@/lib/shipping/infrastructure/external/shipping";
import { createPayment } from "@/lib/payment/infrastructure/external/payment-provider";
import { confirmPayment } from "./confirm-payment";
import {
  ordersRepository,
  type ItemDoPedido,
} from "../infrastructure/persistence/orders-repository";
import {
  baseDeCalculoDoFrete,
  calcularSubtotal,
  calcularTotal,
  idsForaDoCatalogo,
  primeiraFaltaDeEstoque,
  type ItemPedido,
  type ProdutoDoCatalogo,
} from "../domain/checkout-pricing";

export interface PlaceOrderInput {
  customer: { name: string; email: string; phone: string; cpf: string };
  address: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  items: ItemPedido[];
  couponCode?: string;
}

/**
 * Motivo de recusa. O handler traduz para status HTTP; o use case não
 * conhece HTTP — é o que permite reaproveitá-lo num webhook ou numa
 * Server Action sem arrastar `NextResponse` junto.
 */
export type MotivoRecusa =
  | "PRODUTO_NAO_ENCONTRADO"
  | "ESTOQUE_INSUFICIENTE"
  | "CUPOM_INVALIDO";

export type PlaceOrderResult =
  | {
      ok: true;
      orderId: string;
      status: "PREPARING" | "PENDING";
      paymentMethod: string;
    }
  | { ok: false; motivo: MotivoRecusa; mensagem: string };

export async function placeOrder(
  input: PlaceOrderInput,
): Promise<PlaceOrderResult> {
  const { customer, address, items, couponCode } = input;

  // ── 1. Catálogo: preço e estoque vêm do banco, nunca do client ─────────
  const produtos = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
  });

  const catalogo = new Map<string, ProdutoDoCatalogo>(
    produtos.map((p) => [
      p.id,
      { id: p.id, name: p.name, price: Number(p.price), stock: p.stock },
    ]),
  );

  if (idsForaDoCatalogo(items, catalogo).length > 0) {
    return {
      ok: false,
      motivo: "PRODUTO_NAO_ENCONTRADO",
      mensagem: "Um ou mais produtos não foram encontrados",
    };
  }

  const falta = primeiraFaltaDeEstoque(items, catalogo);
  if (falta) {
    return {
      ok: false,
      motivo: "ESTOQUE_INSUFICIENTE",
      mensagem: `Estoque insuficiente para "${falta.nome}" (disponível: ${falta.disponivel})`,
    };
  }

  // ── 2. Dinheiro ────────────────────────────────────────────────────────
  const subtotal = calcularSubtotal(items, catalogo);

  let desconto = 0;
  let cupomAplicado: string | null = null;
  if (couponCode && couponCode.trim()) {
    const resultado = await validateCoupon(couponCode, subtotal);
    if (!resultado.valid) {
      return {
        ok: false,
        motivo: "CUPOM_INVALIDO",
        mensagem: resultado.message ?? "Cupom inválido",
      };
    }
    desconto = resultado.discount;
    cupomAplicado = resultado.code ?? null;
  }

  // O frete sai da base JÁ com desconto — ver `baseDeCalculoDoFrete`.
  const base = baseDeCalculoDoFrete(subtotal, desconto);
  const frete = getShippingCostByState(address.state, base);
  const total = calcularTotal(base, frete);

  // ── 3. Persiste pedido + estoque + cupom numa transação ────────────────
  const itensDoPedido: ItemDoPedido[] = items.map((item) => {
    const produto = produtos.find((p) => p.id === item.productId)!;
    return {
      productId: produto.id,
      productName: produto.name,
      productSlug: produto.slug,
      category: produto.category,
      imageUrl: produto.images[0] ?? "",
      price: Number(produto.price),
      quantity: item.quantity,
    };
  });

  const pedido = await ordersRepository.criarPedido({
    cliente: customer,
    endereco: address,
    itens: itensDoPedido,
    subtotal,
    frete,
    desconto,
    total,
    cupom: cupomAplicado,
  });

  // ── 4. Gateway ─────────────────────────────────────────────────────────
  const pagamento = await createPayment({
    orderId: pedido.id,
    amount: total,
    customerName: customer.name,
    customerEmail: customer.email,
    customerCpf: customer.cpf,
  });

  // approved → `confirmPayment` transita PAYMENT_CONFIRMED → PREPARING
  // (idempotente). pending/rejected → só guarda o paymentId, e quem fecha
  // o pedido depois é o webhook.
  if (pagamento.status === "approved") {
    await confirmPayment({
      orderId: pedido.id,
      paymentId: pagamento.paymentId,
      mpStatus: pagamento.status,
      paymentMethod: pagamento.paymentMethod,
      source: "checkout",
    });

    return {
      ok: true,
      orderId: pedido.id,
      status: "PREPARING",
      paymentMethod: pagamento.paymentMethod,
    };
  }

  await ordersRepository.registrarTentativaDePagamento({
    orderId: pedido.id,
    paymentId: pagamento.paymentId,
    mpStatus: pagamento.status,
    paymentMethod: pagamento.paymentMethod,
  });

  return {
    ok: true,
    orderId: pedido.id,
    status: "PENDING",
    paymentMethod: pagamento.paymentMethod,
  };
}
