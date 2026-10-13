// ══════════════════════════════════════════════════════
// Pórtico griego · pintor de la placa en relieve (relief-plate). Un templo
// visto de frente, de lado a lado de la vista:
//  · cornisa con antemio de oro (palmetas y lotos), dentículos y ovas y
//    dardos,
//  · friso de triglifos y metopas pintadas (azul y rojo, como iba el
//    mármol griego antes de perder el color) con los atributos de Apolo
//    en relieve: el sol al centro, lira, laurel, trípode de Delfos, arco,
//    delfín, cisne y ónfalo,
//  · arquitrabe con meandro de oro y astrágalo,
//  · ocho columnas jónicas con éntasis, veinte estrías, volutas y basa,
//  · gradas con postas (la ola que se enrosca).
// Entre las columnas el lienzo queda transparente: ahí se ve el cielo de
// portico-3d.js, que cambia con la hora.
// La máscara guarda la altura del mármol en R y el oro en G (pen.js).
//   paint({ w, h, marble, vein, pigments: [azul, rojo], gold }) → { color, mask }
// ══════════════════════════════════════════════════════
import { TAU, canvas, mix, pen } from '../relief-plate/pen.js';

// alturas de la máscara: R = altura, G = metal
const hgt = (r, g = 0) => `rgb(${Math.round(r * 255)},${Math.round(g * 255)},0)`;
// semilla fija: el mármol sale igual cada vez (y la caché sirve)
const rand = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(11);

export function paint({ w = 2048, h = 1152, marble = '#EFE8DA', vein = '#9C9488', pigments = ['#1F4F96', '#A84432'], gold = ['#8C6A22', '#E2B95A'] }) {
  const color = canvas(w, h), mask = canvas(w, h);
  const C = color.getContext('2d'), M = mask.getContext('2d');
  const u = h / 100, cx = w / 2;
  C.lineCap = M.lineCap = 'round'; C.lineJoin = M.lineJoin = 'round';
  const g = pen(C, M, { u, w, h, gold }), { P, line, solid, mirror, rays, dots } = g;
  const [blue, red] = pigments;
  const shade = t => mix(marble, '#2A2620', t), lit = t => mix(marble, '#FFFDF7', t);

  // mármol en relieve: color y altura a la vez
  const fill = (path, col, r) => { C.fillStyle = col; C.fill(path); M.fillStyle = hgt(r); M.fill(path); };
  const stroke = (path, lw, col, r) => { C.strokeStyle = col; C.lineWidth = lw; C.stroke(path); M.strokeStyle = hgt(r); M.lineWidth = lw; M.stroke(path); };
  const rect = (x, y, rw, rh) => { const p = P(); p.rect(x, y, rw, rh); return p; };
  // banda redondeada (toro, ovolo): degradado de altura de arriba abajo
  const roundBand = (y0, y1, x0 = 0, x1 = w, lo = 0.45, hi = 0.85) => {
    const p = rect(x0, y0, x1 - x0, y1 - y0), gr = M.createLinearGradient(0, y0, 0, y1);
    for (let i = 0; i <= 8; i++) { const t = i / 8; gr.addColorStop(t, hgt(lo + (hi - lo) * Math.sin(t * Math.PI))); }
    C.fillStyle = marble; C.fill(p); M.fillStyle = gr; M.fill(p);
  };

  // ── 0 · base: todo mármol, a media altura
  fill(rect(0, 0, w, h), marble, 0.5);

  // ── 1 · cornisa (0 a 3.6u) con antemio de oro
  fill(rect(0, 0, w, 3.6 * u), lit(0.25), 0.95);
  stroke((() => { const p = P(); p.moveTo(0, 3.6 * u); p.lineTo(w, 3.6 * u); return p; })(), 0.3 * u, shade(0.25), 0.6);
  for (let i = 0, x = cx % (5 * u) - 5 * u; x < w + 5 * u; i++, x += 2.5 * u) {
    const y = 3.1 * u;
    if (i % 2) rays(x, y, 0.3 * u, 2.2 * u, 6, -Math.PI * 0.85, -Math.PI * 0.15, 0.22 * u); // palmeta
    else { const p = P(); p.moveTo(x, y); p.quadraticCurveTo(x - 1 * u, y - 1.2 * u, x, y - 2.2 * u); p.quadraticCurveTo(x + 1 * u, y - 1.2 * u, x, y); line(p, 0.2 * u); } // loto
  }
  // dentículos (3.6 a 5.6u)
  fill(rect(0, 3.6 * u, w, 2 * u), shade(0.18), 0.42);
  for (let x = cx % (2.4 * u) - 2.4 * u; x < w; x += 2.4 * u) fill(rect(x, 3.6 * u, 1.6 * u, 2 * u), marble, 0.82);
  // ovas y dardos (5.6 a 8.2u)
  roundBand(5.6 * u, 8.2 * u, 0, w, 0.4, 0.62);
  for (let x = cx % (3 * u) - 3 * u; x < w + 3 * u; x += 3 * u) {
    const ey = 6.9 * u, shell = P(); shell.ellipse(x, ey, 1.25 * u, 1.15 * u, 0, 0, TAU);
    fill(shell, shade(0.22), 0.5);
    const egg = P(); egg.ellipse(x, ey + 0.1 * u, 0.95 * u, 0.95 * u, 0, 0, TAU);
    const eg = M.createRadialGradient(x - 0.25 * u, ey - 0.2 * u, 0, x, ey, u); eg.addColorStop(0, hgt(0.92)); eg.addColorStop(1, hgt(0.6));
    C.fillStyle = lit(0.15); C.fill(egg); M.fillStyle = eg; M.fill(egg);
    const dart = P(); dart.moveTo(x + 1.5 * u, 5.8 * u); dart.lineTo(x + 1.5 * u, 7.6 * u); dart.moveTo(x + 1.1 * u, 7.1 * u); dart.lineTo(x + 1.5 * u, 7.9 * u); dart.lineTo(x + 1.9 * u, 7.1 * u); line(dart, 0.2 * u);
  }

  // ── 2 · friso (8.2 a 20.6u): triglifos y metopas
  const fy0 = 8.2 * u, fy1 = 20.6 * u, FH = fy1 - fy0, MW = FH, TW = 6.6 * u, PER = MW + TW;
  fill(rect(0, fy0, w, FH), marble, 0.55);
  const metopes = [];
  for (let k = -5; k <= 5; k++) {
    const mx = cx + k * PER; if (mx + MW / 2 < 0 || mx - MW / 2 > w) continue;
    const ground = rect(mx - MW / 2 + 0.5 * u, fy0 + 0.6 * u, MW - 1 * u, FH - 1.2 * u);
    fill(ground, mix(marble, Math.abs(k) % 2 ? red : blue, 0.62), 0.3);
    metopes.push([mx, Math.abs(k)]);
    // triglifo a la derecha de cada metopa: tres glifos, dos estrías y media estría a cada lado
    const tx = mx + PER / 2, tri = rect(tx - TW / 2, fy0, TW, FH);
    fill(tri, mix(marble, blue, 0.78), 0.82);
    [-1, 1].forEach(s => { const gp = rect(tx + s * TW / 6 - 0.45 * u, fy0 + 1.2 * u, 0.9 * u, FH - 1.2 * u); fill(gp, mix(marble, blue, 0.9), 0.5); });
    [-1, 1].forEach(s => { const gp = rect(tx + s * TW / 2 - (s > 0 ? 0.45 * u : 0), fy0 + 1.2 * u, 0.45 * u, FH - 1.2 * u); fill(gp, mix(marble, blue, 0.9), 0.55); });
  }
  // los atributos de Apolo en las metopas: el sol al centro y los demás en espejo
  const ATTR = ['sun', 'lyre', 'laurel', 'tripod', 'bow', 'dolphin'];
  const fig = (col = lit(0.3)) => ({ f: p => fill(p, col, 0.86), s: (p, lw) => stroke(p, lw, col, 0.86) });
  const SYM = {
    sun: (x, y, s) => { const c = P(); c.arc(x, y, s * 0.2, 0, TAU); solid(c); rays(x, y, s * 0.27, s * 0.44, 24, 0, TAU, 0.24 * u); const r = P(); r.arc(x, y, s * 0.24, 0, TAU); line(r, 0.18 * u); },
    lyre: (x, y, s) => { const { f, s: st } = fig(); const box = P(); box.ellipse(x, y + s * 0.3, s * 0.24, s * 0.12, 0, 0, TAU); f(box);
      const arms = P(); mirror(k => { arms.moveTo(x + k * s * 0.16, y + s * 0.26); arms.bezierCurveTo(x + k * s * 0.42, y + s * 0.05, x + k * s * 0.08, y - s * 0.2, x + k * s * 0.3, y - s * 0.4); }); st(arms, 0.55 * u);
      const bar = P(); bar.moveTo(x - s * 0.3, y - s * 0.3); bar.lineTo(x + s * 0.3, y - s * 0.3); st(bar, 0.4 * u);
      const str = P(); for (let i = -2; i <= 2; i++) { str.moveTo(x + i * s * 0.05, y - s * 0.3); str.lineTo(x + i * s * 0.05, y + s * 0.28); } line(str, 0.1 * u); },
    laurel: (x, y, s) => { const { f, s: st } = fig(); const ring = P(); ring.arc(x, y, s * 0.3, Math.PI * 0.62, Math.PI * 2.38); st(ring, 0.22 * u);
      for (let i = 0; i < 14; i++) { const a = Math.PI * 0.68 + i * (Math.PI * 1.64) / 13, lx = x + Math.cos(a) * s * 0.3, ly = y + Math.sin(a) * s * 0.3; mirror(k => { const leaf = P(); leaf.ellipse(lx + Math.cos(a) * k * s * 0.05, ly + Math.sin(a) * k * s * 0.05, s * 0.07, s * 0.03, a + Math.PI / 2 + k * 0.5, 0, TAU); f(leaf); }); }
      const tie = P(); tie.moveTo(x - s * 0.06, y + s * 0.32); tie.lineTo(x - s * 0.14, y + s * 0.44); tie.moveTo(x + s * 0.06, y + s * 0.32); tie.lineTo(x + s * 0.14, y + s * 0.44); line(tie, 0.16 * u); },
    tripod: (x, y, s) => { const { f, s: st } = fig(); const bowl = P(); bowl.moveTo(x - s * 0.3, y - s * 0.16); bowl.quadraticCurveTo(x, y + s * 0.2, x + s * 0.3, y - s * 0.16); bowl.closePath(); f(bowl);
      const legs = P(); [-1, 0, 1].forEach(k => { legs.moveTo(x + k * s * 0.22, y); legs.lineTo(x + k * s * 0.34, y + s * 0.44); }); st(legs, 0.4 * u);
      mirror(k => g.ring(x + k * s * 0.18, y - s * 0.28, s * 0.08, 0, TAU, 0.16 * u)); },
    bow: (x, y, s) => { const { s: st } = fig(); const arc = P(); arc.moveTo(x - s * 0.1, y - s * 0.42); arc.bezierCurveTo(x + s * 0.34, y - s * 0.3, x + s * 0.34, y + s * 0.3, x - s * 0.1, y + s * 0.42); st(arc, 0.5 * u);
      const cord = P(); cord.moveTo(x - s * 0.1, y - s * 0.42); cord.lineTo(x - s * 0.1, y + s * 0.42); line(cord, 0.1 * u);
      const ar = P(); ar.moveTo(x - s * 0.36, y); ar.lineTo(x + s * 0.4, y); ar.moveTo(x + s * 0.3, y - s * 0.07); ar.lineTo(x + s * 0.4, y); ar.lineTo(x + s * 0.3, y + s * 0.07); line(ar, 0.16 * u); },
    dolphin: (x, y, s) => { const { f } = fig(); const b = P(); b.moveTo(x - s * 0.4, y + s * 0.1); b.bezierCurveTo(x - s * 0.2, y - s * 0.32, x + s * 0.24, y - s * 0.3, x + s * 0.4, y + s * 0.02); b.lineTo(x + s * 0.3, y + s * 0.06); b.bezierCurveTo(x + s * 0.12, y - s * 0.12, x - s * 0.16, y - s * 0.08, x - s * 0.32, y + s * 0.16); b.closePath(); f(b);
      const fin = P(); fin.moveTo(x - s * 0.02, y - s * 0.2); fin.lineTo(x + s * 0.06, y - s * 0.34); fin.lineTo(x + s * 0.12, y - s * 0.18); fin.closePath(); f(fin);
      const tail = P(); tail.moveTo(x - s * 0.36, y + s * 0.13); tail.lineTo(x - s * 0.48, y + s * 0.02); tail.lineTo(x - s * 0.44, y + s * 0.26); tail.closePath(); f(tail);
      const sea = P(); for (let i = 0; i < 3; i++) { sea.moveTo(x - s * 0.4 + i * s * 0.28, y + s * 0.38); sea.quadraticCurveTo(x - s * 0.26 + i * s * 0.28, y + s * 0.3, x - s * 0.12 + i * s * 0.28, y + s * 0.38); } line(sea, 0.14 * u); }
  };
  metopes.forEach(([mx, k]) => (SYM[ATTR[k % ATTR.length]])(mx, (fy0 + fy1) / 2, MW * 0.92));
  // tenia y gotas bajo el friso
  fill(rect(0, fy1, w, 0.9 * u), lit(0.2), 0.7);
  for (let k = -6; k <= 6; k++) { const tx = cx + k * PER + PER / 2; dots(tx - TW / 2 + 0.7 * u, fy1 + 1.4 * u, tx + TW / 2 - 0.7 * u, fy1 + 1.4 * u, 1.04 * u, 0.32 * u); }

  // ── 3 · arquitrabe (21.5 a 29u): meandro de oro sobre azul, astrágalo
  const ay0 = 21.5 * u, ay1 = 29 * u;
  fill(rect(0, fy1 + 0.9 * u, w, ay0 - fy1), shade(0.1), 0.48);
  fill(rect(0, ay0, w, ay1 - ay0), marble, 0.62);
  const ky = 22.6 * u, kh = 4.4 * u, step = kh / 10;
  fill(rect(0, ky - 0.4 * u, w, kh + 0.8 * u), mix(marble, blue, 0.7), 0.5);
  { const p = P(); const pts = [[0, 10], [0, 0], [8, 0], [8, 6], [4, 6], [4, 4], [6, 4], [6, 2], [2, 2], [2, 8], [10, 8], [10, 10]];
    for (let x0 = cx % (10 * step) - 10 * step; x0 < w + 10 * step; x0 += 10 * step) pts.forEach(([a, b], i) => (i ? p.lineTo : p.moveTo).call(p, x0 + a * step, ky + b * step));
    line(p, 0.32 * u); }
  { const p = P(); p.moveTo(0, ky - 0.4 * u); p.lineTo(w, ky - 0.4 * u); p.moveTo(0, ky + kh + 0.4 * u); p.lineTo(w, ky + kh + 0.4 * u); line(p, 0.22 * u); }
  roundBand(27.6 * u, ay1, 0, w, 0.5, 0.8); // astrágalo: cuentas y carretes
  for (let x = cx % (2 * u); x < w; x += 2 * u) { const b = P(); b.ellipse(x, 28.3 * u, 0.62 * u, 0.5 * u, 0, 0, TAU); fill(b, lit(0.2), 0.9); }

  // ── 4 · el claro entre columnas: transparente (ahí va el cielo)
  const cy0 = ay1, cy1 = 86 * u;
  C.clearRect(0, cy0, w, cy1 - cy0); M.fillStyle = hgt(0); M.fillRect(0, cy0, w, cy1 - cy0);
  // sombra del arquitrabe sobre sí mismo (oclusión pintada)
  { const gr = C.createLinearGradient(0, ay1 - 1.6 * u, 0, ay1); gr.addColorStop(0, 'rgba(40,34,26,0)'); gr.addColorStop(1, 'rgba(40,34,26,.28)'); C.fillStyle = gr; C.fillRect(0, ay1 - 1.6 * u, w, 1.6 * u); }

  // ── 5 · columnas jónicas
  const D = 7.4 * u, capY = cy0, shaftTop = cy0 + 5.2 * u, baseTop = cy1 - 3.6 * u;
  const COLS = [12, 34, 56, 78].flatMap(d => [cx - d * u, cx + d * u]);
  const column = x => {
    // fuste con éntasis: más ancho abajo, una curva leve
    const top = D * 0.42, bot = D * 0.5, shaft = P();
    shaft.moveTo(x - top, shaftTop);
    for (let i = 0; i <= 12; i++) { const t = i / 12, r = top + (bot - top) * t + Math.sin(t * Math.PI) * 0.012 * D * 4; shaft.lineTo(x - r, shaftTop + (baseTop - shaftTop) * t); }
    for (let i = 12; i >= 0; i--) { const t = i / 12, r = top + (bot - top) * t + Math.sin(t * Math.PI) * 0.012 * D * 4; shaft.lineTo(x + r, shaftTop + (baseTop - shaftTop) * t); }
    shaft.closePath();
    // relieve cilíndrico: la altura sigue el perfil de un cilindro
    const gr = M.createLinearGradient(x - bot, 0, x + bot, 0);
    for (let i = 0; i <= 16; i++) { const t = i / 16, c = t * 2 - 1; gr.addColorStop(t, hgt(0.22 + 0.78 * Math.sqrt(Math.max(0, 1 - c * c)))); }
    C.fillStyle = marble; C.fill(shaft); M.fillStyle = gr; M.fill(shaft);
    // estrías: surcos que bajan la altura (multiplicar solo toca R)
    M.save(); C.save(); M.clip(shaft); C.clip(shaft);
    M.globalCompositeOperation = 'multiply'; M.strokeStyle = 'rgb(165,255,255)';
    C.strokeStyle = shade(0.2); C.globalAlpha = 0.5;
    for (let f = 0; f < 20; f++) { const a = (f + 0.5) / 20 * TAU; if (Math.cos(a) < -0.05) continue; // solo las de la cara visible
      const k = Math.sin(a), lw = 0.62 * u * Math.cos(a) + 0.1 * u, q = P(); q.moveTo(x + k * top, shaftTop); q.lineTo(x + k * bot, baseTop);
      M.lineWidth = lw; M.stroke(q); C.lineWidth = lw * 0.5; C.stroke(q); }
    M.restore(); C.restore();
    // capitel: ábaco, equino con ovas y dos volutas con su canal
    const abacus = rect(x - D * 0.62, capY, D * 1.24, 1 * u); fill(abacus, lit(0.15), 0.9);
    const ech = P(); ech.moveTo(x - D * 0.86, capY + 1 * u); ech.quadraticCurveTo(x, capY + 3.4 * u, x + D * 0.86, capY + 1 * u); ech.lineTo(x + D * 0.86, capY + 2.3 * u); ech.quadraticCurveTo(x, capY + 5.2 * u, x - D * 0.86, capY + 2.3 * u); ech.closePath();
    fill(ech, marble, 0.78);
    for (let k = -1; k <= 1; k++) { const e = P(); e.ellipse(x + k * D * 0.28, capY + 3.2 * u, 0.7 * u, 0.85 * u, 0, 0, TAU); fill(e, lit(0.1), 0.92); }
    mirror(s => {
      const vx = x + s * D * 0.72, vy = capY + 2.7 * u, R = 1.9 * u, sp = P();
      for (let i = 0; i <= 60; i++) { const t = i / 60, a = -Math.PI / 2 + s * t * Math.PI * 2.6, r = R * (1 - t * 0.82); (i ? sp.lineTo : sp.moveTo).call(sp, vx + Math.cos(a) * r * s, vy + Math.sin(a) * r); }
      const disc = P(); disc.arc(vx, vy, R, 0, TAU); fill(disc, marble, 0.72); stroke(sp, 0.42 * u, shade(0.22), 0.95);
      const eye = P(); eye.arc(vx, vy, 0.34 * u, 0, TAU); solid(eye);
    });
    // basa: toro, escocia y toro
    roundBand(baseTop, baseTop + 1.4 * u, x - D * 0.62, x + D * 0.62, 0.5, 0.95);
    fill(rect(x - D * 0.56, baseTop + 1.4 * u, D * 1.12, 0.8 * u), shade(0.18), 0.55);
    roundBand(baseTop + 2.2 * u, cy1, x - D * 0.7, x + D * 0.7, 0.55, 1);
  };
  COLS.forEach(column);

  // ── 6 · gradas (86u al pie) con postas en la de arriba
  [[86, 90.6, 0.86], [90.6, 95.2, 0.74], [95.2, 100, 0.62]].forEach(([a, b, r], i) => {
    fill(rect(0, a * u, w, (b - a) * u), i ? shade(0.06 * i) : lit(0.12), r);
    stroke((() => { const p = P(); p.moveTo(0, a * u + 0.2 * u); p.lineTo(w, a * u + 0.2 * u); return p; })(), 0.35 * u, lit(0.35), r + 0.12);
  });
  { const y = 88.4 * u, r = 1.15 * u, per = 4.6 * u, p = P();
    for (let x = cx % per - per; x < w + per; x += per) {
      p.moveTo(x, y + r); p.bezierCurveTo(x + per * 0.35, y + r, x + per * 0.3, y - r, x + per * 0.62, y - r);
      for (let i = 0; i <= 24; i++) { const t = i / 24, a = -Math.PI / 2 + t * Math.PI * 1.7, rr = r * (1 - t * 0.6); p.lineTo(x + per * 0.62 + Math.cos(a) * rr, y + Math.sin(a) * rr + 0 * r); }
    }
    line(p, 0.28 * u); }

  // ── 7 · vetas del mármol: solo color, solo donde hay piedra
  C.save(); C.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 70; i++) {
    let x = rand() * w, y = rand() * h, a = rand() * TAU; const p = P(); p.moveTo(x, y);
    for (let s = 0; s < 40; s++) { a += (rand() - 0.5) * 0.7; x += Math.cos(a) * u * 0.9; y += Math.sin(a) * u * 0.5; p.lineTo(x, y); }
    C.strokeStyle = vein; C.globalAlpha = 0.05 + rand() * 0.1; C.lineWidth = (0.06 + rand() * 0.18) * u; C.stroke(p);
  }
  C.restore();

  return { color, mask };
}
