/**
 * sitemap.xml — descoberta de catálogo.
 * ─────────────────────────────────────────────────────────────────────
 * Motivo (auditoria 2026-10, P1.1): sem sitemap, o Google só encontra um
 * produto se topar com um link para ele. Para e-commerce isso significa
 * cauda longa invisível — exatamente o que mais converte em perfumaria,
 * onde a busca é pelo nome da fragrância.
 *
 * Só entram páginas **públicas e indexáveis**. Checkout, conta, favoritos
 * e admin ficam de fora aqui e no `robots.ts` — declarar URL privada no
 * sitemap é convidar o robô a bater nela.
 *
 * `getAllProducts()` já esconde `DISCONTINUED` (ver `PUBLIC_VISIBLE_WHERE`
 * no repositório), então produto fora de linha não é anunciado — mas
 * continua acessível por link direto, que é o comportamento desejado.
 */

import type { MetadataRoute } from "next";
import { getAllProducts } from "@/lib/products/infrastructure/persistence/products-repository";
import { COLLECTION_SLUGS } from "@/lib/products/domain/collections";
import { siteUrl } from "@/lib/seo/infrastructure/site-url";

/**
 * Gerado a cada requisição, não congelado no build.
 *
 * O instinto aqui é `revalidate = 3600` — catálogo de perfumaria muda em
 * dias, não em segundos. Mas prerenderizar **assa a origem do build
 * dentro das URLs absolutas**: verificado nesta máquina, um sitemap ISR
 * servia `http://localhost:3000` como `<loc>` mesmo com a variável certa
 * no ambiente do servidor. Promover um preview para produção publicaria
 * o catálogo inteiro apontando para o hostname errado.
 *
 * O que se paga: um `findMany` do catálogo por visita de robô — dezenas
 * por dia, não por segundo. É barato perto de publicar URL errada.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${origin}/`, changeFrequency: "daily", priority: 1 },
    { url: `${origin}/allProducts`, changeFrequency: "daily", priority: 0.9 },
    { url: `${origin}/sobre`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${origin}/contato`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${origin}/ajuda`, changeFrequency: "monthly", priority: 0.3 },
  ];

  const collectionRoutes: MetadataRoute.Sitemap = COLLECTION_SLUGS.map(
    (slug) => ({
      url: `${origin}/collections/${slug}`,
      changeFrequency: "weekly",
      priority: 0.8,
    }),
  );

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const products = await getAllProducts();
    productRoutes = products.map((product) => ({
      url: `${origin}/product/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
  } catch {
    // Banco fora do ar não pode derrubar o sitemap inteiro: um sitemap
    // com as páginas estáticas vale mais que um 500, que faz o Google
    // parar de pedir o arquivo.
  }

  return [...staticRoutes, ...collectionRoutes, ...productRoutes];
}
