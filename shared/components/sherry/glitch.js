// ══════════════════════════════════════════════════════
// Glitch · la máquina se nota al moverse. La primera vez que un nivel
// entra a la vista, su título se descifra letra por letra; al llegar con
// `cd`, además, una barra de barrido de CRT lo cruza y el contenido
// tiembla un instante con aberración de color. Con reduced motion, nada.
// ══════════════════════════════════════════════════════
import { reduceMotion } from './kit.js';

const GLYPHS = '#%&*+=<>/?$@01';

export function scramble(node, ms = 520) {
  if (reduceMotion.matches || node.dataset.scrambling) return;
  const final = node.textContent;
  node.dataset.scrambling = '1';
  node.setAttribute('aria-label', final);
  const t0 = performance.now();
  const step = t => {
    const k = Math.min(1, (t - t0) / ms);
    const fixed = Math.floor(k * final.length);
    node.textContent = [...final].map((c, i) => (i < fixed || c === ' ' ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
    if (k < 1) requestAnimationFrame(step);
    else { node.textContent = final; node.removeAttribute('aria-label'); delete node.dataset.scrambling; }
  };
  requestAnimationFrame(step);
}

export function mount({ levels = '.sherry-level[id^="level-"]' } = {}) {
  const seen = new WeakSet();
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting || seen.has(e.target)) return;
    seen.add(e.target);
    const h = e.target.querySelector('h2');
    if (h) scramble(h);
  }), { rootMargin: '0px 0px -30% 0px' });
  document.querySelectorAll(levels).forEach(l => io.observe(l));

  addEventListener('sh:cd', e => {
    const el = e.detail?.el;
    if (!el || reduceMotion.matches) return;
    setTimeout(() => {
      el.classList.remove('sh-glitch'); void el.offsetWidth; el.classList.add('sh-glitch');
      const h = el.querySelector('h2'); if (h) scramble(h, 420);
      setTimeout(() => el.classList.remove('sh-glitch'), 700);
    }, 450);
  });
}
