# CLAUDE.md — `e2e/`

> Testes ponta-a-ponta com **Playwright**. Rodam contra o app real
> (webServer sobe via `playwright.config.ts`). Separados dos testes
> unit/integração do Vitest (que vivem em `src/test/`).

---

## 1. Pré-requisitos

E2E precisa de **app rodando + banco real seedado**:

1. `DATABASE_URL` apontando para um Postgres de teste.
2. `pnpm prisma migrate deploy && pnpm prisma db seed`.
3. `ADMIN_SECRET` no ambiente (fluxo de login admin).

Comando: `pnpm test:e2e`. O `webServer` reaproveita um app já rodando em
dev; em CI usa `pnpm build && pnpm start`.

## 2. Escopo

- **Smoke + fluxos críticos**: homepage, busca, carrinho, checkout vazio,
  proteção de rotas admin.
- **Não** duplicar o que já é coberto por Vitest (regras de negócio,
  componentes isolados). E2E valida a **integração real** (navegação,
  RSC + Prisma, middleware, persistência client).

## 3. Convenções

- Um arquivo `*.spec.ts` por área (`home`, `search`, `cart`, `admin`).
- Seletores **por papel/label acessível** (`getByRole`, `getByLabel`) —
  nunca CSS frágil.
- Testes **resilientes ao seed**: se um pré-requisito de dado não existe
  (ex.: nenhum produto comprável), usar `test.skip(...)` em vez de falhar.
- `baseURL` vem do config; usar caminhos relativos (`page.goto("/")`).

## 4. Armadilhas que já custaram um skip de 4 meses

Os três specs de receita (`checkout-flow`, `admin-crud`, `order-tracking`)
ficaram `test.skip` de 2026-06 a 2026-10 com notas do tipo "a debugar".
Nenhum tinha bug de produto. As causas, para não se repetirem:

1. **Espere a confirmação, não a ação.** Clicar em "Aplicar" cupom dispara
   um `fetch`; finalizar logo em seguida envia o pedido **sem cupom**, e a
   asserção quebra 60 linhas depois, longe da causa. Espere o efeito
   observável (a linha de desconto no resumo), nunca só o clique.

2. **Texto repetido quebra seletor — e às vezes pior: passa.**
   `getByRole("button", { name: /remover/i })` casa com o botão de remover
   item da bolsa (`aria-label="Remover"`), visível desde a carga. A espera
   passava de imediato sem esperar nada. Prefira um texto que só exista no
   estado que você quer; quando o texto se repete de propósito (um selo de
   status e uma etapa da linha do tempo dizendo "Em Separação"), **escope**
   com `page.getByRole("dialog")` em vez de desambiguar por índice.

3. **Widget de terceiro precisa de dublê, não de "anexar arquivo".** O
   upload de imagem do admin só existe via `CldUploadWidget`, que carrega
   script da Cloudinary — inalcançável no CI. Sem imagem o form barra e
   nunca navega. `stubCloudinaryWidget` (em `support/admin.ts`) troca a
   resposta do script por um `window.cloudinary` falso. Dublê no script
   externo; nosso código fica intacto.

4. **`.catch(() => {})` em passo de setup esconde a falha real.** A versão
   antiga do upload era `if (count) click().catch(() => {})`: quando o
   clique falhava, o teste seguia e morria no `toHaveURL` 15s depois. Passo
   de setup que pode falhar deve falhar alto.

5. **Spec que escreve no banco limpa o que escreveu.** Todos os specs
   dividem o mesmo banco, e o produto que o `admin-crud` cria reaparece em
   "Você Também Vai Amar" das vitrines dos outros. O dublê de upload
   devolve um asset que existe de verdade (`/assets/hero1.png`, não uma
   URL inventada da Cloudinary) e o `afterAll` apaga a linha.

   > Correção de rota: por um tempo esta nota afirmava que a URL morta da
   > Cloudinary era a causa do travamento de 60s no CI. **Não era** — ver
   > a armadilha 8, que tem a medida. As duas regras acima continuam
   > valendo por higiene, mas não eram o bug.

6. **Passar em dev não é passar.** O CI roda `pnpm build && pnpm start`;
   `pnpm dev` serve imagem e rota por caminhos diferentes. Antes de
   religar spec que estava skipado, rode uma vez com `CI=true`.

7. **O carrinho é estado compartilhado no banco — e é ele que deixa a
   suíte flaky.** Esta é a armadilha que sobreviveu a todas as outras, e
   custou duas rodadas de diagnóstico errado antes de aparecer.

   O carrinho da Belessence é privado por usuário e mora em `cart_items`,
   **não** em `localStorage` (seção 1 de `src/lib/CLAUDE.md`). Todos os
   specs logam como o mesmo `e2e-user`. Logo o carrinho atravessa spec,
   atravessa retry e atravessa execução inteira da suíte.

   O estrago é silencioso: um spec que morre depois de "adicionar à bag" e
   antes de finalizar deixa o item lá. Na execução seguinte o checkout leva
   o órfão junto, o estoque cai mais de uma unidade e
   `expect(stock).toBe(stockBefore - 1)` quebra — exibindo um número tipo
   `Expected: 47 / Received: 43`, que **acusa o checkout e não o resíduo**.
   Com `retries: 2` acumula dentro da própria execução: cada tentativa que
   morre no meio soma um item para a próxima, e o sintoma vira `1 flaky`.

   Por isso `clearCart(TEST_USER.id)` vai em **`beforeEach`**, nunca em
   `afterAll`: `afterAll` não roda entre as tentativas de retry, que é
   justamente onde o resíduo nasce. Spec novo que faz checkout entra com
   esse `beforeEach`.

   > Como verificar de verdade: rode a suíte **duas vezes seguidas sem
   > limpar o banco entre elas**. Uma execução só, em banco recém-semeado,
   > passa mesmo com o vazamento — foi assim que ele ficou escondido.

8. **`waitUntil: "load"` + imagem real = travamento só no CI.** Esta
   derrubou `checkout-flow` e `order-tracking` seis vezes seguidas (três
   tentativas cada) enquanto a suíte inteira passava localmente, duas
   execuções consecutivas, com `CI=true` e build de produção.

   O `load` só dispara quando **todos** os subrecursos terminam. No PDP as
   imagens passam pelo otimizador same-origin `/_next/image`, que lê o
   arquivo e re-encoda. O que o CI instrumentado mediu:

   ```
   Requisições ainda em voo (1):
     25.0s  /_next/image?url=%2Fassets%2Fhero1.png&w=640&q=75
   ```

   `hero1.png` tem 1,5 MB. O mesmo pedido, com cache frio, responde em
   **0,13s** nesta máquina. Daí a assimetria: num runner de dois núcleos
   com cache frio o trabalho não cabe no teste, e **rodar a suíte local
   não prova nada sobre esse travamento**.

   A mensagem nativa do Playwright não ajuda — diz só `waiting until
"load"`. Por isso existem dois utilitários:
   - `blockImages` (`support/network.ts`) — aborta requisição de imagem
     por `resourceType`. **Spec que navega com `load` entra com ele.**
     Filtrar por host não resolve: a imagem é same-origin.
   - `gotoAndReport` (`support/navigation.ts`) — se o `load` não vier,
     falha com a lista do que ficou em voo e há quanto tempo. Foi ele que
     achou a linha acima, e o erro chega pelas anotações do Actions
     mesmo quando o artefato do Playwright está fora de alcance.

   Nenhum destes specs verifica imagem, então bloquear não enfraquece
   asserção nenhuma: DOM, hidratação, Server Action e banco seguem reais.
   O lado de produção — 1,5 MB de PNG servido na vitrine — é problema
   separado, tratado na geração de AVIF/WebP.

9. **O rate limit agora sobrevive ao fim da suíte.** O contador mora no
   Postgres (`rate_limit_windows`), não mais num `Map` que morria junto
   com o servidor. Consequência prática: rodar a suíte duas vezes dentro
   da janela estourava limites legítimos — `contact` permite 5 envios por
   10 minutos e, com `retries: 2`, uma execução já pode gastar 3.

   Por isso `playwright.config.ts` dá a cada execução um
   `x-forwarded-for` próprio (faixa TEST-NET-2), e
   `e2e/rate-limit.spec.ts` usa um IP só dele (TEST-NET-3) — a rajada
   dele consumiria a cota de cupom do `checkout-flow`, que valida
   `BELES10` no meio do fluxo.

   Spec novo que bate em rota com limite: ou cabe na cota da execução, ou
   usa IP próprio. Nunca conte com o contador estar zerado.

> **Regra:** `test.skip` sem condição só com link de issue e prazo. "A
> debugar" não é prazo — foi essa nota que manteve três fluxos de receita
> desligados com o CI verde por omissão.

---

## 5. Não faça

- Não escrever em banco de produção. E2E que cria pedido deve rodar contra
  banco de teste descartável.
- Não hardcodar credenciais admin no spec — ler de env.
- Não depender de timing/animação GSAP; usar auto-waiting do Playwright
  (`expect(...).toBeVisible()`).
- Não colocar specs Playwright em `src/` (o Vitest os pegaria por engano).
