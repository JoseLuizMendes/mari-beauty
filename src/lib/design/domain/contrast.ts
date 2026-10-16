/**
 * Contraste WCAG — aritmética pura.
 * ─────────────────────────────────────────────────────────────────────
 * Existe porque a auditoria (item 5) encontrou 167 tokens de cor e
 * **nenhuma checagem**. Paleta sem verificação de contraste é promessa de
 * acessibilidade sem prova — e o custo de descobrir tarde é alto: ou se
 * muda a paleta depois de a marca estar aplicada em dezenas de
 * componentes, ou se convive com texto que parte dos clientes não lê.
 *
 * A fórmula é a da WCAG 2.1, §1.4.3 (contrast minimum):
 *   - luminância relativa por canal, com a correção de gama sRGB;
 *   - razão (L_claro + 0,05) / (L_escuro + 0,05), de 1:1 a 21:1.
 *
 * Os limiares do nível AA:
 *   - texto normal  → 4,5:1
 *   - texto grande  → 3:1   (≥24px, ou ≥18,66px em negrito)
 *   - componente/UI → 3:1   (bordas, ícones, estados de foco)
 */

/** Limiares do nível AA da WCAG 2.1. */
export const AA = {
  textoNormal: 4.5,
  textoGrande: 3,
  componente: 3,
} as const;

export type NivelAA = keyof typeof AA;

/** `#RGB`, `#RRGGBB` ou `#RRGGBBAA` → canais 0–255. Alfa é ignorado. */
export function hexParaRgb(hex: string): [number, number, number] | null {
  const limpo = hex.trim().replace(/^#/, "");
  const expandido =
    limpo.length === 3 || limpo.length === 4
      ? limpo
          .slice(0, 3)
          .split("")
          .map((c) => c + c)
          .join("")
      : limpo.slice(0, 6);

  if (!/^[0-9a-fA-F]{6}$/.test(expandido)) return null;

  return [
    parseInt(expandido.slice(0, 2), 16),
    parseInt(expandido.slice(2, 4), 16),
    parseInt(expandido.slice(4, 6), 16),
  ];
}

/**
 * Luminância relativa (WCAG 2.1).
 *
 * A correção de gama não é detalhe: usar o canal cru dá um número
 * plausível e errado, e o erro é maior justamente nos tons médios — que
 * são onde ficam os casos duvidosos.
 */
export function luminancia([r, g, b]: [number, number, number]): number {
  const canal = (v: number): number => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/** Razão de contraste entre duas cores, de 1 a 21. A ordem não importa. */
export function razaoDeContraste(hexA: string, hexB: string): number | null {
  const a = hexParaRgb(hexA);
  const b = hexParaRgb(hexB);
  if (!a || !b) return null;

  const la = luminancia(a);
  const lb = luminancia(b);
  const claro = Math.max(la, lb);
  const escuro = Math.min(la, lb);

  return (claro + 0.05) / (escuro + 0.05);
}

/** A razão passa no limiar do nível pedido? */
export function passaAA(
  razao: number,
  nivel: NivelAA = "textoNormal",
): boolean {
  return razao >= AA[nivel];
}

/** Arredonda para duas casas, como as ferramentas de acessibilidade exibem. */
export function formatarRazao(razao: number): string {
  return `${razao.toFixed(2)}:1`;
}
