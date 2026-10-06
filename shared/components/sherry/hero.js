// ══════════════════════════════════════════════════════
// Hero: pin de scroll (zoom ambiental + fade) · mismo patrón que
// apolo (.ap-hero-pin/.ap-hero: position:sticky dentro de un wrapper
// alto, listener de scroll con rAF), fórmulas distintas porque el
// comportamiento pedido es otro: acá no hay blur/scale por scroll,
// solo fade de la imagen; el "zoom" es un Ken Burns ambiental atado
// al tiempo que el hero lleva visible, no al progreso de scroll. El
// título de esquina hace crossfade con el título grande en vez de
// que una sola caja de texto se traslade · evita tener que
// re-renderizar el pipeline de ASCII Text en cada frame de scroll.
// ══════════════════════════════════════════════════════
import { reduceMotion } from './kit.js';

export function initHero() {
  const pinWrap = document.getElementById('sherry-hero-pin');
  const hero    = document.querySelector('.sherry-hero');
  const media   = document.getElementById('sherry-hero-img');
  const corner  = document.getElementById('sherry-corner-title');
  if (!pinWrap || !hero) return;

  if (reduceMotion.matches) {
    // Sin pin ni zoom · hero estático, título de esquina visible fijo
    // de una (no hay scroll-fade que lo revele).
    if (corner) corner.style.opacity = '1';
    return;
  }

  document.documentElement.classList.add('js-sherry-pin');

  let raf = null;
  function update() {
    raf = null;
    const heroH = window.innerHeight;
    const total = pinWrap.offsetHeight - heroH;
    const progress = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0;
    // Arranca en 60% (no 100%) y baja a 0% con la misma proporción
    // lineal de antes · la imagen nunca se ve a opacidad plena, ni
    // siquiera con el scroll en 0.
    media.style.opacity = (0.6 * (1 - progress)).toFixed(2);
    if (corner) {
      const cp = progress > 0.55 ? Math.min(1, (progress - 0.55) / 0.35) : 0;
      corner.style.opacity = cp.toFixed(2);
    }
  }
  window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
  window.addEventListener('resize', () => { if (!raf) raf = requestAnimationFrame(update); });
  update();

  // Zoom ambiental · tiempo activo acumulado, no reloj de pared (si no,
  // pausar/reanudar por IntersectionObserver haría saltar la escala de
  // golpe al volver a entrar en pantalla tras un rato scrolleado lejos).
  let zoomElapsed = 0, zoomLast = null, zoomRaf = null;
  function zoomTick(ts) {
    if (zoomLast === null) zoomLast = ts;
    zoomElapsed += (ts - zoomLast);
    zoomLast = ts;
    const scale = 1 + Math.min(zoomElapsed / 1000 * 0.006, 0.12);
    media.style.transform = `scale(${scale.toFixed(4)})`;
    if (scale < 1.12) { zoomRaf = requestAnimationFrame(zoomTick); }
    else { zoomRaf = null; }
  }
  const heroIo = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        if (!zoomRaf) zoomRaf = requestAnimationFrame(zoomTick);
      } else if (zoomRaf) {
        cancelAnimationFrame(zoomRaf);
        zoomRaf = null;
        zoomLast = null;
      }
    });
  }, { threshold: 0.01 });
  heroIo.observe(hero);
}
