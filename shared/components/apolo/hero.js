// ══════════════════════════════════════════════════════
// CAPA 0 · Hero: pin de scroll (blur/zoom) estilo Proun
// (43.Proun/docs/index.html: .hero-pin-wrap crece a varias
// pantallas, header adentro pasa a sticky mientras dura el
// scroll, recién al soltarse el contenido real avanza). Sin
// física de scroll-timeline nueva: un solo listener de scroll
// con throttle por rAF (mismo patrón que el mousemove del
// tilt-card), progreso lineal 0→1 mapeado a blur+zoom+fade.
// Si `prefers-reduced-motion` está activo, ni se expande el
// wrap ni se agrega la clase · el hero se queda como un bloque
// estático de una pantalla, igual que el fallback "sin JS" de
// Proun (ahí la razón era una import externa que podía fallar;
// acá no hay import que falle, pero el principio es el mismo:
// nunca un estado a medias).
// ══════════════════════════════════════════════════════
import { reduceMotion } from './kit.js';

export function initHero() {
  const pinWrap = document.querySelector('.ap-hero-pin');
  const hero = document.querySelector('.ap-hero');
  const media = document.getElementById('ap-hero-img');
  const text = document.querySelector('.ap-hero-text');
  if (!pinWrap || !hero || reduceMotion.matches) return;

  document.documentElement.classList.add('js-ap-pin');

  let raf = null;
  function update() {
    raf = null;
    const heroH = window.innerHeight;
    const total = pinWrap.offsetHeight - heroH;
    const progress = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0;
    media.style.filter = `blur(${(progress * 10).toFixed(2)}px)`;
    media.style.transform = `scale(${(1 + progress * 0.06).toFixed(3)})`;
    text.style.opacity = (1 - progress * 1.3).toFixed(2);
    text.style.transform = `translateY(${(progress * -30).toFixed(1)}px)`;
  }
  window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
  window.addEventListener('resize', () => { if (!raf) raf = requestAnimationFrame(update); });
  update();
}
