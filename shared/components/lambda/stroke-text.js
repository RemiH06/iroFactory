// ══════════════════════════════════════════════════════
// Stroke Text (React Bits) · el trazo de cada letra se dibuja en cascada
// (dasharray 7× el tamaño, 1.6 s, 0.05 s entre letras) y luego una cortina
// rellena el título. GSAP → Web Animations sobre el SVG. La λ de la
// cabecera regresa al inicio y vuelve a escribir el título.
// ══════════════════════════════════════════════════════
import { $, EASE, reduceMotion } from './kit.js';

export function mount() {
(() => {
  const svg = $('.stroke-text__svg'); if (!svg) return;
  const stroke = svg.querySelector('.stroke-text__stroke'), rect = $('#lm-wipe-rect'), chars = [...stroke.querySelectorAll('tspan')];
  const DASH = 200 * 7; let anims = [];
  const fit = () => {
    let b; try { b = stroke.getBBox(); } catch { return; }
    if (!b || !b.width) return;
    const pad = 20; svg.setAttribute('viewBox', `${b.x - pad} ${b.y - pad} ${b.width + pad * 2} ${b.height + pad * 2}`);
    rect.setAttribute('x', b.x - pad); rect.setAttribute('y', b.y - pad); rect.setAttribute('width', b.width + pad * 2); rect.setAttribute('height', b.height + pad * 2);
  };
  const ready = document.fonts ? document.fonts.ready : Promise.resolve();
  if (reduceMotion.matches) { ready.then(fit); return; }
  chars.forEach(c => { c.style.strokeDasharray = DASH; c.style.strokeDashoffset = DASH; });
  rect.style.transformBox = 'fill-box'; rect.style.transformOrigin = '0 50%'; rect.style.transform = 'scaleX(0)';
  const play = (delay = 150) => {
    anims.forEach(a => a.cancel()); anims = [];
    chars.forEach((c, i) => anims.push(c.animate([{ strokeDashoffset: DASH }, { strokeDashoffset: 0 }], { duration: 1600, delay: delay + i * 50, easing: EASE.power2Out, fill: 'both' })));
    anims.push(rect.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 800, delay: delay + 1600 + 200, easing: EASE.power2InOut, fill: 'both' }));
  };
  ready.then(() => { fit(); play(); });
  $('.lm-brand').addEventListener('click', () => { if (!reduceMotion.matches) play(320); });
})();
}
