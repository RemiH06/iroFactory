// ══════════════════════════════════════════════════════
// Relieve del tapiz · del lienzo del oro (máscara blanca sobre negro) salen
// el mapa de normales (alturas difuminadas + Sobel) y el de oclusión,
// rugosidad y metal (R, G, B, como los lee Three.js). A media resolución:
// el relieve no necesita más. El difuminado es un desenfoque de caja hecho
// a mano (ctx.filter no existe en todos los navegadores fuera del DOM).
//   relief(mask) → { normal, mr }  (lienzos)
// ══════════════════════════════════════════════════════
import { canvas } from './deco-pattern.js';

const boxBlur = (a, w, h, r) => { // horizontal y vertical, dos pasadas
  const t = new Float32Array(a.length), k = 1 / (2 * r + 1);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < h; y++) { let acc = 0; const o = y * w; for (let x = -r; x <= r; x++) acc += a[o + Math.min(w - 1, Math.max(0, x))]; for (let x = 0; x < w; x++) { t[o + x] = acc * k; acc += a[o + Math.min(w - 1, x + r + 1)] - a[o + Math.max(0, x - r)]; } }
    for (let x = 0; x < w; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += t[Math.min(h - 1, Math.max(0, y)) * w + x]; for (let y = 0; y < h; y++) { a[y * w + x] = acc * k; acc += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x]; } }
  }
  return a;
};

export function relief(mask, { strength = 2.4 } = {}) {
  const w = mask.width / 2 | 0, h = mask.height / 2 | 0;
  const small = canvas(w, h), sx = small.getContext('2d', { willReadFrequently: true });
  sx.drawImage(mask, 0, 0, w, h);
  const md = sx.getImageData(0, 0, w, h).data, N = w * h;
  const gold = new Float32Array(N); for (let i = 0; i < N; i++) gold[i] = md[i * 4] / 255;
  const ht = boxBlur(gold.slice(), w, h, 1);
  const nc = canvas(w, h), nx = nc.getContext('2d'), nI = nx.createImageData(w, h), n = nI.data;
  const rc = canvas(w, h), rx = rc.getContext('2d'), rI = rx.createImageData(w, h), r = rI.data;
  let seed = 7;
  for (let y = 0; y < h; y++) {
    const ym = (y > 0 ? y - 1 : 0) * w, y0 = y * w, yp = (y < h - 1 ? y + 1 : y) * w;
    for (let x = 0; x < w; x++) {
      const xm = x > 0 ? x - 1 : 0, xp = x < w - 1 ? x + 1 : x;
      const dx = (ht[ym + xp] + 2 * ht[y0 + xp] + ht[yp + xp]) - (ht[ym + xm] + 2 * ht[y0 + xm] + ht[yp + xm]);
      const dy = (ht[yp + xm] + 2 * ht[yp + x] + ht[yp + xp]) - (ht[ym + xm] + 2 * ht[ym + x] + ht[ym + xp]);
      const ax = -dx * strength, ay = dy * strength, il = 1 / Math.sqrt(ax * ax + ay * ay + 1), i = (y0 + x) * 4;
      n[i] = (ax * il * 0.5 + 0.5) * 255; n[i + 1] = (ay * il * 0.5 + 0.5) * 255; n[i + 2] = (il * 0.5 + 0.5) * 255; n[i + 3] = 255;
      const g = gold[y0 + x]; seed = (seed * 16807) % 2147483647; // 1 = oro
      r[i] = 255; r[i + 1] = (0.18 * g + (0.48 + (seed / 2147483647) * 0.14) * (1 - g)) * 255; r[i + 2] = g * 255; r[i + 3] = 255;
    }
  }
  nx.putImageData(nI, 0, 0); rx.putImageData(rI, 0, 0);
  return { normal: nc, mr: rc };
}
