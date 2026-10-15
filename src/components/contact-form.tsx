"use client";

/**
 * ContactForm — usado em /contato
 * Envia para POST /api/contact (persiste em ContactMessage)
 * Validação client com Zod + react-hook-form + shadcn Form.
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  HoneypotField,
  HONEYPOT_FIELD_NAME,
} from "@/components/ui/honeypot-field";

const contactSchema = z.object({
  name: z.string().min(2, "Informe seu nome"),
  email: z.string().email("E-mail inválido"),
  subject: z.string().min(3, "Informe um assunto"),
  message: z.string().min(10, "Mensagem muito curta (mínimo 10 caracteres)"),
  // Honeypot: nunca validado no client — quem julga é o servidor.
  [HONEYPOT_FIELD_NAME]: z.string().optional(),
});

type ContactInput = z.infer<typeof contactSchema>;

const labelClasses =
  "text-[10px] font-medium tracking-[0.24em] uppercase text-ink-soft";

const inputClasses =
  "h-11 bg-surface-base text-sm border-border-subtle rounded-token-sm focus-visible:border-brand-wine focus-visible:ring-0";

export function ContactForm() {
  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });
  const {
    handleSubmit,
    register,
    reset,
    formState: { isSubmitting },
  } = form;

  const onSubmit = async (data: ContactInput) => {
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erro ao enviar mensagem");
      }

      toast.success("Mensagem enviada! Responderemos em breve.");
      reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao enviar mensagem",
      );
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <HoneypotField register={register(HONEYPOT_FIELD_NAME)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClasses}>Nome</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Seu nome"
                    className={inputClasses}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClasses}>Email</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="voce@exemplo.com"
                    className={inputClasses}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClasses}>Assunto</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Sobre o que gostaria de falar?"
                  className={inputClasses}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClasses}>Mensagem</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={6}
                  placeholder="Conte com calma. Responderemos pessoalmente."
                  className="bg-surface-base text-sm border-border-subtle rounded-token-sm focus-visible:border-brand-wine focus-visible:ring-0 resize-none"
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 bg-brand-wine text-brand-pink text-[11px] font-medium tracking-[0.18em] uppercase hover:bg-brand-wine/90"
        >
          {isSubmitting ? (
            <>
              <Spinner className="mr-2" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Enviar mensagem
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
