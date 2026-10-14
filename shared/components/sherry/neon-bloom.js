// ══════════════════════════════════════════════════════
// Neon Bloom · el fondo de triángulos que destellan, ahora con bloom real.
// Antes: canvas 2D que restrokeaba ~1300 triángulos cada cuadro con
// `shadowBlur` en los que brillaban. Ahora todo vive en la GPU:
//  · La retícula es analítica: con a = y/h y b = x/s − a/2, las tres
//    familias de líneas son a, b y a + b enteros, y las tres quedan a la
//    misma distancia perpendicular h. Cada celda (i, j) se parte en dos
//    triángulos por a + b = 1.
//  · Cada triángulo destella una vez por periodo, con fase, duración y
//    color sacados de un hash de su id y su época: sin estado en la CPU.
//    Un borde se enciende si destella cualquiera de sus dos triángulos.
//  · Bloom: umbral y desenfoque gaussiano separable a 1/2, 1/4 y 1/8,
//    sumados encima de la escena. Solo de noche (de día no hay neón).
//  · Pulsos: `sh:pulse` en window ({ x, y, color }) enciende un anillo de
//    triángulos que se abre desde ese punto (terminal, paleta, clics).
// Solo corre mientras se ve algún nivel transparente (el resto lo tapa).
// ══════════════════════════════════════════════════════
import { cssVar, reduceMotion } from './kit.js';
import { glLink, hexRgb, onTheme, theme } from '../../core/core.js';

const VS = 'attribute vec2 position; void main(){ gl_Position = vec4(position, 0.0, 1.0); }';
const NEONS = ['--magenta', '--cyan', '--lime', '--violet', '--electric', '--rose', '--aqua'];
const MAX_PULSES = 8;

const SCENE = `
precision highp float;
uniform vec2 uRes; uniform float uS; uniform float uT; uniform float uAnim; uniform float uW;
uniform vec3 uBase; uniform float uBaseA; uniform float uFlashA;
uniform vec3 uPal[7];
uniform vec4 uPulse[${MAX_PULSES}]; uniform vec3 uPulseCol[${MAX_PULSES}];
const float P = 300.0;
float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
vec3 pal(float k){ vec3 c = uPal[0]; for (int i = 1; i < 7; i++) if (float(i) == k) c = uPal[i]; return c; }
// centro del triángulo en píxeles: (i + 1/3, j + 1/3) abajo, + 2/3 arriba
vec2 center(vec3 id){ float o = id.z > 0.5 ? 2.0 / 3.0 : 1.0 / 3.0; float a = id.x + o, b = id.y + o; float h = uS * 0.8660254; return vec2(uS * (b + a * 0.5), a * h); }
float flash(vec3 id, out vec3 col){
  col = uPal[0];
  float e = 0.0;
  if (uAnim > 0.5) {
    float tt = uT + hash(id) * P, ep = floor(tt / P), lt = tt - ep * P;
    float dur = 0.6 + 0.8 * hash(id + vec3(ep * 7.13, ep * 3.7, 1.0));
    float p = lt / dur;
    if (p < 1.0) { e = p < 0.3 ? p / 0.3 : 1.0 - (p - 0.3) / 0.7; col = pal(floor(hash(id + vec3(ep, 2.0, 5.0)) * 7.0)); }
  }
  vec2 c = center(id);
  for (int k = 0; k < ${MAX_PULSES}; k++) {
    vec4 q = uPulse[k];
    if (q.w < 0.5) continue;
    float age = uT - q.z;
    float d = length(c - q.xy), r = age * uS * 9.0;
    float ring = (1.0 - smoothstep(0.0, uS * 1.2, abs(d - r))) * (1.0 - smoothstep(uS * 4.0, uS * 14.0, d)) * (1.0 - smoothstep(1.2, 2.2, age));
    if (ring > e) { e = ring; col = uPulseCol[k]; }
  }
  return e;
}
void main(){
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float h = uS * 0.8660254;
  float a = px.y / h, b = px.x / uS - a * 0.5;
  vec2 ij = floor(vec2(a, b)); vec2 f = vec2(a, b) - ij;
  bool up = f.x + f.y > 1.0;
  vec3 me = vec3(ij, up ? 1.0 : 0.0);
  // distancia a cada borde (en píxeles) y el triángulo del otro lado
  vec3 d = up ? vec3(1.0 - f.x, 1.0 - f.y, f.x + f.y - 1.0) : vec3(f.x, f.y, 1.0 - f.x - f.y);
  d *= h;
  vec3 other;
  float dm;
  if (d.x <= d.y && d.x <= d.z) { dm = d.x; other = up ? vec3(ij.x + 1.0, ij.y, 0.0) : vec3(ij.x - 1.0, ij.y, 1.0); }
  else if (d.y <= d.z) { dm = d.y; other = up ? vec3(ij.x, ij.y + 1.0, 0.0) : vec3(ij.x, ij.y - 1.0, 1.0); }
  else { dm = d.z; other = vec3(ij, up ? 0.0 : 1.0); }
  float cov = 1.0 - smoothstep(uW - 0.5, uW + 0.5, dm);
  if (cov <= 0.0) { gl_FragColor = vec4(0.0); return; }
  vec3 c1, c2;
  float e1 = flash(me, c1), e2 = flash(other, c2);
  float e = max(e1, e2); vec3 fc = e1 >= e2 ? c1 : c2;
  vec3 col = mix(uBase, fc, step(0.001, e));
  float al = (uBaseA + e * uFlashA) * cov;
  gl_FragColor = vec4(col * al, al);
}`;

// Desenfoque gaussiano separable (5 lecturas lineales = 9 texeles). Con
// uThr > 0 hace además el umbral: solo pasa lo que brilla más que la retícula.
const BLUR = `
precision mediump float;
uniform sampler2D uTex; uniform vec2 uOut; uniform vec2 uDir; uniform float uThr;
vec4 tap(vec2 uv){ vec4 c = texture2D(uTex, uv); return uThr > 0.0 ? c * smoothstep(uThr, uThr + 0.25, max(c.r, max(c.g, c.b))) : c; }
void main(){
  vec2 uv = gl_FragCoord.xy / uOut;
  vec4 c = tap(uv) * 0.2270270;
  c += (tap(uv + uDir * 1.3846154) + tap(uv - uDir * 1.3846154)) * 0.3162162;
  c += (tap(uv + uDir * 3.2307692) + tap(uv - uDir * 3.2307692)) * 0.0702703;
  gl_FragColor = c;
}`;

const COMPOSE = `
precision mediump float;
uniform sampler2D uScene, uB1, uB2, uB3; uniform vec2 uOut; uniform float uBloom;
void main(){
  vec2 uv = gl_FragCoord.xy / uOut;
  vec4 s = texture2D(uScene, uv);
  vec3 g = (texture2D(uB1, uv).rgb * 0.9 + texture2D(uB2, uv).rgb * 1.1 + texture2D(uB3, uv).rgb * 1.4) * uBloom;
  vec3 rgb = min(s.rgb + g, vec3(1.0));
  gl_FragColor = vec4(rgb, max(s.a, max(rgb.r, max(rgb.g, rgb.b))));
}`;

export function mount({ canvas = '#tri-canvas', size = 48, watch = '.sherry-level:not(.is-opaque)' } = {}) {
  const cv = typeof canvas === 'string' ? document.querySelector(canvas) : canvas;
  if (!cv) return null;
  const gl = cv.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true });
  if (!gl) { cv.remove(); return null; }
  const attribs = { attribs: { position: 0 } };
  const progs = { scene: glLink(gl, VS, SCENE, attribs), blur: glLink(gl, VS, BLUR, attribs), comp: glLink(gl, VS, COMPOSE, attribs) };
  if (!progs.scene || !progs.blur || !progs.comp) { cv.remove(); return null; }
  const loc = {};
  const u = (p, n) => { const k = p + n; if (!(k in loc)) loc[k] = gl.getUniformLocation(progs[p], n); return loc[k]; };
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const target = () => {
    const tex = gl.createTexture(), fb = gl.createFramebuffer();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(p => gl.texParameteri(gl.TEXTURE_2D, p, gl.LINEAR));
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(p => gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE));
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    return { tex, fb, w: 0, h: 0, size(w, h) { this.w = w; this.h = h; gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0); } };
  };
  const scene = target(), A = [target(), target(), target()], B = [target(), target(), target()];

  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, matchMedia('(pointer: coarse)').matches ? 1.5 : 2);
    W = Math.max(1, Math.round(innerWidth * dpr)); H = Math.max(1, Math.round(innerHeight * dpr));
    cv.width = W; cv.height = H;
    scene.size(W, H);
    A.forEach((t, i) => { const k = 2 << i; t.size(Math.max(1, W / k | 0), Math.max(1, H / k | 0)); B[i].size(t.w, t.h); });
  };

  // Paleta y mezcla según el modo: de día los neones son las tintas
  // oscuras de body.light y no hay bloom.
  let pal = [], bloom = 1;
  const readTokens = () => {
    pal = NEONS.map(n => hexRgb(cssVar(n)).map(v => v / 255));
    bloom = theme.alt ? 0 : 1;
  };

  const pulses = Array.from({ length: MAX_PULSES }, () => ({ x: 0, y: 0, t: -99, c: [1, 1, 1] }));
  let next = 0;
  const t0 = performance.now();
  const now = () => (performance.now() - t0) / 1000;

  const pass = (t, w, h) => { gl.bindFramebuffer(gl.FRAMEBUFFER, t ? t.fb : null); gl.viewport(0, 0, w, h); };
  const draw = anim => {
    const T = now();
    // escena
    gl.useProgram(progs.scene); pass(scene, W, H);
    gl.uniform2f(u('scene', 'uRes'), W, H);
    gl.uniform1f(u('scene', 'uS'), size * dpr);
    gl.uniform1f(u('scene', 'uW'), 0.75 * dpr);
    gl.uniform1f(u('scene', 'uT'), T);
    gl.uniform1f(u('scene', 'uAnim'), anim ? 1 : 0);
    gl.uniform3f(u('scene', 'uBase'), 0.467, 0.467, 0.467);
    gl.uniform1f(u('scene', 'uBaseA'), 0.1);
    gl.uniform1f(u('scene', 'uFlashA'), theme.alt ? 0.55 : 0.9);
    gl.uniform3fv(u('scene', 'uPal'), pal.flat());
    gl.uniform4fv(u('scene', 'uPulse'), pulses.flatMap(p => [p.x * dpr, p.y * dpr, p.t, anim && T - p.t < 2.2 ? 1 : 0]));
    gl.uniform3fv(u('scene', 'uPulseCol'), pulses.flatMap(p => p.c));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // bloom: umbral + desenfoque a 1/2, 1/4 y 1/8
    if (bloom > 0) {
      gl.useProgram(progs.blur);
      gl.uniform1i(u('blur', 'uTex'), 0); gl.activeTexture(gl.TEXTURE0);
      let src = scene;
      A.forEach((a, i) => {
        const b = B[i];
        pass(b, b.w, b.h); gl.bindTexture(gl.TEXTURE_2D, src.tex);
        gl.uniform2f(u('blur', 'uOut'), b.w, b.h); gl.uniform2f(u('blur', 'uDir'), 1 / src.w, 0); gl.uniform1f(u('blur', 'uThr'), i === 0 ? 0.22 : 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        pass(a, a.w, a.h); gl.bindTexture(gl.TEXTURE_2D, b.tex);
        gl.uniform2f(u('blur', 'uOut'), a.w, a.h); gl.uniform2f(u('blur', 'uDir'), 0, 1 / b.h); gl.uniform1f(u('blur', 'uThr'), 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        src = a;
      });
    }
    gl.useProgram(progs.comp); pass(null, W, H);
    [scene, ...A].forEach((t, i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t.tex); });
    ['uScene', 'uB1', 'uB2', 'uB3'].forEach((n, i) => gl.uniform1i(u('comp', n), i));
    gl.uniform2f(u('comp', 'uOut'), W, H);
    gl.uniform1f(u('comp', 'uBloom'), bloom);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.activeTexture(gl.TEXTURE0);
  };

  // Bucle: solo con algún nivel transparente a la vista, pestaña visible,
  // fondo encendido y sin reduced motion (entonces, un cuadro quieto).
  const seen = new Set();
  let raf = 0, on = true;
  const live = () => on && seen.size > 0 && !document.hidden && !reduceMotion.matches;
  const frame = () => { raf = 0; draw(true); if (live()) raf = requestAnimationFrame(frame); };
  const start = () => { if (!raf && live()) raf = requestAnimationFrame(frame); };
  const still = () => { if (on) draw(false); };
  const io = new IntersectionObserver(es => { es.forEach(e => e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)); start(); });
  document.querySelectorAll(watch).forEach(el => io.observe(el));
  document.addEventListener('visibilitychange', start);
  reduceMotion.addEventListener('change', () => (reduceMotion.matches ? still() : start()));
  addEventListener('resize', () => { resize(); live() ? start() : still(); });
  onTheme(() => { readTokens(); live() ? start() : still(); });

  addEventListener('sh:pulse', e => {
    const { x = innerWidth / 2, y = innerHeight / 2, color } = e.detail || {};
    const c = color ? hexRgb(color).map(v => v / 255) : pal[next % pal.length];
    Object.assign(pulses[next % MAX_PULSES], { x, y, t: now(), c });
    next++;
    start();
  });

  readTokens(); resize(); still(); start();
  const api = {
    pause() { on = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    resume() { on = true; reduceMotion.matches ? still() : start(); },
  };
  window._sherryTri = api;
  return api;
}

// Para los demás componentes: enciende un anillo desde un punto de la pantalla.
export const pulse = (x, y, color) => dispatchEvent(new CustomEvent('sh:pulse', { detail: { x, y, color } }));
