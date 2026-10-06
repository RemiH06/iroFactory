// ══════════════════════════════════════════════════════
// Galería · Morph Slider (React Bits, OGL + GSAP → WebGL1 y tween propio)
// con su transición "ripple": la onda nace donde tocas. Las radiografías
// van en duotono del agua. De día la versión invertida (fondo claro → espuma),
// de noche la radiografía tal cual (fondo → abismo, hueso → cian).
// ══════════════════════════════════════════════════════
import { $, glProgram, isDark, makeLoop, onTheme, power2InOut, power2Out, reduceMotion, rgb01, tween } from './kit.js';

export function mount() {
(() => {
  const root = $('#sh-morph'), stage = root.querySelector('.morph-slider-stage'), cap = root.querySelector('.morph-slider-caption'), dotsHost = root.parentElement.querySelector('.morph-slider-dots');
  const ITEMS = JSON.parse(document.getElementById('sh-fish').textContent);
  const canvas = document.createElement('canvas'); stage.appendChild(canvas);
  const fs = `precision highp float;
uniform sampler2D tCurrent; uniform sampler2D tNext; uniform vec2 uResolution; uniform vec2 uCurrentSize; uniform vec2 uNextSize; uniform float uProgress; uniform float uDir;
uniform float uIntensity; uniform float uScale; uniform float uAberration; uniform float uDrift; uniform float uTime; uniform float uReduce; uniform vec2 uPointer; uniform vec3 uOverlay; uniform vec3 uLo; uniform vec3 uHi;
const float PI = 3.14159265359;
vec2 coverUV(vec2 uv, vec2 res, vec2 img) { float rA = res.x / max(res.y, 1.0); float iA = img.x / max(img.y, 1.0); vec2 s = vec2(1.0); float ratio = rA / max(iA, 0.0001); if (ratio > 1.0) s.y = 1.0 / ratio; else s.x = ratio; return (uv - 0.5) * s + 0.5; }
vec3 tone(vec3 c) { float l = dot(c, vec3(0.299, 0.587, 0.114)); return mix(uLo, uHi, l); }
void main() {
  vec2 vUv = gl_FragCoord.xy / uResolution; vUv.y = 1.0 - vUv.y;
  float p = clamp(uProgress, 0.0, 1.0); float env = sin(p * PI); vec2 uv = vUv;
  uv += vec2(sin(uTime * 0.25 + uv.y * 4.0), cos(uTime * 0.22 + uv.x * 4.0)) * uDrift * 0.008;
  uv = (uv - 0.5) * (1.0 - uDrift * 0.02 * sin(uTime * 0.4)) + 0.5;
  vec2 uvC = uv; vec2 uvN = uv; float m = smoothstep(0.0, 1.0, p);
  if (uReduce < 0.5) {
    float d = distance(uv, uPointer); float ring = p * 1.6; float wave = sin((d - ring) * 8.0) * env;
    vec2 dir = normalize(uv - uPointer + 1e-4); vec2 disp = dir * wave * uIntensity * 0.25;
    uvC = uv + disp; uvN = uv + disp * 0.6; m = 1.0 - smoothstep(ring - 0.24, ring + 0.24, d);
  }
  vec2 sC = coverUV(uvC, uResolution, uCurrentSize); vec2 sN = coverUV(uvN, uResolution, uNextSize);
  float ca = uReduce < 0.5 ? uAberration * env * 0.03 : 0.0;
  vec3 colC = vec3(texture2D(tCurrent, sC + vec2(ca, 0.0)).r, texture2D(tCurrent, sC).g, texture2D(tCurrent, sC - vec2(ca, 0.0)).b);
  vec3 colN = vec3(texture2D(tNext, sN + vec2(ca, 0.0)).r, texture2D(tNext, sN).g, texture2D(tNext, sN - vec2(ca, 0.0)).b);
  vec3 col = tone(mix(colC, colN, m));
  float vig = smoothstep(1.25, 0.25, length(uv - 0.5)); col = mix(col, uOverlay, (1.0 - vig) * 0.28);
  gl_FragColor = vec4(min(col, vec3(0.97)), 1.0);
}`;
  const g = glProgram(canvas, fs, { alpha: false }); if (!g) return;
  const { gl, u } = g;
  const tex = ITEMS.map(() => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([8, 24, 32, 255])); return t; }), sizes = ITEMS.map(() => [1, 1]);
  const setTexParams = () => { gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); };
  tex.forEach(t => { gl.bindTexture(gl.TEXTURE_2D, t); setTexParams(); });
  const load = () => ITEMS.forEach((it, i) => { const img = new Image(); img.onload = () => { gl.bindTexture(gl.TEXTURE_2D, tex[i]); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); setTexParams(); sizes[i] = [img.naturalWidth, img.naturalHeight]; bind(); loop.still(); }; img.src = isDark ? it.src : it.light; });
  load();
  let current = 0, progress = 0, nextI = 0, dirV = 1, animating = false, dragging = false, dragDir = 0, dragX = 0, tw = null, pointer = [0.5, 0.5];
  gl.uniform1i(u('tCurrent'), 0); gl.uniform1i(u('tNext'), 1);
  const bind = () => { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[current]); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex[nextI]); gl.uniform2f(u('uCurrentSize'), ...sizes[current]); gl.uniform2f(u('uNextSize'), ...sizes[nextI]); };
  const colors = () => { gl.uniform3fv(u('uLo'), rgb01(isDark ? '--bg' : '--deep')); gl.uniform3fv(u('uHi'), rgb01(isDark ? '--biolum-cyan' : '--foam')); gl.uniform3fv(u('uOverlay'), rgb01('--deep')); };
  // Más suave que el original (intensidad .55, aberración .35, 1.1 s; luego .2, .1, 1.7 s): la onda se sentía demasiado.
  Object.entries({ uIntensity: 0.12, uScale: 2.4, uAberration: 0.05, uDrift: 0.4 }).forEach(([k, v]) => gl.uniform1f(u(k), v));
  const resize = () => { const r = stage.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2); canvas.width = Math.max(1, Math.round(r.width * d)); canvas.height = Math.max(1, Math.round(r.height * d)); gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(u('uResolution'), canvas.width, canvas.height); };
  const draw = t => { gl.uniform1f(u('uTime'), t * 0.001); gl.uniform1f(u('uProgress'), progress); gl.uniform2f(u('uPointer'), ...pointer); gl.uniform1f(u('uReduce'), reduceMotion.matches ? 1 : 0); gl.drawArrays(gl.TRIANGLES, 0, 3); };
  const wrap = i => ((i % ITEMS.length) + ITEMS.length) % ITEMS.length;
  const dots = ITEMS.map((it, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'morph-slider-dot'; b.setAttribute('role', 'tab'); b.setAttribute('aria-label', `Imagen ${i + 1}: ${it.name}`); b.addEventListener('click', () => { if (i !== current) goTo(i); }); dotsHost.appendChild(b); return b; });
  const announce = i => { const it = ITEMS[i]; cap.innerHTML = `<i>${it.name}</i> · ${it.common}`; dots.forEach((d, k) => d.setAttribute('aria-selected', String(k === i))); };
  const prepare = (target, dir) => { nextI = target; dirV = dir; gl.uniform1f(u('uDir'), dir); bind(); };
  const commit = target => { current = target; nextI = target; progress = 0; animating = false; tw = null; bind(); announce(target); loop.still(); };
  function goTo(target, dirHint) {
    if (animating || dragging) return;
    target = wrap(target); if (target === current) return;
    prepare(target, dirHint || (target > current ? 1 : -1)); animating = true; announce(target); loop.start();
    tw = tween(reduceMotion.matches ? 400 : 2000, power2InOut, v => { progress = v; if (reduceMotion.matches) loop.still(); }, () => commit(target));
  }
  root.querySelectorAll('.morph-slider-btn').forEach(b => b.addEventListener('click', () => { pointer = [0.5, 0.5]; goTo(current + +b.dataset.dir, +b.dataset.dir); }));
  stage.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const d = e.key === 'ArrowRight' ? 1 : -1; goTo(current + d, d); } });
  const toUv = e => { const r = stage.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
  stage.addEventListener('pointerdown', e => { if (animating) return; pointer = toUv(e); dragging = true; dragDir = 0; dragX = e.clientX; stage.setPointerCapture(e.pointerId); stage.style.cursor = 'grabbing'; loop.start(); });
  stage.addEventListener('pointermove', e => {
    if (!dragging) { if (!animating) pointer = toUv(e); return; }
    const w = stage.getBoundingClientRect().width, ndx = (e.clientX - dragX) / w, dir = ndx < 0 ? 1 : -1;
    if (Math.abs(ndx) < 0.01) return;
    if (dir !== dragDir) { dragDir = dir; prepare(wrap(current + dir), dir); }
    progress = Math.min(Math.abs(ndx) * 1.6, 1); pointer = toUv(e);
  });
  const endDrag = e => {
    if (!dragging) return; dragging = false; stage.style.cursor = '';
    try { stage.releasePointerCapture(e.pointerId); } catch {}
    if (!dragDir) { // toque sin arrastre: la onda nace ahí y pasa a la siguiente
      goTo(current + 1, 1); return;
    }
    const target = wrap(current + dragDir); animating = true; const from = progress;
    if (from > 0.4) { announce(target); tw = tween(500, power2Out, v => { progress = from + (1 - from) * v; }, () => commit(target)); }
    else tw = tween(500, power2Out, v => { progress = from * (1 - v); }, () => { progress = 0; animating = false; nextI = current; bind(); });
  };
  stage.addEventListener('pointerup', endDrag); stage.addEventListener('pointercancel', endDrag);
  colors(); resize(); bind(); announce(0);
  const loop = makeLoop(root, draw);
  new ResizeObserver(() => { resize(); loop.still(); }).observe(stage);
  onTheme(() => { colors(); load(); loop.still(); });
  loop.still();
})();
}
