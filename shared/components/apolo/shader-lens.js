// ══════════════════════════════════════════════════════
// CAPA 6 · Shader lens: lente de refracción en WebGL crudo,
// sin Three.js (motion.dev "js-three-uniforms" / "Shader Lens",
// reconstruido desde el concepto: uniforms de puntero animando
// una distorsión en un ShaderMaterial). Magnifica y distorsiona
// una banda vertical procedural · mismo ritmo/paleta que el
// lienzo real · solo dentro del radio del lente; fuera de ahí es
// 100% transparente y se ve el fondo real sin tocar.
// ══════════════════════════════════════════════════════
import { COL_GAP, hexToRgb, skyStops } from './sky.js';

export function initLens() {
  const canvas = document.getElementById('ap-lens');
  // premultipliedAlpha:false · ver comentario largo en initRipple().
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false });
  if (!gl) return null;

  const vsSrc = `
    attribute vec2 aPos;
    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
  `;
  const fsSrc = `
    precision mediump float;
    uniform vec2  uResolution;
    uniform vec2  uMouse;
    uniform float uRadius;
    uniform vec3  uColA;
    uniform vec3  uColB;
    uniform vec3  uColC;
    uniform float uGap;

    vec3 stripe(vec2 p) {
      float t = mod(p.x, uGap * 2.0) / (uGap * 2.0);
      vec3 c = mix(uColA, uColB, smoothstep(0.0, 0.5, t));
      c = mix(c, uColC, smoothstep(0.5, 1.0, t));
      float line = smoothstep(0.0, 1.5, mod(p.x, uGap));
      return c * (0.92 + 0.08 * line);
    }

    void main() {
      vec2 fc = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
      vec2 toMouse = fc - uMouse;
      float dist = length(toMouse);
      if (dist > uRadius) { discard; }
      float strength = 1.0 - dist / uRadius;
      float zoom = 1.0 - 0.4 * smoothstep(0.0, 1.0, strength);
      vec2 sampleP = uMouse + toMouse * zoom;
      vec3 col = stripe(sampleP);
      float edge = smoothstep(1.0, 0.85, dist / uRadius);
      gl_FragColor = vec4(col, edge * 0.92);
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

  // Sin blend · ver comentario largo en initRays(): mismo bug, mismo
  // fix. Acá afectaba menos (alpha cerca de 0.92 en el borde, no
  // 0.06-0.5 como beams/rays) pero es el mismo error de fondo.

  const u = {
    res: gl.getUniformLocation(prog, 'uResolution'),
    mouse: gl.getUniformLocation(prog, 'uMouse'),
    radius: gl.getUniformLocation(prog, 'uRadius'),
    a: gl.getUniformLocation(prog, 'uColA'),
    b: gl.getUniformLocation(prog, 'uColB'),
    c: gl.getUniformLocation(prog, 'uColC'),
    gap: gl.getUniformLocation(prog, 'uGap'),
  };

  let mx = -9999, my = -9999;
  // Igual que en initRays(): resize() solo en resize real,
  // nunca dentro de render() · reasignar canvas.width/height reinicia
  // el framebuffer entero aunque el valor no cambie.
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  function render() {
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const stops = skyStops();
    const rgbA = hexToRgb(stops[0][1]);
    const rgbB = hexToRgb(stops[Math.floor(stops.length / 2)][1]);
    const rgbC = hexToRgb(stops[stops.length - 1][1]);
    gl.uniform2f(u.res, canvas.width, canvas.height);
    gl.uniform2f(u.mouse, mx, my);
    gl.uniform1f(u.radius, 190);
    gl.uniform3f(u.a, ...rgbA);
    gl.uniform3f(u.b, ...rgbB);
    gl.uniform3f(u.c, ...rgbC);
    gl.uniform1f(u.gap, COL_GAP);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  window.addEventListener('resize', resize);
  resize();
  render();

  return { setMouse: (x, y) => { mx = x; my = y; render(); }, render };
}
