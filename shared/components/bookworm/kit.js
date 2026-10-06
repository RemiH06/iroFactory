// bookworm · base del tema: modo, lectura de tokens y utilidades que usan sus componentes.

export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
export const mobileQ = window.matchMedia('(max-width: 700px)');
export const WALL = { light: '../assets/img/bookworm/d0e36bc7c0.webp', dark: '../assets/img/bookworm/6b1b830c0b.webp' };
export let isDark = false;
export const $ = s => document.querySelector(s);
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export function cssVar(n) { return getComputedStyle(document.body).getPropertyValue(n).trim(); }
export function hexRgb(h) { h = h.trim().replace('#', ''); if (h.length === 3) h = h.replace(/./g, c => c + c); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
// Colores computados ("rgb(...)" o "color(srgb ...)" de color-mix) a rgba() para canvas.
export function toRgba(s) {
  let m = String(s).match(/^rgba?\(([^)]+)\)/);
  if (m) { const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number); return `rgba(${p[0]},${p[1]},${p[2]},${p[3] == null ? 1 : p[3]})`; }
  m = String(s).match(/^color\(srgb ([^)]+)\)/);
  if (m) { const p = m[1].split(/[\s\/]+/).filter(Boolean).map(Number); return `rgba(${Math.round(p[0] * 255)},${Math.round(p[1] * 255)},${Math.round(p[2] * 255)},${p[3] == null ? 1 : p[3]})`; }
  return 'transparent';
}
export function __set_isDark(v) { isDark = v; return v; }
export function mount() {
document.documentElement.classList.add('js');
}
