// ══════════════════════════════════════════════════════
// El pincel de relieve · dibuja a la vez en dos lienzos del mismo tamaño:
//  · color: lo que se ve,
//  · mask: el relieve. R es la altura y G el metal (el oro de tarot es
//    blanco: alto y metálico; el mármol de apolo es rojo: alto y mate).
// De la máscara salen las normales, el metal y la rugosidad (relief.js).
// Lo usan los tapices de tarot, sus cartas y el pórtico de apolo.
//   pen(C, M, { u, w, h, gold, ink }) → { line, solid, tile, P, mirror,
//     dots, archPath, clipBoth, hatch, ring, zig, rays, dotRing }
//   gold: dos colores del degradado del trazo; ink: color en la máscara.
// ══════════════════════════════════════════════════════
export const TAU = Math.PI * 2;
// lienzo: OffscreenCanvas si existe (así corre también dentro de un Worker)
export const canvas = (w, h) => (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h }));
export const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const mix = (a, b, t) => { const x = hex(a), y = hex(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`; };

export function pen(C, M, { u, w, h, gold, ink = '#fff' }) {
  const goldGrad = () => { const g = C.createLinearGradient(0, 0, w, h); g.addColorStop(0, gold[0]); g.addColorStop(0.5, gold[1]); g.addColorStop(1, gold[0]); return g; };
  const G = goldGrad();
  const line = (path, lw) => { C.strokeStyle = G; C.lineWidth = lw; C.stroke(path); M.strokeStyle = ink; M.lineWidth = lw; M.stroke(path); };
  const solid = path => { C.fillStyle = G; C.fill(path); M.fillStyle = ink; M.fill(path); };
  const tile = (path, fill) => { C.fillStyle = fill; C.fill(path); };
  const P = () => new Path2D();
  const mirror = fn => { fn(1); fn(-1); }; // dibuja algo y su reflejo respecto al eje central
  const dots = (x0, y0, x1, y1, step, r) => { const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step)); const p = P(); for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; p.moveTo(x + r, y); p.arc(x, y, r, 0, TAU); } solid(p); };
  // arco (rectángulo con remate semicircular)
  const archPath = (x, y, aw, ah) => { const p = P(), r = aw / 2; p.moveTo(x - r, y); p.lineTo(x - r, y - ah + r); p.arc(x, y - ah + r, r, Math.PI, 0); p.lineTo(x + r, y); return p; };

  // rayado dentro de una forma, anillos, zigzag, rayos y punteado en anillo
  const clipBoth = (path, fn) => { C.save(); M.save(); C.clip(path); M.clip(path); fn(); C.restore(); M.restore(); };
  const hatch = (path, gap, ang, lw, box = [0, 0, w, h]) => clipBoth(path, () => {
    const [x0, y0, x1, y1] = box, mx = (x0 + x1) / 2, my = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2, ca = Math.cos(ang), sa = Math.sin(ang), q = P();
    for (let d = -R; d <= R; d += gap) { q.moveTo(mx + ca * -R - sa * d, my + sa * -R + ca * d); q.lineTo(mx + ca * R - sa * d, my + sa * R + ca * d); }
    line(q, lw);
  });
  const ring = (x, y, r, a0, a1, lw) => { const q = P(); q.arc(x, y, r, a0, a1); line(q, lw); };
  const zig = (x, y, r0, r1, n, a0, a1, lw) => { const q = P(); for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n, rr = k % 2 ? r1 : r0; k ? q.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : q.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } line(q, lw); };
  const rays = (x, y, r0, r1, n, a0, a1, lw) => { const q = P(); for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n; q.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); q.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); } line(q, lw); };
  const dotRing = (x, y, r, n, a0, a1, rd) => { const q = P(); for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n, xx = x + Math.cos(a) * r, yy = y + Math.sin(a) * r; q.moveTo(xx + rd, yy); q.arc(xx, yy, rd, 0, TAU); } solid(q); };
  return { line, solid, tile, P, mirror, dots, archPath, clipBoth, hatch, ring, zig, rays, dotRing };
}
