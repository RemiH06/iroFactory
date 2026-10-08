// ══════════════════════════════════════════════════════
// La carpa se abre · las dos cortinas (con sus pliegues y su bambalina) se
// recogen hacia los lados en 0.9 s, acelerando al soltarse, como un telón de
// verdad; detrás espera la portada. Se puede volver a ver desde el menú de
// pausa. Con reduced motion, la carpa empieza abierta.
// También es la transición del modo: el telón baja, el modo cambia detrás
// y vuelve a abrir (0.45 s de ida y 0.45 s de vuelta).
//   mount({ onOpen }) → { play(), swap(change, end) }
// ══════════════════════════════════════════════════════
import { reduceMotion, setThemeTransition } from './kit.js';

export function mount({ onOpen = () => {} } = {}) {
  const el = document.getElementById('lx-curtain');
  if (!el) { onOpen(); return { play() {}, swap(c, e) { c(); e(); } }; }
  const play = () => {
    if (reduceMotion.matches) { el.hidden = true; onOpen(); return; }
    el.hidden = false; el.classList.remove('is-open'); void el.offsetWidth;
    requestAnimationFrame(() => el.classList.add('is-open'));
    setTimeout(onOpen, 380); // el título empieza cuando ya se asoma
    setTimeout(() => { el.hidden = true; }, 1000);
  };
  el.addEventListener('click', () => { el.classList.add('is-open'); setTimeout(() => { el.hidden = true; }, 600); });
  // espera a las fuentes para que el telón no descubra un salto de letra
  // espera a que cargue la página (proun y fuentes) para no descubrir una portada a medias
  const loaded = document.readyState === 'complete' ? Promise.resolve() : new Promise(r => addEventListener('load', r, { once: true }));
  Promise.all([loaded, document.fonts ? document.fonts.ready : null]).then(() => setTimeout(play, 200));
  // cambio de modo tras el telón
  const swap = (change, end) => {
    if (reduceMotion.matches) { change(); end(); return; }
    el.classList.add('is-quick', 'is-snap', 'is-open'); el.hidden = false; void el.offsetWidth;
    el.classList.remove('is-snap'); void el.offsetWidth;
    el.classList.remove('is-open'); // baja el telón
    setTimeout(() => {
      change();
      setTimeout(() => {
        el.classList.add('is-open'); // y sube con el otro modo
        setTimeout(() => { el.hidden = true; el.classList.remove('is-quick'); end(); }, 480);
      }, 140);
    }, 470);
  };
  setThemeTransition(swap);
  return { play, swap };
}
