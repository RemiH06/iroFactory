// ══════════════════════════════════════════════════════
// Halftone Reveal (React Bits, OGL/WebGL2 → WebGL1). Shader del original
// (medio tono CMYK con cuatro tramas giradas y una lupa que revela la
// imagen nítida con lente y aberración); fwidth por OES_standard_derivatives.
// Día: impresión a color sobre papel. Noche: tinta clara en medio tono
// sobre el fondo, invertida. Solo redibuja cuando algo se mueve.
// ══════════════════════════════════════════════════════
import { $, $$, theme, cssVar, hexRgb, rgb01, rgba, onTheme, reduceMotion, makeLoop, glProgram, EASE } from '../../core/core.js';

export function mount(opts = {}) {
  const fig = $(opts.el ?? '.halftone-reveal'); if (!fig) return;
  const img = fig.querySelector('img'), lightSrc = img.getAttribute('src');
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true'); fig.insertBefore(canvas, img);
  const FS = gl => (gl.getExtension('OES_standard_derivatives') ? `#extension GL_OES_standard_derivatives : enable
precision highp float;
uniform sampler2D tMap; uniform vec2 iResolution; uniform vec2 uImageSize; uniform vec2 uMouse; uniform float uActivity;
uniform float uDotSize; uniform float uDensity; uniform float uAngle; uniform int uShape; uniform vec3 uInk; uniform vec3 uPaper; uniform int uMode;
uniform float uContrast; uniform float uInvert; uniform float uRevealRadius; uniform float uEdge; uniform float uIdleReveal;
vec2 uAspect() { return vec2(iResolution.x / max(iResolution.y, 1.0), 1.0); }
vec2 coverUv(vec2 uv) { float ia = uImageSize.x / max(uImageSize.y, 1.0); float pa = iResolution.x / max(iResolution.y, 1.0); vec2 s = pa > ia ? vec2(1.0, ia / pa) : vec2(pa / ia, 1.0); return (uv - 0.5) * s + 0.5; }
vec3 gradeRGB(vec3 c) { c = clamp((c - 0.5) * uContrast + 0.5, 0.0, 1.0); return mix(c, 1.0 - c, uInvert); }
float shapeDist(vec2 f) { if (uShape == 1) return max(abs(f.x), abs(f.y)); if (uShape == 2) return abs(f.x) + abs(f.y); if (uShape == 3) return abs(f.y); return length(f); }
mat2 rot(float a) { float c = cos(a); float s = sin(a); return mat2(c, -s, s, c); }
vec4 sampleCell(vec2 st, float dens, float ang) { vec2 rp = rot(ang) * st * dens; vec2 center = floor(rp) + 0.5; vec2 stC = rot(-ang) * (center / dens); vec2 uvC = stC / uAspect(); return texture2D(tMap, clamp(coverUv(uvC), 0.0, 1.0)); }
float coverage(vec2 st, float dens, float ang, float ink, float rscale) { vec2 rp = rot(ang) * st * dens; vec2 f = fract(rp) - 0.5; float d = shapeDist(f); float r = sqrt(clamp(ink, 0.0, 1.0)) * 0.72 * rscale * uDotSize; float w = length(fwidth(rp)) * 0.6 + 1e-4; return smoothstep(r + w, r - w, d); }
void main() {
  vec2 vUv = gl_FragCoord.xy / iResolution;
  vec2 aspect = uAspect(); vec2 st = vUv * aspect; float ang = radians(uAngle);
  vec2 duv = (vUv - uMouse) * aspect; float dist = length(duv);
  float act = uActivity;
  float radius = max(uRevealRadius, 1e-4) * mix(0.4, 1.0, act);
  float px = 1.4 / max(iResolution.y, 1.0);
  float band = max(px, radius * (1.0 - clamp(uEdge, 0.0, 1.0)) * 0.45);
  float loupe = 1.0 - smoothstep(radius - band, radius + band, dist);
  float focus = clamp(max(loupe * act, uIdleReveal), 0.0, 1.0);
  float dens = uDensity; vec3 print;
  if (uMode == 2) {
    vec3 gc = gradeRGB(sampleCell(st, dens, ang + radians(15.0)).rgb); vec3 gm = gradeRGB(sampleCell(st, dens, ang + radians(75.0)).rgb);
    vec3 gy = gradeRGB(sampleCell(st, dens, ang).rgb); vec3 gk = gradeRGB(sampleCell(st, dens, ang + radians(45.0)).rgb);
    float c = 1.0 - gc.r; float m = 1.0 - gm.g; float y = 1.0 - gy.b; float k = 1.0 - dot(gk, vec3(0.299, 0.587, 0.114));
    float gcr = min(min(c, m), y) * 0.5;
    c = clamp(c - gcr, 0.0, 1.0); m = clamp(m - gcr, 0.0, 1.0); y = clamp(y - gcr, 0.0, 1.0); k = clamp(max(gcr, k * k * 0.9), 0.0, 1.0);
    float covC = coverage(st, dens, ang + radians(15.0), c, 0.82); float covM = coverage(st, dens, ang + radians(75.0), m, 0.82);
    float covY = coverage(st, dens, ang, y, 0.82); float covK = coverage(st, dens, ang + radians(45.0), k, 0.78);
    print = uPaper;
    print = mix(print, print * vec3(0.10, 0.72, 0.90), covC); print = mix(print, print * vec3(0.92, 0.10, 0.52), covM);
    print = mix(print, print * vec3(0.98, 0.86, 0.10), covY); print = mix(print, print * vec3(0.08), covK);
  } else {
    float lum = dot(gradeRGB(sampleCell(st, dens, ang).rgb), vec3(0.299, 0.587, 0.114));
    float cov = coverage(st, dens, ang, 1.0 - lum, 1.0);
    print = mix(uPaper, uInk, cov);
  }
  float t = clamp(dist / radius, 0.0, 1.0); float bend = t * t * t * t;
  vec2 dir = dist > 1e-5 ? duv / dist : vec2(0.0);
  vec2 off = dir * bend * radius * 0.22 / aspect; vec2 ca = dir * bend * 0.0045 / aspect;
  vec3 sharp = vec3(texture2D(tMap, clamp(coverUv(vUv - off - ca), 0.0, 1.0)).r, texture2D(tMap, clamp(coverUv(vUv - off), 0.0, 1.0)).g, texture2D(tMap, clamp(coverUv(vUv - off + ca), 0.0, 1.0)).b);
  vec3 col = mix(print, sharp, focus);
  gl_FragColor = vec4(col, 1.0);
}` : null);
  const g = glProgram(canvas, FS, { alpha: false, antialias: true }); if (!g) { canvas.remove(); return; }
  const { gl, u } = g;
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(u('tMap'), 0);
  // Valores por defecto del original: densidad 71, ángulo 45, círculo, contraste 1.15, lupa 0.4, borde 0.8, seguimiento 0.37.
  gl.uniform1f(u('uDotSize'), 1); gl.uniform1f(u('uDensity'), 71); gl.uniform1f(u('uAngle'), 45); gl.uniform1i(u('uShape'), 0);
  gl.uniform1f(u('uContrast'), 1.15); gl.uniform1f(u('uRevealRadius'), .26); gl.uniform1f(u('uEdge'), .8); gl.uniform1f(u('uIdleReveal'), 0);
  let ready = false, dirty = true;
  const m = { x: .5, y: .5, sx: .5, sy: .5, active: 0, target: 0 };
  const load = () => {
    const im = new Image();
    im.onload = () => { gl.bindTexture(gl.TEXTURE_2D, tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im); gl.uniform2f(u('uImageSize'), im.naturalWidth, im.naturalHeight); ready = true; fig.classList.add('gl-on'); dirty = true; loop.still(); };
    im.src = theme.dark ? img.dataset.dark : lightSrc;
  };
  const colors = () => {
    if (theme.dark) { gl.uniform1i(u('uMode'), 0); gl.uniform1f(u('uInvert'), 1); gl.uniform3fv(u('uInk'), rgb01('--text')); gl.uniform3fv(u('uPaper'), rgb01('--bg2')); }
    else { gl.uniform1i(u('uMode'), 2); gl.uniform1f(u('uInvert'), 0); gl.uniform3fv(u('uInk'), rgb01('--text')); gl.uniform3fv(u('uPaper'), rgb01('--white')); }
  };
  const resize = () => { const r = fig.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 1.5); canvas.width = Math.max(1, Math.round(r.width * d)); canvas.height = Math.max(1, Math.round(r.height * d)); gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(u('iResolution'), canvas.width, canvas.height); dirty = true; };
  const onMove = e => { const r = fig.getBoundingClientRect(); m.x = (e.clientX - r.left) / r.width; m.y = 1 - (e.clientY - r.top) / r.height; m.target = 1; dirty = true; loop.start(); };
  const hero = fig.parentElement;
  hero.addEventListener('pointermove', onMove, { passive: true }); hero.addEventListener('pointerenter', onMove, { passive: true });
  hero.addEventListener('pointerleave', () => { m.target = 0; loop.start(); }, { passive: true });
  hero.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') setTimeout(() => { m.target = 0; loop.start(); }, 900); }, { passive: true });
  let prev = performance.now();
  const draw = now => {
    const dt = Math.min(.05, Math.max(.001, (now - prev) / 1000)); prev = now;
    if (!ready) return;
    const a = reduceMotion.matches ? 1 : 1 - Math.exp(-dt / .37), ba = reduceMotion.matches ? 1 : 1 - Math.exp(-dt / .18);
    const ox = m.sx, oy = m.sy, oa = m.active;
    m.sx += (m.x - m.sx) * a; m.sy += (m.y - m.sy) * a; m.active += (m.target - m.active) * ba;
    const moving = Math.abs(m.sx - ox) + Math.abs(m.sy - oy) + Math.abs(m.active - oa) > 1e-4;
    if (!moving && !dirty) { loop.stop(); return; }
    dirty = false;
    gl.uniform2f(u('uMouse'), m.sx, m.sy); gl.uniform1f(u('uActivity'), m.active);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const loop = makeLoop(fig, draw, 60);
  new ResizeObserver(() => { resize(); loop.still(); }).observe(fig);
  colors(); resize(); load();
  onTheme(() => { colors(); load(); });
}
