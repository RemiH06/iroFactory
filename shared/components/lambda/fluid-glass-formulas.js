// ══════════════════════════════════════════════════════
// Formulario · Fluid Glass (React Bits). El original monta Three.js con un
// lente (cilindro) de MeshTransmissionMaterial: IOR 1.15, grosor 5,
// aberración cromática .1, que sigue al puntero con amortiguación. Aquí: las
// fórmulas se escriben con gis en un canvas 2D, se suben como textura y un
// shader dibuja el pizarrón completo y, dentro del lente, la refracción de
// un domo de vidrio (aumento al centro, compresión en el borde), la
// dispersión por canal, el reflejo y su sombra.
// ══════════════════════════════════════════════════════
import { $, clamp, cssVar, glProgram, isLight, makeLoop, onTheme, reduceMotion, rgb01 } from './kit.js';

export const FORMULAS = [{"f":"f′(x) = lim (f(x+h) − f(x)) / h,  h → 0","s":"Cálculo Diferencial","o":"i","a":"calc"},{"f":"(f ∘ g)′(x) = f′(g(x)) · g′(x)","s":"Cálculo Diferencial","o":"i","a":"calc"},{"f":"lim f/g = lim f′/g′","s":"Cálculo Diferencial · L’Hôpital","o":"i","a":"calc"},{"f":"∫ u dv = uv − ∫ v du","s":"Cálculo Integral","o":"i","a":"calc"},{"f":"∫ₐᵇ f(x) dx = F(b) − F(a)","s":"Cálculo Integral","o":"i","a":"calc"},{"f":"V = π ∫ₐᵇ [f(x)]² dx","s":"Cálculo Integral · sólidos de revolución","o":"i","a":"calc"},{"f":"e^{iθ} = cos θ + i sin θ","s":"Álgebra Lineal · Euler","o":"i","a":"alg"},{"f":"(cos θ + i sin θ)ⁿ = cos nθ + i sin nθ","s":"Álgebra Lineal · De Moivre","o":"i","a":"alg"},{"f":"u · v = ‖u‖ ‖v‖ cos θ","s":"Álgebra Lineal · producto punto","o":"i","a":"alg"},{"f":"‖u × v‖ = ‖u‖ ‖v‖ sin θ","s":"Álgebra Lineal · producto cruz","o":"i","a":"alg"},{"f":"A⁻¹ = adj(A) / det(A)","s":"Álgebra Lineal","o":"i","a":"alg"},{"f":"xᵢ = det(Aᵢ) / det(A)","s":"Álgebra Lineal · regla de Cramer","o":"i","a":"alg"},{"f":"det(A − λI) = 0","s":"Álgebra Lineal · valores característicos","o":"i","a":"alg"},{"f":"A = P D P⁻¹","s":"Álgebra Lineal · diagonalización","o":"i","a":"alg"},{"f":"proj_u v = (u·v / u·u) u","s":"Álgebra Lineal · proyecciones","o":"i","a":"alg"},{"f":"x̂ = (AᵀA)⁻¹ Aᵀ b","s":"Álgebra Lineal · mínimos cuadrados","o":"i","a":"alg"},{"f":"π P = π,  Σ πᵢ = 1","s":"Álgebra Lineal · cadenas de Markov","o":"i","a":"alg"},{"f":"∂(xᵀAx)/∂x = (A + Aᵀ) x","s":"Cálculo de Matrices · derivación matricial","o":"i","a":"alg"},{"f":"∂(aᵀx)/∂x = a","s":"Cálculo de Matrices","o":"i","a":"alg"},{"f":"(A ⊗ B)(C ⊗ D) = AC ⊗ BD","s":"Cálculo de Matrices · Kronecker","o":"i","a":"alg"},{"f":"vec(AXB) = (Bᵀ ⊗ A) vec(X)","s":"Cálculo de Matrices · Kronecker","o":"i","a":"alg"},{"f":"x′ = x − σ y 2⁻ⁱ,  y′ = y + σ x 2⁻ⁱ","s":"Álgebra Lineal Numérica · CORDIC","o":"i","a":"alg"},{"f":"z′ = z − σ arctan 2⁻ⁱ","s":"Álgebra Lineal Numérica · CORDIC","o":"i","a":"alg"},{"f":"κ(A) = ‖A‖ ‖A⁻¹‖","s":"Álgebra Lineal Numérica · condición","o":"i","a":"alg"},{"f":"xₙ₊₁ = xₙ − f(xₙ) / f′(xₙ)","s":"Álgebra Lineal Numérica · Newton","o":"i","a":"alg"},{"f":"x̄ = Σ xᵢ / n","s":"Probabilidad y Estadística","o":"i","a":"prob"},{"f":"s² = Σ (xᵢ − x̄)² / (n − 1)","s":"Probabilidad y Estadística","o":"i","a":"prob"},{"f":"P(A|B) = P(B|A) P(A) / P(B)","s":"Probabilidad y Estadística · Bayes","o":"i","a":"prob"},{"f":"r = S_xy / (s_x s_y)","s":"AEM · correlación muestral","o":"i","a":"prob"},{"f":"L(θ) = ∏ f(xᵢ; θ)","s":"AEM · verosimilitud","o":"i","a":"prob"},{"f":"θ̂ = argmax ℓ(θ)","s":"AEM · máxima verosimilitud","o":"i","a":"prob"},{"f":"Λ = −2 ln(L₀ / L₁) ~ χ²","s":"AEM · razón de verosimilitud","o":"i","a":"prob"},{"f":"z = (x̄ − μ) / (σ / √n)","s":"Métodos Estadísticos","o":"i","a":"prob"},{"f":"β̂ = (XᵀX)⁻¹ Xᵀ y","s":"Análisis de Regresión","o":"i","a":"prob"},{"f":"R² = 1 − SSE / SST","s":"Análisis de Regresión","o":"i","a":"prob"},{"f":"Var(β̂) = σ² (XᵀX)⁻¹","s":"Análisis de Regresión","o":"i","a":"prob"},{"f":"Xₜ = φ Xₜ₋₁ + εₜ","s":"Series de Tiempo · AR(1)","o":"i","a":"prob"},{"f":"ρ(h) = γ(h) / γ(0)","s":"Series de Tiempo · autocorrelación","o":"i","a":"prob"},{"f":"dXₜ = μ dt + σ dWₜ","s":"Cálculo Estocástico","o":"i","a":"calc"},{"f":"df = ∂ₜf dt + ∂ₓf dXₜ + ½ ∂ₓ²f (dXₜ)²","s":"Cálculo Estocástico · fórmula de Itô","o":"i","a":"calc"},{"f":"(dWₜ)² = dt","s":"Cálculo Estocástico","o":"i","a":"calc"},{"f":"∫ₐᵇ Wₜ dWₜ = ½(W_b² − W_a²) − ½(b − a)","s":"Cálculo Estocástico · integración","o":"i","a":"calc"},{"f":"∫₀ᵀ (Wₜ² − t) dWₜ = W_T³/3 − T W_T","s":"Cálculo Estocástico · integración","o":"i","a":"calc"},{"f":"z = (x − μ) / σ","s":"Ingeniería de Características · estandarización","o":"i","a":"datos"},{"f":"x′ = (x − min) / (max − min)","s":"Ingeniería de Características · normalización","o":"i","a":"datos"},{"f":"(f ∗ g)[m,n] = Σᵢ Σⱼ f[i,j] g[m−i, n−j]","s":"Programación para Análisis de Datos · convolución","o":"i","a":"datos"},{"f":"F(u,v) = Σ Σ f(x,y) e^{−2πi(ux/M + vy/N)}","s":"Procesamiento de Imágenes · DFT","o":"i","a":"datos"},{"f":"Attention(Q,K,V) = softmax(QKᵀ / √dₖ) V","s":"Aprendizaje de Máquina · BERT","o":"i","a":"datos"},{"f":"σ(z) = 1 / (1 + e^{−z})","s":"Aprendizaje de Máquina","o":"i","a":"datos"},{"f":"softmax(z)ᵢ = e^{zᵢ} / Σⱼ e^{zⱼ}","s":"Aprendizaje de Máquina","o":"i","a":"datos"},{"f":"J = Σₖ Σ ‖x − μₖ‖²","s":"Minería de Datos · k-means","o":"i","a":"datos"},{"f":"H = −Σ pᵢ log₂ pᵢ","s":"Minería de Datos · entropía","o":"i","a":"datos"},{"f":"ReLU(x) = max(0, x)","s":"Modelos no Lineales · CNN","o":"i","a":"datos"},{"f":"w ← w − η ∇L(w)","s":"Modelos no Lineales · descenso de gradiente","o":"i","a":"datos"},{"f":"π_a (σ_p (R ⋈ S))","s":"Bases de Datos · álgebra relacional","o":"i","a":"datos"},{"f":"V = I · R","s":"Fundamentos de Electrónica I · Ohm","o":"c","a":"elec"},{"f":"Σ I_entra = Σ I_sale","s":"Fundamentos de Electrónica I · Kirchhoff","o":"c","a":"elec"},{"f":"Σ V = 0","s":"Fundamentos de Electrónica I · Kirchhoff","o":"c","a":"elec"},{"f":"1/R_eq = 1/R₁ + 1/R₂","s":"Fundamentos de Electrónica I · paralelo","o":"c","a":"elec"},{"f":"V_out = V_in · R₂ / (R₁ + R₂)","s":"Fundamentos de Electrónica I · divisor","o":"c","a":"elec"},{"f":"P = V · I = I² R","s":"Fundamentos de Electrónica I","o":"c","a":"elec"},{"f":"τ = R C","s":"Fundamentos de Electrónica II · RC","o":"c","a":"elec"},{"f":"v_C(t) = V (1 − e^{−t/RC})","s":"Fundamentos de Electrónica II · carga","o":"c","a":"elec"},{"f":"X_C = 1 / (2π f C)","s":"Fundamentos de Electrónica II · reactancia","o":"c","a":"elec"},{"f":"I_C = β · I_B","s":"Fundamentos de Electrónica II · BJT","o":"c","a":"elec"},{"f":"A_v = −R_f / R_in","s":"Temas de Electrónica I · amp op inversor","o":"c","a":"elec"},{"f":"A_v = 1 + R_f / R₁","s":"Temas de Electrónica I · no inversor","o":"c","a":"elec"},{"f":"f = 1 / (2π √(LC))","s":"Temas de Electrónica II · oscilador LC","o":"c","a":"elec"},{"f":"f = 1.44 / ((R₁ + 2R₂) C)","s":"Temas de Electrónica II · 555 astable","o":"c","a":"elec"},{"f":"(A · B)′ = A′ + B′","s":"Sistemas Digitales I · De Morgan","o":"c","a":"dig"},{"f":"A ⊕ B = A·B′ + A′·B","s":"Sistemas Digitales I · XOR","o":"c","a":"dig"},{"f":"Q⁺ = J·Q′ + K′·Q","s":"Sistemas Digitales II · flip-flop JK","o":"c","a":"dig"},{"f":"módulo = 2ⁿ estados","s":"Sistemas Digitales II · contador síncrono","o":"c","a":"dig"},{"f":"baud = f_osc / (384 · (256 − TH1))","s":"Arquitectura de Computadoras · 8051","o":"c","a":"dig"},{"f":"F = m · a","s":"Mecánica I · Newton","o":"c","a":"fis"},{"f":"W = F · d · cos θ","s":"Mecánica I · trabajo","o":"c","a":"fis"},{"f":"P + ½ρv² + ρgh = cte","s":"Mecánica II · Bernoulli","o":"c","a":"fis"},{"f":"A₁ v₁ = A₂ v₂","s":"Mecánica II · continuidad","o":"c","a":"fis"},{"f":"Q = m c ΔT","s":"Mecánica II · calor","o":"c","a":"fis"},{"f":"C = ε₀ A / d","s":"Física I · capacitancia","o":"c","a":"fis"},{"f":"U = ½ C V²","s":"Física I · energía del capacitor","o":"c","a":"fis"},{"f":"T = 2π √(L / g)","s":"Física II · péndulo","o":"c","a":"fis"},{"f":"1/f = 1/dₒ + 1/dᵢ","s":"Física II · lentes","o":"c","a":"fis"},{"f":"n₁ sin θ₁ = n₂ sin θ₂","s":"Física II · Snell","o":"c","a":"fis"},{"f":"θ = α(θ + ω dt) + (1 − α) θ_acc","s":"Sistemas Inteligentes · filtro complementario","o":"c","a":"fis"},{"f":"p → q,  p  ⊢  q","s":"Lógica · modus ponens","o":"g","a":"log"},{"f":"¬(p ∧ q) ≡ ¬p ∨ ¬q","s":"Lógica proposicional · De Morgan","o":"g","a":"log"},{"f":"∀x P(x)  ⊢  P(a)","s":"Lógica de predicados · instanciación","o":"g","a":"log"},{"f":"(λx. M) N  →β  M[x := N]","s":"Cálculo lambda · reducción β","o":"g","a":"log"},{"f":"Y = λf. (λx. f (x x)) (λx. f (x x))","s":"Cálculo lambda · combinador Y","o":"g","a":"log"},{"f":"S → NP VP","s":"Lenguaje · gramática generativa (Chomsky)","o":"g","a":"log"},{"f":"L(G) = { w ∈ Σ* : S ⇒* w }","s":"Lenguajes formales","o":"g","a":"log"},{"f":"tesis · antítesis → síntesis","s":"Dialéctica · Hegel","o":"g","a":"log"},{"f":"Todo A es B, todo B es C ⊢ todo A es C","s":"Silogismo · Barbara (Aristóteles)","o":"g","a":"log"}];
export function mount() {
(() => {
  const stage = $('#lm-formula-stage'), canvas = $('#lm-glass'); if (!stage || !canvas) return;
  const wall = document.createElement('canvas'), wctx = wall.getContext('2d');
  let W = 1, H = 1, dpr = 1, ts = 1, R = 150, lens = [0, 0], target = [0, 0], userUntil = 0, inside = false, lastT = 0;
  // El color de cada fórmula es su área (las mismas tizas que la repisa del formulario completo).
  const AREA = { calc: '--chalk-blue', alg: '--chalk-violet', prob: '--chalk-green', datos: '--chalk-cyan', elec: '--chalk-yellow', dig: '--chalk-orange', fis: '--chalk-red', log: '--chalk-pink' };
  // Orden fijo (semilla) para que el muro no cambie entre visitas.
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const order = FORMULAS.map((f, i) => ({ ...f, k: i, r: rnd(), size: rnd(), rot: rnd() - .5 })).sort((a, b) => a.r - b.r);
  // Mini tipografía: ^{...} y _{...}/_ab van como super y subíndice.
  const parts = s => { const out = []; let i = 0, buf = ''; const push = (t, m) => { if (t) out.push({ t, m }); }; while (i < s.length) { const ch = s[i]; if ((ch === '^' || ch === '_') && i + 1 < s.length) { push(buf, 0); buf = ''; let t = ''; if (s[i + 1] === '{') { const j = s.indexOf('}', i + 2); t = s.slice(i + 2, j); i = j + 1; } else { let j = i + 1; while (j < s.length && /[\w]/.test(s[j])) j++; t = s.slice(i + 1, j); i = j; } push(t, ch === '^' ? 1 : -1); } else { buf += ch; i++; } } push(buf, 0); return out; };
  const measure = (ps, size) => ps.reduce((w, p) => { wctx.font = `italic ${p.m ? size * .68 : size}px 'Cormorant Garamond', serif`; return w + wctx.measureText(p.t).width; }, 0);
  const write = (ps, x, y, size) => { let cx = x; ps.forEach(p => { const s = p.m ? size * .68 : size; wctx.font = `italic ${s}px 'Cormorant Garamond', serif`; wctx.fillText(p.t, cx, y + (p.m === 1 ? -size * .38 : p.m === -1 ? size * .2 : 0)); cx += wctx.measureText(p.t).width; }); };
  const paintWall = () => {
    wall.width = Math.round(W * ts); wall.height = Math.round(H * ts);
    wctx.setTransform(ts, 0, 0, ts, 0, 0); wctx.clearRect(0, 0, W, H); wctx.textBaseline = 'alphabetic';
    const base = clamp(W / 46, 16, 28), padX = clamp(W / 30, 18, 40), gapY = base * 2.5;
    let x = padX, y = padX + base, rowH = 0, n = 0;
    const cap = `${Math.max(9, base * .42)}px 'Fira Code', monospace`, capCol = cssVar('--text2');
    for (let pass = 0; pass < 2 && y < H - padX; pass++) for (const f of order) {
      const size = base * (0.85 + f.size * 0.6), ps = parts(f.f), w = measure(ps, size);
      wctx.font = cap; const cw = wctx.measureText(f.s).width, bw = Math.max(w, cw);
      if (x + bw > W - padX && x > padX) { x = padX; y += rowH + gapY * 0.55; rowH = 0; }
      if (y + size > H - padX * 0.6) break;
      const col = cssVar(AREA[f.a]);
      wctx.save(); wctx.translate(x, y); wctx.rotate(f.rot * 0.035);
      wctx.fillStyle = col; wctx.globalAlpha = isLight ? 0.92 : 0.9; write(ps, 0, 0, size);
      wctx.globalAlpha = isLight ? 0.25 : 0.32; write(ps, 1.4, 0.9, size);
      wctx.globalAlpha = isLight ? 0.85 : 0.72; wctx.font = cap; wctx.fillStyle = capCol; wctx.fillText(f.s, 0, size * 0.62 + 4);
      wctx.restore();
      x += bw + padX * 1.15; rowH = Math.max(rowH, size * 0.9); n++;
    }
    return n;
  };
  const fs = `precision highp float;
uniform sampler2D uTex; uniform vec2 uRes; uniform vec2 uLens; uniform float uR; uniform vec3 uTint; uniform vec3 uRim; uniform vec3 uShadow; uniform vec3 uSpec; uniform float uLight;
vec4 tex(vec2 p) { vec2 uv = p / uRes; if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec4(0.0); vec4 c = texture2D(uTex, uv); return vec4(c.rgb * c.a, c.a); }
void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 d = p - uLens; float r = length(d) / uR;
  vec4 base = tex(p);
  float sh = smoothstep(1.32, 1.0, r) * (uLight > 0.5 ? 0.16 : 0.3);
  vec4 outside = vec4(base.rgb + uShadow * sh * (1.0 - base.a), base.a + sh * (1.0 - base.a));
  float rr = min(r, 1.0), k = mix(0.58, 1.3, pow(rr, 3.0)), ca = 0.045 * rr * rr;
  vec4 sR = tex(uLens + d * k * (1.0 + ca)), sG = tex(uLens + d * k), sB = tex(uLens + d * k * (1.0 - ca));
  vec3 c = vec3(sR.r, sG.g, sB.b); float a = max(sG.a, max(sR.a, sB.a));
  float ga = 0.10 + 0.12 * rr * rr;
  c += uTint * ga * (1.0 - a); a += ga * (1.0 - a);
  float rim = smoothstep(0.8, 1.0, rr);
  vec2 sp = d / uR - vec2(-0.36, -0.42); float spec = exp(-dot(sp, sp) * 26.0) * 0.5;
  c += uRim * rim * 0.5 + uSpec * spec; a = clamp(a + (rim * 0.5 + spec) * 0.85, 0.0, 1.0);
  float aa = 1.5 / uR;
  gl_FragColor = mix(vec4(c, a), outside, smoothstep(1.0 - aa, 1.0, r));
}`;
  const g = glProgram(canvas, fs, { premultipliedAlpha: true });
  if (!g) { // Sin WebGL: el muro de fórmulas se ve igual, solo sin lente.
    canvas.replaceWith(wall); wall.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
    const fallback = () => { const r = stage.getBoundingClientRect(); W = r.width; H = r.height; ts = Math.min(window.devicePixelRatio || 1, 2); paintWall(); };
    fallback(); onTheme(fallback); if (document.fonts) document.fonts.ready.then(fallback); return;
  }
  const { gl, u } = g;
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(p => gl.texParameteri(gl.TEXTURE_2D, p, gl.LINEAR));
  [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(p => gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE));
  gl.uniform1i(u('uTex'), 0);
  const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  const upload = () => { paintWall(); gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, wall); };
  const colors = () => {
    gl.uniform3fv(u('uTint'), rgb01(isLight ? '--bg3' : '--glass'));
    gl.uniform3fv(u('uRim'), rgb01(isLight ? '--glass' : '--glass-core'));
    gl.uniform3fv(u('uShadow'), isLight ? rgb01('--text2') : rgb01('--black'));
    gl.uniform3fv(u('uSpec'), rgb01(isLight ? '--white' : '--glass-core'));
    gl.uniform1f(u('uLight'), isLight ? 1 : 0);
  };
  const resize = () => {
    const r = stage.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); dpr = Math.min(window.devicePixelRatio || 1, 2);
    ts = Math.min(dpr * 1.5, 3, maxTex / W, maxTex / H);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(u('uRes'), canvas.width, canvas.height);
    R = clamp(Math.min(W, H) * 0.2, 78, 150);
    if (!lens[0]) { lens = [W / 2, H / 2]; target = [W / 2, H / 2]; }
    upload();
  };
  const draw = t => {
    if (stale) { stale = false; upload(); }
    const dt = lastT ? Math.min(64, t - lastT) : 16; lastT = t;
    if (!inside && t > userUntil && !reduceMotion.matches) target = [W * (0.5 + 0.3 * Math.sin(t * 0.00031)), H * (0.5 + 0.26 * Math.cos(t * 0.00023))];
    const k = reduceMotion.matches ? 1 : 1 - Math.exp(-dt / 150);
    lens[0] += (target[0] - lens[0]) * k; lens[1] += (target[1] - lens[1]) * k;
    gl.uniform2f(u('uLens'), lens[0] * dpr, lens[1] * dpr); gl.uniform1f(u('uR'), R * dpr);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const toLocal = e => { const r = stage.getBoundingClientRect(); return [clamp(e.clientX - r.left, 0, W), clamp(e.clientY - r.top, 0, H)]; };
  stage.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; inside = true; target = toLocal(e); if (reduceMotion.matches) loop.still(); });
  stage.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') inside = false; });
  stage.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; target = toLocal(e); userUntil = performance.now() + 5000; if (reduceMotion.matches) loop.still(); });
  colors(); resize();
  const loop = makeLoop(stage, draw);
  new ResizeObserver(() => { resize(); loop.still(); }).observe(stage);
  let stale = false;
  onTheme(() => { colors(); stale = true; loop.still(); });
  if (document.fonts) document.fonts.ready.then(() => { upload(); loop.still(); });
  loop.still();
})();
}
