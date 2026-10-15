/**
 * Coleções públicas do catálogo.
 * ─────────────────────────────────────────────────────────────────────
 * Este mapa vivia dentro de `src/app/collections/[slug]/page.tsx`, o que
 * o tornava invisível para qualquer outro consumidor. O `sitemap.ts`
 * precisa exatamente desta lista para declarar as URLs de coleção ao
 * Google — e duas cópias da mesma lista divergem no primeiro dia em que
 * alguém adiciona uma coleção.
 *
 * Domain puro: nada de Prisma, nada de Next. O `slug` é a URL pública
 * (pt-BR, não renomear — ver `CLAUDE.md` raiz §7); o `type` é o valor
 * gravado na coluna `Product.collection`.
 */

export interface CollectionDefinition {
  /** Valor em `Product.collection`. */
  type: string;
  name: string;
  description: string;
}

export const COLLECTIONS: Record<string, CollectionDefinition> = {
  "essencia-noturna": {
    type: "night",
    name: "Essência Noturna",
    description: "Fragrâncias intensas e sedutoras para momentos especiais",
  },
  "elegancia-diurna": {
    type: "day",
    name: "Elegância Diurna",
    description: "Perfumes sofisticados para o dia a dia refinado",
  },
  "edicao-limitada": {
    type: "limited",
    name: "Edição Limitada",
    description: "Criações exclusivas em quantidades limitadas",
  },
};

/** Slugs de coleção, na ordem de exibição. */
export const COLLECTION_SLUGS = Object.keys(COLLECTIONS);

export function getCollection(slug: string): CollectionDefinition | undefined {
  return COLLECTIONS[slug];
}
