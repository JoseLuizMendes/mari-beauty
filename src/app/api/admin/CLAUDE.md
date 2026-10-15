---
template: "Niche CLAUDE"
version: 1.0
status: "Ativo"
tags:
  - niche-claude
  - per-diretorio
nicho: "admin"
escopo: "Route Handler HTTP"
---

# admin

> **Nota de Uso:** Endpoint REST para Client Components / clientes externos. NÃO consumir daqui em RSC — RSC chama `src/lib/*-db` direto. Toda entrada passa por Zod.
>
> Gerado por `tools/generate-claude-md.js` em 2026-05-30 conforme regra **R8** (`[[CLAUDE]]` raiz + `[[Preferencias Dev#4. CLAUDE.md Universal]]`).

---

## Escopo do Diretório

Endpoint REST para Client Components / clientes externos. NÃO consumir daqui em RSC — RSC chama `src/lib/*-db` direto. Toda entrada passa por Zod.

---

## Diretrizes Específicas

- Endpoint HTTP do App Router (Route Handler).
- TODA entrada via Zod (`src/lib/shared/domain/zod-schemas.ts`).
- Re-validar preço, estoque, cupom — NUNCA confiar no client.
- Server Components NÃO consomem este endpoint — usam `src/lib/*-db` direto.
- Retornar `NextResponse.json(...)` com status apropriado.

---

## Stack Local

Next.js Route Handler + Zod + Prisma (via `src/lib/*-db`) + `auth()` (Auth.js v5).

---

## Testes

Vitest para lógica isolada; Playwright para fluxos completos que tocam o endpoint.

---

## Dependências Permitidas

Conforme `[[Preferencias Dev]]` — Zod + Prisma + Auth.js.

---

## Referências

- `CLAUDE.md` global do projeto (raiz)
- `[[Preferencias Dev]]` — stack aprovada
- `[[Niche CLAUDE Template]]` — template canon
