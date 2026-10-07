// ══════════════════════════════════════════════════════
// Efectos del viaje con anime.js (shared/vendor/anime, MIT):
// al cambiar un rótulo, el texto viejo sube y se desvanece y el nuevo se
// teclea letra por letra, con el ritmo irregular de una máquina de
// escribir. Al llegar, el sello del puerto cae sobre el pase con resorte.
// Con reduced motion el texto cambia de golpe y el sello aparece quieto.
// ══════════════════════════════════════════════════════
import { animate, createTimeline, spring } from 'animejs';
import { $, reduceMotion } from './kit.js';

// Cambia el texto de `el`: el viejo sube y se va, el nuevo se teclea. Con `force`
// lo vuelve a teclear aunque sea el mismo (los códigos del pase al llegar).
export function flip(el, text, { delay = 0, force = false } = {}) {
  if (!el || (el.textContent === text && !force)) return;
  if (reduceMotion.matches) { el.textContent = text; return; }
  const run = (el._flip = (el._flip || 0) + 1), old = el.textContent;
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
  el.setAttribute('aria-label', text);
  const out = document.createElement('span'), typed = document.createElement('span');
  out.className = 'od-flip-out'; out.setAttribute('aria-hidden', 'true'); out.textContent = old;
  typed.setAttribute('aria-hidden', 'true');
  el.textContent = ''; el.append(out, typed); el.classList.add('is-typing');
  animate(out, { y: ['0em', '-0.9em'], opacity: [1, 0], duration: 300, delay, ease: 'in(2)', onComplete: () => out.remove() });
  // Máquina de escribir: cada letra cae a su propio tiempo (40 a 95 ms).
  const tl = createTimeline({ delay: delay + 160, onComplete: () => { if (el._flip !== run) return; el.textContent = text; el.classList.remove('is-typing'); el.removeAttribute('aria-label'); } });
  let t = 0;
  for (let i = 1; i <= text.length; i++) { t += 40 + Math.random() * 55 + (text[i - 1] === ' ' ? 40 : 0); tl.call(() => { if (el._flip === run) typed.textContent = text.slice(0, i); }, t); }
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
  stampEl.querySelector(".od-stamp-n").textContent = `Puerto ${n}`; // «de 7» no cabe en el aro
  const tilt = -14 + Math.random() * 10;
  if (reduceMotion.matches) { stampEl.style.cssText = `opacity:.9;transform:rotate(${tilt}deg)`; return; }
  animate(stampEl, { opacity: [0, 0.92], scale: [2.4, 1], rotate: [tilt - 22, tilt], ease: spring({ bounce: 0.38, duration: 520 }) });
}
export function clearStamp() { if (stampEl) stampEl.style.opacity = '0'; }
