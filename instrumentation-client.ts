/**
 * Sentry no navegador.
 * ─────────────────────────────────────────────────────────────────────
 * Gate por DSN: sem `NEXT_PUBLIC_SENTRY_DSN` não inicializa nada. É o que
 * permite rodar `pnpm dev` sem conta do Sentry e sem enviar evento nenhum
 * — mesmo desenho dos grupos de feature de `env.ts`.
 *
 * Aqui o DSN precisa ser `NEXT_PUBLIC_*` e literal: o Next inlina o texto
 * `process.env.NEXT_PUBLIC_X` no bundle do cliente, então ler de
 * `serverEnv` não funcionaria (e arrastaria o zod para o browser).
 */

import * as Sentry from "@sentry/nextjs";
import {
  scrubEvent,
  type ScrubbableEvent,
} from "@/lib/observability/domain/sentry-scrub";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    // 10% em produção: amostra suficiente para ver regressão de performance
    // sem transformar telemetria em custo fixo. Em dev, tudo.
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    // Mesma restrição do servidor — a nota longa está em
    // `instrumentation.ts`. Em resumo: o v11 trocou `sendDefaultPii` por
    // isto e os padrões novos são mais permissivos, inclusive capturando
    // o valor de variáveis locais na stack trace.
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
      scrubEvent(event as unknown as ScrubbableEvent);
      return event;
    },
  });
}

/** Tracing de navegação do App Router. */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
