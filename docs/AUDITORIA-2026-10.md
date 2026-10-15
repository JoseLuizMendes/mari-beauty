---
template: "Code Audit Report"
version: 1.0
status: "Ativo"
tags:
  - auditoria
  - qualidade
  - plano
  - belessence
projeto: "Belessence (Mari Beauty)"
data_auditoria: "2026-10-14"
auditor: "Claude Opus 5 (Claude Code)"
---

# 🔍 Auditoria de Código + Plano de Evolução — Belessence

> Auditoria feita contra o canon do vault (`Dev/Dev/0 - Planner Project/Preferencias Dev.md` v5.5,
> `Master Pipeline & Enforcement` v2.3, `0.2 - Audit/Diretrizes.md`) e comparando com os projetos
> irmãos `dr-gabriel-cavalcante-web`, `rotina-app`, `Wedding-New` e `MendeShift`.

---

## 1. Metadados

| Campo | Valor |
|---|---|
| **Projeto** | Belessence / Mari Beauty — e-commerce de perfumaria |
| **Data** | 2026-10-14 |
| **Fase** | Desenvolvimento avançado, pré-produção |
| **Arquivos auditados** | 261 arquivos TS/TSX em `src/` (166 `.tsx`, 95 `.ts`) + 16 specs Playwright + 50 testes Vitest |
| **Branch** | `test/e2e-login-programatico` (working tree limpa) |
| **Último commit** | `1e36000` — `test(e2e): re-skip os 3 fluxos complexos` |

---

## 2. Veredito em uma frase

**O Belessence é, de longe, o projeto mais bem construído do seu workspace em
engenharia — e o mais atrasado em canon e em prontidão comercial.** Ele tem
arquitetura hexagonal, 50 testes unitários, 16 specs E2E, CI com Postgres
efêmero, health checks e governança de DX que nenhum dos outros tem. E não
consegue receber um único real, porque **o pagamento é um mock que sempre
aprova**.

Os quatro bloqueios de produção, em ordem de execução:

| | Bloqueio | Custo de corrigir |
|---|---|---|
| **P0.4** | O `CLAUDE.md` do app aponta para 5 arquivos que não existem e descreve um modelo de segurança que foi substituído | 20 min |
| **P0.1** | Pagamento é mock: aprova tudo e baixa estoque real | 3-5 dias |
| **P0.2** | Zero e-mail transacional (Resend instalado, nunca importado) | 1 dia |
| **P0.3** | Os 3 E2E de receita estão `skip` — o CI está verde por omissão | 1-2 dias |

---

## 3. O que está genuinamente bom (não mexer)

Reconhecer isso importa, porque o plano abaixo não deve destruir o que funciona.

| Área | Evidência |
|---|---|
| **Arquitetura hexagonal** | `src/lib/{orders,health}/` com `domain/`, `application/ports/`, `infrastructure/persistence/` separados de verdade. Raro em projeto Next solo. |
| **Segurança do admin** | `src/middleware.ts` valida JWT assinado (`jose`), não mais `ADMIN_SECRET` cru. Tem TOTP (`otplib`), lockout e rate limit em `src/lib/auth/infrastructure/persistence/admin-login.ts:60`. |
| **Idempotência de pagamento** | `src/lib/orders/application/confirm-payment.ts` já é idempotente por `paymentId` e já aceita `source: "webhook"`. O caminho está pavimentado. |
| **CI honesto** | `.github/workflows/test.yml` sobe Postgres 16 real, migra, seeda e roda E2E. Tem retry com `timeout 240` no download do chromium — isso é cicatriz de problema real resolvido, não cargo cult. |
| **Transação no checkout** | `src/app/api/checkout/route.ts` cria pedido, decrementa estoque e consome cupom dentro de `$transaction`. Correto. |
| **Observabilidade básica** | `/api/health` (liveness) e `/api/health/ready` (readiness) com adapter próprio. |
| **Comentários de cobertura** | `vitest.config.ts` justifica **cada** exclusão de coverage em prosa. Isso é documentação de decisão, não desculpa. |

---

## 4. Críticas por severidade

### 🔴 P0 — Bloqueia produção

#### P0.1 — O pagamento é um mock que sempre aprova

`src/lib/payment/infrastructure/external/payment-provider.ts:63-70`

```ts
return {
  paymentId: `MOCK_${randomUUID()}`,
  status: "approved",   // ← sempre
  paymentMethod: PAYMENT_METHODS[Math.floor(Math.random() * 3)], // ← sorteado
```

Consequências encadeadas:

- `mercadopago@2.4.0` está no `package.json` e **nunca é importado** (0 ocorrências em `src/`).
- Não existe `src/app/api/webhooks/mp/route.ts` — o próprio código admite a falta em comentário (linha 13).
- Qualquer visitante que chegue no checkout **recebe pedido em `PREPARING` sem pagar** e o estoque é decrementado. Em produção isso é zeragem de estoque por bot em uma madrugada.
- O método de pagamento exibido ao cliente é aleatório, não o que ele escolheu.

> **Gravidade real:** não é "falta integrar o gateway". É que o sistema hoje
> **confirma pedidos falsos e baixa estoque real**. Antes do deploy, o mínimo é
> um feature flag que bloqueia o checkout quando `isMockPayment()` é `true`.

#### P0.2 — Zero e-mail transacional

`resend@4.0.0`, `@react-email/components` e `@react-email/render` estão instalados.
**Nenhum arquivo de `src/` importa qualquer um deles** — só aparecem citados em `CLAUDE.md`.

O cliente compra e não recebe nada: nem confirmação, nem código de rastreio, nem recuperação de senha por e-mail. Para perfumaria premium (ticket alto, cliente ansioso), isso é abandono garantido e chamado no WhatsApp para cada pedido.

#### P0.3 — Três fluxos críticos de E2E estão desligados

O último commit da branch é literalmente `re-skip os 3 fluxos complexos`:

| Spec | Linha | Fluxo desligado |
|---|---|---|
| `e2e/checkout-flow.spec.ts` | 36 | checkout cria pedido, baixa estoque, consome cupom |
| `e2e/admin-crud.spec.ts` | 35 | criar produto persiste no catálogo |
| `e2e/order-tracking.spec.ts` | 39 | pedido vai para PREPARING com datas reais |

São exatamente os três caminhos que geram receita. O CI está verde **porque os testes que importam não rodam**. Isso é pior que não ter os testes: dá falsa confiança no merge.

#### P0.4 — O `CLAUDE.md` do app aponta para arquivos que não existem

Este é o achado mais barato de corrigir e o mais caro de ignorar, porque **é o
primeiro arquivo que todo agente lê antes de escrever qualquer linha**.

O refactor "Rodada 4 Hexagonal" moveu `src/lib/` inteiro e o `CLAUDE.md` não acompanhou.
Verificado arquivo por arquivo:

| O `CLAUDE.md` afirma | Realidade |
|---|---|
| `src/lib/design-tokens.ts` | ❌ não existe → é `src/lib/design/domain/tokens.ts` |
| `src/lib/validations.ts` (Zod) | ❌ não existe → é `src/lib/shared/domain/zod-schemas.ts` |
| `src/lib/prisma.ts` (singleton) | ❌ não existe → é `src/lib/shared/infrastructure/prisma-client.ts` |
| `src/api/CLAUDE.md` e `@/api/utils` | ❌ não existe → é `src/shadcn-utils/utils.ts` |
| package chama-se `belessence-new` | ❌ é `mari-beauty` |
| tokens em **OKLCH** | ❌ são **hex** (`#47131C`…) |

E o mais grave, na seção **5.2 Segurança**:

> *"O middleware protege `/admin/*` com `admin_session === ADMIN_SECRET`"*

Isso **era** verdade e deixou de ser. O commit `a2b3ff5` substituiu a comparação em
texto puro por JWT assinado com `jose` (`verifyAdminSession`). O `CLAUDE.md` ainda
descreve o modelo de segurança antigo e inseguro.

> **Por que isso é P0:** um agente lendo esse arquivo vai criar `src/lib/validations.ts`
> em paralelo ao schema real, importar de `@/api/utils` (que não resolve), e — pior —
> "corrigir" o middleware de volta para a comparação em texto puro, achando que está
> conformando o código à documentação. **A documentação está ativamente guiando para a
> regressão de segurança.**

Correção: 20 minutos reescrevendo seis linhas. Deixar como está custa toda sessão futura.

### 🟠 P1 — Perde dinheiro ou quebra em escala

#### P1.1 — SEO estruturalmente ausente

Para um e-commerce, isso é o canal de aquisição inteiro:

- Sem `src/app/sitemap.ts` — Google não descobre os produtos.
- Sem `src/app/robots.ts`.
- Sem JSON-LD (`schema.org`): **zero** ocorrências em `src/`. Sem `Product`, `Offer`, `AggregateRating`, `BreadcrumbList`, nenhum produto aparece com preço/estrelas no resultado de busca.
- Sem `opengraph-image` — link compartilhado no WhatsApp/Instagram sai sem imagem.

O `generateMetadata` existe em 13 páginas (bom), mas metadata sem sitemap e sem dados estruturados é meia solução.

#### P1.2 — APIs públicas sem rate limit

Rate limit existe **só** no login admin. Estão abertas e gravam em banco ou disparam custo externo:

| Rota | Risco |
|---|---|
| `POST /api/contact` | spam direto na caixa / tabela |
| `POST /api/newsletter` | enumeração de e-mails + lixo em base |
| `POST /api/reviews` | flood de avaliações falsas |
| `POST /api/coupon/validate` | **brute force de cupom** — descobrir códigos válidos por tentativa |
| `GET /api/cep/[cep]` | proxy aberto para API externa (custo/ban de IP) |

`/api/coupon/validate` é o mais grave: sem throttle, enumerar `DESCONTO10`, `BLACK20` etc. é trivial.

#### P1.3 — Mídia pesada e fora do padrão do vault

```
public/: 36 arquivos .png/.jpg · 0 .avif · 0 .webp
```

O canon (`Preferencias Dev` §Imagens e Mídia Web) é explícito: **AVIF + WebP; WEBP puro é o mínimo aceitável**. Hoje o projeto está 100% abaixo do mínimo. Em perfumaria, a foto *é* o produto — e é ela que derruba o LCP no 4G.

Também há **10 tags `<img>` cruas** em `src/` fora do `next/image`.

#### P1.4 — Sem validação de ambiente

23 leituras diretas de `process.env` espalhadas por `src/lib` e `src/app`, sem nenhum schema Zod validando o ambiente no boot. O app sobe feliz com `AUTH_SECRET` faltando e quebra na primeira requisição autenticada — em produção, no cliente.

O `zod` já está instalado e você já tem `src/lib/shared/domain/zod-schemas.ts`. É meia hora de trabalho.

#### P1.5 — Nenhuma captura de erro em produção

Sem Sentry, sem nada. O `dr-gabriel-cavalcante-web` já tem `@sentry/nextjs@10.62.0` + `instrumentation.ts` + `instrumentation-client.ts`. O Belessence, que é o projeto com mais superfície (checkout, pagamento, admin), é o que voa cego.

### 🟡 P2 — Dívida técnica e drift

#### P2.1 — Hexagonal pela metade

Só `orders` e `health` têm as três camadas. Os outros módulos têm apenas `infrastructure/persistence`:

```
cart, coupons, reviews, wishlist  →  só infrastructure/
```

Resultado: regra de negócio de cupom (validade, limite de uso, valor mínimo) mora no repositório ou no route handler, não num `domain/`. Ou se adota hexagonal inteiro, ou se declara explicitamente que só `orders` é hexagonal e o resto é CRUD. **Hoje é indefinido, e indefinido é o que apodrece.**

#### P2.2 — `globals.css` com 1059 linhas

O canon diz **"Zero CSS global"**. O arquivo tem:

- 131 seletores de classe
- componentes inteiros em CSS puro: `.btn-wine`, `.btn-ghost-wine`, `.btn-pink-on-wine`, `.focus-ring`, `.pill-press` (linhas 1001-1048)
- 6 `@keyframes` próprios, apesar de `tw-animate-css` estar instalado

`.btn-wine` e irmãos deveriam ser variantes do `Button` do shadcn via `class-variance-authority` — que já está no projeto.

#### P2.3 — O drift de documentação não é só do app

Ver **P0.4** para o caso grave (o `CLAUDE.md` do app). O mesmo erro de OKLCH se repete
no `CLAUDE.md` raiz do workspace, que também afirma "Tailwind CSS v4 + tokens OKLCH".
Os dois precisam ser corrigidos juntos, senão um reintroduz o outro.

#### P2.4 — Dependências instaladas e não usadas

`mercadopago`, `resend`, `@react-email/components`, `@react-email/render` — quatro pacotes pesados no bundle de instalação para funcionalidades que não existem.

#### P2.5 — Cobertura em ratchet descendente

`vitest.config.ts` confessa, em comentário:

> *"o piso ajustado ao real (~73%): a cobertura escorregou ao longo dos 123 commits enquanto o CI não rodava na master"*

A honestidade é exemplar. O fato não é: o piso foi **baixado** de 75 para 73 em vez de a cobertura ser recuperada. Ratchet só funciona subindo.

---

## 5. Dívida de canon — Belessence vs. o seu próprio vault

Esta é a crítica mais útil, porque a régua é sua.

| Regra canon (`Preferencias Dev` v5.5) | Belessence | rotina-app | dr-gabriel |
|---|:---:|:---:|:---:|
| **TanStack Query** (`useEffect` para fetch é **proibido**) | ❌ ausente | ✅ | ✅ |
| **`DESIGN.md` obrigatório no bootstrap** | ❌ | ✅ | ✅ ×3 |
| **`/impeccable init` → `PRODUCT.md`** | ❌ | — | ✅ |
| **Spec-Kit SDD (`specs/`)** | ❌ | ✅ 3 specs | ✅ 5 specs |
| **`prettier-plugin-tailwindcss`** | ❌ | ✅ | ✅ |
| **AVIF/WebP** | ❌ 0/36 | — | — |
| **Zero CSS global** | ❌ 1059 linhas | — | — |
| Husky + lint-staged | ✅ | ✅ | ✅ |
| Vitest + Playwright | ✅ | ✅ | ✅ |

E o drift de versões (o Belessence é o mais antigo dos três):

| | Belessence | rotina-app | dr-gabriel |
|---|---|---|---|
| Next | **16.0.10** | 16.2.10 | 16.2.9 |
| React | **19.2.0** | 19.2.4 | 19.2.3 |
| Zod | **3.25.56** | **4.4.3** | — |
| skills instaladas | **1** (impeccable) | 1 | **22** |

> **O diagnóstico de processo:** você evoluiu a metodologia nos projetos novos e
> **não retroalimentou o Belessence**. O vault virou canon depois que o Belessence
> já estava em voo. Ele é hoje o maior passivo de conformidade do workspace.

A migração **Zod 3 → 4** é a que mais dói deixar parada: o `rotina-app` já está em v4, e manter duas versões mentais do mesmo validador entre projeto irmãos é fonte garantida de erro.

---

## 6. Sobre o artigo das "5 ferramentas"

Você pediu para olhar junto com as skills/MCPs. Análise honesta, ferramenta por ferramenta:

### Os números conferem — a conta de dinheiro, não

> **Correção (2026-10-14, após esta auditoria ser escrita):** a primeira versão deste
> documento afirmava que as contagens de estrelas do artigo eram implausíveis. **Estava
> errado.** Verificado na API do GitHub em 2026-10-14:

| Repositório | Artigo | API do GitHub |
|---|---|---|
| `Leonxlnx/taste-skill` | 95,5 mil | **96.454** ✅ |
| `pbakaus/impeccable` | 80,7 mil | **81.234** ✅ |
| `emilkowalski/skills` | 45,9 mil | **46.273** ✅ |

Os três estão corretos (ligeiramente defasados para baixo, consistente com a data de
apuração do artigo). O ceticismo era meu, não um defeito da fonte.

O que **continua** valendo como ressalva é a parte comercial: **R$ 75 mil por semana** é
possibilidade, não média — e o próprio artigo desarma isso duas seções depois, ao mostrar
que exige 15 sites vendidos e entregues em 5 dias úteis. O número realista que ele mesmo
dá (2 sites/mês a R$ 3 mil) é o que vale para planejamento.

Avalie as ferramentas pelo encaixe no seu fluxo. Nesse critério, a análise abaixo não muda.

### O que já está resolvido (não instale)

| Ferramenta do artigo | Situação real no seu setup |
|---|---|
| **Impeccable** | ✅ Já instalado nos 3 projetos, via `skills-lock.json`. O artigo te vende o que você já tem. |
| **Skills do Emil Kowalski** | ✅ **Já coberto, e melhor.** Você tem `~/.claude/skills/motion-design-engineering/` — destilado da filosofia do Emil (animations.dev) + talks de design da Apple, com gatilhos em pt-BR e `references/animation-standards.md`. Instalar `emilkowalski/skills` por cima cria **duas fontes de verdade concorrentes** para a mesma decisão. Não instale. |
| **Playwright MCP** | ✅ Conectado nesta sessão. E o projeto já usa Playwright como framework de teste com 16 specs + CI. |

### O que de fato falta e vale

| Ferramenta | Veredito para o Belessence | Veredito para clientes novos |
|---|---|---|
| **Taste Skill** | 🟡 **Baixa prioridade.** Serve para *escolher direção de arte do zero*. O Belessence já tem marca definida (Mari Beauty, paleta wine/pink, mockups Stitch). O que serviria é a variante `redesign-existing-projects` do mesmo repo. | 🟢 **Alta.** É exatamente o buraco do passo "briefing → primeira versão" para site de cliente. |
| **Figma MCP** | 🟢 **Alta, mas por outro motivo.** Não para "cliente comentar" — para **sincronizar o design system**. Hoje `globals.css` (1059 linhas) é a única fonte de verdade visual e ela não existe em lugar nenhum fora do código. ⚠️ Requer autorização OAuth no claude.ai antes de usar. | 🟢 Alta |
| **Playwright MCP** | 🟢 **Uso imediato e específico:** debugar os 3 E2E skipados (P0.3). É *exatamente* o caso de uso — navegador real, interativo, passo a passo. | 🟢 Alta |

### O que o artigo não menciona e é o seu maior ganho

**Spec-Kit.** Você já tem 10 skills `speckit-*` instaladas no `dr-gabriel-cavalcante-web` e o canon do vault (`Protocol-SpecKit`, `Spec-Kit Reference`) o declara obrigatório na Fase 4. O Belessence não tem `specs/`. Nenhuma skill de design resolve o problema de "três fluxos de receita desligados" — SDD resolve.

**Prioridade real:** Spec-Kit no Belessence > Figma MCP > Playwright MCP > Taste Skill.

---

## 7. Plano — 4 ondas

Cada onda é entregável sozinha e tem um portão de saída verificável.

### Onda 0 — Parar a sangria (1 dia)

> Objetivo: o projeto deixar de ser perigoso se alguém der deploy por engano.

| # | Ação | Arquivo |
|---|---|---|
| 0.1 | Feature flag: bloquear checkout quando `isMockPayment()` — banner "Loja em preparação" | `src/app/api/checkout/route.ts`, `src/app/checkout/` |
| 0.2 | Validação de env com Zod no boot (falha rápida e ruidosa) | novo `src/lib/shared/domain/env.ts` |
| 0.3 | Rate limit nas 5 rotas públicas, começando por `/api/coupon/validate` | `src/app/api/*/route.ts` |
| 0.4 | **Reescrever o `CLAUDE.md` do app** (P0.4): os 5 caminhos mortos, o nome do package, OKLCH→hex e — crítico — a seção 5.2 descrevendo JWT/`jose`, não `ADMIN_SECRET` em texto puro | `CLAUDE.md`, `../../CLAUDE.md` |

**Portão:** nenhum pedido criável sem gateway real; env inválido derruba o boot; todo
caminho citado no `CLAUDE.md` resolve (`ls` de cada um passa).

> Faça o **0.4 primeiro**. Enquanto o mapa estiver errado, cada passo seguinte — seu ou
> de um agente — parte de premissa falsa.

### Onda 1 — Receita de verdade (3-5 dias)

> Objetivo: o Belessence consegue receber um pagamento e o cliente é avisado.

| # | Ação |
|---|---|
| 1.1 | Mercado Pago real em `payment-provider.ts` — manter a interface, trocar só a implementação (o port já existe) |
| 1.2 | `POST /api/webhooks/mp/route.ts` com **validação de assinatura `x-signature`** → chama `confirmPayment({ source: "webhook" })`, que já é idempotente |
| 1.3 | E-mails com Resend + React Email: confirmação de pedido, mudança de status, recuperação de senha |
| 1.4 | **Reativar os 3 E2E skipados** — usar o Playwright MCP para debugar interativamente |

**Portão:** compra real em sandbox do MP ponta a ponta, com e-mail chegando e os 3 specs verdes no CI.

### Onda 2 — Ser encontrado (2-3 dias)

> Objetivo: o Google sabe que a loja existe e mostra preço no resultado.

| # | Ação |
|---|---|
| 2.1 | `src/app/sitemap.ts` dinâmico (produtos + coleções) e `src/app/robots.ts` |
| 2.2 | JSON-LD: `Product` + `Offer` + `AggregateRating` em `product/[slug]`, `BreadcrumbList` nas listagens, `Organization` no layout |
| 2.3 | `opengraph-image.tsx` por produto |
| 2.4 | Converter os 36 PNG/JPG para **AVIF + WebP**; eliminar as 10 `<img>` cruas |
| 2.5 | Sentry + `instrumentation.ts` (copiar o setup do `dr-gabriel-cavalcante-web`) |

**Portão:** Rich Results Test do Google valida um produto; Lighthouse mobile ≥ 90 em Performance e SEO.

### Onda 3 — Pagar a dívida de canon (contínuo, 1 item por PR)

| # | Ação |
|---|---|
| 3.1 | `pnpm add -D prettier-plugin-tailwindcss` (10 minutos, pega ordenação de classe para sempre) |
| 3.2 | Criar `DESIGN.md` + rodar `/impeccable init` → `PRODUCT.md` |
| 3.3 | Instalar as skills `speckit-*` e criar `specs/001-pagamento-real/` **retroativamente** para a Onda 1 |
| 3.4 | Migrar Zod 3 → 4; subir Next 16.0.10 → 16.2.x; React 19.2.0 → 19.2.4 |
| 3.5 | Introduzir TanStack Query **só em componentes novos** — não refatorar os 13 `useEffect` de uma vez |
| 3.6 | Decidir e **escrever** em `docs/ARQUITETURA.md`: hexagonal só em `orders`, ou hexagonal em tudo |
| 3.7 | Extrair `.btn-wine`/`.btn-ghost-wine`/`.btn-pink-on-wine` para variantes CVA do `Button` |
| 3.8 | Ratchet de cobertura: voltar a 75% e **só subir** |

---

## 8. Como trabalhar daqui pra frente

O que a auditoria revela não é falta de capacidade — é **falta de retroalimentação**.
O vault evoluiu para a v5.5, os projetos novos nasceram nele, e o Belessence ficou
congelado numa versão anterior da sua própria metodologia. Quatro mudanças de processo
que resolvem isso:

### 8.1 Spec antes de código, sem exceção

Toda onda acima vira uma pasta em `specs/NNN-nome/` antes da primeira linha. Você já tem
o `Protocol-SpecKit` e as 10 skills no `dr-gabriel`. O custo é meia hora por feature; o
retorno é não ter mais "3 fluxos skipados porque o corpo do teste é difícil de debugar".

### 8.2 Teste skipado é bug com prazo, não decisão

Regra nova: `test.skip` só com link de issue e data. Skip sem prazo vira `test.fail` em
duas semanas — aí o CI quebra e você é obrigado a olhar. O skip silencioso é a única
coisa no projeto que mente para você.

> Exceção legítima, já no código: `test.skip(true, "Nenhum produto comprável no seed")`
> em `e2e/cart.spec.ts:25` — skip condicional de dado ausente, documentado no
> `e2e/CLAUDE.md`. Esse pode ficar.

### 8.3 `CLAUDE.md` precisa de teste, como código

O P0.4 é a prova: cinco caminhos mortos e um modelo de segurança desatualizado passaram
por 123 commits sem ninguém notar, porque **nada verifica o `CLAUDE.md`**. Ele é escrito
uma vez por `tools/generate-claude-md.js` e depois apodrece sozinho enquanto o código anda.

Isso tem conserto barato e vale mais que qualquer skill nova: um teste que extrai todo
path citado nos `CLAUDE.md` e falha se o arquivo não existir. Trinta linhas de Vitest,
roda no CI junto com o resto.

```
docs/CLAUDE-paths.test.ts  →  para cada `src/...` citado em **/*.CLAUDE.md, existsSync()
```

Versões e nome de package dá para checar no mesmo teste, lendo o `package.json`. O que
não dá para automatizar — como "o middleware usa JWT" — vira item do checklist de PR.

A regra geral: **refactor que move arquivo só fecha quando o `CLAUDE.md` do diretório
move junto.** Hoje essa regra existe no vault (R8) mas nada a aplica.

### 8.4 Promover o canon de baixo para cima

Quando um projeto novo adota algo que funciona (`prettier-plugin-tailwindcss`, Sentry,
TanStack Query), isso vira linha no `Preferencias Dev` **e** uma issue nos projetos
antigos. Sem esse passo, cada projeto vira um fóssil da metodologia do mês em que nasceu
— que é exatamente o que aconteceu aqui.

### 8.5 Ordem de ferramentas para site novo de cliente

Fluxo enxuto, usando o que você já tem e só o que falta:

```
Briefing (Master Project Planning Template — do vault, não o prompt do artigo)
  → Taste Skill (direção de arte, 3 opções)      ← instalar
  → DESIGN.md + /impeccable init                  ← já tem
  → Spec-Kit: specs/001-*                         ← já tem
  → implementação
  → motion-design-engineering                     ← já tem (não instale emilkowalski)
  → /impeccable audit + polish                    ← já tem
  → Playwright MCP (teste de visitante real)      ← já tem
  → Figma MCP (telas para o cliente comentar)     ← requer OAuth
  → Deploy Protocol (do vault)
```

O artigo descreve 10 passos; **7 você já executa melhor pelo vault**. O que ele
realmente adiciona ao seu arsenal é a **Taste Skill** e o uso do **Figma MCP como ponte
de design system**.

---

## 8.6 Achados da sessão de 2026-10-15 (PRs #15 a #18)

Coisas que só apareceram ao mexer no código. Nenhuma estava na auditoria
original.

### 🟠 Rate limit distribuído — pendente, bloqueia produção

O PR #17 pôs rate limit nas cinco rotas públicas, mas com **store em
memória**. Em serverless cada instância tem o próprio `Map`, então ataque
com concorrência contorna. Reduz flood acidental; não detém atacante.

O certo é contador no Postgres, como `admin-login.ts` já faz com
`AdminLoginAttempt`. Exige migration — não feita porque o Docker não estava
disponível para gerar e testar, e migration não testada é pior que o
problema. O store é uma interface (`RateLimitStore`), então é adicionar um
arquivo, não reescrever call sites.

### 🟠 `pnpm build` exige banco acessível

As páginas `/admin/*` são prerenderizadas e consultam o Prisma no build, que
falha com `ECONNREFUSED` sem Postgres de pé. Na Vercel funciona (Neon
acessível), mas impede build local offline e deixa o build acoplado à
disponibilidade do banco.

Provável correção: `export const dynamic = "force-dynamic"` nas páginas do
admin — elas são por definição dinâmicas e autenticadas, não deveriam ser
prerenderizadas.

### 🟡 O drift de doc era maior que os 36 caminhos

Além dos caminhos mortos, havia afirmações erradas em prosa que o guard de
caminhos não pega:

- `src/lib/CLAUDE.md` descrevia a estrutura **plana** inteira
  (`prisma.ts`, `products-db.ts`, `validations.ts`…) que o refactor
  hexagonal eliminou. Passou pelo teste porque nomes sem `/` não são
  tratados como caminho. Reescrito no #15.
- `components/CLAUDE.md` dizia que a paleta era *"OKLCH (ivory + champagne
  gold + noir)"*. É hex, e é wine / rosé / marfim. Corrigido no #17.

Lição de método: **find/replace cego em documentação destrói história.** A
primeira versão do #15 reescreveu notas de migração até elas dizerem
"X → X", apagando o registro de onde cada arquivo veio. O guard ganhou
marcadores de histórico e de roadmap para não forçar esse tipo de reescrita.

### 🟡 O fixture de `ADMIN_SECRET` no CI era fraco

O workflow usava `e2e-secret` — 11 caracteres para uma chave de assinatura
HS256. A validação de env (#16) rejeitou, e com razão. Valor reforçado no
workflow em vez de afrouxar a regra.

---

## 9. Quality Gate desta auditoria

- [x] Código-fonte lido diretamente (não inferido de documentação)
- [x] Cruzado com o canon do vault (`Preferencias Dev` v5.5, `Master Pipeline` v2.3)
- [x] Comparado com os 3 projetos irmãos de referência
- [x] Cada violação tem arquivo + linha + ação proposta
- [x] Plano com portão de saída verificável por onda
- [ ] `4 - Error's Memory/INDEX` consultado — **pendente** (não localizado no vault lido)
- [ ] Validado com o dev (José) — **aguardando**
