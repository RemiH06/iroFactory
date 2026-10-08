// ══════════════════════════════════════════════════════
// La carpa se abre · las dos cortinas (con sus pliegues y su bambalina) se
// recogen hacia los lados en 0.9 s, acelerando al soltarse, como un telón de
// verdad; detrás espera la portada. Se puede volver a ver desde el menú de
// pausa. Con reduced motion, la carpa empieza abierta.
//   mount({ onOpen }) → { play() }
// ══════════════════════════════════════════════════════
import { reduceMotion } from './kit.js';

export function mount({ onOpen = () => {} } = {}) {
  const el = document.getElementById('lx-curtain');
  if (!el) { onOpen(); return { play() {} }; }
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
  return { play };
}
