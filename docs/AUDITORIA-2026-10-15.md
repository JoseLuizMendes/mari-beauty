---
template: "Code Audit Report"
version: 1.0
status: "Concluída"
tags:
  - auditoria
  - qualidade
  - 3-arquivos
projeto: "Belessence (mari-beauty)"
data_auditoria: "2026-10-15"
auditor: "Claude Code"
---

# 🔍 Relatório de Auditoria de Código: Belessence

> Gerado a partir de `[[Audit Template]]` (`Dev/0.2 - Audit/Audit Template.md`),
> conforme exige `[[Diretrizes]]` da pasta de auditoria.
>
> **Relação com a auditoria anterior:** [`AUDITORIA-2026-10.md`](AUDITORIA-2026-10.md)
> foi escrita em formato livre e continua valendo como **registro dos achados e do
> raciocínio** — ela é mais detalhada por item do que esta. Este documento não a
> substitui: faz o que ela não fazia, que é passar o projeto pelo checklist canônico,
> cruzar com os 3 agentes norteadores e com a Memória Imunológica, e declarar
> conformidade item a item.

---

## 1. Metadados da Auditoria

| Campo | Valor |
|---|---|
| **Projeto** | Belessence (`mari-beauty`) — e-commerce B2C de perfumaria |
| **Data** | 2026-10-15 |
| **Auditor** | Claude Code |
| **Fase do Projeto** | Pré-produção — o gateway de pagamento ainda é mock |
| **Arquivos Auditados** | 289 `.ts`/`.tsx` em `src/` (excluindo `src/generated/`) + 16 specs E2E |
| **Commit auditado** | `6c29097` (`master`) |

> **Escopo:** auditado o `master`, que é o que está no ar. Três PRs abertos mudam parte
> do que está apontado aqui; cada achado afetado diz qual.

---

## 2. Checklist de Auditoria Estrita

### 2.1 Segurança de Tipos (TypeScript)

| Item | Status | Evidência |
|---|---|---|
| Zero uso de `any` não justificado | ✅ | `0` ocorrências de `: any`, `<any>` ou `as any` em `src/` fora de `generated/` e de testes |
| Interfaces explícitas para todas as entidades | ✅ | Tipos derivados do Prisma, re-exportados por `src/lib/*`; componentes não importam de `src/generated/` |
| DTOs exportados e tipados | ✅ | Schemas Zod em `src/lib/shared/domain/zod-schemas.ts`, compartilhados por form e handler |
| `strict: true` no `tsconfig.json` | ✅ | `tsconfig.json:7` |

### 2.2 Arquitetura Backend (NestJS)

**N/A como escrito — o backend não é NestJS.** São Route Handlers do App Router falando
com Postgres via Prisma. O critério foi reinterpretado pela sua intenção (lógica isolada,
controlador magro, dependências explícitas), que transfere:

| Item (reinterpretado) | Status | Evidência |
|---|---|---|
| Handlers sem regra de negócio | ⚠️ Parcial | A maioria delega a `src/lib/*`. `src/app/api/checkout/route.ts` concentra orquestração de transação, recálculo de preço e consumo de cupom no próprio handler |
| Regras isoladas em camada própria | ✅ | `src/lib/<contexto>/{domain,application,infrastructure}`, com profundidade variável e documentada |
| Dependências explícitas | ✅ | Singleton do Prisma importado, nunca instanciado; nenhum `new PrismaClient()` fora de `prisma-client.ts` |

### 2.3 Arquitetura Frontend (React 19)

| Item | Status | Evidência |
|---|---|---|
| Componentes funcionais (React 19+) | ✅ | Nenhuma classe em `src/components/` |
| Hooks bem estruturados | ✅ | `src/lib/hooks/`, prefixo `use-*`, client-only |
| Separação UI vs. data fetching | ✅ | RSC busca via `src/lib/*`; o par `page.tsx` + `*-client.tsx` é consistente |
| TanStack Query para chamadas de API | ❌ **Divergência consciente** | Ver §5.2 — o projeto usa RSC + Server Actions e não tem camada de fetch client |

### 2.4 Styling (Tailwind + shadcn)

| Item | Status | Evidência |
|---|---|---|
| Zero CSS global (exceto bootstrap) | ✅ | `globals.css` é o único `.css` em `src/` |
| Classes utilitárias em linha | ✅ | — |
| Componentes shadcn para acessibilidade | ✅ | `src/components/ui/`, style `new-york` |
| Tokens do `tailwind.config.ts` usados | ⚠️ **N/A por versão** | Tailwind v4 lê do CSS e **não há** `tailwind.config.ts`. O equivalente existe e está rico: **264 custom properties** em `globals.css` (167 de cor, 27 de tipografia, 19 de raio, 6 de easing) |
| Zero hex hardcoded | ⚠️ | **6 ocorrências**, concentradas: 4 no subsistema 3D (`bottle-profile.ts`, `bottle-viewer.tsx`, `bottle-lab-client.tsx`), 1 no `order-tracking-modal.tsx` (gradiente de listra tracejada) |

> **Lacuna de token que a tabela esconde:** `--spacing*` tem **zero** ocorrências. Das
> quatro famílias que o `[[ai-web-designer-agent]]` exige (tipografia, spacing, cor,
> motion), spacing é a única sem token nomeado — o espaçamento vem direto da escala
> padrão do Tailwind.

### 2.5 Animações (GSAP + Lenis)

| Item | Status | Evidência |
|---|---|---|
| `useGSAP` hook obrigatório | ✅ | 19 arquivos usam `useGSAP`; dos 8 que chamam `gsap.*` em `.tsx`, o único fora de `useGSAP` é `lenis-provider.tsx`, que registra o plugin no ciclo do provider — uso correto |
| `prefers-reduced-motion` respeitado | ✅ | 23 ocorrências entre `globals.css` e componentes |
| Animações não bloqueiam a main thread | ⚠️ Não medido | Nenhuma medição de frame nesta auditoria. Declarar conformidade sem medir seria inventar |
| Cleanup correto de instâncias | ✅ | `useGSAP` faz o revert do contexto |

### 2.6 Acessibilidade (WCAG 2.1 AA)

| Item | Status | Evidência |
|---|---|---|
| Contraste de cores adequado | ⚠️ **Não verificado** | 167 tokens de cor e nenhuma checagem de contraste no CI |
| Navegação por teclado funcional | ⚠️ Parcial | Primitivos Radix dão a base; não há E2E de teclado |
| ARIA labels onde necessário | ✅ | 139 atributos `aria-*` |
| Focus indicators visíveis | ✅ | 43 ocorrências de `focus-visible` |

### 2.7 Testes

| Item | Status | Evidência |
|---|---|---|
| Testes unitários cobrindo lógica crítica | ✅ | Vitest: **726 testes**, 76 arquivos |
| Testes E2E para fluxos principais | ⚠️ | 16 specs, **8 `test.skip`** — entre eles os três fluxos de receita |
| Cobertura mínima | ✅ | **74,72%** statements/lines, 87,05% branches, 81,9% functions — acima do piso de 74 |

> **O achado mais sério desta seção não é a cobertura, é o skip.** Checkout, baixa de
> estoque, consumo de cupom e a máquina de estados do pedido ficaram sem cobertura
> ponta-a-ponta de 2026-06 a 2026-10, com notas do tipo "a debugar". **O CI ficou verde
> por omissão.** Nenhum dos três tinha defeito de produto — ver §6, item 1.

---

## 3. Auditoria dos 3 Agentes Norteadores

> **Ressalva metodológica que precisa vir antes das tabelas.** Os três documentos são
> escritos para **site de portfólio de desenvolvedor**: o Product Strategist fala em
> posicionamento de carreira e seleção de projetos; o Copy Architect especifica hero,
> about, projects, case study e skills. O artefato aqui é uma **loja**.
>
> Marcar tudo "N/A" seria fugir; fingir que casa seria pior. O critério aplicado foi:
> **avaliar o princípio quando ele transfere, e declarar N/A quando o que não transfere
> é o próprio objeto.** Onde está N/A, está dito por quê.
>
> Isto é, em si, um achado — sobre o cofre, não sobre o código: ver §5.3.

### 3.1 Product Strategist [[ai-portfolio-product-strategist]]

| Critério | Status | Observações |
|---|---|---|
| Posicionamento claro | ✅ OK | "Perfumaria premium" é sustentado por tipografia, paleta e copy; não há conflito de posicionamento |
| Hierarquia de informação | ✅ OK | Vitrine → PDP → bolsa → checkout, sem desvio |
| Conversão otimizada | ⚠️ | O caminho existe e é curto. **Não há medição**: nenhum funil instrumentado, então "otimizada" não é afirmável |
| Authority signals | ⚠️ | Avaliações existem no modelo e aparecem no PDP. Faltam os sinais que a metodologia pede e que uma loja tem equivalente: política de troca, selo de pagamento, prova social fora da própria ficha |
| Seleção de projetos / Tier system | N/A | Conceito de portfólio, sem contraparte em loja |

### 3.2 Web Designer [[ai-web-designer-agent]]

| Critério | Status | Observações |
|---|---|---|
| Design System consistente | ✅ OK | 264 custom properties, fonte única em `globals.css` espelhada em `tokens.ts` |
| Tokens de tipografia | ✅ OK | 27 tokens |
| Tokens de spacing | ❌ **Ausente** | Zero `--spacing*`. É a única das quatro famílias exigidas que não existe |
| Tokens de motion | ✅ OK | 6 curvas de easing nomeadas |
| Componentes normalizados | ✅ OK | shadcn `new-york` + componentes de domínio; sem duplicata evidente |

### 3.3 Copy Architect [[ai-portfolio-copy-architect]]

| Critério | Status | Observações |
|---|---|---|
| Clareza da copy | ✅ OK | Microcópia em pt-BR, direta; mensagens de erro de domínio estáveis e em pt-BR por regra |
| Especificidade | ✅ OK | Descrições de produto concretas, sem texto de catálogo genérico |
| Autoridade | ⚠️ | Mesma lacuna do §3.1: a loja afirma premium e sustenta no design, mas tem pouca prova externa |
| Escaneabilidade | ✅ OK | PDP em abas; vitrine em cartões |
| CTAs eficazes | ✅ OK | "Adicionar à bag" é o CTA primário e não disputa com nada |
| Anti-padrões (buzzword, texto genérico) | ✅ OK | Nenhum encontrado |

---

## 4. Consulta à Memória Imunológica

> Cruzado com `[[4 - Error's Memory/INDEX]]`, 24 erros registrados.

### Erros Conhecidos Verificados

| ERR-ID | Título | Verificado? | Prevenção Aplicada? |
|---|---|---|---|
| ERR-2026-0003 | Auth.js v5 com Credentials exige `session.strategy='jwt'` | ✅ Sim | ✅ Sim — `auth.ts:58` |
| ERR-2026-0004 | PrismaAdapter exige tabelas em snake_case | ✅ Sim | ✅ Sim — `@@map` no schema |
| ERR-2026-0006 | Carrinho/Wishlist em `localStorage` global vazava entre usuários | ✅ Sim | ✅ Sim — stores sem `persist`; as 4 menções a `localStorage` em `cart/` e `wishlist/` são **comentários explicando a ausência** |
| ERR-2026-0008 | Conexão criada no import do módulo quebra o build | ✅ Sim | ✅ Sim — singleton com lazy init |
| ERR-2026-0009 | Variável de funcionalidade parcial exigida no boot derruba o app | ✅ Sim | ✅ Sim — `env.ts` separa núcleo de grupos de feature |
| ERR-2026-0021 | Rota pré-renderizada assa a env do build | ✅ Sim | ✅ Sim — `force-dynamic` em `sitemap.ts` e `robots.ts` |
| ERR-2026-0023 | Contador de rate limit precisa ser atômico | ✅ Sim | ⏳ Em PR aberto (#22) |

### Novos Erros Encontrados

Nenhum erro novo nesta passagem. Os cinco descobertos no ciclo 2026-10-14/15 já foram
promovidos ao índice global (ERR-2026-0020 a 0024) e constam acima quando aplicáveis.

---

## 5. Diagnóstico Metodológico

### 5.1 Conformidades

- **Tipagem.** `strict: true`, zero `any`, Zod como fronteira única de entrada externa.
  Converge integralmente com `[[Diretrizes]]`.
- **Camadas.** A profundidade varia **de propósito** por contexto, e a variação está
  documentada em `CLAUDE.md` com o critério. Isso é mais forte que uma camada uniforme
  imposta: a regra está escrita e é verificável.
- **Design system.** Token é fonte única, com `tokens.ts` espelhando o CSS. Converge com
  `[[ai-web-designer-agent]]` em tipografia, cor e motion.
- **Animação.** `useGSAP` com cleanup e `prefers-reduced-motion` respeitado.
- **Documentação por diretório (R8).** Verificada por teste no CI
  (`src/test/claude-md-paths.test.ts`, 132 asserções): mover arquivo sem atualizar o
  `CLAUDE.md` quebra o build de propósito. É enforcement real, não convenção torcida.

### 5.2 Divergências

| # | Divergência | Veredito |
|---|---|---|
| 1 | **TanStack Query ausente** (§2.3) | **Aceita.** A metodologia pressupõe fetch no cliente; aqui RSC busca direto em `src/lib/*` e mutação vai por Server Action. Introduzir Query seria adicionar camada sem demanda. A regra do cofre deveria ler "fetch disciplinado por camada", e no Next 16 isso é RSC + Server Actions |
| 2 | **Sem `tailwind.config.ts`** (§2.4) | **Aceita.** Tailwind v4 lê do CSS; o critério está desatualizado em relação à versão da stack aprovada |
| 3 | **Tokens de spacing ausentes** (§3.2) | **Não aceita.** Nada na v4 impede `--spacing-*`; é lacuna, não decisão |
| 4 | **6 hex hardcoded** (§2.4) | **Parcialmente aceita.** Os 4 do 3D alimentam material WebGL, que não lê CSS custom property — mas podem ser centralizados num mapa do próprio domínio. O do `order-tracking-modal` não tem defesa |
| 5 | **Contraste nunca verificado** (§2.6) | **Não aceita.** 167 tokens de cor e nenhuma checagem |

### 5.3 Dívida Técnica Identificada

1. **Gateway de pagamento é mock** e sempre retorna `approved`
   (`payment-provider.ts:46`). É o bloqueio de produção, e está isolado atrás de uma
   porta única — a dívida é de implementação, não de arquitetura.
2. **Cobertura E2E dos fluxos de receita esteve desligada por 4 meses** com o CI verde.
   A dívida real não é o skip: é **não haver regra que impeça um skip permanente**. Hoje
   existe (`test.skip` só com motivo e prazo), e vale mais que religar os testes.
3. **Nenhuma medição de performance ou de acessibilidade no CI.** Nem Lighthouse, nem
   orçamento de bundle, nem contraste. O que não se mede regride em silêncio — e a
   Memória Imunológica já tem quatro erros dessa família (ERR-0012, 0013, 0015, 0020).
4. **Os 3 agentes norteadores não cobrem e-commerce.** Para este projeto e para qualquer
   loja futura, o cofre precisa de um quarto documento — ou de uma seção de aplicação
   em cada um dos três dizendo o que transfere quando o artefato não é portfólio.
   Enquanto não existir, toda auditoria de loja vai repetir a ressalva do §3.

---

## 6. Plano de Refatoração

| # | Falha | Ação Corretiva | Prioridade | Situação |
|---|---|---|---|---|
| 1 | Fluxos de receita sem E2E | Religar `checkout-flow`, `admin-crud`, `order-tracking` | 🔥 Alta | ✅ **PR #21** (CI verde) |
| 2 | Rate limit não distribuído | Contador atômico em Postgres | 🔥 Alta | ✅ **PR #22** (CI verde) |
| 3 | 1,5 MB de PNG na vitrine | Gerar AVIF/WebP + `formats` no `next.config` | 🔥 Alta | ✅ **PR #20** (CI verde) |
| 4 | Gateway de pagamento mock | Integrar provedor real atrás da porta existente | 🔥 Alta | ⏳ Decisão pendente (Mercado Pago × ASAAS) |
| 5 | Contraste nunca verificado | Checagem automatizada dos pares de token no CI | 🟡 Média | Aberto |
| 6 | Tokens de spacing ausentes | Declarar `--spacing-*` em `globals.css` e espelhar em `tokens.ts` | 🟡 Média | Aberto |
| 7 | Hex hardcoded no 3D | Mapa de cores no domínio do frasco; manter o hex só na fronteira WebGL | 🟡 Média | Aberto |
| 8 | Hex no `order-tracking-modal` | Trocar por token | 🟢 Baixa | Aberto |
| 9 | Regra de negócio no `checkout/route.ts` | Extrair para `orders/application/` | 🟡 Média | Aberto |
| 10 | Sem orçamento de performance no CI | Lighthouse CI ou verificação de bundle | 🟡 Média | Aberto |
| 11 | 3 agentes não cobrem e-commerce | Documento ou seção de aplicação no cofre | 🟡 Média | Aberto (repo `dev`) |

---

## 7. Aprovação para Próxima Fase

### Status da Auditoria

- [ ] **Aprovado** — Código conforme todas as regras
- [x] **Aprovado com Ressalvas** — Correções menores pendentes
- [ ] **Reprovado** — Refatoração necessária antes de continuar

**Justificativa.** Nenhuma falha estrutural: tipagem, camadas, design system e
enforcement de documentação estão conformes, e os três achados de prioridade alta que
dependiam de código já estão em PR com CI verde. O que impede o "Aprovado" é de outra
natureza — **o gateway de pagamento é mock**, e uma loja que aprova todo pagamento não
vai a produção por decisão de negócio, não por qualidade de código.

As ressalvas restantes (contraste, spacing, hex do 3D, orçamento de performance) são
lacunas de **medição e padronização**, nenhuma bloqueante.

### Assinaturas

**Auditor:** Claude Code — **Data:** 2026-10-15

**Tech Lead:** _____________________ **Data:** _______________

---

> **Próximo Passo:** mergear os PRs #20, #21 e #22 (nesta ordem — o #22 está empilhado
> sobre o #21), decidir o provedor de pagamento e abrir os itens 5 a 11 do §6 como
> trabalho subsequente.
