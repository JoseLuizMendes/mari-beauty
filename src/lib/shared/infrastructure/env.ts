/**
 * Validação de ambiente — Belessence
 * ─────────────────────────────────────────────────────────────────────
 * Motivo (auditoria 2026-10, P1.4): havia 23 leituras soltas de
 * `process.env` e nenhuma validação. A app subia feliz sem `AUTH_SECRET` e
 * quebrava na primeira requisição autenticada — em produção, no cliente.
 *
 * Canon do vault (`Preferencias Dev` §Segurança): "secrets só em env
 * validada com zod, falha rápida se faltar".
 *
 * ── Desenho: núcleo duro + grupos de feature ──────────────────────────
 *
 * NÚCLEO (`coreEnvSchema`) — sem isto a aplicação não funciona de jeito
 * nenhum, então falha no boot. São exatamente as três que o CI define,
 * e isso não é coincidência: se o núcleo exigisse mais do que o CI
 * fornece, o pipeline quebraria e alguém afrouxaria a validação para
 * destravá-lo. Núcleo mínimo é o que mantém a regra viva.
 *
 * GRUPOS DE FEATURE (`featureGroups`) — cada um liga uma funcionalidade.
 * Incompleto não derruba a app: desliga a feature e **anuncia alto** no
 * boot. Assim dá para rodar localmente sem conta do Cloudinary, e ninguém
 * descobre em produção que o upload nunca foi configurado.
 *
 * ── Uso ───────────────────────────────────────────────────────────────
 *
 *   import { serverEnv, isFeatureReady } from "@/lib/shared/infrastructure/env";
 *
 *   serverEnv.DATABASE_URL            // string, garantido
 *   isFeatureReady("cloudinary")      // boolean
 *
 * Edge-safe: só depende de `process.env` e `zod`.
 */

import { z } from "zod";

/* ── Núcleo: falta disto derruba o boot ───────────────────────────────── */

const coreEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL é obrigatória")
    .refine(
      (v) => v.startsWith("postgres://") || v.startsWith("postgresql://"),
      "DATABASE_URL precisa ser uma connection string Postgres",
    ),

  /**
   * Chave de assinatura HS256 do cookie `admin_session`.
   * NÃO é o valor do cookie — ver `src/lib/auth/presentation/admin-auth.ts`.
   */
  ADMIN_SECRET: z
    .string()
    .min(
      16,
      "ADMIN_SECRET precisa de pelo menos 16 caracteres (é chave de assinatura)",
    ),

  /** Segredo do Auth.js v5. */
  AUTH_SECRET: z
    .string()
    .min(16, "AUTH_SECRET precisa de pelo menos 16 caracteres"),

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

/* ── Opcionais: presença muda comportamento, ausência não derruba ─────── */

const optionalEnvSchema = z.object({
  // Admin por senha + TOTP
  ADMIN_PASSWORD_HASH: z.string().optional(),
  ADMIN_TOTP_SECRET: z.string().optional(),
  ADMIN_ALLOWLIST_EMAILS: z.string().optional(),

  // OAuth Google (caminho alternativo de login admin)
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  AUTH_TRUST_HOST: z.string().optional(),

  // Cloudinary (upload no admin)
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  /**
   * Mercado Pago. A AUSÊNCIA é significativa: `isMockPayment()` usa ela para
   * decidir se o gateway está em mock. Ver src/lib/payment/.
   */
  MP_ACCESS_TOKEN: z.string().optional(),

  // Fornecida pela Vercel; usada pelo /api/health e como `release` do Sentry
  VERCEL_GIT_COMMIT_SHA: z.string().optional(),

  /**
   * Sentry. A AUSÊNCIA é significativa, como no Mercado Pago: sem DSN o
   * `instrumentation.ts` não inicializa o SDK e nada é enviado.
   *
   * São dois nomes porque servem a lados diferentes: `SENTRY_DSN` é lido
   * só no servidor; `NEXT_PUBLIC_SENTRY_DSN` é inlinado no bundle do
   * cliente pelo Next. Configurar só o público também funciona — o
   * servidor cai nele.
   */
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
});

const serverEnvSchema = coreEnvSchema.merge(optionalEnvSchema);

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/* ── Grupos de feature ─────────────────────────────────────────────────── */

/**
 * Cada grupo liga uma funcionalidade. Chave = nome; valor = as variáveis
 * que precisam estar TODAS presentes para a feature existir.
 */
const featureGroups = {
  /** Login do admin por senha + 2FA. */
  adminLogin: ["ADMIN_PASSWORD_HASH", "ADMIN_TOTP_SECRET"],
  /** Login do admin via Google. */
  adminGoogleOAuth: [
    "AUTH_GOOGLE_ID",
    "AUTH_GOOGLE_SECRET",
    "ADMIN_ALLOWLIST_EMAILS",
  ],
  /** Upload assinado de imagem no admin. */
  cloudinary: ["CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"],
  /** Gateway de pagamento real (sem isto, o checkout roda em mock). */
  mercadoPago: ["MP_ACCESS_TOKEN"],
  /**
   * Captura de erro em produção. Basta o DSN público: o servidor usa
   * `SENTRY_DSN` quando existe e cai no público quando não.
   */
  sentry: ["NEXT_PUBLIC_SENTRY_DSN"],
} as const satisfies Record<string, readonly (keyof ServerEnv)[]>;

export type FeatureName = keyof typeof featureGroups;

/* ── Parse ─────────────────────────────────────────────────────────────── */

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((i) => `  • ${i.path.join(".") || "(raiz)"}: ${i.message}`)
    .join("\n");
}

function parseServerEnv(source: NodeJS.ProcessEnv): ServerEnv {
  const result = serverEnvSchema.safeParse(source);

  if (!result.success) {
    throw new Error(
      "Ambiente inválido — a aplicação não pode subir.\n\n" +
        formatIssues(result.error) +
        "\n\nConfira o .env.example. Em dev: cp .env.example .env e preencha.\n",
    );
  }

  return result.data;
}

let cached: ServerEnv | null = null;

/**
 * Lê e valida o ambiente do servidor. Memoizado — o parse roda uma vez.
 *
 * Lança se o núcleo estiver inválido. Chamado no boot por
 * `instrumentation.ts` para que a falha aconteça no start do servidor, e
 * não na primeira requisição que precisar da variável.
 */
export function getServerEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}

/** Apenas para testes — descarta o valor memoizado. */
export function resetServerEnvCache(): void {
  cached = null;
}

/**
 * Acesso direto ao ambiente validado.
 *
 * Proxy em vez de objeto para que o parse só aconteça no primeiro acesso a
 * uma propriedade. Importar este módulo num contexto que não usa env (um
 * teste de componente, por exemplo) não dispara validação.
 */
export const serverEnv: ServerEnv = new Proxy({} as ServerEnv, {
  get: (_t, prop: string) => getServerEnv()[prop as keyof ServerEnv],
  has: (_t, prop: string) => prop in getServerEnv(),
  ownKeys: () => Reflect.ownKeys(getServerEnv()),
  getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
});

/* ── Prontidão de feature ──────────────────────────────────────────────── */

/** Variáveis que faltam para a feature funcionar. Vazio = pronta. */
export function missingForFeature(feature: FeatureName): string[] {
  const env = getServerEnv();
  return featureGroups[feature].filter((key) => {
    const value = env[key as keyof ServerEnv];
    return typeof value !== "string" || value.length === 0;
  });
}

export function isFeatureReady(feature: FeatureName): boolean {
  return missingForFeature(feature).length === 0;
}

/** Mapa completo de prontidão — usado no relatório de boot e no /api/health. */
export function featureReadiness(): Record<FeatureName, boolean> {
  const names = Object.keys(featureGroups) as FeatureName[];
  return Object.fromEntries(names.map((n) => [n, isFeatureReady(n)])) as Record<
    FeatureName,
    boolean
  >;
}

/**
 * Valida o núcleo e devolve as linhas do relatório de features desligadas.
 *
 * Devolve as linhas em vez de logar para manter a função pura e testável —
 * quem chama (instrumentation) decide o que fazer com elas.
 */
export function validateEnvAtBoot(): string[] {
  getServerEnv(); // lança se o núcleo estiver inválido

  const lines: string[] = [];
  for (const feature of Object.keys(featureGroups) as FeatureName[]) {
    const missing = missingForFeature(feature);
    if (missing.length > 0) {
      lines.push(`  • ${feature}: DESLIGADA (falta ${missing.join(", ")})`);
    }
  }
  return lines;
}
