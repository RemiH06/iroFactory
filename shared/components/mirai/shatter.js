// ══════════════════════════════════════════════════════
// mirai · shatter: los usos incorrectos del logo son frágiles. Tiemblan
// cuando el cursor pasa encima; el primer clic parte el logo en cuatro,
// cada clic separa más los pedazos y, al llegar a `hits`, salen volando y
// queda el uso correcto.
// El temblor es un golpe corto que regresa con resorte (anime.js): se
// siente como algo que cede, no como un error.
// Se enchufa a doc-brand con `enhance` y `onWrong`:
//   const sh = shatter({ hits: 4 });
//   docBrand({ …, enhance: sh.arm, onWrong: sh.hit });
// Con reduced motion no hay temblor: el primer clic corrige.
// ══════════════════════════════════════════════════════
import { animate, spring, stagger, utils } from 'animejs';
import { reduceMotion } from '../../core/core.js';

const CLIPS = ['inset(0 50% 50% 0)', 'inset(0 0 50% 50%)', 'inset(50% 50% 0 0)', 'inset(50% 0 0 50%)'], DIR = [[-1, -1], [1, -1], [-1, 1], [1, 1]];

export function shatter({ hits = 4 } = {}) {
  const parts = b => [...b.querySelectorAll('.sh-q, .sh-l, .db-bad > svg')];
  const rest = (el, b, axis) => (+el.dataset[axis] || 0) * (b._hits || 0) * 1.5; // cada golpe separa un poco más los pedazos
  const back = () => spring({ bounce: .58, duration: 460 });
  const wobble = (b, n) => {
    if (reduceMotion.matches) return;
    animate(parts(b), {
      x: [{ to: () => utils.random(-4, 4, 1) * n, duration: 70, ease: 'out(2)' }, { to: el => rest(el, b, 'x'), ease: back() }],
      y: [{ to: () => utils.random(-4, 4, 1) * n, duration: 70, ease: 'out(2)' }, { to: el => rest(el, b, 'y'), ease: back() }],
      rotate: [{ to: () => utils.random(-7, 7, 1) * n, duration: 70, ease: 'out(2)' }, { to: 0, ease: back() }],
      delay: stagger(9),
    });
  };
  function arm(b) {
    b._hits = 0;
    // la etiqueta, letra por letra
    const lab = b.querySelector('.db-label-bad'), text = lab.textContent;
    lab.innerHTML = [...text].map((ch, i) => (ch === ' ' ? ' ' : `<span class="sh-l" data-x="${i % 2 ? 1 : -1}" data-y="${i % 3 ? -1 : 1}">${ch.replace(/[&<>]/g, '')}</span>`)).join('');
    lab.insertAdjacentHTML('afterend', `<span class="sh-count" aria-hidden="true">0/${hits}</span>`);
    b.addEventListener('pointerenter', () => { if (!b.classList.contains('is-fixed')) wobble(b, 1); });
  }
  function hit(b, fix, w) {
    const n = ++b._hits, count = b.querySelector('.sh-count');
    // al primer golpe el logo se parte en cuatro cuartos (antes está entero, sin costuras)
    const bad = b.querySelector('.db-bad'), whole = bad.querySelector(':scope > svg');
    if (whole) { utils.remove(whole); whole.removeAttribute('style'); } // sin el temblor a medias
    if (whole) bad.innerHTML = CLIPS.map((c, i) => `<span class="sh-q" data-x="${DIR[i][0]}" data-y="${DIR[i][1]}" style="clip-path:${c}">${whole.outerHTML}</span>`).join('');
    if (reduceMotion.matches || n >= hits) {
      count?.remove();
      if (reduceMotion.matches) return fix();
      // se rompe: los pedazos salen despedidos, frenan y se apagan
      return animate(parts(b), { x: el => (+el.dataset.x || 0) * utils.random(50, 120), y: el => (+el.dataset.y || 0) * utils.random(40, 100), rotate: () => utils.random(-140, 140), opacity: { to: 0, ease: 'in(2)' }, duration: 620, ease: 'out(4)', delay: stagger(12), onComplete: fix });
    }
    if (count) count.textContent = `${n}/${hits}`;
    b.setAttribute('aria-label', `Uso incorrecto: ${w.label}. Golpe ${n} de ${hits}.`);
    wobble(b, n + 1);
  }
  return { arm, hit };
}
