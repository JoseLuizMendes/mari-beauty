# `src/lib/seo/infrastructure/` — Infrastructure layer

> Adapter de ambiente. **Server-only na prática**, embora só dependa de
> `process.env` (é Edge-safe).

## Diretrizes

- `siteUrl()` **não memoiza** de propósito: preview e produção rodam o
  mesmo bundle, e um valor cacheado no módulo prenderia os dois ao
  primeiro ambiente visto pelo processo.
- A ordem da cadeia é regra, não estilo: `VERCEL_URL` muda a cada deploy,
  então nunca pode ganhar de `VERCEL_PROJECT_PRODUCTION_URL` — senão o
  sitemap de hoje anuncia um hostname que amanhã é outro.
- Variável nova de SEO entra aqui, não em `process.env` solto na página.

## Conteúdo

- `site-url.ts` — `siteUrl()` e `absoluteUrl(path)`.

## Testes

`src/test/site-url.test.ts`.

## Referências

- CLAUDE.md de `src/lib/seo/`
- CLAUDE.md de `src/lib/shared/infrastructure/` — mesma regra sobre ler ambiente
