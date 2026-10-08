// ══════════════════════════════════════════════════════
// Circuito · autos de carreras vistos desde arriba que siguen la pista con
// createMotionPath de anime.js. La velocidad sale de la física de un auto
// de carreras: se muestrea la pista, se mide su curvatura punto por punto
// y la velocidad máxima en cada curva es la que permite el agarre lateral
// (v = √(a·R)); luego una pasada hacia adelante limita cuánto acelera y otra
// hacia atrás cuánto frena. Con eso se arma una curva de tiempo propia (el
// ease): acelera en las rectas, frena antes de cada curva y sale tirando.
// Cada auto tiene un ritmo un poco distinto, así que se rebasan; la tabla
// de posiciones se acomoda sola. Los pianos (bordillos) se dibujan donde la
// curva es cerrada, del lado de adentro.
// Los controles del motor de anime.js mueven toda la página:
//  · engine.speed: la velocidad del tiempo, de 0.1× a 3×.
//  · engine.precision: «8 bits» la pone en 0 (sin decimales), así que cada
//    valor animado salta de entero en entero. La pista mide unas 170
//    unidades (un viewBox chico a propósito): cada unidad son ~10 px en
//    pantalla, así que los autos avanzan a saltos, como en una consola vieja.
// ══════════════════════════════════════════════════════
import { animate, createMotionPath, engine } from 'animejs';
import { faceColors, onTheme, reduceMotion } from './kit.js';

// recta principal abajo (hacia la derecha), curva 1, chicana, curva rápida
// arriba, horquilla y la curva que regresa a la recta
const TRACK = 'M8 30 L44 30 C52 30 56 26 56 20 C56 14 52 12 48 12 C44 12 42 16 38 16 C34 16 33 8 28 6 C22 4 14 4 10 8 C6 12 12 16 16 18 C20 20 18 24 12 24 C4 24 2 30 8 30 Z';
const MAX = 6, GAP = 320, LAP = 8000, W = 3, ORDER = [4, 0, 5, 1, 2, 3];
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent && parent.appendChild(e); return e; };

export function mount({ root = document.getElementById('lx-track') } = {}) {
  if (!root) return;
  const svg = root.querySelector('svg'), path = el('path', { d: TRACK, class: 'lx-line' });
  // capas: límites de pista, asfalto, pianos, línea de meta, trazada y autos
  el('path', { d: TRACK, class: 'lx-limits' }, svg); el('path', { d: TRACK, class: 'lx-asphalt' }, svg);
  const kerbs = el('g', { class: 'lx-kerbs' }, svg), start = el('g', { class: 'lx-start' }, svg);
  svg.appendChild(path); const cars = el('g', { class: 'lx-cars' }, svg);
  const b = path.getBBox(); svg.setAttribute('viewBox', `${b.x - W} ${b.y - W} ${b.width + 2 * W} ${b.height + 2 * W}`);

  // ── Perfil de velocidad
  const L = path.getTotalLength(), n = 900, ds = L / n, P = [];
  for (let i = 0; i < n; i++) P.push(path.getPointAtLength(i * ds));
  const at = i => P[(i % n + n) % n];
  const head = P.map((_, i) => Math.atan2(at(i + 1).y - at(i - 1).y, at(i + 1).x - at(i - 1).x));
  let k = head.map((h, i) => { let d = head[(i + 1) % n] - h; d = Math.atan2(Math.sin(d), Math.cos(d)); return d / ds; });
  k = k.map((_, i) => { let s = 0; for (let j = -4; j <= 4; j++) s += k[(i + j + n) % n]; return s / 9; }); // suavizado
  const A_LAT = 0.05, A_ACC = 0.025, A_BRK = 0.07;
  const v = k.map(c => Math.min(1, Math.sqrt(A_LAT / Math.max(Math.abs(c), 1e-4))));
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i <= n; i++) v[i % n] = Math.min(v[i % n], Math.sqrt(v[i - 1] ** 2 + 2 * A_ACC * ds));
    for (let i = n - 1; i >= 0; i--) v[i] = Math.min(v[i], Math.sqrt(v[(i + 1) % n] ** 2 + 2 * A_BRK * ds));
  }
  const T = [0]; for (let i = 1; i <= n; i++) T.push(T[i - 1] + ds / ((v[i - 1] + v[i % n]) / 2));
  const tot = T[n];
  const ease = t => { // tiempo → distancia (búsqueda binaria en la tabla)
    const x = t * tot; let lo = 0, hi = n;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m] < x) lo = m; else hi = m; }
    return (lo + (x - T[lo]) / ((T[hi] - T[lo]) || 1)) / n;
  };

  // ── Pianos del lado de adentro de las curvas cerradas
  let run = [];
  const flush = () => { if (run.length > 6) { const d = 'M' + run.map(p => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L'); el('path', { d, class: 'lx-kerb' }, kerbs); el('path', { d, class: 'lx-kerb-stripe' }, kerbs); } run = []; };
  for (let i = 0; i < n; i++) {
    if (Math.abs(k[i]) < 1 / 7) { flush(); continue; }
    const s = Math.sign(k[i]), h = head[i], off = W / 2 + 0.2;
    run.push({ x: P[i].x - Math.sin(h) * s * off, y: P[i].y + Math.cos(h) * s * off });
  }
  flush();
  // línea de meta a cuadros, atravesada en la recta principal
  { const p = P[Math.round(n * 0.05)], h = head[Math.round(n * 0.05)] * 180 / Math.PI, g = el('g', { transform: `translate(${p.x} ${p.y}) rotate(${h})` }, start);
    for (let r = 0; r < 6; r++) for (let c = 0; c < 2; c++) el('rect', { x: -0.5 + c * 0.5, y: -W / 2 + r * W / 6, width: 0.5, height: W / 6, class: (r + c) % 2 ? 'dk' : 'lt' }, g); }

  // ── Autos (vistos desde arriba, la nariz hacia +x)
  const CAR = '<rect class="tyre" x="-1.15" y="-.78" width=".55" height=".3" rx=".08"/><rect class="tyre" x="-1.15" y=".48" width=".55" height=".3" rx=".08"/><rect class="tyre" x=".45" y="-.72" width=".45" height=".26" rx=".08"/><rect class="tyre" x=".45" y=".46" width=".45" height=".26" rx=".08"/><rect class="wing" x="-1.45" y="-.6" width=".3" height="1.2" rx=".06"/><path class="body" d="M-1.2 -.32 L.2 -.38 L1.25 -.12 L1.35 0 L1.25 .12 L.2 .38 L-1.2 .32 Z"/><rect class="wing" x="1.1" y="-.62" width=".22" height="1.24" rx=".06"/><circle class="helmet" cx="-.2" cy="0" r=".18"/>';
  const field = [], board = root.querySelector('.lx-standings');
  const add = () => {
    if (field.length >= MAX) return;
    const i = field.length, g = el('g', { class: 'lx-car' }, cars); g.innerHTML = CAR;
    const dur = LAP * (1 + i * 0.011) * (0.99 + Math.random() * 0.02); // cada uno con su ritmo
    const car = { g, laps: i ? -1 : 0, c: ORDER[i], n: i + 1 }; // los de atrás arrancan antes de la meta
    g.style.setProperty('--c', faceColors()[car.c]);
    car.a = animate(g, { ...createMotionPath(path), duration: dur, ease, loop: true, autoplay: !reduceMotion.matches, onLoop: () => { car.laps++; } });
    car.a.seek((dur - i * GAP) % dur); // en fila, detrás del anterior
    field.push(car); count(); stand();
  };
  const drop = () => { const c = field.pop(); if (!c) return; c.a.revert(); c.g.remove(); count(); stand(); };
  const out = root.querySelector('[data-out="cars"]'), plus = root.querySelector('[data-car="+"]'), minus = root.querySelector('[data-car="-"]');
  const count = () => { out.textContent = field.length; plus.disabled = field.length >= MAX; minus.disabled = field.length <= 1; };
  // posiciones: vueltas más lo recorrido de la vuelta actual
  const stand = () => {
    if (!board) return;
    const pos = c => c.laps + ease(c.a.iterationProgress || 0);
    const rank = [...field].sort((x, y) => pos(y) - pos(x));
    board.innerHTML = rank.map((c, i) => `<li style="--c:var(${['--r', '--l', '--u', '--d', '--f', '--b'][c.c]})"><span>P${i + 1}</span><i></i>#${c.n}</li>`).join('');
    const lead = rank[0]; root.querySelector('[data-out="lap"]').textContent = lead ? lead.laps + 1 : 0;
  };
  plus.addEventListener('click', add); minus.addEventListener('click', drop);
  for (let i = 0; i < 4; i++) add();
  setInterval(() => { if (!document.hidden && root.closest('.lx-face')?.classList.contains('is-current')) stand(); }, 400);
  onTheme(() => { const pal = faceColors(); field.forEach(c => c.g.style.setProperty('--c', pal[c.c])); });
  reduceMotion.addEventListener('change', () => field.forEach(c => (reduceMotion.matches ? c.a.pause() : c.a.play())));

  // ── El motor
  const speed = root.querySelector('[data-engine="speed"]'), speedOut = root.querySelector('[data-out="speed"]'), bits = root.querySelector('[data-engine="bits"]');
  speed?.addEventListener('input', () => { engine.speed = +speed.value; speedOut.textContent = (+speed.value).toFixed(1) + '×'; });
  bits?.addEventListener('change', () => { engine.precision = bits.checked ? 0 : 4; root.classList.toggle('is-8bit', bits.checked); });
}
