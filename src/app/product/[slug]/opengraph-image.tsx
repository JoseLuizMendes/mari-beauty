/**
 * Imagem Open Graph por produto.
 * ─────────────────────────────────────────────────────────────────────
 * O link que o cliente manda para a amiga é quase sempre o do produto,
 * não o da home. Esta imagem carrega nome e preço — a informação que faz
 * a pessoa clicar.
 *
 * A foto do produto **não** entra aqui de propósito: `ImageResponse`
 * baixaria a imagem do Cloudinary a cada geração, e uma falha de rede
 * derrubaria a OG inteira. Tipografia sobre a paleta da marca é estável
 * e rende em milissegundos.
 */

import { ImageResponse } from "next/og";
import { ogPalette } from "@/lib/seo/domain/og-palette";
import { getProductBySlug } from "@/lib/products/infrastructure/persistence/products-repository";

export const alt = "Produto Mari Beauty";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const priceFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function ProductOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background: `linear-gradient(135deg, ${ogPalette.wineDeep} 0%, ${ogPalette.wine} 100%)`,
        color: ogPalette.pinkSoft,
      }}
    >
      <div
        style={{
          fontSize: 26,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: ogPalette.pink,
          display: "flex",
        }}
      >
        Mari Beauty
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 76, lineHeight: 1.1, display: "flex" }}>
          {product?.name ?? "Perfumaria premium"}
        </div>
        {product ? (
          <div
            style={{
              marginTop: 28,
              fontSize: 44,
              color: ogPalette.pink,
              display: "flex",
            }}
          >
            {priceFormatter.format(product.price)}
          </div>
        ) : null}
      </div>

      <div
        style={{
          fontSize: 24,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: ogPalette.pink,
          display: "flex",
        }}
      >
        Beauty is a Lifestyle
      </div>
    </div>,
    size,
  );
}
