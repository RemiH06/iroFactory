// ══════════════════════════════════════════════════════
// Marca de iroFactory (decidida 2026-10-04):
//  · Sensu, el abanico plegable de doce gajos (uno por tema, por tono)
//    con el sello en el remache: el logo de casi todo.
//  · Mazo, doce cartas cuadradas abiertas sobre una esquina; la de enfrente
//    es el sello: el favicon.
// El sello es un cuadro de tinta con 色 calado. El kanji va en curvas
// (Shippori Mincho ExtraBold, OFL) y el sello es una sola ruta: el cuadro
// gira al revés que el glifo, así que con la regla nonzero 色 queda hueco
// de verdad y la marca sirve en un solo color (currentColor) sobre cualquier
// fondo. Los SVG de assets/logo/ salen de aquí con build.mjs.
// ══════════════════════════════════════════════════════

export const THEMES = [
  ['ludus', '#C84028'], ['forge', '#E86A14'], ['tarot', '#D6A020'], ['lambda', '#6E9A5A'],
  ['bookworm', '#3E6038'], ['elixir', '#10BDB4'], ['shui', '#1878A0'], ['apolo', '#6FA0D8'],
  ['disco', '#4050C8'], ['odysseus', '#6A2C62'], ['sherry', '#F02D78'], ['metro', '#8A2038'],
];
export const INK = '#1B1A24', PAPER = '#EEF0F3';

// 色 en una caja de 100 × 100 (el em), y abajo hacia +y
const IRO = 'M73.6 29Q74 28.5 74.8 27.6Q75.5 26.8 76 26.3Q76.4 25.9 76.8 25.9Q77.4 25.9 80.2 27.8Q82.9 29.8 85.3 31.9Q87.7 34.1 87.7 34.8Q86.5 36.5 83.6 37V45.7Q83.8 56.3 84.2 62.5Q83.6 63.5 80.2 64.8Q76.8 66.1 74.1 66.1Q71.9 66.1 71.9 64.1Q71.9 64.1 72.3 61.7V59.5H28.1V78.8Q28.1 81.5 30.2 82.5Q32.3 83.6 37.3 83.6H70.7Q75.4 83.6 77.7 83.1Q79.9 82.6 81.3 80.9Q82.5 79.3 84.2 75.3Q86 71.3 87.3 67.1H88.4L88.5 81.2Q92.4 82.4 93.7 83.2Q95 84.1 95 85.9Q95 88.8 93.1 90.7Q91.1 92.5 86.1 93.5Q81 94.6 71.8 94.6H37.8Q30.4 94.6 25.9 93.2Q21.4 91.7 19.2 88.2Q17 84.6 17 78.5V38Q10.8 43.1 4.9 46.4L4 45.5Q8.7 41.1 13.3 34.8Q17.9 28.4 21.7 21.2Q24.1 16.8 26.1 11.3Q28.1 5.8 28.8 1.6Q44.5 5.7 44.5 7Q44.5 7.3 43.7 7.5L41.8 8Q40 11.4 37.6 14.9H53.9L56.7 11.8Q57.2 11.3 58 10.4Q58.8 9.5 59.3 9Q59.8 8.6 60.2 8.6Q60.8 8.6 63.4 10.6Q65.9 12.7 68.2 15Q70.4 17.3 70.4 18Q69.9 18.6 69 18.9Q68.1 19.2 66.5 19.4Q63.1 22.7 58.8 26.1Q54.5 29.6 50.4 32H71.2ZM47.8 32Q51 26.6 54.1 17.8H35.6Q30.4 25 25.1 30.3L29.4 32ZM44.4 34.9H28.1V56.6H44.4ZM72.3 56.6V34.9H55.3V56.6Z';
// el cuadro del sello en las mismas unidades: centrado en el glifo, 色 ocupa el 74 % del lado, esquinas al 10 %
const S = 100 / 0.74, CX = 49.5, CY = 48.1, f = v => +v.toFixed(2);
const SEAL_BOX = (() => {
  const x0 = f(CX - S / 2), y0 = f(CY - S / 2), x1 = f(CX + S / 2), y1 = f(CY + S / 2), r = f(S * 0.1);
  // al revés del contorno exterior del glifo
  return `M${f(x0 + r)} ${y0}A${r} ${r} 0 0 0 ${x0} ${f(y0 + r)}V${f(y1 - r)}A${r} ${r} 0 0 0 ${f(x0 + r)} ${y1}H${f(x1 - r)}A${r} ${r} 0 0 0 ${x1} ${f(y1 - r)}V${f(y0 + r)}A${r} ${r} 0 0 0 ${f(x1 - r)} ${y0}Z`;
})();
/** Ruta del sello (cuadro con 色 calado) en unidades propias; `sealTransform` la lleva a su lugar. */
export const SEAL_PATH = SEAL_BOX + IRO;
/** Matriz [a, b, c, d, e, f] que centra el sello en (cx, cy) con lado `size`. */
export const sealTransform = (cx, cy, size) => { const k = size / S; return [k, 0, 0, k, f(cx - CX * k), f(cy - CY * k)]; };
const sealSVG = (cx, cy, size, fill) => `<path d="${SEAL_PATH}" fill="${fill}" transform="matrix(${sealTransform(cx, cy, size).map(f).join(' ')})"/>`;

const rad = d => d * Math.PI / 180;
const pt = (cx, cy, r, a) => [cx + r * Math.cos(rad(a)), cy + r * Math.sin(rad(a))].map(f);
// n colores repartidos por la rueda (12 = todos)
const pick = n => n === 12 ? THEMES.map(t => t[1]) : Array.from({ length: n }, (_, i) => THEMES[Math.round(i * 11 / (n - 1))][1]);

/**
 * Geometría del Sensu en una caja de 100 (centro del remache en 50, 72):
 * los gajos como rutas con su color y el sello como [cx, cy, lado].
 * Con `mono` los gajos se separan con un hueco. Sirve para SVG y para Path2D.
 */
export function sensuGeometry({ small = false, mono = false } = {}) {
  const cols = pick(small ? 6 : 12), n = cols.length, cx = 50, cy = small ? 70 : 72, rO = 46, rI = small ? 18 : 15, gap = mono ? (small ? 3 : 1.6) : 0;
  const fans = cols.map((color, i) => {
    const a0 = 180 + i * 180 / n + gap / 2, a1 = 180 + (i + 1) * 180 / n - gap / 2;
    const [x0, y0] = pt(cx, cy, rO, a0), [x1, y1] = pt(cx, cy, rO, a1), [x2, y2] = pt(cx, cy, rI, a1), [x3, y3] = pt(cx, cy, rI, a0);
    return { color, d: `M${x0} ${y0}A${rO} ${rO} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${rI} ${rI} 0 0 0 ${x3} ${y3}Z` };
  });
  return { fans, seal: [cx, cy + (small ? 4 : 3), small ? 36 : 28] };
}

/**
 * Sensu. `small`: seis gajos y sello más grande (para 32 px o menos).
 * Con `mono`, todo en `ink` (por defecto currentColor): los gajos alternan
 * opacidad para leer el pliegue y se separan con un hueco, no con papel.
 * Con `symbol` sale como <symbol id="…"> (proporción 96 × 68) para <use>.
 */
export function sensu({ ink = INK, paper = PAPER, small = false, mono = false, symbol = null, title = 'iroFactory' } = {}) {
  const { fans, seal } = sensuGeometry({ small, mono });
  let s = '';
  fans.forEach(({ d, color }, i) => {
    s += mono ? `<path d="${d}" fill="${ink}"${i % 2 ? ' fill-opacity=".62"' : ''}/>`
      : `<path d="${d}" fill="${color}" stroke="${paper}" stroke-width="${small ? 1.6 : 0.9}" stroke-linejoin="round"/>`;
  });
  s += sealSVG(...seal, ink);
  // recorta el aire de abajo: el abanico va de y = 26 a ~92
  const box = `2 24 96 ${small ? 70 : 68}`;
  return symbol ? `<svg xmlns="http://www.w3.org/2000/svg"><symbol id="${symbol}" viewBox="${box}">${s}</symbol></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" role="img" aria-label="${title}"><title>${title}</title>${s}</svg>`;
}

/** Mazo. `small`: cuatro cartas (favicon). Con `dark`, tinta y papel se invierten según el modo del sistema. */
export function mazo({ ink = INK, paper = PAPER, small = false, dark = null, title = 'iroFactory' } = {}) {
  const cols = pick(small ? 4 : 12), n = cols.length, C = 50, step = small ? 13 : 4.6;
  const angles = Array.from({ length: n + 1 }, (_, k) => -(n - k) * step);
  const corners = angles.flatMap(a => [[0, 0], [C, 0], [C, -C], [0, -C]].map(([x, y]) => { const r = rad(a); return [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)]; }));
  const xs = corners.map(c => c[0]), ys = corners.map(c => c[1]);
  const side = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 1.08;
  const vx = (Math.min(...xs) + Math.max(...xs)) / 2 - side / 2, vy = (Math.min(...ys) + Math.max(...ys)) / 2 - side / 2;
  // con `dark` la tinta y el papel van por clase, para que el favicon cambie con el modo del sistema
  const P = dark ? 'class="p"' : `stroke="${paper}"`, I = dark ? 'class="i"' : `fill="${ink}"`;
  let s = dark ? `<style>.p{stroke:${paper}}.b{fill:${paper}}.i{fill:${ink}}@media (prefers-color-scheme:dark){.p{stroke:${dark.paper}}.b{fill:${dark.paper}}.i{fill:${dark.ink}}}</style>` : '';
  cols.forEach((c, k) => { s += `<rect x="0" y="${-C}" width="${C}" height="${C}" rx="${C * 0.1}" fill="${c}" ${P} stroke-width="${small ? 2.4 : 1.2}" transform="rotate(${f(angles[k])})"/>`; });
  // la carta del sello lleva papel debajo, para que por 色 no se vea la carta de atrás
  s += `<rect x="0" y="${-C}" width="${C}" height="${C}" rx="${C * 0.1}" ${dark ? 'class="p b"' : `fill="${paper}" stroke="${paper}"`} stroke-width="${small ? 2.4 : 1.2}"/>`;
  s += sealSVG(C / 2, -C / 2, C, 'X').replace('fill="X"', I);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(vx)} ${f(vy)} ${f(side)} ${f(side)}" role="img" aria-label="${title}"><title>${title}</title>${s}</svg>`;
}
