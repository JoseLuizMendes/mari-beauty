import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "json-summary", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/test/**",
        "src/**/*.d.ts",
        // Código gerado (Prisma client)
        "src/generated/**",
        // Primitivos shadcn/Radix — código de terceiros, exercitados via uso
        "src/components/ui/**",
        // RSC sem lógica unitária — domínio de E2E (Playwright)
        "src/app/**/{layout,page,loading,error,not-found,template}.tsx",
        "src/middleware.ts",
        // Wiring de provider / SVG estático
        "src/components/providers/**",
        // Paths atualizados após Rodada 4 Hexagonal (Belessence)
        "src/lib/shared/infrastructure/prisma-client.ts", // singleton, mockado
        // Adapter Prisma de liveness — coberto por integração/E2E (smoke) e
        // redundante com o runProbe do use case. Unit cobre a orquestração.
        "src/lib/health/infrastructure/persistence/database-health.ts",
        "src/lib/motion/**", // GSAP helpers — efeito visual, sem assert significativo
        // Camada de render WebGL (react-three-fiber). jsdom não tem contexto
        // WebGL, então nada aqui EXECUTA em teste unitário — cobri-la seria
        // falsificar a métrica. A lógica testável do frasco mora em
        // `src/lib/design/domain/bottle-profile.ts`, que é aritmética pura e
        // tem 17 testes. Mesmo critério já aplicado a src/lib/motion.
        "src/components/bottle-3d/**",
        // Rota de laboratório: existe só em dev (404 em produção).
        "src/app/lab/**",
        // Imagens Open Graph (`ImageResponse`/satori). Não renderizam em
        // jsdom — precisam do runtime de edge e de um rasterizador. A
        // única parte com decisão real é a paleta, que tem guarda própria
        // em `src/test/og-palette.test.ts`, cruzando os hex com o
        // globals.css. Mesmo critério de src/components/bottle-3d.
        "src/app/**/opengraph-image.tsx",
        "src/components/admin/cloudinary-upload.tsx",
        // Auth.js v5 config + Arctic OAuth — wiring declarativo, sem lógica
        // testável em unit (fluxo coberto por E2E + smoke real OAuth).
        "src/lib/auth/infrastructure/external/auth.ts", // NextAuth config
        "src/lib/auth/infrastructure/external/admin-google.ts", // Arctic OAuth redirects
        // admin-login.ts: bcrypt + otplib + lockout — testes unitários
        // significativos exigiriam mock pesado de bcrypt/otplib e ainda assim
        // não dariam confiança real. Fluxo coberto por smoke admin TOTP real.
        "src/lib/auth/infrastructure/persistence/admin-login.ts",
        // Formulários Auth.js client — fluxo coberto por E2E + smoke real
        "src/components/auth/auth-panel.tsx",
        "src/components/auth/auth-form.tsx",
        "src/components/auth/auth-dialog.tsx",
        "src/components/auth/auth-data-sync.tsx",
        // Route Handlers de OAuth + Auth.js — wiring de SDK, coberto por
        // E2E (admin login flow) ou smoke OAuth real
        "src/app/api/auth/[...nextauth]/route.ts",
        "src/app/api/admin/oauth/**/route.ts",
        // Admin Server Actions — fluxo CRUD complexo coberto por
        // Playwright admin-crud spec (logged-in via T-extra-4 helper futuro)
        "src/app/admin/**/actions.ts",
      ],
      // Thresholds realistas pra Belessence pós-Rodada 4 + exclusões. Atingir
      // 80% em statements/lines exige cobrir Server Actions admin e OAuth
      // flow — alvos de E2E, não unit. Subir conforme escrevemos mais tests.
      thresholds: {
        // Piso ajustado ao real: a cobertura escorregou ao longo dos 123
        // commits enquanto o CI nao rodava na master, e o piso foi baixado
        // para 73 em vez de a cobertura ser recuperada. Ratchet só sobe.
        //
        // 2026-10-15 (PR do SEO): 73,31% → 74,72%. O bounded context `seo/`
        // nasceu com 100% em domain. Piso subiu 73 → 74.
        //
        // 2026-10-16 (escala de espaçamento): 74,88% → 75,13%. Piso sobe
        // 74 → 75 — alcançado o valor de onde ele nunca deveria ter saído.
        statements: 75,
        branches: 85,
        functions: 82,
        lines: 75,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // `server-only` é um shim Next.js que só existe em build. Em Vitest
      // (jsdom) apontamos pra um stub vazio pra permitir importar repositories
      // server-only direto dos testes (ex.: wishlist-repository.test.ts).
      "server-only": path.resolve(__dirname, "./src/test/server-only-stub.ts"),
      // Mesmo caso do `client-only` (shim Next.js): stub vazio em testes para
      // permitir importar hooks/componentes client (ex.: use-require-auth.ts)
      // sem depender do hoisting do pnpm (que falha no CI com node_modules estrito).
      "client-only": path.resolve(__dirname, "./src/test/client-only-stub.ts"),
    },
  },
});
