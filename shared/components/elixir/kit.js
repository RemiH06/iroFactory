// elixir · base del tema: modo, lectura de tokens y utilidades que usan sus componentes.

export const $ = s => document.querySelector(s);
export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
export const coarsePointer = window.matchMedia('(pointer: coarse)');
export let isDark = document.body.classList.contains('dark');
export const cssVar = n => getComputedStyle(document.body).getPropertyValue(n).trim();
export const hexRgb = h => { h = String(h).trim().replace('#', ''); if (h.length === 3) h = h.replace(/./g, c => c + c); const n = parseInt(h.slice(0, 6), 16); return Number.isNaN(n) ? [220, 224, 240] : [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const rgb01 = n => hexRgb(cssVar(n)).map(v => v / 255);
export const rgba = (hex, a) => { const [r, g, b] = hexRgb(hex); return `rgba(${r}, ${g}, ${b}, ${a})`; };
export const themeListeners = [];
export const onTheme = fn => themeListeners.push(fn);
export function __set_isDark(v) { isDark = v; return v; }
export function mount() {
document.documentElement.classList.add('js');
}
