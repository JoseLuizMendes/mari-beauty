/**
 * Controle de rede para E2E.
 * ─────────────────────────────────────────────────────────────────────
 * `blockImages` aborta toda requisição de imagem da página.
 *
 * Por que isso é obrigatório em spec que navega com `waitUntil: "load"`:
 * o `load` só dispara quando **todos** os subrecursos terminam, imagens
 * inclusive. No CI as imagens do PDP passam pelo otimizador same-origin
 * `/_next/image`, que lê o arquivo, re-encoda e devolve. Num runner de
 * dois núcleos com cache frio esse trabalho não termina dentro do teste:
 * a navegação fica pendurada e o Playwright reporta apenas
 *
 *     page.goto: Test timeout of 60000ms exceeded.
 *       - navigating to "...", waiting until "load"
 *
 * sem dizer o que prendeu. O culpado medido, nas três tentativas de dois
 * specs, foi sempre o mesmo:
 *
 *     25.0s  /_next/image?url=%2Fassets%2Fhero1.png&w=640&q=75
 *
 * (`hero1.png` tem 1,5 MB). Localmente o mesmo pedido responde em 0,13s
 * com cache frio — por isso o problema **só** aparece no CI, e por isso
 * rodar a suíte na sua máquina não prova nada sobre ele.
 *
 * O filtro é por `resourceType`, não por host: a imagem é servida pela
 * própria origem, então filtrar por domínio externo não pega nada.
 *
 * Isto não enfraquece as asserções: nenhum destes specs verifica imagem.
 * DOM, hidratação, Server Actions e banco seguem reais.
 */

import type { Page } from "@playwright/test";

export async function blockImages(page: Page): Promise<void> {
  await page.route("**/*", (route) =>
    route.request().resourceType() === "image"
      ? route.abort()
      : route.continue(),
  );
}
