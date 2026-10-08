// ══════════════════════════════════════════════════════
// Montaña rusa · vagones que siguen una vía SVG con createMotionPath de
// anime.js. La velocidad sale de la física: se calcula, punto por punto de
// la vía, la rapidez por conservación de energía (v² = v₀² + 2g·caída) y con
// eso una curva de tiempo propia (el ease): baja rápido, sube lento y en el
// rizo casi se detiene arriba.
// Los controles del motor de anime.js mueven toda la página:
//  · engine.speed: la velocidad del tiempo, de 0.1× a 3×.
//  · engine.precision: «8 bits» la pone en 0 (sin decimales), así que cada
//    valor animado salta de entero en entero. La vía mide unas 150 unidades
//    (un viewBox chico a propósito): cada unidad son ~11 px en pantalla, así
//    que los vagones avanzan a saltos, como en una consola vieja.
// ══════════════════════════════════════════════════════
import { animate, createMotionPath, engine } from 'animejs';
import { faceColors, onTheme, reduceMotion } from './kit.js';

// trazada a 240×120 y reducida a la cuarta parte (ver arriba)
const TRACK = 'M20 30 C50 30 55 100 85 100 C120 100 125 45 105 45 C85 45 90 100 125 100 C145 100 150 60 165 60 C180 60 185 100 205 100 C235 100 235 112 205 112 L30 112 C5 112 5 30 20 30 Z'.replace(/[\d.]+/g, n => +n / 4);
const MAX = 6, GAP = 260, LAP = 7000;

export function mount({ root = document.getElementById('lx-coaster') } = {}) {
  if (!root) return;
  const svg = root.querySelector('svg'), path = svg.querySelector('.lx-track-path'), carts = svg.querySelector('.lx-carts');
  svg.querySelectorAll('.lx-track').forEach(p => p.setAttribute('d', TRACK)); path.setAttribute('d', TRACK);
  // curva de tiempo por energía: t(s) = ∫ ds / v(s), normalizada
  const L = path.getTotalLength(), n = 600, ys = [];
  for (let i = 0; i <= n; i++) ys.push(path.getPointAtLength(L * i / n).y);
  const top = Math.min(...ys), T = [0];
  for (let i = 1; i <= n; i++) T.push(T[i - 1] + 1 / Math.sqrt(2.25 + 2.25 * ((ys[i] + ys[i - 1]) / 2 - top)));
  const tot = T[n];
  const ease = t => { // tiempo → distancia (búsqueda binaria en la tabla)
    const x = t * tot; let lo = 0, hi = n;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m] < x) lo = m; else hi = m; }
    return (lo + (x - T[lo]) / ((T[hi] - T[lo]) || 1)) / n;
  };
  const NS = 'http://www.w3.org/2000/svg', trains = [];
  const add = () => {
    if (trains.length >= MAX) return;
    const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'lx-cart');
    g.innerHTML = '<rect x="-1.5" y="-2" width="3" height="1.6" rx=".45"/><circle cx="-.85" cy="-.25" r=".38"/><circle cx=".85" cy="-.25" r=".38"/>';
    g.style.setProperty('--c', faceColors()[[4, 0, 5, 1, 2, 3][trains.length]]);
    carts.appendChild(g);
    const a = animate(g, { ...createMotionPath(path), duration: LAP, ease, loop: true, autoplay: !reduceMotion.matches });
    a.seek((LAP - trains.length * GAP) % LAP); // detrás del anterior
    trains.push({ g, a }); count();
  };
  const drop = () => { const t = trains.pop(); if (!t) return; t.a.revert(); t.g.remove(); count(); };
  const out = root.querySelector('[data-out="carts"]');
  const count = () => { if (out) out.textContent = trains.length; root.querySelector('[data-cart="+"]').disabled = trains.length >= MAX; root.querySelector('[data-cart="-"]').disabled = trains.length <= 1; };
  root.querySelector('[data-cart="+"]').addEventListener('click', add);
  root.querySelector('[data-cart="-"]').addEventListener('click', drop);
  for (let i = 0; i < 3; i++) add();
  onTheme(() => { const pal = faceColors(); trains.forEach((t, i) => t.g.style.setProperty('--c', pal[[4, 0, 5, 1, 2, 3][i]])); });
  reduceMotion.addEventListener('change', () => trains.forEach(t => (reduceMotion.matches ? t.a.pause() : t.a.play())));

  // ── El motor
  const speed = root.querySelector('[data-engine="speed"]'), speedOut = root.querySelector('[data-out="speed"]'), bits = root.querySelector('[data-engine="bits"]');
  speed?.addEventListener('input', () => { engine.speed = +speed.value; speedOut.textContent = (+speed.value).toFixed(1) + '×'; });
  bits?.addEventListener('change', () => { engine.precision = bits.checked ? 0 : 4; root.classList.toggle('is-8bit', bits.checked); });
}
