/**
 * `<JsonLd>` — injeta dados estruturados no HTML.
 * ─────────────────────────────────────────────────────────────────────
 * Server Component puro: serializa o objeto num `<script
 * type="application/ld+json">`. Nenhum estado, nenhum efeito — por isso
 * não leva `"use client"`.
 *
 * `dangerouslySetInnerHTML` é obrigatório aqui: o React escaparia as
 * aspas do JSON se o conteúdo fosse children, e o parser do Google
 * receberia lixo. A injeção é segura porque o conteúdo vem de
 * `JSON.stringify` do nosso próprio objeto, nunca de string crua do
 * usuário — e `</script>` dentro de qualquer valor é neutralizado abaixo.
 */

import type { JsonLd as JsonLdData } from "@/lib/seo/domain/json-ld";

/**
 * Impede que um valor de dado feche o `<script>` mais cedo.
 * Nome de produto é conteúdo do admin, não do visitante, mas confiar
 * nisso é exatamente o tipo de premissa que envelhece mal.
 */
function serialize(data: JsonLdData): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function JsonLd({ data }: { data: JsonLdData | JsonLdData[] }) {
  const blocks = Array.isArray(data) ? data : [data];

  return (
    <>
      {blocks.map((block, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serialize(block) }}
        />
      ))}
    </>
  );
}
