// ══════════════════════════════════════════════════════
// CAPA 2 · Light Rays: rayos de sol fijos desde arriba
// (React Bits "LightRays" · es OGL, no Three.js: su shader ya
// es GLSL plano, mismo patrón que el Shader Lens de abajo, así
// que el fragment shader es un puerto casi literal. Se fija el
// origen a "top-center" siempre · Apolo es el dios del sol, los
// rayos vienen de arriba · y se quita la rama "lightMode" del
// original (tonemap a tinta sobre blanco: no aplica, apolo ya
// tiene su propio claro/oscuro). "Luz constante en toda la
// vista no importa el scroll" ya lo resuelve position:fixed,
// igual que cada otra capa de fondo de este archivo.
// ══════════════════════════════════════════════════════
import { hexToRgb } from './sky.js';
import { cssVar } from './kit.js';

export function initRays() {
  const canvas = document.getElementById('ap-rays');
  // premultipliedAlpha:false · ver comentario largo en initRipple().
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false });
  if (!gl) return null;

  const vsSrc = `attribute vec2 aPos; void main(){ gl_Position = vec4(aPos,0.0,1.0); }`;
  const fsSrc = `
    precision highp float;
    uniform float uTime;
    uniform vec2  uResolution;
    uniform vec2  uRayPos;
    uniform vec2  uRayDir;
    uniform vec3  uRaysColor;
    uniform float uRaysSpeed;
    uniform float uLightSpread;
    uniform float uRayLength;
    uniform float uFadeDistance;
    uniform vec2  uMouse;
    uniform float uMouseInfluence;
    uniform float uNoiseAmount;
    uniform float uDistortion;
    uniform float uOpacity;

    float noise(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }

    float rayStrength(vec2 raySource, vec2 rayRefDir, vec2 coord, float seedA, float seedB, float speed) {
      vec2 toCoord = coord - raySource;
      vec2 dirNorm = normalize(toCoord);
      float cosAngle = dot(dirNorm, rayRefDir);
      float distortedAngle = cosAngle + uDistortion * sin(uTime * 2.0 + length(toCoord) * 0.01) * 0.2;
      float spreadFactor = pow(max(distortedAngle, 0.0), 1.0 / max(uLightSpread, 0.001));
      float dist = length(toCoord);
      float maxDistance = uResolution.x * uRayLength;
      float lengthFalloff = clamp((maxDistance - dist) / maxDistance, 0.0, 1.0);
      float fadeFalloff = clamp((uResolution.x * uFadeDistance - dist) / (uResolution.x * uFadeDistance), 0.5, 1.0);
      float baseStrength = clamp(
        (0.45 + 0.15 * sin(distortedAngle * seedA + uTime * speed)) +
        (0.3 + 0.2 * cos(-distortedAngle * seedB + uTime * speed)),
        0.0, 1.0
      );
      return baseStrength * lengthFalloff * fadeFalloff * spreadFactor;
    }

    void main() {
      vec2 coord = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
      vec2 finalDir = uRayDir;
      if (uMouseInfluence > 0.0) {
        vec2 mouseScreen = uMouse * uResolution;
        vec2 mouseDir = normalize(mouseScreen - uRayPos);
        finalDir = normalize(mix(uRayDir, mouseDir, uMouseInfluence));
      }
      float r1 = rayStrength(uRayPos, finalDir, coord, 36.2214, 21.11349, 1.5 * uRaysSpeed);
      float r2 = rayStrength(uRayPos, finalDir, coord, 22.3991, 18.0234, 1.1 * uRaysSpeed);
      float strength = r1 * 0.5 + r2 * 0.4;
      if (uNoiseAmount > 0.0) {
        float n = noise(coord * 0.01 + uTime * 0.1);
        strength *= (1.0 - uNoiseAmount + uNoiseAmount * n);
      }
      float brightness = 0.5 + 0.5 * (1.0 - coord.y / uResolution.y);
      vec3 col = uRaysColor * strength * brightness;
      gl_FragColor = vec4(col, strength * uOpacity);
    }
  `;

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return sh;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  // Sin blend: cada frame limpia a transparente y dibuja UN solo quad
  // · no hay nada debajo con qué mezclar. Con blend prendido,
  // SRC_ALPHA/ONE_MINUS_SRC_ALPHA multiplica el RGB por el alpha (y el
  // alpha por sí mismo) igual, apagando el color y el alpha reales ·
  // bug real encontrado con readPixels comparando el mismo shader con
  // y sin blend. Mismo fix en initLens() más abajo.

  const u = {
    time: gl.getUniformLocation(prog, 'uTime'),
    res: gl.getUniformLocation(prog, 'uResolution'),
    pos: gl.getUniformLocation(prog, 'uRayPos'),
    dir: gl.getUniformLocation(prog, 'uRayDir'),
    col: gl.getUniformLocation(prog, 'uRaysColor'),
    speed: gl.getUniformLocation(prog, 'uRaysSpeed'),
    spread: gl.getUniformLocation(prog, 'uLightSpread'),
    len: gl.getUniformLocation(prog, 'uRayLength'),
    fade: gl.getUniformLocation(prog, 'uFadeDistance'),
    mouse: gl.getUniformLocation(prog, 'uMouse'),
    mouseInf: gl.getUniformLocation(prog, 'uMouseInfluence'),
    noiseAmt: gl.getUniformLocation(prog, 'uNoiseAmount'),
    dist: gl.getUniformLocation(prog, 'uDistortion'),
    op: gl.getUniformLocation(prog, 'uOpacity'),
  };

  let mx = 0.5, my = 0.2;
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  function render(ts) {
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const rgb = hexToRgb(cssVar('--gold-lt'));
    gl.uniform1f(u.time, ts * 0.001);
    gl.uniform2f(u.res, canvas.width, canvas.height);
    gl.uniform2f(u.pos, canvas.width * 0.5, -0.2 * canvas.height);
    gl.uniform2f(u.dir, 0, 1);
    gl.uniform3f(u.col, ...rgb);
    gl.uniform1f(u.speed, 0.35);
    // spread 0.55→1.4: con 0.55 el cono era angosto (exponente 1/0.55≈1.8
    // en spreadFactor), casi todo el ancho de pantalla quedaba fuera del
    // haz · confirmado con diff de screenshots, no solo a ojo. 1.4 abre
    // el cono lo suficiente para cubrir bastante más del viewport.
    gl.uniform1f(u.spread, 1.4);
    gl.uniform1f(u.len, 1.6);
    gl.uniform1f(u.fade, 1.0);
    gl.uniform2f(u.mouse, mx, my);
    gl.uniform1f(u.mouseInf, 0.12);
    gl.uniform1f(u.noiseAmt, 0.08);
    gl.uniform1f(u.dist, 0.12);
    gl.uniform1f(u.op, 0.85);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  render(0);
  return {
    render,
    setMouse: (x, y) => { mx = x / window.innerWidth; my = y / window.innerHeight; },
  };
}
