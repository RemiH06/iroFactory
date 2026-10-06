// ══════════════════════════════════════════════════════
// Mesa · Line Waves (React Bits, OGL → WebGL1): líneas que se ondulan en
// diagonal como vetas de madera vivas, en los colores de la madera de
// siempre (veta clara, oscura y la luz de sol o de lámpara). Encima de la
// base en CSS; el cursor las tuerce. 50% de resolución y 30 fps.
// ══════════════════════════════════════════════════════
import { $, coarsePointer, glProgram, isDark, makeLoop, onTheme, rgb01 } from './kit.js';

export function mount() {
(() => {
  const canvas = $('#od-desk'), host = $('#viaje');
  const fs = `precision highp float;
uniform float uTime; uniform vec3 uResolution; uniform vec3 uColor1; uniform vec3 uColor2; uniform vec3 uColor3; uniform vec2 uMouse; uniform float uBrightness;
const float SPEED = 0.3; const float INNER = 32.0; const float OUTER = 36.0; const float WARP = 1.0; const float ROT = -0.785398; const float EDGE = 0.0; const float CYCLE = 1.0; const float MOUSE = 2.0;
#define HALF_PI 1.5707963
float hashF(float n) { return fract(sin(n * 127.1) * 43758.5453123); }
float smoothNoise(float x) { float i = floor(x); float f = fract(x); float u = f * f * (3.0 - 2.0 * f); return mix(hashF(i), hashF(i + 1.0), u); }
float displaceA(float c, float t) { return sin(c * 2.123) * 0.2 + sin(c * 3.234 + t * 4.345) * 0.1 + sin(c * 0.589 + t * 0.934) * 0.5; }
float displaceB(float c, float t) { return sin(c * 1.345) * 0.3 + sin(c * 2.734 + t * 3.345) * 0.2 + sin(c * 0.189 + t * 0.934) * 0.3; }
vec2 rotate2D(vec2 p, float a) { float c = cos(a); float s = sin(a); return vec2(p.x * c - p.y * s, p.x * s + p.y * c); }
void main() {
  vec2 coords = gl_FragCoord.xy / uResolution.xy; coords = coords * 2.0 - 1.0; coords = rotate2D(coords, ROT);
  float halfT = uTime * SPEED * 0.5; float fullT = uTime * SPEED;
  vec2 mPos = rotate2D(uMouse * 2.0 - 1.0, ROT); float mDist = length(coords - mPos); float mouseWarp = MOUSE * exp(-mDist * mDist * 4.0);
  float warpAx = coords.x + displaceA(coords.y, halfT) * WARP + mouseWarp; float warpAy = coords.y - displaceA(coords.x * cos(fullT) * 1.235, halfT) * WARP;
  float warpBx = coords.x + displaceB(coords.y, halfT) * WARP + mouseWarp; float warpBy = coords.y - displaceB(coords.x * sin(fullT) * 1.235, halfT) * WARP;
  vec2 fieldA = vec2(warpAx, warpAy); vec2 fieldB = vec2(warpBx, warpBy); vec2 blended = mix(fieldA, fieldB, mix(fieldA, fieldB, 0.5));
  float fadeTop = smoothstep(EDGE, EDGE + 0.4, blended.y); float fadeBottom = smoothstep(-EDGE, -(EDGE + 0.4), blended.y); float vMask = 1.0 - max(fadeTop, fadeBottom);
  float tileCount = mix(OUTER, INNER, vMask); float scaledY = blended.y * tileCount; float nY = smoothNoise(abs(scaledY));
  float ridge = pow(step(abs(nY - blended.x) * 2.0, HALF_PI) * cos(2.0 * (nY - blended.x)), 5.0);
  float lines = 0.0; for (float i = 1.0; i < 3.0; i += 1.0) lines += pow(max(fract(scaledY), fract(-scaledY)), i * 2.0);
  float pattern = vMask * lines; float cycleT = fullT * CYCLE;
  float r = (pattern + lines * ridge) * (cos(blended.y + cycleT * 0.234) * 0.5 + 1.0);
  float g = (pattern + vMask * ridge) * (sin(blended.x + cycleT * 1.745) * 0.5 + 1.0);
  float b = (pattern + lines * ridge) * (cos(blended.x + cycleT * 0.534) * 0.5 + 1.0);
  // El original suma los tres canales sobre negro: aquí se normaliza por su
  // peso para que el color sea una mezcla de las tres tintas de la madera.
  float w = r + g + b; vec3 tint = (r * uColor1 + g * uColor2 + b * uColor3) / max(w, 0.0001);
  float a = clamp(w * uBrightness, 0.0, 1.0);
  gl_FragColor = vec4(min(tint, vec3(0.97)), a);
}`;
  const g = glProgram(canvas, fs, { premultipliedAlpha: false, preserveDrawingBuffer: false });
  if (!g) return;
  const { gl, u } = g, RES = coarsePointer.matches ? 0.4 : 0.5;
  let mouse = [0.5, 0.5], target = [0.5, 0.5];
  const colors = () => {
    gl.uniform3fv(u('uColor1'), rgb01('--desk-lt')); gl.uniform3fv(u('uColor2'), rgb01('--desk-dk')); gl.uniform3fv(u('uColor3'), rgb01('--desk-glow'));
    gl.uniform1f(u('uBrightness'), isDark ? 0.16 : 0.3);
  };
  const resize = () => { const r = host.getBoundingClientRect(); canvas.width = Math.max(1, Math.round(r.width * RES)); canvas.height = Math.max(1, Math.round(r.height * RES)); gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform3f(u('uResolution'), canvas.width, canvas.height, canvas.width / canvas.height); };
  host.addEventListener('pointermove', e => { const r = host.getBoundingClientRect(); target = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height]; }, { passive: true });
  host.addEventListener('pointerleave', () => { target = [0.5, 0.5]; });
  let lastDraw = 0;
  const draw = t => {
    if (lastDraw && t - lastDraw < 32) return; lastDraw = t;
    mouse = [mouse[0] + (target[0] - mouse[0]) * 0.1, mouse[1] + (target[1] - mouse[1]) * 0.1];
    gl.uniform1f(u('uTime'), t * 0.001); gl.uniform2f(u('uMouse'), mouse[0], mouse[1]);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  colors(); resize();
  const loop = makeLoop(host, draw);
  new ResizeObserver(() => { resize(); lastDraw = 0; loop.still(); }).observe(host);
  onTheme(() => { colors(); lastDraw = 0; loop.still(); });
  loop.still();
})();
}
