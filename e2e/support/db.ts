/**
 * Acesso ao Postgres de teste para asserções E2E (regra crítica em banco
 * real). Usa `pg` direto com DATABASE_URL — sem depender do alias `@/lib`.
 *
 * Identificadores camelCase precisam de aspas no SQL ("usedCount", etc.).
 */

import { Pool } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL não definido — necessário para E2E");
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const res = await getPool().query(sql, params);
  return res.rows as T[];
}

/** Estoque atual de um produto pelo slug. */
export async function getStockBySlug(slug: string): Promise<number> {
  const rows = await query<{ stock: number }>(
    "SELECT stock FROM products WHERE slug = $1",
    [slug],
  );
  return rows[0]?.stock ?? -1;
}

/** usedCount de um cupom pelo código. */
export async function getCouponUsedCount(code: string): Promise<number> {
  const rows = await query<{ usedCount: number }>(
    'SELECT "usedCount" FROM coupons WHERE code = $1',
    [code],
  );
  return rows[0]?.usedCount ?? -1;
}

/** Conta pedidos por email do cliente. */
export async function countOrdersByEmail(email: string): Promise<number> {
  const rows = await query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM orders WHERE "customerEmail" = $1',
    [email],
  );
  return Number(rows[0]?.count ?? 0);
}

/** Status atual de um pedido por id. */
export async function getOrderStatus(orderId: string): Promise<string | null> {
  const rows = await query<{ status: string }>(
    "SELECT status FROM orders WHERE id = $1",
    [orderId],
  );
  return rows[0]?.status ?? null;
}

/** Shape mínimo de um OrderEvent retornado pelas asserções E2E. */
export interface OrderEventRow {
  id: string;
  status: string;
  createdAt: Date;
  metadata: Record<string, unknown> | null;
}

/** Lista os eventos de um pedido em ordem cronológica ascendente. */
export async function getOrderEvents(
  orderId: string,
): Promise<OrderEventRow[]> {
  const rows = await query<{
    id: string;
    status: string;
    createdAt: Date;
    metadata: Record<string, unknown> | null;
  }>(
    'SELECT id, status, "createdAt", metadata FROM order_events WHERE "orderId" = $1 ORDER BY "createdAt" ASC',
    [orderId],
  );
  return rows;
}

/**
 * Zera o carrinho de um usuário.
 * ─────────────────────────────────────────────────────────────────────
 * **Pré-requisito de todo spec que faz checkout**, não higiene opcional.
 *
 * O carrinho da Belessence é privado por usuário e mora no banco
 * (`cart_items`), não em `localStorage` — ver a nota na seção 1 de
 * `src/lib/CLAUDE.md`. Como todos os specs logam como o mesmo `e2e-user`,
 * o carrinho é estado **compartilhado e persistente** entre specs, entre
 * retries e entre execuções inteiras da suíte.
 *
 * O estrago: um spec que morre depois de "adicionar à bag" e antes de
 * finalizar deixa o item lá. Na execução seguinte o checkout leva aquele
 * item junto, o estoque cai mais de uma unidade e
 * `expect(stock).toBe(stockBefore - 1)` quebra — num teste que não tem
 * nada de errado. Com `retries: 2` o efeito se acumula dentro da própria
 * execução: cada tentativa que falha no meio soma mais um item para a
 * próxima.
 *
 * Por isso a limpeza vai em `beforeEach`, e não em `afterAll`: `afterAll`
 * não roda entre as tentativas de retry, que é exatamente onde o resíduo
 * nasce.
 */
export async function clearCart(userId: string): Promise<void> {
  await query('DELETE FROM cart_items WHERE "userId" = $1', [userId]);
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
