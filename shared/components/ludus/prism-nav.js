// ══════════════════════════════════════════════════════
// Prisma · la página no baja: gira. Las vistas son las caras de un prisma
// hexagonal (CSS 3D) y cambiar de vista lo rota para mostrar otra cara;
// cada cara se desplaza por dentro. Se llega por el cubo, el menú de pausa,
// las flechas de los lados, ←/→, deslizar en táctil o un #enlace.
// Las caras que no están al frente quedan `inert` (ni foco ni lector).
// Con reduced motion, cambia de cara sin girar.
//   const nav = mount({ onChange(i, id) }) → { go(i), next(), prev(), index }
// ══════════════════════════════════════════════════════
import { reduceMotion } from './kit.js';

export function mount({ onChange = () => {} } = {}) {
  const prism = document.getElementById('lx-prism');
  const faces = [...prism.querySelectorAll(':scope > .lx-face')], N = faces.length, STEP = 360 / N;
  const ids = faces.map(f => f.id);
  let cur = 0, turns = 0; // `turns` es continuo, así el giro siempre toma el camino corto
  const place = () => {
    // apotema: distancia del centro del prisma a cada cara, según el ancho de la vista
    const a = prism.clientWidth / (2 * Math.tan(Math.PI / N));
    prism.style.setProperty('--apothem', a + 'px');
    faces.forEach((f, i) => { f.style.transform = `rotateY(${i * STEP}deg) translateZ(${a}px)`; });
    prism.style.transform = `translateZ(${-a}px) rotateY(${-turns * STEP}deg)`;
  };
  const settle = () => faces.forEach((f, i) => { const on = i === cur; f.inert = !on; f.classList.toggle('is-current', on); f.setAttribute('aria-hidden', String(!on)); });
  const go = (i, { focus = false } = {}) => {
    i = ((i % N) + N) % N;
    if (i === cur) return;
    const d = ((i - cur + N + N / 2) % N) - N / 2; // -N/2 … N/2
    turns += d; cur = i;
    faces[i].classList.add('is-arriving'); faces[i].inert = false;
    prism.classList.toggle('is-instant', reduceMotion.matches);
    place();
    const done = () => { faces.forEach(f => f.classList.remove('is-arriving')); settle(); if (focus) faces[cur].focus({ preventScroll: true }); };
    if (reduceMotion.matches) done(); else setTimeout(done, 920);
    history.replaceState(null, '', '#' + ids[cur]);
    onChange(cur, ids[cur]);
  };
  // enlaces internos: si el destino vive en otra cara, girar primero
  const follow = hash => {
    const el = hash && document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!el) return false;
    const f = faces.findIndex(face => face === el || face.contains(el));
    if (f < 0) return false;
    const scroll = () => { if (el !== faces[f]) el.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' }); else faces[f].scrollTo({ top: 0 }); };
    if (f !== cur) { go(f); setTimeout(scroll, reduceMotion.matches ? 0 : 940); } else scroll();
    return true;
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]'); if (!a || a.getAttribute('href') === '#') return;
    if (follow(a.getAttribute('href'))) e.preventDefault();
  });
  addEventListener('keydown', e => {
    if (e.target.closest('input, textarea, select, [contenteditable], .lx-cube')) return;
    if (e.key === 'ArrowRight' && !e.altKey) { e.preventDefault(); go(cur + 1); }
    if (e.key === 'ArrowLeft' && !e.altKey) { e.preventDefault(); go(cur - 1); }
  });
  document.querySelectorAll('[data-prism-go]').forEach(b => b.addEventListener('click', () => { const v = b.dataset.prismGo; go(v === 'next' ? cur + 1 : v === 'prev' ? cur - 1 : ids.indexOf(v)); }));
  // deslizar en táctil (solo si el gesto es claramente horizontal)
  let sw = null;
  prism.addEventListener('touchstart', e => { const t = e.touches[0]; sw = e.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null; }, { passive: true });
  prism.addEventListener('touchend', e => {
    if (!sw) return; const t = e.changedTouches[0], dx = t.clientX - sw.x, dy = t.clientY - sw.y; sw = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > 2 * Math.abs(dy) && !e.target.closest('canvas, pre, .table-wrap, .lx-cubes, .lx-board, .lx-circuit')) go(cur + (dx < 0 ? 1 : -1));
  }, { passive: true });
  new ResizeObserver(place).observe(prism);
  place(); settle();
  // arrancar en la cara del enlace, sin girar
  const start = ids.indexOf(decodeURIComponent(location.hash.slice(1)));
  if (start > 0) { cur = turns = start; prism.classList.add('is-instant'); place(); settle(); requestAnimationFrame(() => prism.classList.remove('is-instant')); }
  onChange(cur, ids[cur]);
  return { go, next: () => go(cur + 1), prev: () => go(cur - 1), get index() { return cur; }, ids };
}
