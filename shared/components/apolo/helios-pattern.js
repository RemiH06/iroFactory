// ══════════════════════════════════════════════════════
// El paño de Helios · pintor de la placa en relieve (relief-plate) para
// apolo. Mármol oscuro pulido y veteado (verde antico de día, pórfido de
// atardecer) con el ornamento griego embutido en oro:
//  · arriba y abajo, bandas de meandro con ovas y dardos (arriba) y la
//    ola que se enrosca (abajo); a los lados, un meandro vertical,
//  · dos cadenas de antemio (palmetas y lotos unidos por volutas),
//  · al centro el óculo de Helios: una ventana redonda coronada de rayos
//    rectos y ondulados como llamas y un anillo de laurel; dentro no hay
//    piedra, se ve el cielo de la hora (helios-3d.js),
//  · a los lados, dos estelas con medallones de otra piedra (rojo antiguo
//    sobre el verde, verde sobre el pórfido): lira y trípode de Delfos,
//    con laurel y palmetas,
//  · rosetas sueltas en retícula.
// La máscara: el oro alto y metálico (blanco), la piedra a media altura y
// mate en la máscara (el pulido lo pone el material), el óculo vacío.
//   paint({ w, h, stone, deep, vein, inlay, gold }) → { color, mask }
// ══════════════════════════════════════════════════════
import { TAU, canvas, mix, pen } from '../relief-plate/pen.js';

const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

export function paint({ w = 2048, h = 1152, stone = '#1F3B33', deep = '#10221D', vein = '#CFDCCB', inlay = '#6E2A24', gold = ['#8C6A22', '#EBCB74'] }) {
  const color = canvas(w, h), mask = canvas(w, h);
  const C = color.getContext('2d'), M = mask.getContext('2d');
  const u = h / 100, cx = w / 2, cy = 50 * u, rand = rng(23);
  C.lineCap = M.lineCap = 'round'; C.lineJoin = M.lineJoin = 'round';
  const G = pen(C, M, { u, w, h, gold }), { P, line, solid, mirror, dots, ring, rays, dotRing } = G;
  const flat = (path, col) => { C.fillStyle = col; C.fill(path); M.fillStyle = 'rgb(128,0,0)'; M.fill(path); };
  const rect = (x, y, rw, rh) => { const p = P(); p.rect(x, y, rw, rh); return p; };
  const circle = (x, y, r) => { const p = P(); p.arc(x, y, r, 0, TAU); return p; };

  // ── 0 · la piedra: base con nubes de color y vetas que se ramifican
  { const g = C.createRadialGradient(cx, cy, 10 * u, cx, cy, 110 * u); g.addColorStop(0, mix(stone, vein, 0.06)); g.addColorStop(1, deep); C.fillStyle = g; C.fillRect(0, 0, w, h); }
  M.fillStyle = 'rgb(128,0,0)'; M.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) { const x = rand() * w, y = rand() * h, r = (2 + rand() * 9) * u; const g = C.createRadialGradient(x, y, 0, x, y, r); const c = rand() < 0.5 ? deep : mix(stone, vein, 0.12); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); C.globalAlpha = 0.25 + rand() * 0.3; C.fillStyle = g; C.fillRect(x - r, y - r, 2 * r, 2 * r); }
  C.globalAlpha = 1;
  const vein1 = (x, y, a, len, wd, alpha, depth) => {
    const p = P(); p.moveTo(x, y);
    for (let s = 0; s < len; s++) {
      a += (rand() - 0.5) * 0.5; x += Math.cos(a) * 0.9 * u; y += Math.sin(a) * 0.9 * u; p.lineTo(x, y);
      if (depth < 2 && rand() < 0.035) vein1(x, y, a + (rand() < 0.5 ? -1 : 1) * (0.5 + rand() * 0.6), len * 0.45 | 0, wd * 0.6, alpha * 0.8, depth + 1);
    }
    C.strokeStyle = vein; C.globalAlpha = alpha * 0.25; C.lineWidth = wd * 5; C.stroke(p); // halo blando
    C.globalAlpha = alpha; C.lineWidth = wd; C.stroke(p); C.globalAlpha = 1;
  };
  for (let i = 0; i < 16; i++) vein1(rand() * w, rand() * h, -0.5 + rand() * 1.2, 80 + rand() * 120 | 0, (0.05 + rand() * 0.12) * u, 0.12 + rand() * 0.2, 0);

  // ── 1 · rosetas en retícula (detrás de todo lo demás)
  const rosette = (x, y, r) => { const p = P(); for (let k = 0; k < 8; k++) { const a = k * TAU / 8; p.ellipse(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.42, r * 0.17, a, 0, TAU); } line(p, 0.1 * u); solid(circle(x, y, r * 0.16)); };
  for (let row = 0, y = 14 * u; y < h; row++, y += 12 * u) for (let x = (row % 2 ? 6 * u : 0) + cx % (12 * u); x < w; x += 12 * u) if (Math.hypot(x - cx, y - cy) > 42 * u) rosette(x, y, 1.3 * u);

  // ── 2 · bandas de arriba y de abajo: meandro, ovas y dardos, ola
  const meander = (y, hh) => {
    const st = hh / 10, p = P(), pts = [[0, 10], [0, 0], [8, 0], [8, 6], [4, 6], [4, 4], [6, 4], [6, 2], [2, 2], [2, 8], [10, 8], [10, 10]];
    flat(rect(0, y - 0.6 * u, w, hh + 1.2 * u), mix(deep, stone, 0.4));
    for (let x0 = cx % (10 * st) - 10 * st; x0 < w + 10 * st; x0 += 10 * st) pts.forEach(([a, b], i) => (i ? p.lineTo : p.moveTo).call(p, x0 + a * st, y + b * st));
    line(p, 0.34 * u);
    const f = P(); f.moveTo(0, y - 0.6 * u); f.lineTo(w, y - 0.6 * u); f.moveTo(0, y + hh + 0.6 * u); f.lineTo(w, y + hh + 0.6 * u); line(f, 0.28 * u);
  };
  meander(2.6 * u, 4.6 * u); meander(92.8 * u, 4.6 * u);
  { const y = 10.4 * u, p = P(), d = P(); // ovas y dardos
    for (let x = cx % (3 * u) - 3 * u; x < w + 3 * u; x += 3 * u) { p.ellipse(x, y, 1.05 * u, 1.25 * u, 0, 0, TAU); d.moveTo(x + 1.5 * u, y - 1.3 * u); d.lineTo(x + 1.5 * u, y + 0.9 * u); d.moveTo(x + 1.1 * u, y + 0.4 * u); d.lineTo(x + 1.5 * u, y + 1.3 * u); d.lineTo(x + 1.9 * u, y + 0.4 * u); }
    line(p, 0.18 * u); line(d, 0.16 * u); dots(0, 12.6 * u, w, 12.6 * u, 1 * u, 0.22 * u); }
  { const y = 88.6 * u, r = 1.3 * u, per = 5 * u, p = P(); // la ola que se enrosca
    for (let x = cx % per - per; x < w + per; x += per) { p.moveTo(x, y + r); p.bezierCurveTo(x + per * 0.35, y + r, x + per * 0.3, y - r, x + per * 0.62, y - r); for (let i = 0; i <= 24; i++) { const t = i / 24, a = -Math.PI / 2 + t * Math.PI * 1.7, rr = r * (1 - t * 0.6); p.lineTo(x + per * 0.62 + Math.cos(a) * rr, y + Math.sin(a) * rr); } }
    line(p, 0.24 * u); dots(0, 86.2 * u, w, 86.2 * u, 1 * u, 0.22 * u); }
  // meandro vertical en los costados
  mirror(s => { const x = s > 0 ? w - 3.4 * u : 3.4 * u, p = P(), st = 0.42 * u, pts = [[0, 0], [10, 0], [10, 8], [4, 8], [4, 4], [6, 4], [6, 6], [8, 6], [8, 2], [2, 2], [2, 10], [0, 10]];
    for (let y0 = 14 * u; y0 < 84 * u; y0 += 10 * st) pts.forEach(([b, a], i) => (i ? p.lineTo : p.moveTo).call(p, x - 5 * st + a * st * s, y0 + b * st));
    line(p, 0.22 * u); });

  // ── 3 · cadenas de antemio: palmeta, voluta, loto, voluta…
  const palmette = (x, y, s, up = 1) => {
    for (let i = -4; i <= 4; i++) { const a = -Math.PI / 2 * up + i * 0.24, L = s * (1 - Math.abs(i) * 0.07), tip = [x + Math.cos(a) * L, y + Math.sin(a) * L], n = [Math.cos(a + Math.PI / 2), Math.sin(a + Math.PI / 2)], bw = s * 0.09, m = [x + Math.cos(a) * L * 0.55, y + Math.sin(a) * L * 0.55];
      const leaf = P(); leaf.moveTo(x, y); leaf.quadraticCurveTo(m[0] + n[0] * bw, m[1] + n[1] * bw, ...tip); leaf.quadraticCurveTo(m[0] - n[0] * bw, m[1] - n[1] * bw, x, y);
      i % 2 ? line(leaf, 0.14 * u) : solid(leaf); }
    const heart = P(); heart.arc(x, y + up * s * 0.08, s * 0.16, up > 0 ? 0 : Math.PI, up > 0 ? Math.PI : TAU); line(heart, 0.2 * u); solid(circle(x, y, s * 0.07));
  };
  const lotus = (x, y, s, up = 1) => {
    const p = P(); p.moveTo(x, y); p.quadraticCurveTo(x - s * 0.18, y - up * s * 0.5, x, y - up * s); p.quadraticCurveTo(x + s * 0.18, y - up * s * 0.5, x, y); solid(p);
    const q = P(); [-1, 1].forEach(k => { q.moveTo(x, y); q.bezierCurveTo(x + k * s * 0.5, y - up * s * 0.1, x + k * s * 0.55, y - up * s * 0.6, x + k * s * 0.32, y - up * s * 0.82); }); line(q, 0.18 * u);
  };
  const curl = (x, y, r, dir, up) => { const p = P(); for (let i = 0; i <= 30; i++) { const t = i / 30, a = Math.PI / 2 * up + dir * t * TAU * 0.9, rr = r * (1 - t * 0.75); (i ? p.lineTo : p.moveTo).call(p, x + Math.cos(a) * rr * dir, y + Math.sin(a) * rr); } line(p, 0.16 * u); };
  const anthemion = (y, up) => {
    const per = 11 * u;
    for (let x = cx % per - per, i = 0; x < w + per; x += per, i++) {
      if (Math.abs(x - cx) < 30 * u) continue; // el óculo interrumpe la cadena
      palmette(x, y, 4.2 * u, up); lotus(x + per / 2, y, 3 * u, up);
      const s = P(); s.moveTo(x + 0.6 * u, y + up * 0.9 * u); s.bezierCurveTo(x + per * 0.22, y + up * 1.6 * u, x + per * 0.3, y + up * 0.2 * u, x + per / 2 - 0.4 * u, y + up * 0.6 * u); line(s, 0.16 * u);
      curl(x + per * 0.2, y + up * 1.3 * u, 0.9 * u, 1, up); curl(x + per * 0.8, y + up * 1.3 * u, 0.9 * u, -1, up);
    }
  };
  anthemion(22 * u, 1); anthemion(78 * u, -1);

  // ── 4 · las estelas: medallón de otra piedra con lira o trípode, laurel y palmetas
  const lyre = (x, y, s) => { const box = P(); box.ellipse(x, y + s * 0.3, s * 0.24, s * 0.12, 0, 0, TAU); solid(box);
    const arms = P(); mirror(k => { arms.moveTo(x + k * s * 0.16, y + s * 0.26); arms.bezierCurveTo(x + k * s * 0.42, y + s * 0.05, x + k * s * 0.08, y - s * 0.2, x + k * s * 0.3, y - s * 0.42); }); line(arms, 0.5 * u);
    const bar = P(); bar.moveTo(x - s * 0.32, y - s * 0.31); bar.lineTo(x + s * 0.32, y - s * 0.31); line(bar, 0.36 * u);
    const str = P(); for (let i = -3; i <= 3; i++) { str.moveTo(x + i * s * 0.045, y - s * 0.31); str.lineTo(x + i * s * 0.045, y + s * 0.26); } line(str, 0.08 * u); };
  const tripod = (x, y, s) => { const bowl = P(); bowl.moveTo(x - s * 0.32, y - s * 0.18); bowl.quadraticCurveTo(x, y + s * 0.22, x + s * 0.32, y - s * 0.18); bowl.closePath(); solid(bowl);
    const legs = P(); [-1, 0, 1].forEach(k => { legs.moveTo(x + k * s * 0.22, y); legs.lineTo(x + k * s * 0.36, y + s * 0.46); }); line(legs, 0.36 * u);
    const tie = P(); tie.moveTo(x - s * 0.3, y + s * 0.24); tie.lineTo(x + s * 0.3, y + s * 0.24); line(tie, 0.16 * u);
    mirror(k => ring(x + k * s * 0.2, y - s * 0.3, s * 0.09, 0, TAU, 0.16 * u)); };
  const laurel = (x, y, r, a0, a1, n) => { const p = P(); p.arc(x, y, r, a0, a1); line(p, 0.16 * u);
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; mirror(k => { const leaf = P(); leaf.ellipse(x + Math.cos(a) * (r + k * 0.55 * u), y + Math.sin(a) * (r + k * 0.55 * u), 0.85 * u, 0.32 * u, a + Math.PI / 2 + k * 0.5, 0, TAU); i % 2 ? solid(leaf) : line(leaf, 0.1 * u); }); } };
  mirror(s => {
    const x = cx + s * 60 * u, mr = 9 * u;
    const st = P(); st.moveTo(x - 12 * u, 76 * u); st.lineTo(x - 12 * u, 30 * u); st.quadraticCurveTo(x, 22 * u, x + 12 * u, 30 * u); st.lineTo(x + 12 * u, 76 * u); st.closePath(); line(st, 0.32 * u);
    const st2 = P(); st2.moveTo(x - 10.8 * u, 75 * u); st2.lineTo(x - 10.8 * u, 30.6 * u); st2.quadraticCurveTo(x, 23.6 * u, x + 10.8 * u, 30.6 * u); st2.lineTo(x + 10.8 * u, 75 * u); line(st2, 0.12 * u);
    const med = circle(x, 46 * u, mr); flat(med, inlay); ring(x, 46 * u, mr, 0, TAU, 0.42 * u); dotRing(x, 46 * u, mr * 0.88, 40, 0, TAU, 0.14 * u);
    (s < 0 ? lyre : tripod)(x, 45.6 * u, 12 * u);
    laurel(x, 46 * u, mr + 2 * u, Math.PI * 0.62, Math.PI * 2.38, 22);
    palmette(x, 66 * u, 5.5 * u, 1); lotus(x, 72 * u, 3.4 * u, -1);
    const base = P(); base.rect(x - 13 * u, 76 * u, 26 * u, 1.2 * u); solid(base);
  });

  // ── 5 · el óculo de Helios: corona de rayos, laurel, anillos; dentro, el cielo
  { const R = 21 * u;
    rays(cx, cy, R + 4.4 * u, R + 12 * u, 72, 0, TAU, 0.14 * u);
    for (let k = 0; k < 24; k++) { // rayos largos alternados: rectos y ondulados como llamas
      const a = k * TAU / 24, len = R + (k % 2 ? 15 : 18.5) * u, r0 = R + 4.4 * u, p = P();
      if (k % 2) { p.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); for (let i = 1; i <= 12; i++) { const t = i / 12, rr = r0 + (len - r0) * t, off = Math.sin(t * Math.PI * 3) * 0.8 * u * (1 - t); p.lineTo(cx + Math.cos(a) * rr - Math.sin(a) * off, cy + Math.sin(a) * rr + Math.cos(a) * off); } line(p, 0.3 * u); }
      else { const n = [-Math.sin(a), Math.cos(a)], bw = 1.1 * u; p.moveTo(cx + Math.cos(a) * r0 + n[0] * bw, cy + Math.sin(a) * r0 + n[1] * bw); p.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len); p.lineTo(cx + Math.cos(a) * r0 - n[0] * bw, cy + Math.sin(a) * r0 - n[1] * bw); p.closePath(); solid(p); }
    }
    laurel(cx, cy, R + 2.4 * u, -Math.PI / 2 + 0.25, Math.PI * 1.5 - 0.25, 44);
    ring(cx, cy, R + 4.2 * u, 0, TAU, 0.2 * u); dotRing(cx, cy, R + 0.9 * u, 90, 0, TAU, 0.16 * u);
    // el hueco: sin piedra (transparente) y altura cero; el canto del óculo hace sombra hacia dentro
    C.save(); C.globalCompositeOperation = 'destination-out'; C.fill(circle(cx, cy, R)); C.restore();
    M.fillStyle = 'rgb(0,0,0)'; M.fill(circle(cx, cy, R));
    ring(cx, cy, R, 0, TAU, 0.9 * u); ring(cx, cy, R + 1.6 * u, 0, TAU, 0.3 * u); }

  return { color, mask };
}
