/**
 * Hook de boot do Next.js — roda uma vez quando o servidor sobe.
 * ─────────────────────────────────────────────────────────────────────
 * Duas responsabilidades, nesta ordem:
 *
 * 1. **Validar o ambiente.** Se o núcleo (DATABASE_URL / ADMIN_SECRET /
 *    AUTH_SECRET) estiver inválido, derruba o processo aqui — barulhento e
 *    cedo — em vez de deixar a app subir e quebrar na primeira requisição
 *    que precisar da variável. Ver `src/lib/shared/infrastructure/env.ts`.
 *
 * 2. **Inicializar o Sentry** (auditoria 2026-10, P1.5). A ordem importa:
 *    ambiente inválido derruba antes de o Sentry subir, e é isso que se
 *    quer — erro de configuração aparece no log do deploy, não como um
 *    evento perdido numa fila.
 *
 * Gate por DSN: sem `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN`, o Sentry não
 * inicializa. Mesmo desenho dos grupos de feature do `env.ts` — a
 * ausência é significativa e não derruba nada.
 */

export async function register() {
  // O runtime Edge do middleware não roda a validação: lá ela acontece no
  // primeiro acesso via o proxy `serverEnv`. O Sentry, sim — erro no
  // middleware é erro que o cliente vê.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnvAtBoot } =
      await import("./src/lib/shared/infrastructure/env");

    const disabled = validateEnvAtBoot(); // lança se o núcleo estiver inválido

    if (disabled.length > 0) {
      console.warn(
        "\n⚠️  Features desligadas por variável de ambiente ausente:\n" +
          disabled.join("\n") +
          "\n",
      );
    }
  }

  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  const Sentry = await import("@sentry/nextjs");
  const { scrubEvent } =
    await import("./src/lib/observability/domain/sentry-scrub");

  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    /**
     * Substitui o antigo `sendDefaultPii: false`, que o SDK v11 removeu.
     *
     * ⚠️ Não é só renomear. Os padrões do v11 coletam **mais** do que o
     * antigo `false` coletava: todos os campos abaixo vêm ligados por
     * omissão. Numa loja que recebe CPF, CEP e endereço no checkout,
     * aceitar o padrão mandaria para fora exatamente o que o scrub existe
     * para reter — e dois deles o scrub nem alcança.
     *
     * `stackFrameVariables` é o mais perigoso dos dois: captura o **valor
     * das variáveis locais** no frame do erro. No handler do checkout,
     * isso é o CPF e o endereço do cliente dentro da stack trace, fora do
     * objeto `request` que o `beforeSend` filtra.
     *
     * A lista foi conferida contra o `DataCollection` do @sentry/core
     * 11.8.0 — não copiada de outro projeto, que está no v10 e usa a
     * opção antiga.
     */
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
    },
    beforeSend(event) {
      scrubEvent(event as unknown as Parameters<typeof scrubEvent>[0]);
      return event;
    },
  });
}

/**
 * Captura erro de Server Component e de Route Handler.
 *
 * Importação preguiçosa pelo mesmo motivo do `register`: sem DSN, o SDK
 * não precisa entrar no bundle do servidor.
 */
export async function onRequestError(
  ...args: Parameters<typeof import("@sentry/nextjs").captureRequestError>
): Promise<void> {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
}
