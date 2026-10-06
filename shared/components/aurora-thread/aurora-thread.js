// ══════════════════════════════════════════════════════
// Hilos de aurora entre secciones: el hilo de Ariadne hecho con Soft Aurora
// (React Bits, OGL → WebGL crudo; GLSL ES 1.0). Es el shader del original
// (Perlin 3D en tres octavas, dos capas con degradado coseno) con un solo
// cambio: el centro de la banda ya no es una recta, sigue una curva que
// toma otra ruta en cada carga (fases y alturas al azar una sola vez, como
// el jitter del hilo de Ariadne). La primera vez que aparece se dibuja de
// punta a punta en 2.2 s con la misma curva de Ariadne; los hilos alternan
// sentido, como el segundo hilo que regresa. Su modo claro mezclaba con
// blanco puro: aquí la luz es transparencia sobre la base.
// ══════════════════════════════════════════════════════
import { $, $$, theme, cssVar, hexRgb, rgb01, rgba, onTheme, reduceMotion, makeLoop, glProgram, EASE } from '../../core/core.js';

export function mount(opts = {}) {
  const FS = `precision highp float;
uniform float uTime; uniform vec3 uResolution; uniform float uSpeed; uniform float uScale; uniform float uBrightness; uniform vec3 uColor1; uniform vec3 uColor2;
uniform float uNoiseFreq; uniform float uNoiseAmp; uniform float uBandSpread; uniform float uOctaveDecay; uniform float uLayerOffset; uniform float uColorSpeed; uniform float uLightMode;
uniform vec4 uPath; uniform vec2 uPhase; uniform float uProg; uniform float uRev;
#define TAU 6.28318
vec3 gradientHash(vec3 p) { p = vec3(dot(p, vec3(127.1, 311.7, 234.6)), dot(p, vec3(269.5, 183.3, 198.3)), dot(p, vec3(169.5, 283.3, 156.9)));
  vec3 h = fract(sin(p) * 43758.5453123); float phi = acos(2.0 * h.x - 1.0); float theta = TAU * h.y; return vec3(cos(theta) * sin(phi), sin(theta) * cos(phi), cos(phi)); }
float quinticSmooth(float t) { float t2 = t * t; float t3 = t * t2; return 6.0 * t3 * t2 - 15.0 * t2 * t2 + 10.0 * t3; }
vec3 cosineGradient(float t, vec3 a, vec3 b, vec3 c, vec3 d) { return a + b * cos(TAU * (c * t + d)); }
float perlin3D(float amplitude, float frequency, float px, float py, float pz) {
  float x = px * frequency; float y = py * frequency;
  float fx = floor(x); float fy = floor(y); float fz = floor(pz); float cx = ceil(x); float cy = ceil(y); float cz = ceil(pz);
  vec3 g000 = gradientHash(vec3(fx, fy, fz)); vec3 g100 = gradientHash(vec3(cx, fy, fz)); vec3 g010 = gradientHash(vec3(fx, cy, fz)); vec3 g110 = gradientHash(vec3(cx, cy, fz));
  vec3 g001 = gradientHash(vec3(fx, fy, cz)); vec3 g101 = gradientHash(vec3(cx, fy, cz)); vec3 g011 = gradientHash(vec3(fx, cy, cz)); vec3 g111 = gradientHash(vec3(cx, cy, cz));
  float d000 = dot(g000, vec3(x - fx, y - fy, pz - fz)); float d100 = dot(g100, vec3(x - cx, y - fy, pz - fz)); float d010 = dot(g010, vec3(x - fx, y - cy, pz - fz)); float d110 = dot(g110, vec3(x - cx, y - cy, pz - fz));
  float d001 = dot(g001, vec3(x - fx, y - fy, pz - cz)); float d101 = dot(g101, vec3(x - cx, y - fy, pz - cz)); float d011 = dot(g011, vec3(x - fx, y - cy, pz - cz)); float d111 = dot(g111, vec3(x - cx, y - cy, pz - cz));
  float sx = quinticSmooth(x - fx); float sy = quinticSmooth(y - fy); float sz = quinticSmooth(pz - fz);
  float lx00 = mix(d000, d100, sx); float lx10 = mix(d010, d110, sx); float lx01 = mix(d001, d101, sx); float lx11 = mix(d011, d111, sx);
  float ly0 = mix(lx00, lx10, sy); float ly1 = mix(lx01, lx11, sy);
  return amplitude * mix(ly0, ly1, sz); }
// El hilo: altura de la banda a lo largo de x (0..1), suma de dos ondas con fase de esta carga.
float threadY(float xn) { return uPath.x + uPath.y * sin(xn * uPath.z + uPhase.x) + uPath.y * 0.45 * sin(xn * uPath.w + uPhase.y); }
float auroraGlow(float t) {
  vec2 uv = gl_FragCoord.xy / uResolution.y;
  float noiseVal = 0.0; float freq = uNoiseFreq; float amp = uNoiseAmp; vec2 samplePos = uv * uScale;
  for (float i = 0.0; i < 3.0; i += 1.0) { noiseVal += perlin3D(amp, freq, samplePos.x, samplePos.y, t); amp *= uOctaveDecay; freq *= 2.0; }
  float yBand = (gl_FragCoord.y / uResolution.y - threadY(gl_FragCoord.x / uResolution.x)) * 10.0;
  return 0.3 * max(exp(uBandSpread * (1.0 - 1.1 * abs(noiseVal * 0.35 + yBand))), 0.0); }
void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy; float t = uSpeed * 0.4 * uTime;
  float glow1 = auroraGlow(t); float glow2 = auroraGlow(t + uLayerOffset);
  vec3 gradient1 = cosineGradient(uv.x + uTime * uSpeed * 0.2 * uColorSpeed, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.3, 0.20, 0.20));
  vec3 gradient2 = cosineGradient(uv.x + uTime * uSpeed * 0.1 * uColorSpeed, vec3(0.5), vec3(0.5), vec3(2.0, 1.0, 0.0), vec3(0.5, 0.20, 0.25));
  // Se dibuja de punta a punta (pathLength del hilo de Ariadne), con la punta difusa.
  float along = uRev > 0.5 ? 1.0 - uv.x : uv.x;
  float drawn = 1.0 - smoothstep(uProg - 0.08, uProg, along);
  // Se apaga en las orillas de la tira para no cortarse en rectángulo.
  float edge = smoothstep(0.0, 0.18, uv.y) * smoothstep(1.0, 0.82, uv.y);
  vec3 col = 0.99 * glow1 * gradient1 * uColor1; col += 0.99 * glow2 * gradient2 * uColor2;
  col *= uBrightness * drawn * edge; float alpha = clamp(length(col), 0.0, 1.0);
  if (uLightMode > 0.5) {
    float phase1 = dot(gradient1, vec3(0.299, 0.587, 0.114)); float phase2 = dot(gradient2, vec3(0.299, 0.587, 0.114));
    float weight1 = pow(max(glow1 * (0.62 + 0.38 * phase1), 0.0), 1.35); float weight2 = pow(max(glow2 * (0.62 + 0.38 * phase2), 0.0), 1.35);
    float weightSum = max(weight1 + weight2, 0.0001);
    vec3 chroma = (weight1 * uColor1 + weight2 * uColor2) / weightSum; float neutral = min(chroma.r, min(chroma.g, chroma.b));
    chroma = max(chroma - vec3(neutral * 0.78), vec3(0.0)); float peak = max(chroma.r, max(chroma.g, chroma.b));
    chroma = pow(clamp(chroma / max(peak, 0.0001), 0.0, 1.0), vec3(1.08));
    float ink = clamp((weight1 + weight2) * uBrightness * 1.1, 0.0, 0.6) * drawn * edge; // más fino que el fondo original: es un hilo
    gl_FragColor = vec4(chroma, ink);
  } else { gl_FragColor = vec4(col, alpha); }
}`;
  // Pares de color por hilo (día / noche), en el orden de la paleta.
  const PAIRS = opts.pairs ?? [['--mustard', '--rose', '--peach', '--lila'], ['--sky', '--lila', '--sky', '--rose'], ['--mint', '--indigo', '--mint', '--indigo'], ['--peach', '--tomato', '--mustard', '--tomato'], ['--rose', '--lila', '--rose', '--lila']];
  const ease = x => { // cubic-bezier(0.22, 1, 0.36, 1), la curva del hilo de Ariadne
    let t = x; for (let i = 0; i < 6; i++) { const bx = 3 * .22 * t * (1 - t) ** 2 + 3 * .36 * t * t * (1 - t) + t ** 3 - x, d = 3 * .22 * (1 - t) ** 2 + 6 * (.36 - .22) * t * (1 - t) + 3 * (1 - .36) * t * t; if (Math.abs(d) < 1e-6) break; t = Math.min(1, Math.max(0, t - bx / d)); }
    return 3 * t * (1 - t) ** 2 + 3 * t * t * (1 - t) + t ** 3; };
  $$(opts.selector ?? '.aurora-thread').forEach(host => {
    const canvas = host.querySelector('canvas'), i = +host.dataset.thread, rev = host.hasAttribute('data-rev');
    const g = glProgram(canvas, FS); if (!g) { host.remove(); return; }
    const { gl, u } = g;
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    // Props del original (velocidad .6, escala 1.5, ruido 2.5/1, decaimiento .1); banda algo más abierta.
    [['uSpeed', .6], ['uScale', 1.5], ['uBrightness', 1.1], ['uNoiseFreq', 2.5], ['uNoiseAmp', 1], ['uBandSpread', 1.2], ['uOctaveDecay', .1], ['uLayerOffset', .4 + i * .3], ['uColorSpeed', 1]].forEach(([n, v]) => gl.uniform1f(u(n), v));
    // Ruta de esta carga: altura media, amplitud y dos frecuencias con fase al azar.
    gl.uniform4f(u('uPath'), .5 + (Math.random() - .5) * .08, .11 + Math.random() * .05, 4 + Math.random() * 2.5, 9 + Math.random() * 4);
    gl.uniform2f(u('uPhase'), Math.random() * 6.283, Math.random() * 6.283);
    gl.uniform1f(u('uRev'), rev ? 1 : 0);
    const colors = () => { const p = PAIRS[i % PAIRS.length]; gl.uniform3fv(u('uColor1'), rgb01(theme.dark ? p[2] : p[0])); gl.uniform3fv(u('uColor2'), rgb01(theme.dark ? p[3] : p[1])); gl.uniform1f(u('uLightMode'), theme.dark ? 0 : 1); };
    const SCALE = .4;
    const resize = () => { const r = canvas.getBoundingClientRect(); canvas.width = Math.max(1, Math.round(r.width * SCALE)); canvas.height = Math.max(1, Math.round(r.height * SCALE)); gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform3f(u('uResolution'), canvas.width, canvas.height, canvas.width / canvas.height); };
    // El trazo arranca cuando la tira está a la vista (no con el margen de precarga del bucle).
    let t0 = -1, armed = false;
    new IntersectionObserver(([e]) => { if (e.isIntersecting && !armed) { armed = true; loop.start(); } }, { threshold: .5 }).observe(host);
    const draw = t => {
      if (armed && t0 < 0) t0 = t;
      const p = reduceMotion.matches ? 1 : armed ? ease(Math.min(1, (t - t0) / 2200)) : 0;
      gl.uniform1f(u('uProg'), p * 1.08); gl.uniform1f(u('uTime'), reduceMotion.matches ? 6 + i : t / 1000);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    colors(); resize();
    const loop = makeLoop(host, draw, 30);
    new ResizeObserver(() => { resize(); loop.still(); }).observe(canvas);
    onTheme(() => { colors(); loop.still(); });
    loop.still();
  });
}
