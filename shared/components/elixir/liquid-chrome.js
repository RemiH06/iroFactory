// ── 02 · Liquid Chrome (React Bits, OGL → WebGL1) ─────────────────
// Mismo campo de cosenos y ondita al cursor; el original devuelve un gris
// que satura a blanco puro en las crestas. Aquí ese valor se mapea por
// rampa de tres tonos del tema (fondo → índigo/fondo3 → teal/índigo) y
// topa en .97. Supermuestreo 2×2 (el original usa 3×3) a 50% de
// resolución: estirado por CSS, el 3×3 no se distingue y cuesta 2.8 veces más.
import { $, isDark, onTheme, rgb01 } from './kit.js';
import { glProgram, makeLoop } from './palette-labels.js';

export function mount() {
(() => {
  const canvas = $('#ex-chrome'), host = canvas.parentElement.parentElement;
  const fs = `precision highp float;
uniform float uTime; uniform vec2 uRes; uniform vec2 uMouse; uniform vec3 uDeep; uniform vec3 uMid; uniform vec3 uHigh;
const float AMP = 0.3; const float FX = 3.0; const float FY = 3.0; const float BASE = 0.1;
float chrome(vec2 uvCoord) {
  vec2 fragCoord = uvCoord * uRes;
  vec2 uv = (2.0 * fragCoord - uRes) / min(uRes.x, uRes.y);
  for (float i = 1.0; i < 10.0; i += 1.0) {
    uv.x += AMP / i * cos(i * FX * uv.y + uTime + uMouse.x * 3.14159);
    uv.y += AMP / i * cos(i * FY * uv.x + uTime + uMouse.y * 3.14159);
  }
  vec2 diff = uvCoord - uMouse; float dist = length(diff);
  float falloff = exp(-dist * 20.0); float ripple = sin(10.0 * dist - uTime * 2.0) * 0.03;
  uv += (diff / (dist + 0.0001)) * ripple * falloff;
  return BASE / abs(sin(uTime - uv.y - uv.x));
}
void main() {
  vec2 vUv = gl_FragCoord.xy / uRes; float e = 0.0;
  for (int i = 0; i < 2; i++) for (int j = 0; j < 2; j++) {
    vec2 off = (vec2(float(i), float(j)) - 0.5) * (1.0 / min(uRes.x, uRes.y));
    e += min(chrome(vUv + off), 1.0);
  }
  e /= 4.0;
  vec3 col = mix(mix(uDeep, uMid, smoothstep(BASE, 0.4, e)), uHigh, smoothstep(0.4, 1.0, e));
  gl_FragColor = vec4(min(col, vec3(0.97)), 1.0);
}`;
  const g = glProgram(canvas, fs); if (!g) return;
  const { gl, u } = g, SCALE = 0.5;
  const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
  let time = 0, lastT = 0;
  const colors = () => {
    const bg = rgb01('--bg'), bg2 = rgb01('--bg2'), bg3 = rgb01('--bg3');
    const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
    const deep = isDark ? bg : bg, mid = isDark ? mix(bg2, rgb01('--input'), 0.45) : bg3, high = isDark ? rgb01('--train') : rgb01('--input');
    gl.uniform3fv(u('uDeep'), deep); gl.uniform3fv(u('uMid'), mid); gl.uniform3fv(u('uHigh'), high);
  };
  const resize = () => { const r = host.getBoundingClientRect(); canvas.width = Math.max(1, Math.round(r.width * SCALE)); canvas.height = Math.max(1, Math.round(r.height * SCALE)); gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(u('uRes'), canvas.width, canvas.height); };
  const draw = t => {
    const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0; lastT = t; time += dt * 0.2;
    mouse.x += (mouse.tx - mouse.x) * 0.08; mouse.y += (mouse.ty - mouse.y) * 0.08;
    gl.uniform1f(u('uTime'), time); gl.uniform2f(u('uMouse'), mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  host.addEventListener('pointermove', e => { const r = host.getBoundingClientRect(); mouse.tx = (e.clientX - r.left) / r.width; mouse.ty = 1 - (e.clientY - r.top) / r.height; }, { passive: true });
  colors(); resize();
  const loop = makeLoop(host, draw);
  new ResizeObserver(() => { resize(); loop.still(); }).observe(host);
  onTheme(() => { colors(); loop.still(); });
  loop.still();
})();
}
