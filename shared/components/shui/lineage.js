// ══════════════════════════════════════════════════════
// LINAJE DE DATOS · el grafo de un sistema de datos costeros, de las
// fuentes (arriba) a quienes las usan (abajo): el agua corre hacia abajo.
// Cada nodo dice qué tan fresco está contra lo que promete; una fuente
// atrasada o rota pone «en riesgo» todo lo que alimenta. Elegir un nodo
// enciende lo que lo alimenta y lo que afecta; elegir una de sus columnas
// sigue su recorrido con cada transformación, hasta la fuente y hasta los
// consumidores. «Simular falla» rompe un nodo para medir el impacto.
//   mount({ el })
// ══════════════════════════════════════════════════════
import { LAYERS, NODES, SCHEMAS, node, parents, children, closure, pick, onPick, ago, every } from './ocean-data.js';
import { reduceMotion } from './kit.js';

const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
const wrap = s => esc(s).replace(/([._])/g, '$1<wbr>');
const WORD = { ok: 'al día', stale: 'atrasada', risk: 'en riesgo', broken: 'rota', fixed: 'catálogo' };

export function mount({ el = document.getElementById('sh-lineage') } = {}) {
  if (!el) return;
  let sel = 'mart_cond', colSel = null; const broken = new Set();
  el.innerHTML = `<p class="ln-legend"><span><i class="ok"></i>al día</span><span><i class="stale"></i>atrasada</span><span><i class="risk"></i>en riesgo</span><span><i class="broken"></i>rota</span><span class="ln-dir"><b class="up">▲</b> la alimenta · <b class="down">▼</b> la usa</span></p>
    <div class="ln-stage"><svg class="ln-edges" aria-hidden="true"></svg><div class="ln-nodes" role="group" aria-label="Tablas y consumidores"></div></div>
    <div class="ln-detail" aria-live="polite"></div>`;
  const stage = el.querySelector('.ln-stage'), svg = el.querySelector('.ln-edges'), box = el.querySelector('.ln-nodes'), detail = el.querySelector('.ln-detail');

  const own = n => broken.has(n.id) ? 'broken' : n.sla == null ? (n.fresh == null ? 'ok' : 'fixed') : n.fresh > n.sla ? 'stale' : 'ok';
  const status = id => { const n = node(id), o = own(n); if (o === 'broken' || o === 'stale') return o; const up = closure(id, parents); return [...up].some(u => ['broken', 'stale'].includes(own(node(u)))) ? 'risk' : o; };
  // Recorrido de una columna: hacia la fuente (árbol) y hacia abajo (quién la usa).
  const traceUp = (id, name) => { const k = node(id).cols.find(x => x.name === name); return { id, name, how: k ? k.how : '', from: k ? k.from.map(([i, n]) => traceUp(i, n)) : [] }; };
  const colPath = (id, name) => { const set = new Set([`${id}.${name}`]), walk = t => t.from.forEach(f => { set.add(`${f.id}.${f.name}`); walk(f); }); walk(traceUp(id, name)); return set; };
  const usedBy = (id, name, acc = new Set()) => {
    NODES.forEach(n => n.cols.forEach(k => { if (k.from.some(([i, c]) => i === id && c === name)) { const key = `${n.id}.${k.name}`; if (!acc.has(key)) { acc.add(key); usedBy(n.id, k.name, acc); } } }));
    NODES.filter(n => n.uses && n.uses.includes(id)).forEach(n => acc.add(n.id)); return acc;
  };

  function render() {
    box.innerHTML = LAYERS.map((L, li) => `<div class="ln-layer"><span class="ln-lname">${L}</span><div class="ln-row">${NODES.filter(n => n.layer === li).map(n => {
      const s = status(n.id);
      return `<button type="button" class="ln-node s-${s}" data-id="${n.id}" aria-pressed="false" aria-label="${esc(n.name)}, ${n.kind}, ${WORD[s]}"><span class="ln-kind"><i></i>${n.kind}</span><span class="ln-name">${wrap(n.name)}</span>${n.fresh != null ? `<span class="ln-fresh">${ago(n.fresh)}</span>` : ''}</button>`;
    }).join('')}</div></div>`).join('');
    paint();
  }
  function edges() {
    const sr = stage.getBoundingClientRect(); svg.setAttribute('width', sr.width); svg.setAttribute('height', sr.height); svg.setAttribute('viewBox', `0 0 ${sr.width} ${sr.height}`);
    const pos = id => { const r = box.querySelector(`[data-id="${id}"]`).getBoundingClientRect(); return { x: r.left - sr.left + r.width / 2, top: r.top - sr.top, bot: r.bottom - sr.top }; };
    const up = closure(sel, parents), down = closure(sel, children), path = colSel ? colPath(sel, colSel) : null, used = colSel ? usedBy(sel, colSel) : null;
    let out = '';
    NODES.forEach(n => parents(n.id).forEach(p => {
      const a = pos(p), b = pos(n.id), dy = (b.top - a.bot) / 2;
      let cls = 'ln-e';
      if (path || used) {
        const k = n.cols.filter(x => path && path.has(`${n.id}.${x.name}`) && x.from.some(f => f[0] === p && path.has(`${p}.${f[1]}`)));
        // Hacia abajo: la columna de n viene de la columna seguida en p, o n es un consumidor que usa p.
        const downUse = used && (n.cols.some(x => used.has(`${n.id}.${x.name}`) && x.from.some(([i, cc]) => i === p && (p === sel ? cc === colSel : used.has(`${p}.${cc}`)))) || (n.uses && n.uses.includes(p) && used.has(n.id)));
        cls += k.length ? ' is-up' : downUse ? ' is-down' : ' is-dim';
      } else cls += (up.has(p) || p === sel) && (up.has(n.id) || n.id === sel) && n.id !== p ? ' is-up' : (down.has(n.id) && (down.has(p) || p === sel)) ? ' is-down' : ' is-dim';
      if (['broken', 'stale', 'risk'].includes(status(p)) && !cls.includes('is-dim')) cls += ' is-risk';
      out += `<path class="${cls}" d="M${a.x},${a.bot} C${a.x},${a.bot + dy} ${b.x},${b.top - dy} ${b.x},${b.top}"/>`;
    }));
    svg.innerHTML = out;
  }
  function paint() {
    const up = closure(sel, parents), down = closure(sel, children), path = colSel ? colPath(sel, colSel) : null, used = colSel ? usedBy(sel, colSel) : null;
    box.querySelectorAll('.ln-node').forEach(b => {
      const id = b.dataset.id, inPath = path && [...path].some(k => k.startsWith(id + '.')), inUse = used && (used.has(id) || [...used].some(k => k.startsWith(id + '.')));
      b.classList.toggle('is-sel', id === sel); b.setAttribute('aria-pressed', String(id === sel));
      b.classList.toggle('is-up', colSel ? inPath && id !== sel : up.has(id));
      b.classList.toggle('is-down', colSel ? inUse : down.has(id));
      b.classList.toggle('is-dim', id !== sel && !(colSel ? inPath || inUse : up.has(id) || down.has(id)));
    });
    requestAnimationFrame(edges);
    info();
  }
  function chainHTML(t, depth = 0) {
    const n = node(t.id);
    return `<li style="--d:${depth}"><span class="ln-cname">${esc(n.name)}.<b>${esc(t.name)}</b></span>${t.how ? `<span class="ln-how">${esc(t.how)}</span>` : ''}${!t.from.length ? `<span class="ln-src">${n.layer === 0 ? 'fuente' : 'sin fuente todavía'}</span>` : ''}</li>${t.from.map(f => chainHTML(f, depth + 1)).join('')}`;
  }
  function info() {
    const n = node(sel), s = status(sel), up = [...closure(sel, parents)], down = [...closure(sel, children)];
    const downT = down.filter(d => node(d).layer < 4).length, downC = down.length - downT;
    let col = '';
    if (colSel) {
      const used = [...usedBy(sel, colSel)].map(k => k.includes('.') ? `${node(k.split('.')[0]).name}.${k.split('.')[1]}` : node(k).name);
      col = `<div class="ln-chain"><h4>De dónde sale <code>${esc(colSel)}</code></h4><ol>${chainHTML(traceUp(sel, colSel))}</ol>
        <h4>A dónde llega</h4><p>${used.length ? used.map(u => `<code>${esc(u)}</code>`).join(' ') : 'Ninguna tabla ni consumidor la usa todavía.'}</p></div>`;
    }
    detail.innerHTML = `<div class="ln-dhead"><div><span class="ln-kind"><i></i>${n.kind}</span><h4>${esc(n.name)}</h4><p class="muted">${esc(n.desc)}</p></div>
        <div class="ln-actions">${SCHEMAS[sel] ? `<button type="button" class="btn ln-schema">ver esquema</button>` : ''}<button type="button" class="btn ln-break">${broken.has(sel) ? 'reparar' : 'simular falla'}</button></div></div>
      <p class="ln-state s-${s}"><b>${WORD[s]}</b>${n.fresh != null ? ` · última carga ${ago(n.fresh)}${n.sla ? `, se espera ${every(n.sla)}` : ''}` : ''}${s === 'risk' ? ` · algo de lo que la alimenta está ${up.some(u => own(node(u)) === 'broken') ? 'roto' : 'atrasado'}` : ''}</p>
      <p class="ln-impact">${up.length ? `La alimentan ${up.length}: ${up.map(u => esc(node(u).name)).join(', ')}.` : 'Es una fuente.'} ${down.length ? `Si falla, afecta a <b>${downT} tabla${downT === 1 ? '' : 's'}</b> y <b>${downC} consumidor${downC === 1 ? '' : 'es'}</b>.` : 'Nadie depende de ella.'}</p>
      ${n.cols.length ? `<div class="ln-cols" role="group" aria-label="Columnas de ${esc(n.name)}">${n.cols.map(k => `<button type="button" class="ln-col" data-col="${k.name}" aria-pressed="${k.name === colSel}">${esc(k.name)}</button>`).join('')}</div><p class="muted ln-hint">Toca una columna para seguir su recorrido.</p>` : ''}${col}`;
  }
  const select = (id, keepCol) => { sel = id; if (!keepCol) colSel = null; paint(); };
  box.addEventListener('click', e => { const b = e.target.closest('.ln-node'); if (b) select(b.dataset.id); });
  detail.addEventListener('click', e => {
    const k = e.target.closest('.ln-col'); if (k) { colSel = colSel === k.dataset.col ? null : k.dataset.col; paint(); return; }
    if (e.target.closest('.ln-break')) { broken.has(sel) ? broken.delete(sel) : broken.add(sel); render(); return; }
    if (e.target.closest('.ln-schema')) { pick(sel, 'lineage'); document.getElementById('tab-esquemas')?.click(); }
  });
  onPick(({ id, from }) => { if (from !== 'lineage' && node(id)) select(id); });
  new ResizeObserver(() => requestAnimationFrame(edges)).observe(stage);
  if (reduceMotion.matches) el.classList.add('is-still');
  render();
}
