// ── Navegación: Line Sidebar (React Bits) + sección visible ─────
import { $, reduceMotion } from './kit.js';

export function mount() {
(() => {
  const nav = $('.ex-nav'), list = nav.querySelector('.line-sidebar__list'), items = [...list.children];
  const targets = items.map(() => 0), current = items.map(() => 0);
  let active = 0, raf = 0, last = 0;
  const ease = p => p * p * (3 - 2 * p);
  const run = now => {
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    const k = 1 - Math.exp(-dt / 0.1);
    let moving = false;
    items.forEach((el, i) => {
      const target = Math.max(targets[i], active === i ? 1 : 0);
      const next = current[i] + (target - current[i]) * k;
      const settled = Math.abs(target - next) < 0.0015;
      current[i] = settled ? target : next;
      el.style.setProperty('--effect', current[i].toFixed(4));
      if (!settled) moving = true;
    });
    raf = moving ? requestAnimationFrame(run) : 0;
  };
  const kick = () => { if (reduceMotion.matches) { items.forEach((el, i) => el.style.setProperty('--effect', String(Math.max(targets[i], active === i ? 1 : 0)))); return; } if (!raf) { last = performance.now(); raf = requestAnimationFrame(run); } };
  list.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const rect = list.getBoundingClientRect(), y = e.clientY - rect.top;
    items.forEach((el, i) => { const c = el.offsetTop + el.offsetHeight / 2; targets[i] = ease(Math.max(0, 1 - Math.abs(y - c) / 100)); });
    kick();
  });
  list.addEventListener('pointerleave', () => { targets.fill(0); kick(); });
  const segs = [...document.querySelectorAll('[data-seg]')];
  const setActive = i => {
    active = i;
    items.forEach((el, j) => { const a = el.querySelector('a'); if (j === i) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    kick();
  };
  const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) setActive(+e.target.dataset.seg); }), { rootMargin: '-45% 0px -50% 0px' });
  segs.forEach(s => io.observe(s));
  setActive(0);
})();
}
