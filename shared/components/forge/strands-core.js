// ══════════════════════════════════════════════════════
// Taller · Strands (React Bits) dentro de su esfera de vidrio: el núcleo.
// El original pinta los hilos en un render target y los refracta en una
// segunda pasada; como los hilos son una función analítica, aquí la esfera
// los evalúa directo en el punto refractado de cada canal (una pasada).
// ══════════════════════════════════════════════════════
import { $, fitGL, glProgram, isLight, makeLoop, onTheme, reduceMotion, rgb01 } from './kit.js';

export function mount() {
(() => {
  const canvas = $('#fg-core');
  const fs = `precision highp float;
uniform float uTime; uniform vec2 uRes; uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3;
const float PI = 3.14159265;
const float SPEED = 0.5, AMP = 1.0, WAVY = 1.0, THICK = 0.7, GLOW = 2.6, TAPER = 3.0, SPREAD = 1.0, INTENS = 0.6, SAT = 1.5, SCALE = 1.5, RADIUS = 0.46;
vec3 pal(float t) { t = fract(t) * 4.0; if (t < 1.0) return mix(uC0, uC1, t); if (t < 2.0) return mix(uC1, uC2, t - 1.0); if (t < 3.0) return mix(uC2, uC3, t - 2.0); return mix(uC3, uC0, t - 3.0); }
vec3 strands(vec2 uv) {
  uv /= SCALE;
  float e = 0.06 + INTENS * 0.94, env = pow(max(cos(uv.x * PI * 1.3), 0.0), TAPER);
  vec3 col = vec3(0.0);
  for (int i = 0; i < 5; i++) {
    float fi = float(i), ph = fi * 1.7 * SPREAD, freq = (2.0 + fi * 0.35) * WAVY, spd = 1.4 + fi * 1.2, tt = uTime * SPEED;
    float w = sin(uv.x * freq + tt * spd + ph) * 0.60 + sin(uv.x * freq * 1.1 - tt * spd * 0.7 + ph * 1.7) * 0.40;
    float y = w * (0.1 + 0.02 * e) * env * AMP, d = abs(uv.y - y), thick = (0.001 + 0.05 * e) * (0.35 + env) * THICK;
    float g = thick / (d + thick * 0.45); g = g * g;
    col += pal(fi / 5.0 + uv.x * 0.30 + uTime * 0.04) * g * env;
  }
  col *= 0.45 + 0.7 * e; col = 1.0 - exp(-col * GLOW);
  float gray = dot(col, vec3(0.2126, 0.7152, 0.0722));
  return max(mix(vec3(gray), col, SAT), 0.0);
}
void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float d = length(p), r = RADIUS, edge = 1.5 / uRes.y, mask = 1.0 - smoothstep(r - edge, r + edge, d);
  if (mask <= 0.0) { gl_FragColor = vec4(0.0); return; }
  float z = sqrt(max(r * r - d * d, 0.0)) / r, nd = d / r;
  vec2 dir = d > 0.0 ? p / d : vec2(0.0);
  float lens = smoothstep(0.85, 1.0, nd) * pow(nd, 6.0);
  vec2 off = -dir * lens * 0.15, disp = -dir * lens * 0.012;
  vec3 light = vec3(strands(p + off - disp).r, strands(p + off).g, strands(p + off + disp).b);
  float fres = pow(1.0 - z, 3.0);
  vec2 ld = normalize(vec2(-0.55, 0.6));
  float spec = pow(max(dot(p / r, ld), 0.0), 6.0) * smoothstep(r, r * 0.55, d);
  vec3 em = light + vec3(0.85, 0.92, 1.0) * fres * 0.18 + vec3(spec) * 0.4;
  float emA = clamp(max(max(em.r, em.g), em.b), 0.0, 1.0), bodyA = 0.05 + fres * 0.05;
  gl_FragColor = vec4(em * mask, (emA + bodyA * (1.0 - emA)) * mask);
}`;
  const g = glProgram(canvas, fs, { premultipliedAlpha: true }); if (!g) return;
  const { gl, u } = g;
  const colors = () => ['--voltage', '--flux', '--signal', '--interrupt'].forEach((n, i) => gl.uniform3fv(u('uC' + i), rgb01(n)));
  const resize = () => { const [w, h] = fitGL(canvas, gl, u, 0.75); gl.uniform2f(u('uRes'), w, h); };
  const t0 = performance.now();
  const draw = t => { if (!isLight) return; gl.uniform1f(u('uTime'), reduceMotion.matches ? 2 : (t - t0) / 1000); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3); };
  resize(); colors();
  const loop = makeLoop(canvas, draw, 30);
  new ResizeObserver(() => { resize(); loop.still(); }).observe(canvas);
  onTheme(() => { colors(); loop.still(); });
  loop.still();
})();
}
