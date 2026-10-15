/**
 * Origem canônica do site.
 * ─────────────────────────────────────────────────────────────────────
 * Motivo (auditoria 2026-10, P1.1): sitemap, robots, JSON-LD e
 * `metadataBase` precisam de URL **absoluta**. Sem uma origem única, cada
 * um inventaria a sua e o Google receberia três endereços para a mesma
 * loja — que é como se duplica catálogo sozinho.
 *
 * Isto é infrastructure, não domain: lê o ambiente. O `domain/json-ld.ts`
 * recebe a URL pronta por parâmetro e continua puro.
 *
 * ── Cadeia de resolução ───────────────────────────────────────────────
 *
 *   1. NEXT_PUBLIC_SITE_URL           — domínio próprio, quando houver
 *   2. VERCEL_PROJECT_PRODUCTION_URL  — alias estável de produção
 *   3. VERCEL_URL                     — deploy específico (preview)
 *   4. http://localhost:3000          — dev
 *
 * A ordem importa: `VERCEL_URL` muda a cada deploy, então nunca pode
 * ganhar do alias de produção — senão o sitemap de hoje aponta para um
 * hostname que amanhã é outro.
 */

const LOCAL_FALLBACK = "http://localhost:3000";

/** Remove barra final e garante esquema absoluto. */
function normalize(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return LOCAL_FALLBACK;
  if (/^https?:\/\//.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * Origem do site, sem barra final (`https://exemplo.com`).
 *
 * Lê `process.env` a cada chamada de propósito: em RSC o valor pode vir do
 * ambiente do servidor, e memoizar deixaria preview e produção presos ao
 * primeiro valor visto pelo processo.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return normalize(explicit);

  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) return normalize(vercelProd);

  const vercelDeploy = process.env.VERCEL_URL;
  if (vercelDeploy) return normalize(vercelDeploy);

  return LOCAL_FALLBACK;
}

/** Caminho relativo → URL absoluta na origem canônica. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl()}${suffix}`;
}
