/**
 * MediaBackground — Belessence
 * ─────────────────────────────────────────────────────────────────────
 * Fundo de mídia agnóstico: renderiza <video> OU <Image> conforme `type`.
 * Server-capable (não usa estado/efeito) — o autoplay do vídeo é dirigido
 * por atributos, sem JS. Comece com imagens; troque `type="video"` quando
 * os arquivos existirem.
 *
 * Uso:
 *   <MediaBackground src="/assets/hero1.png" alt="..." />
 *   <MediaBackground type="video" src="/assets/inspiration/news-letter.mp4" poster="/assets/hero1.png" alt="..." />
 */

import Image from "next/image";
import { cn } from "@/shadcn-utils/utils";

export type MediaType = "image" | "video";

export interface MediaBackgroundProps {
  src: string;
  type?: MediaType;
  /** Poster do vídeo (imagem exibida antes do play). Ignorado para imagens. */
  poster?: string;
  /** Obrigatório para imagens (a11y). Vídeo decorativo pode usar "". */
  alt?: string;
  /** Classe extra no elemento de mídia. */
  className?: string;
  /** Overlay opcional sobre a mídia (ex.: "gradient-image-overlay"). */
  overlayClassName?: string;
  /** Repasse p/ next/image — prioriza na LCP (hero). */
  priority?: boolean;
  /** Repasse p/ next/image. */
  sizes?: string;
}

export function MediaBackground({
  src,
  type = "image",
  poster,
  alt = "",
  className,
  overlayClassName,
  priority = false,
  sizes = "100vw",
}: MediaBackgroundProps) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {type === "video" ? (
        <video
          className={cn("h-full w-full object-cover", className)}
          src={src}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden={alt === "" ? true : undefined}
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className={cn("object-cover", className)}
        />
      )}

      {overlayClassName && (
        <div className={cn("absolute inset-0", overlayClassName)} aria-hidden />
      )}
    </div>
  );
}

export default MediaBackground;
