// ══════════════════════════════════════════════════════
// Graficador · vidrio como el de la hélice (riff de Figma de @brettmcm) que
// dibuja de verdad la curva r(t) que se escriba (en el colofón; en cada
// capítulo va una curva fija y tenue): se muestrea, se gira en 3D y cada
// tramo es una franja con brillo gaussiano. Al ser aditivo, donde la curva
// corre hacia el lector se acumula la luz, como el borde del vidrio. La
// dispersión son dos pasadas más (rojo un poco por fuera, azul por dentro).
// Con dos curvas se dibuja la escalera entre ellas: así sale el ADN.
// ══════════════════════════════════════════════════════
import { $, clamp, isLight, makeLoop, onTheme, reduceMotion, rgb01 } from './kit.js';

export const CURVES = [
  { id: 'adn', name: 'ADN', r: '(cos t, sin t, 0.45t) ; (cos(t + 2.2), sin(t + 2.2), 0.45t)', t: '[0, 4π]' },
  { id: 'helice', name: 'hélice', r: '(cos t, sin t, t/4)', t: '[0, 8π]' },
  { id: 'trebol', name: 'trébol', r: '(sin t + 2 sin 2t, cos t − 2 cos 2t, −sin 3t)', t: '[0, 2π]' },
  { id: 'toro', name: 'nudo tórico', r: '((2 + cos 5t) cos 2t, (2 + cos 5t) sin 2t, sin 5t)', t: '[0, 2π]' },
  { id: 'cono', name: 'resorte cónico', r: '(t cos 8t, t sin 8t, 1.4t)', t: '[0, 3]' },
  { id: 'lissajous', name: 'Lissajous', r: '(sin 2t, sin 3t, cos 5t)', t: '[0, 2π]' },
];
// Expresiones sin eval: descenso recursivo con multiplicación implícita
// (2t, sin 3t, t cos 8t), potencias, funciones y constantes.
export const MathParse = (() => {
  const FN = { sin: Math.sin, sen: Math.sin, cos: Math.cos, tan: Math.tan, tg: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, exp: Math.exp, log: Math.log, ln: Math.log, sqrt: Math.sqrt, abs: Math.abs, floor: Math.floor, sign: Math.sign };
  const K = { pi: Math.PI, e: Math.E, tau: Math.PI * 2 };
  const lex = s => {
    const out = []; let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) { let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++; const v = parseFloat(s.slice(i, j)); if (Number.isNaN(v)) throw new Error(`no entiendo «${s.slice(i, j)}»`); out.push({ k: 'n', v }); i = j; continue; }
      if (c === 'π') { out.push({ k: 'id', v: 'pi' }); i++; continue; }
      if (c === 'τ') { out.push({ k: 'id', v: 'tau' }); i++; continue; }
      if (/[a-zA-Z_]/.test(c)) { let j = i; while (j < s.length && /[a-zA-Z_]/.test(s[j])) j++; out.push({ k: 'id', v: s.slice(i, j).toLowerCase() }); i = j; continue; }
      if (c === '·' || c === '×') { out.push({ k: 'op', v: '*' }); i++; continue; }
      if (c === '−' || c === '–') { out.push({ k: 'op', v: '-' }); i++; continue; }
      if ('+-*/^()'.includes(c)) { out.push({ k: 'op', v: c }); i++; continue; }
      throw new Error(`no entiendo «${c}»`);
    }
    return out;
  };
  const compile = src => {
    const T = lex(src); let p = 0;
    if (!T.length) throw new Error('falta una expresión');
    const peek = () => T[p];
    const isFn = t => t && t.k === 'id' && t.v in FN;
    const starts = t => t && (t.k === 'n' || t.k === 'id' || t.v === '(');
    const expr = () => { let a = term(); while (peek() && (peek().v === '+' || peek().v === '-')) { const o = T[p++].v, b = term(), x = a; a = o === '+' ? q => x(q) + b(q) : q => x(q) - b(q); } return a; };
    const term = () => { let a = unary(); for (;;) { const t = peek(); if (t && (t.v === '*' || t.v === '/')) { p++; const b = unary(), x = a; a = t.v === '*' ? q => x(q) * b(q) : q => x(q) / b(q); } else if (starts(t)) { const b = power(), x = a; a = q => x(q) * b(q); } else break; } return a; };
    const unary = () => { const t = peek(); if (t && t.v === '-') { p++; const a = unary(); return q => -a(q); } if (t && t.v === '+') { p++; return unary(); } return power(); };
    const power = () => { const b = primary(); if (peek() && peek().v === '^') { p++; const e = unary(); return q => Math.pow(b(q), e(q)); } return b; };
    // Argumento sin paréntesis: «sin 2t» es sin(2t); se corta en la siguiente función.
    const fnArg = () => { let a = power(); while (peek() && (peek().k === 'n' || (peek().k === 'id' && !isFn(peek())))) { const b = power(), x = a; a = q => x(q) * b(q); } return a; };
    const primary = () => {
      const t = T[p++]; if (!t) throw new Error('la expresión quedó incompleta');
      if (t.k === 'n') { const v = t.v; return () => v; }
      if (t.v === '(') { const a = expr(); if (!peek() || peek().v !== ')') throw new Error('falta cerrar un paréntesis'); p++; return a; }
      if (t.k === 'id') {
        if (t.v === 't') return q => q;
        if (t.v in K) { const v = K[t.v]; return () => v; }
        if (t.v in FN) { const f = FN[t.v]; let arg; if (peek() && peek().v === '(') { p++; arg = expr(); if (!peek() || peek().v !== ')') throw new Error('falta cerrar un paréntesis'); p++; } else arg = fnArg(); return q => f(arg(q)); }
        throw new Error(`no conozco «${t.v}»`);
      }
      throw new Error(`sobra «${t.v}»`);
    };
    const f = expr(); if (p < T.length) throw new Error(`sobra «${T[p].v}»`);
    return f;
  };
  const splitTop = (s, sep) => { const out = []; let d = 0, cur = ''; for (const c of s) { if (c === '(' || c === '[') d++; if (c === ')' || c === ']') d--; if (c === sep && d === 0) { out.push(cur); cur = ''; } else cur += c; } out.push(cur); return out; };
  const strip = (s, a, b) => { s = s.trim(); return s[0] === a && s[s.length - 1] === b ? s.slice(1, -1) : s; };
  const balanced = s => { let d = 0; for (const c of s) { if (c === '(' || c === '[') d++; if (c === ')' || c === ']') d--; if (d < 0) return false; } return d === 0; };
  const curves = src => { if (!balanced(src)) throw new Error('falta cerrar un paréntesis'); return splitTop(src, ';').filter(c => c.trim()).map(c => {
    const parts = splitTop(strip(c, '(', ')'), ',');
    if (parts.length < 2 || parts.length > 3) throw new Error('cada curva lleva 2 o 3 componentes: (x, y, z)');
    const fs = parts.map(compile); if (fs.length === 2) fs.splice(1, 0, () => 0);
    return fs;
  }); };
  const range = src => { const parts = splitTop(strip(strip(src, '[', ']'), '(', ')'), ','); if (parts.length !== 2) throw new Error('el rango va como [a, b]'); const [a, b] = parts.map(s => compile(s)(0)); if (!(b > a)) throw new Error('el rango debe crecer: [a, b] con b > a'); return [a, b]; };
  return { curves, range };
})();
export function makePlotter(canvas, opts = {}) {
  if (!canvas) return;
  const gain = opts.subtle ? 0.62 : 1, spin = opts.subtle ? 0.22 : 0.4, phase = opts.phase || 0;
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true });
  if (!gl) return;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(o)); return null; } return o; };
  const vs = sh(gl.VERTEX_SHADER, `attribute vec2 aPos; attribute vec3 aUVI; attribute vec3 aCol;
uniform vec2 uRes; uniform vec2 uCenter; uniform float uScale;
varying vec2 vUV; varying float vI; varying vec3 vCol;
void main() { vec2 p = uCenter + (aPos - uCenter) * uScale; vUV = aUVI.xy; vI = aUVI.z; vCol = aCol; gl_Position = vec4(p / uRes * 2.0 - 1.0, 0.0, 1.0) * vec4(1.0, -1.0, 1.0, 1.0); }`);
  const fs = sh(gl.FRAGMENT_SHADER, `precision mediump float;
varying vec2 vUV; varying float vI; varying vec3 vCol;
uniform vec3 uCore; uniform vec3 uTint; uniform float uMode; uniform float uLight;
void main() {
  float r2 = dot(vUV, vUV); if (r2 > 1.0) discard; float glow = exp(-r2 * 3.2) - 0.04, core = exp(-r2 * 26.0);
  if (uLight > 0.5) { vec3 ink = mix(vCol, uCore, core * 0.45); float a = clamp((glow * 0.62 + core * 0.4) * vI, 0.0, 0.95); gl_FragColor = vec4(ink * a, a); return; }
  if (uMode < 0.5) { vec3 c = (vCol * (glow * 0.42 + core * 0.55) + uCore * core * core * 0.55) * vI; gl_FragColor = vec4(c, clamp(glow * 0.5 * vI, 0.0, 1.0)); }
  else { gl_FragColor = vec4(uTint * glow * 0.32 * vI, 0.0); }
}`);
  if (!vs || !fs) return;
  const prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  const U = n => gl.getUniformLocation(prog, n), buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  const loc = n => gl.getAttribLocation(prog, n), STRIDE = 8 * 4;
  [['aPos', 2, 0], ['aUVI', 3, 8], ['aCol', 3, 20]].forEach(([n, s, o]) => { const l = loc(n); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, s, gl.FLOAT, false, STRIDE, o); });
  const form = opts.form || null;
  let fitS = 1, cy = 0;
  const frame = () => { cy = H / 2; fitS = Math.min(W, H) * 0.44; };
  let W = 1, H = 1, dpr = 1, model = null, data = new Float32Array(0), body = [0.3, 0.55, 0.97], ladder = [];
  const SAMPLES = opts.subtle ? 460 : 520, t0 = performance.now();
  // Muestrea las curvas y las centra en su esfera envolvente (estable al girar).
  const build = (fns, [a, b]) => {
    const pts = fns.map(f => { const arr = []; for (let i = 0; i <= SAMPLES; i++) { const t = a + (b - a) * i / SAMPLES, v = [f[0](t), f[1](t), f[2](t)]; arr.push(v.every(Number.isFinite) ? v : null); } return arr; });
    const all = pts.flat().filter(Boolean); if (all.length < 2) throw new Error('la curva no tiene puntos que se puedan dibujar');
    const c = [0, 1, 2].map(k => (Math.min(...all.map(v => v[k])) + Math.max(...all.map(v => v[k]))) / 2);
    const R = Math.max(...all.map(v => Math.hypot(v[0] - c[0], v[1] - c[1], v[2] - c[2]))) || 1;
    return { pts: pts.map(arr => arr.map(v => v && [(v[0] - c[0]) / R, (v[1] - c[1]) / R, (v[2] - c[2]) / R])), rungs: fns.length === 2 };
  };
  const PAIRS = [['--chalk-yellow', '--chalk-red'], ['--chalk-red', '--chalk-yellow'], ['--chalk-green', '--chalk-cyan'], ['--chalk-cyan', '--chalk-green']];
  const colors = () => {
    body = rgb01('--glass');
    gl.uniform3fv(U('uCore'), rgb01('--glass-core')); gl.uniform1f(U('uLight'), isLight ? 1 : 0);
    let seed = 3; ladder = Array.from({ length: 64 }, () => { seed = (seed * 16807) % 2147483647; return PAIRS[seed % 4].map(rgb01); });
  };
  const project = (v, ang) => {
    const ca = Math.cos(ang), sa = Math.sin(ang), x = v[0] * ca - v[1] * sa, y = v[0] * sa + v[1] * ca, z = v[2];
    const tilt = 0.32, ct = Math.cos(tilt), st = Math.sin(tilt), yy = y * ct - z * st, zz = y * st + z * ct;
    const s = fitS / (1 + yy * 0.22);
    return [W / 2 + x * s, cy - zz * s, -yy];
  };
  const verts = [];
  const strip = (P, hwBase, colFn, iMul) => {
    const N = P.map((Q, i) => {
      if (!Q) return null;
      // Tangente sobre un tramo tan largo como la franja: en vueltas más cerradas
      // que su ancho la franja no se dobla sobre sí misma.
      const reach = hwBase * 0.9; let a = Q, b = Q, j = i, k = i;
      while (j > 0 && P[j - 1] && Math.hypot(P[j - 1].s[0] - Q.s[0], P[j - 1].s[1] - Q.s[1]) < reach) a = P[--j];
      if (j > 0 && P[j - 1]) a = P[j - 1];
      while (k < P.length - 1 && P[k + 1] && Math.hypot(P[k + 1].s[0] - Q.s[0], P[k + 1].s[1] - Q.s[1]) < reach) b = P[++k];
      if (k < P.length - 1 && P[k + 1]) b = P[k + 1];
      let dx = b.s[0] - a.s[0], dy = b.s[1] - a.s[1], L = Math.hypot(dx, dy) || 1;
      return [-dy / L, dx / L];
    });
    // Mantiene la orientación de la normal entre puntos vecinos (sin giros de 180°).
    for (let i = 1; i < N.length; i++) if (N[i] && N[i - 1] && N[i][0] * N[i - 1][0] + N[i][1] * N[i - 1][1] < 0) N[i] = [-N[i][0], -N[i][1]];
    const vtx = (Q, n, side) => { const front = (Q.s[2] + 1) / 2, hw = hwBase * (0.72 + 0.45 * front), I = (0.42 + 0.58 * front) * Q.boost * iMul * gain, c = colFn(Q); verts.push(Q.s[0] + n[0] * hw * side, Q.s[1] + n[1] * hw * side, side, 0, I, c[0], c[1], c[2]); };
    for (let i = 0; i < P.length - 1; i++) {
      const A = P[i], B = P[i + 1]; if (!A || !B) continue;
      const na = N[i], nb = N[i + 1];
      vtx(A, na, -1); vtx(A, na, 1); vtx(B, nb, 1); vtx(A, na, -1); vtx(B, nb, 1); vtx(B, nb, -1);
    }
  };
  const splats = (P, hwBase) => {
    for (let i = 0; i < P.length; i++) {
      const Q = P[i]; if (!Q) continue;
      const nb = P[i + 1] || P[i - 1], step = nb ? Math.hypot(nb.s[0] - Q.s[0], nb.s[1] - Q.s[1]) : hwBase;
      const front = (Q.s[2] + 1) / 2, hw = hwBase * (0.72 + 0.45 * front), w = clamp(step / (hw * 0.55), isLight ? 0.1 : 0.16, 1);
      const I = (0.42 + 0.58 * front) * w * gain, c = body, x = Q.s[0], y = Q.s[1];
      for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]]) verts.push(x + u * hw, y + v * hw, u, v, I, c[0], c[1], c[2]);
    }
  };
  const draw = t => {
    if (!model) return;
    const ang = phase + (reduceMotion.matches ? 0.7 : (t - t0) / 1000 * spin);
    verts.length = 0;
    const hw = Math.min(W, H) * (opts.subtle ? 0.03 : 0.026);
    const strands = model.pts.map(arr => arr.map(v => v && { v, s: project(v, ang) }));
    strands.forEach(P => P.forEach((Q, i) => { if (!Q) return; const N = P[i + 1] || P[i - 1]; if (!N) { Q.boost = 1; return; } const l3 = Math.hypot(N.v[0] - Q.v[0], N.v[1] - Q.v[1], N.v[2] - Q.v[2]) || 1e-6, l2 = Math.hypot(N.s[0] - Q.s[0], N.s[1] - Q.s[1]) / fitS; const f = clamp(l2 / l3, 0, 1); Q.boost = 0.78 + (isLight ? 0.25 : 0.5) * (1 - f) * (1 - f); }));
    if (model.rungs) {
      const [P1, P2] = strands, step = Math.round(SAMPLES / 22);
      for (let i = step / 2 | 0, k = 0; i < P1.length; i += step, k++) {
        const A = P1[i], B = P2[i]; if (!A || !B) continue;
        const M = { v: A.v, s: [(A.s[0] + B.s[0]) / 2, (A.s[1] + B.s[1]) / 2, (A.s[2] + B.s[2]) / 2], boost: 0.8 };
        const pair = ladder[k % ladder.length];
        strip([{ ...A, boost: 0.8 }, M], hw * 0.34, () => pair[0], 0.9);
        strip([M, { ...B, boost: 0.8 }], hw * 0.34, () => pair[1], 0.9);
      }
    }
    strands.forEach(P => splats(P, hw));
    if (data.length < verts.length) data = new Float32Array(verts.length * 1.5 | 0);
    data.set(verts);
    gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, verts.length), gl.DYNAMIC_DRAW);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.enable(gl.BLEND);
    const n = verts.length / 8;
    gl.uniform2f(U('uRes'), W, H); gl.uniform2f(U('uCenter'), W / 2, H / 2);
    if (isLight) { gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.uniform1f(U('uMode'), 0); gl.uniform1f(U('uScale'), 1); gl.drawArrays(gl.TRIANGLES, 0, n); return; }
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.uniform1f(U('uMode'), 1); gl.uniform3f(U('uTint'), 0.95, 0.18, 0.12); gl.uniform1f(U('uScale'), 1.022); gl.drawArrays(gl.TRIANGLES, 0, n);
    gl.uniform3f(U('uTint'), 0.15, 0.3, 1.0); gl.uniform1f(U('uScale'), 0.978); gl.drawArrays(gl.TRIANGLES, 0, n);
    gl.uniform1f(U('uMode'), 0); gl.uniform1f(U('uScale'), 1); gl.drawArrays(gl.TRIANGLES, 0, n);
  };
  const resize = () => { const r = canvas.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 1.5); W = Math.max(1, r.width); H = Math.max(1, r.height); canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); gl.viewport(0, 0, canvas.width, canvas.height); frame(); };
  // El canvas trabaja en px CSS; el viewport escala a px reales.
  const fmt = v => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(2));
  colors(); resize();
  const loop = makeLoop(canvas, draw, opts.subtle ? 20 : 30);
  new ResizeObserver(() => { resize(); loop.still(); }).observe(canvas);
  onTheme(() => { colors(); loop.still(); });
  if (!form) { const c = CURVES.find(c => c.id === opts.preset) || CURVES[1]; model = build(MathParse.curves(c.r), MathParse.range(c.t)); loop.still(); return; }
  const inR = form.querySelector('[name="r"]'), inT = form.querySelector('[name="t"]'), msg = form.querySelector('.lm-curve-msg'), presetsHost = form.querySelector('.lm-curve-presets');
  const apply = () => {
    try {
      const fns = MathParse.curves(inR.value), rg = MathParse.range(inT.value);
      model = build(fns, rg);
      msg.classList.remove('is-error');
      msg.textContent = `${fns.length === 1 ? '1 curva' : fns.length + ' curvas'}${model.rungs ? ' con escalera entre ellas' : ''} · t de ${fmt(rg[0])} a ${fmt(rg[1])}`;
    } catch (e) { msg.classList.add('is-error'); msg.textContent = e.message; }
    loop.still();
  };
  const buttons = CURVES.map(c => { const b = document.createElement('button'); b.type = 'button'; b.textContent = c.name; b.setAttribute('aria-pressed', 'false'); b.addEventListener('click', () => select(c)); presetsHost.appendChild(b); return b; });
  const select = c => { inR.value = c.r; inT.value = c.t; buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(CURVES[i] === c))); apply(); };
  let deb = 0;
  [inR, inT].forEach(el => el.addEventListener('input', () => { buttons.forEach(b => b.setAttribute('aria-pressed', 'false')); clearTimeout(deb); deb = setTimeout(apply, 260); }));
  form.addEventListener('submit', e => { e.preventDefault(); apply(); });
  select(CURVES[0]);
}
export function mount() {
makePlotter($('#lm-lab-canvas'), { form: $('#lm-curve') });
document.querySelectorAll('.lm-curio').forEach((c, i) => makePlotter(c, { preset: c.dataset.curve, subtle: true, phase: i * 1.3 }));
}
