import { test, expect } from "@playwright/test";
import {
  getStockBySlug,
  getCouponUsedCount,
  countOrdersByEmail,
  clearCart,
  closeDb,
} from "./support/db";
import { loginAsUser, TEST_USER } from "./support/auth";
import { gotoAndReport } from "./support/navigation";
import { blockImages } from "./support/network";

/**
 * E2E — Fluxo de checkout completo (regra crítica em BANCO REAL)
 * ─────────────────────────────────────────────────────────────────────
 * carrinho → /checkout → form (CPF + CEP) → cupom BELES10 → finalizar →
 * /sucesso/[id], e então valida no Postgres:
 *   - pedido criado para o email
 *   - estoque do produto decrementado
 *   - usedCount do cupom incrementado
 *
 * É a camada que o doc exige: comportamento crítico contra banco real
 * (o unit cobre só a orquestração com mock).
 */

const SLUG = "midnight-velvet";
// Email único por execução → asserção determinística mesmo re-rodando.
const EMAIL = `e2e+${Date.now()}@belessence.test`;

// Carrinho é estado compartilhado no banco (mesmo `e2e-user` em todos os
// specs) e sobrevive a retries e a execuções inteiras. Sem este reset, um
// spec que morre depois de "adicionar à bag" faz o checkout seguinte levar
// o item órfão junto e derruba a asserção de estoque. Ver `clearCart`.
test.beforeEach(async ({ page }) => {
  await clearCart(TEST_USER.id);
  // Sem isto o `load` do PDP não dispara no CI — ver `blockImages`.
  await blockImages(page);
});

test.afterAll(async () => {
  await closeDb();
});

/**
 * Este teste ficou `skip` de 2026-06 a 2026-10 com a nota "corpo a debugar".
 * A causa era uma só, e estava no teste: faltava esperar a confirmação do
 * cupom antes de finalizar (ver passo 5). O pedido era criado sem cupom e a
 * última asserção quebrava — a 60 linhas da causa.
 *
 * As duas primeiras asserções de banco (pedido criado, estoque decrementado)
 * sempre passaram. Nada no produto estava errado.
 */
test("checkout cria pedido, baixa estoque e consome cupom", async ({
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

  // Estado inicial do banco
  const stockBefore = await getStockBySlug(SLUG);
  const usedBefore = await getCouponUsedCount("BELES10");
  expect(stockBefore).toBeGreaterThan(0);

  // 1. Adiciona o produto ao carrinho
  await gotoAndReport(page, `/product/${SLUG}`);
  await page.getByRole("button", { name: /adicionar à bag/i }).click();
  await expect(page.getByText(/seu carrinho/i)).toBeVisible();

  // 2. Vai ao checkout
  await page.goto("/checkout");
  await expect(
    page.getByRole("heading", { name: /^checkout$/i }),
  ).toBeVisible();

  // 3. Preenche identificação (CPF válido conhecido)
  await page.getByLabel(/nome completo/i).fill("Cliente E2E");
  await page.getByLabel(/^e-mail$/i).fill(EMAIL);
  await page.getByLabel(/^telefone$/i).fill("11987654321");
  await page.getByLabel(/^cpf$/i).fill("39053344705");

  // 4. CEP → dispara o autofill interceptado
  await page.getByLabel(/^cep$/i).fill("01310100");
  await expect(page.getByLabel(/^logradouro$/i)).toHaveValue(/paulista/i);
  await page.getByLabel(/^número$/i).fill("1000");

  // 5. Aplica cupom BELES10
  //
  // ⚠️ Esperar a confirmação é o que fazia este teste falhar. "Aplicar"
  // dispara um fetch para /api/coupon/validate e só então o cupom entra no
  // form; clicar em "finalizar" logo em seguida enviava o pedido SEM cupom —
  // e a asserção de `usedCount` quebrava no fim, longe da causa.
  //
  // O sinal determinístico é a linha de desconto no resumo: ela só existe
  // quando `discount > 0`, ou seja, depois do cupom entrar no estado.
  //
  // ⚠️ NÃO use `getByRole("button", { name: /remover/i })`: cada item da
  // bolsa tem um botão com `aria-label="Remover"`, já visível na carga da
  // página. A espera casaria com ele e passaria de imediato, sem esperar
  // nada — foi o que me enganou na primeira tentativa de consertar isto.
  await page.getByPlaceholder(/BELES10/i).fill("BELES10");
  await page.getByRole("button", { name: /^aplicar$/i }).click();
  await expect(page.getByText(/desconto \(BELES10\)/i)).toBeVisible();

  // 6. Finaliza
  await page.getByRole("button", { name: /finalizar pedido/i }).click();

  // 7. Redireciona para /sucesso/[id]
  await expect(page).toHaveURL(/\/sucesso\/[\w-]+/, { timeout: 15_000 });

  // 8. Asserções no banco real
  expect(await countOrdersByEmail(EMAIL)).toBe(1);
  expect(await getStockBySlug(SLUG)).toBe(stockBefore - 1);
  expect(await getCouponUsedCount("BELES10")).toBe(usedBefore + 1);
});
