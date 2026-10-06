// lambda · base del tema: modo, lectura de tokens y utilidades que usan sus componentes.
import { buildHexBg } from './chalkboard.js';

export const $ = s => document.querySelector(s);
export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
export const coarsePointer = window.matchMedia('(pointer: coarse)');
export let isLight = false;
export const cssVar = n => getComputedStyle(document.body).getPropertyValue(n).trim();
export const hexRgb = h => { h = String(h).trim().replace('#', ''); if (h.length === 3) h = h.replace(/./g, c => c + c); const n = parseInt(h.slice(0, 6), 16); return Number.isNaN(n) ? [168, 200, 232] : [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const rgb01 = n => hexRgb(cssVar(n)).map(v => v / 255);
export const rgba = (hex, a) => { const [r, g, b] = hexRgb(hex); return `rgba(${r}, ${g}, ${b}, ${a})`; };
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const themeListeners = [];
export const onTheme = fn => themeListeners.push(fn);
export const CHALK = ['--chalk-blue', '--chalk-yellow', '--chalk-green', '--chalk-pink', '--chalk-violet', '--chalk-orange', '--chalk-red', '--chalk-cyan'];
// ── Tema: pizarrón (oscuro, default) y pintarrón (claro) ──
export function toggleTheme() {
  isLight = !isLight;
  document.body.classList.toggle('light', isLight);
  document.querySelectorAll('[data-theme-toggle]').forEach(b => {
    b.textContent = isLight ? '● pizarrón' : '◎ pintarrón';
    b.setAttribute('aria-label', isLight ? 'Cambiar a pizarrón (modo oscuro)' : 'Cambiar a pintarrón (modo claro)');
  });
  buildHexBg(); updateHexes();
  themeListeners.forEach(fn => fn());
}
export function updateHexes() {
  document.querySelectorAll('.swatch-hex[id^="hex-"]').forEach(el => { el.textContent = cssVar('--' + el.id.slice(4)).toUpperCase(); });
  inkSwatchLabels();
}
// ── Etiquetas hex de la paleta ─────────────────────────
// Antes: color fijo con mix-blend-mode: difference. En medios tonos
// (naranjas, verdes, el gris) quedaba un gris turbio de 1.1 a 2.5:1.
// Ahora cada etiqueta usa la tinta del modo vigente (--text o --bg)
// con mayor contraste WCAG real contra su muestra; si ninguna llega
// a 4.5:1, va sobre una pastilla --bg con --text (skill colorimetría).
export function inkSwatchLabels() {
  const rgbOf = s => { const m = String(s).match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : null; };
  const hexRgb = h => { h = h.trim().replace('#', ''); if (h.length === 3) h = h.replace(/./g, c => c + c); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const inks = ['--text', '--bg'].map(t => ({ t, c: hexRgb(cssVar(t)) }));
  document.querySelectorAll('.swatch-hex').forEach(el => {
    const sw = rgbOf(getComputedStyle(el.parentElement).backgroundColor);
    if (!sw) return;
    const best = inks.map(i => ({ t: i.t, r: ratio(i.c, sw) })).sort((a, b) => b.r - a.r)[0];
    const chip = best.r < 4.5;
    el.classList.toggle('is-chip', chip);
    el.style.color = chip ? 'var(--text)' : `var(${best.t})`;
  });
}
export function makeLoop(host, draw, fps) {
  let raf = 0, visible = false, last = 0, dirty = false;
  const minDt = fps ? 1000 / fps - 2 : 0;
  const frame = t => { raf = 0; if (!minDt || t - last >= minDt) { last = t; draw(t); } if (visible && !reduceMotion.matches && !document.hidden) raf = requestAnimationFrame(frame); };
  const start = () => { if (!raf && visible && !reduceMotion.matches && !document.hidden) raf = requestAnimationFrame(frame); };
  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
  if (host === document.documentElement) visible = true; else new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { if (dirty) { dirty = false; draw(performance.now()); } start(); } else stop(); }, { rootMargin: '120px 0px' }).observe(host);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  reduceMotion.addEventListener('change', () => { if (reduceMotion.matches) { stop(); draw(performance.now()); } else start(); });
  start();
  const still = () => { if (!visible) { dirty = true; return; } dirty = false; draw(performance.now()); };
  return { still, start, stop };
}
export function glProgram(canvas, fs, opts = {}) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false, ...opts });
  if (!gl) return null;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(o)); return null; } return o; };
  const v = sh(gl.VERTEX_SHADER, 'attribute vec2 position; void main(){ gl_Position = vec4(position, 0.0, 1.0); }'), f = sh(gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return null;
  const prog = gl.createProgram(); gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const pl = gl.getAttribLocation(prog, 'position'); gl.enableVertexAttribArray(pl); gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 0, 0);
  const U = {}; const u = n => (U[n] === undefined ? (U[n] = gl.getUniformLocation(prog, n)) : U[n]);
  return { gl, u, prog };
}
// Curvas de GSAP usadas por los originales, como cubic-bezier para Web Animations.
export const EASE = { power4Out: 'cubic-bezier(0.165, 0.84, 0.44, 1)', power3In: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)', power2InOut: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)', power2Out: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' };
export function mount() {
document.documentElement.classList.add('js');
document.querySelectorAll('[data-theme-toggle]').forEach(b => b.addEventListener('click', toggleTheme));
{ const img = $('.lm-hero-img'); if (img) { const dark = img.getAttribute('src'); onTheme(() => { img.src = isLight ? img.dataset.light : dark; }); } }
{ const top = $('.lm-top'), mark = () => top.classList.toggle('is-scrolled', scrollY > 40); addEventListener('scroll', mark, { passive: true }); mark(); }
}
