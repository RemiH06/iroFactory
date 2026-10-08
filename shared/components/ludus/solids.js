// ══════════════════════════════════════════════════════
// Los cinco sólidos platónicos, en JS puro (sin Three): vértices y aristas
// para dibujarlos en canvas 2D, y el selector de forma de ludus, que
// avisa con el evento `ludus:shape` y recuerda la elección.
// Cada sólido tiene exactamente seis lugares para las seis vistas:
// el tetraedro sus 6 aristas, el cubo sus 6 caras, el octaedro sus 6
// vértices, el dodecaedro sus 6 pares de caras opuestas y el icosaedro
// sus 6 pares de vértices opuestos.
// ══════════════════════════════════════════════════════
export const SHAPES = ['cubo', 'tetraedro', 'octaedro', 'dodecaedro', 'icosaedro'];
export const ICON = { cubo: '▣', tetraedro: '△', octaedro: '◇', dodecaedro: '⬠', icosaedro: '⬡' };
export const PLURAL = { cubo: 'Cubos', tetraedro: 'Tetraedros', octaedro: 'Octaedros', dodecaedro: 'Dodecaedros', icosaedro: 'Icosaedros' };
// lados de cada cara: el juguete de fondo cierra figuras de ese número de lados
export const SIDES = { cubo: 4, tetraedro: 3, octaedro: 3, dodecaedro: 5, icosaedro: 3 };
const PHI = (1 + Math.sqrt(5)) / 2;
const norm = v => { const l = Math.hypot(...v); return v.map(x => x / l); };
const VERTS = {
  tetraedro: [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]],
  cubo: [-1, 1].flatMap(x => [-1, 1].flatMap(y => [-1, 1].map(z => [x, y, z]))),
  octaedro: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
  icosaedro: [[0, 1, PHI], [0, -1, PHI], [0, 1, -PHI], [0, -1, -PHI], [1, PHI, 0], [-1, PHI, 0], [1, -PHI, 0], [-1, -PHI, 0], [PHI, 0, 1], [-PHI, 0, 1], [PHI, 0, -1], [-PHI, 0, -1]],
  dodecaedro: [...[-1, 1].flatMap(x => [-1, 1].flatMap(y => [-1, 1].map(z => [x, y, z]))),
    ...[-1, 1].flatMap(a => [-1, 1].flatMap(b => [[0, a / PHI, b * PHI], [a / PHI, b * PHI, 0], [a * PHI, 0, b / PHI]]))]
};
// vértices en la esfera unidad y aristas = pares a la distancia mínima
export const solid = name => {
  const v = VERTS[name].map(norm);
  let min = Infinity;
  for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) min = Math.min(min, Math.hypot(v[i][0] - v[j][0], v[i][1] - v[j][1], v[i][2] - v[j][2]));
  const edges = [];
  for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) if (Math.hypot(v[i][0] - v[j][0], v[i][1] - v[j][1], v[i][2] - v[j][2]) < min * 1.01) edges.push([i, j]);
  return { verts: v, edges };
};
// proyección 2D rápida de un sólido girado (para los íconos y el fondo)
export const project = (s, ax, ay, r) => s.verts.map(([x, y, z]) => {
  const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
  const x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y1 = y * cx - z1 * sx;
  return [x1 * r, y1 * r];
});

// ── Selector de forma
const KEY = 'ludus:shape';
let current = 'cubo';
try { const s = localStorage.getItem(KEY); if (SHAPES.includes(s)) current = s; } catch {}
export const shape = () => current;
export function setShape(name) {
  if (!SHAPES.includes(name) || name === current) return;
  current = name;
  try { localStorage.setItem(KEY, name); } catch {}
  document.dispatchEvent(new CustomEvent('ludus:shape', { detail: name }));
}
export function mountToggle(btn = document.getElementById('lx-shape')) {
  if (!btn) return;
  const paint = () => { btn.innerHTML = `<span aria-hidden="true">${ICON[current]}</span> <span class="lx-shape-name">${current}</span>`; btn.setAttribute('aria-label', `Forma: ${current}. Cambiar a ${SHAPES[(SHAPES.indexOf(current) + 1) % SHAPES.length]}`); };
  btn.addEventListener('click', () => setShape(SHAPES[(SHAPES.indexOf(current) + 1) % SHAPES.length]));
  document.addEventListener('ludus:shape', paint); paint();
}
