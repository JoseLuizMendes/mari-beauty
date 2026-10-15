/**
 * /admin/pedidos/[id] — Detalhe do pedido com mudança de status
 */

import { prisma } from "@/lib/shared/infrastructure/prisma-client";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { formatPrice } from "@/shadcn-utils/utils";
import { ArrowLeft } from "lucide-react";
import { OrderStatusForm } from "@/components/admin/order-status-form";
import { updateOrderStatus } from "../actions";
import { productImageSrc } from "@/lib/products/infrastructure/external/product-image";
import { PageHeader } from "@/components/admin/page-header";
import { CommittedPanel } from "@/components/admin/committed-panel";
import { StatusPill, type StatusTone } from "@/components/admin/status-pill";

const STATUS_INFO: Record<string, { label: string; tone: StatusTone }> = {
  PENDING: { label: "Aguardando", tone: "pending" },
  PAYMENT_CONFIRMED: { label: "Confirmado", tone: "active" },
  PREPARING: { label: "Preparando", tone: "progress" },
  SHIPPED: { label: "Enviado", tone: "shipped" },
  DELIVERED: { label: "Entregue", tone: "done" },
  CANCELLED: { label: "Cancelado", tone: "danger" },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order) notFound();

  const info = STATUS_INFO[order.status] ?? STATUS_INFO.PENDING;
  const updateStatus = updateOrderStatus.bind(null, id);

  return (
    <div>
      <Link
        href="/admin/pedidos"
        className="inline-flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase text-ink-soft hover:text-brand-wine mb-6 focus-ring rounded-sm transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para pedidos
      </Link>

      <PageHeader
        eyebrow="Pedido"
        title={`#${order.id.slice(0, 8).toUpperCase()}`}
        description={`Criado em ${formatDate(order.createdAt)}`}
        action={<StatusPill tone={info.tone}>{info.label}</StatusPill>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        {/* COLUNA PRINCIPAL */}
        <div className="space-y-6">
          <DetailSection eyebrow="Contato" title="Cliente">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <Field label="Nome">{order.customerName}</Field>
              <Field label="Email">{order.customerEmail}</Field>
              <Field label="Telefone">{order.customerPhone}</Field>
              <Field label="CPF">{order.customerCpf}</Field>
            </dl>
          </DetailSection>

          <DetailSection eyebrow="Logística" title="Endereço de entrega">
            <p className="text-sm text-ink-strong leading-relaxed">
              {order.addressStreet}, {order.addressNumber}
              {order.addressComplement && ` — ${order.addressComplement}`}
              <br />
              {order.addressNeighborhood}
              <br />
              {order.addressCity} — {order.addressState}
              <br />
              CEP {order.addressCep}
            </p>
          </DetailSection>

          <DetailSection
            eyebrow="Itens"
            title={`${order.items.length} ${order.items.length === 1 ? "produto" : "produtos"}`}
          >
            <ul className="[&>li+li]:border-t [&>li+li]:border-admin-soft">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="relative w-14 h-14 rounded-token-sm overflow-hidden bg-admin-panel-soft flex-shrink-0">
                    <Image
                      src={productImageSrc(item.imageUrl)}
                      alt={item.productName}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink-strong truncate">
                      {item.productName}
                    </p>
                    <p className="text-xs text-ink-muted font-data">
                      {item.quantity} × {formatPrice(Number(item.price))}
                    </p>
                  </div>
                  <p className="font-data text-sm font-medium text-brand-wine">
                    {formatPrice(Number(item.price) * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>
          </DetailSection>

          <DetailSection eyebrow="Financeiro" title="Pagamento">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <Field label="Método">{order.paymentMethod ?? "—"}</Field>
              <Field label="ID Pagamento" mono>
                {order.mpPaymentId ?? "—"}
              </Field>
              <Field label="Status do pagamento">{order.mpStatus ?? "—"}</Field>
              <Field label="Cupom aplicado">{order.couponCode ?? "—"}</Field>
            </dl>
          </DetailSection>
        </div>

        {/* SIDEBAR */}
        <aside className="space-y-6">
          {/* RESUMO — committed moment desta página */}
          <CommittedPanel eyebrow="Resumo">
            <dl className="space-y-2 text-sm">
              <Row
                label="Subtotal"
                value={formatPrice(Number(order.subtotal))}
              />
              {Number(order.discount) > 0 && (
                <Row
                  label="Desconto"
                  value={`−${formatPrice(Number(order.discount))}`}
                  tone="positive"
                />
              )}
              <Row
                label="Frete"
                value={formatPrice(Number(order.shippingCost))}
              />
              <div className="h-px bg-brand-pink/20 my-3" />
              <div className="flex justify-between text-base font-medium">
                <span>Total</span>
                <span className="font-data">
                  {formatPrice(Number(order.total))}
                </span>
              </div>
            </dl>
          </CommittedPanel>

          {/* MUDAR STATUS */}
          <OrderStatusForm
            currentStatus={order.status}
            currentTrackingCode={order.trackingCode}
            action={updateStatus}
          />
        </aside>
      </div>
    </div>
  );
}

function DetailSection({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-admin-panel border border-admin rounded-token-md p-6 shadow-petal-1">
      <div className="mb-5">
        <p className="admin-eyebrow mb-2">{eyebrow}</p>
        <h2 className="font-serif text-xl text-ink-strong leading-tight">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] tracking-[0.22em] uppercase text-ink-muted mb-1">
        {label}
      </dt>
      <dd
        className={
          mono ? "text-ink-strong font-data text-xs" : "text-ink-strong"
        }
      >
        {children}
      </dd>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive";
}) {
  return (
    <div className="flex justify-between">
      <span className="text-brand-pink/70">{label}</span>
      <span
        className={
          tone === "positive"
            ? "font-data text-emerald-200"
            : "font-data text-brand-pink"
        }
      >
        {value}
      </span>
    </div>
  );
}
