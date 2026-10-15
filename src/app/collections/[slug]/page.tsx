/**
 * CollectionPage — Server Component (estilo Stitch / PLP)
 * Mesmo layout da /allProducts mas focado em uma coleção específica.
 */

import Header from "@/components/header";
import Footer from "@/components/footer";
import ProductsGrid from "@/components/products-grid";
import { getProductsByCollection } from "@/lib/products/infrastructure/persistence/products-repository";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCollection } from "@/lib/products/domain/collections";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd } from "@/lib/seo/domain/json-ld";
import { siteUrl } from "@/lib/seo/infrastructure/site-url";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) return { title: "Coleção não encontrada" };
  return {
    title: collection.name,
    description: collection.description,
    alternates: { canonical: `/collections/${slug}` },
    openGraph: {
      type: "website",
      title: collection.name,
      description: collection.description,
      url: `/collections/${slug}`,
    },
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = getCollection(slug);

  if (!collection) notFound();

  const products = await getProductsByCollection(collection.type);

  return (
    <div className="min-h-screen bg-brand-pink flex flex-col">
      <JsonLd
        data={breadcrumbJsonLd(
          [
            { name: "Início", path: "/" },
            { name: "Coleção", path: "/allProducts" },
            { name: collection.name },
          ],
          siteUrl(),
        )}
      />
      <Header />

      <main className="flex-1 pt-24 sm:pt-28 pb-16 sm:pb-24">
        <div className="container-belessence">
          {/* Hero da coleção */}
          <div className="text-center mb-12 sm:mb-16">
            <p className="text-[11px] font-medium tracking-[0.32em] uppercase text-brand-wine mb-4">
              Coleção exclusiva
            </p>
            <h1 className="font-playfair italic text-[clamp(2.4rem,6vw,4.4rem)] leading-[1.04] tracking-[-0.02em] text-ink-strong mb-5">
              {collection.name}
            </h1>
            <p className="max-w-2xl mx-auto text-sm sm:text-base text-ink-soft leading-relaxed font-light">
              {collection.description}
            </p>
            <div className="mx-auto mt-6 h-px w-12 bg-brand-wine/60" />
          </div>

          {products.length > 0 ? (
            <ProductsGrid products={products} />
          ) : (
            <div className="text-center py-20">
              <p className="text-ink-soft mb-6">
                Nenhuma fragrância disponível nesta coleção ainda.
              </p>
              <Button
                asChild
                variant="outline"
                className="border-brand-wine text-brand-wine hover:bg-brand-wine hover:text-brand-pink"
              >
                <Link href="/allProducts">Ver todas as fragrâncias</Link>
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
