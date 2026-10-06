// ══════════════════════════════════════════════════════
// Formulario a pantalla completa · todas las fórmulas, filtrables por
// área con los gises (de día, marcadores) de la repisa.
// ══════════════════════════════════════════════════════
import { $, EASE, coarsePointer, reduceMotion } from './kit.js';

export function mount() {
(() => {
  const box = $('#lm-fs'), openBtn = $('#lm-formula-open'), stage = $('#lm-formula-stage'), closeBtn = $('#lm-fs-close'), count = $('#lm-fs-count');
  if (!box || !openBtn) return;
  const items = [...box.querySelectorAll('.lm-fx')], chalks = [...box.querySelectorAll('.lm-chalk')], body = box.querySelector('.lm-fs-body');
  let last = null, area = 'all';
  const setArea = a => {
    area = a; let n = 0;
    items.forEach(it => { const on = a === 'all' || it.dataset.a === a; it.hidden = !on; if (on) n++; });
    chalks.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.a === a)));
    count.textContent = ` · ${n} de ${items.length}`;
    body.scrollTop = 0;
    if (!reduceMotion.matches) items.filter(it => !it.hidden).slice(0, 24).forEach((it, i) => it.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 240, delay: i * 14, easing: EASE.power2Out, fill: 'backwards' }));
  };
  const show = () => {
    if (!box.hidden) return;
    last = document.activeElement; box.hidden = false; document.documentElement.style.overflow = 'hidden';
    setArea(area); closeBtn.focus();
    if (!reduceMotion.matches) box.animate([{ opacity: 0, transform: 'scale(.985)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EASE.power2Out });
  };
  const hide = () => { if (box.hidden) return; box.hidden = true; document.documentElement.style.overflow = ''; (last && last.isConnected ? last : openBtn).focus({ preventScroll: true }); };
  openBtn.addEventListener('click', e => { e.stopPropagation(); show(); });
  stage.addEventListener('click', e => { if (!coarsePointer.matches && e.target !== openBtn) show(); });
  closeBtn.addEventListener('click', hide);
  chalks.forEach(c => c.addEventListener('click', () => setArea(c.dataset.a === area && area !== 'all' ? 'all' : c.dataset.a)));
  document.addEventListener('keydown', e => {
    if (box.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); hide(); return; }
    if (e.key === 'Tab') { const f = [...box.querySelectorAll('button')]; const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
  });
})();
}
