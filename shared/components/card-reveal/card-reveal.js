// Entrada escalonada de tarjetas al aparecer y conteo de cifras (data-count,
// data-suffix). Con reduced motion no hace nada: todo queda visible.
import { $, $$, theme, cssVar, hexRgb, rgb01, rgba, onTheme, reduceMotion, makeLoop, glProgram, EASE } from '../../core/core.js';

export function mount(opts = {}) {
  const cards = $$(opts.selector ?? '.card-b');
  const count = el => { const raw = el.dataset.count, target = parseFloat(raw), dec = raw.includes('.') ? raw.split('.')[1].length : 0, suf = el.dataset.suffix || '', t0 = performance.now(); const tick = now => { const p = Math.min((now - t0) / 1100, 1), v = target * (1 - Math.pow(1 - p, 3)); el.textContent = v.toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suf; if (p < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); };
  if (reduceMotion.matches) return;
  cards.forEach(c => c.classList.add('pre'));
  const io = new IntersectionObserver(entries => {
    entries.filter(e => e.isIntersecting).forEach((e, i) => {
      io.unobserve(e.target);
      e.target.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 450, delay: Math.min(i, 6) * 60, easing: EASE.power2Out, fill: 'backwards' });
      e.target.classList.remove('pre');
      e.target.querySelectorAll('.metric-val[data-count]').forEach(count);
    });
  }, { threshold: .12 });
  cards.forEach(c => io.observe(c));
  setTimeout(() => cards.forEach(c => c.classList.remove('pre')), 3500);
}
