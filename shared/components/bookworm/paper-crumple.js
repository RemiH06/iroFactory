// ══════════════════════════════════════════════════════
// PAPER CRUMPLE (React Bits) · el original monta Three.js; aquí es
// WebGL crudo. La simulación de papel (createPaperPath: bisagras,
// aristas, compresión hacia una esfera, separación de capas) es la
// del original línea por línea, igual que la malla (cuadrícula con
// jitter, semilla 7, detail 64) y el cálculo de normales con bordes
// marcados. Cambios: (1) la textura no es una imagen cargada sino un
// dibujo aproximado de la ventana (su invernadero, la barra, las cajas
// y el texto del contenido), porque nada nativo convierte DOM vivo en
// textura; (2) iluminación propia (hemisférica + direccional y grano
// de papel) en vez de MeshStandardMaterial, con el mismo truco del
// original de mezclar sin luz → con luz conforme se arruga, para que
// el primer cuadro sea idéntico a la ventana; (3) sin sombra
// proyectada; (4) al terminar, la bola vuela a la papelera. La
// trayectoria se precalcula al abrir cada ventana (en reposo).
// ══════════════════════════════════════════════════════
import { $, clamp, cssVar, hexRgb } from './kit.js';

export const Paper = (() => {
  const randomSource = seed => { let value = seed | 0; return () => { value |= 0; value = (value + 0x6d2b79f5) | 0; let n = Math.imul(value ^ (value >>> 15), 1 | value); n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n; return ((n ^ (n >>> 14)) >>> 0) / 4294967296; }; };
  function advance(s, dt, duration, instant) {
    if (instant || duration <= 0) { s.value = s.target; s.velocity = 0; return false; }
    const omega = 8 / Math.max(0.06, duration), offset = s.value - s.target, term = s.velocity + omega * offset, decay = Math.exp(-omega * dt);
    s.value = s.target + (offset + term * dt) * decay; s.velocity = (s.velocity - omega * term * dt) * decay;
    if (Math.abs(s.value - s.target) < 0.0001 && Math.abs(s.velocity) < 0.001) { s.value = s.target; s.velocity = 0; return false; }
    return true;
  }
  function createPaperPath(rest, triangles, shortSide, density, sharpness, depth, seed) {
    const count = rest.length / 3, points = Float64Array.from(rest), previous = Float64Array.from(rest), before = Float64Array.from(rest);
    const edges = [], hinges = [], adjacency = new Map(), random = randomSource(seed);
    const guides = Array.from({ length: density }, () => { const angle = random() * Math.PI * 2; return { x: Math.cos(angle), y: Math.sin(angle), phase: random() * Math.PI * 2, weight: random() * 0.6 + 0.4 }; });
    for (let t = 0; t < triangles.length; t += 3) {
      for (let k = 0; k < 3; k++) {
        const a = triangles[t + k], b = triangles[t + ((k + 1) % 3)], opposite = triangles[t + ((k + 2) % 3)];
        const key = Math.min(a, b) * count + Math.max(a, b), other = adjacency.get(key);
        if (!other) {
          adjacency.set(key, { a, b, opposite });
          edges.push(a * 3, b * 3, Math.hypot(rest[a * 3] - rest[b * 3], rest[a * 3 + 1] - rest[b * 3 + 1]));
        } else {
          const c = other.opposite * 3, d = opposite * 3;
          const length = Math.hypot(rest[c] - rest[d], rest[c + 1] - rest[d + 1]);
          const mx = (rest[c] + rest[d]) * 0.5, my = (rest[c + 1] + rest[d + 1]) * 0.5;
          let weakness = 0;
          for (const guide of guides) { const distance = Math.abs(Math.sin(((mx * guide.x + my * guide.y) / shortSide) * 4 + guide.phase)); weakness = Math.max(weakness, Math.exp(-distance * distance * 80) * guide.weight); }
          hinges.push(c, d, length, 0.12 + (1 - weakness) * 0.75);
        }
      }
    }
    const spacing = Math.sqrt((shortSide * shortSide) / count), thickness = shortSide * 0.008;
    const samples = [rest.slice()], frameCount = 64, stepsPerFrame = 3, totalSteps = frameCount * stepsPerFrame;
    let initialRadius = 0;
    for (let i = 0; i < rest.length; i += 3) initialRadius = Math.max(initialRadius, Math.hypot(rest[i] / 0.94, rest[i + 1] / 1.02));
    initialRadius *= 1.02;
    function constrain(list, stride, stiffness, reverse) {
      for (let n = 0; n < list.length; n += stride) {
        const edge = reverse ? list.length - stride - n : n, a = list[edge], b = list[edge + 1];
        const dx = points[b] - points[a], dy = points[b + 1] - points[a + 1], dz = points[b + 2] - points[a + 2];
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (length < 0.000001) continue;
        const weight = stride === 4 ? list[edge + 3] : 1, amount = (1 - list[edge + 2] / length) * 0.5 * stiffness * weight;
        points[a] += dx * amount; points[b] -= dx * amount; points[a + 1] += dy * amount; points[b + 1] -= dy * amount; points[a + 2] += dz * amount; points[b + 2] -= dz * amount;
      }
    }
    function separateLayers() {
      const margin = thickness * 2;
      for (let t = 0; t < triangles.length; t += 3) {
        const a = triangles[t] * 3, b = triangles[t + 1] * 3, c = triangles[t + 2] * 3;
        const ax = points[a], ay = points[a + 1], az = points[a + 2];
        const bx = points[b] - ax, by = points[b + 1] - ay, bz = points[b + 2] - az;
        const cx = points[c] - ax, cy = points[c + 1] - ay, cz = points[c + 2] - az;
        let nx = by * cz - bz * cy, ny = bz * cx - bx * cz, nz = bx * cy - by * cx;
        const length = Math.hypot(nx, ny, nz);
        if (length < 0.0000001) continue;
        nx /= length; ny /= length; nz /= length;
        const minX = Math.min(ax, points[b], points[c]) - margin, maxX = Math.max(ax, points[b], points[c]) + margin;
        const minY = Math.min(ay, points[b + 1], points[c + 1]) - margin, maxY = Math.max(ay, points[b + 1], points[c + 1]) + margin;
        const minZ = Math.min(az, points[b + 2], points[c + 2]) - margin, maxZ = Math.max(az, points[b + 2], points[c + 2]) + margin;
        const bb = bx * bx + by * by + bz * bz, cc = cx * cx + cy * cy + cz * cz, bc = bx * cx + by * cy + bz * cz;
        const determinant = bb * cc - bc * bc;
        if (determinant < 0.0000000001) continue;
        for (let p = 0; p < points.length; p += 3) {
          if (p === a || p === b || p === c) continue;
          if (points[p] < minX || points[p] > maxX || points[p + 1] < minY || points[p + 1] > maxY || points[p + 2] < minZ || points[p + 2] > maxZ) continue;
          const rx = rest[p] - (rest[a] + rest[b] + rest[c]) / 3, ry = rest[p + 1] - (rest[a + 1] + rest[b + 1] + rest[c + 1]) / 3;
          if (rx * rx + ry * ry < spacing * spacing * 6) continue;
          const dx = points[p] - ax, dy = points[p + 1] - ay, dz = points[p + 2] - az;
          const distance = dx * nx + dy * ny + dz * nz;
          const previousDistance = (before[p] - before[a]) * nx + (before[p + 1] - before[a + 1]) * ny + (before[p + 2] - before[a + 2]) * nz;
          const side = previousDistance >= 0 ? 1 : -1;
          if (distance * side >= thickness || Math.abs(distance) > margin) continue;
          const pb = dx * bx + dy * by + dz * bz, pc = dx * cx + dy * cy + dz * cz;
          const u = (cc * pb - bc * pc) / determinant, v = (bb * pc - bc * pb) / determinant;
          if (u < 0 || v < 0 || u + v > 1) continue;
          const w = 1 - u - v, correction = (thickness * side - distance) / (1 + w * w + u * u + v * v);
          for (let axis = 0; axis < 3; axis++) {
            const movement = (axis === 0 ? nx : axis === 1 ? ny : nz) * correction;
            points[p + axis] += movement; points[a + axis] -= movement * w; points[b + axis] -= movement * u; points[c + axis] -= movement * v;
          }
        }
      }
    }
    for (let step = 1; step <= totalSteps; step++) {
      const progress = step / totalSteps, compression = progress * progress * (3 - 2 * progress);
      const radius = initialRadius * (1 - compression) + shortSide * (0.19 - depth * 0.025) * compression;
      before.set(points);
      for (let i = 0; i < points.length; i += 3) {
        const x = rest[i] / shortSide, y = rest[i + 1] / shortSide;
        let buckle = 0;
        for (const guide of guides) buckle += Math.sin((x * guide.x + y * guide.y) * 5 + guide.phase) * guide.weight;
        for (let axis = 0; axis < 3; axis++) {
          const velocity = (points[i + axis] - previous[i + axis]) * 0.55;
          previous[i + axis] = points[i + axis];
          points[i + axis] += clamp(velocity, -spacing * 0.15, spacing * 0.15);
        }
        points[i + 2] += (buckle / density) * shortSide * 0.0007 * Math.sin(progress * Math.PI);
      }
      for (let pass = 0; pass < 18; pass++) {
        constrain(hinges, 4, 0.45 * (1 - sharpness * 0.4), pass % 2 === 0);
        for (let i = 0; i < points.length; i += 3) {
          const x = points[i] / 0.94, y = points[i + 1] / 1.02, z = points[i + 2] / 0.86, distance = Math.hypot(x, y, z);
          if (distance > radius) { const push = (1 - radius / distance) * 0.55; points[i] -= points[i] * push; points[i + 1] -= points[i + 1] * push; points[i + 2] -= points[i + 2] * push; }
        }
        constrain(edges, 3, 1, pass % 2 !== 0);
        if (pass === 8 || pass === 17) separateLayers();
      }
      for (let h = 0; h < hinges.length; h += 4) {
        const a = hinges[h], b = hinges[h + 1];
        const length = Math.hypot(points[a] - points[b], points[a + 1] - points[b + 1], points[a + 2] - points[b + 2]);
        if (length < hinges[h + 2] * 0.86) hinges[h + 2] += (length - hinges[h + 2]) * 0.12;
      }
      if (step % stepsPerFrame === 0) samples.push(Float32Array.from(points));
    }
    return { samples };
  }
  // Malla del original: detail 64 → resolución 16, jitter interior, diagonal al azar.
  function buildMesh(aspect) {
    const rng = randomSource(7), resolution = 16, shortSide = Math.min(1, aspect);
    const columns = Math.max(8, Math.round(resolution / Math.max(1, aspect))), rows = Math.max(8, Math.round(resolution * Math.min(1, aspect)));
    const count = (columns + 1) * (rows + 1), original = new Float32Array(count * 3), uvs = new Float32Array(count * 2), indices = [];
    for (let row = 0; row <= rows; row++) for (let col = 0; col <= columns; col++) {
      const index = row * (columns + 1) + col;
      const u = (col + (col > 0 && col < columns ? (rng() - 0.5) * 0.5 : 0)) / columns, v = (row + (row > 0 && row < rows ? (rng() - 0.5) * 0.5 : 0)) / rows;
      original[index * 3] = u - 0.5; original[index * 3 + 1] = (v - 0.5) * aspect; uvs[index * 2] = u; uvs[index * 2 + 1] = v;
      if (col < columns && row < rows) { const a = index, b = index + 1, c = index + columns + 1, d = c + 1; if (rng() > 0.5) indices.push(a, b, d, a, d, c); else indices.push(a, b, c, b, d, c); }
    }
    const path = createPaperPath(original, indices, shortSide, 6, 0.6, 0.65, 7);
    const incident = Array.from({ length: count }, () => []);
    for (let i = 0; i < indices.length; i++) incident[indices[i]].push(Math.floor(i / 3) * 3);
    const rUv = new Float32Array(indices.length * 2);
    for (let i = 0; i < indices.length; i++) { rUv[i * 2] = uvs[indices[i] * 2]; rUv[i * 2 + 1] = uvs[indices[i] * 2 + 1]; }
    return { aspect, shortSide, count, indices, incident, path, rUv, positions: new Float32Array(count * 3), faceN: new Float32Array(indices.length), rPos: new Float32Array(indices.length * 3), rNor: new Float32Array(indices.length * 3) };
  }
  // La trayectoria (~0.15s en hardware real, casi 1s en render por
  // software) se calcula en un Web Worker hecho del mismo código, al
  // abrir cada ventana: así descartarla nunca traba la página. Antes era
  // requestIdleCallback, que nunca encontraba tiempo libre con el loop
  // del invernadero corriendo. Sin Worker, cálculo directo.
  const cache = new Map(), waiting = new Map();
  const keyOf = a => Math.round(clamp(a, 0.3, 2) * 10) / 10;
  let worker = null;
  try {
    const src = `const clamp=${clamp.toString()};const randomSource=${randomSource.toString()};${createPaperPath.toString()};${buildMesh.toString()};onmessage=e=>postMessage({k:e.data,m:buildMesh(e.data)});`;
    worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    worker.onmessage = e => { cache.set(e.data.k, e.data.m); (waiting.get(e.data.k) || []).forEach(f => f()); waiting.delete(e.data.k); };
    // Si el Worker falla, lo pendiente se calcula aquí y nadie se queda esperando.
    worker.onerror = () => { worker = null; waiting.forEach((fns, k) => { meshFor(k); fns.forEach(f => f()); }); waiting.clear(); };
  } catch (err) { worker = null; }
  function meshFor(aspect) { const k = keyOf(aspect); if (!cache.has(k)) cache.set(k, buildMesh(k)); return cache.get(k); }
  function prewarm(aspect) {
    const k = keyOf(aspect); if (cache.has(k) || waiting.has(k)) return;
    if (worker) { waiting.set(k, []); worker.postMessage(k); } else setTimeout(() => meshFor(k), 400);
  }
  // Si se descarta antes de que el Worker termine, se espera a lo más
  // 300ms y luego se calcula aquí mismo (equipos lentos o CPU ocupada).
  function whenReady(aspect, cb) {
    const k = keyOf(aspect);
    if (cache.has(k)) { cb(); return; }
    let done = false; const go = () => { if (!done) { done = true; cb(); } };
    if (waiting.has(k)) { waiting.get(k).push(go); setTimeout(() => { if (!done) { meshFor(k); go(); } }, 300); }
    else { meshFor(k); go(); }
  }
  function deform(m, fold) {
    const S = m.path.samples, f = clamp(fold, 0, 1) * (S.length - 1), lo = Math.floor(f), hi = Math.min(lo + 1, S.length - 1), mix = f - lo;
    const from = S[lo], to = S[hi], P = m.positions;
    for (let i = 0; i < P.length; i++) P[i] = from[i] + (to[i] - from[i]) * mix;
    const I = m.indices, FN = m.faceN;
    for (let face = 0; face < I.length; face += 3) {
      const a = I[face] * 3, b = I[face + 1] * 3, c = I[face + 2] * 3;
      const bx = P[b] - P[a], by = P[b + 1] - P[a + 1], bz = P[b + 2] - P[a + 2], cx = P[c] - P[a], cy = P[c + 1] - P[a + 1], cz = P[c + 2] - P[a + 2];
      const nx = by * cz - bz * cy, ny = bz * cx - bx * cz, nz = bx * cy - by * cx, l = Math.hypot(nx, ny, nz) || 1;
      FN[face] = nx / l; FN[face + 1] = ny / l; FN[face + 2] = nz / l;
    }
    const lo2 = 0.88 - (1 - 0.6) * 0.18, ss = x => { const t = clamp((x - lo2) / (0.98 - lo2), 0, 1); return t * t * (3 - 2 * t); };
    for (let i = 0; i < I.length; i++) {
      const src = I[i] * 3, face = Math.floor(i / 3) * 3;
      let nx = 0, ny = 0, nz = 0;
      for (const nb of m.incident[I[i]]) { const w = ss(FN[face] * FN[nb] + FN[face + 1] * FN[nb + 1] + FN[face + 2] * FN[nb + 2]); nx += FN[nb] * w; ny += FN[nb + 1] * w; nz += FN[nb + 2] * w; }
      const l = Math.hypot(nx, ny, nz) || 1;
      m.rPos[i * 3] = P[src]; m.rPos[i * 3 + 1] = P[src + 1]; m.rPos[i * 3 + 2] = P[src + 2];
      m.rNor[i * 3] = nx / l; m.rNor[i * 3 + 1] = ny / l; m.rNor[i * 3 + 2] = nz / l;
    }
  }

  let gl = null, cv = null, prog, U, A, bPos, bNor, bUv, tex, grain, failed = false;
  function init() {
    if (gl || failed) return !!gl;
    cv = $('#bw-crumple');
    gl = cv.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true });
    if (!gl) { failed = true; return false; }
    const vs = `attribute vec3 aPos; attribute vec3 aNor; attribute vec2 aUv;
uniform mat4 uMVP; uniform mat3 uRot; varying vec3 vN; varying vec2 vUv;
void main(){ vN = uRot * aNor; vUv = aUv; gl_Position = uMVP * vec4(aPos, 1.0); }`;
    const fs = `precision mediump float;
uniform sampler2D uTex; uniform sampler2D uGrain; uniform vec3 uPaper; uniform float uLighting; uniform vec3 uLight; uniform vec2 uRep; uniform float uAlpha;
varying vec3 vN; varying vec2 vUv;
void main(){
  vec3 base = gl_FrontFacing ? texture2D(uTex, vUv).rgb : uPaper;
  vec3 n = normalize(gl_FrontFacing ? vN : -vN);
  float g = texture2D(uGrain, vUv * uRep).r;
  float hemi = mix(0.64, 1.0, n.y * 0.5 + 0.5);
  float diff = max(dot(n, uLight), 0.0);
  vec3 lit = base * (0.42 * hemi + 0.58 * diff) * 1.15 * (0.95 + (g - 0.7) * 0.18);
  gl_FragColor = vec4(mix(base, lit, uLighting) * uAlpha, uAlpha);
}`;
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
    prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { gl = null; failed = true; return false; }
    gl.useProgram(prog);
    U = {}; ['uMVP', 'uRot', 'uTex', 'uGrain', 'uPaper', 'uLighting', 'uLight', 'uRep', 'uAlpha'].forEach(n => U[n] = gl.getUniformLocation(prog, n));
    A = { pos: gl.getAttribLocation(prog, 'aPos'), nor: gl.getAttribLocation(prog, 'aNor'), uv: gl.getAttribLocation(prog, 'aUv') };
    bPos = gl.createBuffer(); bNor = gl.createBuffer(); bUv = gl.createBuffer();
    const mkTex = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); return t; };
    tex = mkTex(); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    grain = mkTex();
    const rng = randomSource(7), gd = new Uint8Array(128 * 128 * 4);
    for (let i = 0; i < gd.length; i += 4) { gd[i] = gd[i + 1] = gd[i + 2] = 100 + Math.floor(rng() * 155); gd[i + 3] = 255; }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 128, 128, 0, gl.RGBA, gl.UNSIGNED_BYTE, gd);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    return true;
  }
  // Matrices (columna mayor, como espera WebGL).
  const mul = (a, b) => { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; };
  const persp = (fov, asp, n, f) => { const t = 1 / Math.tan(fov / 2); return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, (2 * f * n) / (n - f), 0]); };
  const rotXY = (ax, ay) => { const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay); return [cy, sx * sy, -cx * sy, 0, cx, sx, sy, -sx * cy, cx * cy]; };

  // Reproduce el arrugado de `snapshot` (canvas) colocado en `rect` y lo lleva a `target`.
  function play({ snapshot, rect, target, onDone }) {
    if (!init()) return false;
    const [W, H] = [window.innerWidth, window.innerHeight], dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.display = 'block';
    gl.viewport(0, 0, cv.width, cv.height);
    const aspect = rect.height / rect.width, m = meshFor(aspect), squash = aspect / m.aspect;
    gl.bindTexture(gl.TEXTURE_2D, tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, snapshot);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.bindBuffer(gl.ARRAY_BUFFER, bUv); gl.bufferData(gl.ARRAY_BUFFER, m.rUv, gl.STATIC_DRAW);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(U.uTex, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, grain); gl.uniform1i(U.uGrain, 1);
    gl.uniform2f(U.uRep, 5, 5 * aspect);
    const paper = hexRgb(cssVar('--white')).map(v => v / 255); gl.uniform3f(U.uPaper, paper[0], paper[1], paper[2]);
    const L = [-0.57 * 0.24, 0.82 * 0.24, 0.97], ll = Math.hypot(...L); gl.uniform3f(U.uLight, L[0] / ll, L[1] / ll, L[2] / ll);
    const fov = 35 * Math.PI / 180, dist = H / (2 * Math.tan(fov / 2)), P = persp(fov, W / H, 1, dist * 4);
    const start = { x: rect.left + rect.width / 2 - W / 2, y: H / 2 - (rect.top + rect.height / 2) }, end = { x: target.x - W / 2, y: H / 2 - target.y };
    const s0 = rect.width, sEnd = 22 / (0.174 * m.shortSide);
    const amount = { value: 0, target: 1, velocity: 0 }, tiltX = (Math.random() - .5) * .5, tiltY = (Math.random() - .5) * .5, rot = (Math.random() - .5) * .6;
    let t0 = 0, last = 0;
    const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    // Tiempo propio con performance.now(): el sello del primer rAF puede
    // ser anterior al trabajo que bloqueó el hilo justo antes (malla nueva,
    // dibujo de la ventana) y la animación creía haber terminado de golpe.
    function frame() {
      const now = performance.now();
      if (!t0) t0 = last = now;
      const dt = Math.min(.04, (now - last) / 1000); last = now;
      const el = (now - t0) / 1000;
      advance(amount, dt, .55, false);
      deform(m, amount.value);
      const fly = clamp((el - .38) / .52, 0, 1), k = ease(fly);
      const px = start.x + (end.x - start.x) * k, py = start.y + (end.y - start.y) * k + Math.sin(Math.PI * k) * 70;
      const sc = s0 * Math.pow(sEnd / s0, k), alpha = el > .9 ? clamp(1 - (el - .9) / .12, 0, 1) : 1;
      const ax = tiltX * amount.value, ay = tiltY * amount.value, az = rot * amount.value;
      const R = rotXY(ax, ay), cz = Math.cos(az), sz = Math.sin(az);
      const Rz = [cz * R[0] - sz * R[3], cz * R[1] - sz * R[4], cz * R[2] - sz * R[5], sz * R[0] + cz * R[3], sz * R[1] + cz * R[4], sz * R[2] + cz * R[5], R[6], R[7], R[8]];
      const M = new Float32Array([Rz[0] * sc, Rz[1] * sc, Rz[2] * sc, 0, Rz[3] * sc * squash, Rz[4] * sc * squash, Rz[5] * sc * squash, 0, Rz[6] * sc, Rz[7] * sc, Rz[8] * sc, 0, px, py, 0, 1]);
      const V = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -dist, 1]);
      gl.uniformMatrix4fv(U.uMVP, false, mul(P, mul(V, M)));
      gl.uniformMatrix3fv(U.uRot, false, new Float32Array(Rz));
      const fold = clamp(amount.value, 0, 1); gl.uniform1f(U.uLighting, (t => t * t * (3 - 2 * t))(clamp(fold / .4, 0, 1)));
      gl.uniform1f(U.uAlpha, alpha);
      gl.bindBuffer(gl.ARRAY_BUFFER, bPos); gl.bufferData(gl.ARRAY_BUFFER, m.rPos, gl.DYNAMIC_DRAW); gl.enableVertexAttribArray(A.pos); gl.vertexAttribPointer(A.pos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, bNor); gl.bufferData(gl.ARRAY_BUFFER, m.rNor, gl.DYNAMIC_DRAW); gl.enableVertexAttribArray(A.nor); gl.vertexAttribPointer(A.nor, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, bUv); gl.enableVertexAttribArray(A.uv); gl.vertexAttribPointer(A.uv, 2, gl.FLOAT, false, 0, 0);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, m.indices.length);
      if (el < 1.02) requestAnimationFrame(frame);
      else { gl.clear(gl.COLOR_BUFFER_BIT); cv.style.display = 'none'; onDone && onDone(); }
    }
    requestAnimationFrame(frame);
    return true;
  }
  return { prewarm, play, meshFor, whenReady };
})();
