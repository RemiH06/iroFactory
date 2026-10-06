// ══════════════════════════════════════════════════════
// Blur Text (React Bits, motion → Web Animations): letras o palabras que
// llegan desde el desenfoque al entrar en pantalla, con retraso escalonado.
// ══════════════════════════════════════════════════════
import { reduceMotion } from './kit.js';

// Y2KBUG no trae vocales acentuadas: se dibuja la base y la tilde va en CSS.
// Los spans ya son aria-hidden y el h2 conserva el texto real en aria-label.
export const ACUTE = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U' };
export function mount() {
document.querySelectorAll('.blur-text').forEach(el => {
  const by = el.dataset.blur || 'words', delay = +(el.dataset.delay || (by === 'letters' ? 50 : 120)), text = el.textContent.trim();
  const parts = by === 'letters' ? [...text] : text.split(' ');
  el.setAttribute('aria-label', text); el.textContent = '';
  const spans = parts.map((s, i) => { const sp = document.createElement('span'); sp.setAttribute('aria-hidden', 'true'); sp.textContent = (s === ' ' ? ' ' : s) + (by === 'words' && i < parts.length - 1 ? ' ' : ''); el.appendChild(sp); return sp; });
  if (reduceMotion.matches) return;
  const from = { filter: 'blur(10px)', opacity: 0, transform: 'translateY(-50px)' };
  spans.forEach(sp => Object.assign(sp.style, from));
  const play = () => {
    io.disconnect();
    spans.forEach((sp, i) => {
      sp.getAnimations().forEach(a => a.cancel()); Object.assign(sp.style, from);
      const a = sp.animate([from, { filter: 'blur(5px)', opacity: 0.5, transform: 'translateY(5px)', offset: 0.5 }, { filter: 'blur(0px)', opacity: 1, transform: 'translateY(0px)' }], { duration: 700, delay: i * delay, fill: 'forwards', easing: 'linear' });
      a.onfinish = () => { sp.style.filter = sp.style.opacity = sp.style.transform = ''; a.cancel(); };
    });
  };
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) play(); }, { threshold: 0.1 });
  io.observe(el);
  el._blurPlay = play;
});
document.querySelectorAll('.sh-h2 > span').forEach(sp => {
  if (!/[áéíóúÁÉÍÓÚ]/.test(sp.textContent)) return;
  const t = sp.textContent; sp.textContent = '';
  for (const ch of t) { if (ACUTE[ch]) { const a = document.createElement('span'); a.className = 'acc'; a.textContent = ACUTE[ch]; sp.appendChild(a); } else sp.append(ch); }
});
}
