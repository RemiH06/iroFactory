// ══════════════════════════════════════════════════════
// mirai · el hilo rojo (赤い糸). En la cabecera de cada sección hay un hilo
// enredado sobre la instrucción. Un cabo está fijo; el otro se jala con el
// cursor (o al bajar la página) y, conforme el hilo se tiende, la
// instrucción aparece celda por celda. Una caja en mono dice en qué va.
// Es una cadena de Verlet en canvas 2D: puntos a distancia fija, sin
// gravedad. Siempre es shu; en urushi se dibuja con puntos encendidos.
// Sin JS o con reduced motion la instrucción está completa desde el inicio.
//   mount({ heads: '.mi-head', gap: 9 })
// ══════════════════════════════════════════════════════
import { clamp, cssVar, makeLoop, onTheme, reduceMotion, theme } from '../../core/core.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function mount({ heads = '.mi-head', gap = 9 } = {}) {
  document.querySelectorAll(heads).forEach((head, n) => thread(head, n, gap));
}

function thread(head, n, gap) {
  const instr = head.querySelector('.mi-instr'); if (!instr) return;
  const text = instr.textContent.trim();
  // el texto entero queda para lectores de pantalla; las celdas son solo visuales
  instr.innerHTML = `<span class="sr-only">${esc(text)}</span><span aria-hidden="true">${[...text].map(ch => (ch === ' ' ? ' ' : `<span class="ch">${esc(ch)}</span>`)).join('')}</span>`;
  const chars = [...instr.querySelectorAll('.ch')];
  const canvas = Object.assign(document.createElement('canvas'), { className: 'mi-thread' }), state = Object.assign(document.createElement('p'), { className: 'mi-state' });
  canvas.setAttribute('aria-hidden', 'true'); state.setAttribute('aria-hidden', 'true');
  head.append(canvas, state);
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, x0 = 0, y0 = 0, L = 0, seg = gap, P = [], pull = 0, goal = 0, done = false, shown = -1, said = '', ink = '';

  const straight = () => P.forEach((p, i) => { p.x = p.px = x0 + i * seg; p.y = p.py = y0; });
  function layout() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = head.clientWidth; H = head.clientHeight; if (!W || !H) return;
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    x0 = instr.offsetLeft; y0 = instr.offsetTop + instr.offsetHeight + 12; L = Math.min(instr.offsetWidth, W - x0);
    const N = Math.max(12, Math.round(L / gap)); seg = L / (N - 1);
    // el nudo: una madeja de vueltas irregulares junto al cabo fijo
    const cx = x0 + Math.min(72, L * .22), cy = y0 - 26;
    P = Array.from({ length: N }, (_, i) => { const a = i * seg / 21 + n * 1.7, r = 13 + 11 * Math.sin(i * .37 + n * 2.1), x = cx + Math.cos(a) * r * 1.9, y = cy + Math.sin(a) * r; return { x, y, px: x, py: y }; });
    if (done) straight();
  }
  function step() {
    pull += clamp(goal - pull, 0, .018);
    const tx = x0 + 28 + (L - 28) * pull, last = P.length - 1;
    for (let i = 1; i < last; i++) { const p = P[i], vx = (p.x - p.px) * .9, vy = (p.y - p.py) * .9; p.px = p.x; p.py = p.y; p.x += vx; p.y += vy; }
    for (let k = 0; k < 14; k++) {
      P[0].x = x0; P[0].y = y0; P[last].x = tx; P[last].y = y0;
      for (let i = 0; i < last; i++) { const a = P[i], b = P[i + 1], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || .001, m = (d - seg) / d / 2; if (i) { a.x += dx * m; a.y += dy * m; } if (i + 1 < last) { b.x -= dx * m; b.y -= dy * m; } }
    }
    if (pull >= .999) { done = true; straight(); }
  }
  function draw() {
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = ctx.strokeStyle = ink;
    if (theme.dark) {
      // matriz de puntos: cada tramo enciende los puntos de la rejilla que toca
      const g = 5, seen = new Set();
      for (let i = 0; i < P.length - 1; i++) for (let t = 0; t < 1; t += .34) { const x = Math.round((P[i].x + (P[i + 1].x - P[i].x) * t) / g) * g, y = Math.round((P[i].y + (P[i + 1].y - P[i].y) * t) / g) * g, key = x * 4096 + y; if (seen.has(key)) continue; seen.add(key); ctx.beginPath(); ctx.arc(x, y, 1.5, 0, 6.3); ctx.fill(); }
    } else {
      ctx.lineWidth = 1.6; ctx.lineCap = ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(P[0].x, P[0].y);
      for (let i = 1; i < P.length - 1; i++) ctx.quadraticCurveTo(P[i].x, P[i].y, (P[i].x + P[i + 1].x) / 2, (P[i].y + P[i + 1].y) / 2);
      ctx.lineTo(P.at(-1).x, P.at(-1).y); ctx.stroke();
    }
    for (const p of [P[0], P.at(-1)]) { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 6.3); ctx.fill(); }
    const count = done ? chars.length : Math.floor(pull * chars.length);
    if (count !== shown) { shown = count; chars.forEach((c, i) => c.classList.toggle('on', i < count)); }
    const apart = Math.round(Math.hypot(P.at(-1).x - P[0].x, P.at(-1).y - P[0].y) / L * 100);
    const line = `estado: ${done ? 'TENDIDO' : pull < .02 ? 'ENREDADO' : 'TENSANDO'} · desenredo: ${Math.round(pull * 100)}% · cabos: ${apart}% del hilo`;
    if (line !== said) state.textContent = said = line;
  }
  const paint = () => { ink = cssVar('--shu'); };
  const frame = () => {
    if (!P.length) return;
    if (reduceMotion.matches && !done) { pull = goal = 1; done = true; straight(); }
    if (!done) {
      // sin cursor también se tiende: la cabecera lo jala al subir por la pantalla
      const top = head.getBoundingClientRect().top, vh = innerHeight;
      goal = Math.max(goal, clamp((vh * .82 - top) / (vh * .42), 0, 1));
      step();
    }
    draw();
    if (done) loop.stop();
  };
  paint(); layout();
  const loop = makeLoop(head, frame);
  head.addEventListener('pointermove', e => { if (!done) goal = Math.max(goal, clamp((e.clientX - head.getBoundingClientRect().left - x0) / L, 0, 1)); });
  onTheme(() => { paint(); loop.still(); });
  new ResizeObserver(() => { layout(); loop.still(); if (!done) loop.start(); }).observe(head);
  if (reduceMotion.matches) loop.still();
}
