import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright — Belessence E2E
 * ─────────────────────────────────────────────────────────────────────
 * Fluxos ponta-a-ponta da vitrine pública e do admin.
 *
 * Pré-requisitos para rodar localmente:
 *   1. Postgres acessível via DATABASE_URL (.env)
 *   2. Banco migrado + seedado:  pnpm prisma migrate deploy && pnpm prisma db seed
 *   3. ADMIN_SECRET definido no ambiente (usado pelo login admin)
 *
 * O `webServer` abaixo sobe o app automaticamente (reaproveita um já rodando).
 * Em CI, prefira `pnpm build && pnpm start` para testar o bundle de produção.
 */

/**
 * IP fictício, um por execução da suíte.
 * ─────────────────────────────────────────────────────────────────────
 * O rate limit passou a contar no Postgres, então o contador **sobrevive
 * ao fim da suíte** — diferente do `Map` em memória, que morria junto com
 * o servidor. Sem isto, rodar a suíte duas vezes dentro da janela estoura
 * limites legítimos: `contact` permite 5 envios por 10 minutos e, com
 * `retries: 2`, uma única execução já pode gastar 3.
 *
 * Cada execução ganha seu próprio balde. Faixa TEST-NET-3 (RFC 5737),
 * reservada para documentação e teste.
 *
 * Forjar `x-forwarded-for` só é possível porque o servidor de teste não
 * está atrás de proxy. Em produção a Vercel sobrescreve o header — é o
 * que torna `clientKeyFromHeaders` confiável lá.
 */
const E2E_CLIENT_IP = `198.51.100.${1 + Math.floor(Math.random() * 250)}`;

const PORT = Number(process.env.E2E_PORT ?? 3000);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Cada spec roda isolado; paralelismo por arquivo.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",

  // 60s (não 30s): os e2e usam `page.goto` com waitUntil 'load' (espera todos os
  // recursos, incl. imagens do Cloudinary). Em runner de CI lento, a página de
  // produto estourava 30s (flake do PR #9). 60s dá folga sem afrouxar asserts.
  timeout: 60_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: BASE_URL,
    extraHTTPHeaders: { "x-forwarded-for": E2E_CLIENT_IP },
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    locale: "pt-BR",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],

  // Sobe o app se nenhum estiver rodando no BASE_URL.
  webServer: {
    command: process.env.CI ? "pnpm build && pnpm start" : "pnpm dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    // 180s: o build+start de produção pode demorar em runner de CI de 2 núcleos.
    timeout: 180_000,
  },
});
