// ══════════════════════════════════════════════════════
// Tablero · cada breaker es una sección. Al accionarlo, o al llegar a la
// sección, la carga viaja por los cables hasta la píldora del título y la
// enciende (riff de Figma de @hardikgondhiya).
// ══════════════════════════════════════════════════════
import { EASE, reduceMotion } from './kit.js';

export function mount() {
(() => {
  const breakers = [...document.querySelectorAll('.breaker')], ids = breakers.map(b => b.getAttribute('href').slice(1)), secs = ids.map(id => document.getElementById(id));
  let current = null;
  const charge = id => {
    const head = document.getElementById(id).querySelector('.fg-head'); if (!head) return;
    const pill = head.querySelector('.fg-pill'), charges = [...head.querySelectorAll('.charge')];
    if (reduceMotion.matches) { pill.classList.add('is-lit'); return; }
    pill.classList.remove('is-lit');
    charges.forEach((c, i) => c.animate([{ strokeDashoffset: 70, opacity: 1 }, { strokeDashoffset: -930, opacity: 1, offset: 0.92 }, { strokeDashoffset: -1000, opacity: 0 }], { duration: 1100, delay: i * 70, easing: EASE.power2In, fill: 'both' }));
    clearTimeout(head._t); head._t = setTimeout(() => pill.classList.add('is-lit'), 980);
  };
  const setActive = id => {
    if (id === current) return;
    if (current) { const h = document.getElementById(current).querySelector('.fg-pill'); if (h) h.classList.remove('is-lit'); }
    current = id;
    breakers.forEach(b => b.setAttribute('aria-current', String(b.getAttribute('href') === '#' + id)));
    charge(id);
  };
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }), { rootMargin: '-45% 0px -50% 0px' });
  secs.forEach(s => io.observe(s));
  breakers.forEach(b => b.addEventListener('click', () => { const lever = b.querySelector('.breaker-lever'); if (!reduceMotion.matches) lever.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-3px)' }, { transform: 'translateY(0)' }], { duration: 220 }); }));
  setActive('portada');
})();
}
