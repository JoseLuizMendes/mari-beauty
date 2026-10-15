/**
 * Mapa de coleções públicas.
 *
 * Este mapa virou fonte única porque o `sitemap.ts` precisa das mesmas
 * URLs que a página de coleção serve. O teste existe para garantir que a
 * dupla continue casando: slug sem página, ou página sem slug no mapa,
 * vira 404 anunciado ao Google.
 */

import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  COLLECTIONS,
  COLLECTION_SLUGS,
  getCollection,
} from "@/lib/products/domain/collections";

describe("COLLECTIONS", () => {
  it("expõe os slugs na mesma ordem do mapa", () => {
    expect(COLLECTION_SLUGS).toEqual(Object.keys(COLLECTIONS));
  });

  it("não tem `type` duplicado — dois slugs na mesma coluna duplicariam catálogo", () => {
    const types = COLLECTION_SLUGS.map((slug) => COLLECTIONS[slug].type);
    expect(new Set(types).size).toBe(types.length);
  });

  it("todo slug é URL-safe (vai para o sitemap como está)", () => {
    for (const slug of COLLECTION_SLUGS) {
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("existe a rota dinâmica que serve esses slugs", () => {
    const route = path.resolve(__dirname, "../app/collections/[slug]/page.tsx");
    expect(existsSync(route)).toBe(true);
  });
});

describe("getCollection", () => {
  it("resolve um slug conhecido", () => {
    expect(getCollection("essencia-noturna")).toMatchObject({
      type: "night",
      name: "Essência Noturna",
    });
  });

  it("devolve undefined em slug desconhecido — a página chama notFound()", () => {
    expect(getCollection("nao-existe")).toBeUndefined();
  });
});
