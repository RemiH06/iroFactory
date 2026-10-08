// ══════════════════════════════════════════════════════
// Shuffle (React Bits) · el título «LUDUS»: cada letra es una ventana y por
// ella pasa una tira de letras al azar que se detiene en la verdadera,
// barriendo a la derecha, letra por letra (0.35 s, 0.03 s entre letras,
// como el original). Corre al abrirse la carpa y otra vez al pasar el cursor.
// El h1 conserva su texto para lectores de pantalla.
// ══════════════════════════════════════════════════════
import { animate } from 'animejs';
import { faceColors, reduceMotion } from './kit.js';

const POOL = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ0123456789#%&?';
export function mount({ el = document.getElementById('lx-title'), shuffles = 6 } = {}) {
  if (!el) return null;
  const word = el.textContent.trim();
  el.setAttribute('aria-label', word);
  el.textContent = '';
  const slots = [...word].map((ch, i) => {
    const w = document.createElement('span'); w.className = 'lx-shuf'; w.setAttribute('aria-hidden', 'true'); w.style.setProperty('--i', i);
    const strip = document.createElement('span'); strip.className = 'lx-shuf-strip';
    w.appendChild(strip); el.appendChild(w);
    return { w, strip, ch };
  });
  let running = false;
  const play = () => {
    if (running) return; running = true;
    const pal = faceColors();
    slots.forEach(({ strip, ch }, i) => {
      const rnd = Array.from({ length: shuffles }, () => POOL[(Math.random() * POOL.length) | 0]);
      strip.innerHTML = [...rnd, ch].map((c, k) => `<span style="${k < shuffles ? `color:${pal[(i + k) % 6]}` : ''}">${c}</span>`).join('');
      if (reduceMotion.matches) { strip.style.transform = `translateX(${-shuffles * 100}%)`; return; }
      strip.style.transform = 'translateX(0%)';
      animate(strip, { translateX: ['0%', `${-shuffles * 100}%`], duration: 350 + shuffles * 30, delay: i * 30, ease: 'out(3)', onComplete: () => { if (i === slots.length - 1) running = false; } });
    });
    if (reduceMotion.matches) running = false;
  };
  slots.forEach(({ strip, ch }) => { strip.innerHTML = `<span>${ch}</span>`; });
  el.addEventListener('pointerenter', play);
  return { play };
}
