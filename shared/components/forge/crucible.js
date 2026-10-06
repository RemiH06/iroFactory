// ══════════════════════════════════════════════════════
// §5 Crisol · forja: Molten Metal (React Bits, OGL/WebGL2 → WebGL1),
// paleta ember. Taller: la tormenta en cintas (riff de Figma de @nellucci),
// shader propio: tubos ondulados con luz, grano y destellos de rayo por
// cinta; aparece abriéndose como si las paredes se apartaran.
// ══════════════════════════════════════════════════════
import { $, fitGL, glProgram, isLight, makeLoop, onTheme, reduceMotion, rgb01 } from './kit.js';

export function mount() {
(() => {
  const canvas = $('#fg-molten');
  const fs = `precision highp float;
uniform vec2 iResolution; uniform float iTime; uniform vec2 uMouse; uniform vec3 uColor1; uniform vec3 uColor2; uniform vec3 uColor3;
const float SPEED = 0.35, SCALE = 4.0, DETAIL = 3.0, GLOW = 1.6, CORE = 0.1, SWIRL = 1.0, FOLD = -0.2, BLACK = 0.05, BRIGHT = 1.3, MIDV = 0.35, GRAIN = 0.05, MSTR = 0.3;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  float time = iTime * SPEED;
  vec2 p = SCALE * ((gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y) - 0.5;
  p += (uMouse - 0.5) * MSTR * 2.0;
  vec2 i = p; float c = 0.0;
  float r = length(p + vec2(sin(time), sin(time * 0.3 + 5.0)) * 0.5), d = length(p), rot = d + time + p.x * SWIRL, cosRot = cos(rot);
  mat2 warp = mat2(cos(rot - sin(time / 5.0)), sin(rot), -sin(cosRot - time), cosRot) * FOLD;
  float glowCore = GLOW * CORE;
  for (float n = 0.0; n < 8.0; n++) {
    if (n >= DETAIL) break;
    p *= warp; float t = r - time / (n + 3.0);
    i -= p + vec2(cos(t - i.x - r) + sin(t + i.y), sin(t - i.y) + cos(t + i.x) + r);
    c += glowCore / length(vec2(sin(i.x + t), cos(i.y + t)));
  }
  c /= 6.0;
  float g = clamp(max(c - BLACK, 0.0) * BRIGHT, 0.0, 1.0);
  vec3 col = mix(uColor1, uColor2, smoothstep(0.0, MIDV, g)); col = mix(col, uColor3, smoothstep(MIDV, 1.0, g));
  float a = clamp(g + (hash(gl_FragCoord.xy + iTime) - 0.5) * GRAIN, 0.0, 1.0) * 0.85;
  gl_FragColor = vec4(col * a, a);
}`;
  const g = glProgram(canvas, fs, { premultipliedAlpha: true }); if (!g) return;
  const { gl, u } = g;
  let mx = 0.5, my = 0.5, sx = 0.5, sy = 0.5;
  canvas.parentElement.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width; my = 1 - (e.clientY - r.top) / r.height; }, { passive: true });
  const colors = () => { gl.uniform3fv(u('uColor1'), rgb01('--ember')); gl.uniform3fv(u('uColor2'), rgb01('--lava')); gl.uniform3fv(u('uColor3'), rgb01('--slag')); };
  const resize = () => { const [w, h] = fitGL(canvas, gl, u, 0.75); gl.uniform2f(u('iResolution'), w, h); };
  const t0 = performance.now();
  const draw = t => { if (isLight) return; sx += (mx - sx) * 0.05; sy += (my - sy) * 0.05; gl.uniform2f(u('uMouse'), sx, sy); gl.uniform1f(u('iTime'), reduceMotion.matches ? 4 : (t - t0) / 1000); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3); };
  resize(); colors();
  const loop = makeLoop(canvas, draw, 30);
  new ResizeObserver(() => { resize(); loop.still(); }).observe(canvas);
  onTheme(() => { colors(); loop.still(); });
  loop.still();
})();
(() => {
  const canvas = $('#fg-storm');
  const fs = `precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec3 uDeep; uniform vec3 uBody; uniform vec3 uCore; uniform vec3 uFringe;
float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; } return v; }
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float ang = -0.55, ca = cos(ang), sa = sin(ang);
  vec2 r = vec2(ca * uv.x - sa * uv.y, sa * uv.x + ca * uv.y);
  float wave = sin(r.x * 2.2 + uTime * 0.35) * 0.16 + sin(r.x * 5.3 - uTime * 0.22) * 0.045;
  float v = (r.y + wave) * 5.0, id = floor(v), x = fract(v) * 2.0 - 1.0;
  float body = 1.0 - smoothstep(0.84, 0.98, abs(x));
  float h = sqrt(max(0.0, 1.0 - x * x));
  // Nubes: fbm con deformación de dominio que fluye a lo largo de la cinta.
  vec2 q = vec2(r.x * 2.6 - uTime * 0.18 + id * 3.7, x * 0.9 + id * 1.3);
  vec2 w = vec2(fbm(q + uTime * 0.05), fbm(q + vec2(5.2, 1.3) - uTime * 0.04));
  float cloud = fbm(q * 1.6 + w * 2.2);
  float dens = smoothstep(0.32, 0.78, cloud);
  // Rayos: cada cinta se parte en tramos y cada tramo destella con su propio
  // ritmo y fase, en un punto al azar dentro del tramo y apagándose solo;
  // así revientan varios a la vez en lugares distintos.
  const float CW = 0.62;
  float cell = floor(r.x / CW), burst = 0.0, bolt = 0.0;
  for (int k = -1; k <= 1; k++) {
    float c = cell + float(k); vec2 key = vec2(id * 7.13, c * 3.71);
    float beat = uTime * (1.3 + 2.2 * hash(key + 3.1)) + hash(key + 9.7) * 17.0;
    float sl = floor(beat), env = exp(-fract(beat) * 3.0);
    float on = step(0.6, hash(key + vec2(sl * 1.37, sl * 0.61)));
    float fx = (c + 0.15 + 0.7 * hash(key + vec2(sl, 5.3))) * CW;
    float flick = 0.55 + 0.45 * sin(uTime * 60.0 + c * 2.9 + id * 1.3);
    float b = on * env * flick * exp(-pow((r.x - fx) * 2.6, 2.0));
    burst += b;
    if (b > 0.02) bolt += b * smoothstep(0.03, 0.0, abs(x - (fbm(vec2(r.x * 9.0, sl + c * 4.1)) - 0.5) * 1.2));
  }
  burst = min(burst, 1.4); bolt = min(bolt, 1.2);
  // Interior: cielo oscuro, nubes iluminadas desde dentro por el destello.
  vec3 col = mix(uDeep, uBody * 0.55, dens * 0.8) * (0.45 + 0.55 * h);
  col += uBody * burst * (0.3 + dens * 1.4) + uCore * pow(dens, 2.0) * burst * 1.2 + uCore * bolt * 1.6;
  // Vidrio de la cinta: brillo especular y orilla teñida.
  vec3 n = normalize(vec3(-0.35, x, h + 0.001));
  float spec = pow(clamp(dot(n, normalize(vec3(-0.35, 0.55, 0.76))), 0.0, 1.0), 40.0);
  col += uCore * spec * 0.35 + uFringe * smoothstep(0.7, 0.95, abs(x)) * 0.3;
  col += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.06;
  float a = body * 0.9;
  gl_FragColor = vec4(col * a, a);
}`;
  const g = glProgram(canvas, fs, { premultipliedAlpha: true }); if (!g) return;
  const { gl, u } = g;
  const colors = () => { gl.uniform3fv(u('uDeep'), rgb01('--smoke')); gl.uniform3fv(u('uBody'), rgb01('--voltage')); gl.uniform3fv(u('uCore'), rgb01('--white')); gl.uniform3fv(u('uFringe'), rgb01('--interrupt')); };
  const resize = () => { const [w, h] = fitGL(canvas, gl, u, 0.75); gl.uniform2f(u('uRes'), w, h); };
  const t0 = performance.now();
  const draw = t => { if (!isLight) return; gl.uniform1f(u('uTime'), reduceMotion.matches ? 3 : (t - t0) / 1000); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3); };
  // La pieza no crece: las paredes se apartan (máscara que se abre).
  const sec = canvas.parentElement;
  const close = () => { if (!reduceMotion.matches) sec.style.setProperty('--wall', '22%'); };
  close();
  new IntersectionObserver(([e]) => { if (e.isIntersecting && isLight) sec.style.setProperty('--wall', '0%'); else if (!e.isIntersecting) close(); }, { threshold: 0.25 }).observe(sec);
  resize(); colors();
  const loop = makeLoop(canvas, draw, 30);
  new ResizeObserver(() => { resize(); loop.still(); }).observe(canvas);
  onTheme(() => { colors(); if (isLight) { const r = sec.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) requestAnimationFrame(() => sec.style.setProperty('--wall', '0%')); } loop.still(); });
  loop.still();
})();
}
