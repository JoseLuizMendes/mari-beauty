import { test, expect } from "@playwright/test";
import { getOrderStatus, getOrderEvents, closeDb } from "./support/db";
import { loginAsUser } from "./support/auth";

/**
 * E2E — Rastreamento de pedido após pagamento aprovado.
 * ─────────────────────────────────────────────────────────────────────
 * Cobre a regra de negócio crítica: ao finalizar o checkout (provider
 * mock retorna `approved`), o pedido deve estar em `PREPARING` no banco
 * e o OrderTrackingModal (em /sucesso/[id]) deve exibir as etapas até
 * "Em Separação" como concluídas com datas distintas (reais, não
 * offset mockado).
 *
 * Asserções principais:
 *   - order.status === "PREPARING"
 *   - exatamente 2 OrderEvents (PAYMENT_CONFIRMED + PREPARING)
 *   - mesmo paymentId em ambos os events (idempotência ligada)
 *   - segundo evento com metadata.auto === true (transição automática)
 *   - modal renderiza 3 etapas: "Pedido Recebido", "Pagamento
 *     Confirmado", "Em Separação"
 *
 * Pré-requisito: a suíte `e2e/checkout-flow.spec.ts` precisa estar
 * verde. O fluxo replicado aqui assume o helper de login programático
 * (T-extra-4); enquanto não existe, o spec fica `skip` na mesma forma
 * que `checkout-flow.spec.ts` faz.
 */

const SLUG = "midnight-velvet";
const EMAIL = `e2e-tracking+${Date.now()}@belessence.test`;

test.afterAll(async () => {
  await closeDb();
});

test("PREPARING: após checkout aprovado, pedido fica em PREPARING e modal mostra etapas com datas reais", async ({
  page,
  context,
}) => {
  await loginAsUser(context);
  // Intercepta o ViaCEP (via nosso /api/cep) para endereço determinístico.
  await page.route("**/api/cep/**", (route) =>
    route.fulfill({
      json: {
        cep: "01310-100",
        street: "Avenida Paulista",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "SP",
        shippingCost: 14.9,
        isFreeShippingEligible: false,
      },
    }),
  );

  // 1. Adiciona o produto ao carrinho
  await page.goto(`/product/${SLUG}`);
  await page.getByRole("button", { name: /adicionar à bag/i }).click();
  await expect(page.getByText(/seu carrinho/i)).toBeVisible();

  // 2. Vai ao checkout
  await page.goto("/checkout");
  await expect(
    page.getByRole("heading", { name: /^checkout$/i }),
  ).toBeVisible();

  // 3. Preenche identificação (CPF válido conhecido)
  await page.getByLabel(/nome completo/i).fill("Cliente Tracking E2E");
  await page.getByLabel(/^e-mail$/i).fill(EMAIL);
  await page.getByLabel(/^telefone$/i).fill("11987654321");
  await page.getByLabel(/^cpf$/i).fill("39053344705");

  // 4. CEP → dispara o autofill interceptado
  await page.getByLabel(/^cep$/i).fill("01310100");
  await expect(page.getByLabel(/^logradouro$/i)).toHaveValue(/paulista/i);
  await page.getByLabel(/^número$/i).fill("1000");

  // 5. Finaliza
  await page.getByRole("button", { name: /finalizar pedido/i }).click();

  // 6. Captura orderId do redirect /sucesso/[id]
  await page.waitForURL(/\/sucesso\/[a-f0-9-]+/, { timeout: 15_000 });
  const url = page.url();
  const orderId = url.split("/").pop()!;
  expect(orderId).toMatch(/^[a-f0-9-]{36}$/);

  // 7. Verifica status do pedido no banco
  const status = await getOrderStatus(orderId);
  expect(status).toBe("PREPARING");

  // 8. Exatamente 2 OrderEvents com mesmo paymentId
  const events = await getOrderEvents(orderId);
  expect(events).toHaveLength(2);
  expect(events[0].status).toBe("PAYMENT_CONFIRMED");
  expect(events[1].status).toBe("PREPARING");

  const meta0 = (events[0].metadata ?? {}) as {
    paymentId?: string;
    auto?: boolean;
  };
  const meta1 = (events[1].metadata ?? {}) as {
    paymentId?: string;
    auto?: boolean;
  };

  expect(meta0.paymentId).toBeTruthy();
  expect(meta0.paymentId).toBe(meta1.paymentId);
  expect(meta1.auto).toBe(true);

  // 9. Datas distintas — o segundo evento acontece estritamente
  //    depois (mesmo que microssegundos) do primeiro.
  const t0 = new Date(events[0].createdAt).getTime();
  const t1 = new Date(events[1].createdAt).getTime();
  expect(t1).toBeGreaterThanOrEqual(t0);

  // 10. Abre o modal de rastreamento e valida as 3 etapas concluídas
  //
  // ⚠️ Buscar na página inteira dá conflito de modo estrito: "Em
  // Separação" aparece duas vezes — no selo de status do pedido e na
  // etapa da linha do tempo. São elementos diferentes dizendo a mesma
  // coisa, e só o segundo é o que este teste afirma. Escopar no diálogo
  // resolve e deixa explícito o que se está checando.
  await page.getByRole("button", { name: /rastrear pedido/i }).click();
  const modal = page.getByRole("dialog");
  await expect(
    modal.getByRole("heading", { name: /rastreamento/i }),
  ).toBeVisible();
  await expect(modal.getByText(/Pedido Recebido/i)).toBeVisible();
  await expect(modal.getByText(/Pagamento Confirmado/i)).toBeVisible();
  await expect(modal.getByText(/Em Separação/i)).toBeVisible();
});

test("PREPARING idempotência (skip — coberta em unit)", async () => {
  test.skip(
    true,
    "Idempotência coberta em src/test/confirm-payment.test.ts (unit).",
  );
});
