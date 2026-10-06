// ══════════════════════════════════════════════════════
// WARP TEXT (React Bits) · el original es OGL/WebGL2: el texto se
// dibuja en un canvas 2D, se sube como textura y un fragment shader
// lo deforma con fbm (4 octavas) a la deriva, una lente/abombado
// alrededor del puntero con ondas, y separación RGB en la dirección
// del desplazamiento. Mismo GLSL traducido a WebGL1 (texture2D,
// gl_FragColor) y mismos valores por defecto. Sin puntero, el foco
// deambula solo (seno/coseno lentos) como en el original.
// ══════════════════════════════════════════════════════
import { cssVar, reduceMotion } from './kit.js';

export function initWarpText() {
  const host = document.getElementById('metro-warp');
  if (!host) return null;
  const cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  const gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: true });
  if (!gl) return null;
  host.appendChild(cv);
  const P = { text: 'metro', warpStrength: 0.08, warpScale: 1.7, speed: 0.55, pointerInfluence: 0.42, pointerStrength: 0.38, refraction: 0.018, ripple: 1, fontSize: 'clamp(3rem, 10vw, 9rem)', fontWeight: 700, fontFamily: getComputedStyle(document.body).getPropertyValue('--mono'), letterSpacing: '-0.06em', lineHeight: 0.9 };
  const vs = `attribute vec2 position; attribute vec2 uv; varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }`;
  const fs = `
precision highp float;
uniform sampler2D uTextTexture; uniform vec2 uResolution; uniform vec2 uPointer; uniform float uPointerActive; uniform float uTime;
uniform float uWarpStrength; uniform float uWarpScale; uniform float uSpeed; uniform float uPointerInfluence; uniform float uPointerStrength;
uniform float uRefraction; uniform float uRipple; uniform float uMotion;
varying vec2 vUv;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a * noise(p); p *= 2.02; a *= 0.5; } return v; }
vec4 sampleText(vec2 uv){ if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0); return texture2D(uTextTexture, uv); }
void main(){
  vec2 uv = vUv;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  float time = uTime * uSpeed;
  float scale = max(uWarpScale, 0.001);
  vec2 drift = vec2(time * 0.055, -time * 0.045);
  float n1 = fbm(uv * scale * 3.1 + drift);
  float n2 = fbm((uv + 19.17) * scale * 3.4 - drift.yx);
  vec2 ambient = (vec2(n1, n2) - 0.5) * uWarpStrength * 0.045 * uMotion;
  vec2 pd = uv - uPointer;
  vec2 ad = vec2(pd.x * aspect, pd.y);
  float dist = length(ad);
  float radius = max(uPointerInfluence, 0.001);
  float t = clamp(dist / radius, 0.0, 1.0);
  float lens = smoothstep(radius, 0.0, dist) * uPointerActive;
  float bulge = t * (1.0 - t) * (1.0 - t) * 6.75 * uPointerActive;
  vec2 dir = dist > 0.0001 ? vec2(ad.x / aspect, ad.y) / dist : vec2(0.0);
  float rippleWave = sin(dist * 28.0 - time * 4.2) * 0.5 + 0.5;
  float rippleRing = (rippleWave - 0.5) * uRipple;
  vec2 pointerWarp = -dir * bulge * uPointerStrength * 0.045;
  pointerWarp += dir * rippleRing * bulge * uPointerStrength * 0.016;
  vec2 displaced = uv + ambient + pointerWarp;
  vec2 splitDir = ambient + pointerWarp;
  float splitLen = length(splitDir);
  splitDir = splitLen > 0.00001 ? splitDir / splitLen : vec2(0.7071, 0.7071);
  vec2 split = splitDir * uRefraction * 0.16 * (0.35 + lens * 1.65);
  vec4 base = sampleText(displaced);
  vec4 sp = sampleText(displaced + split), sm = sampleText(displaced - split);
  float a = max(max(sp.a, base.a), sm.a);
  vec3 color = vec3(sp.r, base.g, sm.b) + lens * base.a * 0.055;
  gl_FragColor = vec4(color, a);
}`;
  function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { cv.remove(); return null; }
  gl.useProgram(prog);
  // Triángulo único que cubre la pantalla (Triangle de OGL).
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 0,0,  3,-1, 2,0,  -1,3, 0,2]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'position'), aUv = gl.getAttribLocation(prog, 'uv');
  gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(aUv); gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 16, 8);
  const U = {};
  ['uTextTexture','uResolution','uPointer','uPointerActive','uTime','uWarpStrength','uWarpScale','uSpeed','uPointerInfluence','uPointerStrength','uRefraction','uRipple','uMotion']
    .forEach(n => U[n] = gl.getUniformLocation(prog, n));
  gl.uniform1i(U.uTextTexture, 0);
  gl.uniform1f(U.uWarpStrength, P.warpStrength); gl.uniform1f(U.uWarpScale, P.warpScale); gl.uniform1f(U.uSpeed, P.speed);
  gl.uniform1f(U.uPointerInfluence, P.pointerInfluence); gl.uniform1f(U.uPointerStrength, P.pointerStrength);
  gl.uniform1f(U.uRefraction, P.refraction); gl.uniform1f(U.uRipple, P.ripple);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  function measureLine(c, line, ls) { const ch = Array.from(line); return ch.reduce((w, x) => w + c.measureText(x).width, 0) + Math.max(0, ch.length - 1) * ls; }
  function drawLine(c, line, x, y, ls) { const ch = Array.from(line); let cur = x - measureLine(c, line, ls) / 2; ch.forEach((x2, i) => { c.fillText(x2, cur, y); cur += c.measureText(x2).width + (i === ch.length - 1 ? 0 : ls); }); }
  let rasterVersion = 0, ready = false;
  async function rasterize() {
    const version = ++rasterVersion;
    try { await document.fonts.ready; } catch (e) {}
    if (version !== rasterVersion) return;
    const rect = host.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const tc = document.createElement('canvas');
    tc.width = Math.max(1, Math.floor(rect.width * dpr)); tc.height = Math.max(1, Math.floor(rect.height * dpr));
    const c = tc.getContext('2d');
    const probe = document.createElement('span');
    probe.textContent = P.text;
    Object.assign(probe.style, { position: 'absolute', visibility: 'hidden', pointerEvents: 'none', whiteSpace: 'pre', inset: '0 auto auto 0', fontFamily: P.fontFamily, fontSize: P.fontSize, fontWeight: String(P.fontWeight), letterSpacing: P.letterSpacing, lineHeight: String(P.lineHeight) });
    host.appendChild(probe);
    const cs = getComputedStyle(probe);
    let fsz = parseFloat(cs.fontSize) || 96;
    const fam = cs.fontFamily || 'monospace', fw = cs.fontWeight || '700';
    let ls = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing) || 0;
    let lh = parseFloat(cs.lineHeight); if (!Number.isFinite(lh)) lh = fsz * P.lineHeight;
    probe.remove();
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = cssVar('--hero-ink') || '#F2F4F8';
    const apply = () => { c.font = `${fw} ${fsz}px ${fam}`; };
    apply();
    const lines = P.text.split('\n');
    const widest = Math.max(...lines.map(l => measureLine(c, l, ls)), 1);
    const fit = Math.min(1, (rect.width * 0.86) / widest, (rect.height * 0.78) / Math.max(lh * lines.length, 1));
    if (fit < 1) { fsz *= fit; ls *= fit; lh *= fit; apply(); }
    const startY = rect.height / 2 - (lh * (lines.length - 1)) / 2;
    lines.forEach((l, i) => drawLine(c, l, rect.width / 2, startY + i * lh, ls));
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tc);
    ready = true;
    host.classList.add('is-gl');
    render();
  }
  function resize() {
    const rect = host.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(rect.width * dpr); cv.height = Math.round(rect.height * dpr);
    gl.viewport(0, 0, cv.width, cv.height);
    gl.uniform2f(U.uResolution, cv.width, cv.height);
    rasterize();
  }
  const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, active: 0, target: 0 };
  const start = performance.now();
  // El canvas queda debajo del texto de apoyo y el scrim no lo tapa,
  // pero el pin del hero hace que el header capte el puntero: se
  // escucha sobre el contenedor, igual que el original sobre el canvas.
  host.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const r = cv.getBoundingClientRect();
    pointer.tx = (e.clientX - r.left) / r.width; pointer.ty = 1 - (e.clientY - r.top) / r.height; pointer.target = 1;
  });
  host.addEventListener('pointerleave', () => { pointer.target = 0; });
  function render() {
    if (!ready) return;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  let raf = 0, visible = true;
  function loop(now) {
    raf = 0;
    const el = (now - start) * 0.001;
    const idleX = 0.5 + Math.sin(el * 0.33) * 0.12, idleY = 0.5 + Math.cos(el * 0.27) * 0.1;
    const tx = pointer.target > 0 ? pointer.tx : idleX, ty = pointer.target > 0 ? pointer.ty : idleY;
    const damp = pointer.target > 0 ? 0.12 : 0.035;
    pointer.x += (tx - pointer.x) * damp; pointer.y += (ty - pointer.y) * damp;
    pointer.active += ((pointer.target > 0 ? 1 : 0.18) - pointer.active) * 0.06;
    const rm = reduceMotion.matches;
    gl.uniform2f(U.uPointer, pointer.x, pointer.y);
    gl.uniform1f(U.uPointerActive, rm ? pointer.active * 0.35 : pointer.active);
    gl.uniform1f(U.uTime, rm ? 0 : el);
    gl.uniform1f(U.uMotion, rm ? 0 : 1);
    render();
    // Con reduced-motion: un cuadro estático (sin deriva ni lente).
    if (visible && !document.hidden && !reduceMotion.matches) raf = requestAnimationFrame(loop);
  }
  const kick = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop); };
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; kick(); }, { threshold: 0 }).observe(host);
  document.addEventListener('visibilitychange', kick);
  new ResizeObserver(resize).observe(host);
  resize();
  kick();
  return { rasterize };
}
