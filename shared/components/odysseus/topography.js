// ══════════════════════════════════════════════════════
// Topography (React Bits, OGL/WebGL2 → WebGL1): curvas de nivel como
// relieve de carta detallada al llegar a un puerto. Mismo campo de
// Fourier animado; colores del tema; derivadas activadas en su contexto.
// ══════════════════════════════════════════════════════
import { glProgram, isDark, rgb01 } from './kit.js';

export const topo = (() => {
  const canvas = document.createElement('canvas');
  const fs = gl => { const d = !!gl.getExtension('OES_standard_derivatives'); return `${d ? '#extension GL_OES_standard_derivatives : enable\n#define FW(x) fwidth(x)' : '#define FW(x) 0.02'}
precision highp float;
uniform vec2 uRes; uniform vec4 uCtrlA; uniform vec4 uCtrlB; uniform vec4 uCtrlC; uniform vec4 uCtrlD; uniform vec3 uLow; uniform vec3 uMid; uniform vec3 uHigh;
const float BANDS = 7.0; const float THICK = 0.012; const float GLOW = 0.35; const float MORPH = 3.0; const float CONTRAST = 2.4;
float bez(float t, vec4 c) { float w = 6.2831853 * t; return 0.5 * (c.x * sin(w) + c.y * cos(w) + c.z * sin(2.0 * w) + c.w * cos(2.0 * w)); }
float field(vec2 uv) { vec2 a = vec2(bez(uv.x, uCtrlA), bez(uv.x, uCtrlB)); vec2 b = vec2(bez(uv.y, uCtrlC), bez(uv.y, uCtrlD)); return distance(a, b); }
vec3 elev(float e) { vec3 c = mix(uLow, uMid, smoothstep(0.0, 0.5, e)); return mix(c, uHigh, smoothstep(0.5, 1.0, e)); }
void main() {
  vec2 uv = gl_FragCoord.xy / uRes; float fv = field(uv);
  float f = fv * BANDS; float fr = fract(f); float ld = min(fr, 1.0 - fr); float aa = FW(f) + 0.0001;
  float mask = 1.0 - smoothstep(THICK - aa, THICK + aa, ld);
  float glow = 1.0 - smoothstep(THICK, THICK + GLOW * 0.5 + aa, ld);
  float a = pow(clamp(mask + glow * 0.4, 0.0, 1.0), CONTRAST);
  vec3 col = elev(clamp(fv / (MORPH * 2.5), 0.0, 1.0));
  gl_FragColor = vec4(col * a, a);
}`; };
  const g = glProgram(canvas, fs); if (!g) return null;
  const { gl, u } = g, IDX = [[1, -2, 3, -4], [9, -8, 7, -6], [5, 2, 5, -5], [-1, -3, 8, 9]], NAMES = ['uCtrlA', 'uCtrlB', 'uCtrlC', 'uCtrlD'];
  return {
    canvas,
    resize(w, h) { canvas.width = Math.max(1, Math.round(w)); canvas.height = Math.max(1, Math.round(h)); gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(u('uRes'), canvas.width, canvas.height); },
    render(t, seed) {
      const time = t * 0.001 + seed * 37.0;
      IDX.forEach((idx, gI) => gl.uniform4f(u(NAMES[gI]), ...idx.map(i => 3.0 * Math.sin(time * 0.35 * Math.sin(i * 0.05) + i))));
      gl.uniform3fv(u('uLow'), rgb01(isDark ? '--stain' : '--land-dk')); gl.uniform3fv(u('uMid'), rgb01(isDark ? '--rust' : '--stain')); gl.uniform3fv(u('uHigh'), rgb01(isDark ? '--compass' : '--rust'));
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
})();
