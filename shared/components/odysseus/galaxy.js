// ══════════════════════════════════════════════════════
// Galaxy (React Bits, OGL → WebGL1): el cielo de la carta nocturna.
// Fuera del DOM; se dibuja dentro de la hoja del mapa. Sin tinte de color
// (saturación 0, como el original) y topado en .97.
// ══════════════════════════════════════════════════════
import { glProgram, rgb01 } from './kit.js';

export const galaxy = (() => {
  const canvas = document.createElement('canvas');
  const fs = `precision highp float;
uniform float uTime; uniform vec2 uRes; uniform float uStarSpeed; uniform vec2 uMouse; uniform float uMouseActive; uniform vec3 uBg;
const float DENSITY = 1.0; const float SPEED = 1.0; const float GLOW = 0.3; const float TWINKLE = 0.3; const float ROT_SPEED = 0.1; const float REPULSION = 2.0;
#define NUM_LAYER 4.0
#define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
#define PERIOD 3.0
float Hash21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float tri(float x) { return abs(fract(x) * 2.0 - 1.0); }
float tris(float x) { float t = fract(x); return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0)); }
float trisn(float x) { float t = fract(x); return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0; }
float Star(vec2 uv, float flare) {
  float d = length(uv); float m = (0.05 * GLOW) / d;
  float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0)); m += rays * flare * GLOW;
  uv *= MAT45; rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0)); m += rays * 0.3 * flare * GLOW;
  m *= smoothstep(1.0, 0.2, d); return m;
}
vec3 StarLayer(vec2 uv) {
  vec3 col = vec3(0.0); vec2 gv = fract(uv) - 0.5; vec2 id = floor(uv);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 offset = vec2(float(x), float(y)); vec2 si = id + offset; float seed = Hash21(si); float size = fract(seed * 345.32);
    float gloss = tri(uStarSpeed / (PERIOD * seed + 1.0)); float flareSize = smoothstep(0.9, 1.0, size) * gloss;
    vec2 pad = vec2(tris(seed * 34.0 + uTime * SPEED / 10.0), tris(seed * 38.0 + uTime * SPEED / 30.0)) - 0.5;
    float star = Star(gv - offset - pad, flareSize);
    float twinkle = mix(1.0, trisn(uTime * SPEED + seed * 6.2831) * 0.5 + 1.0, TWINKLE);
    col += star * size * twinkle * vec3(0.92, 0.9, 0.86);
  }
  return col;
}
void main() {
  vec2 uv = (gl_FragCoord.xy - uRes * 0.5) / uRes.y;
  vec2 m = (uMouse * uRes - uRes * 0.5) / uRes.y; float md = length(uv - m);
  uv += normalize(uv - m + 1e-5) * (REPULSION / (md + 0.1)) * 0.05 * uMouseActive;
  float a = uTime * ROT_SPEED; uv = mat2(cos(a), -sin(a), sin(a), cos(a)) * uv;
  vec3 col = vec3(0.0);
  for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER) {
    float depth = fract(i + uStarSpeed * SPEED); float scale = mix(20.0 * DENSITY, 0.5 * DENSITY, depth);
    float fade = depth * smoothstep(1.0, 0.9, depth); col += StarLayer(uv * scale + i * 453.32) * fade;
  }
  gl_FragColor = vec4(min(uBg + col, vec3(0.97)), 1.0);
}`;
  const g = glProgram(canvas, fs); if (!g) return null;
  const { gl, u } = g; let mouse = [0.5, 0.5], active = 0, activeT = 0;
  return {
    canvas,
    resize(w, h) { canvas.width = Math.max(1, Math.round(w)); canvas.height = Math.max(1, Math.round(h)); gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(u('uRes'), canvas.width, canvas.height); },
    pointer(x, y, inside) { mouse = [x, 1 - y]; activeT = inside ? 1 : 0; },
    render(t) {
      active += (activeT - active) * 0.05;
      // A una quinta parte de la velocidad del original: giro, deriva de capas y titileo.
      const k = t * 0.001 * 0.2;
      gl.uniform1f(u('uTime'), k); gl.uniform1f(u('uStarSpeed'), (k * 0.5) / 10);
      gl.uniform2f(u('uMouse'), mouse[0], mouse[1]); gl.uniform1f(u('uMouseActive'), active);
      gl.uniform3fv(u('uBg'), rgb01('--sea-dk'));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
})();
