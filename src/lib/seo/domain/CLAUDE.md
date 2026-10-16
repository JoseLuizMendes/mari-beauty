# `src/lib/seo/domain/` — Domain layer

> Funções puras. Sem Next, sem Prisma, sem `process.env`.

## Diretrizes

- A origem do site chega por **parâmetro**, nunca por leitura de ambiente
  — é o que mantém o teste sem servidor.
- `json-ld.ts` recebe `ProductSeoInput` (dados simples), não a entidade do
  repositório. Mudança no `Product` do Prisma não deve obrigar mudança
  aqui.
- `og-palette.ts` é exceção a "nada de hex em TS": `satori` não resolve
  `var(--color-*)`. Espelha `src/app/globals.css` e tem teste que falha se
  divergir. **Não é mais a única** — `src/lib/design/domain/scene-palette.ts`
  entrou pelo mesmo motivo (WebGL também não resolve `var()`), seguindo este
  arquivo como modelo. A regra que vale para as duas: hex em TS só com
  renderizador que não lê CSS, e sempre com teste de espelho.

## Conteúdo

- `json-ld.ts` — `productJsonLd`, `breadcrumbJsonLd`, `organizationJsonLd`,
  `webSiteJsonLd`, `availabilityFor`.
- `og-palette.ts` — hex da marca para `ImageResponse`.

## Testes

`src/test/json-ld.test.ts` e `src/test/og-palette.test.ts`.

## Referências

- CLAUDE.md de `src/lib/seo/`
