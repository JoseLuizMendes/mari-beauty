# `src/lib/seo/` — Bounded Context SEO

> Dados estruturados e origem canônica do site. Nasceu da auditoria
> 2026-10 (**P1.1 — SEO estruturalmente ausente**): o projeto tinha
> `generateMetadata` em 13 páginas e zero `schema.org`, zero `sitemap`,
> zero `robots`.

---

## 1. Escopo

- **JSON-LD** (`Product`, `Offer`, `AggregateRating`, `BreadcrumbList`,
  `Organization`, `WebSite`) — o que faz o produto aparecer na busca com
  preço e estrelas, não só com título.
- **Origem canônica** — a URL absoluta que `sitemap.ts`, `robots.ts`,
  `metadataBase` e o JSON-LD precisam compartilhar.
- **Paleta literal das imagens OG** — exceção técnica documentada em
  `domain/og-palette.ts`.

Quem **renderiza** o JSON-LD é `src/components/seo/json-ld.tsx`; quem
**serve** sitemap e robots são `src/app/sitemap.ts` e `src/app/robots.ts`.
Esta pasta só produz os dados.

---

## 2. Estrutura

```
src/lib/seo/
├── domain/
│   ├── json-ld.ts        # construtores schema.org — funções puras
│   └── og-palette.ts     # hex literais, só para ImageResponse/satori
└── infrastructure/
    └── site-url.ts       # lê o ambiente → origem canônica
```

A divisão segue a mesma regra de `shared/`: ler `process.env` é adapter,
logo `infrastructure/`. O `domain/` recebe a origem por parâmetro e
continua testável sem servidor.

---

## 3. Diretrizes

- **`aggregateRating` só com avaliação real.** Declarar nota sem review
  viola a política de Rich Results do Google e derruba o snippet inteiro
  do produto. A guarda está em `productJsonLd`; não remova.
- **Nada de Prisma aqui.** Os construtores recebem dados simples
  (`ProductSeoInput`), não a entidade do repositório. Assim o teste não
  precisa de banco.
- **URL sempre absoluta no JSON-LD.** O Google não resolve caminho
  relativo em dado estruturado.
- **Rota nova pública** entra no `sitemap.ts`. Rota nova privada entra no
  `PRIVATE_PATHS` do `robots.ts`. As duas listas são revisadas no mesmo PR
  que cria a rota.
- **`og-palette.ts` não é importado por componente de tela.** Quem desenha
  no navegador usa os tokens de `src/app/globals.css`.

---

## 4. Stack Local

`next` (tipos `MetadataRoute`, `ImageResponse`). Sem dependência nova.

---

## 5. Testes

- `src/test/json-ld.test.ts` — construtores, disponibilidade, guarda do
  `aggregateRating`, escape de URL relativa.
- `src/test/site-url.test.ts` — cadeia de resolução e normalização.
- `src/test/og-palette.test.ts` — espelha `globals.css`; falha se a paleta
  divergir.

---

## 6. Referências

- `docs/AUDITORIA-2026-10.md` §P1.1 — por que este contexto existe
- `CLAUDE.md` de `src/lib/`
- `[[Preferencias Dev]]` — stack aprovada
