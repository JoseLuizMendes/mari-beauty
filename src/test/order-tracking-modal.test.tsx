/**
 * Comportamento do modal de rastreamento.
 *
 * Motivo de existir: o componente tem 464 linhas e estava em **0% de
 * cobertura** — é o que o cliente abre para saber onde está o pedido dele,
 * e nada verificava que as regras visíveis (etapa certa marcada, previsão
 * de entrega, código dos Correios, pedido cancelado) batem com o status
 * que veio do banco.
 *
 * O que este teste afirma é o que o cliente vê, não classe de CSS — o
 * `CLAUDE.md` de `src/test/` proíbe o segundo, e com razão: foi justamente
 * por ninguém olhar o comportamento que `text-ink-muted/50` ficou meses
 * sem gerar CSS nenhum.
 *
 * As datas são comparadas com o mesmo `Intl` que o componente usa, em vez
 * de string fixa, para o teste não depender do fuso do runner.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrderTrackingModal } from "@/components/order-tracking-modal";
import type { TrackingOrderData } from "@/lib/orders/domain/order-tracking";

const CRIADO_EM = "2026-03-10T12:00:00.000Z";
const SETE_DIAS = 7 * 24 * 60 * 60 * 1000;

/**
 * Forma de uma data de etapa concluída: `10 de mar. de 2026, 12:00`.
 * Casar pela forma, e não pelo valor, deixa a contagem independer do fuso
 * do runner — o que importa aqui é *quantas* etapas têm data.
 */
const DATA_DE_ETAPA = /^\d{2} de \w{3}\.? de \d{4},? \d{2}:\d{2}$/;

function pedido(over: Partial<TrackingOrderData> = {}): TrackingOrderData {
  return {
    id: "a1b2c3d4e5f6a7b8",
    status: "PENDING",
    customerName: "Mariana Alves",
    trackingCode: null,
    createdAt: CRIADO_EM,
    updatedAt: CRIADO_EM,
    total: 249.9,
    itemCount: 2,
    ...over,
  };
}

/** Mesma formatação do componente, para não prender o teste a um fuso. */
function dataLonga(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dataCurta(ms: number): string {
  return new Date(ms).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function abrir(order: TrackingOrderData) {
  const user = userEvent.setup();
  render(<OrderTrackingModal order={order} />);
  await user.click(screen.getByRole("button", { name: /rastrear pedido/i }));
  return user;
}

describe("OrderTrackingModal", () => {
  it("abre pelo gatilho e resume o pedido no cabeçalho", async () => {
    await abrir(pedido());

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // `id.slice(0, 8).toUpperCase()`
    expect(screen.getByText("#A1B2C3D4")).toBeInTheDocument();
    expect(screen.getByText("Mariana Alves")).toBeInTheDocument();
    expect(screen.getByText("2 itens")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?249,90/)).toBeInTheDocument();
  });

  it("usa singular quando o pedido tem um item só", async () => {
    await abrir(pedido({ itemCount: 1 }));

    expect(screen.getByText("1 item")).toBeInTheDocument();
  });

  it("fecha pelo botão Fechar", async () => {
    const user = await abrir(pedido());

    await user.click(screen.getByRole("button", { name: /fechar/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("mostra a previsão de entrega sete dias após a criação", async () => {
    await abrir(pedido());

    const esperado = dataCurta(new Date(CRIADO_EM).getTime() + SETE_DIAS);
    expect(screen.getByText("Entrega estimada")).toBeInTheDocument();
    expect(screen.getAllByText(esperado).length).toBeGreaterThan(0);
  });

  it("a timeline sempre tem as sete etapas", async () => {
    await abrir(pedido());

    expect(
      screen.getByRole("list", { name: /timeline de rastreamento/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(7);
  });

  // Só etapa concluída recebe data: é o único sinal visível de progresso, e
  // quantas aparecem é a tradução do `OrderStatus` do banco para a timeline.
  it.each([
    ["PENDING" as const, 1],
    ["PAYMENT_CONFIRMED" as const, 2],
    ["PREPARING" as const, 3],
    ["SHIPPED" as const, 4],
    ["DELIVERED" as const, 7],
  ])("%s mostra data em %i etapa(s)", async (status, concluidas) => {
    await abrir(pedido({ status }));

    expect(screen.getAllByText(DATA_DE_ETAPA)).toHaveLength(concluidas);
  });

  it("não oferece previsão de entrega quando já foi entregue", async () => {
    await abrir(pedido({ status: "DELIVERED" }));

    expect(screen.queryByText("Entrega estimada")).not.toBeInTheDocument();
  });

  it("prefere a data do evento real ao offset simulado", async () => {
    const real = "2026-03-11T09:30:00.000Z";
    await abrir(
      pedido({
        status: "PAYMENT_CONFIRMED",
        events: [{ status: "PAYMENT_CONFIRMED", createdAt: real }],
      }),
    );

    expect(screen.getByText(dataLonga(real))).toBeInTheDocument();
    // O offset simulado seria createdAt + 5min; não deve aparecer.
    const simulado = dataLonga(
      new Date(new Date(CRIADO_EM).getTime() + 5 * 60 * 1000).toISOString(),
    );
    expect(screen.queryByText(simulado)).not.toBeInTheDocument();
  });

  describe("código de rastreio", () => {
    it("aparece com link dos Correios quando o pedido foi enviado e tem código", async () => {
      await abrir(pedido({ status: "SHIPPED", trackingCode: "BR123456789BR" }));

      expect(screen.getByText("BR123456789BR")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /correios/i })).toHaveAttribute(
        "href",
        "https://www.linkcorreios.com.br/?id=BR123456789BR",
      );
    });

    it("avisa que está aguardando quando enviou sem código", async () => {
      await abrir(pedido({ status: "SHIPPED", trackingCode: null }));

      expect(
        screen.getByText(/aguardando código de rastreio/i),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: /correios/i }),
      ).not.toBeInTheDocument();
    });

    it("não aparece antes do envio", async () => {
      await abrir(pedido({ status: "PREPARING", trackingCode: "BR999BR" }));

      expect(screen.queryByText("Código de rastreio")).not.toBeInTheDocument();
    });
  });

  describe("pedido cancelado", () => {
    it("anuncia o cancelamento e não promete entrega", async () => {
      await abrir(pedido({ status: "CANCELLED" }));

      expect(screen.getByText("Pedido Cancelado")).toBeInTheDocument();
      expect(screen.getByText(/não será entregue/i)).toBeInTheDocument();
      expect(screen.queryByText("Entrega estimada")).not.toBeInTheDocument();
    });

    it("não marca nenhuma etapa como concluída", async () => {
      await abrir(pedido({ status: "CANCELLED" }));

      // Nenhuma data de etapa: cancelado não teve progresso a exibir.
      expect(screen.queryByText(dataLonga(CRIADO_EM))).not.toBeInTheDocument();
    });

    it("esconde o código de rastreio mesmo se o pedido já tinha um", async () => {
      await abrir(pedido({ status: "CANCELLED", trackingCode: "BR123BR" }));

      expect(screen.queryByText("BR123BR")).not.toBeInTheDocument();
    });
  });
});
