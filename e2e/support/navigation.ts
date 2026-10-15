/**
 * Navegação instrumentada para E2E.
 * ─────────────────────────────────────────────────────────────────────
 * Existe por um motivo específico: `page.goto(..., { waitUntil: "load" })`
 * espera **todos** os subrecursos da página. Quando um único deles não
 * termina, o `load` nunca dispara e o teste morre com
 *
 *     page.goto: Test timeout of 60000ms exceeded.
 *       - navigating to "...", waiting until "load"
 *
 * que diz onde o teste parou e **nada** sobre o que o prendeu. Foi assim
 * que `checkout-flow` e `order-tracking` falharam seis vezes seguidas no
 * CI (3 tentativas cada) sem deixar pista, enquanto passavam localmente.
 *
 * `gotoAndReport` acompanha as requisições em voo e, se o `load` não vier,
 * falha com a lista de pendentes e há quanto tempo cada uma está aberta.
 * O erro vira a anotação do GitHub Actions, então o diagnóstico chega
 * mesmo quando o artefato do Playwright não está acessível.
 */

import type { Page } from "@playwright/test";

export async function gotoAndReport(
  page: Page,
  path: string,
  timeout = 25_000,
): Promise<void> {
  const inflight = new Map<unknown, { url: string; started: number }>();
  const onRequest = (r: { url(): string }) =>
    inflight.set(r, { url: r.url(), started: Date.now() });
  const settle = (r: unknown) => inflight.delete(r);

  page.on("request", onRequest);
  page.on("requestfinished", settle);
  page.on("requestfailed", settle);

  try {
    await page.goto(path, { waitUntil: "load", timeout });
  } catch (err) {
    const pending = [...inflight.values()]
      .map(
        (r) => `  ${((Date.now() - r.started) / 1000).toFixed(1)}s  ${r.url}`,
      )
      .join("\n");
    throw new Error(
      `Navegação para "${path}" não disparou "load" em ${timeout / 1000}s.\n` +
        `Requisições ainda em voo (${inflight.size}):\n` +
        (pending || "  (nenhuma — o travamento não é de subrecurso)") +
        `\n\nErro original: ${err instanceof Error ? err.message.split("\n")[0] : String(err)}`,
    );
  } finally {
    page.off("request", onRequest);
    page.off("requestfinished", settle);
    page.off("requestfailed", settle);
  }
}
