import { test, expect } from "@playwright/test";
import { loginAsUser } from "./support/auth";
import { blockImages } from "./support/network";

/**
 * E2E — Página de produto (/product/[slug])
 * Cobre: render do PDP, seletor de quantidade + adicionar à bag, tabs
 * (Radix Tabs no browser real) e a seção de avaliações.
 * Usa o slug seedado `midnight-velvet`.
 */

const SLUG = "midnight-velvet";

test.describe("Produto /product/[slug]", () => {
  // Mesmo motivo do checkout-flow e do order-tracking: sem bloquear
  // imagem, o `load` do PDP não dispara no CI. A explicação inteira
  // está em `support/network.ts`.
  test.beforeEach(async ({ page }) => {
    await blockImages(page);
  });

  test("renderiza nome, preço e CTA de adicionar", async ({ page }) => {
    await page.goto(`/product/${SLUG}`);
    await expect(
      page.getByRole("heading", { name: /midnight velvet/i }),
    ).toBeVisible();
    await expect(page.getByText(/R\$/).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /adicionar à bag/i }),
    ).toBeVisible();
  });

  // Após Rodada Auth: add-to-cart exige login (auth-gate). Skip até criar
  // helper loginAsUser (T-extra-4).
  test("aumentar quantidade e adicionar à bag abre o carrinho", async ({
    page,
    context,
  }) => {
    await loginAsUser(context);
    await page.goto(`/product/${SLUG}`);
    await page.getByRole("button", { name: /aumentar quantidade/i }).click();
    await page.getByRole("button", { name: /adicionar à bag/i }).click();
    await expect(page.getByText(/seu carrinho/i)).toBeVisible();
  });

  test("trocar para a aba Avaliações mostra a seção de reviews", async ({
    page,
  }) => {
    await page.goto(`/product/${SLUG}`);
    await page.getByRole("tab", { name: /avaliações/i }).click();
    await expect(
      page.getByRole("heading", { name: /avaliações de quem já comprou/i }),
    ).toBeVisible();
  });
});
