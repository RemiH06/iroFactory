// ══════════════════════════════════════════════════════
// Noche · Swarm Cursor (React Bits, OGL → WebGL1): un cardumen de luz que
// orbita el cursor con estelas, sumado en un campo y umbralado como
// metaballs. Sin cursor (o en táctil quieto) deriva solo por la pantalla.
// ══════════════════════════════════════════════════════
import { $, clamp, isDark, onTheme, reduceMotion, rgb01 } from './kit.js';
import { splash } from './splash-cursor.js';

export const swarm = (() => {
  if (reduceMotion.matches) return null;
  const canvas = $('#sh-swarm');
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false });
  if (!gl) return null;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
  const link = (vs, fs) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); return p; };
  const fieldP = link(`precision highp float; attribute vec2 position; attribute vec2 aLocal; attribute float aWeight; uniform vec2 uRes; varying vec2 vLocal; varying float vWeight;
void main() { vLocal = aLocal; vWeight = aWeight; vec2 clip = (position / uRes) * 2.0 - 1.0; gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0); }`,
  `precision highp float; varying vec2 vLocal; varying float vWeight; void main() { float d = length(vLocal); float a = exp(-d * d * 3.6) * vWeight; gl_FragColor = vec4(a, a, a, a); }`);
  const compP = link(`attribute vec2 position; varying vec2 vUv; void main() { vUv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }`,
  `precision highp float; uniform sampler2D tField; uniform vec3 uColor; uniform vec3 uAccent; uniform float uMerge; uniform float uGlow; uniform float uOpacity; varying vec2 vUv;
void main() { float f = texture2D(tField, vUv).r; float edge = uMerge * 0.3; float core = smoothstep(uMerge - edge, uMerge + edge, f); float halo = smoothstep(uMerge * 0.12, uMerge, f);
  vec3 col = mix(uColor, uAccent, clamp(f / max(uMerge * 2.4, 0.001), 0.0, 1.0)); float alpha = (core + halo * uGlow * (1.0 - core)) * uOpacity; if (alpha <= 0.002) discard; gl_FragColor = vec4(min(col, vec3(0.97)), clamp(alpha, 0.0, 1.0)); }`);
  // Más chico y tenue que el original (size 10, opacity 1): a pantalla completa se fundía en manchas grandes.
  const P = { count: 11, size: 6.5, merge: 0.77, glow: 0.75, opacity: 0.72, spread: 100, separation: 0.15, speed: 2.5, wander: 0.25, trail: 0.75 };
  const MAX = 120, MAX_QUADS = 6000, HISTORY = 120;
  const positions = new Float32Array(MAX_QUADS * 8), locals = new Float32Array(MAX_QUADS * 8), weights = new Float32Array(MAX_QUADS * 4), index = new Uint16Array(MAX_QUADS * 6);
  for (let i = 0; i < MAX_QUADS; i++) { const v = i * 4; locals.set([-1, -1, 1, -1, 1, 1, -1, 1], v * 2); index.set([v, v + 1, v + 2, v, v + 2, v + 3], i * 6); }
  const posBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferData(gl.ARRAY_BUFFER, positions.byteLength, gl.DYNAMIC_DRAW);
  const locBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, locBuf); gl.bufferData(gl.ARRAY_BUFFER, locals, gl.STATIC_DRAW);
  const wBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, wBuf); gl.bufferData(gl.ARRAY_BUFFER, weights.byteLength, gl.DYNAMIC_DRAW);
  const idxBuf = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index, gl.STATIC_DRAW);
  const triBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, triBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const fa = { pos: gl.getAttribLocation(fieldP, 'position'), loc: gl.getAttribLocation(fieldP, 'aLocal'), w: gl.getAttribLocation(fieldP, 'aWeight') }, ca = gl.getAttribLocation(compP, 'position');
  const fu = n => gl.getUniformLocation(fieldP, n), cu = n => gl.getUniformLocation(compP, n);
  let fbo = null, tex = null, cssW = 1, cssH = 1, dpr = 1;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5); cssW = innerWidth; cssH = innerHeight;
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
    if (tex) gl.deleteTexture(tex); if (fbo) gl.deleteFramebuffer(fbo);
    tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };
  resize(); window.addEventListener('resize', resize);
  // Física del original: órbita con ruido, separación, estela por historial.
  const perm = (() => { const s = new Uint8Array(256); for (let i = 0; i < 256; i++) s[i] = i; for (let i = 255; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [s[i], s[j]] = [s[j], s[i]]; } const p = new Uint16Array(512); for (let i = 0; i < 512; i++) p[i] = s[i & 255]; return p; })();
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10), grad = (h, x, y, z) => { const u = h < 8 ? x : y, v = h < 4 ? y : h === 12 || h === 14 ? x : z; return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v); };
  const noise3 = (x, y, z) => { const fx = Math.floor(x), fy = Math.floor(y), fz = Math.floor(z), X = fx & 255, Y = fy & 255, Z = fz & 255, rx = x - fx, ry = y - fy, rz = z - fz, u = fade(rx), v = fade(ry), w = fade(rz);
    const A = perm[X] + Y, AA = perm[A & 511] + Z, AB = perm[(A + 1) & 511] + Z, B = perm[(X + 1) & 511] + Y, BA = perm[B & 511] + Z, BB = perm[(B + 1) & 511] + Z;
    const x00 = grad(perm[AA & 511] & 15, rx, ry, rz) + u * (grad(perm[BA & 511] & 15, rx - 1, ry, rz) - grad(perm[AA & 511] & 15, rx, ry, rz));
    const x10 = grad(perm[AB & 511] & 15, rx, ry - 1, rz) + u * (grad(perm[BB & 511] & 15, rx - 1, ry - 1, rz) - grad(perm[AB & 511] & 15, rx, ry - 1, rz));
    const x01 = grad(perm[(AA + 1) & 511] & 15, rx, ry, rz - 1) + u * (grad(perm[(BA + 1) & 511] & 15, rx - 1, ry, rz - 1) - grad(perm[(AA + 1) & 511] & 15, rx, ry, rz - 1));
    const x11 = grad(perm[(AB + 1) & 511] & 15, rx, ry - 1, rz - 1) + u * (grad(perm[(BB + 1) & 511] & 15, rx - 1, ry - 1, rz - 1) - grad(perm[(AB + 1) & 511] & 15, rx, ry - 1, rz - 1));
    const y0 = x00 + v * (x10 - x00), y1 = x01 + v * (x11 - x01); return y0 + w * (y1 - y0); };
  const px = new Float32Array(MAX), py = new Float32Array(MAX), vx = new Float32Array(MAX), vy = new Float32Array(MAX), scale = new Float32Array(MAX), agility = new Float32Array(MAX), handed = new Float32Array(MAX), noiseX = new Float32Array(MAX), noiseY = new Float32Array(MAX);
  const histX = new Float32Array(HISTORY * MAX), histY = new Float32Array(HISTORY * MAX), histT = new Float32Array(HISTORY);
  let histHead = 0, histLen = 0, lastSample = -1, burst = 0, lastMove = 0, last = performance.now(), raf = 0, enabled = false;
  const spawn = (i, ox, oy) => { const a = Math.random() * Math.PI * 2, r = 40 + Math.random() * 120; px[i] = ox + Math.cos(a) * r; py[i] = oy + Math.sin(a) * r; vx[i] = Math.cos(a) * 60; vy[i] = Math.sin(a) * 60; for (let h = 0; h < HISTORY; h++) { histX[h * MAX + i] = px[i]; histY[h * MAX + i] = py[i]; } };
  for (let i = 0; i < MAX; i++) { spawn(i, cssW * 0.5, cssH * 0.5); scale[i] = 0.65 + Math.random() * 0.6; agility[i] = 0.75 + Math.random() * 0.5; handed[i] = Math.random() < 0.5 ? -1 : 1; noiseX[i] = Math.random() * 260; noiseY[i] = Math.random() * 260; }
  const cursor = { x: cssW * 0.5, y: cssH * 0.5 };
  window.addEventListener('pointermove', e => { cursor.x = e.clientX; cursor.y = e.clientY; lastMove = performance.now(); }, { passive: true });
  window.addEventListener('pointerdown', e => {
    if (!enabled) return; cursor.x = e.clientX; cursor.y = e.clientY; lastMove = performance.now();
    const escape = 620 + P.speed * 130;
    for (let i = 0; i < MAX; i++) { let dx = px[i] - e.clientX, dy = py[i] - e.clientY, d = Math.hypot(dx, dy); if (d < 1e-3) { const a = Math.random() * Math.PI * 2; dx = Math.cos(a); dy = Math.sin(a); d = 1; } const kick = escape * (0.75 + Math.random() * 0.5); vx[i] = (dx / d) * kick; vy[i] = (dy / d) * kick; }
    burst = 1;
  }, { passive: true });
  const frame = now => {
    raf = enabled && !document.hidden ? requestAnimationFrame(frame) : 0;
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    const n = P.count, t = now * 0.001;
    // Sin puntero reciente, el cardumen deriva por la pantalla en vez de quedarse al centro.
    const idle = now - lastMove > 4000;
    const anchorX = idle ? cssW * (0.5 + 0.34 * Math.sin(t * 0.13)) : cursor.x, anchorY = idle ? cssH * (0.5 + 0.3 * Math.sin(t * 0.17 + 1)) : cursor.y;
    burst = Math.max(0, burst - dt / 0.5);
    const maxSpeed = 110 + P.speed * 165, steerRate = 4.5 + P.speed * 1.15, maxForce = maxSpeed * 9, band = Math.max(20, P.spread * 0.55), sepDist = Math.max(1, P.spread * 0.42 * (0.35 + P.separation)), flowMix = P.wander * 2.4, eps = 0.08, baseScale = 0.0016, fineScale = baseScale * 3.6;
    for (let i = 0; i < n; i++) {
      const dx = anchorX - px[i], dy = anchorY - py[i], dist = Math.hypot(dx, dy) || 1e-4, ux = dx / dist, uy = dy / dist;
      const orbit = band * (0.34 + 1.35 * clamp(noise3(noiseX[i], noiseY[i], t * 0.13) + 0.5, 0, 1));
      const radial = clamp((dist - orbit) / (band * 0.85), -1, 1), swirl = Math.sqrt(Math.max(0, 1 - radial * radial)) * handed[i];
      let wishX = ux * radial - uy * swirl, wishY = uy * radial + ux * swirl;
      const bx = px[i] * baseScale, by = py[i] * baseScale, bt = t * 0.22;
      const coarseX = (noise3(bx, by + eps, bt) - noise3(bx, by - eps, bt)) / (2 * eps), coarseY = -(noise3(bx + eps, by, bt) - noise3(bx - eps, by, bt)) / (2 * eps);
      const fx = px[i] * fineScale + noiseX[i], fy = py[i] * fineScale + noiseY[i], ft = t * 0.55;
      const fineX = (noise3(fx, fy + eps, ft) - noise3(fx, fy - eps, ft)) / (2 * eps), fineY = -(noise3(fx + eps, fy, ft) - noise3(fx - eps, fy, ft)) / (2 * eps);
      wishX += (coarseX + fineX * 0.7) * flowMix; wishY += (coarseY + fineY * 0.7) * flowMix;
      const wl = Math.hypot(wishX, wishY) || 1e-4; wishX /= wl; wishY /= wl;
      const rate = steerRate * agility[i] * (1 - burst);
      let ax = (wishX * maxSpeed - vx[i]) * rate, ay = (wishY * maxSpeed - vy[i]) * rate;
      if (burst > 0.001) { ax -= ux * maxSpeed * burst * 5.5; ay -= uy * maxSpeed * burst * 5.5; }
      for (let j = 0; j < n; j++) { if (j === i) continue; const sx = px[i] - px[j], sy = py[i] - py[j], d2 = sx * sx + sy * sy; if (d2 > 1e-4 && d2 < sepDist * sepDist) { const d = Math.sqrt(d2), f = (1 - d / sepDist) * maxSpeed * 3.2 * P.separation; ax += (sx / d) * f; ay += (sy / d) * f; } }
      const al = Math.hypot(ax, ay), cap = maxForce * (1 + burst * 4); if (al > cap) { ax = (ax / al) * cap; ay = (ay / al) * cap; }
      vx[i] += ax * dt; vy[i] += ay * dt;
      const sp = Math.hypot(vx[i], vy[i]), hi = maxSpeed * (1 + burst * 3.5), lo = maxSpeed * 0.32;
      if (sp > hi) { vx[i] = (vx[i] / sp) * hi; vy[i] = (vy[i] / sp) * hi; } else if (sp < lo && sp > 1e-4) { vx[i] = (vx[i] / sp) * lo; vy[i] = (vy[i] / sp) * lo; }
      px[i] += vx[i] * dt; py[i] += vy[i] * dt;
    }
    if (lastSample < 0 || t - lastSample >= 0.008) { lastSample = t; histT[histHead] = t; const base = histHead * MAX; for (let i = 0; i < n; i++) { histX[base + i] = px[i]; histY[base + i] = py[i]; } histHead = (histHead + 1) % HISTORY; if (histLen < HISTORY) histLen++; }
    const trailAge = P.trail * 0.85, perAgent = Math.max(0, Math.floor(MAX_QUADS / n) - 1), maxStamps = Math.min(46, perAgent);
    let quad = 0;
    const push = (cx, cy, r, w) => { const v = quad * 8; positions[v] = cx - r; positions[v + 1] = cy - r; positions[v + 2] = cx + r; positions[v + 3] = cy - r; positions[v + 4] = cx + r; positions[v + 5] = cy + r; positions[v + 6] = cx - r; positions[v + 7] = cy + r; const o = quad * 4; weights[o] = weights[o + 1] = weights[o + 2] = weights[o + 3] = w; quad++; };
    for (let i = 0; i < n; i++) {
      const headR = P.size * scale[i] * 2.1, headW = 1.06 + 0.3 * scale[i]; push(px[i], py[i], headR, headW);
      if (histLen < 2) continue;
      const step = Math.max(2, P.size * scale[i] * 0.5), span = step * maxStamps; let prevX = px[i], prevY = py[i], walked = 0, nextAt = step, stamps = 0;
      for (let j = 0; j < histLen && stamps < maxStamps; j++) {
        const slot = (histHead - 1 - j + HISTORY) % HISTORY; if (t - histT[slot] > trailAge) break;
        const hx = histX[slot * MAX + i], hy = histY[slot * MAX + i], segX = hx - prevX, segY = hy - prevY, segLen = Math.hypot(segX, segY); if (segLen < 1e-4) continue;
        while (nextAt <= walked + segLen && stamps < maxStamps) { const f = (nextAt - walked) / segLen, uu = nextAt / span, taper = Math.pow(Math.max(0, 1 - uu), 0.55), rl = headR * taper; if (rl < step) { stamps = maxStamps; break; } push(prevX + segX * f, prevY + segY * f, rl, Math.min(headW, (headW * step) / (rl * 0.934))); stamps++; nextAt += step; }
        walked += segLen; prevX = hx; prevY = hy;
      }
    }
    // Pase 1: campo sumado en la textura.
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(fieldP); gl.uniform2f(fu('uRes'), cssW, cssH); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions.subarray(0, quad * 8)); gl.enableVertexAttribArray(fa.pos); gl.vertexAttribPointer(fa.pos, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, locBuf); gl.enableVertexAttribArray(fa.loc); gl.vertexAttribPointer(fa.loc, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, wBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, weights.subarray(0, quad * 4)); gl.enableVertexAttribArray(fa.w); gl.vertexAttribPointer(fa.w, 1, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf); gl.drawElements(gl.TRIANGLES, quad * 6, gl.UNSIGNED_SHORT, 0);
    gl.disableVertexAttribArray(fa.loc); gl.disableVertexAttribArray(fa.w);
    // Pase 2: umbral y color en pantalla.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(compP); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindBuffer(gl.ARRAY_BUFFER, triBuf); gl.enableVertexAttribArray(ca); gl.vertexAttribPointer(ca, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(cu('tField'), 0);
    gl.uniform3fv(cu('uColor'), rgb01('--biolum-cyan')); gl.uniform3fv(cu('uAccent'), rgb01('--biolum-violet'));
    gl.uniform1f(cu('uMerge'), P.merge); gl.uniform1f(cu('uGlow'), P.glow); gl.uniform1f(cu('uOpacity'), P.opacity);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden && enabled && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } });
  return {
    setEnabled(v) {
      enabled = v; canvas.style.visibility = v ? '' : 'hidden';
      if (v && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
      if (!v) { if (raf) cancelAnimationFrame(raf); raf = 0; gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
    },
  };
})();
export const syncCursors = () => { if (splash) splash.setEnabled(!isDark); if (swarm) swarm.setEnabled(isDark); };
export function mount() {
onTheme(syncCursors);
syncCursors();
}
