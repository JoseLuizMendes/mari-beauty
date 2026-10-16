"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Package,
  CreditCard,
  PackageCheck,
  Truck,
  MapPin,
  Navigation,
  Home,
  Check,
  X,
  ExternalLink,
  Clock,
} from "lucide-react";
import type { TrackingOrderData } from "@/lib/orders/domain/order-tracking";
import type { OrderStatus } from "@/lib/orders/domain/order-types";

/* ─── Types ────────────────────────────────────────────────── */
// `TrackingOrderData` e `OrderStatus` agora vivem em `@/lib/orders/domain/*`
// e são importados acima — fonte única do shape compartilhado server/client.

/* ─── Timeline Step Definition ─────────────────────────────── */

interface TimelineStep {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  /** Offset em ms a partir do createdAt para simular a data */
  offsetMs: number;
}

const TIMELINE_STEPS: TimelineStep[] = [
  {
    key: "RECEIVED",
    label: "Pedido Recebido",
    description: "Seu pedido foi registrado com sucesso",
    icon: Package,
    offsetMs: 0,
  },
  {
    key: "PAYMENT_CONFIRMED",
    label: "Pagamento Confirmado",
    description: "Pagamento aprovado e verificado",
    icon: CreditCard,
    offsetMs: 5 * 60 * 1000, // +5 min
  },
  {
    key: "PREPARING",
    label: "Em Separação",
    description: "Produtos sendo separados e embalados",
    icon: PackageCheck,
    offsetMs: 60 * 60 * 1000, // +1h
  },
  {
    key: "SHIPPED",
    label: "Enviado",
    description: "Pacote despachado para a transportadora",
    icon: Truck,
    offsetMs: 24 * 60 * 60 * 1000, // +1 dia
  },
  {
    key: "IN_TRANSIT",
    label: "Em Trânsito",
    description: "Pacote a caminho do destino",
    icon: MapPin,
    offsetMs: 2 * 24 * 60 * 60 * 1000, // +2 dias
  },
  {
    key: "OUT_FOR_DELIVERY",
    label: "Saiu para Entrega",
    description: "Pacote na rota de entrega da sua região",
    icon: Navigation,
    offsetMs: 4 * 24 * 60 * 60 * 1000, // +4 dias
  },
  {
    key: "DELIVERED",
    label: "Entregue",
    description: "Pacote entregue no endereço informado",
    icon: Home,
    offsetMs: 7 * 24 * 60 * 60 * 1000, // +7 dias
  },
];

/**
 * Mapeia chave do step visual para o OrderStatus do domínio (quando há
 * correspondência). Steps que não existem no domínio (IN_TRANSIT,
 * OUT_FOR_DELIVERY) retornam `null` → caem no fallback de offset.
 */
function stepKeyToStatus(key: string): OrderStatus | null {
  switch (key) {
    case "RECEIVED":
      return "PENDING";
    case "PAYMENT_CONFIRMED":
      return "PAYMENT_CONFIRMED";
    case "PREPARING":
      return "PREPARING";
    case "SHIPPED":
      return "SHIPPED";
    case "DELIVERED":
      return "DELIVERED";
    default:
      return null;
  }
}

/**
 * Resolve a data de um step:
 *  - Se há evento real correspondente → usa createdAt do evento.
 *  - Senão → fallback no offset mockado (preview/estimativa).
 */
function resolveStepDate(
  step: TimelineStep,
  events: TrackingOrderData["events"],
  createdAt: Date,
): Date {
  const mappedStatus = stepKeyToStatus(step.key);
  if (mappedStatus && events?.length) {
    const real = events.find((e) => e.status === mappedStatus);
    if (real) return new Date(real.createdAt);
  }
  return new Date(createdAt.getTime() + step.offsetMs);
}

/**
 * Mapeia o OrderStatus do banco para quantas etapas visuais estão completas.
 * Ex: SHIPPED = 4 etapas completas (RECEIVED, PAYMENT, PREPARING, SHIPPED).
 */
function getCompletedCount(status: OrderStatus): number {
  switch (status) {
    case "PENDING":
      return 1; // Pedido Recebido
    case "PAYMENT_CONFIRMED":
      return 2;
    case "PREPARING":
      return 3;
    case "SHIPPED":
      return 4;
    // DELIVERED completa todas as 7 etapas (incluindo IN_TRANSIT + OUT_FOR_DELIVERY)
    case "DELIVERED":
      return 7;
    case "CANCELLED":
      return 0; // tratamento especial
    default:
      return 1;
  }
}

/* ─── Date Formatting ──────────────────────────────────────── */

function formatStepDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatEstimatedDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ─── Component ────────────────────────────────────────────── */

export function OrderTrackingModal({ order }: { order: TrackingOrderData }) {
  const [open, setOpen] = React.useState(false);

  const shortId = order.id.slice(0, 8).toUpperCase();
  const isCancelled = order.status === "CANCELLED";
  const completedCount = getCompletedCount(order.status);
  const createdAt = new Date(order.createdAt);

  // Estima a data de entrega: createdAt + 7 dias
  const estimatedDelivery = new Date(
    createdAt.getTime() + 7 * 24 * 60 * 60 * 1000,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Trigger — substitui o antigo <Button><Link> */}
      <Button
        onClick={() => setOpen(true)}
        variant="default"
        className="loreal-btn-pill w-full h-12 text-[12px] font-medium tracking-[0.18em] uppercase bg-brand-wine text-brand-pink hover:bg-brand-wine/90"
      >
        <Truck className="mr-2 h-4 w-4" />
        Rastrear Pedido
      </Button>

      <DialogContent
        data-lenis-prevent="true"
        className="bg-surface-panel border-none rounded-[1.2rem] max-w-md w-[calc(100%-2rem)] max-h-[85vh] overflow-y-auto p-0 gap-0 shadow-[0_25px_60px_-12px_rgba(71,19,28,0.25)]"
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-medium tracking-[0.32em] uppercase text-brand-wine/70">
              Mari Beauty
            </span>
          </div>

          <DialogTitle className="font-playfair italic text-2xl text-ink-strong">
            Rastreamento
          </DialogTitle>

          <DialogDescription className="sr-only">
            Acompanhe o status do seu pedido #{shortId}
          </DialogDescription>

          {/* Order Summary Pill */}
          <div className="mt-4 flex items-center justify-between bg-brand-wine/5 rounded-xl px-4 py-3">
            <div>
              <p className="text-[10px] font-medium tracking-[0.24em] uppercase text-ink-muted">
                Pedido
              </p>
              <p className="text-sm font-medium text-ink-strong mt-0.5">
                #{shortId}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-medium tracking-[0.24em] uppercase text-ink-muted">
                {order.itemCount} {order.itemCount === 1 ? "item" : "itens"}
              </p>
              <p className="font-playfair italic text-sm text-brand-wine mt-0.5">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(order.total)}
              </p>
            </div>
          </div>

          <p className="text-xs text-ink-muted mt-2">
            <span className="text-ink-soft font-medium">
              {order.customerName}
            </span>
          </p>
        </DialogHeader>

        <div className="h-px bg-brand-wine/10 mx-6 mt-4" />

        {/* ── Cancelled Banner ────────────────────────────────── */}
        {isCancelled && (
          <div className="mx-6 mt-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
              <X className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-red-800">
                Pedido Cancelado
              </p>
              <p className="text-xs text-red-600 mt-0.5">
                Este pedido foi cancelado e não será entregue.
              </p>
            </div>
          </div>
        )}

        {/* ── Timeline ───────────────────────────────────────── */}
        <div className="p-6 pt-5">
          {/* Estimated Delivery (only if not delivered and not cancelled) */}
          {!isCancelled && order.status !== "DELIVERED" && (
            <div className="flex items-center gap-2 mb-5 bg-brand-wine/5 rounded-xl px-4 py-3">
              <Clock className="h-4 w-4 text-brand-wine/60" />
              <div>
                <p className="text-[10px] font-medium tracking-[0.18em] uppercase text-ink-muted">
                  Entrega estimada
                </p>
                <p className="text-sm font-medium text-ink-strong mt-0.5">
                  {formatEstimatedDate(estimatedDelivery)}
                </p>
              </div>
            </div>
          )}

          <ol className="relative" aria-label="Timeline de rastreamento">
            {TIMELINE_STEPS.map((step, idx) => {
              const isCompleted = !isCancelled && idx < completedCount;
              const isCurrent = !isCancelled && idx === completedCount - 1;
              const isPending = !isCancelled && idx >= completedCount;
              const stepDate = resolveStepDate(step, order.events, createdAt);

              const Icon = step.icon;
              const isLast = idx === TIMELINE_STEPS.length - 1;

              return (
                <li
                  key={step.key}
                  className={`relative flex gap-4 ${!isLast ? "pb-7" : ""}`}
                >
                  {/* Vertical Connector Line */}
                  {!isLast && (
                    <div
                      className={`absolute left-[17px] top-[38px] w-[2px] h-[calc(100%-30px)] ${
                        isCancelled
                          ? "bg-border"
                          : isCompleted && !isCurrent
                            ? "bg-brand-wine/80"
                            : isCurrent
                              ? "bg-gradient-to-b from-brand-wine/80 to-border"
                              : "bg-border bg-[length:2px_6px] bg-[repeating-linear-gradient(to_bottom,var(--color-ink-muted)_0,var(--color-ink-muted)_3px,transparent_3px,transparent_6px)]"
                      }`}
                      style={
                        isPending
                          ? {
                              background:
                                // Mesmo token do ramo de className logo acima: o pontilhado
                                // é o mesmo efeito, e o hex frio que estava aqui
                                // ignorava o tema escuro.
                                "repeating-linear-gradient(to bottom, var(--color-ink-muted) 0, var(--color-ink-muted) 3px, transparent 3px, transparent 6px)",
                            }
                          : undefined
                      }
                    />
                  )}

                  {/* Step Icon */}
                  <div
                    className={`relative z-10 flex-shrink-0 w-[36px] h-[36px] rounded-full flex items-center justify-center transition-all duration-300 ${
                      isCancelled
                        ? "bg-muted"
                        : isCompleted
                          ? isCurrent
                            ? "bg-brand-wine animate-tracking-pulse shadow-[0_0_0_4px_rgba(71,19,28,0.12)]"
                            : "bg-brand-wine"
                          : "bg-muted border-2 border-border"
                    }`}
                  >
                    {isCancelled ? (
                      <Icon
                        className="h-4 w-4 text-ink-muted"
                        strokeWidth={1.5}
                      />
                    ) : isCompleted ? (
                      isCurrent ? (
                        <Icon
                          className="h-4 w-4 text-brand-pink"
                          strokeWidth={2}
                        />
                      ) : (
                        <Check
                          className="h-4 w-4 text-brand-pink"
                          strokeWidth={2.5}
                        />
                      )
                    ) : (
                      <Icon
                        className="h-4 w-4 text-ink-muted"
                        strokeWidth={1.5}
                      />
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0 pt-1">
                    <p
                      className={`text-sm font-medium leading-tight ${
                        isCancelled
                          ? "text-ink-muted"
                          : isCompleted
                            ? "text-ink-strong"
                            : "text-ink-muted"
                      }`}
                    >
                      {step.label}
                    </p>

                    <p
                      className={`text-xs mt-0.5 ${
                        isCancelled
                          ? "text-ink-muted"
                          : isCompleted
                            ? "text-ink-soft"
                            : "text-ink-muted"
                      }`}
                    >
                      {step.description}
                    </p>

                    {/* Date: Only show for completed steps */}
                    {isCompleted && !isCancelled && (
                      <p className="text-[11px] text-brand-wine/60 mt-1.5 font-medium">
                        {formatStepDate(stepDate)}
                      </p>
                    )}

                    {/* Show estimated delivery date on the DELIVERED step if not yet delivered */}
                    {step.key === "DELIVERED" &&
                      !isCompleted &&
                      !isCancelled && (
                        <p className="text-[11px] text-ink-muted mt-1.5 italic">
                          Previsão: {formatEstimatedDate(estimatedDelivery)}
                        </p>
                      )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* ── Tracking Code Section ──────────────────────────── */}
        {!isCancelled &&
          (order.status === "SHIPPED" || order.status === "DELIVERED") && (
            <div className="mx-6 mb-6">
              <div className="bg-brand-wine/5 rounded-xl px-4 py-4">
                <p className="text-[10px] font-medium tracking-[0.24em] uppercase text-ink-muted mb-2">
                  Código de rastreio
                </p>

                {order.trackingCode ? (
                  <div className="flex items-center justify-between gap-3">
                    <code className="font-mono text-sm font-semibold text-brand-wine tracking-wider">
                      {order.trackingCode}
                    </code>
                    <a
                      href={`https://www.linkcorreios.com.br/?id=${order.trackingCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-brand-wine hover:text-brand-wine/80 transition-colors underline underline-offset-2"
                    >
                      Correios
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-ink-muted italic">
                    Aguardando código de rastreio…
                  </p>
                )}
              </div>
            </div>
          )}

        {/* ── Footer ─────────────────────────────────────────── */}
        <div className="px-6 pb-6">
          <Button
            onClick={() => setOpen(false)}
            variant="ghost"
            className="loreal-btn-pill w-full h-10 text-[11px] font-medium tracking-[0.18em] uppercase text-ink-soft hover:bg-brand-wine/5"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
