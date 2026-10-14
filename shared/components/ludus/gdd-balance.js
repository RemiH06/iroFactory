// ══════════════════════════════════════════════════════
// Simulador de balance del documento de diseño: juega miles de partidas
// del tablero de Juguetes con sus reglas exactas (board-game.js: 20
// casillas, 100 fichas, comprar 20, renta 10, Salida +20, Bonus +50,
// Pausa, Atajo, Suerte ±3) y prueba la pregunta abierta del documento:
// cómo se gana. Para cada condición de victoria y cada dado (el sólido de
// la barra) mide cuánto dura la partida, la ventaja de quien tira primero
// y cuántas no terminan. Semilla fija: los mismos números cada vez.
//   mount({ el })
// ══════════════════════════════════════════════════════
const SPECIAL = { 0: 'start', 3: 'luck', 5: 'pause', 10: 'bonus', 13: 'luck', 15: 'jump' };
const DICE = [['tetraedro', 'tetraedro · d4', [4]], ['cubo', 'cubo · 2d6', [6, 6]], ['octaedro', 'octaedro · d8', [8]], ['dodecaedro', 'dodecaedro · d12', [12]], ['icosaedro', 'icosaedro · d20', [20]]];
const RULES = [['rondas', 'Más fichas tras N rondas', 20, 5, 60], ['juegos', 'Primero en tener N juegos', 5, 2, 10], ['bancarrota', 'Gana quien no quiebre', 0, 0, 0]];
const CAP = 400;
const rng = s => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };

function game(dice, rule, N, r) {
  const owner = Array(20).fill(-1), P = [0, 1].map(() => ({ pos: 0, chips: 100, owned: 0, skip: false }));
  const hop = (p, n) => { for (let s = 0; s < Math.abs(n); s++) { p.pos = (p.pos + Math.sign(n) + 20) % 20; if (p.pos === 0 && n > 0) p.chips += 20; } };
  const land = (p, k) => {
    const c = SPECIAL[p.pos];
    if (!c) { if (owner[p.pos] < 0 && p.chips >= 20) { owner[p.pos] = k; p.chips -= 20; p.owned++; } else if (owner[p.pos] === 1 - k) { p.chips -= 10; P[1 - k].chips += 10; } }
    else if (c === 'bonus') p.chips += 50; else if (c === 'pause') p.skip = true;
  };
  let turns = 0;
  for (let t = 0; t < CAP; t++) {
    const k = t % 2, p = P[k]; turns++;
    if (rule === 'rondas' && t >= N * 2) { turns--; break; }
    if (p.skip) { p.skip = false; continue; }
    hop(p, dice.reduce((s, f) => s + 1 + Math.floor(r() * f), 0)); land(p, k);
    if (SPECIAL[p.pos] === 'luck') { hop(p, [-3, -2, -1, 1, 2, 3][Math.floor(r() * 6)]); land(p, k); }
    if (SPECIAL[p.pos] === 'jump') hop(p, 20 - p.pos);
    if (rule === 'juegos' && p.owned >= N) return { turns, win: k };
    if (rule === 'bancarrota' && p.chips < 0) return { turns, win: 1 - k };
  }
  if (rule === 'rondas') { const d = P[0].chips - P[1].chips; return { turns, win: d > 0 ? 0 : d < 0 ? 1 : -1 }; }
  return { turns, win: null };
}
function run(dice, rule, N, games = 2000) {
  const r = rng(20261014), res = Array.from({ length: games }, () => game(dice, rule, N, r)), done = res.filter(x => x.win !== null);
  const lens = done.map(x => x.turns).sort((a, b) => a - b);
  return { res, done, lens, avg: lens.reduce((a, b) => a + b, 0) / Math.max(1, lens.length), med: lens[lens.length >> 1] || 0,
    j1: done.filter(x => x.win === 0).length / Math.max(1, done.length), tie: done.filter(x => x.win === -1).length / Math.max(1, done.length), open: 1 - done.length / games };
}
const pct = v => `${(v * 100).toFixed(1)} %`;

export function mount({ el = document.getElementById('lx-balance') } = {}) {
  if (!el) return;
  let die = 'cubo', rule = 'juegos', N = 5;
  el.innerHTML = `<div class="gb-controls">
      <label>Condición de victoria<select class="gb-rule">${RULES.map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></label>
      <label class="gb-n">N = <output></output><input type="range"></label>
      <label>Dado<select class="gb-die">${DICE.map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></label></div>
    <div class="gb-tiles" aria-live="polite"></div>
    <figure class="gb-hist"><figcaption>Duración de 2 000 partidas, en turnos</figcaption><div class="gb-plot"></div></figure>
    <h4>Los cinco dados con esta regla</h4><div class="gb-table"></div><p class="gb-verdict"></p>`;
  const $ = s => el.querySelector(s), range = $('.gb-n input');
  function draw() {
    const R = RULES.find(x => x[0] === rule), dice = DICE.find(x => x[0] === die)[2], s = run(dice, rule, N);
    $('.gb-n').hidden = rule === 'bancarrota'; range.min = R[3]; range.max = R[4]; range.value = N; $('.gb-n output').textContent = N;
    $('.gb-tiles').innerHTML = [[s.lens.length ? Math.round(s.avg) : '·', 'turnos de media'], [s.med || '·', 'mediana'], [pct(s.j1), 'gana quien tira primero'], [pct(s.open), `no terminan en ${CAP} turnos`]]
      .map(([v, l]) => `<div class="gb-tile"><b>${v}</b><span>${l}</span></div>`).join('') + (rule === 'rondas' ? `<p class="gb-tie">${pct(s.tie)} terminan en empate.</p>` : '');
    // Histograma: una serie, barras con 2 px de aire.
    const W = Math.max(260, $('.gb-plot').clientWidth || 520), H = 140, L = 34, B = 20, bins = 16;
    const lo = s.lens[0] || 0, hi = s.lens[s.lens.length - 1] || 1, w = Math.max(1, Math.ceil((hi - lo + 1) / bins)), counts = Array(bins).fill(0);
    s.lens.forEach(t => { counts[Math.min(bins - 1, Math.floor((t - lo) / w))]++; });
    const max = Math.max(1, ...counts), step = (W - L) / bins, y = v => 6 + (H - 6 - B) * (1 - v / max);
    $('.gb-plot').innerHTML = s.lens.length ? `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Histograma: la mayoría de las partidas dura entre ${s.lens[Math.floor(s.lens.length * .25)]} y ${s.lens[Math.floor(s.lens.length * .75)]} turnos">
      <line class="gb-base" x1="${L}" x2="${W}" y1="${y(0)}" y2="${y(0)}"/><text class="gb-ax" x="${L - 6}" y="${y(max) + 4}" text-anchor="end">${max}</text><text class="gb-ax" x="${L - 6}" y="${y(0)}" text-anchor="end">0</text>
      ${counts.map((c, i) => `<g><title>${lo + i * w} a ${lo + (i + 1) * w - 1} turnos: ${c} partidas</title><rect class="gb-bar" x="${L + i * step + 1}" y="${y(c)}" width="${Math.max(1, step - 2)}" height="${Math.max(0, y(0) - y(c))}" rx="2"/></g>`).join('')}
      <text class="gb-ax" x="${L}" y="${H - 4}">${lo}</text><text class="gb-ax" x="${W}" y="${H - 4}" text-anchor="end">${lo + bins * w - 1}</text></svg>` : '<p class="muted">Ninguna partida termina con esta regla.</p>';
    const all = DICE.map(([k, t, d]) => [k, t, k === die ? s : run(d, rule, N)]);
    $('.gb-table').innerHTML = `<table><tr><th>Dado</th><th>Turnos</th><th>J1 gana</th><th>Sin final</th></tr>${all.map(([k, t, x]) => `<tr${k === die ? ' class="is-on"' : ''}><td>${t}</td><td>${x.lens.length ? Math.round(x.avg) : '·'}</td><td>${pct(x.j1)}</td><td>${pct(x.open)}</td></tr>`).join('')}</table>`;
    const fair = all.filter(([, , x]) => x.open < 0.02).sort((a, b) => Math.abs(a[2].j1 - 0.5) - Math.abs(b[2].j1 - 0.5))[0];
    $('.gb-verdict').innerHTML = rule === 'bancarrota' && s.open > 0.5 ? `<b>No sirve sola:</b> con renta de 10 y tantas entradas (Salida, Bonus), ${pct(s.open)} de las partidas no termina nunca.`
      : fair ? `<b>Más pareja:</b> ${fair[1]}, con ${pct(fair[2].j1)} para quien tira primero y ${Math.round(fair[2].avg)} turnos de media.` : 'Ninguna combinación termina casi siempre: sube N o cambia la regla.';
  }
  el.addEventListener('change', e => {
    if (e.target.matches('.gb-rule')) { rule = e.target.value; N = RULES.find(x => x[0] === rule)[2]; }
    if (e.target.matches('.gb-die')) die = e.target.value;
    draw();
  });
  range.addEventListener('input', () => { N = +range.value; draw(); });
  $('.gb-rule').value = rule; $('.gb-die').value = die;
  new ResizeObserver(() => { const w = $('.gb-plot').clientWidth; if (w && w !== draw.w) { draw.w = w; draw(); } }).observe($('.gb-plot'));
  draw();
}
