// ══════════════════════════════════════════════════════
// mirai · el hilo rojo (赤い糸). En la cabecera de cada sección hay un hilo
// enredado sobre la instrucción. Un cabo está fijo; el otro se jala con el
// cursor (o al bajar la página) y, conforme el hilo se tiende, la
// instrucción aparece letra por letra. Una caja en mono dice en qué va.
// Dos físicas, las dos en canvas 2D:
//   · mientras se desenreda, una cadena de Verlet (puntos a distancia fija,
//     sin gravedad) que sigue al cabo con inercia;
//   · ya tendido, una cuerda: el cursor la pulsa al cruzarla y la onda corre
//     hasta apagarse. El bucle solo corre mientras algo se mueve.
// Siempre es shu; en urushi se dibuja con puntos encendidos.
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
  // el texto entero queda para lectores de pantalla; las letras son solo visuales.
  // Cada palabra es un bloque que no se parte: así las letras pueden moverse sin cambiar los saltos de línea.
  instr.innerHTML = `<span class="sr-only">${esc(text)}</span><span aria-hidden="true">${text.split(' ').map(w => `<span class="w">${[...w].map(ch => `<span class="ch">${esc(ch)}</span>`).join('')}</span>`).join(' ')}</span>`;
  const chars = [...instr.querySelectorAll('.ch')];
  const canvas = Object.assign(document.createElement('canvas'), { className: 'mi-thread' }), state = Object.assign(document.createElement('p'), { className: 'mi-state' });
  canvas.setAttribute('aria-hidden', 'true'); state.setAttribute('aria-hidden', 'true');
  head.append(canvas, state);
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, x0 = 0, y0 = 0, L = 0, seg = gap, P = [], pull = 0, goal = 0, done = false, shown = -1, said = '', ink = '', last = 0;
  let U = null, V = null, energy = 0, plucks = 0; // la cuerda: desplazamiento y velocidad de cada punto

  const straight = () => { P.forEach((p, i) => { p.x = p.px = x0 + i * seg; p.y = p.py = y0; }); U = new Float32Array(P.length); V = new Float32Array(P.length); };
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
  // ── desenredar: el cabo persigue su meta con inercia (independiente de los cuadros por segundo) ──
  function unravel(dt) {
    pull = Math.min(goal, pull + Math.max((goal - pull) * (1 - Math.exp(-dt / 210)), dt * .00012));
    const tx = x0 + 28 + (L - 28) * pull, lastI = P.length - 1;
    for (let i = 1; i < lastI; i++) { const p = P[i], vx = (p.x - p.px) * .9, vy = (p.y - p.py) * .9; p.px = p.x; p.py = p.y; p.x += vx; p.y += vy; }
    for (let k = 0; k < 14; k++) {
      P[0].x = x0; P[0].y = y0; P[lastI].x = tx; P[lastI].y = y0;
      for (let i = 0; i < lastI; i++) { const a = P[i], b = P[i + 1], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || .001, m = (d - seg) / d / 2; if (i) { a.x += dx * m; a.y += dy * m; } if (i + 1 < lastI) { b.x -= dx * m; b.y -= dy * m; } }
    }
    if (pull >= .999) { done = true; straight(); }
  }
  // ── cuerda tendida: ecuación de onda con los dos cabos fijos ──
  function vibrate(dt) {
    const steps = Math.min(4, Math.max(1, Math.round(dt / 8))), c = .34, damp = .974; let peak = 0;
    for (let s = 0; s < steps; s++) {
      for (let i = 1; i < U.length - 1; i++) V[i] = (V[i] + c * (U[i - 1] - 2 * U[i] + U[i + 1])) * damp;
      for (let i = 1; i < U.length - 1; i++) U[i] += V[i];
    }
    for (let i = 0; i < P.length; i++) { P[i].y = y0 + U[i]; peak = Math.max(peak, Math.abs(U[i]), Math.abs(V[i]) * 4); }
    energy = peak;
    if (peak < .22) { U.fill(0); V.fill(0); energy = 0; for (const p of P) p.y = y0; } // ya no se ve: a descansar
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
    const line = done ? `estado: ${energy ? 'VIBRANDO' : 'TENDIDO'} · desenredo: 100% · pulsos: ${plucks}` : `estado: ${pull < .02 ? 'ENREDADO' : 'TENSANDO'} · desenredo: ${Math.round(pull * 100)}% · cabos: ${apart}% del hilo`;
    if (line !== said) state.textContent = said = line;
  }
  const paint = () => { ink = cssVar('--shu'); };
  const frame = t => {
    if (!P.length) return;
    const dt = Math.min(48, t - (last || t)) || 16; last = t;
    if (reduceMotion.matches && !done) { pull = goal = 1; done = true; straight(); }
    if (!done) {
      // sin cursor también se tiende: la cabecera lo jala al subir por la pantalla
      const top = head.getBoundingClientRect().top, vh = innerHeight;
      goal = Math.max(goal, clamp((vh * .82 - top) / (vh * .42), 0, 1));
      unravel(dt);
    } else if (energy) vibrate(dt);
    draw();
    if (done && !energy) { last = 0; loop.stop(); }
  };
  paint(); layout();
  const loop = makeLoop(head, frame);
  let py = null;
  head.addEventListener('pointermove', e => {
    const r = head.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (!done) { goal = Math.max(goal, clamp((x - x0) / L, 0, 1)); py = y; return; }
    // pulsar: el cursor cruzó la línea; el golpe entra en el punto más cercano y sus vecinos
    if (py !== null && !reduceMotion.matches && (py - y0) * (y - y0) < 0 && x > x0 && x < x0 + L) {
      const i = clamp(Math.round((x - x0) / seg), 2, U.length - 3), hit = clamp((y - py) * .55, -7, 7);
      for (let k = -2; k <= 2; k++) V[i + k] += hit * (1 - Math.abs(k) / 3);
      energy = 1; plucks++; loop.start();
    }
    py = y;
  });
  head.addEventListener('pointerleave', () => { py = null; });
  onTheme(() => { paint(); loop.still(); });
  new ResizeObserver(() => { layout(); loop.still(); if (!done) loop.start(); }).observe(head);
  if (reduceMotion.matches) loop.still();
}
