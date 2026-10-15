"use client";

/**
 * Malha do frasco, gerada em runtime a partir de um BottleProfile.
 * ─────────────────────────────────────────────────────────────────────
 * Spec: specs/001-frasco-3d-procedural/spec.md
 *
 * Três peças, nenhuma vinda de arquivo:
 *   corpo    ExtrudeGeometry de um Shape retangular arredondado + vidro
 *   líquido  o mesmo Shape encolhido pela parede e cortado no nível
 *   tampa    cilindro
 *
 * O que faz parecer vidro de verdade é `transmission: 1` no
 * MeshPhysicalMaterial: o material refrata a cena atrás dele em vez de
 * apenas ficar translúcido. É caro — renderiza a cena de novo num buffer —
 * e por isso a página que usa isto precisa respeitar o orçamento da §6 do
 * spec.
 */

import { useMemo } from "react";
import * as THREE from "three";
import {
  type BottleProfile,
  capDimensions,
  liquidDimensions,
  slabOutline,
} from "@/lib/design/domain/bottle-profile";

/** Retângulo com quinas arredondadas, centrado na origem. */
function roundedRectShape(
  width: number,
  height: number,
  radius: number,
): THREE.Shape {
  const shape = new THREE.Shape();
  const hw = width / 2;
  const hh = height / 2;
  const r = Math.min(radius, hw, hh);

  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);

  return shape;
}

/**
 * Extrusão centrada em Z.
 *
 * O ExtrudeGeometry cresce de z=0 para z=depth, então a peça nasce
 * desalinhada do eixo. Transladamos metade da profundidade para trás para
 * que o frasco gire em torno do próprio centro no OrbitControls — sem isso
 * ele orbita torto, e o efeito é imediatamente amador.
 */
function extrudeCentered(
  shape: THREE.Shape,
  depth: number,
  bevel: number,
): THREE.ExtrudeGeometry {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 16,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

interface BottleMeshProps {
  profile: BottleProfile;
  /** Menos segmentos e sem refração — para aparelho fraco. Ver §6 do spec. */
  lowPower?: boolean;
}

export function BottleMesh({ profile, lowPower = false }: BottleMeshProps) {
  const outline = slabOutline(profile);
  const liquid = liquidDimensions(profile);
  const cap = capDimensions(profile);

  // Geometrias são caras e só dependem do perfil — memoizar evita recriar a
  // cada frame quando o pai re-renderiza (o lab muda parâmetros ao vivo).
  const bodyGeometry = useMemo(
    () =>
      extrudeCentered(
        roundedRectShape(outline.width, outline.height, outline.radius),
        profile.depthRatio,
        profile.cornerRadius * 0.5,
      ),
    [
      outline.width,
      outline.height,
      outline.radius,
      profile.depthRatio,
      profile.cornerRadius,
    ],
  );

  const liquidGeometry = useMemo(
    () =>
      extrudeCentered(
        roundedRectShape(
          liquid.width,
          liquid.height,
          Math.max(0, outline.radius - profile.wallThickness),
        ),
        liquid.depth,
        0,
      ),
    [
      liquid.width,
      liquid.height,
      liquid.depth,
      outline.radius,
      profile.wallThickness,
    ],
  );

  // Three não libera geometria sozinho; descartamos as antigas quando o
  // perfil muda, senão o lab vaza memória de GPU a cada ajuste de slider.
  useMemo(() => {
    return () => {
      bodyGeometry.dispose();
      liquidGeometry.dispose();
    };
  }, [bodyGeometry, liquidGeometry]);

  return (
    <group>
      {/* Líquido primeiro: precisa estar na cena antes do vidro para que a
          refração do corpo o enxergue. */}
      {/*
        O líquido é OPACO de propósito.

        O `transmission` do Three refrata a cena a partir de um buffer que
        NÃO inclui outros objetos transmissivos. Com o líquido também
        transmissivo, ele sumia da refração do vidro e sobrava só o branco
        do corpo — o frasco inteiro ficava leitoso. Opaco, com rugosidade
        baixa, ele aparece através do vidro e ainda reflete o ambiente.
      */}
      <mesh geometry={liquidGeometry} position={[0, liquid.centerY, 0]}>
        <meshStandardMaterial
          color={profile.liquid.color}
          roughness={0.28}
          metalness={0}
          // Puxa o reflexo dos lightformers para o líquido. Sem isto ele
          // fica chapado como um cartão colorido — foi o que acontecia.
          envMapIntensity={1.6}
        />
      </mesh>

      <mesh geometry={bodyGeometry}>
        <meshPhysicalMaterial
          color={profile.glass.tint}
          transmission={lowPower ? 0 : 1}
          thickness={profile.glass.thickness}
          roughness={profile.glass.roughness}
          ior={profile.glass.ior}
          metalness={0}
          specularIntensity={1}
          // Sem clearcoat: em vidro fino a camada extra vira véu branco, não
          // brilho. O realce vem do specular + environment.
          clearcoat={0}
          // Sem transmission o vidro vira plástico opaco; no modo econômico
          // compensamos com transparência simples.
          opacity={lowPower ? 0.35 : 1}
          transparent={lowPower}
        />
      </mesh>

      <mesh position={[0, cap.centerY, 0]}>
        <cylinderGeometry
          args={[cap.width / 2, cap.width / 2, cap.height, lowPower ? 24 : 48]}
        />
        <meshStandardMaterial
          color={profile.cap.color}
          metalness={profile.cap.metalness}
          roughness={profile.cap.roughness}
        />
      </mesh>
    </group>
  );
}
