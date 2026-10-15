# CLAUDE.md — `src/test/`

> Suítes de teste e setup. Stack: **Vitest** (+ jsdom) + Testing Library.
> E2E (Playwright) tem config própria na raiz do app.

---

## 1. Conteúdo

- `setup.ts` — setup global do Vitest. Importa `@testing-library/jest-dom`
  e mocka `gsap`, `@gsap/react`, `lenis` (incompatíveis com jsdom).
- `*.test.ts(x)` — testes unitários e de componente.

## 2. Convenções

1. **Vitest** é o runner. Comandos:
   - `pnpm test` — watch
   - `pnpm test:run` — single run (CI)
   - `pnpm test:coverage` — single run + gate de cobertura
   - `pnpm test:ui` — UI mode
2. **Localização dos testes**: **central em `src/test/`** (padrão único do
   projeto). Unit, integração e componente vivem todos aqui como
   `<arquivo>.test.ts(x)`. E2E fica em `e2e/` (fora de `src/`).
3. **Naming**: `<arquivo-em-teste>.test.ts(x)`.
4. **AAA**: Arrange → Act → Assert. Separar com linha em branco.

## 3. Setup global (`setup.ts`)

Polyfills jsdom (necessários por componentes): `window.matchMedia`,
`IntersectionObserver`, `ResizeObserver`, `Element.prototype.scrollIntoView`.
Mocks globais: `@/lib/shared/infrastructure/prisma-client` (todos os models), `gsap`/`@gsap/react`/
`gsap/ScrollTrigger`, `lenis`. **Não re-mockar esses nos testes.**

## 4. Mocks e a estratégia de duas camadas (Prisma)

- **GSAP/Lenis** já mockados globalmente — não re-mockar.
- **Prisma — duas camadas (importante):**
  1. **Unit/Integração (Vitest, mock):** mockamos o Prisma para validar
     **orquestração** rápido — ordem de chamadas, payloads, status HTTP,
     ramos de erro. Ex.: `api-checkout.test.ts` afirma que o handler
     recalcula preço do banco e usa `$transaction`.
  2. **E2E (Playwright, banco real):** a **regra crítica** (estoque
     decrementa, cupom incrementa `usedCount`, pedido é criado) é validada
     contra **Postgres real** em `e2e/checkout-flow.spec.ts`. É lá que se
     confia no comportamento de verdade, não no mock.
  - Resumo: mock = feedback rápido de orquestração; banco real = prova da
    regra crítica. Complementares, não competem.
- **fetch**: `vi.spyOn(globalThis, "fetch")` (restaurar no `afterEach`).

## 5. Componentes

- `render` de `@testing-library/react`.
- Queries por **role/label** (acessíveis), evite `getByTestId` salvo
  necessidade.
- **Interações: usar `userEvent`** (`const user = userEvent.setup()`), não
  `fireEvent` — dispara eventos compostos (focus/blur/keydown) realistas,
  essenciais para forms RHF e primitivos Radix.
- Componentes async (RSC) **não** podem ser testados unitariamente —
  cobrir via E2E ou testar o `*-client.tsx` filho.
- **Limite do unit**: corpos de `useGSAP(...)` e branches de Radix
  Select/Calendar **não** rodam em jsdom — cobertos em E2E. Não escrever
  testes frágeis (ex.: afirmar que `gsap.from` foi chamado).

## 5. E2E (Playwright)

- Config: `playwright.config.*` (a criar/atualizar).
- Comando: `pnpm test:e2e`.
- Suítes E2E ficam em `e2e/` (fora de `src/`).
- Foco: fluxos críticos — busca → carrinho → checkout → sucesso; admin
  login → criar produto.

## 6. Cobertura

- Não buscar % de cobertura — buscar **cobertura dos caminhos críticos**:
  cálculo de preço, frete, cupom, estoque, validação de input.
- Testar erros tão importante quanto sucesso (ex.: cupom expirado, sem
  estoque, payload inválido).

## 7. Não faça

- Não criar testes que dependem de animação real (`gsap` está mockado de
  propósito).
- Não testar implementação interna (estado privado, classes CSS) — teste
  comportamento observável.
- Não compartilhar estado entre testes — cada `it` deve ser isolado.
