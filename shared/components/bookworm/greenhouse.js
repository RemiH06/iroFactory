// ══════════════════════════════════════════════════════
// INVERNADERO · un solo juego de capas para todo el tema. Retícula
// isométrica, komorebi y madera con agujeros son las del tema
// original (la madera pasa de SVG a canvas para poder copiarla); las
// hojas (claro) y la lluvia (noche) se quedan igual. Nuevo: Side Rays
// (React Bits) entre la madera y las hojas, luz entrando por el vidrio.
// ══════════════════════════════════════════════════════
import { $, cssVar, hexRgb, isDark, reduceMotion } from './kit.js';

export const Greenhouse = (() => {
  const tri = $('#bw-tri'), light = $('#bw-light'), wood = $('#bw-wood'), raysCv = $('#bw-rays'), parts = $('#bw-parts');
  const tc = tri.getContext('2d'), lc = light.getContext('2d'), wc = wood.getContext('2d'), pc = parts.getContext('2d');
  let W = 1, H = 1, holes = null, particles = [], bgFill = '#E8E0D0';

  function buildTri() {
    tri.width = W; tri.height = H; tc.clearRect(0, 0, W, H);
    const s = 48, h = 83.14, hh = 41.57, cols = Math.ceil(W / s) + 2, rows = Math.ceil(H / h) + 2;
    tc.strokeStyle = cssVar('--gh-line'); tc.lineWidth = 1.5; tc.globalAlpha = isDark ? 0.3 : 0.2;
    for (let r = 0; r < rows; r++) {
      const y = r * h - h;
      [y, y + hh, y + h].forEach(ly => { tc.beginPath(); tc.moveTo(-s, ly); tc.lineTo(W + s, ly); tc.stroke(); });
      for (let c = 0; c < cols; c++) {
        const x = c * s - s;
        tc.beginPath(); tc.moveTo(x, y); tc.lineTo(x + s / 2, y + hh); tc.lineTo(x + s, y); tc.stroke();
        tc.beginPath(); tc.moveTo(x, y + h); tc.lineTo(x + s / 2, y + hh); tc.lineTo(x + s, y + h); tc.stroke();
      }
    }
    tc.globalAlpha = 1;
  }
  function buildLight() {
    light.width = W; light.height = H; lc.clearRect(0, 0, W, H);
    const lights = isDark ? [
      { x: .30, y: .15, r: .40, a: .50, rgb: '180,210,250' }, { x: .75, y: .40, r: .32, a: .40, rgb: '160,190,240' }, { x: .50, y: .72, r: .36, a: .35, rgb: '180,210,250' },
    ] : [
      { x: .12, y: .08, r: .42, a: .50, rgb: '250,220,100' }, { x: .68, y: .06, r: .32, a: .45, rgb: '250,210,80' }, { x: .38, y: .42, r: .48, a: .48, rgb: '250,225,110' },
      { x: .82, y: .62, r: .30, a: .40, rgb: '240,200,80' }, { x: .22, y: .78, r: .35, a: .42, rgb: '250,215,90' }, { x: .55, y: .25, r: .25, a: .38, rgb: '250,230,120' },
    ];
    lights.forEach(({ x, y, r, a, rgb }) => {
      const cx = x * W, cy = y * H, rad = r * Math.min(W, H);
      const g = lc.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(.5, `rgba(${rgb},${(a * .3).toFixed(3)})`); g.addColorStop(1, `rgba(${rgb},0)`);
      lc.fillStyle = g; lc.fillRect(0, 0, W, H);
    });
  }
  // Los agujeros se sortean una vez por tamaño de pantalla: cambiar de
  // modo ya no los mueve de lugar (antes se resorteaban en cada toggle).
  function buildWood() {
    wood.width = W; wood.height = H;
    if (!holes || holes.W !== W || holes.H !== H) {
      const r = 100;
      holes = { W, H, list: Array.from({ length: 20 }, () => ({ cx: r + Math.random() * Math.max(1, W - r * 2), cy: r + Math.random() * Math.max(1, H - r * 2), r })) };
    }
    wc.globalCompositeOperation = 'source-over'; wc.clearRect(0, 0, W, H);
    wc.fillStyle = cssVar('--gh-wood'); wc.fillRect(0, 0, W, H);
    wc.globalCompositeOperation = 'destination-out';
    holes.list.forEach(h => { wc.beginPath(); wc.arc(h.cx, h.cy, h.r, 0, Math.PI * 2); wc.fill(); });
    wc.globalCompositeOperation = 'source-over';
  }

  // ── Side Rays (React Bits) · el original es OGL: un triángulo de
  // pantalla completa y un fragment shader. Mismo GLSL, mismos
  // parámetros por defecto salvo velocidad, intensidad y opacidad
  // (más quietos: es luz de invernadero, no de escenario). Colores de
  // los tokens --gh-ray1/--gh-ray2: sol ámbar de día, luna fría de noche.
  const rays = (() => {
    const gl = raysCv.getContext('webgl', { alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) return null;
    const vs = `attribute vec2 position; void main(){ gl_Position = vec4(position, 0.0, 1.0); }`;
    const fs = `precision highp float;
uniform float iTime; uniform vec2 iResolution; uniform float iSpeed; uniform vec3 iRayColor1; uniform vec3 iRayColor2;
uniform float iIntensity; uniform float iSpread; uniform float iFlipX; uniform float iFlipY; uniform float iTilt;
uniform float iSaturation; uniform float iBlend; uniform float iFalloff; uniform float iOpacity;
float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord, float seedA, float seedB, float speed) {
  vec2 sourceToCoord = coord - raySource;
  float cosAngle = dot(normalize(sourceToCoord), rayRefDirection);
  return clamp((0.45 + 0.15 * sin(cosAngle * seedA + iTime * speed)) + (0.3 + 0.2 * cos(-cosAngle * seedB + iTime * speed)), 0.0, 1.0) *
    clamp((iResolution.x - length(sourceToCoord)) / iResolution.x, 0.5, 1.0);
}
void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  if (iFlipX > 0.5) fragCoord.x = iResolution.x - fragCoord.x;
  if (iFlipY > 0.5) fragCoord.y = iResolution.y - fragCoord.y;
  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
  vec2 rayPos = vec2(iResolution.x * 1.1, -0.5 * iResolution.y);
  float tiltRad = iTilt * 3.14159265 / 180.0;
  float cs = cos(tiltRad); float sn = sin(tiltRad);
  vec2 rel = coord - rayPos;
  vec2 tiltedCoord = vec2(rel.x * cs - rel.y * sn, rel.x * sn + rel.y * cs) + rayPos;
  float halfSpread = iSpread * 0.275;
  vec2 rayRefDir1 = normalize(vec2(cos(0.785398 + halfSpread), sin(0.785398 + halfSpread)));
  vec2 rayRefDir2 = normalize(vec2(cos(0.785398 - halfSpread), sin(0.785398 - halfSpread)));
  vec4 rays1 = vec4(iRayColor1, 1.0) * rayStrength(rayPos, rayRefDir1, tiltedCoord, 36.2214, 21.11349, iSpeed);
  vec4 rays2 = vec4(iRayColor2, 1.0) * rayStrength(rayPos, rayRefDir2, tiltedCoord, 22.3991, 18.0234, iSpeed * 0.2);
  vec4 color = rays1 * (1.0 - iBlend) * 0.9 + rays2 * iBlend * 0.9;
  float distanceToLight = length(fragCoord.xy - vec2(rayPos.x, iResolution.y - rayPos.y)) / iResolution.y;
  float brightness = iIntensity * 0.4 / pow(max(distanceToLight, 0.001), iFalloff);
  color.rgb *= brightness;
  float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  color.rgb = mix(vec3(gray), color.rgb, iSaturation);
  color.a = max(color.r, max(color.g, color.b)) * iOpacity;
  gl_FragColor = color;
}`;
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'position'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {}; ['iTime', 'iResolution', 'iSpeed', 'iRayColor1', 'iRayColor2', 'iIntensity', 'iSpread', 'iFlipX', 'iFlipY', 'iTilt', 'iSaturation', 'iBlend', 'iFalloff', 'iOpacity'].forEach(n => U[n] = gl.getUniformLocation(prog, n));
    const P = { speed: 1.2, spread: 2, tilt: 0, saturation: 1.2, blend: .75, falloff: 1.6 };
    gl.uniform1f(U.iSpeed, P.speed); gl.uniform1f(U.iSpread, P.spread); gl.uniform1f(U.iFlipX, 0); gl.uniform1f(U.iFlipY, 0);
    gl.uniform1f(U.iTilt, P.tilt); gl.uniform1f(U.iSaturation, P.saturation); gl.uniform1f(U.iBlend, P.blend); gl.uniform1f(U.iFalloff, P.falloff);
    function colors() {
      const a = hexRgb(cssVar('--gh-ray1')).map(v => v / 255), b = hexRgb(cssVar('--gh-ray2')).map(v => v / 255);
      gl.uniform3f(U.iRayColor1, a[0], a[1], a[2]); gl.uniform3f(U.iRayColor2, b[0], b[1], b[2]);
      // Día: mezcla normal y opacidad baja (con screen el ámbar sobre beige no se veía).
      gl.uniform1f(U.iIntensity, isDark ? 1.5 : 1.4); gl.uniform1f(U.iOpacity, isDark ? .55 : .32);
    }
    return {
      resize(w, h) { raysCv.width = w; raysCv.height = h; gl.viewport(0, 0, w, h); gl.uniform2f(U.iResolution, w, h); },
      colors,
      render(t) { gl.uniform1f(U.iTime, t * 0.001); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3); },
    };
  })();

  // ── Cielo: la capa más profunda, visible por los agujeros de la madera
  // detrás de la retícula y el komorebi. Ghost Fibers (React Bits, OGL) en
  // los dos modos: de día la rama clara del original, de noche la oscura
  // (suma de líneas y brillo). Era WebGL2: traducido a GLSL ES 1.0 con la
  // misma fórmula. Cambios: (1) fondo = --bg del modo (el original usaba
  // blanco puro de día y un morado casi negro de noche); (2) las fibras
  // van del color del brillo (de día --ochre, de noche la luna --gh-ray1),
  // más capas y escala menor para que se vean más por los agujeros.
  const skyCv = $('#bw-sky');
  // Media resolución: las fibras son suaves y solo asoman por los agujeros,
  // así el shader cuesta ~4 veces menos por cuadro. El CSS lo estira.
  const SKY_RES = .5;
  const sky = (() => {
    const gl = skyCv.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: true });
    if (!gl) return null;
    const vs = `attribute vec2 position; void main(){ gl_Position = vec4(position, 0.0, 1.0); }`;
    const fs = `precision highp float;
uniform vec2 uResolution; uniform float uTime; uniform float uSpeed; uniform float uScale; uniform float uRotation; uniform float uLayers;
uniform float uWaveAmplitude; uniform float uWaveFrequency; uniform float uWaveSpeed; uniform float uLayerSpeed; uniform float uTwist;
uniform float uTwistFrequency; uniform float uTwistSpeed; uniform float uLineFrequency; uniform float uLineSpacing; uniform float uLineSharpness;
uniform float uGlowFalloff; uniform float uGlowIntensity; uniform float uBrightness; uniform float uBlueBoost; uniform float uVignette; uniform float uGrain;
uniform float uRotationSpeed; uniform float uLightMode; uniform vec3 uLineColor; uniform vec3 uGlowColor; uniform vec3 uBackdrop;
uniform float uFiberMix; uniform float uFiberInk; uniform float uNightGain;
#define MAX_LAYERS 10
mat2 rotate2d(float angle) { float sine = sin(angle); float cosine = cos(angle); return mat2(cosine, -sine, sine, cosine); }
float grainHash(vec2 point) { point = floor(point); float hash = 52.9829189 * fract(dot(point, vec2(0.065, 0.005))); return fract(hash); }
float layeredGrain(vec2 fragmentPixel) {
  vec2 point = mod(fragmentPixel + vec2(uTime * 30.0, -uTime * 21.0), 1024.0);
  vec2 rotated = mat2(0.8, -0.5, 0.5, 0.8) * point;
  float grain = 0.0;
  grain += 0.40 * grainHash(rotated); grain += 0.25 * grainHash(rotated * 2.0 + 17.0); grain += 0.20 * grainHash(rotated * 4.0 + 47.0);
  grain += 0.10 * grainHash(rotated * 8.0 + 113.0); grain += 0.05 * grainHash(rotated * 16.0 + 191.0);
  return grain;
}
void main() {
  vec2 resolution = max(uResolution, vec2(1.0));
  vec2 uv = (2.0 * gl_FragCoord.xy - resolution) / resolution.y;
  float time = uTime * uSpeed;
  vec3 backdrop = uBackdrop;
  vec3 centerTone = max(uLineColor * 0.85567 - uGlowColor * 0.06186, vec3(0.0));
  vec3 cloudTone = uLineColor * 0.19588 + uGlowColor * 0.2268;
  vec2 p = uv / max(uScale, 0.05);
  p = rotate2d(radians(uRotation) + time * uRotationSpeed) * p;
  vec3 color = vec3(0.0);
  float fiberField = 0.0;
  for (int index = 0; index < MAX_LAYERS; index++) {
    float fi = float(index) + 1.0;
    if (fi > uLayers) break;
    p += uWaveAmplitude * sin(p.yx * fi * uWaveFrequency + time * (uWaveSpeed + fi * uLayerSpeed));
    float radius = length(p);
    float polarAngle = atan(p.y, p.x);
    polarAngle += sin(radius * uTwistFrequency - time * uTwistSpeed + fi) * uTwist;
    p = vec2(cos(polarAngle), sin(polarAngle)) * radius;
    float lines = abs(sin(p.x * (uLineFrequency + fi * uLineSpacing) + sin(p.y * 3.0 + time)));
    lines = pow(max(0.0, 1.0 - lines), uLineSharpness);
    fiberField += lines / fi;
    color += uLineColor * lines / fi;
    float glow = exp(-uGlowFalloff * abs(sin(p.x * 3.0 + time + fi)));
    color += uGlowColor * glow * uGlowIntensity / (fi * 2.0);
  }
  float center = exp(-2.2 * dot(uv, uv));
  color += centerTone * center;
  float cloud = exp(-1.5 * length(uv + vec2(sin(time * 0.3) * 0.25, cos(time * 0.25) * 0.18)));
  color += cloudTone * cloud;
  float vignette = 1.0 - smoothstep(0.35, 1.45, length(uv));
  color *= mix(1.0 - uVignette, 1.0, vignette);
  color = 1.0 - exp(-color * uBrightness);
  color.b *= uBlueBoost;
  vec3 outputColor;
  if (uLightMode > 0.5) {
    float edgeFade = mix(1.0 - uVignette, 1.0, vignette);
    float fibers = pow(smoothstep(0.12, 1.05, fiberField) * edgeFade, 1.5);
    float atmosphere = (center * 0.025 + cloud * 0.015) * edgeFade;
    vec3 fiberInk = mix(backdrop, uLineColor, uFiberInk);
    vec3 airColor = mix(backdrop, uGlowColor, 0.16);
    outputColor = mix(backdrop, airColor, atmosphere);
    outputColor = mix(outputColor, fiberInk, min(1.0, fibers * uFiberMix));
  } else {
    outputColor = backdrop + color * uNightGain;
  }
  float noise = (layeredGrain(gl_FragCoord.xy) - 0.5) * uGrain;
  gl_FragColor = vec4(clamp(outputColor + noise, 0.0, 0.97), 1.0);
}`;
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
    const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const pl = gl.getAttribLocation(prog, 'position'); gl.enableVertexAttribArray(pl); gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 0, 0);
    const U = {}; const u = n => (U[n] === undefined ? (U[n] = gl.getUniformLocation(prog, n)) : U[n]);
    // Valores por defecto del original salvo: capas 4→5 y escala 2→1.4 (más
    // fibras sin saturar; con 7 y 1.1 eran demasiadas y el loop se trababa), mezcla de fibras .3→1 y tinta .52→.8 de día (solo asoman por
    // los agujeros, detrás del komorebi). De noche: la suma aditiva va a
    // .42 (uNightGain) para que el título enmascarado y el vidrio de las
    // ventanas sigan en contraste; brillo e intensidad
    // más bajos para que la suma aditiva no tape el bosque nocturno.
    Object.entries({ uSpeed: .2, uScale: 1.4, uRotation: 0, uRotationSpeed: .25, uLayers: 5, uWaveAmplitude: .015, uWaveFrequency: 3, uWaveSpeed: .15, uLayerSpeed: .08, uTwist: .1, uTwistFrequency: 5, uTwistSpeed: 1.2, uLineFrequency: 5, uLineSpacing: 2, uLineSharpness: 16, uGlowFalloff: 10, uVignette: .8, uGrain: .05, uFiberMix: 1, uFiberInk: .8, uNightGain: .42 }).forEach(([k, v]) => gl.uniform1f(u(k), v));
    let w = 1, h = 1;
    return {
      resize(nw, nh) { w = Math.ceil(nw * SKY_RES); h = Math.ceil(nh * SKY_RES); skyCv.width = w; skyCv.height = h; gl.viewport(0, 0, w, h); },
      render(t) {
        const rgb = n => hexRgb(cssVar(n)).map(v => v / 255);
        const bg = rgb('--bg'), line = rgb(isDark ? '--gh-ray1' : '--ochre'), glow = rgb(isDark ? '--gh-ray1' : '--ochre');
        gl.uniform2f(u('uResolution'), w, h); gl.uniform1f(u('uTime'), t * 0.001);
        gl.uniform1f(u('uLightMode'), isDark ? 0 : 1);
        gl.uniform1f(u('uGlowIntensity'), isDark ? .55 : 1.6); gl.uniform1f(u('uBrightness'), isDark ? .9 : 2); gl.uniform1f(u('uBlueBoost'), isDark ? 1 : 1.25);
        gl.uniform3f(u('uLineColor'), line[0], line[1], line[2]); gl.uniform3f(u('uGlowColor'), glow[0], glow[1], glow[2]);
        gl.uniform3f(u('uBackdrop'), bg[0], bg[1], bg[2]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
    };
  })();

  // Hojas (claro) y lluvia (noche): mismas reglas del tema original.
  const LEAF = ['#6A8050', '#8A6040', '#B08030', '#C89040', '#4A6040'];
  const makeLeaf = (y = -20) => ({ type: 'leaf', x: Math.random() * W, y, vx: (Math.random() - .5) * .8, vy: .4 + Math.random() * .6, angle: Math.random() * Math.PI * 2, vAngle: (Math.random() - .5) * .04, size: 5 + Math.random() * 8, sway: Math.random() * Math.PI * 2, swaySpeed: .01 + Math.random() * .02, color: LEAF[Math.floor(Math.random() * 5)], alpha: .4 + Math.random() * .4 });
  const makeRain = (y = -10) => ({ type: 'rain', x: Math.random() * W, y, vy: 7 + Math.random() * 5, vx: -.8 + Math.random() * .4, len: 10 + Math.random() * 14, alpha: .06 + Math.random() * .12 });
  function drawParts(step) {
    pc.clearRect(0, 0, W, H);
    if (step) {
      if (isDark) { if (Math.random() < .55) particles.push(makeRain()); }
      else if (Math.random() < .04) particles.push(makeLeaf());
    }
    particles = particles.filter(p => {
      if (p.type === 'leaf') {
        if (step) { p.sway += p.swaySpeed; p.x += p.vx + Math.sin(p.sway) * .5; p.y += p.vy; p.angle += p.vAngle; }
        pc.save(); pc.translate(p.x, p.y); pc.rotate(p.angle); pc.globalAlpha = p.alpha; pc.fillStyle = p.color;
        pc.beginPath(); pc.ellipse(0, 0, p.size, p.size * .5, 0, 0, Math.PI * 2); pc.fill(); pc.restore();
      } else {
        if (step) { p.x += p.vx; p.y += p.vy; }
        pc.save(); pc.strokeStyle = '#8AB0C8'; pc.globalAlpha = p.alpha; pc.lineWidth = .8; pc.beginPath();
        pc.moveTo(p.x, p.y); pc.lineTo(p.x + p.vx * 2, p.y + p.len); pc.stroke(); pc.restore();
      }
      return p.y < H + 20;
    });
    pc.globalAlpha = 1;
  }
  // Con reduced-motion: un puñado de hojas/gotas quietas, sin loop.
  function stillParts() { particles = Array.from({ length: isDark ? 60 : 14 }, () => isDark ? makeRain(Math.random() * H) : makeLeaf(Math.random() * H)); drawParts(false); }

  function rebuild() {
    W = window.innerWidth; H = window.innerHeight; bgFill = cssVar('--bg');
    parts.width = W; parts.height = H;
    buildTri(); buildLight(); buildWood();
    if (rays) { rays.resize(W, H); rays.colors(); }
    if (sky) { sky.resize(W, H); sky.render(0); }
    if (reduceMotion.matches) { stillParts(); if (rays) rays.render(0); if (sky) sky.render(0); }
  }
  // Copia la región de pantalla (x, y, w, h) del invernadero a otro canvas.
  function blit(ctx, x, y, w, h) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = bgFill; ctx.fillRect(0, 0, w, h);
    if (sky) ctx.drawImage(skyCv, x * SKY_RES, y * SKY_RES, w * SKY_RES, h * SKY_RES, 0, 0, w, h);
    ctx.drawImage(tri, x, y, w, h, 0, 0, w, h);
    ctx.drawImage(light, x, y, w, h, 0, 0, w, h);
    ctx.drawImage(wood, x, y, w, h, 0, 0, w, h);
    if (rays) { ctx.globalCompositeOperation = isDark ? 'screen' : 'source-over'; ctx.drawImage(raysCv, x, y, w, h, 0, 0, w, h); ctx.globalCompositeOperation = 'source-over'; }
    ctx.drawImage(parts, x, y, w, h, 0, 0, w, h);
  }
  return {
    rebuild, blit,
    frame(t) { if (!reduceMotion.matches) { drawParts(true); if (rays) rays.render(t); if (sky) sky.render(t); } },
    get size() { return [W, H]; },
  };
})();
