/**
 * orders-repository — adapter Prisma do bounded context Orders.
 *
 * Único arquivo do contexto que conhece o Prisma. Application e domain
 * dependem do shape deste objeto, não do client diretamente (DIP).
 */
import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/shared/infrastructure/prisma-client";
import type { OrderStatus } from "../../domain/order-types";

/** Uma linha de `OrderItem`, já com o preço congelado do catálogo. */
export interface ItemDoPedido {
  productId: string;
  productName: string;
  productSlug: string;
  category: string;
  imageUrl: string;
  price: number;
  quantity: number;
}

export interface CriarPedidoInput {
  cliente: {
    name: string;
    email: string;
    phone: string;
    cpf: string;
  };
  endereco: {
    cep: string;
    street: string;
    number: string;
    complement?: string | null;
    neighborhood: string;
    city: string;
    state: string;
  };
  itens: ItemDoPedido[];
  subtotal: number;
  frete: number;
  desconto: number;
  total: number;
  /** Código já validado, ou `null` quando não houve cupom. */
  cupom: string | null;
}

export interface ApplyPaymentConfirmationInput {
  orderId: string;
  paymentId: string;
  mpStatus: string;
  paymentMethod: string;
  source: "checkout" | "webhook";
}

/**
 * Shape canônico do Order quando carregado com relations.
 * Mantém o tipo explícito (não depende de inferência cruzando wrappers
 * como `getOrderById` — robusto contra dessincronização de TS server/Prisma client).
 */
const ORDER_WITH_RELATIONS_INCLUDE = {
  items: true,
  events: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.OrderInclude;

export type OrderWithRelations = Prisma.OrderGetPayload<{
  include: typeof ORDER_WITH_RELATIONS_INCLUDE;
}>;

export const ordersRepository = {
  findById(id: string): Promise<OrderWithRelations | null> {
    return prisma.order.findUnique({
      where: { id },
      include: ORDER_WITH_RELATIONS_INCLUDE,
    });
  },

  findByEmail(email: string): Promise<OrderWithRelations[]> {
    return prisma.order.findMany({
      where: { customerEmail: email.toLowerCase() },
      orderBy: { createdAt: "desc" },
      include: ORDER_WITH_RELATIONS_INCLUDE,
    });
  },

  /**
   * Idempotência: chamado antes de `applyPaymentConfirmation`. Se retornar
   * truthy, o pagamento já foi processado e a confirmação é no-op.
   * Retorna o OrderEvent encontrado (útil para debug/log) ou null.
   */
  findEventForPayment(orderId: string, paymentId: string) {
    return prisma.orderEvent.findFirst({
      where: {
        orderId,
        metadata: { path: ["paymentId"], equals: paymentId },
      },
    });
  },

  /**
   * Aplica a regra de negócio: PAYMENT_CONFIRMED → PREPARING numa única
   * transação atômica. Persiste dois OrderEvents (com `auto: true` no
   * segundo para marcar transição derivada).
   */
  /**
   * Cria o pedido com os itens, debita estoque e consome o cupom — numa
   * transação só.
   *
   * Estava escrito à mão dentro do `POST /api/checkout`, que é o único
   * lugar do app onde o `prisma` era tocado fora deste arquivo, contra a
   * regra do `CLAUDE.md` deste contexto ("o único arquivo do contexto que
   * conhece o Prisma").
   *
   * Os três passos são **uma** transação porque pedido criado sem estoque
   * debitado vende o que não existe, e estoque debitado sem pedido criado
   * some com a mercadoria. O cupom entra junto pelo mesmo motivo.
   */
  criarPedido(input: CriarPedidoInput) {
    return prisma.$transaction(async (tx) => {
      const pedido = await tx.order.create({
        data: {
          status: "PENDING",
          customerName: input.cliente.name,
          customerEmail: input.cliente.email,
          customerPhone: input.cliente.phone,
          customerCpf: input.cliente.cpf,
          addressCep: input.endereco.cep,
          addressStreet: input.endereco.street,
          addressNumber: input.endereco.number,
          addressComplement: input.endereco.complement ?? null,
          addressNeighborhood: input.endereco.neighborhood,
          addressCity: input.endereco.city,
          addressState: input.endereco.state,
          subtotal: input.subtotal,
          shippingCost: input.frete,
          discount: input.desconto,
          total: input.total,
          couponCode: input.cupom,
          items: { create: input.itens },
        },
        include: { items: true },
      });

      for (const item of input.itens) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
            totalSold: { increment: item.quantity },
            seasonalSold: { increment: item.quantity },
          },
        });
      }

      if (input.cupom) {
        await tx.coupon.update({
          where: { code: input.cupom },
          data: { usedCount: { increment: 1 } },
        });
      }

      return pedido;
    });
  },

  /** Grava só os metadados do gateway, sem transitar de status. */
  registrarTentativaDePagamento(input: {
    orderId: string;
    paymentId: string;
    mpStatus: string;
    paymentMethod: string;
  }) {
    return prisma.order.update({
      where: { id: input.orderId },
      data: {
        mpPaymentId: input.paymentId,
        mpStatus: input.mpStatus,
        paymentMethod: input.paymentMethod,
      },
    });
  },

  applyPaymentConfirmation(input: ApplyPaymentConfirmationInput) {
    return prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: input.orderId },
        data: {
          status: "PAYMENT_CONFIRMED",
          mpPaymentId: input.paymentId,
          mpStatus: input.mpStatus,
          paymentMethod: input.paymentMethod,
        },
      });
      await tx.orderEvent.create({
        data: {
          orderId: input.orderId,
          status: "PAYMENT_CONFIRMED",
          metadata: {
            paymentId: input.paymentId,
            source: input.source,
          },
        },
      });
      await tx.order.update({
        where: { id: input.orderId },
        data: { status: "PREPARING" },
      });
      await tx.orderEvent.create({
        data: {
          orderId: input.orderId,
          status: "PREPARING",
          metadata: {
            paymentId: input.paymentId,
            source: input.source,
            auto: true,
          },
        },
      });
    });
  },
};

export type { OrderStatus };
