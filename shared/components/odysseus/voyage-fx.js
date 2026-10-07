// ══════════════════════════════════════════════════════
// Efectos del viaje con anime.js (shared/vendor/anime, MIT):
// los rótulos se descifran como un tablero de aeropuerto y, al llegar,
// el sello del puerto cae sobre el pase con resorte. Con reduced motion
// el texto cambia de golpe y el sello aparece quieto.
// ══════════════════════════════════════════════════════
import { animate, scrambleText, spring } from 'animejs';
import { $, reduceMotion } from './kit.js';

// Cambia el texto de `el` descifrándolo; si ya dice eso, solo lo descifra con `force`.
export function flip(el, text, { chars = 'A-Z', delay = 0, force = false } = {}) {
  if (!el || (el.textContent === text && !force)) return;
  if (reduceMotion.matches) { el.textContent = text; return; }
  el.setAttribute('aria-label', text);
  animate(el, { innerHTML: scrambleText({ text, chars, from: 'left', cursor: '▌', revealRate: 46, settleDuration: 260, delay }), onComplete: () => el.removeAttribute('aria-label') });
}

const ticket = $('#od-ticket');
const body = ticket && ticket.querySelector('.tear-ticket__piece--body .tear-ticket__paper');
let stampEl = null;
// El sello va dentro del cuerpo del pase (no del talón, que se arranca).
export function stamp(port, n) {
  if (!body) return;
  if (!stampEl) {
    stampEl = document.createElement('div'); stampEl.className = 'od-stamp'; stampEl.setAttribute('aria-hidden', 'true');
    stampEl.innerHTML = '<span class="od-stamp-code"></span><span class="od-stamp-name"></span><span class="od-stamp-n"></span>';
    body.appendChild(stampEl);
  }
  stampEl.querySelector('.od-stamp-code').textContent = port.iata;
  stampEl.querySelector('.od-stamp-name').textContent = port.name;
  stampEl.querySelector('.od-stamp-n').textContent = `Puerto ${n} de 7`;
  const tilt = -14 + Math.random() * 10;
  if (reduceMotion.matches) { stampEl.style.cssText = `opacity:.9;transform:rotate(${tilt}deg)`; return; }
  animate(stampEl, { opacity: [0, 0.92], scale: [2.4, 1], rotate: [tilt - 22, tilt], ease: spring({ bounce: 0.38, duration: 520 }) });
}
export function clearStamp() { if (stampEl) stampEl.style.opacity = '0'; }
