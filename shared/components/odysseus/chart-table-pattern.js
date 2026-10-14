// ══════════════════════════════════════════════════════
// La mesa de cartas · pintor de la placa en relieve (relief-plate) para la
// sección del mapa: la cubierta de una mesa de navegante, de cuero (o laca
// de noche) con el grabado de una carta antigua embutido en latón y cobre:
//  · la red de rumbos de un portulano: dos rosas de 32 vientos, cada una
//    con un anillo de dieciséis rosas menores, y las líneas de rumbo
//    cruzando toda la mesa (vientos en latón, medios vientos en cobre),
//  · las rosas: estrella de 32 puntas, anillos graduados y flor de lis al
//    norte,
//  · el marco graduado de la carta (escala de grados en franjas alternas),
//  · una cartela de volutas con un barco grabado, olas y un compás de
//    puntas apoyado sobre la mesa.
// El grabado se levanta y es metal (máscara blanca); el cuero queda mate
// con su grano. El patrón no se mueve: solo la luz (chart-table-3d.js).
//   paint({ w, h, base, grain, brass: [a, b], copper: [a, b], line })
// ══════════════════════════════════════════════════════
import { TAU, canvas, mix, pen } from '../relief-plate/pen.js';

const rand = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(5);

export function paint({ w = 2048, h = 1152, base = '#2C4640', grain = '#1C2E2A', brass = ['#8C6A22', '#E6C470'], copper = ['#7A3A1C', '#D08A5A'], line = '#D8C898' }) {
  const color = canvas(w, h), mask = canvas(w, h);
  const C = color.getContext('2d'), M = mask.getContext('2d');
  const u = h / 100, cx = w / 2;
  C.lineCap = M.lineCap = 'round'; C.lineJoin = M.lineJoin = 'round';
  const B = pen(C, M, { u, w, h, gold: brass }), K = pen(C, M, { u, w, h, gold: copper });
  // trazos finos: metal, pero más bajos que el grabado principal
  const faint = g => g.map(c => mix(base, c, 0.55));
  const thin = pen(C, M, { u, w, h, gold: faint(brass), ink: '#8a8a8a' }), thinK = pen(C, M, { u, w, h, gold: faint(copper), ink: '#8a8a8a' });
  const P = () => new Path2D();

  // ── 0 · el cuero: base a media altura, grano solo de color y de altura muy leve
  C.fillStyle = base; C.fillRect(0, 0, w, h); M.fillStyle = 'rgb(110,0,0)'; M.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) { const x = rand() * w, y = rand() * h, r = (0.05 + rand() * 0.16) * u; C.fillStyle = rand() < 0.5 ? grain : mix(base, '#E8DCC0', 0.12); C.globalAlpha = 0.18 + rand() * 0.2; C.beginPath(); C.arc(x, y, r, 0, TAU); C.fill(); }
  C.globalAlpha = 1;
  // retícula de la carta, apenas grabada en color
  C.strokeStyle = line; C.globalAlpha = 0.07; C.lineWidth = 0.08 * u;
  for (let x = cx % (10 * u); x < w; x += 10 * u) { C.beginPath(); C.moveTo(x, 0); C.lineTo(x, h); C.stroke(); }
  for (let y = (h / 2) % (10 * u); y < h; y += 10 * u) { C.beginPath(); C.moveTo(0, y); C.lineTo(w, y); C.stroke(); }
  C.globalAlpha = 1;

  // ── 1 · red de rumbos (portulano): cada centro lanza 32 líneas hasta el borde
  const ROSES = [[0.13 * w, 0.76 * h, 11 * u], [0.8 * w, 0.24 * h, 9 * u]];
  const R = Math.hypot(w, h);
  const web = (x, y, n, pick) => { for (let k = 0; k < n; k++) { const a = k * TAU / n - Math.PI / 2, p = P(); p.moveTo(x, y); p.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); pick(k).line(p, (k % 4 ? 0.06 : 0.1) * u); } };
  ROSES.forEach(([x, y, r]) => {
    // dieciséis rosas menores en un círculo grande alrededor de la principal
    const ring = r * 3.4;
    for (let k = 0; k < 8; k++) { const a = k * TAU / 8 + Math.PI / 8, sx = x + Math.cos(a) * ring, sy = y + Math.sin(a) * ring; web(sx, sy, 16, j => (j % 2 ? thinK : thin)); }
    web(x, y, 32, k => (k % 4 === 0 ? B : k % 2 ? thinK : thin));
    // el círculo que une las rosas menores
    { const p = P(); p.arc(x, y, ring, 0, TAU); thin.line(p, 0.1 * u); }
  });

  // ── 2 · las rosas de los vientos
  const rose = (x, y, r) => {
    // fondo de la rosa: un disco del cuero, para que las líneas no la crucen
    { const d = P(); d.arc(x, y, r * 1.08, 0, TAU); C.fillStyle = base; C.fill(d); M.fillStyle = 'rgb(140,0,0)'; M.fill(d); }
    B.ring(x, y, r * 1.08, 0, TAU, 0.35 * u); B.ring(x, y, r * 1.0, 0, TAU, 0.14 * u);
    // anillo graduado: un tic por grado cada 5, más largo cada 10
    { const p = P(); for (let d = 0; d < 360; d += 5) { const a = d / 180 * Math.PI, k = d % 10 ? 0.95 : 0.9; p.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); p.lineTo(x + Math.cos(a) * r * k, y + Math.sin(a) * r * k); } B.line(p, 0.1 * u); }
    B.ring(x, y, r * 0.88, 0, TAU, 0.14 * u);
    // estrella de 32 puntas: las 8 principales largas, mitad llena y mitad en línea (el sombreado de los grabados)
    for (let k = 0; k < 32; k++) {
      const a = k * TAU / 32 - Math.PI / 2, len = r * (k % 8 === 0 ? 0.86 : k % 4 === 0 ? 0.66 : k % 2 === 0 ? 0.5 : 0.38), wd = r * (k % 8 === 0 ? 0.11 : k % 4 === 0 ? 0.08 : 0.05);
      const tip = [x + Math.cos(a) * len, y + Math.sin(a) * len], l = [x + Math.cos(a - Math.PI / 2) * wd, y + Math.sin(a - Math.PI / 2) * wd], rr = [x + Math.cos(a + Math.PI / 2) * wd, y + Math.sin(a + Math.PI / 2) * wd];
      const half1 = P(); half1.moveTo(x, y); half1.lineTo(...l); half1.lineTo(...tip); half1.closePath();
      const half2 = P(); half2.moveTo(x, y); half2.lineTo(...rr); half2.lineTo(...tip); half2.closePath();
      const pp = k % 8 === 0 ? B : k % 2 ? K : B;
      pp.solid(half1); pp.line(half2, 0.1 * u);
    }
    B.ring(x, y, r * 0.12, 0, TAU, 0.18 * u); const c = P(); c.arc(x, y, r * 0.05, 0, TAU); B.solid(c);
    // flor de lis al norte
    { const fy = y - r * 1.14, s = r * 0.18, p = P();
      p.moveTo(x, fy - s * 1.3); p.quadraticCurveTo(x + s * 0.4, fy - s * 0.6, x, fy); p.quadraticCurveTo(x - s * 0.4, fy - s * 0.6, x, fy - s * 1.3);
      [-1, 1].forEach(k => { p.moveTo(x, fy - s * 0.2); p.bezierCurveTo(x + k * s * 0.9, fy - s * 1.1, x + k * s * 1.1, fy - s * 0.1, x + k * s * 0.5, fy + s * 0.1); });
      B.solid(p); const band = P(); band.rect(x - s * 0.5, fy - s * 0.05, s, s * 0.22); B.solid(band); }
  };
  ROSES.forEach(([x, y, r]) => rose(x, y, r));

  // ── 3 · marco graduado de la carta: franjas alternas como la escala de grados
  { const m = 3 * u, t = 1.4 * u, outer = P(); outer.rect(m, m, w - 2 * m, h - 2 * m); B.line(outer, 0.4 * u);
    const inner = P(); inner.rect(m + t, m + t, w - 2 * (m + t), h - 2 * (m + t)); B.line(inner, 0.2 * u);
    const seg = 2.4 * u, bars = P();
    for (let x = m, i = 0; x < w - m - seg / 2; x += seg, i++) if (i % 2) { bars.rect(x, m, Math.min(seg, w - m - x), t * 0.5); bars.rect(x, h - m - t * 0.5, Math.min(seg, w - m - x), t * 0.5); }
    for (let y = m, i = 0; y < h - m - seg / 2; y += seg, i++) if (i % 2) { bars.rect(m, y, t * 0.5, Math.min(seg, h - m - y)); bars.rect(w - m - t * 0.5, y, t * 0.5, Math.min(seg, h - m - y)); }
    B.solid(bars);
    const ticks = P(); for (let x = m; x < w - m; x += seg / 5) { ticks.moveTo(x, m + t * 0.5); ticks.lineTo(x, m + t * 0.75); ticks.moveTo(x, h - m - t * 0.5); ticks.lineTo(x, h - m - t * 0.75); } thin.line(ticks, 0.06 * u); }

  // ── 4 · cartela de volutas con el barco, abajo al centro
  { const x0 = w * 0.43, y0 = h * 0.74, cw = 28 * u, ch = 16 * u, frame = P();
    { const d = P(); d.rect(x0 - 1 * u, y0 - 1 * u, cw + 2 * u, ch + 2 * u); C.fillStyle = mix(base, grain, 0.5); C.fill(d); M.fillStyle = 'rgb(130,0,0)'; M.fill(d); }
    frame.rect(x0, y0, cw, ch); B.line(frame, 0.35 * u); const f2 = P(); f2.rect(x0 + 0.9 * u, y0 + 0.9 * u, cw - 1.8 * u, ch - 1.8 * u); B.line(f2, 0.14 * u);
    // volutas en las cuatro esquinas
    [[x0, y0, 1, 1], [x0 + cw, y0, -1, 1], [x0, y0 + ch, 1, -1], [x0 + cw, y0 + ch, -1, -1]].forEach(([vx, vy, sx, sy]) => {
      const p = P(); for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * TAU * 1.4, r = 2.6 * u * (1 - t * 0.8); (i ? p.lineTo : p.moveTo).call(p, vx - sx * 2 * u + sx * Math.cos(a) * r, vy - sy * 2 * u + sy * Math.sin(a) * r); } B.line(p, 0.24 * u); });
    // el barco: casco, tres palos, velas cuadras hinchadas, gallardete
    const bx = x0 + cw / 2, by = y0 + ch * 0.72, s = 1.05 * u, hull = P();
    hull.moveTo(bx - 9 * s, by - 1.2 * s); hull.lineTo(bx + 8 * s, by - 1.4 * s); hull.lineTo(bx + 10.5 * s, by - 3 * s); hull.quadraticCurveTo(bx + 7 * s, by + 2.2 * s, bx - 6 * s, by + 2 * s); hull.lineTo(bx - 9.5 * s, by - 3.2 * s); hull.closePath(); B.solid(hull);
    [[-5, 9], [0, 12], [5, 8.5]].forEach(([dx, hh]) => { const m = P(); m.moveTo(bx + dx * s, by - 1.3 * s); m.lineTo(bx + dx * s, by - hh * s); B.line(m, 0.16 * u);
      for (let k = 0; k < 2; k++) { const top = by - hh * s + (0.8 + k * 3.6) * s, sw = (3 - k * 0.4 - Math.abs(dx) * 0.08) * s, sail = P(); sail.moveTo(bx + dx * s - sw, top); sail.lineTo(bx + dx * s + sw, top); sail.quadraticCurveTo(bx + dx * s + sw * 1.25, top + 1.6 * s, bx + dx * s + sw, top + 3 * s); sail.lineTo(bx + dx * s - sw, top + 3 * s); sail.quadraticCurveTo(bx + dx * s - sw * 0.75, top + 1.6 * s, bx + dx * s - sw, top); sail.closePath(); K.line(sail, 0.12 * u); }
      const fl = P(); fl.moveTo(bx + dx * s, by - hh * s); fl.lineTo(bx + dx * s + 2.2 * s, by - hh * s + 0.4 * s); fl.lineTo(bx + dx * s, by - hh * s + 0.8 * s); K.solid(fl); });
    const bow = P(); bow.moveTo(bx + 10.3 * s, by - 3 * s); bow.lineTo(bx + 14 * s, by - 6.5 * s); B.line(bow, 0.14 * u);
    const sea = P(); for (let row = 0; row < 3; row++) { const yy = by + (2.6 + row * 1.2) * s; for (let xx = x0 + 2.4 * u + row * 0.8 * u; xx < x0 + cw - 3.4 * u; xx += 2.4 * u) { sea.moveTo(xx, yy); sea.quadraticCurveTo(xx + 0.6 * u, yy - 0.7 * u, xx + 1.2 * u, yy); } } thin.line(sea, 0.1 * u);
  }

  // ── 5 · olas grabadas sueltas en el mar de la carta
  [[0.12, 0.2], [0.5, 0.16], [0.18, 0.82], [0.52, 0.86], [0.9, 0.3]].forEach(([fx, fy]) => {
    const p = P(), x = fx * w, y = fy * h;
    for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) { const xx = x + (i * 2.6 + row * 1.3) * u, yy = y + row * 1.1 * u; p.moveTo(xx, yy); p.quadraticCurveTo(xx + 0.65 * u, yy - 0.8 * u, xx + 1.3 * u, yy); }
    thin.line(p, 0.12 * u);
  });

  // ── 6 · el compás de puntas, abierto sobre la mesa (objeto de latón, el más alto)
  { const hx = w * 0.24, hy = h * 0.6, len = 22 * u, a0 = 0.95, open = 0.3;
    [-1, 1].forEach(k => { const a = a0 + k * open / 2, tx = hx + Math.cos(a) * len, ty = hy + Math.sin(a) * len, nx = -Math.sin(a), ny = Math.cos(a), leg = P();
      leg.moveTo(hx + nx * 0.7 * u, hy + ny * 0.7 * u); leg.lineTo(tx, ty); leg.lineTo(hx - nx * 0.7 * u, hy - ny * 0.7 * u); leg.closePath();
      C.save(); C.shadowColor = 'rgba(10,14,12,.5)'; C.shadowBlur = 1.2 * u; C.shadowOffsetX = 0.6 * u; C.shadowOffsetY = 0.8 * u; C.fillStyle = base; C.fill(leg); C.restore(); // la sombra sobre el cuero
      B.solid(leg); const tipL = P(); tipL.moveTo(tx, ty); tipL.lineTo(tx - Math.cos(a) * 3 * u, ty - Math.sin(a) * 3 * u); K.line(tipL, 0.3 * u); });
    const hinge = P(); hinge.arc(hx, hy, 1.5 * u, 0, TAU); B.solid(hinge); const pin = P(); pin.arc(hx, hy, 0.5 * u, 0, TAU); K.solid(pin);
    const knob = P(); knob.moveTo(hx, hy); knob.lineTo(hx - Math.cos(a0) * 3 * u, hy - Math.sin(a0) * 3 * u); B.line(knob, 0.5 * u); }

  return { color, mask };
}
