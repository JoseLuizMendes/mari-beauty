/**
 * /sobre — Sobre Mari Beauty
 */

import Link from "next/link";
import Image from "next/image";
import { Sparkles, Leaf, Heart, Award } from "lucide-react";

export const metadata = {
  title: "Sobre — Mari Beauty",
  description:
    "Conheça a história, a filosofia e os valores por trás da Mari Beauty.",
};

const VALORES = [
  {
    icon: Sparkles,
    title: "Curadoria autoral",
    description:
      "Cada fragrância é selecionada por Mari pessoalmente, depois de testes longos com perfumistas brasileiros independentes. Nada entra no catálogo apenas para encher a prateleira.",
  },
  {
    icon: Leaf,
    title: "Beleza consciente",
    description:
      "Embalagens recarregáveis, vidros reaproveitáveis e fórmulas livres de testes em animais. A elegância também se mede pelo que deixamos para trás.",
  },
  {
    icon: Heart,
    title: "Para mulheres reais",
    description:
      "Aroma é memória afetiva, ritual e identidade. Nossas fragrâncias são pensadas para acompanhar o dia inteiro de quem não quer escolher entre poder e delicadeza.",
  },
  {
    icon: Award,
    title: "Qualidade sem afobação",
    description:
      "Produção em pequenos lotes, envase artesanal, controle individual. Quando o frasco chega na sua casa, ele passou por seis pares de mãos cuidadosas.",
  },
];

export default function SobrePage() {
  return (
    <div className="bg-surface-base">
      {/* HERO */}
      <section className="bg-gradient-to-b from-brand-pink/30 to-surface-base py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 text-center">
          <p className="text-[11px] font-medium tracking-[0.32em] uppercase text-brand-wine mb-3">
            Mari Beauty
          </p>
          <h1 className="font-playfair italic text-4xl sm:text-5xl lg:text-6xl text-ink-strong mb-6 leading-tight">
            Beleza tem nome, história e propósito.
          </h1>
          <p className="text-base sm:text-lg text-ink-soft leading-relaxed max-w-2xl mx-auto">
            Mari Beauty nasceu da inquietação de uma mulher que cansou de
            produtos sem alma. Aqui, cada fragrância é uma carta de amor à
            mulher brasileira — feita com tempo, cuidado e a certeza de que
            beleza só existe quando faz sentido.
          </p>
        </div>
      </section>

      {/* HISTÓRIA */}
      <section className="py-16 sm:py-20 border-t border-border-subtle">
        <div className="max-w-4xl mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[140px_1fr] gap-8 lg:gap-12 items-start">
            <p className="text-[11px] font-medium tracking-[0.32em] uppercase text-brand-wine lg:pt-2">
              Nossa história
            </p>
            <div className="space-y-5 text-ink-soft leading-relaxed text-[15px]">
              <p>
                Tudo começou em 2023, num apartamento pequeno em São Paulo,
                quando Mari decidiu transformar a coleção pessoal de fragrâncias
                artesanais que vinha cultivando há anos numa marca aberta para
                outras mulheres. O primeiro perfume — uma composição de jasmim,
                baunilha e cedro — foi engarrafado à mão, rotulado com etiquetas
                impressas em casa e enviado para vinte amigas. Em três semanas,
                todas voltaram pedindo mais.
              </p>
              <p>
                O que era um experimento virou ofício. Mari estudou perfumaria
                fina, viajou para Grasse, conheceu produtores brasileiros de
                óleos essenciais e formou parceria com um laboratório familiar
                no interior de São Paulo que entendeu sua obsessão por
                fidelidade olfativa. Cada nova fragrância nasce dessa mesma
                lógica artesanal: muitos meses entre o primeiro esboço e o
                frasco final.
              </p>
              <p>
                Hoje, Mari Beauty atende mulheres em todo o Brasil, mas mantém o
                mesmo cuidado do primeiro lote: produção em pequena escala,
                relacionamento próximo com cada cliente e a recusa absoluta de
                lançar qualquer produto que não passe primeiro pela aprovação de
                uma única pessoa — a própria Mari.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* VALORES */}
      <section className="py-16 sm:py-20 bg-surface-panel">
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-12">
            <p className="text-[11px] font-medium tracking-[0.32em] uppercase text-brand-wine mb-3">
              No que acreditamos
            </p>
            <h2 className="font-playfair italic text-3xl sm:text-4xl text-ink-strong">
              Quatro princípios, nenhuma concessão.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
            {VALORES.map((v) => (
              <div
                key={v.title}
                className="bg-surface-base rounded-token-md p-6 sm:p-8"
              >
                <div className="w-11 h-11 rounded-full bg-brand-wine/10 flex items-center justify-center mb-4">
                  <v.icon className="h-5 w-5 text-brand-wine" />
                </div>
                <h3 className="font-playfair italic text-xl text-ink-strong mb-2">
                  {v.title}
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  {v.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FUNDADORA */}
      <section className="py-16 sm:py-20 border-t border-border-subtle">
        <div className="max-w-5xl mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/*
              Apontava para um JPG de fundadora que não existe no
              repositório — servia 404 nesta seção.

              O substituto é produto, não pessoa, **de propósito**: as únicas
              fotos de rosto disponíveis são geradas, e rosto gerado sob a
              legenda "Mari — fundadora" apresenta uma desconhecida como uma
              pessoa real e nomeada. Chegando a foto da Mari, troque o `src` e
              o `alt` aqui.
            */}
            <div className="relative aspect-[4/5] rounded-token-md overflow-hidden bg-brand-pink/40">
              <Image
                src="/assets/stitch/ritual-completo.jpg"
                alt="Produtos da linha Mari Beauty sobre bancada de mármore"
                fill
                sizes="(max-width: 1024px) 100vw, 480px"
                className="object-cover"
              />
            </div>
            <div>
              <p className="text-[11px] font-medium tracking-[0.32em] uppercase text-brand-wine mb-3">
                Quem está por trás
              </p>
              <h2 className="font-playfair italic text-3xl sm:text-4xl text-ink-strong mb-5 leading-tight">
                Mari — fundadora, perfumista e nariz da casa.
              </h2>
              <div className="space-y-4 text-ink-soft text-[15px] leading-relaxed">
                <p>
                  Formada em Química pela USP, com passagem pela escola de
                  perfumaria de Grasse, Mari construiu a marca em volta de uma
                  obsessão pessoal: a ideia de que cheiro é a forma mais íntima
                  de presença.
                </p>
                <p>
                  Ela ainda testa pessoalmente cada lote antes do envio, mantém
                  contato direto com clientes pelo WhatsApp da marca e publica,
                  uma vez por mês, uma carta sobre o processo criativo por trás
                  de cada fragrância.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-16 bg-brand-wine text-brand-pink">
        <div className="max-w-3xl mx-auto px-6 sm:px-8 text-center">
          <h2 className="font-playfair italic text-3xl sm:text-4xl mb-4">
            Descubra a fragrância que conta a sua história.
          </h2>
          <p className="text-sm text-brand-pink/80 mb-8 max-w-xl mx-auto">
            Nossas coleções foram pensadas para acompanhar mulheres em momentos
            específicos. Encontre a sua.
          </p>
          <Link
            href="/allProducts"
            className="inline-block px-8 py-3 bg-brand-pink text-brand-wine text-[11px] font-medium tracking-[0.18em] uppercase rounded-full hover:bg-brand-pink/90 transition-colors"
          >
            Conheça as coleções
          </Link>
        </div>
      </section>
    </div>
  );
}
