// ══════════════════════════════════════════════════════
// Dither (React Bits "Dither", fondo · distinto de "Dither Veil" que
// ya se usa en las imágenes auxiliares). El original es Three.js vía
// react-three-fiber + postprocessing: un plano de pantalla completa
// con ruido fractal (Perlin por octavas, deformado por su propio
// dominio · "domain warp") animado en el tiempo, post-procesado por
// un efecto de dithering ordenado (Bayer) que cuantiza a `colorNum`
// niveles discretos. Confirmado con el código real: NO toma una
// imagen como entrada en ningún punto, es 100% procedural · dithering
// de su propio ruido, no de una foto. Se porta a WebGL1 crudo sin
// Three.js/R3F/postprocessing (regla del proyecto), reusando el mismo
// patrón de textura de Bayer 8×8 ya escrito para Dither Veil.
//
// Reemplaza a Micro Slats en el nivel Componentes (a pedido del
// usuario) y se reusa además como telón de fondo del hero, detrás de
// la fotografía · el hueco que deja la imagen al desvanecerse con el
// scroll ya no revela un color plano, revela este fondo vivo.
// ══════════════════════════════════════════════════════
import { buildBayer8x8Texture } from './dither-veil.js';
import { cssVar, isLight, reduceMotion } from './kit.js';

export function createDitherBackground(host, opts) {
  opts = opts || {};
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false });
  if (!gl) return null;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }
  const vsSrc = `
    precision mediump float;
    attribute vec2 position;
    varying vec2 vUv;
    void main(){ vUv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }`;
  const fsSrc = `
    precision highp float;
    uniform vec2 uResolution; uniform float uTime; uniform vec2 uMouse;
    uniform float uWaveSpeed; uniform float uWaveFrequency; uniform float uWaveAmplitude;
    uniform float uMouseRadius; uniform float uEnableMouse;
    uniform float uColorNum; uniform float uPixelSize;
    uniform vec3 uWaveColor; uniform vec3 uBgColor;
    uniform sampler2D uBayer;
    varying vec2 vUv;

    // Perlin 2D real (cnoise) · el usuario pasó el código fuente
    // completo del componente; usa esto, no simplex noise (lo que se
    // había puesto antes, sin verlo, era una aproximación razonable
    // pero no lo que el original hace de verdad).
    vec4 mod289(vec4 x){ return x - floor(x*(1.0/289.0))*289.0; }
    vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314*r; }
    vec2 fade(vec2 t){ return t*t*t*(t*(t*6.0-15.0)+10.0); }
    float cnoise(vec2 P){
      vec4 Pi = floor(P.xyxy) + vec4(0.0,0.0,1.0,1.0);
      vec4 Pf = fract(P.xyxy) - vec4(0.0,0.0,1.0,1.0);
      Pi = mod289(Pi);
      vec4 ix = Pi.xzxz; vec4 iy = Pi.yyww;
      vec4 fx = Pf.xzxz; vec4 fy = Pf.yyww;
      vec4 i = permute(permute(ix) + iy);
      vec4 gx = fract(i * (1.0/41.0)) * 2.0 - 1.0;
      vec4 gy = abs(gx) - 0.5;
      vec4 tx = floor(gx + 0.5);
      gx = gx - tx;
      vec2 g00 = vec2(gx.x, gy.x);
      vec2 g10 = vec2(gx.y, gy.y);
      vec2 g01 = vec2(gx.z, gy.z);
      vec2 g11 = vec2(gx.w, gy.w);
      vec4 norm = taylorInvSqrt(vec4(dot(g00,g00), dot(g01,g01), dot(g10,g10), dot(g11,g11)));
      g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
      float n00 = dot(g00, vec2(fx.x, fy.x));
      float n10 = dot(g10, vec2(fx.y, fy.y));
      float n01 = dot(g01, vec2(fx.z, fy.z));
      float n11 = dot(g11, vec2(fx.w, fy.w));
      vec2 fade_xy = fade(Pf.xy);
      vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
      return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
    }
    // 4 octavas, ruido "ridged" (abs()) · el look turbulento/con
    // crestas del original, no el fbm suave genérico de antes. La
    // frecuencia y amplitud de cada octava las controlan los mismos
    // props expuestos (uWaveFrequency/uWaveAmplitude), no constantes
    // fijas · igual que el original.
    float fbm(vec2 p){
      float value = 0.0, amp = 1.0, freq = uWaveFrequency;
      for (int i = 0; i < 4; i++) {
        value += amp * abs(cnoise(p));
        p *= freq;
        amp *= uWaveAmplitude;
      }
      return value;
    }
    // Un solo domain-warp (no el doble tipo Inigo Quilez que se había
    // puesto antes) · así es el original, más simple de lo asumido.
    float pattern(vec2 p, float t){
      vec2 p2 = p - t * uWaveSpeed;
      return fbm(p + fbm(p2));
    }
    void main(){
      vec2 uv = vUv - 0.5;
      uv.x *= uResolution.x / uResolution.y;
      float f = pattern(uv, uTime);

      if (uEnableMouse > 0.5) {
        vec2 mouseNDC = (uMouse - 0.5) * vec2(1.0, -1.0);
        mouseNDC.x *= uResolution.x / uResolution.y;
        float dist = length(uv - mouseNDC);
        float effect = 1.0 - smoothstep(0.0, uMouseRadius, dist);
        f -= 0.5 * effect;
      }
      vec3 color = mix(uBgColor, uWaveColor, clamp(f, 0.0, 1.0));

      // Dithering ordenado real: por canal RGB completo (no solo
      // luminancia) + sesgo por luminancia · el original dithea el
      // color entero, no arma un duotono de 2 colores como se había
      // simplificado antes.
      vec2 scaledCoord = floor(gl_FragCoord.xy / uPixelSize);
      vec2 cellUv = (mod(scaledCoord, 8.0) + 0.5) / 8.0;
      float threshold = texture2D(uBayer, cellUv).r - 0.25;
      float step_ = 1.0 / (uColorNum - 1.0);
      color += threshold * step_;
      float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
      float bias = mix(0.2, 0.0, smoothstep(0.45, 0.8, luminance));
      color = clamp(color - bias, 0.0, 1.0);
      color = floor(color * (uColorNum - 1.0) + 0.5) / (uColorNum - 1.0);

      gl_FragColor = vec4(color, 1.0);
    }`;

  const vs = compile(gl.VERTEX_SHADER, vsSrc), fs = compile(gl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(prog, 'position');
  const uResLoc = gl.getUniformLocation(prog, 'uResolution');
  const uTimeLoc = gl.getUniformLocation(prog, 'uTime');
  const uMouseLoc = gl.getUniformLocation(prog, 'uMouse');
  const uWaveLoc = gl.getUniformLocation(prog, 'uWaveColor');
  const uBgLoc = gl.getUniformLocation(prog, 'uBgColor');
  const uBayerLoc = gl.getUniformLocation(prog, 'uBayer');
  const uSpeedLoc = gl.getUniformLocation(prog, 'uWaveSpeed');
  const uFreqLoc = gl.getUniformLocation(prog, 'uWaveFrequency');
  const uAmpLoc = gl.getUniformLocation(prog, 'uWaveAmplitude');
  const uMouseRadiusLoc = gl.getUniformLocation(prog, 'uMouseRadius');
  const uEnableMouseLoc = gl.getUniformLocation(prog, 'uEnableMouse');
  const uColorNumLoc = gl.getUniformLocation(prog, 'uColorNum');
  const uPixelSizeLoc = gl.getUniformLocation(prog, 'uPixelSize');
  const bayerTex = buildBayer8x8Texture(gl);

  // Mismos defaults del componente real (waveSpeed/Frequency/Amplitude,
  // mouseRadius, colorNum) salvo pixelSize, subido de 2 a 3 · a la
  // escala de una sección completa de fondo (no una demo de 600px) un
  // pixelSize de 2 se ve casi imperceptible.
  const P = Object.assign({
    waveSpeed: 0.05, waveFrequency: 3, waveAmplitude: 0.3,
    mouseRadius: 0.3, colorNum: 4, pixelSize: 3, enableMouseInteraction: true,
  }, opts.params || {});

  function hexToVec3(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const n = parseInt(hex, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  let W = 1, H = 1;
  function resize() {
    const r = host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = canvas.width = Math.max(1, Math.round(r.width * dpr));
    H = canvas.height = Math.max(1, Math.round(r.height * dpr));
    gl.viewport(0, 0, W, H);
  }
  resize();
  window.addEventListener('resize', resize);

  // Sin voltear Y acá · el shader ya hace vec2(1.0,-1.0) sobre uMouse
  // (igual que el original), voltear en los dos lados se cancelaba
  // entre sí y desalineaba el efecto respecto al cursor real.
  let mouse = { x: 0.5, y: 0.5 }, mouseTarget = { x: 0.5, y: 0.5 };
  host.addEventListener('pointermove', (e) => {
    const r = host.getBoundingClientRect();
    mouseTarget.x = (e.clientX - r.left) / r.width;
    mouseTarget.y = (e.clientY - r.top) / r.height;
  });
  host.addEventListener('pointerleave', () => { mouseTarget.x = -1; mouseTarget.y = -1; });

  let startTs = null;
  function draw(ts) {
    if (startTs === null) startTs = ts;
    const t = (ts - startTs) / 1000;
    mouse.x += (mouseTarget.x - mouse.x) * 0.06;
    mouse.y += (mouseTarget.y - mouse.y) * 0.06;

    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(uResLoc, W, H);
    gl.uniform1f(uTimeLoc, t);
    gl.uniform2f(uMouseLoc, mouse.x, mouse.y);
    gl.uniform1f(uSpeedLoc, P.waveSpeed);
    gl.uniform1f(uFreqLoc, P.waveFrequency);
    gl.uniform1f(uAmpLoc, P.waveAmplitude);
    gl.uniform1f(uMouseRadiusLoc, P.mouseRadius);
    gl.uniform1f(uEnableMouseLoc, P.enableMouseInteraction ? 1 : 0);
    gl.uniform1f(uColorNumLoc, P.colorNum);
    gl.uniform1f(uPixelSizeLoc, P.pixelSize);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, bayerTex); gl.uniform1i(uBayerLoc, 0);
    const wave = opts.waveColor ? opts.waveColor() : hexToVec3(cssVar('--cyan'));
    const bg = opts.bgColor ? opts.bgColor() : hexToVec3(cssVar('--bg2'));
    gl.uniform3fv(uWaveLoc, wave);
    gl.uniform3fv(uBgLoc, bg);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  let raf = null;
  function tick(ts) { draw(ts); raf = requestAnimationFrame(tick); }
  function start() { if (!raf) { startTs = null; raf = requestAnimationFrame(tick); } }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = null; }

  if (reduceMotion.matches) {
    draw(0);
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { e.isIntersecting ? start() : stop(); });
    }, { threshold: 0.01 });
    io.observe(host);
  }

  return { start, stop };
}
export function initDitherBackgrounds() {
  const componentesHost = document.getElementById('sherry-dither-bg');
  if (componentesHost) {
    createDitherBackground(componentesHost, {
      waveColor: () => hexToVec3ForDither(cssVar('--cyan')),
      bgColor: () => hexToVec3ForDither(cssVar('--bg2')),
    });
  }
  // Timeline: segunda instancia de fondo, en violeta para no repetir el
  // cian de Componentes.
  const timelineHost = document.getElementById('sherry-dither-bg-timeline');
  if (timelineHost) {
    createDitherBackground(timelineHost, {
      waveColor: () => hexToVec3ForDither(cssVar('--violet')),
      bgColor: () => hexToVec3ForDither(cssVar('--bg2')),
    });
  }
  const heroHost = document.getElementById('sherry-hero-dither');
  if (heroHost) {
    createDitherBackground(heroHost, {
      waveColor: () => hexToVec3ForDither(cssVar('--magenta')),
      bgColor: () => hexToVec3ForDither(cssVar('--bg')),
    });
  }
}
export function hexToVec3ForDither(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const n = parseInt(hex, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
export function updateHexes() {

  const map = {
    'hex-magenta':'--magenta','hex-cyan':'--cyan','hex-lime':'--lime',
    'hex-violet':'--violet','hex-electric':'--electric','hex-rose':'--rose',
    'hex-lavender':'--lavender','hex-aqua':'--aqua','hex-peach':'--peach',
    'hex-mint':'--mint','hex-black':'--black','hex-gray':'--gray',
    'hex-white':'--white','hex-accent':'--accent','hex-accent2':'--accent2',
    'hex-ok':'--ok','hex-warn':'--warn','hex-danger':'--danger','hex-info':'--info',
  };
  Object.entries(map).forEach(([id, token]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = cssVar(token).toUpperCase();
  });
  inkSwatchLabels();
}
// ── Etiquetas hex de la paleta ─────────────────────────
// Antes: color fijo con mix-blend-mode: difference. En medios tonos
// (naranjas, verdes, el gris) quedaba un gris turbio de 1.1 a 2.5:1.
// Ahora cada etiqueta usa la tinta del modo vigente (--text o --bg)
// con mayor contraste WCAG real contra su muestra; si ninguna llega
// a 4.5:1, va sobre una pastilla --bg con --text (skill colorimetría).
export function inkSwatchLabels() {
  const rgbOf = s => { const m = String(s).match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : null; };
  const hexRgb = h => { h = h.trim().replace('#', ''); if (h.length === 3) h = h.replace(/./g, c => c + c); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const inks = ['--text', '--bg'].map(t => ({ t, c: hexRgb(cssVar(t)) }));
  document.querySelectorAll('.swatch-hex').forEach(el => {
    const sw = rgbOf(getComputedStyle(el.parentElement).backgroundColor);
    if (!sw) return;
    const best = inks.map(i => ({ t: i.t, r: ratio(i.c, sw) })).sort((a, b) => b.r - a.r)[0];
    const chip = best.r < 4.5;
    el.classList.toggle('is-chip', chip);
    el.style.color = chip ? 'var(--text)' : `var(${best.t})`;
  });
}
export function mount() {
// ── Canvas triangular con destellos neón ──────────────
(function() {
  const canvas = document.getElementById('tri-canvas');
  const ctx    = canvas.getContext('2d');
  let W, H, tris = [], raf;

  // Colores del destello · derivados de los tokens vigentes (magenta,
  // cyan, lime, violet, electric, rose, aqua), no un array fijo. Antes
  // el destello se quedaba con el neón saturado de modo oscuro incluso
  // en modo claro (los tokens de body.light son más apagados a
  // propósito, como el resto de la paleta clara) · se recalcula en
  // cada llamada en vez de cachear, ya que cssVar() lee el body
  // computado en vivo y ya cambia solo al togglear.
  function NEONS() {
    return [cssVar('--magenta'), cssVar('--cyan'), cssVar('--lime'), cssVar('--violet'),
            cssVar('--electric'), cssVar('--rose'), cssVar('--aqua')].filter(Boolean);
  }

  function buildTris() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    tris = [];

    const s  = 48;
    const th = 41.57;
    const cols = Math.ceil(W / s) + 3;
    const rows = Math.ceil(H / (th * 2)) + 3;

    for (let r = 0; r < rows; r++) {
      // Filas alternas desplazadas s/2 en X · rompe el efecto sierra
      const ox = (r % 2 === 1) ? s / 2 : 0;
      for (let c = 0; c < cols; c++) {
        const x  = c * s - s + ox;
        const y0 = r * th * 2 - th * 2;
        const y1 = y0 + th;
        const y2 = y0 + th * 2;

        // △ · base en y0, vértice en y1
        tris.push({
          pts: [[x, y0], [x+s, y0], [x+s/2, y1]],
          flashColor: null, flashDur: 0, flashT: 0,
        });
        // ▽ · vértice en y1, base en y2
        tris.push({
          pts: [[x+s/2, y1], [x+s, y2], [x, y2]],
          flashColor: null, flashDur: 0, flashT: 0,
        });
      }
    }
  }

  // Programar destellos aleatorios
  function scheduleFlash() {
    const delay = 80 + Math.random() * 300;
    setTimeout(() => {
      // Elegir un triángulo aleatorio
      if (tris.length) {
        const t = tris[Math.floor(Math.random() * tris.length)];
        if (!t.flashColor) { // no interrumpir uno que ya brilla
          const neons = NEONS();
          t.flashColor = neons[Math.floor(Math.random() * neons.length)];
          t.flashDur   = 600 + Math.random() * 800;
          t.flashT     = 0;
        }
      }
      scheduleFlash();
    }, delay);
  }

  function draw(ts) {
    ctx.clearRect(0, 0, W, H);
    const isLight = document.body.classList.contains('light');
    const baseColor = '#777777';
    const baseAlpha = 0.1;

    const s  = 48;
    const th = 41.57;
    const numRows = Math.ceil(H / (th * 2)) + 4;

    // ── Líneas horizontales · una sola vez por nivel ──
    ctx.strokeStyle = baseColor;
    ctx.lineWidth   = 1.5;
    ctx.globalAlpha = baseAlpha;
    for (let r = 0; r < numRows * 2 + 1; r++) {
      const y = r * th - th;
      ctx.beginPath();
      ctx.moveTo(-s, y);
      ctx.lineTo(W + s, y);
      ctx.stroke();
    }

    // ── Triángulos · solo lados oblicuos + destellos ──
    for (const t of tris) {
      const [a, b, c2] = t.pts;
      let color = baseColor;
      let alpha = baseAlpha;

      if (t.flashColor) {
        t.flashT += 16;
        const progress = Math.min(t.flashT / t.flashDur, 1);
        const ease = progress < 0.3
          ? progress / 0.3
          : 1 - ((progress - 0.3) / 0.7);
        alpha = baseAlpha + ease * (isLight ? 0.55 : 0.7);
        color = t.flashColor;
        ctx.shadowColor = t.flashColor;
        ctx.shadowBlur  = ease * 10;
        if (t.flashT >= t.flashDur) {
          t.flashColor = null;
          t.flashDur   = 0;
          ctx.shadowBlur = 0;
        }
      } else {
        ctx.shadowBlur = 0;
      }

      // Solo los dos lados oblicuos (la horizontal ya está dibujada)
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.lineTo(c2[0], c2[1]);
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;
    raf = requestAnimationFrame(draw);
  }

  // Con prefers-reduced-motion: un solo cuadro estático (la retícula
  // sin destellos) y se redibuja solo al cambiar tamaño; antes el loop
  // corría a 60fps aunque el sistema pidiera menos movimiento.
  const still = () => { cancelAnimationFrame(raf); raf = null; draw(0); cancelAnimationFrame(raf); raf = null; };
  function init() {
    buildTris();
    if (reduceMotion.matches) { still(); return; }
    scheduleFlash();
    raf = requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => { buildTris(); if (reduceMotion.matches) still(); });
  setTimeout(init, 50);

  // Exponer para que toggleTri pueda parar/arrancar
  window._sherryTri = {
    pause() { cancelAnimationFrame(raf); },
    resume() { if (reduceMotion.matches) still(); else raf = requestAnimationFrame(draw); },
  };
})();
}
