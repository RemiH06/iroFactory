// sherry · base del tema: modo, lectura de tokens y utilidades que usan sus componentes.
import { updateHexes } from './dither.js';

export let isLight = false;
export let crtOn   = true;
export let triOn   = true;
export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
// ── Hero: imagen clara/oscura · mismo patrón que apolo (heroLightSrc
// capturado una vez del src original en el HTML, antes de que
// cualquier toggle lo pise) ──
export const heroImgEl = document.getElementById('sherry-hero-img');
export const heroLightSrc = heroImgEl.src;
export function updateHeroImage() {
  heroImgEl.src = isLight ? heroLightSrc : heroImgEl.dataset.dark;
}
export function toggleTheme() {
  isLight = !isLight;
  document.body.classList.toggle('light', isLight);
  document.getElementById('toggle-btn').textContent = isLight ? '⬛ dark' : '⬜ light';
  document.getElementById('toggle-btn').setAttribute('aria-label', isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
  updateHexes();
  updateHeroImage();
}
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
export function cssVar(name) {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}
