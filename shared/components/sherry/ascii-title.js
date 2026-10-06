// ══════════════════════════════════════════════════════
// Título del hero en ASCII Text (React Bits "ASCII Text",
// reconstruido en WebGL crudo). El original es Three.js: dibuja el
// texto en un canvas 2D, lo sube como textura a un plano con
// distorsión por vertex shader + aberración cromática en el
// fragment shader, y vuelve a muestrear el frame renderizado a
// caracteres por luminancia hacia un <pre>. Acá mismo mecanismo sin
// Three.js: contexto WebGL propio (mismo patrón que Ripple
// Distortion de apolo), geometría ya en clip space sin cámara real,
// inclinación por shear en vez de rotación 3D verdadera · no hace
// falta álgebra de matrices para este efecto.
// ══════════════════════════════════════════════════════
import { reduceMotion, updateHeroImage } from './kit.js';
import { initDitherBackgrounds, updateHexes } from './dither.js';
import { initHero } from './hero.js';
import { initPixelCards } from './pixel-card.js';
import { initDitherVeils } from './dither-veil.js';

export function initAsciiTitle() {
  const host = document.getElementById('sherry-ascii-host');
  const plainTitle = document.getElementById('sherry-hero-title');
  if (!host || !plainTitle) return;

  const TEXT = 'SHERRY';
  // Rampa real del componente (70 caracteres, no una simplificada) ·
  // el usuario pasó el código fuente completo, esto da una gradación
  // mucho más fina que los 10 caracteres que se habían usado antes.
  const RAMP = ' .\'`^",:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';
  const RENDER_W = 960, RENDER_H = 320;

  const textCanvas = document.createElement('canvas');
  textCanvas.width = RENDER_W; textCanvas.height = RENDER_H;
  const tctx = textCanvas.getContext('2d');
  tctx.clearRect(0, 0, RENDER_W, RENDER_H);
  tctx.fillStyle = '#FAFAFA';
  tctx.textAlign = 'center';
  tctx.textBaseline = 'middle';
  tctx.font = "700 168px 'JetBrains Mono', monospace";
  // En vertical el lienzo es angosto: el texto se agranda hasta ~80% del
  // ancho para que el ASCII tenga columnas suficientes y se lea.
  if (window.innerWidth < 760) {
    const tw = tctx.measureText(TEXT).width;
    tctx.font = `700 ${Math.floor(168 * RENDER_W * 0.8 / tw)}px 'JetBrains Mono', monospace`;
  }
  tctx.fillText(TEXT, RENDER_W / 2, RENDER_H / 2);

  const glCanvas = document.createElement('canvas');
  glCanvas.width = RENDER_W; glCanvas.height = RENDER_H;
  const gl = glCanvas.getContext('webgl', { premultipliedAlpha: false, alpha: true });
  if (!gl) return; // sin WebGL el <h1> plano se queda como está, visible

  const vsSrc = `
    precision mediump float;
    attribute vec2 position; attribute vec2 uv;
    uniform float uTime; uniform vec2 uTilt;
    varying vec2 vUv;
    void main(){
      vUv = uv;
      vec2 p = position;
      float wave = sin(p.x*3.0+uTime*1.6)*0.035 + cos(p.y*5.0+uTime*1.1)*0.025;
      p.y += wave;
      p.x += uTilt.x * p.y * 0.22;
      p.y += uTilt.y * p.x * 0.14;
      gl_Position = vec4(p, 0.0, 1.0);
    }`;
  const fsSrc = `
    precision mediump float;
    uniform sampler2D uTex; uniform vec2 uTilt;
    varying vec2 vUv;
    void main(){
      float shift = 0.0035 + abs(uTilt.x)*0.006;
      float r = texture2D(uTex, vUv + vec2(shift,0.0)).r;
      float g = texture2D(uTex, vUv).g;
      float b = texture2D(uTex, vUv - vec2(shift,0.0)).b;
      float a1 = texture2D(uTex, vUv + vec2(shift,0.0)).a;
      float a2 = texture2D(uTex, vUv).a;
      float a3 = texture2D(uTex, vUv - vec2(shift,0.0)).a;
      float a = max(max(a1, a2), a3);
      gl_FragColor = vec4(r, g, b, a);
    }`;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { return null; }
    return s;
  }
  const vs = compile(gl.VERTEX_SHADER, vsSrc);
  const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  // Grid de 32x12 segmentos en clip space (-1..1), con UV correspondiente.
  const cols = 32, rows = 12;
  const verts = [], uvs = [], idx = [];
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      verts.push((c / cols) * 2 - 1, (r / rows) * 2 - 1);
      uvs.push(c / cols, 1 - r / rows);
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = r * (cols + 1) + c, b = a + 1, cIdx = a + (cols + 1), d = cIdx + 1;
      idx.push(a, b, cIdx, b, d, cIdx);
    }
  }
  const vbuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  const uvbuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvbuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
  const ibuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);

  const posLoc = gl.getAttribLocation(prog, 'position');
  const uvLoc = gl.getAttribLocation(prog, 'uv');
  const uTimeLoc = gl.getUniformLocation(prog, 'uTime');
  const uTiltLoc = gl.getUniformLocation(prog, 'uTilt');
  const uTexLoc = gl.getUniformLocation(prog, 'uTex');

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas);

  gl.viewport(0, 0, RENDER_W, RENDER_H);

  function drawFrame(t, tiltX, tiltY) {
    gl.useProgram(prog);
    gl.uniform1f(uTimeLoc, t);
    gl.uniform2f(uTiltLoc, tiltX, tiltY);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(uTexLoc, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, uvbuf);
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuf);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
  }

  const pre = document.createElement('pre');
  // Arte, no texto: el título real es #sherry-hero-title.
  pre.setAttribute('aria-hidden', 'true');
  host.appendChild(pre);

  const charAspect = 0.52;
  function cellCount() {
    const w = host.clientWidth || RENDER_W, h = host.clientHeight || RENDER_H;
    const fontSize = 8;
    const cellW = fontSize * charAspect;
    return {
      cols: Math.max(20, Math.min(160, Math.floor(w / cellW))),
      rows: Math.max(10, Math.min(70, Math.floor(h / fontSize))),
    };
  }
  const sampleCanvas = document.createElement('canvas');
  const sctx = sampleCanvas.getContext('2d', { willReadFrequently: true });

  function sampleToAscii() {
    const { cols: cc, rows: rr } = cellCount();
    sampleCanvas.width = cc; sampleCanvas.height = rr;
    sctx.clearRect(0, 0, cc, rr);
    sctx.drawImage(glCanvas, 0, 0, cc, rr);
    const data = sctx.getImageData(0, 0, cc, rr).data;
    let out = '';
    for (let y = 0; y < rr; y++) {
      let line = '';
      for (let x = 0; x < cc; x++) {
        const i = (y * cc + x) * 4;
        const a = data[i + 3] / 255;
        const lum = (0.3 * data[i] + 0.6 * data[i + 1] + 0.1 * data[i + 2]) / 255 * a;
        line += RAMP[Math.min(RAMP.length - 1, Math.floor(lum * RAMP.length))];
      }
      out += line + '\n';
    }
    pre.textContent = out;
  }

  if (reduceMotion.matches) {
    drawFrame(0, 0, 0);
    sampleToAscii();
    plainTitle.style.display = 'none';
    return;
  }

  let tilt = { x: 0, y: 0 }, tiltTarget = { x: 0, y: 0 };
  host.addEventListener('pointermove', (e) => {
    const r = host.getBoundingClientRect();
    tiltTarget.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    tiltTarget.y = ((e.clientY - r.top) / r.height) * 2 - 1;
  });
  host.addEventListener('pointerleave', () => { tiltTarget.x = 0; tiltTarget.y = 0; });

  // Hue-rotate según el ángulo del cursor respecto al centro del
  // viewport (no del host) · así es como lo hace el original, es una
  // lectura global de "dónde está el mouse en la pantalla", no local
  // al título. Se lerpea igual que el tilt, para que gire suave.
  let hueDeg = 0, hueTarget = 0;
  window.addEventListener('mousemove', (e) => {
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    hueTarget = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
  });

  let running = false, raf = null, lastSample = 0, startTs = null;
  function render(ts) {
    if (!running) return;
    if (startTs === null) startTs = ts;
    const t = (ts - startTs) / 1000;
    tilt.x += (tiltTarget.x - tilt.x) * 0.08;
    tilt.y += (tiltTarget.y - tilt.y) * 0.08;
    drawFrame(t, tilt.x, tilt.y);
    hueDeg += (hueTarget - hueDeg) * 0.075;
    pre.style.filter = `hue-rotate(${hueDeg.toFixed(1)}deg)`;
    if (ts - lastSample > 70) { lastSample = ts; sampleToAscii(); }
    raf = requestAnimationFrame(render);
  }
  function start() { if (!running) { running = true; startTs = null; raf = requestAnimationFrame(render); } }
  function stop()  { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  drawFrame(0, 0, 0);
  sampleToAscii();
  plainTitle.style.display = 'none';

  const asciiIo = new IntersectionObserver((entries) => {
    entries.forEach(e => { e.isIntersecting ? start() : stop(); });
  }, { threshold: 0.01 });
  asciiIo.observe(host);
}
export function mount() {
updateHexes();
updateHeroImage();
initHero();
initAsciiTitle();
initPixelCards();
initDitherVeils();
initDitherBackgrounds();
document.body.classList.add('crt-on');
}
