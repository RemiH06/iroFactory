// ══════════════════════════════════════════════════════
// Logo Loop (React Bits) · una tira por área. Cada tira se repite tantas
// veces como haga falta y avanza a su velocidad, alternando el sentido; la
// velocidad se suaviza (tau .25 s) y frena al pasar el cursor.
// ══════════════════════════════════════════════════════
import { makeLoop, reduceMotion, updateHexes } from './kit.js';

export function mount() {
document.querySelectorAll('.logoloop').forEach((root, idx) => {
  const track = root.querySelector('.logoloop__track'), list = track.querySelector('.logoloop__list');
  const dir = idx % 2 ? -1 : 1, SPEED = 38 + (idx % 3) * 9, TAU = 0.25;
  let copies = 1, seqW = 0, offset = 0, vel = 0, hovered = false, last = 0;
  const setup = () => {
    seqW = list.getBoundingClientRect().width;
    const need = Math.max(2, Math.ceil(root.clientWidth / Math.max(seqW, 1)) + 2);
    while (copies < need) { const c = list.cloneNode(true); c.setAttribute('aria-hidden', 'true'); track.appendChild(c); copies++; }
  };
  const frame = t => {
    const dt = last ? Math.min(0.1, Math.max(0, t - last) / 1000) : 0; last = t;
    vel += ((hovered ? 0 : SPEED * dir) - vel) * (1 - Math.exp(-dt / TAU));
    if (seqW > 0) { offset = ((offset + vel * dt) % seqW + seqW) % seqW; track.style.transform = `translate3d(${-offset}px,0,0)`; }
  };
  root.addEventListener('pointerenter', () => { hovered = true; });
  root.addEventListener('pointerleave', () => { hovered = false; });
  if (reduceMotion.matches) return;
  setup(); if (document.fonts) document.fonts.ready.then(setup);
  new ResizeObserver(setup).observe(root);
  makeLoop(root, frame);
});
updateHexes();
}
