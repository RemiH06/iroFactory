// ══════════════════════════════════════════════════════
// Tapices art deco · generador propio (canvas 2D), uno por bioma.
// Composición simétrica como los paneles deco: marco doble con punteado,
// un campo de mosaico de fondo (escamas, zigzag, abanicos, escalones o
// rayas según el bioma), un arco central con sol y rayos, columnas
// estriadas con remates escalonados, soles a medias en las esquinas, el
// motivo del bioma (frondas, carrizos, cristales, olas, ondas, soles,
// pinos, gavillas, zigurats) y su memento mori (reloj de arena, vela,
// polilla, cráneo…) en el trazo dorado.
// Devuelve dos lienzos del mismo tamaño:
//  · color: los mosaicos con los colores del bioma y el oro encima,
//  · mask: solo el oro, en blanco sobre negro (de ahí salen el relieve,
//    el metal y el brillo en tapestry-3d.js).
//   paint({ w, h, colors: [c1, c2, c3], base, gold, motif, memento })
// Corre en un Worker (tapestry-worker.js) para no congelar la página.
// ══════════════════════════════════════════════════════
const TAU = Math.PI * 2;
// lienzo: OffscreenCanvas si existe (así corre también dentro de un Worker)
export const canvas = (w, h) => (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h }));
const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a, b, t) => { const x = hex(a), y = hex(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`; };

// ── El pincel deco: primitivas de oro y color sobre dos lienzos a la vez
// (color y máscara del oro), los motivos de cada bioma, los emblemas de
// memento mori y el cráneo de ave. Lo usan el tapiz y las cartas.
//   pen(C, M, { u, w, h, gold }) → { line, solid, tile, P, mirror, dots,
//     archPath, hatch, ring, zig, rays, dotRing, MOTIF, MEMENTO, bird }
export function pen(C, M, { u, w, h, gold }) {
  const goldGrad = () => { const g = C.createLinearGradient(0, 0, w, h); g.addColorStop(0, gold[0]); g.addColorStop(0.5, gold[1]); g.addColorStop(1, gold[0]); return g; };
  const G = goldGrad();
  const line = (path, lw) => { C.strokeStyle = G; C.lineWidth = lw; C.stroke(path); M.strokeStyle = '#fff'; M.lineWidth = lw; M.stroke(path); };
  const solid = path => { C.fillStyle = G; C.fill(path); M.fillStyle = '#fff'; M.fill(path); };
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

  const MOTIF = {
    frond: (x, y, s) => { const p = P(); for (let i = -3; i <= 3; i++) { const a = -Math.PI / 2 + i * 0.32; p.moveTo(x, y); p.quadraticCurveTo(x + Math.cos(a) * s * 0.5 + i * s * 0.05, y + Math.sin(a) * s * 0.5, x + Math.cos(a) * s, y + Math.sin(a) * s); } line(p, 0.26 * u); const b = P(); b.arc(x, y, s * 0.08, 0, TAU); solid(b); },
    reed: (x, y, s) => { const p = P(); [-0.3, 0, 0.3].forEach((d, i) => { const hh = s * (1 - Math.abs(d)); p.moveTo(x + d * s * 0.4, y); p.lineTo(x + d * s * 0.4, y - hh); p.moveTo(x + d * s * 0.4 + s * 0.06, y - hh * 0.9); p.ellipse(x + d * s * 0.4, y - hh * 0.9, s * 0.06, s * 0.16, 0, 0, TAU); }); line(p, 0.24 * u); },
    crystal: (x, y, s) => { const p = P(); [[0, 1], [-0.32, 0.7], [0.32, 0.7]].forEach(([d, k]) => { const xx = x + d * s, hh = s * k, ww = s * 0.14; p.moveTo(xx - ww, y); p.lineTo(xx - ww, y - hh * 0.75); p.lineTo(xx, y - hh); p.lineTo(xx + ww, y - hh * 0.75); p.lineTo(xx + ww, y); p.moveTo(xx, y - hh); p.lineTo(xx, y); }); line(p, 0.24 * u); },
    scallop: (x, y, s) => { const p = P(); for (let k = 0; k < 4; k++) { const r = s * (0.5 - k * 0.1); p.moveTo(x - r, y - k * s * 0.18); p.arc(x, y - k * s * 0.18, r, Math.PI, 0); } line(p, 0.26 * u); },
    ripple: (x, y, s) => { const p = P(); for (let k = 0; k < 4; k++) { const yy = y - k * s * 0.22; p.moveTo(x - s * 0.5, yy); for (let i = 0; i < 4; i++) p.quadraticCurveTo(x - s * 0.5 + (i + 0.5) * s / 4, yy - s * 0.1, x - s * 0.5 + (i + 1) * s / 4, yy); } line(p, 0.24 * u); },
    sun: (x, y, s) => { const p = P(); p.arc(x, y - s * 0.4, s * 0.16, 0, TAU); for (let i = 0; i < 16; i++) { const a = i * TAU / 16; p.moveTo(x + Math.cos(a) * s * 0.24, y - s * 0.4 + Math.sin(a) * s * 0.24); p.lineTo(x + Math.cos(a) * s * (i % 2 ? 0.34 : 0.44), y - s * 0.4 + Math.sin(a) * s * (i % 2 ? 0.34 : 0.44)); } line(p, 0.24 * u); },
    pine: (x, y, s) => { const p = P(); for (let k = 0; k < 4; k++) { const ww = s * (0.45 - k * 0.1), yy = y - s * 0.15 - k * s * 0.2; p.moveTo(x - ww, yy); p.lineTo(x, yy - s * 0.24); p.lineTo(x + ww, yy); } p.moveTo(x, y); p.lineTo(x, y - s * 0.15); line(p, 0.26 * u); },
    wheat: (x, y, s) => { const p = P(); p.moveTo(x, y); p.lineTo(x, y - s); for (let k = 0; k < 6; k++) { const yy = y - s * 0.35 - k * s * 0.11; p.moveTo(x, yy); p.quadraticCurveTo(x - s * 0.12, yy - s * 0.02, x - s * 0.14, yy - s * 0.1); p.moveTo(x, yy); p.quadraticCurveTo(x + s * 0.12, yy - s * 0.02, x + s * 0.14, yy - s * 0.1); } line(p, 0.24 * u); },
    obelisk: (x, y, s) => { const p = P(); p.moveTo(x - s * 0.13, y - s * 0.1); p.lineTo(x - s * 0.08, y - s * 0.82); p.lineTo(x, y - s); p.lineTo(x + s * 0.08, y - s * 0.82); p.lineTo(x + s * 0.13, y - s * 0.1); p.closePath(); p.moveTo(x - s * 0.08, y - s * 0.82); p.lineTo(x + s * 0.08, y - s * 0.82); p.rect(x - s * 0.24, y - s * 0.1, s * 0.48, s * 0.1); line(p, 0.26 * u); },
    ziggurat: (x, y, s) => { const p = P(); for (let k = 0; k < 4; k++) { const ww = s * (0.5 - k * 0.11), hh = s * 0.16; p.rect(x - ww, y - (k + 1) * hh, 2 * ww, hh); } line(p, 0.26 * u); }
  };
  const MEMENTO = (cx, ey, es) => ({
    hourglass: () => { const p = P(); p.moveTo(cx - es * 0.4, ey - es * 0.6); p.lineTo(cx + es * 0.4, ey - es * 0.6); p.lineTo(cx, ey); p.lineTo(cx + es * 0.4, ey + es * 0.6); p.lineTo(cx - es * 0.4, ey + es * 0.6); p.lineTo(cx, ey); p.closePath(); line(p, 0.32 * u); const f = P(); f.moveTo(cx - es * 0.48, ey - es * 0.66); f.lineTo(cx + es * 0.48, ey - es * 0.66); f.moveTo(cx - es * 0.48, ey + es * 0.66); f.lineTo(cx + es * 0.48, ey + es * 0.66); line(f, 0.5 * u); const sand = P(); sand.moveTo(cx - es * 0.22, ey + es * 0.6); sand.lineTo(cx, ey + es * 0.32); sand.lineTo(cx + es * 0.22, ey + es * 0.6); sand.closePath(); solid(sand); },
    candle: () => { const p = P(); p.rect(cx - es * 0.14, ey - es * 0.2, es * 0.28, es * 0.8); line(p, 0.32 * u); const fl = P(); fl.moveTo(cx, ey - es * 0.62); fl.quadraticCurveTo(cx + es * 0.14, ey - es * 0.36, cx, ey - es * 0.26); fl.quadraticCurveTo(cx - es * 0.14, ey - es * 0.36, cx, ey - es * 0.62); solid(fl); const d = P(); d.moveTo(cx - es * 0.14, ey); d.quadraticCurveTo(cx - es * 0.22, ey + es * 0.1, cx - es * 0.2, ey + es * 0.22); line(d, 0.22 * u); },
    moth: () => { const p = P(); mirror(s => { p.moveTo(cx, ey - es * 0.1); p.quadraticCurveTo(cx + s * es * 0.7, ey - es * 0.7, cx + s * es * 0.6, ey); p.quadraticCurveTo(cx + s * es * 0.4, ey + es * 0.1, cx, ey + es * 0.05); p.moveTo(cx, ey + es * 0.05); p.quadraticCurveTo(cx + s * es * 0.45, ey + es * 0.2, cx + s * es * 0.3, ey + es * 0.5); p.quadraticCurveTo(cx + s * es * 0.1, ey + es * 0.4, cx, ey + es * 0.15); p.moveTo(cx, ey - es * 0.25); p.quadraticCurveTo(cx + s * es * 0.12, ey - es * 0.5, cx + s * es * 0.22, ey - es * 0.55); }); line(p, 0.26 * u); const b = P(); b.ellipse(cx, ey + es * 0.05, es * 0.06, es * 0.28, 0, 0, TAU); solid(b); },
    skull: () => { const p = P(); p.arc(cx, ey - es * 0.12, es * 0.38, Math.PI * 0.85, Math.PI * 2.15); p.lineTo(cx + es * 0.24, ey + es * 0.36); p.lineTo(cx - es * 0.24, ey + es * 0.36); p.closePath(); line(p, 0.32 * u); const e = P(); [-1, 1].forEach(s => { e.moveTo(cx + s * es * 0.15 + es * 0.1, ey - es * 0.05); e.arc(cx + s * es * 0.15, ey - es * 0.05, es * 0.1, 0, TAU); }); e.moveTo(cx, ey + es * 0.08); e.lineTo(cx - es * 0.05, ey + es * 0.18); e.lineTo(cx + es * 0.05, ey + es * 0.18); e.closePath(); solid(e); const t = P(); for (let i = -2; i <= 2; i++) { t.moveTo(cx + i * es * 0.08, ey + es * 0.26); t.lineTo(cx + i * es * 0.08, ey + es * 0.36); } line(t, 0.16 * u); },
    orchid: () => { const p = P(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; p.moveTo(cx, ey); p.quadraticCurveTo(cx + Math.cos(a - 0.4) * es * 0.5, ey + Math.sin(a - 0.4) * es * 0.5, cx + Math.cos(a) * es * 0.55, ey + Math.sin(a) * es * 0.55); p.quadraticCurveTo(cx + Math.cos(a + 0.4) * es * 0.5, ey + Math.sin(a + 0.4) * es * 0.5, cx, ey); } p.moveTo(cx + es * 0.1, ey + es * 0.3); p.quadraticCurveTo(cx + es * 0.5, ey + es * 0.5, cx + es * 0.45, ey + es * 0.75); line(p, 0.24 * u); const c = P(); c.arc(cx, ey, es * 0.08, 0, TAU); solid(c); },
    shell: () => { const p = P(); for (let i = 0; i <= 8; i++) { const a = Math.PI + i * Math.PI / 8; p.moveTo(cx, ey + es * 0.4); p.lineTo(cx + Math.cos(a) * es * 0.6, ey + es * 0.1 + Math.sin(a) * es * 0.55); } p.moveTo(cx - es * 0.6, ey + es * 0.1); p.arc(cx, ey + es * 0.1, es * 0.6, Math.PI, 0); line(p, 0.26 * u); },
    feather: () => { const p = P(); p.moveTo(cx - es * 0.2, ey + es * 0.6); p.quadraticCurveTo(cx, ey, cx + es * 0.2, ey - es * 0.6); for (let k = 1; k < 8; k++) { const t = k / 8, x = cx - es * 0.2 + es * 0.4 * t, y = ey + es * 0.6 - es * 1.2 * t; p.moveTo(x, y); p.lineTo(x - es * 0.28, y - es * 0.05); p.moveTo(x, y); p.lineTo(x + es * 0.22, y + es * 0.12); } line(p, 0.22 * u); },
    wheel: () => { const p = P(); p.arc(cx, ey, es * 0.5, 0, TAU); p.moveTo(cx + es * 0.18, ey); p.arc(cx, ey, es * 0.18, 0, TAU); for (let i = 0; i < 8; i++) { const a = i * TAU / 8; p.moveTo(cx + Math.cos(a) * es * 0.18, ey + Math.sin(a) * es * 0.18); p.lineTo(cx + Math.cos(a) * es * 0.5, ey + Math.sin(a) * es * 0.5); } line(p, 0.28 * u); },
    urn: () => { const p = P(); p.rect(cx - es * 0.14, ey - es * 0.64, es * 0.28, es * 0.08); mirror(sg => { p.moveTo(cx + sg * es * 0.12, ey - es * 0.56); p.bezierCurveTo(cx + sg * es * 0.12, ey - es * 0.42, cx + sg * es * 0.46, ey - es * 0.3, cx + sg * es * 0.42, ey + es * 0.05); p.bezierCurveTo(cx + sg * es * 0.38, ey + es * 0.32, cx + sg * es * 0.14, ey + es * 0.36, cx + sg * es * 0.1, ey + es * 0.46); p.lineTo(cx + sg * es * 0.24, ey + es * 0.62); p.lineTo(cx, ey + es * 0.62); p.moveTo(cx + sg * es * 0.4, ey - es * 0.18); p.quadraticCurveTo(cx + sg * es * 0.58, ey - es * 0.16, cx + sg * es * 0.52, ey); }); p.moveTo(cx - es * 0.4, ey - es * 0.06); p.lineTo(cx + es * 0.4, ey - es * 0.06); p.moveTo(cx - es * 0.38, ey + es * 0.08); p.lineTo(cx + es * 0.38, ey + es * 0.08); line(p, 0.28 * u); },
    scythe: () => { const p = P(); p.moveTo(cx + es * 0.3, ey + es * 0.65); p.lineTo(cx - es * 0.1, ey - es * 0.6); p.moveTo(cx - es * 0.1, ey - es * 0.6); p.quadraticCurveTo(cx + es * 0.5, ey - es * 0.75, cx + es * 0.6, ey - es * 0.2); p.quadraticCurveTo(cx + es * 0.35, ey - es * 0.5, cx - es * 0.05, ey - es * 0.45); line(p, 0.3 * u); }
  });
  const bird = (cx, by, bs) => { const p = P();
    p.ellipse(cx - bs * 0.25, by, bs * 0.42, bs * 0.34, 0, Math.PI * 0.55, Math.PI * 2.35);
    p.lineTo(cx + bs * 0.95, by + bs * 0.02); p.lineTo(cx + bs * 0.12, by + bs * 0.22);
    p.moveTo(cx + bs * 0.12, by + bs * 0.08); p.lineTo(cx + bs * 0.9, by + bs * 0.05);
    line(p, 0.3 * u);
    const o = P(); o.arc(cx - bs * 0.12, by - bs * 0.04, bs * 0.13, 0, TAU); line(o, 0.24 * u);
    const pd = P(); pd.rect(cx - bs * 0.9, by + bs * 0.42, bs * 1.8, 0.5 * u); pd.rect(cx - bs * 0.7, by + bs * 0.42 + 1.4 * u, bs * 1.4, 0.5 * u); solid(pd); };
  return { line, solid, tile, P, mirror, dots, archPath, clipBoth, hatch, ring, zig, rays, dotRing, MOTIF, MEMENTO, bird };
}

export function paint({ w = 2048, h = 1152, colors, base, gold, motif = 'scallop', memento = 'hourglass' }) {
  const color = canvas(w, h), mask = canvas(w, h);
  const C = color.getContext('2d'), M = mask.getContext('2d');
  const u = h / 100, cx = w / 2;
  const [c1, c2, c3] = colors, pick = i => colors[((Math.round(i) % 3) + 3) % 3];
  const tone = (c, t) => mix(base, c, t); // mosaico: el color del bioma hundido en la base
  C.fillStyle = base; C.fillRect(0, 0, w, h); M.fillStyle = '#000'; M.fillRect(0, 0, w, h);
  C.lineCap = M.lineCap = 'round'; C.lineJoin = M.lineJoin = 'round';
  const { line, solid, tile, P, mirror, dots, archPath, hatch, ring, zig, rays, dotRing, MOTIF, MEMENTO, bird } = pen(C, M, { u, w, h, gold });

  // ── 1 · campo de mosaico (todo el lienzo, detrás del panel)
  const field = {
    // escamas de arcos (la lámina artdeco1)
    scallop: () => { const aw = 9 * u, ah = 13 * u; for (let row = -1, y = h + ah; y > -ah; row++, y -= ah * 0.62) for (let x = (row % 2 ? aw / 2 : 0) - aw; x < w + aw; x += aw) { const p = archPath(x, y, aw, ah); tile(p, tone(pick((Math.abs(row) + Math.round(x / aw))), 0.22)); line(p, 0.32 * u); } },
    // abanicos (escamas redondas con rayos)
    fan: () => { const r = 7 * u; for (let row = 0, y = -r; y < h + r; row++, y += r * 0.9) for (let x = (row % 2 ? r : 0) - r; x < w + r; x += 2 * r) { const p = P(); p.moveTo(x - r, y); p.arc(x, y, r, Math.PI, 0); p.closePath(); tile(p, tone(pick((row + Math.round(x / r))), 0.2)); line(p, 0.3 * u); const q = P(); for (let k = 1; k < 6; k++) { const a = Math.PI + k * Math.PI / 6; q.moveTo(x, y); q.lineTo(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92); } line(q, 0.12 * u); } },
    // zigzag en bandas
    chevron: () => { const bw = 6 * u, bh = 5 * u; for (let row = 0, y = 0; y < h + bh; row++, y += bh) { const p = P(); p.moveTo(-bw, y); for (let x = -bw; x < w + bw; x += bw) { p.lineTo(x + bw / 2, y - bh * 0.55); p.lineTo(x + bw, y); } const band = new Path2D(p); band.lineTo(w + bw, y + bh); band.lineTo(-bw, y + bh); band.closePath(); tile(band, tone(pick(row), 0.18)); line(p, 0.28 * u); } },
    // escalones (zigurat repetido)
    step: () => { const sw = 10 * u, sh = 7 * u; for (let row = 0, y = h; y > -sh; row++, y -= sh) for (let x = (row % 2 ? sw / 2 : 0) - sw; x < w + sw; x += sw) { const p = P(); p.moveTo(x - sw / 2, y); for (let k = 0; k < 3; k++) { const a = sw / 2 - k * sw / 6, b = y - (k + 1) * sh / 3; p.lineTo(x - a, b); p.lineTo(x - a + sw / 6, b); } p.lineTo(x + sw / 6, y - sh); for (let k = 2; k >= 0; k--) { const a = sw / 2 - k * sw / 6, b = y - (k + 1) * sh / 3; p.lineTo(x + a - sw / 6, b); p.lineTo(x + a, b); } p.lineTo(x + sw / 2, y); p.closePath(); tile(p, tone(pick((row + Math.round(x / sw))), 0.2)); line(p, 0.26 * u); } },
    // rayas verticales con remate en punta
    stripe: () => { const sw = 3.2 * u; for (let i = 0, x = sw / 2; x < w; i++, x += sw) { const p = P(); p.rect(x - sw / 2, 0, sw, h); tile(p, tone(pick(i), 0.16)); const q = P(); q.moveTo(x - sw / 2, 0); q.lineTo(x - sw / 2, h); line(q, 0.22 * u); } }
  };
  const FIELD = { obelisk: 'stripe', scallop: 'scallop', ripple: 'chevron', crystal: 'chevron', sun: 'fan', frond: 'fan', ziggurat: 'step', pine: 'step', reed: 'stripe', wheat: 'stripe' };
  field[FIELD[motif] || 'scallop']();

  // ── 2 · el panel: velo de base, bandas de color como las franjas del proun y marco doble punteado
  const fx = 5 * u, fy = 5 * u, fw = w - 2 * fx, fh = h - 2 * fy;
  { const p = P(); p.rect(fx, fy, fw, fh); C.fillStyle = base; C.globalAlpha = 0.9; C.fill(p); C.globalAlpha = 1; M.fillStyle = '#000'; M.fill(p); }
  const top = fy + 3.4 * u, bot = fy + fh - 3.4 * u, H = bot - top, L = fx + 3.4 * u, R = fx + fw - 3.4 * u;
  // tres franjas verticales muy tenues detrás de todo (el eco del proun)
  [[-1, c2], [0, c1], [1, c3]].forEach(([k, c]) => { const bw = 30 * u, p = P(); p.rect(cx + k * bw - bw / 2, top, bw, H); tile(p, tone(c, 0.12)); });
  { const p = P(); p.rect(fx, fy, fw, fh); line(p, 0.75 * u); const q = P(); q.rect(L - 1.2 * u, top - 1.2 * u, R - L + 2.4 * u, H + 2.4 * u); line(q, 0.32 * u);
    const d = 1.2 * u; dots(fx + d, fy + d, fx + fw - d, fy + d, 1.5 * u, 0.2 * u); dots(fx + d, fy + fh - d, fx + fw - d, fy + fh - d, 1.5 * u, 0.2 * u); dots(fx + d, fy + d, fx + d, fy + fh - d, 1.5 * u, 0.2 * u); dots(fx + fw - d, fy + d, fx + fw - d, fy + fh - d, 1.5 * u, 0.2 * u); }

  // friso de arriba: banda con el motivo del bioma repetido (se dibuja al final, ver 6d)
  const FRIEZE = 8 * u;
  // ── 3 · sol naciente arriba al centro: anillos, rayos densos, zigzag y punteado
  { const r = 24 * u, y = top - 1.2 * u, half = P(); half.moveTo(cx - r, y); half.arc(cx, y, r, 0, Math.PI, false); half.closePath();
    const d = P(); d.arc(cx, y, r, 0, Math.PI); d.closePath(); tile(d, tone(c2, 0.32));
    ring(cx, y, r, 0, Math.PI, 0.55 * u); zig(cx, y, r * 0.86, r * 0.92, 56, 0, Math.PI, 0.22 * u); dotRing(cx, y, r * 0.8, 40, 0.04, Math.PI - 0.04, 0.2 * u);
    rays(cx, y, r * 0.42, r * 0.74, 44, 0.05, Math.PI - 0.05, 0.16 * u); ring(cx, y, r * 0.4, 0, Math.PI, 0.35 * u);
    const core = P(); core.arc(cx, y, r * 0.2, 0, Math.PI); core.closePath(); solid(core); }

  // ── 4 · esquinas de arriba: cuadros rayados en diagonal y abanicos
  mirror(s => {
    const t0 = top + FRIEZE + 1.5 * u, x0 = s > 0 ? R - 12 * u : L, sq = P(); sq.rect(x0, t0, 12 * u, 12 * u); tile(sq, tone(c3, 0.3)); line(sq, 0.35 * u); hatch(sq, 1.25 * u, s > 0 ? Math.PI / 4 : -Math.PI / 4, 0.18 * u, [x0, t0, x0 + 12 * u, t0 + 12 * u]);
    const fxc = s > 0 ? R - 12 * u : L + 12 * u; for (let k = 0; k < 6; k++) ring(fxc, t0 + 12 * u, (11 - k * 1.7) * u, s > 0 ? Math.PI : 0, s > 0 ? Math.PI * 1.5 : -Math.PI / 2, 0.2 * u);
  });

  // ── 5 · soles a medias en las esquinas de abajo, grandes, con mosaico en anillos
  const halfSun = (x, y, r, s) => {
    [[1, c3, 0.5], [0.78, c2, 0.4], [0.56, c1, 0.5], [0.34, c3, 0.3]].forEach(([k, c, t]) => { const p = P(); p.moveTo(x - r * k, y); p.arc(x, y, r * k, Math.PI, 0); p.closePath(); tile(p, tone(c, t)); });
    ring(x, y, r, Math.PI, 0, 0.55 * u); zig(x, y, r * 0.9, r * 0.96, 48, Math.PI, TAU, 0.22 * u); ring(x, y, r * 0.78, Math.PI, 0, 0.3 * u);
    rays(x, y, r * 0.58, r * 0.76, 40, Math.PI, TAU, 0.16 * u); ring(x, y, r * 0.56, Math.PI, 0, 0.3 * u); dotRing(x, y, r * 0.46, 26, Math.PI, TAU, 0.22 * u);
    ring(x, y, r * 0.34, Math.PI, 0, 0.35 * u); const core = P(); core.moveTo(x - r * 0.14, y); core.arc(x, y, r * 0.14, Math.PI, 0); core.closePath(); solid(core);
  };

  // ── 6a · columnas estriadas (estrías densas, remate escalonado y arco interior)
  const column = (x, cw, ch, c) => {
    const y0 = bot, y1 = bot - ch, p = P();
    p.moveTo(x - cw / 2, y0); p.lineTo(x - cw / 2, y1 + cw / 2); p.arc(x, y1 + cw / 2, cw / 2, Math.PI, 0); p.lineTo(x + cw / 2, y0); p.closePath();
    tile(p, tone(c, 0.5)); hatch(p, 0.9 * u, Math.PI / 2, 0.12 * u, [x - cw, y1, x + cw, y0]); line(p, 0.45 * u);
    const inner = archPath(x, y0, cw * 0.56, ch * 0.62); tile(inner, tone(c, 0.75)); line(inner, 0.3 * u);
    for (let k = 1; k < 4; k++) line(archPath(x, y0, cw * 0.56 * (1 - k * 0.22), ch * 0.62 - cw * 0.56 * k * 0.11), 0.2 * u);
    const st = P(); for (let k = 0; k < 3; k++) { const sw = cw * (0.86 - k * 0.24), yy = y1 - k * 1.4 * u; st.rect(x - sw / 2, yy - 1.4 * u, sw, 1.4 * u); } tile(st, tone(c, 0.35)); line(st, 0.28 * u);
  };
  const COLS = [[27, 10, 0.72, c2], [39, 8, 0.6, c1], [49, 6, 0.48, c3]];
  mirror(s => COLS.forEach(([dx, cw, k, c]) => column(cx + s * dx * u, cw * u, H * k, c)));
  // los soles van delante de las columnas
  mirror(s => halfSun(s > 0 ? R - 16 * u : L + 16 * u, bot, 27 * u, s));

  // ── 6b · pilas de arcos concéntricos entre el arco central y las columnas
  mirror(s => { const x = cx + s * 19.5 * u, y = bot; for (let k = 0; k < 6; k++) { const p = archPath(x, y, (9 - k * 1.4) * u, (24 - k * 3) * u); if (k % 2 === 0) tile(p, tone(k % 4 ? c3 : c2, 0.45)); line(p, (k ? 0.22 : 0.4) * u); } dots(x, y - 1.2 * u, x, y - 18 * u, 1.6 * u, 0.18 * u); });

  // ── 6c · arco central: anillos de mosaico alternados, rayado vertical y el medallón
  const aw = 24 * u, ah = H * 0.9;
  { const rings = 6; for (let k = 0; k < rings; k++) { const kw = aw * (1 - k * 0.12), p = archPath(cx, bot, kw, ah - (aw - kw) * 0.5); tile(p, tone(k % 2 ? c1 : c3, k % 2 ? 0.62 : 0.35)); line(p, (k ? 0.24 : 0.7) * u); }
    const core = archPath(cx, bot, aw * 0.28, ah - aw * 0.36); hatch(core, 0.8 * u, Math.PI / 2, 0.1 * u, [cx - aw / 2, top, cx + aw / 2, bot]);
    const my = top + H * 0.47, mr = 7 * u, med = P(); med.arc(cx, my, mr, 0, TAU); tile(med, base); line(med, 0.45 * u); dotRing(cx, my, mr * 0.86, 36, 0, TAU, 0.16 * u);
  }
  // ── 6 · motivo del bioma, a los lados del arco (entre columnas)
  const draw = MOTIF[motif] || MOTIF.scallop;
  // remates: el motivo corona cada columna
  mirror(s => COLS.forEach(([dx, cw, k]) => draw(cx + s * dx * u, bot - H * k - 5 * u, cw * 0.9 * u)));
  // ── 6d · friso: banda arriba con el motivo repetido, cortada por el sol
  { const fy0 = top, band = P(); band.rect(L, fy0, R - L, FRIEZE); C.save(); M.save(); const cut = P(); cut.rect(0, 0, w, h); cut.arc(cx, top - 1.2 * u, 24.6 * u, 0, TAU, true); C.clip(cut, 'evenodd'); M.clip(cut, 'evenodd');
    tile(band, tone(c1, 0.22)); line(band, 0.3 * u); dots(L + 1.5 * u, fy0 + FRIEZE + 1 * u, R - 1.5 * u, fy0 + FRIEZE + 1 * u, 1.5 * u, 0.18 * u);
    for (let x = L + 5 * u; x < R - 2 * u; x += 9 * u) draw(x, fy0 + FRIEZE - 1.2 * u, 5 * u);
    C.restore(); M.restore(); }

  // ── 7 · memento mori, en el medallón del arco, sobre el cráneo de ave
  const mm = MEMENTO(cx, top + H * 0.47, 9 * u); (mm[memento] || mm.hourglass)();
  // cráneo de ave estilizado (el del proun) bajo el emblema: cráneo, órbita y pico
  bird(cx, top + H * 0.72, 7 * u);

  return { color, mask };
}
