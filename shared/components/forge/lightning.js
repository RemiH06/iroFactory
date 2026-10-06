// ══════════════════════════════════════════════════════
// Taller · Lightning (React Bits, ya era WebGL crudo): el rayo vertical
// deformado por fBm de 10 octavas que parpadea con un hash del tiempo.
// ══════════════════════════════════════════════════════
import { $, cssVar, fitGL, glProgram, hexRgb, isLight, makeLoop, onTheme, reduceMotion } from './kit.js';

export function mount() {
(() => {
  const canvas = $('#fg-bolt');
  const fs = `precision mediump float;
uniform vec2 iResolution; uniform float iTime; uniform float uHue; uniform float uXOffset; uniform float uSpeed; uniform float uIntensity; uniform float uSize;
#define OCTAVE_COUNT 10
vec3 hsv2rgb(vec3 c) { vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0,4.0,2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); return c.z * mix(vec3(1.0), rgb, c.y); }
float hash11(float p) { p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
mat2 rotate2d(float theta) { float c = cos(theta); float s = sin(theta); return mat2(c, -s, s, c); }
float noise(vec2 p) { vec2 ip = floor(p); vec2 fp = fract(p); float a = hash12(ip); float b = hash12(ip + vec2(1.0, 0.0)); float c = hash12(ip + vec2(0.0, 1.0)); float d = hash12(ip + vec2(1.0, 1.0)); vec2 t = smoothstep(0.0, 1.0, fp); return mix(mix(a, b, t.x), mix(c, d, t.x), t.y); }
float fbm(vec2 p) { float value = 0.0; float amplitude = 0.5; for (int i = 0; i < OCTAVE_COUNT; ++i) { value += amplitude * noise(p); p *= rotate2d(0.45); p *= 2.0; amplitude *= 0.5; } return value; }
void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy; uv = 2.0 * uv - 1.0; uv.x *= iResolution.x / iResolution.y; uv.x += uXOffset;
  uv += 2.0 * fbm(uv * uSize + 0.8 * iTime * uSpeed) - 1.0;
  float dist = abs(uv.x);
  vec3 baseColor = hsv2rgb(vec3(uHue / 360.0, 0.7, 0.8));
  vec3 col = baseColor * pow(mix(0.0, 0.07, hash11(iTime * uSpeed)) / dist, 1.0) * uIntensity;
  float a = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
  gl_FragColor = vec4(col, a);
}`;
  const g = glProgram(canvas, fs); if (!g) return;
  const { gl, u } = g;
  const hueOf = hex => { const [r, gg, b] = hexRgb(hex).map(v => v / 255), mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), d = mx - mn; if (!d) return 0; let h = mx === r ? ((gg - b) / d) % 6 : mx === gg ? (b - r) / d + 2 : (r - gg) / d + 4; return (h * 60 + 360) % 360; };
  gl.uniform1f(u('uXOffset'), -0.25); gl.uniform1f(u('uSpeed'), 1); gl.uniform1f(u('uIntensity'), 0.55); gl.uniform1f(u('uSize'), 1.1);
  const colors = () => gl.uniform1f(u('uHue'), hueOf(cssVar('--voltage')));
  const resize = () => { const [w, h] = fitGL(canvas, gl, u, 0.6); gl.uniform2f(u('iResolution'), w, h); };
  const t0 = performance.now();
  const draw = t => { if (!isLight) return; gl.uniform1f(u('iTime'), reduceMotion.matches ? 1.3 : (t - t0) / 1000); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3); };
  resize(); colors();
  const loop = makeLoop(canvas, draw, 30);
  new ResizeObserver(() => { resize(); loop.still(); }).observe(canvas);
  onTheme(() => { colors(); loop.still(); });
  loop.still();
})();
}
