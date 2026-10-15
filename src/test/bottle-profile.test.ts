/**
 * Testes do perfil paramétrico do frasco.
 *
 * A geometria mora em `domain/` justamente para poder ser testada sem
 * WebGL: é aritmética, não render. O que o teste protege são as invariantes
 * que, quebradas, produzem um frasco visivelmente errado — líquido
 * atravessando o vidro, tampa flutuando, Shape dobrado sobre si mesmo.
 */

import { describe, it, expect } from "vitest";
import {
  HERO1_BOTTLE,
  capDimensions,
  liquidDimensions,
  slabOutline,
  type BottleProfile,
} from "@/lib/design/domain/bottle-profile";

const base: BottleProfile = HERO1_BOTTLE;

describe("slabOutline", () => {
  it("devolve um retângulo centrado na origem", () => {
    const { corners, width, height } = slabOutline(base);

    expect(width).toBe(1);
    expect(height).toBe(base.heightRatio);

    const xs = corners.map((c) => c.x);
    const ys = corners.map((c) => c.y);
    // Centrado: a soma dos extremos é zero nos dois eixos.
    expect(Math.min(...xs) + Math.max(...xs)).toBeCloseTo(0);
    expect(Math.min(...ys) + Math.max(...ys)).toBeCloseTo(0);
  });

  it("limita o raio a metade do menor lado", () => {
    // Raio absurdo: sem o clamp, o Shape do Three se dobra sobre si mesmo
    // e a extrusão sai com faces invertidas.
    const exagerado = { ...base, cornerRadius: 10, heightRatio: 0.4 };
    expect(slabOutline(exagerado).radius).toBe(0.2);
  });

  it("aceita raio zero (quina viva)", () => {
    expect(slabOutline({ ...base, cornerRadius: 0 }).radius).toBe(0);
  });
});

describe("liquidDimensions", () => {
  it("mantém o líquido dentro da cavidade de vidro", () => {
    const l = liquidDimensions(base);
    const inset = base.wallThickness * 2;

    expect(l.width).toBeCloseTo(1 - inset);
    expect(l.depth).toBeCloseTo(base.depthRatio - inset);
    expect(l.width).toBeLessThan(1);
  });

  it("escala a altura pelo nível de preenchimento", () => {
    const cheio = liquidDimensions({
      ...base,
      liquid: { ...base.liquid, fillLevel: 1 },
    });
    const meio = liquidDimensions({
      ...base,
      liquid: { ...base.liquid, fillLevel: 0.5 },
    });

    expect(meio.height).toBeCloseTo(cheio.height / 2);
  });

  it("assenta o líquido no fundo, não no centro", () => {
    const meio = liquidDimensions({
      ...base,
      liquid: { ...base.liquid, fillLevel: 0.5 },
    });
    // Meio cheio, o centro do volume fica ABAIXO do centro da cavidade.
    expect(meio.centerY).toBeLessThan(0);
  });

  it("com o frasco cheio, o líquido fica centrado na cavidade", () => {
    const cheio = liquidDimensions({
      ...base,
      liquid: { ...base.liquid, fillLevel: 1 },
    });
    expect(cheio.centerY).toBeCloseTo(0);
  });

  it("some quando o nível é zero", () => {
    const vazio = liquidDimensions({
      ...base,
      liquid: { ...base.liquid, fillLevel: 0 },
    });
    expect(vazio.height).toBe(0);
  });

  it("satura nível fora de 0..1 em vez de produzir malha inválida", () => {
    const acima = liquidDimensions({
      ...base,
      liquid: { ...base.liquid, fillLevel: 5 },
    });
    const cheio = liquidDimensions({
      ...base,
      liquid: { ...base.liquid, fillLevel: 1 },
    });
    expect(acima.height).toBeCloseTo(cheio.height);

    const abaixo = liquidDimensions({
      ...base,
      liquid: { ...base.liquid, fillLevel: -3 },
    });
    expect(abaixo.height).toBe(0);
  });

  it("nunca devolve dimensão negativa com parede absurda", () => {
    // Parede mais grossa que o frasco: cavidade deixa de existir, mas a
    // malha precisa continuar válida (zero, não negativo).
    const l = liquidDimensions({ ...base, wallThickness: 5 });
    expect(l.width).toBe(0);
    expect(l.height).toBe(0);
    expect(l.depth).toBe(0);
  });
});

describe("capDimensions", () => {
  it("assenta a tampa exatamente no topo do corpo", () => {
    const cap = capDimensions(base);
    const topoDoCorpo = base.heightRatio / 2;
    const baseDaTampa = cap.centerY - cap.height / 2;

    expect(baseDaTampa).toBeCloseTo(topoDoCorpo);
  });

  it("acompanha o corpo quando a altura dele muda", () => {
    const alto = capDimensions({ ...base, heightRatio: 2 });
    const baixo = capDimensions({ ...base, heightRatio: 0.5 });
    expect(alto.centerY).toBeGreaterThan(baixo.centerY);
  });

  it("é mais estreita que o corpo no perfil da hero1", () => {
    expect(capDimensions(base).width).toBeLessThan(1);
  });
});

describe("HERO1_BOTTLE — sanidade do perfil padrão", () => {
  it("tem proporções fisicamente plausíveis", () => {
    expect(HERO1_BOTTLE.heightRatio).toBeGreaterThan(0);
    expect(HERO1_BOTTLE.depthRatio).toBeGreaterThan(0);
    // Frasco "slab" é mais fino que largo — se não for, não é slab.
    expect(HERO1_BOTTLE.depthRatio).toBeLessThan(1);
    expect(HERO1_BOTTLE.wallThickness).toBeLessThan(0.5);
  });

  it("deixa um vão de ar no topo", () => {
    // É o detalhe que faz o líquido parecer líquido. Cheio até a boca
    // parece um bloco colorido.
    expect(HERO1_BOTTLE.liquid.fillLevel).toBeLessThan(1);
    expect(HERO1_BOTTLE.liquid.fillLevel).toBeGreaterThan(0.5);
  });

  it("usa índice de refração de vidro", () => {
    expect(HERO1_BOTTLE.glass.ior).toBeCloseTo(1.5, 1);
  });

  it("produz uma cavidade utilizável", () => {
    const l = liquidDimensions(HERO1_BOTTLE);
    expect(l.width).toBeGreaterThan(0.5);
    expect(l.height).toBeGreaterThan(0);
  });
});
