/**
 * Converte os rasters de `public/` para AVIF + WebP.
 *
 * ## Por que existe
 *
 * Auditoria 2026-10, P1.3: `public/` tinha 36 PNG/JPG somando 17,6MB e
 * **zero** AVIF ou WebP. O canon (`Preferencias Dev` §Imagens e Mídia Web) é
 * explícito: AVIF é a primeira escolha, WebP é o fallback, e WebP puro é o
 * *mínimo aceitável*. O projeto estava abaixo do mínimo.
 *
 * Em perfumaria a foto **é** o produto — e é ela que derruba o LCP no 4G.
 * Quatro dos heros passavam de 1,4MB cada.
 *
 * ## Portado do `dr-gabriel-cavalcante-web`, com duas mudanças
 *
 * A origem é `scripts/otimizar-fotos.mjs` daquele repositório. O motor é o
 * mesmo (sharp, `effort` alto, qualidade por finalidade). Duas diferenças, e
 * as duas são deliberadas:
 *
 * 1. **Emite AVIF além de WebP.** O script de origem é WebP-only. AVIF entrega
 *    o mesmo olho em ~30% menos bytes e é o que o canon pede primeiro.
 * 2. **Varre o diretório em vez de ter receita por foto.** Lá cada imagem tem
 *    recorte e largura próprios porque recorte é decisão editorial de uma
 *    sessão de fotos específica. Aqui são assets de catálogo já enquadrados: o
 *    que falta é formato e peso, não enquadramento. Receita por arquivo seria
 *    cerimônia sem conteúdo — e a lista envelheceria a cada asset novo.
 *
 * ## Uso
 *
 *     pnpm imagens:otimizar            # converte o que falta
 *     pnpm imagens:otimizar --forcar   # reconverte tudo
 *     node scripts/otimizar-imagens.mjs public/assets/stitch
 *
 * O original **continua no repositório**: é a fonte para reconverter quando a
 * matriz de qualidade mudar, e o `<Image>` do Next precisa de um arquivo que
 * exista para derivar os breakpoints.
 *
 * ## Largura: por que o teto é 2048
 *
 * Nenhuma imagem do site é servida acima de ~1400px de largura CSS, e o Next
 * ainda reduz por breakpoint. 2048 dá margem para telas 2× sem guardar pixel
 * que ninguém vê. Imagem menor que o teto não é ampliada
 * (`withoutEnlargement`) — ampliar é inventar detalhe que o original não tem.
 */

import { readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname, dirname, basename } from "node:path";
import sharp from "sharp";

/** Extensões que vale a pena converter. SVG é vetor; GIF é proibido pelo canon. */
const CONVERSIVEIS = new Set([".png", ".jpg", ".jpeg"]);

/** Diretórios que o script nunca percorre. */
const IGNORADOS = new Set(["node_modules", ".git", ".next"]);

const LARGURA_MAXIMA = 2048;

/**
 * Qualidade por formato.
 *
 * AVIF 62 e WebP 82 **não** são o mesmo número em escalas diferentes: as duas
 * escalas não são comparáveis. Estes são os valores em que, nos assets deste
 * projeto, o arquivo encolhe sem que a diferença apareça num frasco de vidro —
 * que é o assunto difícil aqui, porque gradiente suave é onde a compressão
 * deixa faixa.
 */
const QUALIDADE = {
  avif: { quality: 62, effort: 6 },
  webp: { quality: 82, effort: 6 },
};

function formatarKB(bytes) {
  return `${Math.round(bytes / 1024)}KB`;
}

async function converterUm(arquivo, { forcar }) {
  const dir = dirname(arquivo);
  const nome = basename(arquivo, extname(arquivo));
  const destinos = {
    avif: join(dir, `${nome}.avif`),
    webp: join(dir, `${nome}.webp`),
  };

  if (!forcar && existsSync(destinos.avif) && existsSync(destinos.webp)) {
    return { arquivo, pulado: true };
  }

  const original = await stat(arquivo);
  const base = sharp(arquivo).resize({
    width: LARGURA_MAXIMA,
    withoutEnlargement: true,
  });

  // `clone()` por formato: sharp consome o pipeline ao gravar, então reusar a
  // mesma instância para o segundo formato grava um arquivo vazio.
  const [avif, webp] = await Promise.all([
    base.clone().avif(QUALIDADE.avif).toFile(destinos.avif),
    base.clone().webp(QUALIDADE.webp).toFile(destinos.webp),
  ]);

  return {
    arquivo,
    pulado: false,
    original: original.size,
    avif: avif.size,
    webp: webp.size,
    largura: avif.width,
    altura: avif.height,
  };
}

async function listarRecursivo(dir, encontrados = []) {
  for (const entrada of await readdir(dir, { withFileTypes: true })) {
    if (IGNORADOS.has(entrada.name)) continue;
    const caminho = join(dir, entrada.name);

    if (entrada.isDirectory()) await listarRecursivo(caminho, encontrados);
    else if (CONVERSIVEIS.has(extname(entrada.name).toLowerCase()))
      encontrados.push(caminho);
  }
  return encontrados;
}

const args = process.argv.slice(2);
const forcar = args.includes("--forcar");
const raiz = args.find((a) => !a.startsWith("--")) ?? "public";

if (!existsSync(raiz)) {
  console.error(`não encontrei "${raiz}"`);
  process.exit(1);
}

const arquivos = await listarRecursivo(raiz);

if (arquivos.length === 0) {
  console.log(`nenhum PNG/JPG em ${raiz}`);
  process.exit(0);
}

let somaOriginal = 0;
let somaAvif = 0;
let somaWebp = 0;
let convertidos = 0;
let pulados = 0;

for (const arquivo of arquivos) {
  const r = await converterUm(arquivo, { forcar });

  if (r.pulado) {
    pulados += 1;
    continue;
  }

  convertidos += 1;
  somaOriginal += r.original;
  somaAvif += r.avif;
  somaWebp += r.webp;

  const economia = Math.round((1 - r.avif / r.original) * 100);
  console.log(
    `${arquivo} — ${r.largura}×${r.altura} · ` +
      `original ${formatarKB(r.original)} → ` +
      `avif ${formatarKB(r.avif)} (-${economia}%) · webp ${formatarKB(r.webp)}`,
  );
}

console.log(
  `\n${convertidos} convertidas, ${pulados} já estavam prontas.` +
    (convertidos > 0
      ? `\noriginal ${formatarKB(somaOriginal)} · ` +
        `avif ${formatarKB(somaAvif)} · webp ${formatarKB(somaWebp)} · ` +
        `economia ${Math.round((1 - somaAvif / somaOriginal) * 100)}% em AVIF`
      : ""),
);
