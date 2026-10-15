---
template: "Niche CLAUDE"
version: 1.0
status: "Ativo"
tags:
  - niche-claude
  - per-diretorio
nicho: "auth"
escopo: "Componentes de UI relacionados a autenticação"
---

# auth

> **Nota de Uso:** Auth dialog, auth form, account menu, session sync. Server/Client mix conforme componente.
>
> Gerado por `tools/generate-claude-md.js` em 2026-05-30 conforme regra **R8** (`[[CLAUDE]]` raiz + `[[Preferencias Dev#4. CLAUDE.md Universal]]`).

---

## Escopo do Diretório

Auth dialog, auth form, account menu, session sync. Server/Client mix conforme componente.

---

## Diretrizes Específicas

- Componentes UI de auth: `auth-dialog`, `auth-form`, `auth-panel`, `account-menu`, `auth-data-sync`.
- Modal `auth-gate` guarda ação pendente e executa após login.
- Stores Zustand de auth vivem em `src/lib/auth/presentation/auth-gate-store.ts`.

---

## Stack Local

Conforme `[[Preferencias Dev]]`.

---

## Testes

Vitest + Playwright conforme `[[Preferencias Dev]]`.

---

## Dependências Permitidas

Auth.js + react-hook-form + Zod + Zustand. Sem novas deps.

---

## Referências

- `CLAUDE.md` global do projeto (raiz)
- `[[Preferencias Dev]]` — stack aprovada
- `[[Niche CLAUDE Template]]` — template canon
