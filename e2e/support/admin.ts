/**
 * Helpers de admin para E2E.
 * ─────────────────────────────────────────────────────────────────────
 * - loginAsAdmin: injeta o cookie `admin_session` (= ADMIN_SECRET) direto no
 *   contexto, evitando passar pela tela de login em todo teste.
 * - stubCloudinary: intercepta a assinatura + o upload para não bater no
 *   Cloudinary real durante o CRUD de produto.
 */

import type { BrowserContext, Page } from "@playwright/test";
import { SignJWT } from "jose";

/**
 * loginAsAdmin: injeta o cookie `admin_session` = JWT jose assinado (HS256 com
 * ADMIN_SECRET), espelhando `createAdminSessionToken` (sub "admin", v 1, exp
 * 12h). O middleware (`verifyAdminSession`) só aceita esse formato — o segredo
 * cru não vale mais.
 */
export async function loginAsAdmin(
  context: BrowserContext,
  baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000",
): Promise<void> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SECRET não definido — necessário para E2E admin");
  }
  const { hostname } = new URL(baseURL);
  const token = await new SignJWT({ v: 1 })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("admin")
    .setIssuedAt()
    .setExpirationTime("43200s")
    .sign(new TextEncoder().encode(secret));

  await context.addCookies([
    {
      name: "admin_session",
      value: token,
      domain: hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

/**
 * Dubla o **widget** de upload da Cloudinary.
 * ─────────────────────────────────────────────────────────────────────
 * Por que isto existe: o `CloudinaryUpload` não tem caminho sem widget —
 * nem campo de URL, nem `<input type="file">`. O `CldUploadWidget` do
 * `next-cloudinary` injeta `<script src="upload-widget.cloudinary.com/
 * global/all.js">` e, no `onLoad`, chama `window.cloudinary
 * .createUploadWidget(options, callback)`.
 *
 * Sem rede para a Cloudinary (e sem querer depender dela no CI), o script
 * nunca carrega, `open()` não faz nada, nenhuma imagem entra e o form
 * trava em "Adicione pelo menos uma imagem". **Era este o bloqueio do
 * `admin-crud`, e não "falta anexar imagem"**: não há o que anexar.
 *
 * A dublagem é no script de terceiro, não no nosso código: trocamos a
 * resposta da URL do widget por um `window.cloudinary` que devolve, ao
 * `open()`, o mesmo `{ event: "success", info: { secure_url } }` que a
 * Cloudinary devolveria. Todo o resto do caminho — React, form, Server
 * Action, Prisma — é o de produção.
 *
 * `stubCloudinary` (abaixo) cobre a assinatura e o POST do upload; este
 * cobre o widget. Os dois são necessários.
 *
 * ⚠️ **O padrão é um caminho LOCAL, não uma URL da Cloudinary.** A primeira
 * versão devolvia `res.cloudinary.com/demo/.../stub.jpg`, que não existe.
 * O produto criado pelo teste fica no banco compartilhado e reaparece em
 * "Você Também Vai Amar" das outras páginas; ali o `/_next/image` tenta
 * buscar esse asset no servidor, a requisição não termina, o evento `load`
 * nunca dispara e **todo `page.goto` com `waitUntil: "load"` estoura em
 * 60s** — foi assim que o checkout-flow e o order-tracking quebraram no CI
 * depois de passarem localmente (em dev a diferença não aparece).
 *
 * `/assets/hero1.png` existe no repositório, então resolve na hora. Para o
 * caminho que este teste exercita — widget → form → Server Action → Prisma
 * — tanto faz se a string é local ou remota.
 */
export async function stubCloudinaryWidget(
  page: Page,
  secureUrl = "/assets/hero1.png",
): Promise<void> {
  await page.route("**/upload-widget.cloudinary.com/**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `
        window.cloudinary = {
          createUploadWidget: function (options, callback) {
            return {
              open: function () {
                // A Cloudinary emite vários eventos; o componente só
                // reage ao "success". Chamada assíncrona para imitar o
                // upload real e não resolver dentro do próprio clique.
                setTimeout(function () {
                  callback(null, {
                    event: "success",
                    info: { secure_url: ${JSON.stringify(secureUrl)} },
                  });
                }, 10);
              },
              close: function () {},
              destroy: function () {},
              hide: function () {},
              show: function () {},
              update: function () {},
              isDestroyed: function () { return false; },
              isMinimized: function () { return false; },
              isShowing: function () { return false; },
              minimize: function () {},
            };
          },
        };
      `,
    }),
  );
}

export async function stubCloudinary(page: Page): Promise<void> {
  // Assinatura gerada pelo nosso endpoint
  await page.route("**/api/admin/cloudinary/sign", (route) =>
    route.fulfill({
      json: {
        signature: "stub-signature",
        timestamp: 1,
        apiKey: "stub-key",
        cloudName: "demo",
        folder: "belessence/products",
      },
    }),
  );
  // Upload direto ao Cloudinary → devolve um asset que existe de verdade.
  // Mesmo motivo do `stubCloudinaryWidget`: a URL gravada no produto é
  // servida depois nas vitrines, e apontar para um arquivo inexistente
  // pendura o `/_next/image` e, com ele, o `load` da página.
  await page.route("https://api.cloudinary.com/**", (route) =>
    route.fulfill({
      json: {
        secure_url: "/assets/hero1.png",
        public_id: "belessence/products/stub",
      },
    }),
  );
}
