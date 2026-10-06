// ── 04 · Light Pillar + Meta Balls en un solo shader ───────────────
// Light Pillar (React Bits, Three.js solo para un quad → WebGL1): pilar
// de luz por raymarching, girado 25° para asomar alrededor del panel.
// Meta Balls (React Bits, OGL/WebGL2 → WebGL1): 15 esferas en órbita y
// una que sigue al cursor, encima del pilar como líquido. tanh() no
// existe en GLSL ES 1.0: se escribe a mano. Calidad 'medium' en
// escritorio y 'low' en táctil (las del original), a media resolución y
// 30 fps: es un fondo lento.
import { $, coarsePointer, isDark, onTheme, rgb01 } from './kit.js';
import { glProgram, makeLoop } from './palette-labels.js';

export function mount() {
(() => {
  const canvas = $('#ex-pillar'), host = $('#componentes');
  const Q = coarsePointer.matches ? { it: 24, wave: 1, step: '1.5', res: 0.4 } : { it: 40, wave: 2, step: '1.2', res: 0.5 };
  const fs = gl => { const deriv = !!gl.getExtension('OES_standard_derivatives'); return `${deriv ? '#extension GL_OES_standard_derivatives : enable\n#define FW(x) fwidth(x)' : '#define FW(x) 0.05'}
precision highp float;
uniform float uTime; uniform vec2 uRes; uniform vec3 uTop; uniform vec3 uBottom; uniform vec3 uBg; uniform float uLight;
uniform float uRotC; uniform float uRotS; uniform float uPRotC; uniform float uPRotS;
uniform vec3 uBalls[15]; uniform vec2 uMouseB; uniform vec3 uBallCol; uniform vec3 uCursorCol;
const float GLOW = 0.005; const float PW = 3.0; const float PH = 0.4; const float NOISE = 0.5; const float WS = 0.38941834; const float WC = 0.92106099;
const float ANIM = 30.0; const float CURSOR = 3.0; const float STEP = ${Q.step};
vec3 tanh3(vec3 x) { vec3 e = exp(2.0 * clamp(x, -10.0, 10.0)); return (e - 1.0) / (e + 1.0); }
float mb(vec2 c, float r, vec2 p) { vec2 d = p - c; return (r * r) / max(dot(d, d), 1e-4); }
void main() {
  vec2 vUv = gl_FragCoord.xy / uRes;
  vec2 uv = (vUv * 2.0 - 1.0) * vec2(uRes.x / uRes.y, 1.0);
  uv = vec2(uPRotC * uv.x - uPRotS * uv.y, uPRotS * uv.x + uPRotC * uv.y);
  vec3 ro = vec3(0.0, 0.0, -10.0); vec3 rd = normalize(vec3(uv, 1.0));
  vec3 col = vec3(0.0); float t = 0.1;
  for (int i = 0; i < ${Q.it}; i++) {
    vec3 p = ro + rd * t;
    p.xz = vec2(uRotC * p.x - uRotS * p.z, uRotS * p.x + uRotC * p.z);
    vec3 q = p; q.y = p.y * PH + uTime;
    float freq = 1.0; float amp = 1.0;
    for (int j = 0; j < ${Q.wave}; j++) {
      q.xz = vec2(WC * q.x - WS * q.z, WS * q.x + WC * q.z);
      q += cos(q.zxy * freq - uTime * float(j) * 2.0) * amp;
      freq *= 2.0; amp *= 0.5;
    }
    float d = length(cos(q.xz)) - 0.2;
    float bound = length(p.xz) - PW;
    float h = max(4.0 - abs(d - bound), 0.0);
    d = max(d, bound) + h * h * 0.0625 / 4.0;
    d = abs(d) * 0.15 + 0.01;
    float grad = clamp((15.0 - p.y) / 30.0, 0.0, 1.0);
    col += mix(uBottom, uTop, grad) / d;
    t += d * STEP;
    if (t > 50.0) break;
  }
  col = tanh3(col * GLOW / (PW / 3.0));
  col -= fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) / 15.0 * NOISE;
  vec3 result = clamp(col, 0.0, 1.0);
  if (uLight > 0.5) {
    float energy = max(result.r, max(result.g, result.b));
    vec3 hue = pow(clamp(result / max(energy, 0.001), 0.0, 1.0), vec3(1.25));
    result = mix(uBg, hue * 0.92, smoothstep(0.025, 0.95, energy) * 0.94);
  } else {
    result = 1.0 - (1.0 - uBg) * (1.0 - result);
  }
  float scale = ANIM / uRes.y;
  vec2 coord = (gl_FragCoord.xy - uRes * 0.5) * scale;
  vec2 mouseW = (uMouseB - uRes * 0.5) * scale;
  float m1 = 0.0;
  for (int i = 0; i < 15; i++) m1 += mb(uBalls[i].xy, uBalls[i].z, coord);
  float m2 = mb(mouseW, CURSOR, coord);
  float total = m1 + m2;
  float f = smoothstep(-1.0, 1.0, (total - 1.3) / min(1.0, FW(total)));
  vec3 cBall = (uBallCol * m1 + uCursorCol * m2) / max(total, 1e-4);
  result = mix(result, cBall, f * 0.85);
  gl_FragColor = vec4(min(result, vec3(0.97)), 1.0);
}`; };
  const g = glProgram(canvas, fs); if (!g) return;
  const { gl, u } = g;
  const fract = x => x - Math.floor(x);
  const hash31 = p => { const r = [p * 0.1031, p * 0.103, p * 0.0973].map(fract), ryzx = [r[1], r[2], r[0]]; const d = r[0] * (ryzx[0] + 33.33) + r[1] * (ryzx[1] + 33.33) + r[2] * (ryzx[2] + 33.33); return r.map(v => fract(v + d)); };
  const hash33 = v => { const p = [v[0] * 0.1031, v[1] * 0.103, v[2] * 0.0973].map(fract), pyxz = [p[1], p[0], p[2]]; const d = p[0] * (pyxz[0] + 33.33) + p[1] * (pyxz[1] + 33.33) + p[2] * (pyxz[2] + 33.33); for (let i = 0; i < 3; i++) p[i] = fract(p[i] + d); const xxy = [p[0], p[0], p[1]], yxx = [p[1], p[0], p[0]], zyx = [p[2], p[1], p[0]]; return [0, 1, 2].map(i => fract((xxy[i] + yxx[i]) * zyx[i])); };
  const balls = Array.from({ length: 15 }, (_, i) => { const h1 = hash31(i + 1), h2 = hash33(h1); return { st: h1[0] * 2 * Math.PI, dtf: 0.1 * Math.PI + h1[1] * 0.3 * Math.PI, base: 5 + h1[1] * 5, toggle: Math.floor(h2[0] * 2), r: 0.5 + h2[2] * 1.5 }; });
  const ballBuf = new Float32Array(45), mouse = { x: 0, y: 0, tx: 0, ty: 0, inside: false };
  const rot = 25 * Math.PI / 180;
  gl.uniform1f(u('uPRotC'), Math.cos(rot)); gl.uniform1f(u('uPRotS'), Math.sin(rot));
  let pillarT = 0, start = performance.now(), lastT = 0, lastDraw = 0;
  const colors = () => {
    gl.uniform3fv(u('uTop'), rgb01('--violet')); gl.uniform3fv(u('uBottom'), rgb01('--train')); gl.uniform3fv(u('uBg'), rgb01('--bg'));
    gl.uniform1f(u('uLight'), isDark ? 0 : 1);
    gl.uniform3fv(u('uBallCol'), rgb01(isDark ? '--bg2' : '--bg3')); gl.uniform3fv(u('uCursorCol'), rgb01(isDark ? '--train' : '--input'));
  };
  const resize = () => { const r = host.getBoundingClientRect(); canvas.width = Math.max(1, Math.round(r.width * Q.res)); canvas.height = Math.max(1, Math.round(r.height * Q.res)); gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(u('uRes'), canvas.width, canvas.height); };
  const draw = t => {
    if (t - lastDraw < 32 && lastDraw) return; // ~30 fps
    const dt = lastT ? Math.min(0.1, (t - lastT) / 1000) : 0; lastT = t; lastDraw = t;
    pillarT += dt * 60 * 0.016 * 0.3;
    gl.uniform1f(u('uTime'), pillarT); gl.uniform1f(u('uRotC'), Math.cos(pillarT * 0.3)); gl.uniform1f(u('uRotS'), Math.sin(pillarT * 0.3));
    const el = (t - start) * 0.001, sp = 0.3;
    balls.forEach((b, i) => { const d = el * sp * b.dtf, th = b.st + d; ballBuf[i * 3] = Math.cos(th) * b.base; ballBuf[i * 3 + 1] = Math.sin(th + d * b.toggle) * b.base; ballBuf[i * 3 + 2] = b.r; });
    gl.uniform3fv(u('uBalls[0]'), ballBuf);
    if (!mouse.inside) { mouse.tx = canvas.width * 0.5 + Math.cos(el * sp) * canvas.width * 0.15; mouse.ty = canvas.height * 0.5 + Math.sin(el * sp) * canvas.height * 0.15; }
    mouse.x += (mouse.tx - mouse.x) * 0.05 * Math.max(1, dt * 60); mouse.y += (mouse.ty - mouse.y) * 0.05 * Math.max(1, dt * 60);
    gl.uniform2f(u('uMouseB'), mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  host.addEventListener('pointermove', e => { const r = host.getBoundingClientRect(); mouse.inside = true; mouse.tx = (e.clientX - r.left) / r.width * canvas.width; mouse.ty = (1 - (e.clientY - r.top) / r.height) * canvas.height; }, { passive: true });
  host.addEventListener('pointerleave', () => { mouse.inside = false; });
  colors(); resize();
  mouse.x = mouse.tx = canvas.width * 0.65; mouse.y = mouse.ty = canvas.height * 0.5;
  const loop = makeLoop(host, draw);
  const still = () => { lastDraw = 0; loop.still(); };
  new ResizeObserver(() => { resize(); still(); }).observe(host);
  onTheme(() => { colors(); still(); });
  still();
})();
}
