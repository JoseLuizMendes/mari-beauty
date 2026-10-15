import { test, expect } from "@playwright/test";
import {
  loginAsAdmin,
  stubCloudinary,
  stubCloudinaryWidget,
} from "./support/admin";
import { query, closeDb } from "./support/db";

/**
 * E2E — Admin CRUD (cobre product-form Radix/Calendar no browser real)
 * ─────────────────────────────────────────────────────────────────────
 * - login via cookie (helper)
 * - criar produto (Select de coleção/categoria, upload Cloudinary stubado)
 * - confirmar persistência no banco
 *
 * Os specs assumem app + Postgres seedado + ADMIN_SECRET no ambiente.
 */

const SLUG = `e2e-produto-${Date.now()}`;

test.afterAll(async () => {
  // Remove o produto criado. Sem isto ele fica no banco de teste e aparece
  // nas vitrines dos outros specs — `fullyParallel` está ligado, então os
  // specs dividem o mesmo banco ao mesmo tempo. Higiene de quem escreve em
  // estado compartilhado, não detalhe.
  await query("DELETE FROM products WHERE slug = $1", [SLUG]);
  await closeDb();
});

test.beforeEach(async ({ context, page }) => {
  await loginAsAdmin(context);
  await stubCloudinary(page);
  await stubCloudinaryWidget(page);
});

// Após Rodada Auth: cookie admin_session agora é JWT assinado via jose
// (não mais string === ADMIN_SECRET). O helper loginAsAdmin precisa ser
// atualizado pra gerar um JWT válido. Skip até T-extra-4.
test("login admin dá acesso à área protegida de produtos", async ({ page }) => {
  await page.goto("/admin/produtos");
  await expect(page).not.toHaveURL(/\/admin\/login/);
});

/**
 * Ficou `skip` de 2026-06 a 2026-10 com a nota "form exige imagem, a
 * debugar". A nota classificava errado: não era falta de anexar arquivo —
 * **não existe o que anexar**. O `CloudinaryUpload` só tem o widget da
 * Cloudinary, sem campo de URL e sem `<input type="file">`, e o widget
 * carrega de um script externo que o CI não alcança. Sem imagem, o form
 * barra no guard "Adicione pelo menos uma imagem" e nunca navega.
 *
 * A destravada é `stubCloudinaryWidget`: dubla o script de terceiro,
 * não o nosso código. Form, Server Action e Prisma seguem os de produção.
 */
test("criar produto persiste no catálogo", async ({ page }) => {
  await page.goto("/admin/produtos/novo");

  await page.getByLabel(/nome do produto/i).fill("Produto E2E");
  await page.getByLabel(/slug/i).fill(SLUG);
  await page.getByLabel(/descrição curta/i).fill("Curta E2E de teste");
  await page
    .getByLabel(/descrição completa/i)
    .fill("Descrição completa do produto de teste E2E.");
  await page.getByLabel(/preço cheio/i).fill("150");

  // Upload: abre o widget dublado, que devolve uma URL de imagem.
  //
  // ⚠️ A versão anterior fazia `if (count) click().catch(() => {})` — um
  // clique que podia não acontecer e um erro que era engolido. Quando o
  // upload falhava, o teste seguia em frente e só quebrava 15 segundos
  // depois, no `toHaveURL`, longe da causa. Aqui o clique é obrigatório e
  // a chegada da imagem é esperada explicitamente.
  await page
    .getByRole("button", { name: /adicione as fotos do produto/i })
    .click();
  await expect(
    page.getByRole("img", { name: /imagem 1|produto/i }).first(),
  ).toBeVisible();

  await page
    .getByRole("button", { name: /salvar|criar|publicar/i })
    .first()
    .click();

  // Após sucesso, redireciona para a lista de produtos.
  await expect(page).toHaveURL(/\/admin\/produtos(\?|$)/, { timeout: 15_000 });

  // Persistência real
  const rows = await query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM products WHERE slug = $1",
    [SLUG],
  );
  expect(Number(rows[0]?.count ?? 0)).toBe(1);
});
