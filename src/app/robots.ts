/**
 * robots.txt — o que o robô pode pedir.
 * ─────────────────────────────────────────────────────────────────────
 * Motivo (auditoria 2026-10, P1.1): sem `robots.txt` o buscador rasteja
 * tudo, inclusive `/checkout`, `/meus-pedidos` e `/api/*`. Isso gasta
 * orçamento de rastreio em página que nunca vai ranquear e expõe
 * superfície de rota privada em log de robô.
 *
 * ⚠️ `Disallow` não é segurança — é pedido de boa vontade. A proteção
 * real de `/admin/*` continua sendo o middleware (JWT HS256). Esta lista
 * existe para o robô bem-comportado, não para o atacante.
 *
 * Preview não é indexável: dois domínios com o mesmo catálogo é conteúdo
 * duplicado, e o Google pode escolher o errado como canônico.
 */

import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo/infrastructure/site-url";

/**
 * Lido a cada requisição, não congelado no build.
 *
 * Sem isto o Next prerenderiza o arquivo e **assa o `VERCEL_ENV` do
 * build** dentro dele. Quem promove um deploy de preview para produção
 * (botão "Promote" da Vercel) levaria junto o `VERCEL_ENV=preview` e a
 * loja real serviria `Disallow: /` — desindexando o site inteiro sem
 * nenhum sinal visível. Uma invocação por visita de robô é preço baixo
 * por não correr esse risco.
 */
export const dynamic = "force-dynamic";

/** Rotas públicas que não devem ser indexadas. */
const PRIVATE_PATHS = [
  "/admin/",
  "/api/",
  "/checkout",
  "/sucesso/",
  "/meus-pedidos",
  "/favoritos",
  "/entrar",
  "/cadastro",
  "/lab/",
];

export default function robots(): MetadataRoute.Robots {
  const origin = siteUrl();

  // `VERCEL_ENV` é "production" só no alias de produção; preview cai no
  // bloqueio total. Fora da Vercel (self-host, docker), vale `NODE_ENV`.
  const vercelEnv = process.env.VERCEL_ENV;
  const isProduction = vercelEnv
    ? vercelEnv === "production"
    : process.env.NODE_ENV === "production";

  if (!isProduction) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
