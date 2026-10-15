/**
 * Construtores de JSON-LD (schema.org).
 * ─────────────────────────────────────────────────────────────────────
 * Motivo (auditoria 2026-10, P1.1): o projeto tinha `generateMetadata` em
 * 13 páginas e **zero** dados estruturados. Metadata diz ao Google o
 * título; JSON-LD é o que faz o produto aparecer na busca **com preço,
 * disponibilidade e estrelas**. Para e-commerce isso é o canal de
 * aquisição, não enfeite.
 *
 * Camada `domain/`: funções puras, sem Next, sem Prisma, sem
 * `process.env`. A URL do site chega por parâmetro (ver
 * `../infrastructure/site-url.ts`). É o que torna tudo testável sem subir
 * servidor.
 *
 * ⚠️ `aggregateRating` só é emitido quando existe avaliação de verdade.
 * Declarar nota sem review é violação da política de Rich Results do
 * Google e derruba o snippet inteiro do produto — não só a estrela.
 */

/** Objeto JSON-LD pronto para serializar. */
export type JsonLd = Record<string, unknown>;

/** Moeda única da loja. */
const CURRENCY = "BRL";

const AVAILABILITY = {
  inStock: "https://schema.org/InStock",
  outOfStock: "https://schema.org/OutOfStock",
  preOrder: "https://schema.org/PreOrder",
  discontinued: "https://schema.org/Discontinued",
} as const;

/** Preço em string com duas casas — o formato que o schema.org espera. */
function formatPrice(value: number): string {
  return value.toFixed(2);
}

export interface ProductSeoInput {
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  stock: number;
  status: "NORMAL" | "PROMOTION" | "COMING_SOON" | "DISCONTINUED";
  /** Média 0–5. Só vira `aggregateRating` se `reviews > 0`. */
  rating: number;
  /** Quantidade de avaliações aprovadas. */
  reviews: number;
}

/**
 * Disponibilidade schema.org a partir do ciclo de vida + estoque.
 *
 * A ordem das checagens é a regra de negócio: um produto descontinuado
 * segue descontinuado mesmo que ainda haja peça em estoque, e um
 * "em breve" não é "esgotado" — é pré-venda.
 */
export function availabilityFor(
  input: Pick<ProductSeoInput, "status" | "stock">,
): string {
  if (input.status === "DISCONTINUED") return AVAILABILITY.discontinued;
  if (input.status === "COMING_SOON") return AVAILABILITY.preOrder;
  return input.stock > 0 ? AVAILABILITY.inStock : AVAILABILITY.outOfStock;
}

/**
 * `Product` + `Offer` (+ `AggregateRating` quando há avaliação).
 *
 * @param product dados do catálogo
 * @param origin  origem canônica do site, sem barra final
 */
export function productJsonLd(
  product: ProductSeoInput,
  origin: string,
): JsonLd {
  const url = `${origin}/product/${product.slug}`;

  const images = product.images
    .filter((src) => Boolean(src?.trim()))
    .map((src) => (/^https?:\/\//.test(src) ? src : `${origin}${src}`));

  const jsonLd: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription || product.description,
    category: product.category,
    url,
    ...(images.length > 0 ? { image: images } : {}),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: CURRENCY,
      price: formatPrice(product.price),
      availability: availabilityFor(product),
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "Mari Beauty" },
    },
  };

  // Ver o aviso no topo do arquivo: sem review, sem estrela.
  if (product.reviews > 0 && product.rating > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.rating.toFixed(1),
      reviewCount: product.reviews,
      bestRating: "5",
      worstRating: "1",
    };
  }

  return jsonLd;
}

export interface Crumb {
  name: string;
  /** Caminho relativo (`/allProducts`). O último item pode omitir. */
  path?: string;
}

/**
 * `BreadcrumbList` — é o que troca a URL crua pelo caminho navegável
 * ("Início › Coleção › Produto") no resultado de busca.
 */
export function breadcrumbJsonLd(crumbs: Crumb[], origin: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      ...(crumb.path ? { item: `${origin}${crumb.path}` } : {}),
    })),
  };
}

/**
 * `Organization` — entidade da marca, no layout raiz.
 *
 * `logo` aponta para a OG image gerada em `src/app/opengraph-image.tsx`,
 * que existe de verdade. Apontar para um arquivo inexistente seria pior
 * que omitir: o Google descarta a entidade inteira quando o logo dá 404.
 * Quando houver um arquivo de marca dedicado em `public/`, troque aqui.
 */
export function organizationJsonLd(origin: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Mari Beauty",
    url: origin,
    logo: `${origin}/opengraph-image`,
    description:
      "Perfumaria premium. Beauty is a lifestyle — fragrâncias selecionadas para realçar sua autenticidade.",
  };
}

/**
 * `WebSite` com `SearchAction` — habilita a caixa de busca da loja no
 * resultado do Google. O alvo é a mesma `/allProducts?q=` que o header já usa.
 */
export function webSiteJsonLd(origin: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Mari Beauty",
    url: origin,
    inLanguage: "pt-BR",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${origin}/allProducts?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}
