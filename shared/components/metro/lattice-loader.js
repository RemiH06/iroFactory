// ══════════════════════════════════════════════════════
// LATTICE LOADER (React Bits) · CSS puro: cada celda de una
// retícula 4×4 pulsa con un retraso según su "unidad" en el
// patrón; al terminar, una segunda capa dibuja la marca (palomita
// o tache) con celdas encendidas. Tabla de patrones y marcas
// copiada del original. El cronómetro corre en décimas. En este
// tema siempre 4×4 (a pedido), aunque la tabla conserva las 3×3.
// ══════════════════════════════════════════════════════

export const LL_PATTERNS = {
  arrow: { 3: { cells: [1,2,3,0,1,2,1,2,3], loop: 7.2, scale: 1 } },
  dots: { 3: { cells: [0,1,2,0,1,2,0,1,2], loop: 3, scale: 2.4 } },
  ripple: { 3: { cells: [2,1,2,1,0,1,2,1,2], loop: 4.8, scale: 1.5 } },
  spiral: { 3: { cells: [0,1,2,7,8,3,6,5,4], loop: 9, scale: 1.2, lit: 0.35 } },
  orbit: { 3: { cells: [0,1,2,7,null,3,6,5,4], loop: 8, scale: 1.2 }, 4: { cells: [0,1,2,3,11,null,null,4,10,null,null,5,9,8,7,6], loop: 6, scale: 1.2, lit: 0.45 } },
  snake: { 3: { cells: [0,1,2,5,4,3,6,7,8], loop: 9, scale: 1, lit: 0.35 }, 4: { cells: [0,1,2,3,7,6,5,4,8,9,10,11,15,14,13,12], loop: 16, scale: 1, lit: 0.25 } },
  sweep: { 4: { cells: [0,1,2,3,1,2,3,4,2,3,4,5,3,4,5,6], loop: 5, scale: 1, lit: 0.45 } },
  spin: { 4: { cells: [0,0,1,1,0,0,1,1,3,3,2,2,3,3,2,2], loop: 4, scale: 1.6, lit: 0.35 } },
  rain: { 4: { cells: [0,2,1,3,1,3,2,4,2,4,3,5,3,5,4,6], loop: 4, scale: 1.2, lit: 0.35 } },
  pulse: { 4: { cells: [2,1,1,2,1,0,0,1,1,0,0,1,2,1,1,2], loop: 2.4, scale: 2.5, lit: 0.45 } }
};
export const LL_DEFAULT = { 3: 'orbit', 4: 'sweep' };
export const LL_MARKS = { 3: { done: [2,3,5,7], error: [0,2,4,6,8] }, 4: { done: [7,8,10,13], error: [0,3,5,6,9,10,12,15] } };
export function createLattice({ label = 'Cargando', doneLabel = 'Listo en', errorLabel = 'Falló tras', pattern = 'orbit', grid = 4, shape = 'round', cellSize = 6, gap = 2, fontSize = 13, step = 90, status = 'working', elapsed = null } = {}) {
  const n = grid === 4 ? 4 : 3;
  const pat = (LL_PATTERNS[pattern] && LL_PATTERNS[pattern][n]) || LL_PATTERNS[LL_DEFAULT[n]][n];
  const d = step * pat.scale, cycle = Math.round(pat.loop * d);
  const root = document.createElement('span');
  root.className = 'll'; root.setAttribute('role', 'status'); root.dataset.shape = shape;
  Object.assign(root.style, { '--ll-n': n }); root.style.setProperty('--ll-n', n);
  root.style.setProperty('--ll-cell', cellSize + 'px'); root.style.setProperty('--ll-gap', gap + 'px');
  root.style.setProperty('--ll-font', fontSize + 'px'); root.style.setProperty('--ll-cycle', cycle + 'ms');
  const gridEl = document.createElement('span'); gridEl.className = 'll__grid'; gridEl.setAttribute('aria-hidden', 'true');
  const run = document.createElement('span'); run.className = 'll__layer ll__run';
  const mark = document.createElement('span'); mark.className = 'll__layer ll__mark';
  pat.cells.forEach(u => {
    const c = document.createElement('span'); c.className = 'll__cell';
    if (u == null) c.dataset.hole = '';
    else c.style.animationDelay = Math.round(u * d) + 'ms';
    if (pat.lit && pat.lit !== 0.62) c.dataset.lit = Math.round(pat.lit * 100);
    run.appendChild(c);
    const m = document.createElement('span'); m.className = 'll__cell'; mark.appendChild(m);
  });
  gridEl.append(run, mark);
  const lab = document.createElement('span'); lab.className = 'll__label'; lab.setAttribute('aria-hidden', 'true');
  const texts = [label, doneLabel, errorLabel].map(t => { const s = document.createElement('span'); s.className = 'll__text'; s.textContent = t; lab.appendChild(s); return s; });
  const timer = document.createElement('span'); timer.className = 'll__timer'; timer.setAttribute('aria-hidden', 'true'); timer.textContent = '0.0s';
  const sr = document.createElement('span'); sr.className = 'll__sr';
  root.append(gridEl, lab, timer, sr);
  const fmt = ds => ds < 600 ? `${(ds / 10).toFixed(1)}s` : `${Math.floor(ds / 600)}m ${((ds % 600) / 10).toFixed(1)}s`;
  let ds = 0, iv = null;
  function setStatus(s) {
    root.dataset.status = s;
    texts.forEach((t, i) => { if (i === ['working', 'done', 'error'].indexOf(s)) t.dataset.active = ''; else delete t.dataset.active; });
    const on = s === 'working' ? [] : LL_MARKS[n][s];
    [...mark.children].forEach((c, i) => { if (on.includes(i)) c.dataset.on = ''; else delete c.dataset.on; });
    clearInterval(iv);
    if (s === 'working' && elapsed == null) {
      const t0 = performance.now(); ds = 0; timer.textContent = fmt(0);
      iv = setInterval(() => { ds = Math.floor((performance.now() - t0) / 100); timer.textContent = fmt(ds); }, 100);
      sr.textContent = `${label}, en progreso`;
    } else {
      sr.textContent = `${s === 'done' ? doneLabel : s === 'error' ? errorLabel : label} ${(ds / 10).toFixed(1)} segundos`;
    }
  }
  if (elapsed != null) { ds = Math.round(elapsed * 10); timer.textContent = fmt(ds); }
  setStatus(status);
  return { el: root, setStatus };
}
export function initLoaderDemo() {
  const row = document.getElementById('metro-loader-demo');
  const btn = document.getElementById('metro-loader-run');
  if (!row) return;
  const wrap = el => { const c = document.createElement('div'); c.className = 'card'; c.appendChild(el); row.appendChild(c); };
  const live = createLattice({ pattern: 'orbit', grid: 4, label: 'Procesando' }); wrap(live.el);
  wrap(createLattice({ pattern: 'snake', grid: 4, status: 'done', elapsed: 1.2 }).el);
  wrap(createLattice({ pattern: 'rain', grid: 4, status: 'error', elapsed: 3.4, errorLabel: 'Falló tras' }).el);
  btn.addEventListener('click', () => {
    live.setStatus('working');
    btn.disabled = true;
    setTimeout(() => { live.setStatus(Math.random() < 0.75 ? 'done' : 'error'); btn.disabled = false; }, 1200 + Math.random() * 1400);
  });
}
