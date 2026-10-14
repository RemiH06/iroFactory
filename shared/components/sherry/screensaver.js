// ══════════════════════════════════════════════════════
// Screensaver · tras un minuto sin tocar nada, la página se apaga: la
// retícula de triángulos pasa al frente y se enciende sola a pulsos, con
// un reloj en Doto y la mascota dormida en grande. Cualquier tecla,
// movimiento o toque lo quita. `saver` lo enciende a mano. Con reduced
// motion no se enciende solo.
//   mount({ idle: 60000 })
// ══════════════════════════════════════════════════════
import { reduceMotion, cssVar } from './kit.js';
import { forceBloom, pulse } from './neon-bloom.js';
import { petInfo, paintSprite } from './pet.js';
import { addCommand } from './terminal.js';

const NEONS = ['--magenta', '--cyan', '--lime', '--violet', '--electric', '--aqua'];

export function mount({ idle = 60000 } = {}) {
  let last = performance.now(), el = null, dim = null, timers = [];
  const stop = () => {
    if (!el) return;
    timers.forEach(clearInterval); timers = [];
    el.remove(); el = null; dim.remove(); dim = null;
    document.body.classList.remove('sh-saving');
    forceBloom(false);
    dispatchEvent(new CustomEvent('sh:saver', { detail: false }));
  };
  const start = () => {
    if (el || document.querySelector('.sh-boot') || document.querySelector('dialog[open]')) return;
    el = document.createElement('div');
    el.className = 'sh-saver';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Protector de pantalla. Cualquier tecla lo quita.');
    el.innerHTML = '<div class="sh-saver-box"><canvas class="sh-saver-pet" aria-hidden="true"></canvas><p class="sh-saver-clock"></p><p class="sh-saver-date"></p><p class="sh-saver-hint">cualquier tecla para volver</p></div>';
    // la penumbra va debajo de la retícula y el reloj encima: dos capas
    dim = document.createElement('div');
    dim.className = 'sh-saver-dim';
    document.body.append(dim, el);
    document.body.classList.add('sh-saving');
    forceBloom(true);
    dispatchEvent(new CustomEvent('sh:saver', { detail: true }));
    const clock = el.querySelector('.sh-saver-clock'), date = el.querySelector('.sh-saver-date');
    const paintClock = () => {
      const d = new Date();
      clock.textContent = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      date.textContent = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    };
    paintClock();
    const p = petInfo(), cv = el.querySelector('canvas');
    if (p) {
      const s = 6, f = p.sprite.frames[p.sprite.frames.length - 1];
      cv.width = cv.height = 32 * s;
      paintSprite(cv.getContext('2d'), f, s, p.mood === 'dead' ? { body: cssVar('--text3'), detail: cssVar('--text3') } : { body: cssVar('--lime'), detail: cssVar('--magenta') });
    } else cv.remove();
    let k = 0;
    timers.push(setInterval(paintClock, 1000));
    if (!reduceMotion.matches) timers.push(setInterval(() => pulse(Math.random() * innerWidth, Math.random() * innerHeight, cssVar(NEONS[k++ % NEONS.length])), 900));
  };
  const poke = () => { last = performance.now(); stop(); };
  ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(t => addEventListener(t, poke, { passive: true, capture: true }));
  setInterval(() => { if (!el && !document.hidden && !reduceMotion.matches && performance.now() - last > idle) start(); }, 2000);
  addCommand('saver', { help: 'enciende el protector de pantalla', entry: { group: 'Acciones', label: 'Protector de pantalla', keys: 'screensaver reloj dormir' }, fn: () => { setTimeout(() => { last = performance.now(); start(); }, 400); return ['Protector en un momento; cualquier tecla lo quita.']; } });
}
