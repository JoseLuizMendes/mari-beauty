"use client";

/**
 * Visualizador 3D do frasco — o Canvas e tudo que o cerca.
 * ─────────────────────────────────────────────────────────────────────
 * Spec: specs/001-frasco-3d-procedural/spec.md §6 (orçamento de performance)
 *
 * Regras que este componente existe para garantir:
 *   • UM contexto WebGL (o soda-landingpage abre 15 e é por isso que a
 *     técnica dele não sobrevive a um catálogo)
 *   • `frameloop="demand"` — só desenha quando a câmera se move
 *   • ambiente de iluminação gerado em código, sem baixar HDR de CDN
 *   • degrada sozinho em aparelho fraco e respeita prefers-reduced-motion
 */

import { Suspense, useEffect, useMemo, useSyncExternalStore } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { BottleMesh } from "./bottle-mesh";
import type { BottleProfile } from "@/lib/design/domain/bottle-profile";

/**
 * Ambas as capacidades abaixo vivem FORA do React — são do navegador. Lê-las
 * com `useSyncExternalStore` em vez de `useEffect` + `setState` dá o
 * snapshot de servidor explícito (nenhuma das duas existe no SSR) e evita o
 * render extra do "assume false, corrige depois".
 */

/** Nunca muda durante a sessão: assinatura é no-op. */
const noopSubscribe = () => () => {};

/**
 * Decide se o aparelho aguenta refração.
 *
 * `deviceMemory` não existe no Safari nem no Firefox, então a ausência não
 * pode significar "fraco" — significa "não sei", e aí assumimos que dá.
 * Quem declara pouca memória ou poucos núcleos cai no modo econômico.
 */
function useLowPowerMode(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => {
      const nav = navigator as Navigator & { deviceMemory?: number };
      const memory = nav.deviceMemory;
      const cores = navigator.hardwareConcurrency;
      return (
        (typeof memory === "number" && memory < 4) ||
        (typeof cores === "number" && cores <= 4)
      );
    },
    () => false, // no servidor não dá para saber; o client corrige na hidratação
  );
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/**
 * Ambiente de iluminação montado com Lightformers.
 *
 * Deliberadamente NÃO usamos `<Environment preset="studio" />`: os presets
 * do drei baixam um HDR do CDN da pmndrs. Numa loja isso é uma dependência
 * de rede de terceiros no caminho crítico da página de produto. Os
 * Lightformers geram o mesmo tipo de reflexo em código, custo zero de rede.
 */
function StudioEnvironment() {
  return (
    <Environment resolution={256}>
      {/* Softbox principal, em cima: cria o brilho alongado na aresta. */}
      <Lightformer
        form="rect"
        intensity={3}
        position={[0, 3, 1]}
        scale={[4, 1.5, 1]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      {/* Preenchimento lateral, para a quina oposta não sumir no preto. */}
      <Lightformer
        form="rect"
        intensity={1.4}
        position={[-2.5, 0.5, 1.5]}
        scale={[1.5, 3, 1]}
        rotation={[0, Math.PI / 4, 0]}
      />
      <Lightformer
        form="rect"
        intensity={1.1}
        position={[2.5, 0.5, 1.5]}
        scale={[1.5, 3, 1]}
        rotation={[0, -Math.PI / 4, 0]}
      />
      {/* Contraluz: separa o frasco do fundo pela borda. */}
      <Lightformer
        form="rect"
        intensity={2}
        position={[0, 0.5, -3]}
        scale={[3, 2, 1]}
      />
    </Environment>
  );
}

/**
 * Fundo dentro da CENA — não é decoração, é o que alimenta a refração.
 *
 * `transmission` refrata o que o renderer desenhou atrás do objeto, e só
 * enxerga o que está na cena WebGL. Com canvas `alpha: true` e o fundo vindo
 * de uma div CSS, o vidro refrata o vazio e renderiza como a própria cor —
 * foi exatamente o que aconteceu na primeira versão deste spike: um
 * retângulo verde-menta chapado, sem nenhuma transparência visível.
 *
 * Este plano dá ao vidro algo para distorcer. Fica longe o bastante para
 * não aparecer como parede e ganha um degradê sutil, que é o que revela a
 * distorção nas quinas.
 */
function SceneBackdrop({ color }: { color: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;

    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    const base = new THREE.Color(color);
    gradient.addColorStop(
      0,
      `#${base.clone().multiplyScalar(1.45).getHexString()}`,
    );
    gradient.addColorStop(0.55, `#${base.getHexString()}`);
    gradient.addColorStop(
      1,
      `#${base.clone().multiplyScalar(0.55).getHexString()}`,
    );
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [color]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh position={[0, 0, -4]}>
      <planeGeometry args={[24, 14]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

export interface BottleViewerProps {
  profile: BottleProfile;
  /** Gira sozinho devagar. Ignorado sob prefers-reduced-motion. */
  autoRotate?: boolean;
  /**
   * Cor do fundo DA CENA. Precisa acompanhar o fundo da página, porque é
   * ele que o vidro refrata. Sem isto o frasco não parece transparente.
   */
  backdropColor?: string;
  className?: string;
}

export function BottleViewer({
  profile,
  autoRotate = true,
  backdropColor = "#0f5a58",
  className,
}: BottleViewerProps) {
  const lowPower = useLowPowerMode();
  const reducedMotion = usePrefersReducedMotion();
  const shouldAutoRotate = autoRotate && !reducedMotion;

  return (
    <Canvas
      className={className}
      // Um contexto, e só desenha quando algo muda. Com autoRotate ligado o
      // próprio OrbitControls pede frames; parado, a GPU dorme.
      frameloop={shouldAutoRotate ? "always" : "demand"}
      dpr={lowPower ? [1, 1] : [1, 1.5]}
      gl={{
        antialias: !lowPower,
        // O fundo agora é um plano DENTRO da cena (SceneBackdrop), porque
        // é ele que o vidro refrata. Canvas opaco evita compor duas vezes.
        alpha: false,
        powerPreference: "high-performance",
      }}
      // 3/4 de frente: de frente, um prisma retangular lê como retângulo.
      // O ângulo é o que mostra a espessura do vidro na quina.
      camera={{ position: [1.15, 0.35, 2.9], fov: 32 }}
    >
      <Suspense fallback={null}>
        <SceneBackdrop color={backdropColor} />
        <StudioEnvironment />

        {/* Luz direta de apoio: o Environment sozinho deixa a tampa opaca
            chapada, porque metal fosco precisa de uma fonte com direção. */}
        <directionalLight position={[2, 4, 3]} intensity={1.2} />
        <ambientLight intensity={0.3} />

        <BottleMesh profile={profile} lowPower={lowPower} />

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate={shouldAutoRotate}
          autoRotateSpeed={0.8}
          // Trava a órbita vertical: ver o frasco por baixo revela que o
          // fundo é só uma face extrudada, e quebra a ilusão.
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.8}
        />
      </Suspense>
    </Canvas>
  );
}
