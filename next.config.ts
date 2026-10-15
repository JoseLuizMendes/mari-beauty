import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /**
     * AVIF primeiro, WebP como fallback.
     *
     * O padrão do Next é só WebP. Declarar AVIF faz o otimizador servi-lo a
     * quem aceita — inclusive para as fotos de produto do Cloudinary, que são
     * a maior parte dos bytes de imagem da loja e que nenhum script local
     * converte. Canon: `Preferencias Dev` §Imagens e Mídia Web.
     *
     * A ordem importa: o Next usa o primeiro formato que o `Accept` do
     * navegador aceitar.
     */
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
