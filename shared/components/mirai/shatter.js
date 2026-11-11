// ══════════════════════════════════════════════════════
// mirai · shatter: los usos incorrectos del logo son frágiles. Tiemblan
// cuando el cursor pasa encima; el primer clic parte el logo en cuatro,
// cada clic separa más los pedazos y, al llegar a `hits`, salen volando y
// queda el uso correcto.
// El temblor va cuantizado (steps): es seco, como todo en el tema.
// Se enchufa a doc-brand con `enhance` y `onWrong`:
//   const sh = shatter({ hits: 4 });
//   docBrand({ …, enhance: sh.arm, onWrong: sh.hit });
// Con reduced motion no hay temblor: el primer clic corrige.
// ══════════════════════════════════════════════════════
import { animate, stagger, steps, utils } from 'animejs';
import { reduceMotion } from '../../core/core.js';

const CLIPS = ['inset(0 50% 50% 0)', 'inset(0 0 50% 50%)', 'inset(50% 50% 0 0)', 'inset(50% 0 0 50%)'], DIR = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
const snap = (lo, hi, to) => Math.round(utils.random(lo, hi) / to) * to;

export function shatter({ hits = 4 } = {}) {
  const parts = b => [...b.querySelectorAll('.sh-q, .sh-l, .db-bad > svg')];
  const rest = (el, b, axis) => (+el.dataset[axis] || 0) * (b._hits || 0) * 1.5; // cada golpe separa un poco más los pedazos
  const wobble = (b, n) => {
    if (reduceMotion.matches) return;
    animate(parts(b), { x: [{ to: () => snap(-3, 3, 2) * n, duration: 90 }, { to: el => rest(el, b, 'x'), duration: 200 }], y: [{ to: () => snap(-3, 3, 2) * n, duration: 90 }, { to: el => rest(el, b, 'y'), duration: 200 }], rotate: [{ to: () => snap(-6, 6, 3) * n, duration: 90 }, { to: 0, duration: 200 }], ease: steps(2), delay: stagger(12) });
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
      // se rompe: los pedazos salen por módulos y se apagan
      return animate(parts(b), { x: el => (+el.dataset.x || 0) * snap(40, 90, 10), y: el => (+el.dataset.y || 0) * snap(30, 80, 10), rotate: () => snap(-90, 90, 15), opacity: 0, duration: 420, ease: steps(5), delay: stagger(14), onComplete: fix });
    }
    if (count) count.textContent = `${n}/${hits}`;
    b.setAttribute('aria-label', `Uso incorrecto: ${w.label}. Golpe ${n} de ${hits}.`);
    wobble(b, n + 1);
  }
  return { arm, hit };
}
