// ══════════════════════════════════════════════════════
// Dither Veil (React Bits "Dither Veil") · port fiel del código
// fuente real (OGL/WebGL2), sin OGL: WebGL2 crudo, mismos shaders.
// Mecanismo: en reposo la imagen se ve 100% dithereada a 1 bit
// (Floyd-Steinberg calculado en CPU, igual que el original); el
// cursor pinta una "cortina" en un render target con ping-pong que
// decae con el tiempo (linger), y donde la cortina supera el umbral
// de Bayer de cada celda se ve la foto real a color. Click = onda
// expansiva que también revela. Intro: aparición radial dithereada.
//
// Única diferencia deliberada con el original: el original es para
// fotos rectangulares (detecta un "matte" de fondo y lo rellena). Las
// imágenes de acá son PNG con fondo transparente, así que la salida
// respeta el alfa real de la imagen (canvas con alpha, premultiplicado)
// · fuera de la silueta del componente el canvas es transparente de
// verdad, sin marco ni rectángulo, en ambos estados (dithereado y
// revelado). El alfa del estado dithereado también se cuantiza por
// celda, así el borde de la silueta queda pixelado igual que el resto.
// ══════════════════════════════════════════════════════
import { COMPONENT_IMAGES, cssVar, isLight, reduceMotion } from './kit.js';

export function buildBayer8x8Texture(gl) {
  let m = [[0, 2], [3, 1]];
  function expand(mat) {
    const n = mat.length, out = [];
    for (let i = 0; i < 2 * n; i++) out.push(new Array(2 * n).fill(0));
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = mat[y][x] * 4;
      out[y][x] = v; out[y][x + n] = v + 2; out[y + n][x] = v + 3; out[y + n][x + n] = v + 1;
    }
    return out;
  }
  m = expand(m); m = expand(m);
  const data = new Uint8Array(8 * 8 * 4);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const t = Math.round(((m[y][x] + 0.5) / 64) * 255);
    const i = (y * 8 + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = t; data[i + 3] = 255;
  }
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 8, 8, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  return tex;
}
export const DV_FLOYD = [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]];
export const DV_MASK_SCALE = 0.5, DV_MAX_BURSTS = 4, DV_BURST_SECONDS = 1.2, DV_HOLD = 1.6, DV_INTRO_MS = 1100;
// Floyd-Steinberg serpentino, igual que diffuse() del original, más el
// alfa: los píxeles transparentes (alfa < 50%) ni reciben tono ni
// reparten error · si no, el error de los bordes se derramaría al
// vacío alrededor de la pieza.
export function dvDiffuse(pixels, cols, rows, levels, grade) {
  const values = new Float32Array(cols * rows);
  const solid = new Uint8Array(cols * rows);
  for (let i = 0; i < cols * rows; i++) {
    const r = pixels[i * 4] / 255, g = pixels[i * 4 + 1] / 255, b = pixels[i * 4 + 2] / 255;
    values[i] = grade(0.2126 * r + 0.7152 * g + 0.0722 * b);
    solid[i] = pixels[i * 4 + 3] >= 128 ? 1 : 0;
  }
  const steps = levels - 1;
  const out = new Uint8Array(cols * rows * 4);
  for (let y = 0; y < rows; y++) {
    const dir = y & 1 ? -1 : 1;
    for (let i = 0; i < cols; i++) {
      const x = dir > 0 ? i : cols - 1 - i;
      const p = y * cols + x;
      if (!solid[p]) continue;
      const old = values[p];
      const q = Math.min(steps, Math.max(0, Math.round(old * steps))) / steps;
      const err = old - q;
      const byte = Math.round(q * 255);
      out[p * 4] = out[p * 4 + 1] = out[p * 4 + 2] = byte;
      out[p * 4 + 3] = 255;
      for (let k = 0; k < DV_FLOYD.length; k++) {
        const nx = x + DV_FLOYD[k][0] * dir, ny = y + DV_FLOYD[k][1];
        if (nx < 0 || nx >= cols || ny >= rows) continue;
        const np = ny * cols + nx;
        if (solid[np]) values[np] += err * DV_FLOYD[k][2];
      }
    }
  }
  return out;
}
export const DV_VERTEX = `#version 300 es
in vec2 position;
out vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;
export const DV_MASK_FRAG = `#version 300 es
precision highp float;
uniform sampler2D tPrev;
uniform vec2 uSize, uFrom, uTo;
uniform float uRadius, uSoftness, uStrength, uFade, uHold;
in vec2 vUv;
out vec4 fragColor;
float strokeDistance(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 0.0001), 0.0, 1.0);
  return length(p - a - ab * h);
}
void main() {
  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uSize;
  float trail = max(texture(tPrev, vUv).r - uFade, 0.0);
  float band = max(uRadius * uSoftness, 1.0) * uHold;
  float d = strokeDistance(p, uFrom, uTo);
  trail = max(trail, clamp((uRadius - d) / band, 0.0, 1.0) * uStrength);
  fragColor = vec4(trail, 0.0, 0.0, 1.0);
}`;
export const DV_VIEW_FRAG = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D tImage, tMask, tDiffused;
uniform vec2 uResolution, uCover, uSize;
uniform float uCell, uHold, uIntro, uBurstWidth;
uniform vec3 uInk, uPaper;
uniform vec4 uBursts[4];
in vec2 vUv;
out vec4 fragColor;

float bayer(vec2 cell) {
  ivec2 p = ivec2(mod(cell, 8.0));
  int v = p.x ^ p.y;
  int m = ((v & 1) << 5) | ((p.y & 1) << 4) | ((v & 2) << 2) | ((p.y & 2) << 1) | ((v & 4) >> 1) | ((p.y & 4) >> 2);
  return (float(m) + 0.5) / 64.0;
}
vec2 imageUv(vec2 uv) { return (uv - 0.5) * uCover + 0.5; }
float within(vec2 p) { vec2 s = step(vec2(0.0), p) * step(p, vec2(1.0)); return s.x * s.y; }
float shockwave(vec2 p) {
  float value = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 burst = uBursts[i];
    if (burst.w <= 0.0) continue;
    float offset = distance(p, burst.xy) - burst.z;
    float edge = offset > 0.0 ? offset / (uBurstWidth * 0.35) : -offset / uBurstWidth;
    value = max(value, clamp(1.0 - edge, 0.0, 1.0) * burst.w);
  }
  return value;
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  vec2 cell = floor(px / uCell);
  vec2 center = (cell + 0.5) * uCell;
  vec2 cellUv = vec2(center.x / uResolution.x, 1.0 - center.y / uResolution.y);

  // Estado dithereado: tono 1-bit de Floyd-Steinberg + alfa por celda.
  vec4 d = texelFetch(tDiffused, ivec2(cell), 0);
  float framed = within(imageUv(cellUv));
  vec3 dColor = mix(uInk, uPaper, d.r);
  float dAlpha = d.a * framed;

  // Estado revelado: la foto real, con su alfa real.
  vec2 photoUv = imageUv(vUv);
  vec4 raw = texture(tImage, vec2(photoUv.x, 1.0 - photoUv.y));
  float pAlpha = raw.a * within(photoUv);

  vec2 point = vec2(cellUv.x, 1.0 - cellUv.y) * uSize;
  float mask = max(clamp(texture(tMask, cellUv).r * uHold, 0.0, 1.0), shockwave(point));
  float order = bayer(cell.yx);
  float show = step(order, mask);

  vec3 color = mix(dColor, raw.rgb, show);
  float alpha = mix(dAlpha, pAlpha, show);

  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
  float spread = length((cellUv - 0.5) * aspect) / length(aspect * 0.5);
  float appear = step(spread * 0.72 + bayer(cell + vec2(3.0, 5.0)) * 0.28, uIntro * 1.001);
  alpha *= appear;
  fragColor = vec4(color * alpha, alpha);
}`;
export function initDitherVeils() {
  document.querySelectorAll('.sherry-aux-img[data-crop]').forEach(setupDitherVeil);

  function setupDitherVeil(container) {
    const src = COMPONENT_IMAGES[container.dataset.crop];
    if (!src) return;

    // Mismos props que el ejemplo del usuario (floyd, pixelSize 2,
    // softness .6, linger 1); revealRadius bajado de 200 a 70 · el
    // original asume un contenedor de ~600px, este mide 240×174.
    const S = { pixelSize: 2, levels: 2, contrast: 1.15, brightness: 0, revealRadius: 70, softness: 0.6, linger: 1 };

    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    container.appendChild(canvas);
    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl) {
      // Sin WebGL2: la foto tal cual, sin efecto (nunca un hueco vacío).
      canvas.remove();
      const im = document.createElement('img');
      im.src = src; im.alt = ''; im.style.objectFit = 'contain';
      container.appendChild(im);
      return;
    }
    const floatMask = !!gl.getExtension('EXT_color_buffer_float');

    function program(fs) {
      const mk = (type, s) => { const sh = gl.createShader(type); gl.shaderSource(sh, s); gl.compileShader(sh); return sh; };
      const p = gl.createProgram();
      gl.attachShader(p, mk(gl.VERTEX_SHADER, DV_VERTEX));
      gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
      gl.bindAttribLocation(p, 0, 'position');
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.warn('dither veil', gl.getProgramInfoLog(p)); return null; }
      const u = {};
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) {
        const name = gl.getActiveUniform(p, i).name.replace('[0]', '');
        u[name] = gl.getUniformLocation(p, name);
      }
      return { p, u };
    }
    const maskProg = program(DV_MASK_FRAG);
    const viewProg = program(DV_VIEW_FRAG);
    if (!maskProg || !viewProg) return;

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    function texture(filter) {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    }
    const imageTex = texture(gl.LINEAR);
    const diffusedTex = texture(gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));

    function createMask(w, h) {
      const t = texture(gl.LINEAR);
      if (floatMask) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { t, fb, w, h };
    }
    function destroyMask(m) { gl.deleteFramebuffer(m.fb); gl.deleteTexture(m.t); }
    let masks = [createMask(2, 2), createMask(2, 2)];

    const sampler = document.createElement('canvas');
    const sctx = sampler.getContext('2d', { willReadFrequently: true });

    let image = null, introStart = 0, diffusedKey = '', cover = [1, 1];
    let width = 1, height = 1, dpr = 1, visible = true, raf = 0, last = performance.now();
    let trailUntil = 0, presence = 0;
    const pointer = { x: 0, y: 0, inside: false, fresh: true, placed: false };
    const brush = { x: 0, y: 0, px: 0, py: 0 };
    const bursts = [];
    const burstData = new Float32Array(DV_MAX_BURSTS * 4);

    function layout() {
      width = Math.max(1, container.clientWidth);
      height = Math.max(1, container.clientHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const mw = Math.max(2, Math.round(width * DV_MASK_SCALE));
      const mh = Math.max(2, Math.round(height * DV_MASK_SCALE));
      if (mw !== masks[0].w || mh !== masks[0].h) {
        masks.forEach(destroyMask);
        masks = [createMask(mw, mh), createMask(mw, mh)];
      }
      if (!pointer.placed) { pointer.x = width / 2; pointer.y = height / 2; }
    }

    // fit 'contain', igual que el default del original.
    function fitScale(w, h, iw, ih) {
      const ratio = w / h / (iw / ih);
      return ratio > 1 ? [ratio, 1] : [1, 1 / ratio];
    }

    function updateDiffusion(cell) {
      const cols = Math.ceil(canvas.width / cell), rows = Math.ceil(canvas.height / cell);
      const key = [cols, rows, canvas.width, canvas.height].join('|');
      if (key === diffusedKey) return;
      diffusedKey = key;
      const [cx, cy] = cover;
      const iw = image.naturalWidth, ih = image.naturalHeight;
      sampler.width = cols; sampler.height = rows;
      sctx.clearRect(0, 0, cols, rows);
      sctx.imageSmoothingEnabled = true;
      sctx.imageSmoothingQuality = 'high';
      const sx = (0.5 - 0.5 * cx) * iw, sy = (0.5 - 0.5 * cy) * ih;
      const sw = ((cols * cell) / canvas.width) * cx * iw, sh = ((rows * cell) / canvas.height) * cy * ih;
      const x0 = Math.max(sx, 0), y0 = Math.max(sy, 0), x1 = Math.min(sx + sw, iw), y1 = Math.min(sy + sh, ih);
      if (x1 > x0 && y1 > y0) {
        sctx.drawImage(image, x0, y0, x1 - x0, y1 - y0,
          ((x0 - sx) / sw) * cols, ((y0 - sy) / sh) * rows, ((x1 - x0) / sw) * cols, ((y1 - y0) / sh) * rows);
      }
      const grade = v => Math.pow(Math.min(1, Math.max(0, (v - 0.5) * S.contrast + 0.5 + S.brightness)), 1.6);
      const out = dvDiffuse(sctx.getImageData(0, 0, cols, rows).data, cols, rows, S.levels, grade);
      gl.bindTexture(gl.TEXTURE_2D, diffusedTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, out);
    }

    function hexToRgb(hex) {
      let h = String(hex || '').replace('#', '');
      if (h.length === 3) h = h.replace(/./g, c => c + c);
      const n = parseInt(h.slice(0, 6), 16);
      return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    }

    function frame(now) {
      raf = 0;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      presence += ((pointer.inside ? 1 : 0) - presence) * (1 - Math.exp(-dt / 0.16));
      if (pointer.fresh) {
        brush.x = brush.px = pointer.x; brush.y = brush.py = pointer.y;
        pointer.fresh = false;
      } else {
        const follow = 1 - Math.exp(-dt / 0.035);
        brush.x += (pointer.x - brush.x) * follow;
        brush.y += (pointer.y - brush.y) * follow;
      }

      burstData.fill(0);
      for (let i = bursts.length - 1; i >= 0; i--) {
        if ((now - bursts[i].start) / 1000 >= DV_BURST_SECONDS) bursts.splice(i, 1);
      }
      const burstWidth = Math.max(60, S.revealRadius * 0.9);
      bursts.forEach((b, i) => {
        const k = Math.max(0, (now - b.start) / 1000 / DV_BURST_SECONDS);
        const reach = Math.hypot(Math.max(b.x, width - b.x), Math.max(b.y, height - b.y)) + burstWidth;
        burstData[i * 4] = b.x; burstData[i * 4 + 1] = b.y;
        burstData[i * 4 + 2] = reach * Math.sin((k * Math.PI) / 2);
        burstData[i * 4 + 3] = 1 - k * k * k;
      });

      if (presence > 0.002) trailUntil = now + S.linger * 1000 + 150;

      // Pase 1: cortina (ping-pong).
      const minFade = floatMask ? 0 : 1.5 / 255;
      const fade = S.linger > 0 ? dt / S.linger : 1;
      gl.bindVertexArray(vao);
      gl.disable(gl.BLEND);
      gl.useProgram(maskProg.p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, masks[1].fb);
      gl.viewport(0, 0, masks[1].w, masks[1].h);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, masks[0].t);
      gl.uniform1i(maskProg.u.tPrev, 0);
      gl.uniform2f(maskProg.u.uSize, width, height);
      gl.uniform2f(maskProg.u.uFrom, brush.px, brush.py);
      gl.uniform2f(maskProg.u.uTo, brush.x, brush.y);
      gl.uniform1f(maskProg.u.uRadius, S.revealRadius * (0.45 + 0.55 * presence));
      gl.uniform1f(maskProg.u.uSoftness, S.softness);
      gl.uniform1f(maskProg.u.uStrength, presence);
      gl.uniform1f(maskProg.u.uFade, Math.max(fade, minFade));
      gl.uniform1f(maskProg.u.uHold, DV_HOLD);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      masks.reverse();
      brush.px = brush.x; brush.py = brush.y;

      // Pase 2: vista.
      const cell = Math.max(1, Math.round(S.pixelSize * dpr));
      if (image) {
        cover = fitScale(canvas.width, canvas.height, image.naturalWidth, image.naturalHeight);
        updateDiffusion(cell);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(viewProg.p);
      const U = viewProg.u;
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, imageTex); gl.uniform1i(U.tImage, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, masks[0].t); gl.uniform1i(U.tMask, 1);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, diffusedTex); gl.uniform1i(U.tDiffused, 2);
      gl.uniform2f(U.uResolution, canvas.width, canvas.height);
      gl.uniform2f(U.uCover, cover[0], cover[1]);
      gl.uniform2f(U.uSize, width, height);
      gl.uniform1f(U.uCell, cell);
      gl.uniform1f(U.uHold, DV_HOLD);
      gl.uniform1f(U.uBurstWidth, burstWidth);
      gl.uniform4fv(U.uBursts, burstData);
      // Tinta = tono oscuro, papel = tono claro, en ambos modos.
      gl.uniform3fv(U.uInk, hexToRgb(cssVar(isLight ? '--text' : '--bg3')));
      gl.uniform3fv(U.uPaper, hexToRgb(cssVar(isLight ? '--bg3' : '--text')));
      const intro = image ? Math.min(1, (now - introStart) / DV_INTRO_MS) : 0;
      gl.uniform1f(U.uIntro, 1 - Math.pow(1 - intro, 2));
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      const busy = pointer.inside || presence > 0.002 || bursts.length > 0 || now < trailUntil || (image && intro < 1);
      if (busy && visible) raf = requestAnimationFrame(frame);
    }

    function wake() {
      if (raf || !visible) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    container._dvWake = wake;

    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      image = img;
      gl.bindTexture(gl.TEXTURE_2D, imageTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      introStart = reduceMotion.matches ? performance.now() - DV_INTRO_MS : performance.now();
      wake();
    };
    img.src = src;

    function locate(e) {
      const r = container.getBoundingClientRect();
      pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; pointer.placed = true;
    }
    function onMove(e) {
      locate(e);
      if (!pointer.inside) { pointer.inside = true; pointer.fresh = true; }
      wake();
    }
    function onLeave() { pointer.inside = false; wake(); }
    function onDown(e) {
      onMove(e);
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      bursts.push({ x: pointer.x, y: pointer.y, start: performance.now() });
      if (bursts.length > DV_MAX_BURSTS) bursts.shift();
    }
    container.addEventListener('pointermove', onMove, { passive: true });
    container.addEventListener('pointerenter', onMove, { passive: true });
    container.addEventListener('pointerdown', onDown, { passive: true });
    container.addEventListener('pointerleave', onLeave, { passive: true });
    container.addEventListener('pointercancel', onLeave, { passive: true });

    new ResizeObserver(() => { layout(); diffusedKey = ''; wake(); }).observe(container);
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; wake(); }).observe(container);

    layout();
    wake();
  }
}
