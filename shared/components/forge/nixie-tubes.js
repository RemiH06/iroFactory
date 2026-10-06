// ══════════════════════════════════════════════════════
// Nixies con Split Flap Text (React Bits) · cada tubo cicla caracteres al
// azar antes de asentarse (8 saltos de 120 ms, 60 ms entre tubos), como los
// relojes nixie que recorren sus cátodos. Los tubos no cambian de color.
// ══════════════════════════════════════════════════════
import { $, cssVar, onTheme, reduceMotion } from './kit.js';

export const NIXIE_SET = '0123456789ABCDEF';
export const lightTo = (el, c) => { el.textContent = c.trim(); };
export function nixieTo(row, text, opts = {}) {
  const tubes = [...row.querySelectorAll('.tube')], flips = opts.flips ?? 8, FLIP = 120, STAG = 60;
  const target = String(text).padEnd(tubes.length, ' ').slice(0, tubes.length);
  if (row._raf) cancelAnimationFrame(row._raf);
  if (reduceMotion.matches || !flips) { tubes.forEach((t, i) => { lightTo(t.querySelector('.lit'), target[i]); t.classList.remove('is-flip'); }); return; }
  const plans = tubes.map((t, i) => ({ el: t.querySelector('.lit'), tube: t, seq: [...Array.from({ length: flips }, () => NIXIE_SET[Math.floor(Math.random() * 16)]), target[i]], start: i * STAG, step: -1 }));
  const t0 = performance.now();
  const tick = now => {
    let more = false;
    plans.forEach(p => {
      const s = Math.floor((now - t0 - p.start) / FLIP);
      if (s < 0) { more = true; return; }
      if (s < p.seq.length) { more = true; if (s !== p.step) { p.step = s; lightTo(p.el, p.seq[s]); p.tube.classList.toggle('is-flip', s < p.seq.length - 1); } }
      else if (p.step !== 'fin') { p.step = 'fin'; lightTo(p.el, p.seq[p.seq.length - 1]); p.tube.classList.remove('is-flip'); }
    });
    row._raf = more ? requestAnimationFrame(tick) : 0;
  };
  row._raf = requestAnimationFrame(tick);
}
export function mount() {
(() => {
  const title = $('#fg-title'), hex = $('#fg-hexrow'), cap = $('#fg-hex-text');
  const hexOf = () => cssVar('--accent').replace('#', '').toUpperCase();
  const run = () => { nixieTo(title, 'FORGE'); const h = hexOf(); nixieTo(hex, h, { flips: 10 }); cap.textContent = h; };
  run(); onTheme(run);
  // Las lecturas de §3 recorren sus cátodos al aparecer.
  document.querySelectorAll('.np .nixies').forEach(row => new IntersectionObserver(([e], o) => { if (e.isIntersecting) { o.disconnect(); nixieTo(row, row.dataset.v, { flips: 6 }); } }, { threshold: 0.4 }).observe(row));
})();
}
