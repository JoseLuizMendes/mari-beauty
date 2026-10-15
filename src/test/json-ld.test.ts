/**
 * Construtores de JSON-LD.
 *
 * O que estes testes protegem, em ordem de importância:
 *
 *  1. A guarda do `aggregateRating`. Emitir estrela sem review é violação
 *     da política de Rich Results e derruba o snippet inteiro do produto.
 *     É o único jeito de o SEO ficar PIOR do que estava antes deste PR.
 *  2. URL absoluta. O Google não resolve caminho relativo em dado
 *     estruturado — imagem local precisa virar origem + caminho.
 *  3. O mapa de disponibilidade, que é regra de negócio: descontinuado
 *     continua descontinuado mesmo com estoque.
 */

import { describe, it, expect } from "vitest";
import {
  availabilityFor,
  breadcrumbJsonLd,
  organizationJsonLd,
  productJsonLd,
  webSiteJsonLd,
  type ProductSeoInput,
} from "@/lib/seo/domain/json-ld";

const ORIGIN = "https://belessence.vercel.app";

function makeProduct(
  overrides: Partial<ProductSeoInput> = {},
): ProductSeoInput {
  return {
    slug: "essencia-noturna-100ml",
    name: "Essência Noturna 100ml",
    shortDescription: "Âmbar e baunilha para a noite.",
    description: "Descrição longa.",
    price: 289.9,
    images: ["https://res.cloudinary.com/x/a.jpg"],
    category: "perfume",
    stock: 5,
    status: "NORMAL",
    rating: 4.5,
    reviews: 12,
    ...overrides,
  };
}

describe("availabilityFor", () => {
  it("descontinuado continua descontinuado mesmo com estoque", () => {
    expect(availabilityFor({ status: "DISCONTINUED", stock: 99 })).toBe(
      "https://schema.org/Discontinued",
    );
  });

  it("'em breve' é pré-venda, não esgotado", () => {
    expect(availabilityFor({ status: "COMING_SOON", stock: 0 })).toBe(
      "https://schema.org/PreOrder",
    );
  });

  it("estoque zero em produto normal é esgotado", () => {
    expect(availabilityFor({ status: "NORMAL", stock: 0 })).toBe(
      "https://schema.org/OutOfStock",
    );
  });

  it("promoção com estoque está disponível", () => {
    expect(availabilityFor({ status: "PROMOTION", stock: 3 })).toBe(
      "https://schema.org/InStock",
    );
  });
});

describe("productJsonLd", () => {
  it("declara preço em BRL com duas casas", () => {
    const jsonLd = productJsonLd(makeProduct({ price: 289.9 }), ORIGIN);
    const offer = jsonLd.offers as Record<string, unknown>;

    expect(offer.priceCurrency).toBe("BRL");
    expect(offer.price).toBe("289.90");
  });

  it("NÃO emite aggregateRating quando não há avaliação", () => {
    const jsonLd = productJsonLd(
      makeProduct({ reviews: 0, rating: 0 }),
      ORIGIN,
    );
    expect(jsonLd.aggregateRating).toBeUndefined();
  });

  it("NÃO emite aggregateRating com reviews mas nota zerada", () => {
    const jsonLd = productJsonLd(
      makeProduct({ reviews: 3, rating: 0 }),
      ORIGIN,
    );
    expect(jsonLd.aggregateRating).toBeUndefined();
  });

  it("emite aggregateRating quando há avaliação de verdade", () => {
    const jsonLd = productJsonLd(makeProduct(), ORIGIN);
    expect(jsonLd.aggregateRating).toMatchObject({
      "@type": "AggregateRating",
      ratingValue: "4.5",
      reviewCount: 12,
    });
  });

  it("transforma caminho local de imagem em URL absoluta", () => {
    const jsonLd = productJsonLd(
      makeProduct({ images: ["/assets/hero1.png"] }),
      ORIGIN,
    );
    expect(jsonLd.image).toEqual([`${ORIGIN}/assets/hero1.png`]);
  });

  it("preserva URL absoluta de imagem (Cloudinary)", () => {
    const jsonLd = productJsonLd(
      makeProduct({ images: ["https://res.cloudinary.com/x/a.jpg"] }),
      ORIGIN,
    );
    expect(jsonLd.image).toEqual(["https://res.cloudinary.com/x/a.jpg"]);
  });

  it("omite `image` quando não há imagem utilizável", () => {
    const jsonLd = productJsonLd(makeProduct({ images: ["", "  "] }), ORIGIN);
    expect(jsonLd.image).toBeUndefined();
  });

  it("usa a descrição longa quando a curta está vazia", () => {
    const jsonLd = productJsonLd(
      makeProduct({ shortDescription: "", description: "Longa." }),
      ORIGIN,
    );
    expect(jsonLd.description).toBe("Longa.");
  });
});

describe("breadcrumbJsonLd", () => {
  it("numera as posições a partir de 1 e omite `item` do último", () => {
    const jsonLd = breadcrumbJsonLd(
      [
        { name: "Início", path: "/" },
        { name: "Coleção", path: "/allProducts" },
        { name: "Essência Noturna" },
      ],
      ORIGIN,
    );

    expect(jsonLd.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Início", item: `${ORIGIN}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Coleção",
        item: `${ORIGIN}/allProducts`,
      },
      { "@type": "ListItem", position: 3, name: "Essência Noturna" },
    ]);
  });
});

describe("entidades do site", () => {
  it("Organization aponta o logo para uma rota que existe", () => {
    // `/opengraph-image` é gerada por src/app/opengraph-image.tsx. Logo
    // em 404 faz o Google descartar a entidade inteira.
    expect(organizationJsonLd(ORIGIN).logo).toBe(`${ORIGIN}/opengraph-image`);
  });

  it("WebSite aponta a busca para a PLP com o parâmetro real `q`", () => {
    const action = webSiteJsonLd(ORIGIN).potentialAction as Record<
      string,
      Record<string, string>
    >;
    expect(action.target.urlTemplate).toBe(
      `${ORIGIN}/allProducts?q={search_term_string}`,
    );
  });
});
