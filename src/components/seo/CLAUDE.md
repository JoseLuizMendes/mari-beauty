# `src/components/seo/` — Renderização de dados estruturados

## Escopo

Um componente só: `<JsonLd>`, que serializa objetos schema.org num
`<script type="application/ld+json">`.

## Diretrizes

- **Server Component.** Não tem estado nem efeito — não adicione
  `"use client"`.
- `dangerouslySetInnerHTML` é obrigatório: como children, o React escaparia
  as aspas do JSON e o parser do Google receberia lixo. O conteúdo vem de
  `JSON.stringify` do nosso objeto e `<` é escapado para `<`, então a
  injeção é fechada.
- **Os dados vêm de `@/lib/seo/domain/json-ld`.** Não monte objeto
  schema.org inline na página — some do teste e diverge entre rotas.

## Testes

Coberto indiretamente por `src/test/json-ld.test.ts` (os construtores) e
pelos E2E que verificam presença da tag na PDP.

## Referências

- CLAUDE.md de `src/components/`
- CLAUDE.md de `src/lib/seo/`
