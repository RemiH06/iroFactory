// ══════════════════════════════════════════════════════
// Prism (React Bits, OGL → WebGL crudo; GLSL ES 1.0 tal cual) detrás de
// la pista (pie): una pirámide de luz con 100 pasos de marcha, girando con su
// bamboleo (animación «rotate»), ruido .5, escala 3.6. Su modo claro
// mezclaba con blanco puro: aquí la luz es transparencia sobre la base.
// Es el fondo más caro: media resolución y 30 fps, solo mientras se ve.
// ══════════════════════════════════════════════════════
import { $, $$, theme, cssVar, hexRgb, rgb01, rgba, onTheme, reduceMotion, makeLoop, glProgram, EASE } from '../../core/core.js';

export function mount(opts = {}) {
  const canvas = $(opts.canvas ?? '[data-prism]'); if (!canvas) return;
  const FS = `precision highp float;
uniform vec2 iResolution; uniform float iTime; uniform float uHeight; uniform float uBaseHalf; uniform mat3 uRot; uniform int uUseBaseWobble; uniform float uGlow;
uniform vec2 uOffsetPx; uniform float uNoise; uniform float uSaturation; uniform float uScale; uniform float uHueShift; uniform float uColorFreq; uniform float uBloom;
uniform float uCenterShift; uniform float uInvBaseHalf; uniform float uInvHeight; uniform float uMinAxis; uniform float uPxScale; uniform float uTimeScale; uniform float uLightMode;
vec4 tanh4(vec4 x){ vec4 e2x = exp(2.0*x); return (e2x - 1.0) / (e2x + 1.0); }
float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453123); }
float sdOctaAnisoInv(vec3 p){ vec3 q = vec3(abs(p.x) * uInvBaseHalf, abs(p.y) * uInvHeight, abs(p.z) * uInvBaseHalf); float m = q.x + q.y + q.z - 1.0; return m * uMinAxis * 0.5773502691896258; }
float sdPyramidUpInv(vec3 p){ float oct = sdOctaAnisoInv(p); float halfSpace = -p.y; return max(oct, halfSpace); }
mat3 hueRotation(float a){ float c = cos(a), s = sin(a);
  mat3 W = mat3(0.299, 0.587, 0.114, 0.299, 0.587, 0.114, 0.299, 0.587, 0.114);
  mat3 U = mat3(0.701, -0.587, -0.114, -0.299, 0.413, -0.114, -0.300, -0.588, 0.886);
  mat3 V = mat3(0.168, -0.331, 0.500, 0.328, 0.035, -0.500, -0.497, 0.296, 0.201);
  return W + U * c + V * s; }
void main(){
  vec2 f = (gl_FragCoord.xy - 0.5 * iResolution.xy - uOffsetPx) * uPxScale;
  float z = 5.0; float d = 0.0; vec3 p; vec4 o = vec4(0.0); float centerShift = uCenterShift; float cf = uColorFreq;
  mat2 wob = mat2(1.0);
  if (uUseBaseWobble == 1) { float t = iTime * uTimeScale; float c0 = cos(t + 0.0); float c1 = cos(t + 33.0); float c2 = cos(t + 11.0); wob = mat2(c0, c1, c2, c0); }
  for (int i = 0; i < 100; i++) {
    p = vec3(f, z); p.xz = p.xz * wob; p = uRot * p; vec3 q = p; q.y += centerShift;
    d = 0.1 + 0.2 * abs(sdPyramidUpInv(q)); z -= d;
    o += (sin((p.y + z) * cf + vec4(0.0, 1.0, 2.0, 3.0)) + 1.0) / d;
  }
  o = tanh4(o * o * (uGlow * uBloom) / 1e5);
  vec3 col = o.rgb; float n = rand(gl_FragCoord.xy + vec2(iTime)); col += (n - 0.5) * uNoise; col = clamp(col, 0.0, 1.0);
  float L = dot(col, vec3(0.2126, 0.7152, 0.0722)); col = clamp(mix(vec3(L), col, uSaturation), 0.0, 1.0);
  if (abs(uHueShift) > 0.0001) { col = clamp(hueRotation(uHueShift) * col, 0.0, 1.0); }
  if (uLightMode > 0.5) { float peak = max(col.r, max(col.g, col.b)); vec3 chroma = pow(clamp(col / max(peak, 0.0001), 0.0, 1.0), vec3(1.14)); gl_FragColor = vec4(chroma, o.a * 0.94); }
  else { gl_FragColor = vec4(col, o.a); }
}`;
  const g = glProgram(canvas, FS); if (!g) { canvas.remove(); return; }
  const { gl, u } = g;
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const Hh = 3.5, BW = 5.5, BH = BW / 2, SC = 3.6;
  [['uHeight', Hh], ['uBaseHalf', BH], ['uGlow', 1], ['uNoise', .2], ['uSaturation', 1.5], ['uScale', SC], ['uHueShift', 0], ['uColorFreq', 1], ['uBloom', 1], ['uCenterShift', Hh * .25], ['uInvBaseHalf', 1 / BH], ['uInvHeight', 1 / Hh], ['uMinAxis', Math.min(BH, Hh)], ['uTimeScale', .5]].forEach(([n, v]) => gl.uniform1f(u(n), v));
  gl.uniform1i(u('uUseBaseWobble'), 1); gl.uniformMatrix3fv(u('uRot'), false, new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]));
  // A .3 de resolución, 20 fps y un lienzo solo del ancho de la pirámide (CSS): a .5 y 30 fps costaba ~1 s por cuadro en headless.
  // A esa escala el grano del original (.5) se veía en bloques: va a .2.
  const SCALE = .2;
  const resize = () => { const r = canvas.getBoundingClientRect(); canvas.width = Math.max(1, Math.round(r.width * SCALE)); canvas.height = Math.max(1, Math.round(r.height * SCALE)); gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(u('iResolution'), canvas.width, canvas.height); gl.uniform2f(u('uOffsetPx'), 0, canvas.height * .1); gl.uniform1f(u('uPxScale'), 1.25 / (canvas.height * .1 * SC)); }; // un poco más chica (×1.25) y arriba de los créditos
  const draw = t => { gl.uniform1f(u('iTime'), reduceMotion.matches ? 3 : t / 1000); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3); };
  const mode = () => gl.uniform1f(u('uLightMode'), theme.dark ? 0 : 1);
  mode(); resize();
  const loop = makeLoop(canvas.parentElement, draw, 20);
  new ResizeObserver(() => { resize(); loop.still(); }).observe(canvas);
  onTheme(() => { mode(); loop.still(); });
  loop.still();
}
