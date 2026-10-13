// ══════════════════════════════════════════════════════
// Arte de las cartas · con el mismo pincel deco del tapiz (pen), así que
// cada carta trae su lienzo de color y su máscara de oro (para el oro en
// relieve en Three.js, o plana en el DOM).
//  · arcana: los 22 arcanos mayores, cada uno con su símbolo geométrico,
//    número romano arriba y nombre abajo; fondo con las tres franjas del
//    bioma (como el proun) y el cráneo de ave al pie.
//  · pip: cartas de palo (1 a 10) con el motivo del bioma como pinta.
//  · face: J, Q y K en espejo, como las figuras de póker.
//  · back: el dorso, con el cráneo de ave como sello al centro.
//  · section: las cartas de la mano de navegación (número y título).
//   card({ kind, n, title, biome, night, w, h }) → { color, mask }
// Los títulos van en Grenadier NF (trae acentos); los números, en Busorama.
// ══════════════════════════════════════════════════════
import { canvas, pen } from './deco-pattern.js';
import { ARCANA, roman } from './biomes.js';

const TAU = Math.PI * 2;
const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a, b, t) => { const x = hex(a), y = hex(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`; };
export const PALETTE = night => ({ base: night ? '#14131A' : '#F1EADC', ink: night ? '#EEE6D3' : '#1C1814', gold: night ? ['#B8913E', '#F2D894'] : ['#8C6A22', '#C9A04A'] });

// símbolo de cada arcano, centrado en (x, y) con tamaño s
function symbol(k, n, x, y, s) {
  const { line, solid, P, mirror } = k, u = s / 10, lw = 0.55 * u;
  const star = (cx, cy, r0, r1, pts, rot = -Math.PI / 2) => { const p = P(); for (let i = 0; i <= pts * 2; i++) { const a = rot + i * Math.PI / pts, r = i % 2 ? r0 : r1; i ? p.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : p.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } return p; };
  const circ = (cx, cy, r) => { const p = P(); p.arc(cx, cy, r, 0, TAU); return p; };
  const S = [
    () => { const p = P(); p.moveTo(x - s * 0.5, y + s * 0.3); for (let i = 0; i < 5; i++) p.lineTo(x - s * 0.5 + (i + 0.5) * s / 5, y + (i % 2 ? 0.3 : -0.1) * s); p.lineTo(x + s * 0.5, y + s * 0.3); line(p, lw); solid(circ(x + s * 0.3, y - s * 0.35, s * 0.1)); }, // 0 Loco: camino en zigzag y el sol
    () => { const p = P(); for (let i = 0; i <= 64; i++) { const t = i / 64 * TAU, d = 1 + Math.sin(t) ** 2; const px = x + s * 0.45 * Math.cos(t) / d, py = y + s * 0.45 * Math.sin(t) * Math.cos(t) / d; i ? p.lineTo(px, py) : p.moveTo(px, py); } line(p, lw); }, // 1 Mago: lemniscata
    () => { const p = P(); mirror(sg => { p.rect(x + sg * s * 0.32 - s * 0.06, y - s * 0.45, s * 0.12, s * 0.9); }); line(p, lw); const m = P(); m.arc(x, y, s * 0.2, Math.PI * 0.3, Math.PI * 1.7); m.arc(x + s * 0.08, y, s * 0.16, Math.PI * 1.65, Math.PI * 0.35, true); solid(m); }, // 2 Sacerdotisa: columnas y luna
    () => { line(circ(x, y - s * 0.12, s * 0.24), lw); const p = P(); p.moveTo(x, y + s * 0.12); p.lineTo(x, y + s * 0.5); p.moveTo(x - s * 0.16, y + s * 0.32); p.lineTo(x + s * 0.16, y + s * 0.32); line(p, lw); }, // 3 Emperatriz
    () => { const p = P(); for (let i = 0; i < 4; i++) { const ww = s * (0.5 - i * 0.1); p.rect(x - ww, y + s * 0.4 - (i + 1) * s * 0.2, 2 * ww, s * 0.2); } line(p, lw); }, // 4 Emperador: zigurat
    () => { const p = P(); p.moveTo(x, y - s * 0.5); p.lineTo(x, y + s * 0.5); [-0.3, -0.1, 0.1].forEach((d, i) => { const ww = s * (0.14 + i * 0.08); p.moveTo(x - ww, y + d * s); p.lineTo(x + ww, y + d * s); }); line(p, lw); }, // 5 Hierofante: cruz triple
    () => { line(circ(x - s * 0.14, y, s * 0.26), lw); line(circ(x + s * 0.14, y, s * 0.26), lw); }, // 6 Enamorados
    () => { const p = P(); p.moveTo(x - s * 0.45, y - s * 0.1); p.lineTo(x, y - s * 0.45); p.lineTo(x + s * 0.45, y - s * 0.1); p.rect(x - s * 0.35, y - s * 0.1, s * 0.7, s * 0.3); line(p, lw); mirror(sg => { const c = circ(x + sg * s * 0.25, y + s * 0.35, s * 0.13); line(c, lw); }); }, // 7 Carro
    () => { line(circ(x, y, s * 0.42), lw); line(circ(x, y, s * 0.26), lw); solid(circ(x, y, s * 0.1)); }, // 8 Fuerza
    () => { const p = P(); p.rect(x - s * 0.18, y - s * 0.3, s * 0.36, s * 0.55); p.moveTo(x - s * 0.24, y - s * 0.3); p.lineTo(x, y - s * 0.5); p.lineTo(x + s * 0.24, y - s * 0.3); line(p, lw); const f = P(); f.moveTo(x, y - s * 0.18); f.quadraticCurveTo(x + s * 0.1, y, x, y + s * 0.1); f.quadraticCurveTo(x - s * 0.1, y, x, y - s * 0.18); solid(f); }, // 9 Ermitaño: farol
    () => { line(circ(x, y, s * 0.45), lw); line(circ(x, y, s * 0.16), lw); const p = P(); for (let i = 0; i < 8; i++) { const a = i * TAU / 8; p.moveTo(x + Math.cos(a) * s * 0.16, y + Math.sin(a) * s * 0.16); p.lineTo(x + Math.cos(a) * s * 0.45, y + Math.sin(a) * s * 0.45); } line(p, lw); }, // 10 Rueda
    () => { const p = P(); p.moveTo(x, y - s * 0.5); p.lineTo(x, y + s * 0.45); p.moveTo(x - s * 0.42, y - s * 0.3); p.lineTo(x + s * 0.42, y - s * 0.3); mirror(sg => { p.moveTo(x + sg * s * 0.42, y - s * 0.3); p.lineTo(x + sg * s * 0.28, y + s * 0.05); p.moveTo(x + sg * s * 0.42, y - s * 0.3); p.lineTo(x + sg * s * 0.56, y + s * 0.05); p.moveTo(x + sg * s * 0.26, y + s * 0.05); p.arc(x + sg * s * 0.42, y + s * 0.05, s * 0.16, Math.PI, 0, true); }); p.moveTo(x - s * 0.2, y + s * 0.45); p.lineTo(x + s * 0.2, y + s * 0.45); line(p, lw); }, // 11 Justicia: balanza
    () => { const p = P(); p.moveTo(x - s * 0.4, y - s * 0.45); p.lineTo(x + s * 0.4, y - s * 0.45); p.moveTo(x, y - s * 0.45); p.lineTo(x, y - s * 0.1); p.moveTo(x - s * 0.25, y - s * 0.1); p.lineTo(x + s * 0.25, y - s * 0.1); p.lineTo(x, y + s * 0.4); p.closePath(); line(p, lw); }, // 12 Colgado: triángulo invertido
    () => k.MEMENTO(x, y, s * 0.9).skull(), // 13 Muerte
    () => k.MEMENTO(x, y, s * 0.85).hourglass(), // 14 Templanza
    () => { line(star(x, y + s * 0.05, s * 0.2, s * 0.48, 5, Math.PI / 2), lw); }, // 15 Diablo: estrella invertida
    () => { const p = P(); p.rect(x - s * 0.18, y - s * 0.3, s * 0.36, s * 0.75); for (let i = 0; i < 3; i++) p.rect(x - s * 0.22 + i * s * 0.16, y - s * 0.42, s * 0.12, s * 0.12); line(p, lw); const b = P(); b.moveTo(x + s * 0.45, y - s * 0.5); b.lineTo(x + s * 0.2, y - s * 0.2); b.lineTo(x + s * 0.32, y - s * 0.2); b.lineTo(x + s * 0.1, y + s * 0.05); line(b, lw * 0.8); }, // 16 Torre con rayo
    () => { solid(star(x, y, s * 0.12, s * 0.48, 8)); }, // 17 Estrella
    () => { const m = P(); m.arc(x, y, s * 0.36, Math.PI * 0.35, Math.PI * 1.65); m.arc(x + s * 0.14, y, s * 0.3, Math.PI * 1.55, Math.PI * 0.45, true); solid(m); const r = P(); for (let i = 0; i < 9; i++) { const a = -Math.PI * 0.4 + i * Math.PI * 0.1; r.moveTo(x + Math.cos(a) * s * 0.42, y + Math.sin(a) * s * 0.42); r.lineTo(x + Math.cos(a) * s * 0.52, y + Math.sin(a) * s * 0.52); } line(r, lw * 0.6); }, // 18 Luna
    () => { solid(circ(x, y, s * 0.2)); const r = P(); for (let i = 0; i < 24; i++) { const a = i * TAU / 24; r.moveTo(x + Math.cos(a) * s * 0.28, y + Math.sin(a) * s * 0.28); r.lineTo(x + Math.cos(a) * s * (i % 2 ? 0.4 : 0.5), y + Math.sin(a) * s * (i % 2 ? 0.4 : 0.5)); } line(r, lw * 0.7); }, // 19 Sol
    () => { const p = P(); p.moveTo(x - s * 0.4, y + s * 0.2); p.lineTo(x + s * 0.3, y - s * 0.3); p.lineTo(x + s * 0.45, y - s * 0.45); p.moveTo(x + s * 0.3, y - s * 0.3); p.lineTo(x + s * 0.4, y - s * 0.12); for (let i = 0; i < 5; i++) { p.moveTo(x - s * 0.4 + i * s * 0.2, y + s * 0.5); p.lineTo(x - s * 0.4 + i * s * 0.2, y + s * 0.32); } line(p, lw); }, // 20 Juicio: trompeta
    () => { const p = P(); p.ellipse(x, y, s * 0.28, s * 0.42, 0, 0, TAU); line(p, lw); [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]].forEach(([a, b]) => solid(circ(x + a * s, y + b * s, s * 0.06))); } // 21 Mundo
  ];
  (S[n] || S[0])();
}

// marco común: borde redondeado, borde interior con punteado, abanicos en las esquinas
function frame(k, w, h, u) {
  const { line, P, dots, ring } = k, r = 3 * u, p = P();
  p.roundRect(1.4 * u, 1.4 * u, w - 2.8 * u, h - 2.8 * u, r); line(p, 0.7 * u);
  const q = P(); q.rect(4 * u, 4 * u, w - 8 * u, h - 8 * u); line(q, 0.35 * u);
  dots(5.6 * u, 5.6 * u, w - 5.6 * u, 5.6 * u, 1.6 * u, 0.22 * u); dots(5.6 * u, h - 5.6 * u, w - 5.6 * u, h - 5.6 * u, 1.6 * u, 0.22 * u);
  [[4, 4, 0, Math.PI / 2], [w / u - 4, 4, Math.PI / 2, Math.PI], [4, h / u - 4, -Math.PI / 2, 0], [w / u - 4, h / u - 4, Math.PI, Math.PI * 1.5]].forEach(([cx, cy, a0, a1]) => { for (let i = 0; i < 4; i++) ring(cx * u, cy * u, (6 - i * 1.4) * u, a0, a1, 0.22 * u); });
}

export function card({ kind = 'arcana', n = 0, title = '', biome, night = true, w = 512, h = 896 }) {
  const color = canvas(w, h), mask = canvas(w, h), C = color.getContext('2d'), M = mask.getContext('2d');
  const pal = PALETTE(night), cols = biome[night ? 'night' : 'day'], u = w / 60, cx = w / 2;
  C.fillStyle = pal.base; C.fillRect(0, 0, w, h); M.fillStyle = '#000'; M.fillRect(0, 0, w, h);
  C.lineCap = M.lineCap = 'round'; C.lineJoin = M.lineJoin = 'round';
  const k = pen(C, M, { u, w, h, gold: pal.gold }), { line, solid, tile, P, mirror, dots, archPath, hatch, rays, ring } = k;
  const tone = (c, t) => mix(pal.base, c, t);
  const text = (s, y, size, font, align = 'center') => { C.font = `${size}px ${font}`; C.textAlign = align; C.textBaseline = 'middle'; const g = C.createLinearGradient(0, y - size, 0, y + size); g.addColorStop(0, pal.gold[1]); g.addColorStop(1, pal.gold[0]); C.fillStyle = g; C.fillText(s, cx, y); M.font = C.font; M.textAlign = align; M.textBaseline = 'middle'; M.fillStyle = '#fff'; M.fillText(s, cx, y); };
  const fit = (s, max, size, font) => { C.font = `${size}px ${font}`; while (C.measureText(s).width > max && size > 8) { size -= 1; C.font = `${size}px ${font}`; } return size; };
  // fondo: las tres franjas del bioma
  const bands = () => { const bw = (w - 8 * u) / 3; cols.forEach((c, i) => { const p = P(); p.rect(4 * u + i * bw, 4 * u, bw, h - 8 * u); tile(p, tone(c, night ? 0.32 : 0.28)); }); };

  if (kind === 'back') {
    bands();
    const p = P(); p.rect(4 * u, 4 * u, w - 8 * u, h - 8 * u); hatch(p, 2.2 * u, Math.PI / 4, 0.16 * u); hatch(p, 2.2 * u, -Math.PI / 4, 0.16 * u);
    const d = P(); d.moveTo(cx, 14 * u); d.lineTo(w - 12 * u, h / 2); d.lineTo(cx, h - 14 * u); d.lineTo(12 * u, h / 2); d.closePath(); tile(d, pal.base); line(d, 0.6 * u);
    for (let i = 1; i < 4; i++) { const q = P(), s = 1 - i * 0.18; q.moveTo(cx, h / 2 - (h / 2 - 14 * u) * s); q.lineTo(cx + (w / 2 - 12 * u) * s, h / 2); q.lineTo(cx, h / 2 + (h / 2 - 14 * u) * s); q.lineTo(cx - (w / 2 - 12 * u) * s, h / 2); q.closePath(); line(q, 0.25 * u); }
    rays(cx, h / 2, 9 * u, 14 * u, 36, 0, TAU, 0.2 * u); const c = P(); c.arc(cx, h / 2, 8 * u, 0, TAU); tile(c, pal.base); line(c, 0.5 * u);
    k.bird(cx - 1 * u, h / 2 - 0.5 * u, 5.5 * u); // el cráneo del gabinete como sello
    frame(k, w, h, u);
    return { color, mask };
  }

  bands();
  // arco central con anillos y rayado
  const top = 14 * u, bot = h - 18 * u, aw = w - 22 * u;
  for (let i = 0; i < 3; i++) { const kw = aw * (1 - i * 0.16), a = archPath(cx, bot, kw, bot - top - i * 2 * u); tile(a, tone(cols[i % 3], night ? 0.55 - i * 0.1 : 0.45)); line(a, (i ? 0.25 : 0.55) * u); }
  rays(cx, top + aw * 0.42, aw * 0.18, aw * 0.36, 20, Math.PI * 1.08, Math.PI * 1.92, 0.18 * u);

  if (kind === 'arcana') {
    text(roman(n), 9 * u, 4.6 * u, '"Busorama", sans-serif');
    symbol(k, n, cx, h * 0.45, 26 * u);
    k.bird(cx - 1 * u, h - 27 * u, 5 * u);
    const name = title || ARCANA[n]; text(name, h - 10.5 * u, fit(name, w - 18 * u, 5.4 * u, '"Grenadier NF", serif'), '"Grenadier NF", serif');
  } else if (kind === 'pip' || kind === 'face') {
    // índices de esquina: el rango y una pinta chica, arriba a la izquierda y (de cabeza) abajo a la derecha
    const R = kind === 'face' ? { 11: 'J', 12: 'Q', 13: 'K' }[n] : n === 1 ? 'A' : String(n), draw = k.MOTIF[biome.motif];
    const corner = flip => { C.save(); M.save(); if (flip) { [C, M].forEach(x => { x.translate(w, h); x.rotate(Math.PI); }); }
      const f = '"Busorama", sans-serif'; [C, M].forEach((x, mi) => { x.font = `${6 * u}px ${f}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = mi ? '#fff' : pal.gold[1]; x.fillText(R, 9 * u, 11 * u); });
      draw(9 * u, 20 * u, 4.2 * u); C.restore(); M.restore(); };
    corner(false); corner(true);
    if (kind === 'pip') {
      // pintas en dos columnas dentro del arco, en espejo como en una baraja
      const spots = { 1: [[0, 0]], 2: [[0, -1], [0, 1]], 3: [[0, -1], [0, 0], [0, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]], 7: [[-1, -1], [1, -1], [0, -0.5], [-1, 0], [1, 0], [-1, 1], [1, 1]], 8: [[-1, -1], [1, -1], [0, -0.5], [-1, 0], [1, 0], [0, 0.5], [-1, 1], [1, 1]], 9: [[-1, -1], [1, -1], [-1, -0.33], [1, -0.33], [0, 0], [-1, 0.33], [1, 0.33], [-1, 1], [1, 1]], 10: [[-1, -1], [1, -1], [0, -0.66], [-1, -0.33], [1, -0.33], [-1, 0.33], [1, 0.33], [0, 0.66], [-1, 1], [1, 1]] }[n] || [[0, 0]];
      const sz = n === 1 ? 22 * u : 9 * u, cy = h * 0.5;
      spots.forEach(([a, b]) => { const x = cx + a * 10 * u, y = cy + b * 24 * u; C.save(); M.save(); if (b > 0) { [C, M].forEach(c => { c.translate(x, y); c.rotate(Math.PI); c.translate(-x, -y); }); } draw(x, y + sz * 0.45, sz); C.restore(); M.restore(); });
      if (n === 1) { const r = P(); r.arc(cx, cy, 15 * u, 0, TAU); line(r, 0.4 * u); k.dotRing(cx, cy, 13 * u, 40, 0, TAU, 0.22 * u); }
    } else {
      // figura en espejo: corona, cráneo de ave de perfil y gola en abanico; la otra mitad de cabeza
      const half = flip => { C.save(); M.save(); if (flip) [C, M].forEach(x => { x.translate(w, h); x.rotate(Math.PI); });
        const y0 = h * 0.135, cr = P();
        if (n === 13) { cr.moveTo(cx - 9 * u, y0 + 4 * u); for (let i = 0; i <= 8; i++) cr.lineTo(cx - 9 * u + i * 18 * u / 8, y0 + (i % 2 ? -1 : -5.5) * u); cr.lineTo(cx + 9 * u, y0 + 4 * u); cr.closePath(); }
        else if (n === 12) { cr.moveTo(cx - 9 * u, y0 + 4 * u); for (let i = 0; i < 3; i++) cr.arc(cx - 6 * u + i * 6 * u, y0, 3 * u, Math.PI, 0); cr.lineTo(cx + 9 * u, y0 + 4 * u); cr.closePath(); }
        else { cr.moveTo(cx - 8 * u, y0 + 4 * u); cr.quadraticCurveTo(cx - 6 * u, y0 - 4 * u, cx + 4 * u, y0 - 2 * u); cr.lineTo(cx + 8 * u, y0 + 4 * u); cr.closePath(); }
        tile(cr, tone(cols[0], 0.8)); line(cr, 0.5 * u); if (n === 11) { const f = P(); f.moveTo(cx + 3 * u, y0 - 1 * u); f.quadraticCurveTo(cx + 9 * u, y0 - 6 * u, cx + 11 * u, y0 - 9 * u); line(f, 0.4 * u); }
        k.bird(cx - 2 * u, h * 0.275, 7.5 * u);
        const gy = h * 0.47, g = P(); g.moveTo(cx - 12 * u, gy); g.arc(cx, gy, 12 * u, Math.PI, 0); g.closePath(); tile(g, tone(cols[1], 0.75)); line(g, 0.45 * u);
        k.rays(cx, gy, 5 * u, 11 * u, 16, Math.PI, TAU, 0.18 * u); k.ring(cx, gy, 5 * u, Math.PI, 0, 0.35 * u);
        draw(cx - 16 * u, gy - 1 * u, 4.5 * u);
        C.restore(); M.restore(); };
      half(false); half(true);
      const d = P(); d.moveTo(6 * u, h * 0.53); d.lineTo(w - 6 * u, h * 0.47); line(d, 0.4 * u);
      const med = P(); med.arc(cx, h / 2, 6 * u, 0, TAU); tile(med, pal.base); line(med, 0.45 * u);
      text(R, h / 2 + 0.4 * u, 6 * u, '"Busorama", sans-serif');
    }
    text(biome.suit, h - 10.5 * u, fit(biome.suit, w - 26 * u, 4.6 * u, '"Grenadier NF", serif'), '"Grenadier NF", serif');
  } else if (kind === 'section') {
    text(roman(n), 10 * u, 5.4 * u, '"Busorama", sans-serif');
    k.MOTIF[biome.motif](cx, h * 0.52, 20 * u);
    const t = title.toUpperCase(); text(t, h - 11 * u, fit(t, w - 16 * u, 6.4 * u, '"Grenadier NF", serif'), '"Grenadier NF", serif');
  }
  frame(k, w, h, u);
  return { color, mask };
}
