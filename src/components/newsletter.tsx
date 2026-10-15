"use client";

/**
 * Newsletter — Belessence (estilo Stitch / "Beauty is a Lifestyle")
 * ─────────────────────────────────────────────────────────────────────
 * Layout split: imagem editorial à esquerda + CTA + form newsletter à direita
 * Tipografia: serif italic display, copy minimalista
 */

import { useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowRight } from "lucide-react";
import {
  scrollReveal,
  prefersReducedMotion,
} from "@/lib/motion/presentation/gsap-helpers";
import { MediaBackground } from "@/components/ui/media-background";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  HoneypotField,
  HONEYPOT_FIELD_NAME,
} from "@/components/ui/honeypot-field";

const newsletterSchema = z.object({
  email: z
    .string()
    .min(1, "E-mail obrigatório")
    .email("Informe um e-mail válido"),
  // Honeypot: nunca validado no client — quem julga é o servidor.
  [HONEYPOT_FIELD_NAME]: z.string().optional(),
});

type NewsletterForm = z.infer<typeof newsletterSchema>;

export default function Newsletter() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const delicateRef = useRef<HTMLSpanElement>(null);

  const form = useForm<NewsletterForm>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: { email: "" },
  });
  const {
    handleSubmit,
    register,
    reset,
    formState: { isSubmitting },
  } = form;

  useGSAP(
    () => {
      // Só o conteúdo (texto/form) anima. A imagem fica estática + .gpu-layer.
      if (contentRef.current) {
        scrollReveal(Array.from(contentRef.current.children), {
          trigger: contentRef.current,
          y: 26,
          stagger: 0.1,
          start: "top 82%",
        });

        // Animação "Perfume Mist" — bidirecional (condensa ao descer, dissolve ao subir)
        if (delicateRef.current) {
          if (prefersReducedMotion()) {
            gsap.set(delicateRef.current, {
              opacity: 1,
              filter: "blur(0px)",
              scale: 1,
            });
          } else {
            gsap.fromTo(
              delicateRef.current,
              {
                opacity: 0,
                filter: "blur(18px)",
                scale: 1.12,
              },
              {
                opacity: 1,
                filter: "blur(0px)",
                scale: 1,
                duration: 1.8,
                delay: 0.3,
                ease: "power4.out",
                immediateRender: false,
                scrollTrigger: {
                  trigger: contentRef.current,
                  start: "top 82%",
                  toggleActions: "play none none reverse",
                },
              },
            );
          }
        }
      }
    },
    { scope: sectionRef },
  );

  const onSubmit = async (data: NewsletterForm) => {
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          [HONEYPOT_FIELD_NAME]: data[HONEYPOT_FIELD_NAME],
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error ?? "Erro ao inscrever");
        return;
      }

      if (result.alreadySubscribed) {
        toast.info(result.message ?? "Você já está inscrita!");
      } else {
        toast.success("Inscrição confirmada!", {
          description:
            result.message ??
            `${data.email} receberá nossas novidades em breve.`,
        });
      }
      reset();
    } catch {
      toast.error("Erro ao inscrever", {
        description: "Tente novamente em instantes.",
      });
    }
  };

  return (
    <section
      ref={sectionRef}
      className="relative py-16 sm:py-24 md:py-32 bg-surface-section overflow-hidden"
    >
      <div className="container-belessence">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center rounded-token-2xl bg-surface-panel p-6 shadow-card sm:p-10 lg:p-14">
          {/* Vídeo editorial à esquerda (upload "news-letter") */}
          <div className="relative w-full max-w-xs sm:max-w-sm mx-auto md:mx-0 aspect-square overflow-hidden rounded-token-2xl">
            <MediaBackground
              src="/assets/inspiration/news-letter.mp4"
              type="video"
              alt=""
              className="gpu-layer"
              overlayClassName="bg-gradient-to-tr from-brand-wine/15 to-transparent"
            />
          </div>

          {/* Conteúdo à direita */}
          <div ref={contentRef} className="max-w-lg">
            {/* Título italic display */}
            <h2 className="font-playfair italic text-[clamp(2.4rem,6vw,4rem)] leading-[1.04] tracking-[-0.02em] text-ink-strong mb-6">
              Our{" "}
              <span
                ref={delicateRef}
                className="text-brand-wine-soft inline-block"
              >
                Delicate
              </span>
              <br className="hidden sm:block" /> Point of View.
            </h2>

            {/* Eyebrow */}
            <p className="text-[11px] font-medium tracking-[0.32em] uppercase text-brand-wine mb-5">
              Beauty is a lifestyle.
            </p>
            {/* Divider */}
            <div className="h-px w-12 bg-brand-wine/60 mb-6" />

            {/* Corpo */}
            <p className="mb-8 text-base leading-relaxed text-ink-soft font-light max-w-md">
              Receba lançamentos exclusivos, rituais e curadorias diretamente no
              seu e-mail. Faça parte da nossa comunidade de beleza autêntica.
            </p>

            {/* Form */}
            <Form {...form}>
              <form
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="flex flex-col gap-3"
              >
                <HoneypotField register={register(HONEYPOT_FIELD_NAME)} />
                <div className="flex flex-col sm:flex-row gap-3">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field, fieldState }) => (
                      <FormItem className="flex-1 gap-1">
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Seu melhor e-mail"
                            aria-label="E-mail para newsletter"
                            {...field}
                            className={`h-12 bg-surface-base text-sm text-ink-strong placeholder:text-ink-muted border-border-subtle rounded-full px-5 focus-visible:border-brand-wine focus-visible:ring-0 transition-colors${fieldState.error ? " border-destructive" : ""}`}
                          />
                        </FormControl>
                        <FormMessage className="text-left text-xs" />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="loreal-btn-pill flex h-12 items-center justify-center gap-2 whitespace-nowrap border-none bg-brand-wine px-7 text-xs font-medium tracking-[0.18em] uppercase text-brand-pink transition-all hover:bg-brand-wine/90"
                  >
                    {isSubmitting ? (
                      "Enviando..."
                    ) : (
                      <>
                        Inscrever
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>

            <p className="mt-5 text-xs leading-relaxed text-ink-muted">
              Ao se inscrever, você concorda com nossa política de privacidade.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
