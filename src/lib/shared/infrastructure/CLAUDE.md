---
template: "Niche CLAUDE"
version: 1.0
status: "Ativo"
tags:
  - niche-claude
  - per-diretorio
  - hexagonal
  - infrastructure
nicho: "shared/infrastructure"
escopo: "Camada Infrastructure do bounded context shared — adapters concretos (Prisma singleton, leitura de ambiente)"
---

# `src/lib/shared/infrastructure/` — Infrastructure layer

> **Camada Infrastructure (Hexagonal):** adapters concretos. Aqui moram o Prisma Client singleton (com config SSL via `@prisma/adapter-pg`) e a leitura validada do ambiente.
>
> **Server-only.** NUNCA importar em Client Components.

---

## Por que `env.ts` mora aqui e não em `domain/`

Ler `process.env` é acoplamento ao mundo externo — exatamente o que `domain/` proíbe ("sem side effects, zero framework"). O _schema_ é Zod puro, mas o ato de ler o ambiente é adapter. Logo: infrastructure.

---

## Diretrizes Específicas

- **Ambiente:** todo acesso a variável de ambiente server-side deve passar por `env.ts`, não por `process.env` direto. Duas exceções documentadas:
  - `src/lib/auth/presentation/admin-auth.ts` — roda no Edge runtime e tem a restrição própria de só depender de `jose`. Importar `env.ts` (e com ele o zod) ali engorda o bundle do middleware.
  - `instrumentation.ts` — checa `NEXT_RUNTIME` antes de carregar o módulo.
- **Núcleo vs feature:** variável nova que é fatal se faltar entra no `coreEnvSchema`. Variável que só liga uma funcionalidade entra em `optionalEnvSchema` + um grupo em `featureGroups`. Núcleo que o CI não fornece quebra o pipeline — pense antes de promover.
- **Singleton em dev:** `globalThis.prisma` reutilizado pra evitar múltiplas instâncias durante hot-reload.
- **SSL Postgres:** `Pool({ ssl: { rejectUnauthorized: false } })` — solução do `[[ERR-2026-0005]]` em `[[06-Erros]]`.
- **Adapter:** `PrismaPg(pool)` — required pra Prisma 7+ em ambientes serverless.
- **Não exportar tipos** do `@/generated/prisma` daqui — quem precisa importa direto.

## Stack Local

- `@prisma/client@7.2`, `@prisma/adapter-pg@7.6`, `pg@8.20`.

## Testes

- `src/test/env.test.ts` cobre `env.ts` (núcleo, grupos de feature, relatório de boot).
- `prisma-client.ts` não tem teste unit dedicado — o singleton é trivial. Testes que dependem dele são integração (Vitest com banco de teste OU Playwright).

## Conteúdo

- `prisma-client.ts` — singleton com adapter + pool SSL.
- `env.ts` — schema Zod do ambiente, parse memoizado e grupos de feature.

## Referências

- `[[ERR-2026-0005]]` em `[[06-Erros]]` — SSL Postgres warning solução
- CLAUDE.md de `src/lib/shared/`
