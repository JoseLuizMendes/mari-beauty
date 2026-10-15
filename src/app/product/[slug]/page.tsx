/**
 * ProductPage — Server Component (estilo Stitch / PDP)
 * Background bg-brand-pink, layout container-belessence, padding top maior.
 */

import Header from "@/components/header";
import Footer from "@/components/footer";
import ProductDetailsClient from "@/components/product-details-client";
import {
  getProductBySlug,
  getFeaturedProducts,
} from "@/lib/products/infrastructure/persistence/products-repository";
import { ProductCard } from "@/components/product-card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Product } from "@/lib/products/infrastructure/persistence/products-repository";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd, productJsonLd } from "@/lib/seo/domain/json-ld";
import { siteUrl } from "@/lib/seo/infrastructure/site-url";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produto não encontrado" };
  return {
    title: product.name,
    description: product.shortDescription,
    // Canonical explícito: a PDP é alcançável por link de coleção, de
    // busca e de "você também vai amar". Sem isto o Google escolhe sozinho
    // qual variante indexar.
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.name,
      description: product.shortDescription,
      url: `/product/${product.slug}`,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, relatedProducts] = await Promise.all([
    getProductBySlug(slug),
    getFeaturedProducts(4),
  ]);

  if (!product) notFound();

  const origin = siteUrl();

  return (
    <div className="min-h-screen bg-brand-pink flex flex-col">
      {/* Preço, disponibilidade e estrelas no resultado de busca */}
      <JsonLd
        data={[
          productJsonLd(product, origin),
          breadcrumbJsonLd(
            [
              { name: "Início", path: "/" },
              { name: "Coleção", path: "/allProducts" },
              { name: product.name },
            ],
            origin,
          ),
        ]}
      />
      <Header />

      <main className="flex-1 pt-24 sm:pt-28 pb-16 sm:pb-24">
        <div className="container-belessence">
          {/* Breadcrumb */}
          <Breadcrumb className="mb-6 sm:mb-8">
            <BreadcrumbList className="text-[10px] tracking-[0.18em] uppercase">
              <BreadcrumbItem>
                <BreadcrumbLink
                  asChild
                  className="text-ink-soft hover:text-brand-wine"
                >
                  <Link href="/">Início</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink
                  asChild
                  className="text-ink-soft hover:text-brand-wine"
                >
                  <Link href="/allProducts">Coleção</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-ink-strong normal-case tracking-normal text-xs">
                  {product.name}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <ProductDetailsClient product={product} />
        </div>
      </main>

      {/* "Você Também Vai Amar" */}
      <section className="bg-surface-base py-16 sm:py-24">
        <div className="container-belessence">
          <div className="text-center mb-12">
            <p className="text-[11px] font-medium tracking-[0.32em] uppercase text-brand-wine mb-4">
              Combinações perfeitas
            </p>
            <h2 className="font-playfair italic text-[clamp(1.8rem,4vw,2.8rem)] leading-tight tracking-[-0.02em] text-ink-strong">
              Você Também Vai Amar
            </h2>
            <div className="mx-auto mt-5 h-px w-12 bg-brand-wine/60" />
          </div>

          <FeatureProductsInline products={relatedProducts} />
        </div>
      </section>

      <Footer />
    </div>
  );
}

// Grid "Você Também Vai Amar" — reusa <ProductCard> compartilhado.
function FeatureProductsInline({ products }: { products: Product[] }) {
  const displayProducts = products.slice(0, 4);
  if (displayProducts.length === 0) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {displayProducts.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          sizes="(max-width: 768px) 50vw, 280px"
        />
      ))}
    </div>
  );
}
