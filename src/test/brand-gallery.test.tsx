/**
 * Testes — BrandGallery
 * Foco: heading editorial, 6 slides com captions, controles de navegação,
 * dots, chamadas em emblaApi quando clica em prev/next/dot.
 *
 * Mocks:
 *  - embla-carousel-react (useEmblaCarousel) — retorna ref + api spy
 *  - embla-carousel-autoplay — factory neutra
 *  - next/image — img
 *  - IntersectionObserver — stub global
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ImgHTMLAttributes } from "react";

const { scrollPrev, scrollNext, scrollTo, plugins } = vi.hoisted(() => ({
  scrollPrev: vi.fn(),
  scrollNext: vi.fn(),
  scrollTo: vi.fn(),
  plugins: vi.fn(() => ({
    autoplay: { play: vi.fn(), stop: vi.fn() },
  })),
}));

vi.mock("embla-carousel-react", () => ({
  default: () => [
    vi.fn(), // emblaRef (callback)
    { scrollPrev, scrollNext, scrollTo, plugins }, // emblaApi
  ],
}));

vi.mock("embla-carousel-autoplay", () => ({
  default: () => () => ({ name: "autoplay" }),
}));

vi.mock("next/image", () => ({
  default: (
    props: ImgHTMLAttributes<HTMLImageElement> & {
      fill?: boolean;
      priority?: boolean;
    },
  ) => {
    const { fill: _fill, priority: _priority, ...rest } = props;
    void _fill;
    void _priority;
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...rest} alt={rest.alt ?? ""} />;
  },
}));

// IntersectionObserver é stub'ado globalmente em src/test/setup.ts.

import BrandGallery from "@/components/brand-gallery";

describe("BrandGallery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza heading 'A Arte do Perfume' e eyebrow 'Campanha 2026'", () => {
    render(<BrandGallery />);
    expect(
      screen.getByRole("heading", { name: /a arte do perfume/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/campanha 2026/i)).toBeInTheDocument();
  });

  it("renderiza 6 slides com captions específicos", () => {
    render(<BrandGallery />);
    const captions = [
      /essência inaugural/i,
      /notas de ambar/i,
      /silagem prolongada/i,
      /coração de rosa/i,
      /acorde boisé/i,
      /accord ultime/i,
    ];
    for (const c of captions) {
      expect(screen.getByText(c)).toBeInTheDocument();
    }
  });

  it("não renderiza o slide órfão 'Vetiver & Musc'", () => {
    // Era o 06 e apontava para um arquivo que nunca existiu no repositório.
    // Chegando a imagem, a entrada volta à galeria e este teste sai.
    render(<BrandGallery />);
    expect(screen.queryByText(/vetiver & musc/i)).not.toBeInTheDocument();
  });

  it("renderiza controles de navegação 'Imagem anterior' e 'Próxima'", () => {
    render(<BrandGallery />);
    expect(
      screen.getByRole("button", { name: /imagem anterior/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /próxima imagem/i }),
    ).toBeInTheDocument();
  });

  it("clicar em 'Próxima imagem' chama emblaApi.scrollNext", async () => {
    const user = userEvent.setup();
    render(<BrandGallery />);
    await user.click(screen.getByRole("button", { name: /próxima imagem/i }));
    expect(scrollNext).toHaveBeenCalledOnce();
  });

  it("clicar em 'Imagem anterior' chama emblaApi.scrollPrev", async () => {
    const user = userEvent.setup();
    render(<BrandGallery />);
    await user.click(screen.getByRole("button", { name: /imagem anterior/i }));
    expect(scrollPrev).toHaveBeenCalledOnce();
  });

  it("renderiza 6 dots com aria-label 'Ir para <caption>'", () => {
    render(<BrandGallery />);
    expect(
      screen.getByRole("button", { name: /ir para essência inaugural/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /ir para accord ultime/i }),
    ).toBeInTheDocument();
  });

  it("clicar num dot chama emblaApi.scrollTo com o índice correto", async () => {
    const user = userEvent.setup();
    render(<BrandGallery />);
    // 5º dot (index 4) → "Acorde Boisé"
    await user.click(
      screen.getByRole("button", { name: /ir para acorde boisé/i }),
    );
    expect(scrollTo).toHaveBeenCalledWith(4);
  });
});
