import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

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

/**
 * Sentry no build (auditoria 2026-10, P1.5).
 *
 * Só liga quando `SENTRY_ORG` e `SENTRY_PROJECT` existem. Sem elas o
 * wrapper vira passagem direta: `pnpm build` local e no CI não tenta
 * subir source map, não exige token e não imprime aviso. A inicialização
 * em runtime tem o gate dela própria (DSN) em `instrumentation.ts`.
 *
 * `tunnelRoute` faz os eventos saírem pelo nosso domínio em vez de ir
 * direto ao ingest do Sentry — bloqueador de anúncio corta o segundo, e
 * erro que não chega é pior que erro sem contexto.
 */
const sentryEnabled = Boolean(
  process.env.SENTRY_ORG && process.env.SENTRY_PROJECT,
);

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      tunnelRoute: "/monitoramento",
      widenClientFileUpload: true,
      silent: !process.env.CI,
    })
  : nextConfig;
