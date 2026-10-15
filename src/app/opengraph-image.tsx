/**
 * Imagem Open Graph padrão da loja.
 * ─────────────────────────────────────────────────────────────────────
 * Motivo (auditoria 2026-10, P1.1): link da loja compartilhado no
 * WhatsApp ou no Instagram saía sem imagem — um retângulo cinza com
 * texto. Em perfumaria, onde a venda passa por indicação em conversa,
 * isso é a vitrine inteira sumindo no canal que mais traz gente.
 *
 * Gerada em código de propósito: não há arquivo de marca em `public/`
 * (ver `organizationJsonLd`), e uma imagem gerada nunca sai de sincronia
 * com a paleta.
 */

import { ImageResponse } from "next/og";
import { ogPalette } from "@/lib/seo/domain/og-palette";

export const alt = "Mari Beauty — Beauty is a Lifestyle";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${ogPalette.wineDeep} 0%, ${ogPalette.wine} 55%, ${ogPalette.wineSoft} 100%)`,
        color: ogPalette.pinkSoft,
      }}
    >
      <div
        style={{
          fontSize: 92,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          display: "flex",
        }}
      >
        Mari Beauty
      </div>
      <div
        style={{
          width: 120,
          height: 2,
          background: ogPalette.pink,
          margin: "36px 0",
        }}
      />
      <div
        style={{
          fontSize: 34,
          letterSpacing: "0.22em",
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
