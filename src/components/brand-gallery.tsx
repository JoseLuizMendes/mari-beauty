"use client";

/**
 * BrandGallery — Belessence
 * Visual: carrossel editorial full-bleed, referência Byredo Campaign / MFK Lookbook
 * Posição: abaixo do Hero — aprofunda a identidade de marca antes de exibir produto
 * Stack: Embla Carousel + Autoplay (já no package.json)
 * Todas as cores via classes CSS — sem style={} com hardcoded values
 */

import { useRef, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ChevronLeft, ChevronRight } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

/**
 * Os frascos da galeria.
 *
 * ⚠️ Até 2026-10-15 esta lista apontava para sete arquivos JPG soltos em
 * assets/ que **não existem**. Não chegou a quebrar tela porque este
 * componente não é montado em lugar nenhum — só o teste o importa (ver
 * nota no fim deste bloco). Os arquivos reais são PNG com fundo removido,
 * em `/assets-removebg/`. Nada verificava referência de asset; agora
 * `src/test/asset-refs.test.ts` verifica.
 *
 * ⚠️ **Componente órfão.** Nenhuma página importa `BrandGallery`: a home
 * monta Hero, ParallaxStage, Features, TabbedProducts, MediaMosaic,
 * FeatureProducts, Testimonials e Newsletter, e nenhuma outra rota o usa.
 * Ou ele entra numa página, ou sai do repositório — ficar testado e não
 * renderizado é o pior dos dois mundos: custa manutenção e não entrega
 * nada. Não removi aqui porque é decisão de produto, não de limpeza.
 *
 * São seis, não sete: não existe `Perf6` em lugar nenhum do repositório. A
 * legenda órfã ("Vetiver & Musc") saiu junto, e os números foram corridos.
 * Chegando o arquivo, a entrada volta.
 */
const SLIDES = [
  {
    src: "/assets-removebg/Perf1.png",
    caption: "Essência Inaugural",
    label: "01",
  },
  { src: "/assets-removebg/Perf2.png", caption: "Notas de Ambar", label: "02" },
  {
    src: "/assets-removebg/Perf3.png",
    caption: "Silagem Prolongada",
    label: "03",
  },
  {
    src: "/assets-removebg/Perf4.png",
    caption: "Coração de Rosa",
    label: "04",
  },
  { src: "/assets-removebg/Perf5.png", caption: "Acorde Boisé", label: "05" },
  { src: "/assets-removebg/Perf7.png", caption: "Accord Ultime", label: "06" },
];

export default function BrandGallery() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start", dragFree: false },
    [
      Autoplay({
        delay: 4200,
        stopOnInteraction: true,
        stopOnMouseEnter: true,
      }),
    ],
  );

  // Navegação manual
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  // Pausar autoplay quando sai do viewport (acessibilidade + performance)
  useEffect(() => {
    const autoplay = emblaApi?.plugins()?.autoplay;
    if (!autoplay || !sectionRef.current) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) autoplay.play();
        else autoplay.stop();
      },
      { threshold: 0.2 },
    );
    obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, [emblaApi]);

  // Entrada scroll — heading fade-up
  useGSAP(
    () => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reduced || !headingRef.current) return;

      gsap.from(headingRef.current.children, {
        opacity: 0,
        y: 24,
        duration: 0.8,
        stagger: 0.12,
        ease: "power4.out",
        scrollTrigger: {
          trigger: headingRef.current,
          start: "top 85%",
        },
      });
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      aria-label="Galeria de campanha Mari Beauty"
      className="bg-surface-base py-20 md:py-28"
    >
      {/* Cabeçalho editorial */}
      <div
        ref={headingRef}
        className="container-belessence mb-10 md:mb-14 flex items-end justify-between"
      >
        <div>
          <p className="eyebrow mb-3 text-brand-gold">Campanha 2026</p>
          <h2 className="display-title text-ink-strong text-[clamp(1.75rem,4vw,3rem)]">
            A Arte do Perfume
          </h2>
        </div>

        {/* Controles de navegação */}
        <div className="flex gap-3">
          <button
            onClick={scrollPrev}
            aria-label="Imagem anterior"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-ink-muted/30 bg-transparent text-ink-soft transition-all hover:border-brand-gold hover:text-brand-gold"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={scrollNext}
            aria-label="Próxima imagem"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-ink-muted/30 bg-transparent text-ink-soft transition-all hover:border-brand-gold hover:text-brand-gold"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Trilho Embla */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4 pl-[max(1rem,calc((100vw-var(--container-belessence,1200px))/2))] pr-4 md:gap-5">
          {SLIDES.map((slide) => (
            <div
              key={slide.label}
              className="group relative shrink-0 overflow-hidden rounded-token-sm"
              style={{ flex: "0 0 min(72vw, 500px)" }}
            >
              {/* Imagem */}
              <div className="relative aspect-[3/4] overflow-hidden">
                <Image
                  src={slide.src}
                  alt={slide.caption}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  sizes="(max-width: 768px) 72vw, 500px"
                />

                {/* Overlay de identidade */}
                <div className="gradient-image-overlay" />

                {/* Legenda — aparece no hover, Byredo-style */}
                <div className="absolute bottom-0 left-0 right-0 translate-y-2 p-6 opacity-0 transition-all duration-400 group-hover:translate-y-0 group-hover:opacity-100">
                  <div className="flex items-end justify-between">
                    <span className="text-sm font-light tracking-[0.10em] text-surface-contrast">
                      {slide.caption}
                    </span>
                    <span className="font-playfair text-3xl font-light text-brand-gold-light opacity-60">
                      {slide.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Número do slide abaixo — sempre visível */}
              <div className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full bg-surface-base/80 backdrop-blur-sm">
                <span className="eyebrow text-[9px] text-ink-soft">
                  {slide.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dots de progresso — estético */}
      <div className="container-belessence mt-8 flex justify-center gap-2">
        {SLIDES.map((slide) => (
          <button
            key={slide.label}
            aria-label={`Ir para ${slide.caption}`}
            onClick={() => {
              const idx = SLIDES.findIndex((s) => s.label === slide.label);
              emblaApi?.scrollTo(idx);
            }}
            className="h-px w-8 cursor-pointer bg-ink-muted/30 transition-all hover:bg-brand-gold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-gold"
          />
        ))}
      </div>
    </section>
  );
}
