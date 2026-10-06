// ══════════════════════════════════════════════════════
// Agua de fondo · Ferrofluid (React Bits, OGL → WebGL1). Bandas de luz que
// fluyen como cáusticas: espuma y rayo de luz de día, bioluminiscencia de
// noche. El cursor aparta la luz. 50% de resolución y 30 fps.
// ══════════════════════════════════════════════════════
import { $, coarsePointer, glProgram, isDark, makeLoop, onTheme, rgb01 } from './kit.js';

export function mount() {
(() => {
  const canvas = $('#sh-water');
  const fs = `precision highp float;
uniform vec3 iResolution; uniform vec2 iMouse; uniform float iTime; uniform vec3 uColor0; uniform vec3 uColor1; uniform vec3 uColor2; uniform float uOpacity; uniform float uMouseOn;
const float SPEED = 0.35; const float SCALE = 1.6; const float TURB = 1.0; const float FLUID = 0.1; const float RIM = 0.2; const float SHARP = 2.5; const float SHIMMER = 1.5; const float GLOW = 2.0;
const float MSTRENGTH = 1.0; const float MRADIUS = 0.35; const vec2 FLOW = vec2(0.0, -1.0); const float PI = 3.14159265;
vec3 palette(float h) { if (h < 0.3333) return uColor0; if (h < 0.6666) return uColor1; return uColor2; }
float hash(vec3 p3) { p3 = fract(p3 * 0.1031); p3 += dot(p3, p3.zyx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float smin(float a, float b, float k) { float r = exp2(-a / k) + exp2(-b / k); return -k * log2(r); }
float sinlerp(float a, float b, float w) { return mix(a, b, (sin(w * PI - PI / 2.0) + 1.0) / 2.0); }
float vn(vec2 p, float s, float seed) {
  vec2 cellp = floor(p / s); vec2 relp = mod(p, s);
  float g1 = hash(vec3(cellp, seed)); float g2 = hash(vec3(cellp.x + 1.0, cellp.y, seed)); float g3 = hash(vec3(cellp.x + 1.0, cellp.y + 1.0, seed)); float g4 = hash(vec3(cellp.x, cellp.y + 1.0, seed));
  float bx = sinlerp(g1, g2, relp.x / s); float tx = sinlerp(g4, g3, relp.x / s); return sinlerp(bx, tx, relp.y / s);
}
float dbn(vec2 p, float s, float seed) { float o = s / 2.0; float n0 = vn(p, s, seed); float n1 = vn(p + vec2(o, o), s, seed + 0.1); float n2 = vn(p + vec2(-o, o), s, seed + 0.2); float n3 = vn(p + vec2(o, -o), s, seed + 0.3); float n4 = vn(p + vec2(-o, -o), s, seed + 0.4); return (2.0 * n0 + 1.5 * n1 + 1.25 * n2 + 1.125 * n3 + n4) / 7.0; }
void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  float ref = 700.0 / SCALE; vec2 p = fragCoord / iResolution.y * ref; float spd = 200.0 * SPEED; float t = iTime;
  vec2 dir = FLOW; vec2 perp = vec2(-dir.y, dir.x);
  float distort1 = vn(p + perp * (t * spd), 60.0, 10.0) * 50.0 * TURB; float distort2 = vn(p - perp * (t * spd), 120.0, 15.0) * 100.0 * TURB;
  float peaks = dbn(p + distort1 + dir * (t * spd * 0.5), 40.0, 1.0); float peaks2 = dbn(p + distort2 - dir * (t * spd * 0.5), 40.0, 0.0);
  float mapeaks = smin(peaks, peaks2, FLUID);
  float mp = 0.0;
  if (uMouseOn > 0.5) { vec2 m = iMouse / iResolution.y * ref; float md = length(p - m) / ref; mp = exp(-md * md / (MRADIUS * MRADIUS)) * MSTRENGTH; }
  float band = (RIM - abs((mapeaks - 0.4) * 2.0)) * 5.0;
  float ltn = clamp(band - vn(p + dir * (t * spd * 0.5), 60.0, 12.0) * SHIMMER, 0.0, 1.0);
  ltn = pow(ltn, SHARP) * GLOW; ltn *= clamp(1.0 - mp, 0.0, 1.0);
  float h = clamp(0.5 + (peaks - peaks2) * 0.8, 0.0, 1.0);
  vec3 outc = min(palette(h) * ltn, vec3(0.97));
  float a = clamp(max(outc.r, max(outc.g, outc.b)), 0.0, 1.0);
  gl_FragColor = vec4(outc, a * uOpacity);
}`;
  const g = glProgram(canvas, fs); if (!g) return;
  const { gl, u } = g, RES = coarsePointer.matches ? 0.4 : 0.5;
  let mouse = [-9999, -9999], target = [-9999, -9999], on = 0;
  const colors = () => {
    const c = isDark ? ['--biolum-cyan', '--biolum-violet', '--biolum-green'] : ['--light-ray', '--foam', '--aqua'];
    c.forEach((n, i) => gl.uniform3fv(u('uColor' + i), rgb01(n)));
    gl.uniform1f(u('uOpacity'), isDark ? 0.55 : 0.5);
  };
  const resize = () => { canvas.width = Math.max(1, Math.round(innerWidth * RES)); canvas.height = Math.max(1, Math.round(innerHeight * RES)); gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform3f(u('iResolution'), canvas.width, canvas.height, 1); };
  window.addEventListener('pointermove', e => { target = [e.clientX * RES, (innerHeight - e.clientY) * RES]; on = 1; }, { passive: true });
  const draw = t => {
    mouse = [mouse[0] + (target[0] - mouse[0]) * 0.15, mouse[1] + (target[1] - mouse[1]) * 0.15];
    gl.uniform2f(u('iMouse'), mouse[0], mouse[1]); gl.uniform1f(u('uMouseOn'), on);
    gl.uniform1f(u('iTime'), t * 0.001);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  colors(); resize();
  const loop = makeLoop(document.documentElement, draw, 30);
  window.addEventListener('resize', () => { resize(); loop.still(); });
  onTheme(() => { colors(); loop.still(); });
  loop.still();
})();
}
