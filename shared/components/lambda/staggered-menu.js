// ══════════════════════════════════════════════════════
// Staggered Menu (React Bits) · GSAP → Web Animations. Mismos tiempos:
// capas cada 70 ms (0.5 s), panel 0.65 s, renglones que suben girados
// 10° en cascada de 0.1 s, números que aparecen, cierre de 0.32 s.
// ══════════════════════════════════════════════════════
import { $, EASE, reduceMotion } from './kit.js';

export function mount() {
(() => {
  const btn = $('#sm-toggle'), panel = $('#staggered-menu-panel'), layers = [...document.querySelectorAll('.sm-prelayer')];
  const inner = btn.querySelector('.sm-toggle-textInner'), wrap = btn.querySelector('.sm-toggle-textWrap'), icon = btn.querySelector('.sm-icon');
  const labels = [...panel.querySelectorAll('.sm-panel-itemLabel')], links = [...panel.querySelectorAll('.sm-panel-item')], extras = panel.querySelector('.sm-extras');
  let open = false, anims = [], textAnim = null, iconAnim = null, closing = null;
  wrap.style.width = '6ch';
  const run = (el, kf, opt) => { const a = el.animate(kf, { fill: 'both', ...opt }); anims.push(a); return a; };
  const kill = () => { anims.forEach(a => a.cancel()); anims = []; if (closing) { closing.forEach(a => a.cancel()); closing = null; } };
  const cycleText = opening => {
    const from = opening ? 'Menú' : 'Cerrar', to = opening ? 'Cerrar' : 'Menú', seq = [from]; let last = from;
    for (let i = 0; i < 3; i++) { last = last === 'Menú' ? 'Cerrar' : 'Menú'; seq.push(last); }
    if (last !== to) seq.push(to); seq.push(to);
    inner.innerHTML = seq.map(l => `<span class="sm-toggle-line">${l}</span>`).join('');
    if (textAnim) textAnim.cancel();
    if (reduceMotion.matches) { inner.innerHTML = `<span class="sm-toggle-line">${to}</span>`; return; }
    textAnim = inner.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${-(seq.length - 1) / seq.length * 100}%)` }], { duration: 500 + seq.length * 70, easing: EASE.power4Out, fill: 'forwards' });
  };
  const spin = opening => { if (iconAnim) iconAnim.cancel(); iconAnim = icon.animate([{ transform: `rotate(${opening ? 0 : 225}deg)` }, { transform: `rotate(${opening ? 225 : 0}deg)` }], { duration: reduceMotion.matches ? 0 : opening ? 800 : 350, easing: opening ? EASE.power4Out : EASE.power2InOut, fill: 'forwards' }); };
  function openMenu() {
    if (open) return; open = true; kill();
    panel.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); btn.setAttribute('aria-label', 'Cerrar menú');
    cycleText(true); spin(true);
    const rm = reduceMotion.matches, d = ms => (rm ? 0 : ms);
    layers.forEach((l, i) => run(l, [{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }], { duration: d(500), delay: d(i * 70), easing: EASE.power4Out }));
    const pt = (layers.length - 1) * 70 + 80;
    run(panel, [{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }], { duration: d(650), delay: d(pt), easing: EASE.power4Out });
    const itemsStart = pt + 650 * 0.15;
    labels.forEach((l, i) => run(l, [{ transform: 'translateY(140%) rotate(10deg)' }, { transform: 'translateY(0) rotate(0deg)' }], { duration: d(1000), delay: d(itemsStart + i * 100), easing: EASE.power4Out }));
    links.forEach((a, i) => run(a, [{ '--sm-num-opacity': 0 }, { '--sm-num-opacity': 1 }], { duration: d(600), delay: d(itemsStart + 100 + i * 80), easing: EASE.power2Out }));
    run(extras, [{ opacity: 0, transform: 'translateY(25px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: d(550), delay: d(pt + 650 * 0.4), easing: EASE.power2Out });
    setTimeout(() => { if (open) links[0].focus({ preventScroll: true }); }, rm ? 0 : pt + 200);
  }
  function closeMenu(focusBtn) {
    if (!open) return; open = false;
    btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', 'Abrir menú');
    cycleText(false); spin(false);
    const done = () => { kill(); panel.classList.remove('is-open'); };
    if (reduceMotion.matches) done();
    else closing = [...layers, panel].map(el => { const a = el.animate([{ transform: getComputedStyle(el).transform === 'none' ? 'translateX(0)' : getComputedStyle(el).transform }, { transform: 'translateX(100%)' }], { duration: 320, easing: EASE.power3In, fill: 'forwards' }); return a; }), closing[closing.length - 1].onfinish = done;
    if (focusBtn) btn.focus();
  }
  btn.addEventListener('click', () => (open ? closeMenu() : openMenu()));
  links.forEach(a => a.addEventListener('click', () => closeMenu()));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && open) closeMenu(true); });
  document.addEventListener('pointerdown', e => { if (open && !panel.contains(e.target) && !btn.contains(e.target)) closeMenu(); });
})();
}
