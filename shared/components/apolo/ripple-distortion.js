// ══════════════════════════════════════════════════════
// CAPA 0b · Ripple Distortion sobre la imagen del hero
// (React Bits "Ripple Distortion", es OGL · dos pasadas, sin
// geometría 3D real: nivel 2 de la escala de portabilidad de
// la skill `shaders`, mismo nivel que react-fluid-animation.
// Reconstruido desde el concepto en WebGL crudo:
//  1) Un framebuffer propio (reemplaza el RenderTarget de OGL)
//     donde se dibuja cada "ola" activa como un quad con un
//     brush circular (mismo GLSL que el original: caída
//     exp(-r·5), anillos concéntricos por coseno) en blend
//     aditivo · arma un mapa de desplazamiento en escala de
//     grises.
//  2) Una pasada de composición de pantalla completa que
//     muestrea la imagen real con las UV empujadas según ese
//     mapa (mismo `coverUV()` del original, para que el
//     object-fit:cover del canvas coincida con el de la img).
// Simplificado a propósito: el original dibuja hasta 100 olas
// en una sola llamada instanciada (`ANGLE_instanced_arrays`);
// acá son como mucho 24 olas con un `drawArrays` cada una ·
// mismo resultado visual a esta escala, sin depender de la
// extensión de instancing. También se deja fuera la dispersión
// cromática/tinte/glint opcionales del original (no pedidos,
// strength=0.01 es casi imperceptible de por sí). Si `gl` sale
// null o la textura no carga, la función retorna sin tocar
// nada · la <img> de abajo se queda visible tal cual.
// ══════════════════════════════════════════════════════
import { reduceMotion } from './kit.js';

export function initRipple() {
  const host = document.querySelector('.ap-hero-media');
  const img = document.getElementById('ap-hero-img');
  const canvas = document.getElementById('ap-hero-ripple');
  if (!host || !img || !canvas) return;

  // premultipliedAlpha:false · el default (true) hace que el navegador
  // trate lo que escribe el fragment shader como ya premultiplicado,
  // así que un color de brillo completo con alpha bajo (oro con alpha
  // 0.2, por ejemplo) sale oscurecido/apagado en vez de oro real y
  // translúcido · bug real encontrado leyendo los valores crudos con
  // readPixels en Beams/Rays (el oro salía como (58,44,14), un café
  // apagado, no el oro (200,144,10) esperado). Con esto, gl_FragColor.rgb
  // es el color real sin escalar. Mismo fix en initRays/initLens.
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false });
  if (!gl) return;

  const MAX_WAVES = 24;
  const BRUSH = 150, SWIRL = 1, RINGS = 4, SPREAD = 5, FADE = 3, SPACING = 15, STRENGTH = 0.01;
  const LIFE_K = Math.log(500);

  const waveVsSrc = `
    attribute vec2 aPos; attribute vec2 aUv;
    varying vec2 vUv;
    uniform vec2 uOffset; uniform vec2 uScale;
    void main(){ vUv = aUv; gl_Position = vec4(uOffset + aPos * uScale, 0.0, 1.0); }
  `;
  const waveFsSrc = `
    precision highp float;
    varying vec2 vUv;
    uniform float uOpacity;
    uniform float uRings;
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
  const screenVsSrc = `
    attribute vec2 aPos; attribute vec2 aUv;
    varying vec2 vUv;
    void main(){ vUv = aUv; gl_Position = vec4(aPos, 0.0, 1.0); }
  `;
  const compositeFsSrc = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform sampler2D uDisplacement;
    uniform vec2 uResolution;
    uniform vec2 uTextureSize;
    uniform float uStrength;
    uniform float uSwirl;
    vec2 coverUV(vec2 uv) {
      vec2 safe = max(uTextureSize, vec2(1.0));
      vec2 s = uResolution / safe;
      vec2 scaledSize = safe * max(s.x, s.y);
      vec2 offset = (uResolution - scaledSize) * 0.5;
      return (uv * uResolution - offset) / scaledSize;
    }
    void main() {
      float amount = texture2D(uDisplacement, vUv).r;
      vec2 base = coverUV(vUv);
      float theta = amount * uSwirl * 6.283185307;
      vec2 dir = vec2(sin(theta), cos(theta));
      vec2 push = dir * amount * uStrength;
      gl_FragColor = vec4(texture2D(uTexture, base + push).rgb, 1.0);
    }
  `;

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return sh;
  }
  function link(vsSrc, fsSrc) {
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(prog);
    return prog;
  }
  const waveProg = link(waveVsSrc, waveFsSrc);
  const compositeProg = link(screenVsSrc, compositeFsSrc);

  // Quad unitario compartido por ambos programas (posición + uv).
  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1,-1, 0,0,  1,-1, 1,0,  -1,1, 0,1,
    -1,1, 0,1,   1,-1, 1,0,   1,1, 1,1,
  ]), gl.STATIC_DRAW);

  function bindQuad(prog) {
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    const aUv = gl.getAttribLocation(prog, 'aUv');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 16, 8);
  }

  const waveU = {
    offset: gl.getUniformLocation(waveProg, 'uOffset'),
    scale: gl.getUniformLocation(waveProg, 'uScale'),
    opacity: gl.getUniformLocation(waveProg, 'uOpacity'),
    rings: gl.getUniformLocation(waveProg, 'uRings'),
  };
  const compU = {
    tex: gl.getUniformLocation(compositeProg, 'uTexture'),
    disp: gl.getUniformLocation(compositeProg, 'uDisplacement'),
    res: gl.getUniformLocation(compositeProg, 'uResolution'),
    texSize: gl.getUniformLocation(compositeProg, 'uTextureSize'),
    strength: gl.getUniformLocation(compositeProg, 'uStrength'),
    swirl: gl.getUniformLocation(compositeProg, 'uSwirl'),
  };

  // Framebuffer propio para el mapa de desplazamiento · a 0.6x de
  // resolución, de sobra para un brush suave, más barato de limpiar
  // y redibujar cada frame.
  let fboTex = null, fbo = null, fboW = 2, fboH = 2;
  function makeFBO(w, h) {
    if (fbo) { gl.deleteFramebuffer(fbo); gl.deleteTexture(fboTex); }
    fboW = Math.max(2, w); fboH = Math.max(2, h);
    fboTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, fboTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, fboW, fboH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  const imgTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, imgTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  let textureReady = false;
  let texW = 1, texH = 1;

  function uploadTexture() {
    try {
      gl.bindTexture(gl.TEXTURE_2D, imgTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      texW = img.naturalWidth || 1;
      texH = img.naturalHeight || 1;
      textureReady = true;
      canvas.style.opacity = '1';
    } catch (e) {
      textureReady = false; // p.ej. canvas "tainted" · la <img> real se queda visible
    }
  }
  // El listener se queda pegado (no solo en el else) porque la imagen
  // cambia de src al alternar claro/oscuro (prouned_apolo vs. _dark) ·
  // hace falta volver a subir la textura cada vez que eso pase, no
  // solo la primera carga.
  if (img.complete && img.naturalWidth) uploadTexture();
  img.addEventListener('load', uploadTexture);

  const waves = Array.from({ length: MAX_WAVES }, () => ({ x: 0, y: 0, scale: 1.5, target: 1.5, opacity: 0 }));
  let current = 0;
  function spawnWave(x, y) {
    const w = waves[current];
    current = (current + 1) % MAX_WAVES;
    w.x = x; w.y = y; w.scale = 1.5; w.target = 1.5 * SPREAD; w.opacity = 1;
  }

  let previousX = 0, previousY = 0;
  function localPoint(clientX, clientY) {
    const rect = host.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
    return [clientX - rect.left, rect.height - (clientY - rect.top)];
  }
  if (!reduceMotion.matches) {
    window.addEventListener('pointermove', (e) => {
      const p = localPoint(e.clientX, e.clientY);
      if (!p) return;
      if (Math.abs(p[0] - previousX) > SPACING || Math.abs(p[1] - previousY) > SPACING) {
        spawnWave(p[0], p[1]);
        previousX = p[0]; previousY = p[1];
      }
    }, { passive: true });
  }

  function resize() {
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
    canvas.width = w; canvas.height = h;
    makeFBO(Math.round(w * 0.6), Math.round(h * 0.6));
  }
  resize();
  window.addEventListener('resize', resize);

  let previousTime = 0;
  function render(now) {
    if (!textureReady) return;
    const delta = previousTime ? Math.min(0.05, (now - previousTime) / 1000) : 0;
    previousTime = now;
    const growth = 1 - Math.exp(-delta * 1.09);
    const decay = Math.exp((-delta * LIFE_K) / FADE);

    // Pasada 1: olas activas → framebuffer de desplazamiento.
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, fboW, fboH);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(waveProg);
    bindQuad(waveProg);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.uniform1f(waveU.rings, RINGS);
    const w = canvas.width, h = canvas.height;
    for (let i = 0; i < MAX_WAVES; i++) {
      const wv = waves[i];
      if (wv.opacity <= 0) continue;
      wv.opacity *= decay;
      wv.scale += (wv.target - wv.scale) * growth;
      if (wv.opacity < 0.002) { wv.opacity = 0; continue; }
      const half = (wv.scale * BRUSH) / 2;
      gl.uniform2f(waveU.offset, (wv.x / w) * 2 - 1, (wv.y / h) * 2 - 1);
      gl.uniform2f(waveU.scale, (half / w) * 2, (half / h) * 2);
      gl.uniform1f(waveU.opacity, wv.opacity);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    gl.disable(gl.BLEND);

    // Pasada 2: composición a pantalla completa, UV desplazadas.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(compositeProg);
    bindQuad(compositeProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, imgTex);
    gl.uniform1i(compU.tex, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, fboTex);
    gl.uniform1i(compU.disp, 1);
    gl.uniform2f(compU.res, canvas.width, canvas.height);
    gl.uniform2f(compU.texSize, texW, texH);
    gl.uniform1f(compU.strength, STRENGTH);
    gl.uniform1f(compU.swirl, SWIRL);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  return { render };
}
