# `src/lib/observability/domain/` — Domain layer

> Função pura. Sem Sentry, sem Next, sem `process.env`.

## Diretrizes

- `sentry-scrub.ts` recebe um objeto com a forma do evento e devolve o
  mesmo objeto filtrado (muta e retorna — é o contrato do `beforeSend`).
- **Não importe `@sentry/nextjs` aqui**, nem para tipo. O tipo local
  `ScrubbableEvent` existe exatamente para isso: o scrub é compartilhado
  entre servidor e navegador, e um import de SDK arrastaria peso para o
  bundle do cliente.
- Idempotente: filtrar duas vezes dá o mesmo resultado. Tem teste.

## Conteúdo

- `sentry-scrub.ts` — `scrubEvent`, `isSensitiveKey`.

## Testes

`src/test/sentry-scrub.test.ts`.

## Referências

- CLAUDE.md de `src/lib/observability/`
