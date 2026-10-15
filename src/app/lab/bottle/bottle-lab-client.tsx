"use client";

/**
 * Laboratório do frasco 3D — fatia 1 do spec 001.
 *
 * Existe para responder UMA pergunta antes de investir no resto:
 * **parece vidro de verdade?**
 *
 * Os controles existem porque o perfil é decisão de marca, não de
 * engenharia (§10 do spec). Ajuste aqui até o frasco ficar com a cara da
 * linha e copie o JSON no fim da página.
 */

import dynamic from "next/dynamic";
import { useState } from "react";
import Image from "next/image";
import {
  HERO1_BOTTLE,
  type BottleProfile,
} from "@/lib/design/domain/bottle-profile";

// Carrega o Canvas só no client e sob demanda: three + drei não podem
// entrar no bundle de nenhuma página que não mostre o frasco.
const BottleViewer = dynamic(
  () =>
    import("@/components/bottle-3d/bottle-viewer").then((m) => m.BottleViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-ink-muted">
        carregando o visualizador…
      </div>
    ),
  },
);

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  hint?: string;
}

function Slider({ label, value, min, max, step, onChange, hint }: SliderProps) {
  return (
    <label className="block space-y-1">
      <span className="flex items-baseline justify-between text-xs">
        <span className="font-medium text-ink-strong">{label}</span>
        <span className="tabular-nums text-ink-muted">{value.toFixed(3)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-wine"
      />
      {hint ? (
        <span className="block text-[11px] text-ink-muted">{hint}</span>
      ) : null}
    </label>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span className="font-medium text-ink-strong">{label}</span>
      <span className="flex items-center gap-2">
        <code className="text-[11px] text-ink-muted">{value}</code>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-10 cursor-pointer rounded border border-border-subtle"
        />
      </span>
    </label>
  );
}

export function BottleLabClient() {
  const [profile, setProfile] = useState<BottleProfile>(HERO1_BOTTLE);
  const [showReference, setShowReference] = useState(true);

  const set = <K extends keyof BottleProfile>(
    key: K,
    value: BottleProfile[K],
  ) => setProfile((p) => ({ ...p, [key]: value }));

  const setGlass = (patch: Partial<BottleProfile["glass"]>) =>
    setProfile((p) => ({ ...p, glass: { ...p.glass, ...patch } }));
  const setLiquid = (patch: Partial<BottleProfile["liquid"]>) =>
    setProfile((p) => ({ ...p, liquid: { ...p.liquid, ...patch } }));
  const setCap = (patch: Partial<BottleProfile["cap"]>) =>
    setProfile((p) => ({ ...p, cap: { ...p.cap, ...patch } }));

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1fr_360px]">
      {/* ── Palco ─────────────────────────────────────────────────────── */}
      <div className="relative bg-[#0f5a58]">
        {showReference ? (
          <Image
            src="/assets/hero1.png"
            alt="Referência: foto do frasco em hero1.png"
            fill
            priority
            className="object-cover opacity-35"
          />
        ) : null}

        <div className="relative h-[60vh] lg:h-screen">
          <BottleViewer profile={profile} className="h-full w-full" />
        </div>

        <p className="absolute bottom-3 left-4 text-[11px] text-white/70">
          arraste para girar · referência em {showReference ? "35%" : "oculta"}
        </p>
      </div>

      {/* ── Controles ─────────────────────────────────────────────────── */}
      <aside className="space-y-5 overflow-y-auto border-l border-border-subtle bg-surface-base p-5 lg:h-screen">
        <header>
          <h1 className="text-lg font-semibold text-ink-strong">
            Laboratório do frasco
          </h1>
          <p className="mt-1 text-xs text-ink-muted">
            Spike da fatia 1 do spec 001. Ajuste até parecer a linha Mari Beauty
            e copie o JSON no fim.
          </p>
        </header>

        <label className="flex items-center gap-2 text-xs text-ink-strong">
          <input
            type="checkbox"
            checked={showReference}
            onChange={(e) => setShowReference(e.target.checked)}
          />
          Mostrar a foto de referência atrás
        </label>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Forma
          </h2>
          <Slider
            label="Altura / largura"
            value={profile.heightRatio}
            min={0.4}
            max={2}
            step={0.01}
            onChange={(v) => set("heightRatio", v)}
            hint="1,0 = quadrado de frente"
          />
          <Slider
            label="Profundidade / largura"
            value={profile.depthRatio}
            min={0.1}
            max={1}
            step={0.01}
            onChange={(v) => set("depthRatio", v)}
            hint="frasco slab é fino — por volta de 0,3"
          />
          <Slider
            label="Raio das quinas"
            value={profile.cornerRadius}
            min={0}
            max={0.3}
            step={0.005}
            onChange={(v) => set("cornerRadius", v)}
          />
          <Slider
            label="Espessura da parede"
            value={profile.wallThickness}
            min={0.01}
            max={0.25}
            step={0.004}
            onChange={(v) => set("wallThickness", v)}
            hint="é o que afasta o líquido do vidro"
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Vidro
          </h2>
          <ColorInput
            label="Tom"
            value={profile.glass.tint}
            onChange={(tint) => setGlass({ tint })}
          />
          <Slider
            label="Rugosidade"
            value={profile.glass.roughness}
            min={0}
            max={0.5}
            step={0.005}
            onChange={(roughness) => setGlass({ roughness })}
            hint="acima de ~0,15 vira vidro jateado"
          />
          <Slider
            label="Espessura ótica"
            value={profile.glass.thickness}
            min={0}
            max={3}
            step={0.05}
            onChange={(thickness) => setGlass({ thickness })}
            hint="quanto a refração distorce o que está atrás"
          />
          <Slider
            label="Índice de refração"
            value={profile.glass.ior}
            min={1}
            max={2.4}
            step={0.01}
            onChange={(ior) => setGlass({ ior })}
            hint="vidro ≈ 1,5 · água ≈ 1,33 · diamante ≈ 2,4"
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Líquido
          </h2>
          <ColorInput
            label="Cor"
            value={profile.liquid.color}
            onChange={(color) => setLiquid({ color })}
          />
          <Slider
            label="Nível"
            value={profile.liquid.fillLevel}
            min={0}
            max={1}
            step={0.01}
            onChange={(fillLevel) => setLiquid({ fillLevel })}
            hint="deixar um vão de ar no topo vende a ilusão"
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Tampa
          </h2>
          <ColorInput
            label="Cor"
            value={profile.cap.color}
            onChange={(color) => setCap({ color })}
          />
          <Slider
            label="Largura"
            value={profile.cap.widthRatio}
            min={0.1}
            max={0.9}
            step={0.005}
            onChange={(widthRatio) => setCap({ widthRatio })}
          />
          <Slider
            label="Altura"
            value={profile.cap.heightRatio}
            min={0.05}
            max={0.8}
            step={0.005}
            onChange={(heightRatio) => setCap({ heightRatio })}
          />
          <Slider
            label="Metalicidade"
            value={profile.cap.metalness}
            min={0}
            max={1}
            step={0.01}
            onChange={(metalness) => setCap({ metalness })}
          />
          <Slider
            label="Rugosidade"
            value={profile.cap.roughness}
            min={0}
            max={1}
            step={0.01}
            onChange={(roughness) => setCap({ roughness })}
          />
        </section>

        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Perfil resultante
          </h2>
          <p className="text-[11px] text-ink-muted">
            Cole na §10 do spec, ou no campo <code>bottle3d</code> do produto.
          </p>
          <textarea
            readOnly
            value={JSON.stringify(profile, null, 2)}
            rows={14}
            className="w-full rounded border border-border-subtle bg-surface-panel p-2 font-mono text-[10px] text-ink-strong"
          />
          <button
            type="button"
            onClick={() => setProfile(HERO1_BOTTLE)}
            className="w-full rounded border border-border-strong px-3 py-1.5 text-xs text-ink-strong hover:bg-surface-section"
          >
            Voltar ao perfil da hero1.png
          </button>
        </section>
      </aside>
    </div>
  );
}
