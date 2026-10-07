// sherry · base del tema sobre el núcleo: modo (oscuro por defecto), CRT,
// fondo de triángulos e imágenes. Lo genérico vive en shared/core/core.js.
import { cssVar, reduceMotion, initTheme, onTheme, theme } from '../../core/core.js';

export { cssVar, reduceMotion };
export let isLight = false;
export let crtOn   = true;
export let triOn   = true;
// ── Hero: imagen clara/oscura · mismo patrón que apolo (heroLightSrc
// capturado una vez del src original en el HTML, antes de que
// cualquier toggle lo pise) ──
export const heroImgEl = document.getElementById('sherry-hero-img');
export const heroLightSrc = heroImgEl.src;
export function updateHeroImage() {
  heroImgEl.src = isLight ? heroLightSrc : heroImgEl.dataset.dark;
}
onTheme(() => { isLight = theme.alt; updateHeroImage(); });
const ctl = initTheme({ altClass: 'light', toggle: '#toggle-btn', label: alt => (alt ? '⬛ dark' : '⬜ light'), aria: alt => (alt ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro') });
export const toggleTheme = ctl.toggle;
export function toggleCRT() {
  crtOn = !crtOn;
  document.body.classList.toggle('crt-on', crtOn);
}
export function toggleTri() {
  triOn = !triOn;
  document.body.classList.toggle('tri-on', triOn);
  if (window._sherryTri) {
    triOn ? window._sherryTri.resume() : window._sherryTri.pause();
  }
}
// Componentes electrónicos y electromecánicos reales (fotos con
// fondo transparente, dadas por el usuario en src/img/comps/) ·
// reemplazan a las radiografías de peces como imagen de Dither Veil.
// Encajan mejor con "sherry construye desde basura": son literalmente
// las piezas de las que estaría hecho el artefacto del propio tema.
// Una sola versión por componente (no claro/oscuro) · son fotos de
// producto reales, no ilustraciones que necesiten invertirse.
export const COMPONENT_IMAGES = {
  cap: '../assets/img/sherry/6b952818ba.webp',
  res: '../assets/img/sherry/9af8a70a95.webp',
  lil: '../assets/img/sherry/3a704b99f2.webp',
  ind: '../assets/img/sherry/8f3c08a375.webp',
  rel: '../assets/img/sherry/5cd94d91f0.webp',
  ic: '../assets/img/sherry/5fe49acf6a.webp',
  esp32: '../assets/img/sherry/77c7cfc09e.webp',
};
