// iroFactory · núcleo compartido por todos los temas.
// Lo que antes cada tema copiaba: lectura de tokens, color, bucle de
// animación que se pausa fuera de pantalla, programa WebGL de pantalla
// completa, curvas de GSAP, etiquetas de la paleta y el cambio de modo.
// Contrato con los temas: los tokens viven en `body` y en `body.<alt>`
// (`dark` o `light`, según el modo por defecto del tema).

document.documentElement.classList.add('js');

export const $ = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];
export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
export const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// ── Tokens y color ──
export const cssVar = n => getComputedStyle(document.body).getPropertyValue(n).trim();
export const hexRgb = h => { h = String(h).trim().replace('#', ''); if (h.length === 3) h = h.replace(/./g, c => c + c); const n = parseInt(h.slice(0, 6), 16); return Number.isNaN(n) ? [128, 128, 128] : [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const rgb01 = n => hexRgb(cssVar(n)).map(v => v / 255);
export const rgba = (hex, a) => { const [r, g, b] = hexRgb(hex); return `rgba(${r}, ${g}, ${b}, ${a})`; };

// Curvas de GSAP usadas por los originales, como cubic-bezier para Web Animations.
export const EASE = { power4Out: 'cubic-bezier(0.165, 0.84, 0.44, 1)', power3In: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)', power2InOut: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)', power2Out: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' };

// ── Modo del tema ──
// `theme.alt` es true cuando el body tiene la clase alterna (dark o light).
// `theme.dark` dice si lo que se ve es oscuro, sin importar cuál sea el modo por defecto.
export const theme = { alt: false, altClass: 'dark', get dark() { return this.altClass === 'dark' ? this.alt : !this.alt; } };
const listeners = [];
export const onTheme = fn => listeners.push(fn);
export function initTheme({ altClass = 'dark', toggle = '[data-theme-toggle]', label = alt => (alt ? 'claro' : 'oscuro'), aria = alt => `Cambiar a modo ${alt ? 'claro' : 'oscuro'}` } = {}) {
  theme.altClass = altClass;
  const set = alt => {
    theme.alt = alt;
    document.body.classList.toggle(altClass, alt);
    $$(toggle).forEach(b => { b.textContent = label(alt); b.setAttribute('aria-label', aria(alt)); });
    updateHexes();
    listeners.forEach(fn => fn());
  };
  $$(toggle).forEach(b => b.addEventListener('click', () => set(!theme.alt)));
  updateHexes();
  return { set };
}

// ── Etiquetas hex de la paleta ──
// Cada etiqueta usa la tinta del modo vigente (--text o --bg) con mayor
// contraste WCAG real contra su muestra; si ninguna llega a 4.5:1, va sobre
// una pastilla --bg con --text (skill colorimetría).
const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
export const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
export function inkSwatchLabels() {
  const rgbOf = s => { const m = String(s).match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : null; };
  const inks = ['--text', '--bg'].map(t => ({ t, c: hexRgb(cssVar(t)) }));
  $$('.swatch-hex').forEach(el => {
    const sw = rgbOf(getComputedStyle(el.parentElement).backgroundColor);
    if (!sw) return;
    const best = inks.map(i => ({ t: i.t, r: contrast(i.c, sw) })).sort((a, b) => b.r - a.r)[0];
    const chip = best.r < 4.5;
    el.classList.toggle('is-chip', chip);
    el.style.color = chip ? 'var(--text)' : `var(${best.t})`;
  });
}
export function updateHexes() {
  $$('.swatch-hex[id^="hex-"]').forEach(el => { el.textContent = cssVar('--' + el.id.slice(4)).toUpperCase(); });
  inkSwatchLabels();
}

// ── Cabecera fija que gana franja al bajar ──
export function stickyHeader(sel, offset = 40) {
  const top = $(sel); if (!top) return;
  const mark = () => top.classList.toggle('is-scrolled', scrollY > offset);
  addEventListener('scroll', mark, { passive: true }); mark();
}

// ── Bucle de animación ──
// Solo corre mientras `host` está a la vista (con 120 px de precarga), con
// la pestaña visible y sin reduced motion. `still()` pinta un cuadro suelto
// (o lo deja pendiente si está fuera de pantalla).
export function makeLoop(host, draw, fps) {
  let raf = 0, visible = false, last = 0, dirty = false;
  const minDt = fps ? 1000 / fps - 2 : 0;
  const frame = t => { raf = 0; if (!minDt || t - last >= minDt) { last = t; draw(t); } if (visible && !reduceMotion.matches && !document.hidden) raf = requestAnimationFrame(frame); };
  const start = () => { if (!raf && visible && !reduceMotion.matches && !document.hidden) raf = requestAnimationFrame(frame); };
  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
  if (host === document.documentElement || host === document.body) visible = true;
  else new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { if (dirty) { dirty = false; draw(performance.now()); } start(); } else stop(); }, { rootMargin: '120px 0px' }).observe(host);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  reduceMotion.addEventListener('change', () => { if (reduceMotion.matches) { stop(); draw(performance.now()); } else start(); });
  start();
  const still = () => { if (!visible) { dirty = true; return; } dirty = false; draw(performance.now()); };
  return { still, start, stop };
}

// ── Programa WebGL de pantalla completa (un triángulo) ──
// `fs` puede ser una función que recibe gl (para activar extensiones antes
// de compilar). Devuelve null si no hay WebGL o el shader no compila: el
// componente debe quitar su lienzo y dejar el contenido como está.
export function glProgram(canvas, fs, opts = {}) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false, ...opts });
  if (!gl) return null;
  const src = typeof fs === 'function' ? fs(gl) : fs; if (!src) return null;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(o)); return null; } return o; };
  const v = sh(gl.VERTEX_SHADER, 'attribute vec2 position; void main(){ gl_Position = vec4(position, 0.0, 1.0); }'), f = sh(gl.FRAGMENT_SHADER, src);
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
