// ══════════════════════════════════════════════════════
// Hélice de vidrio (riff de Figma de @brettmcm) · shader propio.
// Es r(t) = (cos t, sin t, t) vista de lado y un poco desde arriba: cada
// vuelta es una elipse, más ancha al centro (envolvente esférica). La
// dispersión sale de dibujar cada canal con un radio apenas distinto.
// Girar la hélice es desplazar las vueltas sobre su eje.
// ══════════════════════════════════════════════════════
import { $, clamp, glProgram, isLight, makeLoop, onTheme, reduceMotion, rgb01 } from './kit.js';

export function mount() {
(() => {
  const canvas = $('#lm-helix'); if (!canvas) return;
  const fs = `precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec3 uBody; uniform vec3 uCore; uniform float uLight; uniform float uTilt;
float ring(vec2 p, float yc, float a, float b, float w) {
  vec2 pp = p - vec2(0.0, yc), ab = vec2(a, b);
  float L = length(pp / ab), g = length(pp / (ab * ab));
  float d = abs(L - 1.0) * L / max(g, 1e-4);
  float front = 0.42 + 0.58 * smoothstep(b * 0.35, -b * 0.35, pp.y);
  float edge = 0.32 + 0.68 * pow(clamp(abs(pp.x) / a, 0.0, 1.0), 3.0);
  return exp(-(d * d) / (w * w)) * front * edge;
}
void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  p.x -= 0.02;
  float H = 0.40, pitch = 0.074, off = fract(uTime * 0.045) * pitch;
  vec3 g = vec3(0.0);
  float k0 = floor((p.y + H + pitch - off) / pitch);
  for (int j = 0; j < 7; j++) {
    float fi = k0 - 3.0 + float(j);
    if (fi < 0.0 || fi > 15.0) continue;
    float yc = -H - pitch + fi * pitch + off;
    float t = yc / H;
    if (abs(t) > 1.0) continue;
    float env = sqrt(1.0 - t * t);
    float a = 0.05 + 0.30 * env, b = a * uTilt, w = 0.004 + 0.012 * env;
    float fade = smoothstep(1.0, 0.72, abs(t));
    g.r += ring(p, yc, a * 1.035, b * 1.035, w) * fade;
    g.g += ring(p, yc, a, b, w) * fade;
    g.b += ring(p, yc, a * 0.965, b * 0.965, w) * fade;
  }
  float halo = exp(-dot(p, p) * 12.0) * 0.05;
  if (uLight < 0.5) {
    vec3 col = uBody * g.g * 1.25 + vec3(max(g.r - g.g, 0.0) * 1.2, max(g.g - g.b, 0.0) * 0.6, max(g.b - g.g, 0.0) * 1.0) + uCore * pow(g.g, 3.0) * 0.9 + uBody * halo;
    col = 1.0 - exp(-col * 1.25);
    float al = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
    gl_FragColor = vec4(col / max(al, 1e-3), al);
  } else {
    float k = clamp(g.g * 1.25, 0.0, 1.0), fr = clamp(abs(g.r - g.b) * 1.6, 0.0, 1.0);
    vec3 ink = mix(uBody, uCore, clamp(g.g * g.g, 0.0, 1.0));
    ink = mix(ink, vec3(0.72, 0.18, 0.32), fr * 0.5);
    gl_FragColor = vec4(ink, clamp(max(k, fr * 0.6) * 0.9, 0.0, 0.92));
  }
}`;
  const g = glProgram(canvas, fs); if (!g) return;
  const { gl, u } = g;
  let tilt = 0.24, tiltT = 0.24;
  const colors = () => { gl.uniform3fv(u('uBody'), rgb01('--glass')); gl.uniform3fv(u('uCore'), rgb01('--glass-core')); gl.uniform1f(u('uLight'), isLight ? 1 : 0); };
  const resize = () => { const r = canvas.getBoundingClientRect(), d = 0.6; canvas.width = Math.max(1, Math.round(r.width * d)); canvas.height = Math.max(1, Math.round(r.height * d)); gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(u('uRes'), canvas.width, canvas.height); };
  const t0 = performance.now();
  const draw = t => { tilt += (tiltT - tilt) * 0.08; gl.uniform1f(u('uTilt'), tilt); gl.uniform1f(u('uTime'), reduceMotion.matches ? 2.2 : (t - t0) / 1000); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3); };
  addEventListener('pointermove', e => { tiltT = 0.18 + 0.14 * clamp(e.clientY / innerHeight, 0, 1); }, { passive: true });
  colors(); resize();
  const loop = makeLoop(canvas, draw, 24);
  new ResizeObserver(() => { resize(); loop.still(); }).observe(canvas);
  onTheme(() => { colors(); loop.still(); });
  loop.still();
})();
}
