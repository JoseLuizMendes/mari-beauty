/**
 * Aritmética do checkout — regras puras.
 *
 * Estas funções saíram de dentro do `POST /api/checkout`, onde só eram
 * exercitáveis montando uma `NextRequest` falsa e mockando Prisma, cupom,
 * frete e gateway de uma vez. Aqui entra número e sai número.
 *
 * A regra que mais importa é a última: **o frete é calculado sobre o
 * subtotal já com desconto**. Não é preferência de estilo — a tabela tem
 * isenção em R$ 199, então a ordem decide quem paga frete.
 */

import { describe, it, expect } from "vitest";
import {
  baseDeCalculoDoFrete,
  calcularSubtotal,
  calcularTotal,
  idsForaDoCatalogo,
  primeiraFaltaDeEstoque,
  type ItemPedido,
  type ProdutoDoCatalogo,
} from "@/lib/orders/domain/checkout-pricing";

function catalogo(
  ...produtos: Array<Partial<ProdutoDoCatalogo> & { id: string }>
): Map<string, ProdutoDoCatalogo> {
  return new Map(
    produtos.map((p) => [
      p.id,
      { name: `Produto ${p.id}`, price: 100, stock: 10, ...p },
    ]),
  );
}

const item = (productId: string, quantity = 1): ItemPedido => ({
  productId,
  quantity,
});

describe("idsForaDoCatalogo", () => {
  it("não acusa falta quando o banco devolveu tudo", () => {
    expect(
      idsForaDoCatalogo(
        [item("a"), item("b")],
        catalogo({ id: "a" }, { id: "b" }),
      ),
    ).toEqual([]);
  });

  it("nomeia o que faltou", () => {
    expect(
      idsForaDoCatalogo([item("a"), item("sumiu")], catalogo({ id: "a" })),
    ).toEqual(["sumiu"]);
  });

  // Era o risco de checar por contagem: `products.length !== productIds.length`
  // acusaria falta aqui, porque o banco devolve UM produto para duas linhas.
  it("o mesmo produto em duas linhas não é produto faltando", () => {
    expect(
      idsForaDoCatalogo([item("a", 1), item("a", 2)], catalogo({ id: "a" })),
    ).toEqual([]);
  });
});

describe("primeiraFaltaDeEstoque", () => {
  it("devolve null quando tudo cabe", () => {
    expect(
      primeiraFaltaDeEstoque([item("a", 3)], catalogo({ id: "a", stock: 3 })),
    ).toBeNull();
  });

  it("pedir exatamente o estoque disponível é permitido", () => {
    expect(
      primeiraFaltaDeEstoque([item("a", 10)], catalogo({ id: "a", stock: 10 })),
    ).toBeNull();
  });

  it("identifica o produto, o disponível e o pedido", () => {
    expect(
      primeiraFaltaDeEstoque(
        [item("a", 11)],
        catalogo({ id: "a", name: "Sublime Oil", stock: 10 }),
      ),
    ).toEqual({ nome: "Sublime Oil", disponivel: 10, pedido: 11 });
  });

  it("devolve a primeira falta, não a maior", () => {
    const falta = primeiraFaltaDeEstoque(
      [item("a", 5), item("b", 99)],
      catalogo({ id: "a", name: "Primeiro", stock: 1 }, { id: "b", stock: 1 }),
    );

    expect(falta?.nome).toBe("Primeiro");
  });
});

describe("calcularSubtotal", () => {
  it("multiplica o preço do catálogo pela quantidade", () => {
    expect(
      calcularSubtotal(
        [item("a", 2), item("b", 3)],
        catalogo({ id: "a", price: 100 }, { id: "b", price: 50 }),
      ),
    ).toBe(350);
  });

  it("o preço vem do catálogo — o item do carrinho não carrega preço", () => {
    // O tipo `ItemPedido` nem tem campo de preço: é a garantia estrutural
    // de que o valor enviado pelo client não tem como entrar na conta.
    const itens: ItemPedido[] = [{ productId: "a", quantity: 1 }];

    expect(calcularSubtotal(itens, catalogo({ id: "a", price: 999 }))).toBe(
      999,
    );
  });
});

describe("desconto antes do frete", () => {
  it("a base do frete é o subtotal menos o desconto", () => {
    expect(baseDeCalculoDoFrete(210, 20)).toBe(190);
  });

  /**
   * O caso que a ordem decide. A isenção é em R$ 199:
   *   - sobre o subtotal cru (R$ 210) → frete grátis
   *   - sobre a base com desconto (R$ 190) → frete cobrado
   * Trocar a ordem dá frete grátis a quem não alcançou a faixa.
   */
  it("um cupom pode derrubar o pedido para baixo da faixa de isenção", () => {
    const ISENCAO = 199;
    const subtotal = 210;

    expect(subtotal).toBeGreaterThanOrEqual(ISENCAO);
    expect(baseDeCalculoDoFrete(subtotal, 20)).toBeLessThan(ISENCAO);
  });

  it("sem cupom a base é o próprio subtotal", () => {
    expect(baseDeCalculoDoFrete(210, 0)).toBe(210);
  });
});

describe("calcularTotal", () => {
  it("soma frete à base já descontada", () => {
    expect(calcularTotal(190, 14.9)).toBeCloseTo(204.9, 2);
  });

  it("frete grátis não altera a base", () => {
    expect(calcularTotal(250, 0)).toBe(250);
  });
});
