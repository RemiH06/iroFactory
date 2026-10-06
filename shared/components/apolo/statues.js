// ══════════════════════════════════════════════════════
// Estatuas · Ripple Distortion con revelado de color
// Mismo React Bits "Ripple Distortion" que el hero (dos pasadas:
// olas → mapa de desplazamiento, luego composición), pero con las
// opciones que el hero deja fuera: `grayscale` y `tint` del original
// (GLSL de luminancia 0.2126/0.7152/0.0722 y tinte `color*tint*1.9`).
// Adaptaciones, a pedido: (1) la estatua está siempre en blanco y
// negro con tinte de --sky (en el original el gris es fijo y el
// tinte solo aparece donde pasan las olas); (2) solo donde pasan las
// olas vuelve el color real · el mapa de desplazamiento sirve de
// máscara, así que el color se apaga junto con cada ola; (3) contain
// en vez de cover y alfa real, porque las estatuas son PNG/WebP sin
// fondo (textura premultiplicada para que los bordes no dejen halo).
// El loop solo corre mientras hay olas vivas; en reposo no dibuja.
// Sin WebGL, la <img> queda visible con grayscale por CSS.
// ══════════════════════════════════════════════════════
import { cssVar, reduceMotion, updateHexes } from './kit.js';
import { drawPetals, resizePetals, seedAvalanche } from './petals.js';
import { buildSky } from './sky.js';
import { buildTexture } from './single-canvas.js';
import { buildBackStripes } from './strip-layer.js';
import { buildTiltColumns, updateTilt } from './tilt-card.js';
import { initRays } from './light-rays.js';
import { initRipple } from './ripple-distortion.js';
import { initHero } from './hero.js';
import { initTabs } from './circular-gallery-tabs.js';

export const statueFx = [];
export function initStatueRipple(figure) {
  const media = figure.querySelector('.ap-statue-media');
  const img = media && media.querySelector('img');
  const canvas = media && media.querySelector('canvas');
  if (!img || !canvas) return null;
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true });
  if (!gl) return null;

  const MAX_WAVES = 24;
  const BRUSH = 150, SWIRL = 1, RINGS = 4, SPREAD = 5, FADE = 3, SPACING = 15, STRENGTH = 0.06;
  const TINT_AMOUNT = 0.3;
  const LIFE_K = Math.log(500);

  const waveVs = `
    attribute vec2 aPos; attribute vec2 aUv;
    varying vec2 vUv;
    uniform vec2 uOffset; uniform vec2 uScale;
    void main(){ vUv = aUv; gl_Position = vec4(uOffset + aPos * uScale, 0.0, 1.0); }
  `;
  const waveFs = `
    precision highp float;
    varying vec2 vUv;
    uniform float uOpacity; uniform float uRings;
    void main() {
      vec2 p = vUv * 2.0 - 1.0;
      float r = dot(p, p);
      if (r > 1.0) discard;
      float edge = 0.006737947;
      float brush = (exp(-r * 5.0) - edge) / (1.0 - edge);
      brush *= 0.55 + 0.45 * cos(sqrt(r) * 6.283185307 * uRings);
      gl_FragColor = vec4(vec3(brush * uOpacity * uOpacity), 1.0);
    }
  `;
  const screenVs = `
    attribute vec2 aPos; attribute vec2 aUv;
    varying vec2 vUv;
    void main(){ vUv = aUv; gl_Position = vec4(aPos, 0.0, 1.0); }
  `;
  const compFs = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTexture; uniform sampler2D uDisplacement;
    uniform vec2 uResolution; uniform vec2 uTextureSize;
    uniform float uStrength; uniform float uSwirl;
    uniform vec3 uTint; uniform float uTintAmount;
    vec2 containUV(vec2 uv) {
      vec2 safe = max(uTextureSize, vec2(1.0));
      vec2 s = uResolution / safe;
      vec2 scaledSize = safe * min(s.x, s.y);
      vec2 offset = (uResolution - scaledSize) * 0.5;
      return (uv * uResolution - offset) / scaledSize;
    }
    void main() {
      float amount = texture2D(uDisplacement, vUv).r;
      float theta = amount * uSwirl * 6.283185307;
      vec2 uv = containUV(vUv) + vec2(sin(theta), cos(theta)) * amount * uStrength;
      if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0); return; }
      vec4 c = texture2D(uTexture, uv); // premultiplicado
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      vec3 mono = mix(vec3(l), l * uTint * 1.9, uTintAmount);
      float reveal = clamp(amount * 2.0, 0.0, 1.0);
      gl_FragColor = vec4(mix(mono, c.rgb, reveal), c.a);
    }
  `;
  function compile(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
  function link(vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    return p;
  }
  const waveProg = link(waveVs, waveFs);
  const compProg = link(screenVs, compFs);
  if (!gl.getProgramParameter(compProg, gl.LINK_STATUS)) return null;

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1,-1, 0,0,  1,-1, 1,0,  -1,1, 0,1,
    -1,1, 0,1,   1,-1, 1,0,   1,1, 1,1,
  ]), gl.STATIC_DRAW);
  function bindQuad(p) {
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    const aPos = gl.getAttribLocation(p, 'aPos'), aUv = gl.getAttribLocation(p, 'aUv');
    gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(aUv); gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 16, 8);
  }
  const wU = ['uOffset', 'uScale', 'uOpacity', 'uRings'].reduce((o, n) => (o[n] = gl.getUniformLocation(waveProg, n), o), {});
  const cU = ['uTexture', 'uDisplacement', 'uResolution', 'uTextureSize', 'uStrength', 'uSwirl', 'uTint', 'uTintAmount']
    .reduce((o, n) => (o[n] = gl.getUniformLocation(compProg, n), o), {});

  function makeTex() {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  let fbo = null, fboTex = null, fboW = 2, fboH = 2;
  function makeFBO(w, h) {
    if (fbo) { gl.deleteFramebuffer(fbo); gl.deleteTexture(fboTex); }
    fboW = Math.max(2, w); fboH = Math.max(2, h);
    fboTex = makeTex();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, fboW, fboH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  const imgTex = makeTex();
  let ready = false, texW = 1, texH = 1;
  function upload() {
    try {
      gl.bindTexture(gl.TEXTURE_2D, imgTex);
      // FLIP_Y: la fila 0 de la imagen es arriba, v=0 del quad es abajo.
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      texW = img.naturalWidth || 1; texH = img.naturalHeight || 1;
      ready = true;
      figure.classList.add('is-gl');
      kick();
    } catch (e) { ready = false; }
  }

  let tint = [0.5, 0.6, 0.9];
  function readTint() {
    const hex = cssVar('--sky').replace('#', '');
    const n = parseInt(hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex, 16);
    if (!Number.isNaN(n)) tint = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  readTint();

  const waves = Array.from({ length: MAX_WAVES }, () => ({ x: 0, y: 0, scale: 1.5, target: 1.5, opacity: 0 }));
  let current = 0, alive = 0;
  function spawn(x, y) {
    const w = waves[current];
    current = (current + 1) % MAX_WAVES;
    w.x = x; w.y = y; w.scale = 1.5; w.target = 1.5 * SPREAD; w.opacity = 1;
    kick();
  }

  let prevX = -999, prevY = -999;
  media.addEventListener('pointermove', (e) => {
    if (reduceMotion.matches) return;
    const r = media.getBoundingClientRect();
    const x = e.clientX - r.left, y = r.height - (e.clientY - r.top);
    if (Math.abs(x - prevX) > SPACING || Math.abs(y - prevY) > SPACING) {
      spawn(x, y); prevX = x; prevY = y;
    }
  }, { passive: true });

  let cssW = 1, cssH = 1;
  function resize() {
    cssW = Math.max(1, media.clientWidth); cssH = Math.max(1, media.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
    makeFBO(Math.round(cssW * 0.6), Math.round(cssH * 0.6));
    kick();
  }
  new ResizeObserver(resize).observe(media);

  let raf = null, prevT = 0;
  function kick() { if (!raf && ready) { prevT = 0; raf = requestAnimationFrame(frame); } }
  function frame(now) {
    raf = null;
    const dt = prevT ? Math.min(0.05, (now - prevT) / 1000) : 0;
    prevT = now;
    const growth = 1 - Math.exp(-dt * 1.09);
    const decay = Math.exp((-dt * LIFE_K) / FADE);

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, fboW, fboH);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(waveProg);
    bindQuad(waveProg);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.uniform1f(wU.uRings, RINGS);
    alive = 0;
    for (const wv of waves) {
      if (wv.opacity <= 0) continue;
      wv.opacity *= decay;
      wv.scale += (wv.target - wv.scale) * growth;
      if (wv.opacity < 0.002) { wv.opacity = 0; continue; }
      alive++;
      const half = (wv.scale * BRUSH) / 2;
      gl.uniform2f(wU.uOffset, (wv.x / cssW) * 2 - 1, (wv.y / cssH) * 2 - 1);
      gl.uniform2f(wU.uScale, (half / cssW) * 2, (half / cssH) * 2);
      gl.uniform1f(wU.uOpacity, wv.opacity);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    gl.disable(gl.BLEND);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(compProg);
    bindQuad(compProg);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, imgTex); gl.uniform1i(cU.uTexture, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, fboTex); gl.uniform1i(cU.uDisplacement, 1);
    gl.uniform2f(cU.uResolution, cssW, cssH);
    gl.uniform2f(cU.uTextureSize, texW, texH);
    gl.uniform1f(cU.uStrength, STRENGTH);
    gl.uniform1f(cU.uSwirl, SWIRL);
    gl.uniform3f(cU.uTint, tint[0], tint[1], tint[2]);
    gl.uniform1f(cU.uTintAmount, TINT_AMOUNT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (alive > 0) raf = requestAnimationFrame(frame);
  }

  if (img.complete && img.naturalWidth) upload(); else img.addEventListener('load', upload, { once: true });
  resize();
  return { refresh() { readTint(); kick(); } };
}
// ── Loop de animación ───────────────────────────────────
export let raysFx = null, rippleFx = null;
export function animLoop(ts) {
  // La primera llamada es directa (sin rAF) para pintar de inmediato;
  // ts llega undefined ahí · sin este default, uTime sale NaN y el
  // resultado del shader queda en manos de cómo cada GPU maneje NaN.
  ts = ts || performance.now();
  drawPetals();
  if (raysFx) raysFx.render(ts);
  if (rippleFx) rippleFx.render(ts);
  if (!reduceMotion.matches) requestAnimationFrame(animLoop);
}
export function mount() {
// ── Init ───────────────────────────────────────────────
window.addEventListener('resize', () => {
  buildSky(); resizePetals(); buildTexture(); buildBackStripes(); buildTiltColumns();
});
buildSky();
resizePetals();
buildTexture();
buildBackStripes();
buildTiltColumns();
updateHexes();
raysFx = initRays();
rippleFx = initRipple();
initHero();
initTabs();
document.querySelectorAll('.ap-statue').forEach(f => { const s = initStatueRipple(f); if (s) statueFx.push(s); });
if (!reduceMotion.matches) seedAvalanche();
animLoop();
reduceMotion.addEventListener('change', () => { if (!reduceMotion.matches) requestAnimationFrame(animLoop); });
// ── Tilt-card + Light Rays · reaccionan al puntero ───────
// Lente desactivado por ahora (probando solo tilt-card, a pedido
// del usuario) · initLens() se queda definida pero sin usarse.
// Se desactiva del todo si el usuario prefiere menos movimiento.
if (!reduceMotion.matches) {
  let tiltRaf = null;
  window.addEventListener('mousemove', (e) => {
    if (raysFx) raysFx.setMouse(e.clientX, e.clientY);
    if (tiltRaf) return;
    tiltRaf = requestAnimationFrame(() => {
      updateTilt(e.clientX, e.clientY);
      tiltRaf = null;
    });
  });
  window.addEventListener('mouseleave', () => updateTilt(-9999, -9999));
}
}
