/**
 * Perfil paramétrico do frasco — Belessence
 * ─────────────────────────────────────────────────────────────────────
 * Spec: specs/001-frasco-3d-procedural/spec.md
 *
 * Um frasco de perfume vira DADO, não arquivo. O custo marginal do 11º
 * perfume é ~0 bytes: nenhum GLB para modelar, versionar ou baixar.
 *
 * Esta camada é `domain/`: números e regras puras, sem Three.js, sem React.
 * Quem transforma isto em malha é `components/bottle-3d/`.
 */

/** Frasco retangular (prisma com cantos arredondados) ou de revolução. */
export type BottlePreset = "slab" | "lathe";

export interface BottleGlass {
  /** Tom do vidro em hex. Vidro incolor é um branco levemente frio. */
  tint: string;
  /** 0 = espelho, 1 = fosco. Vidro de perfume vive perto de 0. */
  roughness: number;
  /** Espessura ótica da parede, em unidades do modelo. Alimenta a refração. */
  thickness: number;
  /** Índice de refração. Vidro ~1.5. */
  ior: number;
}

export interface BottleLiquid {
  color: string;
  /** 0 = vazio, 1 = cheio até a boca. */
  fillLevel: number;
}

export interface BottleCap {
  color: string;
  /** 0 = plástico fosco, 1 = metal polido. */
  metalness: number;
  roughness: number;
  /** Largura da tampa como fração da largura do corpo. */
  widthRatio: number;
  /** Altura da tampa como fração da LARGURA do corpo (não da altura). */
  heightRatio: number;
}

export interface BottleProfile {
  preset: BottlePreset;
  /** Altura do corpo como fração da largura. 1 = quadrado de frente. */
  heightRatio: number;
  /** Profundidade como fração da largura. Frasco "slab" é fino. */
  depthRatio: number;
  /** Raio do arredondamento das quinas, fração da largura. */
  cornerRadius: number;
  /** Espessura da parede de vidro, fração da largura. */
  wallThickness: number;
  /** Altura real em mm — só para rotular a cena, não afeta a malha. */
  heightMm: number;
  glass: BottleGlass;
  liquid: BottleLiquid;
  cap: BottleCap;
}

/**
 * Perfil derivado de `public/assets/hero1.png`.
 *
 * ⚠️ As PROPORÇÕES são estimativas visuais, não medidas. Tentei extrair a
 * silhueta por segmentação e o resultado foi inutilizável: reflexo na água,
 * cáusticas e o próprio vidro translúcido (que deixa o fundo aparecer)
 * confundem qualquer limiar de cor. Para um prisma retangular simples, o
 * olho acerta mais que o algoritmo.
 *
 * As CORES, essas sim, saíram da imagem por amostragem direta de pixel.
 *
 * Tudo aqui é ajustável ao vivo em `/_lab/bottle`. Ver §10 do spec: o perfil
 * definitivo de cada linha é decisão de marca, não de engenharia.
 */
export const HERO1_BOTTLE: BottleProfile = {
  preset: "slab",
  heightRatio: 0.9,
  depthRatio: 0.3,
  cornerRadius: 0.04,
  wallThickness: 0.088,
  heightMm: 95,
  glass: {
    tint: "#f2f6f5",
    roughness: 0.03,
    thickness: 0.9,
    ior: 1.5,
  },
  liquid: {
    // Amostrado no centro do líquido em hero1.png.
    color: "#dbb052",
    fillLevel: 0.81,
  },
  cap: {
    // Amostrado na tampa em hero1.png.
    color: "#0a0a0c",
    metalness: 0.35,
    roughness: 0.28,
    widthRatio: 0.325,
    heightRatio: 0.34,
  },
};

/**
 * Silhueta 2D do corpo, em coordenadas centradas na origem.
 *
 * Devolve os cantos de um retângulo de largura 1 e altura `heightRatio`,
 * já com o raio de arredondamento resolvido — é o que o `Shape` do Three
 * consome para o `ExtrudeGeometry`.
 *
 * Separado da camada de render porque é aritmética pura e, assim, testável
 * sem WebGL.
 */
export interface SlabOutline {
  width: number;
  height: number;
  radius: number;
  /** Cantos no sentido horário a partir do inferior-esquerdo. */
  corners: { x: number; y: number }[];
}

export function slabOutline(profile: BottleProfile): SlabOutline {
  const width = 1;
  const height = profile.heightRatio;
  // O raio não pode passar de metade do menor lado, senão o Shape se dobra.
  const radius = Math.min(profile.cornerRadius, width / 2, height / 2);

  const hw = width / 2;
  const hh = height / 2;

  return {
    width,
    height,
    radius,
    corners: [
      { x: -hw, y: -hh },
      { x: -hw, y: hh },
      { x: hw, y: hh },
      { x: hw, y: -hh },
    ],
  };
}

/**
 * Dimensões do volume de líquido.
 *
 * O líquido é uma cópia do corpo encolhida pela espessura da parede e
 * cortada na altura do nível. Encolher pelo dobro da espessura em cada eixo
 * é o que faz o líquido parecer *dentro* do vidro, e não colado nele.
 */
export function liquidDimensions(profile: BottleProfile) {
  const inset = profile.wallThickness * 2;
  const innerWidth = Math.max(0, 1 - inset);
  const innerHeight = Math.max(0, profile.heightRatio - inset);
  const innerDepth = Math.max(0, profile.depthRatio - inset);

  const height = innerHeight * clamp01(profile.liquid.fillLevel);
  // Assenta no fundo da cavidade: desce metade do vão não preenchido.
  const centerY = -(innerHeight - height) / 2;

  return { width: innerWidth, height, depth: innerDepth, centerY };
}

/** Posição e tamanho da tampa, derivados do corpo. */
export function capDimensions(profile: BottleProfile) {
  const width = profile.cap.widthRatio;
  const height = profile.cap.heightRatio;
  // Assenta exatamente no topo do corpo.
  const centerY = profile.heightRatio / 2 + height / 2;
  return { width, height, depth: width, centerY };
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}
