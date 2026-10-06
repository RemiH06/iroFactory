// ══════════════════════════════════════════════════════
// HERO · fases de Proun sobre el progreso del envoltorio:
// 0 a 0.35 el título sube y se desvanece mientras la imagen se
// desenfoca hasta 9px; 0.35 a 0.7 se sostiene; 0.7 a 1 la imagen
// se aleja (escala 1 → 0.92) antes de soltar el scroll.
// ══════════════════════════════════════════════════════
import { metroDark, reduceMotion } from './kit.js';

export const heroImgEl = document.getElementById('metro-hero-img');
export const heroLightSrc = heroImgEl.src;
export function updateHeroImage() { heroImgEl.src = metroDark ? heroImgEl.dataset.dark : heroLightSrc; }
export function initHero() {
  const pin = document.getElementById('metro-hero-pin');
  const text = document.getElementById('metro-hero-text');
  if (!pin || reduceMotion.matches) return;
  let ticking = false;
  function update() {
    ticking = false;
    const r = pin.getBoundingClientRect();
    const span = Math.max(1, pin.offsetHeight - window.innerHeight);
    const p = Math.min(1, Math.max(0, -r.top / span));
    let fade, y, blur, scale;
    if (p <= 0.35) { const t = p / 0.35; fade = 1 - t; y = -70 * t; blur = 9 * t; scale = 1; }
    else if (p <= 0.7) { fade = 0; y = -70; blur = 9; scale = 1; }
    else { const t = (p - 0.7) / 0.3; fade = 0; y = -70; blur = 9; scale = 1 - t * 0.08; }
    text.style.opacity = fade.toFixed(3);
    text.style.transform = `translateY(${y.toFixed(1)}px)`;
    heroImgEl.style.filter = `blur(${blur.toFixed(2)}px)`;
    heroImgEl.style.transform = `scale(${scale.toFixed(4)})`;
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', update);
  update();
}
