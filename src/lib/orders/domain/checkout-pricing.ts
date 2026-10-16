/**
 * Aritmética do checkout — funções puras.
 * ─────────────────────────────────────────────────────────────────────
 * Isto morava dentro do `POST /api/checkout`, misturado com `NextResponse`
 * e Prisma. Era regra de dinheiro num route handler, o que o
 * `src/lib/CLAUDE.md` §2.6 proíbe com todas as letras — e, pior, só dava
 * para exercitar subindo uma requisição HTTP falsa.
 *
 * Aqui não há IO nem React: entra número, sai número. É o que permite
 * afirmar a regra que mais mexe no valor cobrado — **o frete é calculado
 * sobre o subtotal JÁ com desconto** — sem banco e sem mock.
 *
 * ⚠️ Os valores circulam como `number`, não `Decimal`. O
 * `src/lib/CLAUDE.md` §6 diz para não usar `number` em dinheiro, e tem
 * razão; mas o `Number(product.price)` já era o comportamento antes desta
 * extração, e trocar a aritmética monetária no mesmo PR que move código
 * é como consertar o motor com o carro andando. Fica registrado como
 * dívida, não introduzido por aqui.
 */
import "server-only";

/** O que o cliente pediu. */
export interface ItemPedido {
  productId: string;
  quantity: number;
}

/** O que o banco diz que o produto é — a única fonte de preço e estoque. */
export interface ProdutoDoCatalogo {
  id: string;
  name: string;
  price: number;
  stock: number;
}

export interface FaltaDeEstoque {
  nome: string;
  disponivel: number;
  pedido: number;
}

/**
 * Ids pedidos que o catálogo não devolveu.
 *
 * Checar por id, e não por contagem, porque contagem igual não prova
 * conjunto igual: pedir o mesmo produto em duas linhas devolveria um
 * produto só e a contagem acusaria falta que não existe.
 */
export function idsForaDoCatalogo(
  itens: ItemPedido[],
  catalogo: Map<string, ProdutoDoCatalogo>,
): string[] {
  const faltando = new Set<string>();
  for (const item of itens) {
    if (!catalogo.has(item.productId)) faltando.add(item.productId);
  }
  return [...faltando];
}

/**
 * Primeiro item cuja quantidade não cabe no estoque, ou `null`.
 *
 * Devolve o primeiro e não todos de propósito: a mensagem que o cliente
 * recebe nomeia um produto, e listar sete não ajuda ninguém a decidir.
 */
export function primeiraFaltaDeEstoque(
  itens: ItemPedido[],
  catalogo: Map<string, ProdutoDoCatalogo>,
): FaltaDeEstoque | null {
  for (const item of itens) {
    const produto = catalogo.get(item.productId);
    if (!produto) continue;
    if (produto.stock < item.quantity) {
      return {
        nome: produto.name,
        disponivel: produto.stock,
        pedido: item.quantity,
      };
    }
  }
  return null;
}

/** Soma `preço do banco × quantidade`. O preço do client nunca entra aqui. */
export function calcularSubtotal(
  itens: ItemPedido[],
  catalogo: Map<string, ProdutoDoCatalogo>,
): number {
  return itens.reduce((acc, item) => {
    const produto = catalogo.get(item.productId);
    if (!produto) return acc;
    return acc + produto.price * item.quantity;
  }, 0);
}

/**
 * Valor sobre o qual o frete é calculado: subtotal **menos o desconto**.
 *
 * A ordem importa em dinheiro, não só em estilo. A tabela de frete tem
 * faixa de isenção por valor; calcular o frete antes do cupom daria frete
 * grátis a quem, depois do desconto, não alcançou a faixa. Esta função
 * existe para que essa ordem seja uma afirmação testável e não um efeito
 * de onde a linha ficou no handler.
 */
export function baseDeCalculoDoFrete(
  subtotal: number,
  desconto: number,
): number {
  return subtotal - desconto;
}

/** Total cobrado: base (já com desconto) + frete. */
export function calcularTotal(baseDeCalculo: number, frete: number): number {
  return baseDeCalculo + frete;
}
