/**
 * Helper de imagem de produto.
 * ─────────────────────────────────────────────────────────────────────
 * Aceita tanto caminhos locais (`/assets-removebg/Perf1.png`) quanto URLs absolutas
 * (Cloudinary, etc.). Para URLs Cloudinary, anexa `f_auto,q_auto` na URL
 * se ainda não houver transformações, garantindo formato e qualidade
 * otimizados automaticamente.
 *
 * Use em todos os `<Image src={...}>` que renderizam `product.images[N]`.
 */

const CLOUDINARY_HOST = "res.cloudinary.com";

/** Retorna a URL pronta para `<Image src>`. */
export function productImageSrc(raw: string | undefined | null): string {
  if (!raw) return "/assets/placeholder.svg";
  const trimmed = raw.trim();
  if (!trimmed) return "/assets/placeholder.svg";

  // Caminho local — devolve como está.
  if (!trimmed.startsWith("http")) return trimmed;

  // URL Cloudinary sem transformações → injetar f_auto,q_auto
  try {
    const url = new URL(trimmed);
    if (url.hostname !== CLOUDINARY_HOST) return trimmed;

    // URLs Cloudinary têm o formato:
    // https://res.cloudinary.com/{cloud}/image/upload/{transformations?}/{public_id}.{ext}
    // Se entre /upload/ e o próximo segmento já houver transformações, mantém.
    const marker = "/image/upload/";
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return trimmed;

    const after = url.pathname.slice(idx + marker.length);
    const firstSegment = after.split("/")[0] ?? "";

    // Se o primeiro segmento já contém alguma transformação Cloudinary, não mexer.
    const hasTransform =
      /^(v\d+|[a-z]_[^/]+(,[a-z]_[^/]+)*)$/.test(firstSegment) &&
      firstSegment.includes("_");

    if (hasTransform) return trimmed;

    // Injetar transformações universais
    url.pathname =
      url.pathname.slice(0, idx + marker.length) + "f_auto,q_auto/" + after;
    return url.toString();
  } catch {
    return trimmed;
  }
}

/** Indica se a URL aponta para um asset hospedado no Cloudinary. */
export function isCloudinaryUrl(raw: string | undefined | null): boolean {
  if (!raw || !raw.trim().startsWith("http")) return false;
  try {
    return new URL(raw).hostname === CLOUDINARY_HOST;
  } catch {
    return false;
  }
}
