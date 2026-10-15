---
spec: 002
título: "Hero com produto em movimento por frames pré-renderizados"
status: "Proposto — decisão de técnica tomada, aguardando aval"
criado: 2026-10-15
depende_de: "specs/001-frasco-3d-procedural/spec.md (fatia 2 — o modelo paramétrico)"
---

# 002 — Hero com produto em movimento por frames pré-renderizados

## 1. Objetivo

Trazer para a home o **comportamento** do <https://soda-landingpage.vercel.app/>: o
produto reage ao scroll, gira, se aproxima, e a página parece um filme em vez de uma
lista de seções.

Trazer o comportamento — **não a técnica**. A spec 001 já mostrou por que a stack do
soda não sobrevive a um catálogo. Esta spec mostra por que ela também não deveria estar
no hero, mesmo com um produto só.

---

## 2. A decisão, e ela é a spec inteira

> **O hero NÃO roda WebGL. Ele toca uma sequência de frames pré-renderizados,
> sincronizada com o scroll.**
>
> Os frames saem do mesmo frasco procedural da spec 001, renderizado offline.

Decisão tomada com base no que a 001 mediu, não por preferência. **Pode ser revertida**
— §9 diz exatamente o que faria mudar de ideia.

### Por que não WebGL no hero

| Fato                                                                      | Consequência no hero                                                                                                                                     |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| O hero é a superfície de **LCP** do site                                  | Qualquer coisa entre o HTML e o primeiro pixel do produto é custo direto na métrica que mais importa                                                     |
| WebGL precisa de contexto + compilação de shader antes do primeiro quadro | O custo é pago **antes** de aparecer qualquer coisa, e varia com a GPU do visitante                                                                      |
| A 001 já gasta o orçamento de 3D na PDP                                   | A regra dela é **um contexto WebGL por vez, e só quando o usuário demonstrou intenção de compra**. Hero é o oposto: é onde ninguém demonstrou nada ainda |
| `transmission` (o que faz o vidro parecer vidro) é caro em GPU móvel      | A 001 já prevê desligá-lo em aparelho fraco. No hero, desligar significa mostrar plástico para quem chega pelo celular — que é a maioria                 |

### O que frames pré-renderizados compram

- **O custo do render é pago uma vez, na nossa máquina**, não no aparelho de cada
  visitante. O frasco mais bonito que conseguirmos fazer é o que todo mundo vê.
- **O primeiro quadro é uma `<img>`** — pode ser o elemento de LCP, com `priority`, e o
  navegador já sabe otimizar isso.
- **Degradação natural:** sem JS, sem scroll, ou com `prefers-reduced-motion`, fica uma
  imagem bonita. Nada a implementar além de não fazer nada.
- **Direção de arte sem limite de runtime:** sombra de contato, menisco no líquido,
  quinas com bastão sólido — tudo que a §8.1 da 001 listou como "ainda falta para
  parecer foto" é barato quando o render é offline.

### O que se perde, honestamente

- **Não é interativo.** O usuário não orbita o frasco com o dedo; ele percorre uma
  trajetória que nós escolhemos. Para o hero, isso é aceitável — e a interação de
  verdade continua existindo na PDP, que é onde ela significa alguma coisa.
- **Bytes.** Um contexto WebGL são ~0 bytes de asset; uma sequência de frames são
  centenas de KB. É o trade central desta spec, e o §5 é o orçamento que o mantém
  honesto.

---

## 3. Como os frames são gerados

Reaproveitando o que a 001 já construiu, sem modelar nada à mão:

1. `src/lib/design/domain/bottle-profile.ts` já descreve o frasco como perfil
   paramétrico (aritmética pura, 17 testes).
2. Um script de build dirige a rota de laboratório `/lab/bottle` num Chromium headless
   (Playwright já está no projeto e o Chromium já vem no ambiente), posiciona a câmera
   em cada passo da trajetória e captura o canvas.
3. Saída: `public/assets/hero/frame-000.avif` … `frame-NNN.avif`, mais os `.webp` de
   fallback — pelo mesmo caminho do `scripts/otimizar-imagens.mjs`.

**O script é versionado e os frames também.** Render não entra em build de CI: é lento,
não determinístico entre versões de driver, e um diff de imagem é revisável.

> **Consequência direta:** o frasco do hero e o frasco da PDP são o mesmo objeto. Mudar
> o perfil na §10 da 001 muda os dois — um re-render, não dois trabalhos de arte.

---

## 4. Como os frames tocam

- `<canvas>` desenhando `ImageBitmap` decodificado, um por quadro.
- Scroll mapeado para índice de quadro. **CSS puro não dá conta** (não há como mapear
  scroll para `background-image` sem JS), então aqui o GSAP ScrollTrigger se justifica —
  é sequência orquestrada, que é exatamente o caso em que o `CLAUDE.md` do projeto
  manda usar GSAP em vez de CSS.
- **Decodificação antecipada é obrigatória.** Decodificar no quadro em que o frame
  aparece engasga. Os primeiros N ficam prontos antes de começar; o resto entra em
  background com `createImageBitmap`.
- `prefers-reduced-motion`: nada toca. O quadro inicial fica estático. Regra global já
  existe no `globals.css`.

---

## 5. Orçamento (a verificar, não medido)

> Estes números são **alvo de projeto**, não medição. Nenhum frame foi gerado ainda.
> A spec 001 errou feio quando julgou o render com a foto de referência por trás; aqui
> o risco equivalente é declarar orçamento cumprido sem medir. Não vale.

| Item                            | Alvo                                              | Como verificar                                                         |
| ------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------- |
| Quadros, desktop                | ≤ 48                                              | —                                                                      |
| Quadros, mobile                 | ≤ 24 (sequência própria, não a mesma reamostrada) | —                                                                      |
| Peso do primeiro quadro         | ≤ 60 KB                                           | `curl -w %{size_download}` no AVIF servido                             |
| Peso total da sequência desktop | **≤ 900 KB**                                      | Soma dos arquivos; se estourar, corta quadro antes de cortar qualidade |
| LCP mobile, 4G simulado         | não piorar vs. hoje                               | Lighthouse antes e depois, mesmo perfil                                |
| Quadros perdidos no scrub       | 0 em aparelho real                                | DevTools com CPU estrangulada em 4×                                    |

**Se o total estourar 900 KB, a resposta é menos quadros, não mais compressão.** 24
quadros nítidos lêem melhor que 48 borrados, e o olho perdoa passo de animação muito
mais do que perdoa artefato.

### Por que não vídeo

A alternativa óbvia — um `.webm` scrubado — é descartada:
`currentTime` em vídeo não é confiável para scrub quadro a quadro em Safari móvel, e
buscar num vídeo comprimido entre keyframes dá travamento visível. Sequência de imagens
é mais pesada e previsível. **Se o orçamento do §5 não fechar, revisitar isto é a
primeira saída** — medindo em Safari real, não em emulação.

---

## 6. Fatias de entrega

| #   | Fatia                                       | Pronto quando                                            |
| --- | ------------------------------------------- | -------------------------------------------------------- |
| 1   | Script de render + 12 quadros de teste      | Os 12 saem com câmera consistente e sem artefato         |
| 2   | Componente de scrub + GSAP ScrollTrigger    | Scrub fluido no desktop, sem engasgo na primeira passada |
| 3   | Sequência mobile + `prefers-reduced-motion` | Estático onde deve, leve onde precisa                    |
| 4   | Orçamento do §5 verificado                  | Lighthouse antes/depois, em aparelho real                |
| 5   | Integração no hero substituindo o atual     | LCP não piora                                            |

A fatia 1 responde a pergunta que decide tudo: **o frasco renderizado offline parece
bom o suficiente para ser a primeira coisa que o cliente vê?** Se não parecer, nada
além dela foi desperdiçado.

---

## 7. Relação com a spec 001

|                    | 001 — PDP              | 002 — Hero                              |
| ------------------ | ---------------------- | --------------------------------------- |
| Técnica            | WebGL em runtime (R3F) | Frames pré-renderizados                 |
| Interação          | Orbitável pelo usuário | Trajetória fixa, dirigida por scroll    |
| Quando carrega     | Sob demanda, na PDP    | Primeiro quadro no HTML inicial         |
| Fonte da geometria | `bottle-profile.ts`    | **A mesma**, renderizada offline        |
| Depende de         | —                      | Fatia 2 da 001 (o modelo parametrizado) |

A 001 continua restrita a `/product/[slug]`, como já estava escrito na §2 dela. Esta
spec não amplia aquele escopo: cobre o hero por **outro** caminho, justamente para não
ampliá-lo.

---

## 8. Riscos

| Risco                                | Mitigação                                                                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Sequência pesa mais que o orçamento  | Cortar quadros antes de cortar qualidade (§5). Piso de 24 no desktop; abaixo disso o movimento quebra e a spec perde o sentido |
| Frasco offline parecer artificial    | É o mesmo risco da 001 e a mesma causa: o perfil. Depende da §10 da 001 estar preenchida com a linha real                      |
| Scrub engasgar em aparelho fraco     | Decodificação antecipada + sequência mobile reduzida. Se ainda engasgar, congelar no primeiro quadro em vez de tocar mal       |
| Render não reproduzir entre máquinas | Frames versionados no repo; render não roda em CI                                                                              |

---

## 9. O que faria reverter para WebGL no hero

Registrado para que a decisão seja revisável com critério, e não por gosto:

- Se o orçamento do §5 não fechar nem com 24 quadros **e** o vídeo scrubado se mostrar
  confiável em Safari móvel real — aí a conta inverte.
- Se o hero passar a precisar de interação real (o usuário girar o frasco com o dedo
  antes de escolher produto). Hoje não precisa: essa interação é da PDP.
- Se a 001 medir, em aparelho real, que o custo de contexto WebGL é menor do que esta
  spec assume. **Essa medição não existe** — a afirmação do §2 é raciocínio sobre LCP,
  não número colhido.

---

## 10. Portão de saída do spec

- [ ] §10 da spec 001 preenchida (o perfil real dos frascos)
- [ ] Fatia 2 da 001 entregue (modelo parametrizado)
- [ ] Fatia 1 desta spec aprovada visualmente — **com a referência desligada**, como a
      001 aprendeu da pior forma
- [ ] Orçamento do §5 verificado em aparelho real, não em emulação
