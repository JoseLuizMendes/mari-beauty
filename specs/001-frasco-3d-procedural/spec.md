---
spec: 001
título: "Frasco 3D procedural na página de produto"
status: "Aprovado — execução adiada até os P0 da auditoria"
criado: 2026-10-14
depende_de: "docs/AUDITORIA-2026-10.md (Ondas 0 e 1)"
---

# 001 — Frasco 3D procedural na página de produto

## 1. Objetivo

Em `/product/[slug]`, exibir o frasco do perfume como um objeto 3D real —
orbitável, com vidro que refrata e líquido colorido dentro — **gerado em código,
sem nenhum arquivo de modelo**.

Referência de comportamento: <https://soda-landingpage.vercel.app/>.
**Referência de implementação: nenhuma** — ver §3, por que não copiamos a técnica dela.

## 2. Decisões tomadas (2026-10-14)

| Decisão         | Escolha                              | Motivo                                                                                                       |
| --------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Onde            | **Só `/product/[slug]`**             | Hero e catálogo ficam 2D. Um contexto WebGL por vez, e só quando o usuário já demonstrou intenção de compra. |
| Origem da malha | **Procedural em JS**                 | GLB por SKU é inviável em custo.                                                                             |
| Lib             | **React Three Fiber + drei + three** | Ver §3.                                                                                                      |
| Ordem           | **Depois dos P0 da auditoria**       | A loja precisa receber dinheiro antes de ficar bonita.                                                       |

## 3. Por que não a stack do soda

Inspecionado em 2026-10-14 com o navegador:

| O soda faz                     | Custo medido                                    | Nossa escolha                                       |
| ------------------------------ | ----------------------------------------------- | --------------------------------------------------- |
| `@google/model-viewer` 4.x     | **1 MB** de JS                                  | R3F + three com tree-shaking, carregado sob demanda |
| 15 instâncias `<model-viewer>` | **15 contextos WebGL** (navegador corta em ~16) | **1** canvas, 1 contexto                            |
| 4 arquivos `.glb`              | **830 KB**                                      | **0 bytes** — malha gerada em runtime               |
| Vite SPA, tudo no boot         | ~1,8 MB antes da 1ª foto                        | `next/dynamic` + `ssr:false`, só na PDP             |

> O soda é uma landing de produto único. A técnica dele não sobrevive a um
> catálogo — e nós temos catálogo.

### Versões verificadas (npm, 2026-10-14)

```
@react-three/fiber  9.8.2    peer react: >=19 <19.4   ✅ projeto em 19.2.0
@react-three/drei   10.7.9   peer react: ^19          ✅
three               0.186.1                            ✅
animejs             4.5.0                              (opcional — ver §7)
```

## 4. O modelo paramétrico

Um frasco de perfume é, quase sempre, um **sólido de revolução**: um perfil 2D
girado em torno do eixo Y. É exatamente o caso de uso do `LatheGeometry`.

```
new THREE.LatheGeometry(points, segments, phiStart, phiLength)
  points: Array<Vector2>   // x > 0 obrigatório — é o raio em cada altura
  segments: number         // 64 no desktop, 32 no mobile
```

A cena tem quatro peças, todas geradas em código:

| Peça              | Geometria                                                                    | Material                                                                                 |
| ----------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Corpo (vidro)** | `LatheGeometry` do perfil                                                    | `MeshPhysicalMaterial` — `transmission: 1`, `ior: 1.5`, `thickness`, `roughness: 0..0.1` |
| **Líquido**       | `LatheGeometry` do mesmo perfil, escalado ~0.92 e cortado na altura do nível | `MeshPhysicalMaterial` com `attenuationColor` = cor da fragrância                        |
| **Tampa**         | `LatheGeometry` curto ou `CylinderGeometry`                                  | `MeshStandardMaterial` metálico ou fosco                                                 |
| **Rótulo**        | `CylinderGeometry` com `phiLength` parcial, raio = corpo + ε                 | `MeshBasicMaterial` com `map` = **a imagem Cloudinary que o produto já tem**             |

O rótulo é o detalhe que faz a coisa parecer real sem custo: `Product.images[]`
já existe no schema e já está no Cloudinary. A mesma foto que aparece na
listagem vira textura.

### Frascos não-redondos

Para frascos retangulares ou facetados, `LatheGeometry` não serve —
usa-se `ExtrudeGeometry` com `bevelEnabled` sobre um `Shape` 2D. Tratar como
um segundo _preset_ de geometria, não como exceção.

## 5. O dado por produto

A adição ao `prisma/schema.prisma` é um campo só — Json, para não migrar a cada
parâmetro novo:

```prisma
model Product {
  // ...
  /// Parâmetros do frasco 3D procedural. Null = PDP cai no carrossel 2D.
  bottle3d  Json?
}
```

Formato validado por Zod em `src/lib/products/domain/bottle-schema.ts`:

```ts
{
  preset: "lathe" | "extrude",   // revolução ou facetado
  profile: [number, number][],   // pares [raio, altura] normalizados 0..1
  heightMm: number,              // altura real, para escala honesta
  glass:  { tint: string, roughness: number, thickness: number },
  liquid: { color: string, fillLevel: number },  // fillLevel 0..1
  cap:    { style: "flat" | "domed" | "sphere", color: string, metalness: number },
  label:  { imageIndex: number, phiLength: number, yOffset: number }
}
```

**Produto sem `bottle3d` renderiza o carrossel 2D atual.** O 3D é progressive
enhancement, nunca requisito.

## 6. Orçamento de performance (inegociável)

A loja é mobile-first e brasileira. Estes são limites, não metas:

| Métrica                  | Limite                                                                        |
| ------------------------ | ----------------------------------------------------------------------------- |
| JS extra na PDP          | **≤ 180 KB** gzip, carregado só após interação ou `IntersectionObserver`      |
| Impacto no LCP           | **0** — o 3D nunca é o elemento LCP; a foto 2D é                              |
| Contextos WebGL          | **1**                                                                         |
| `frameloop`              | `"demand"` — renderiza só quando a câmera se move                             |
| Mobile                   | `segments: 32`, `dpr: [1, 1.5]`, transmission desligada em `deviceMemory < 4` |
| Sem WebGL                | Fallback silencioso para o carrossel 2D                                       |
| `prefers-reduced-motion` | Sem auto-rotação. Orbit manual continua disponível.                           |

> Regra de ouro: **se o 3D falhar, a página de produto não pode nem piscar.**
> Ele mora dentro de um error boundary cujo fallback é o carrossel atual.

## 7. GSAP ou anime.js?

O projeto já padronizou **GSAP + `useGSAP`** (canon do vault, e `hero.tsx` já usa
`ScrollTrigger`). O `animejs` 4.5.0 não entra: seria uma segunda lib de animação
para resolver o que a primeira já resolve. Dentro do R3F, a maior parte da
animação nem é GSAP — é `useFrame`.

## 8. Fatias de entrega

| #   | Fatia                                                       | Pronto quando                                        |
| --- | ----------------------------------------------------------- | ---------------------------------------------------- |
| 1   | Spike isolado: um frasco hardcoded numa rota `/_lab/bottle` | O vidro refrata e a coisa parece vidro, não plástico |
| 2   | Parametrização + schema Zod + `bottle3d` no Prisma          | Três perfis diferentes saem do mesmo componente      |
| 3   | Integração na PDP com lazy-load e error boundary            | Lighthouse mobile da PDP não cai nenhum ponto        |
| 4   | Rótulo via textura Cloudinary                               | A foto do produto aparece curvada no frasco          |
| 5   | Editor de perfil no admin                                   | Dá para ajustar um frasco sem escrever código        |

A fatia 1 é um spike: código descartável, serve para responder "parece vidro de
verdade?" antes de investir nas outras quatro.

## 9. Riscos

| Risco                               | Mitigação                                                                                                            |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `transmission` é caro em GPU mobile | Desligar abaixo de um piso de `deviceMemory`; usar `MeshPhysicalMaterial` sem transmission (só `opacity` + `envMap`) |
| Frasco procedural parecer genérico  | É o risco real do projeto. Ver §10 — o perfil é decisão de marca, não de engenharia                                  |
| Três.js subir o bundle sem querer   | Import explícito de módulos, nunca `import * as THREE` no bundle cliente; checar com `@next/bundle-analyzer`         |

## 10. Decisão em aberto — perfil dos frascos Mari Beauty

<!-- TODO(human) -->

Preencher a tabela abaixo com os perfis reais da linha. Cada linha é um frasco
do catálogo; `profile` são pares `[raio, altura]` normalizados de 0 a 1, lidos de
baixo para cima. Exemplo de um frasco cilíndrico com ombro:

```
[[0.0, 0.0], [0.45, 0.0], [0.45, 0.62], [0.30, 0.74], [0.12, 0.80], [0.12, 1.0]]
  base       lateral       ombro         gargalo      topo
```

| Produto / linha | preset | profile | tampa | cor do líquido |
| --------------- | ------ | ------- | ----- | -------------- |
|                 |        |         |       |                |

---

## 11. Portão de saída do spec

- [ ] P0.1 a P0.4 da auditoria fechados (pré-requisito, não parte deste spec)
- [ ] §10 preenchido pelo dev
- [ ] Fatia 1 aprovada visualmente
- [ ] Orçamento da §6 verificado em device real, não em emulação
