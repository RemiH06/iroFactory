// ══════════════════════════════════════════════════════
// ESQUEMAS DE TABLAS · el diccionario de datos en CQL (el tema habla
// cqlsh): cada tabla con su llave de partición y de agrupación, tipos,
// descripción y ejemplo, la consulta para la que se diseñó y su CREATE
// TABLE para copiar. Una tabla trae dos versiones: se comparan columna
// por columna y se genera la migración, con las trampas reales de
// Cassandra (no se renombra una columna fuera de la llave ni se le cambia
// el tipo: se agrega otra, se copia y se borra la vieja).
//   mount({ el })
// ══════════════════════════════════════════════════════
import { SCHEMAS, node, pick, onPick } from './ocean-data.js';

const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
const KEY = { pk: 'partición', ck: 'agrupación' };

function cols(s, ver) { return s.versions ? s.versions[ver] : s.cols; }
function create(s, ver) {
  const cs = cols(s, ver), pk = cs.filter(c => c.role === 'pk').map(c => c.name), ck = cs.filter(c => c.role === 'ck').map(c => c.name);
  const w = Math.max(...cs.map(c => c.name.length));
  let out = `CREATE TABLE ${s.table} (\n${cs.map(c => `  ${c.name.padEnd(w)} ${c.type},`).join('\n')}\n  PRIMARY KEY ((${pk.join(', ')})${ck.length ? ', ' + ck.join(', ') : ''})\n)`;
  const withs = [];
  if (s.order && ck.length) withs.push(`CLUSTERING ORDER BY (${ck.map(n => `${n} ${n === s.order[0] ? s.order[1] : 'ASC'}`).join(', ')})`);
  if (s.ttl) withs.push(`default_time_to_live = ${s.ttl}`);
  return out + (withs.length ? ` WITH ${withs.join('\n  AND ')}` : '') + ';';
}
function diff(s) {
  const a = s.versions.v1, b = s.versions.v2, ren = s.renames || {}, rows = [], cql = [], t = s.table;
  const inA = n => a.find(c => c.name === n), inB = n => b.find(c => c.name === n), from = n => Object.keys(ren).find(k => ren[k] === n);
  b.forEach(c => {
    const old = from(c.name), prev = old && inA(old), same = inA(c.name);
    if (same && same.type === c.type) rows.push(['=', c.name, c.type, 'igual']);
    else if (prev) {
      const typeChange = prev.type !== c.type;
      rows.push(['~', `${old} → ${c.name}`, typeChange ? `${prev.type} → ${c.type}` : c.type, typeChange ? 'cambia nombre y tipo' : 'cambia de nombre']);
      cql.push(`-- ${old} → ${c.name}: ${typeChange ? 'Cassandra no cambia el tipo de una columna; además, una columna borrada no puede volver con otro tipo' : 'RENAME solo sirve para columnas de la llave primaria'}`, `ALTER TABLE ${t} ADD ${c.name} ${c.type};`);
    } else if (!same) { rows.push(['+', c.name, c.type, 'nueva']); cql.unshift(`ALTER TABLE ${t} ADD ${c.name} ${c.type};`); }
  });
  const drops = a.filter(c => !inB(c.name));
  drops.forEach(c => { if (!ren[c.name]) rows.push(['−', c.name, c.type, 'se borra']); });
  if (drops.length) cql.push('-- Copiar los datos a las columnas nuevas con un job de reescritura, mover a los lectores y después:', ...drops.map(c => `ALTER TABLE ${t} DROP ${c.name};`));
  return { rows, cql: cql.join('\n') };
}

export function mount({ el = document.getElementById('sh-schemas') } = {}) {
  if (!el) return;
  const ids = Object.keys(SCHEMAS);
  let cur = 'mart_cond', ver = 'v2';
  el.innerHTML = `<div class="sc-pick" role="group" aria-label="Tabla">${ids.map(id => `<button type="button" class="btn sc-t" data-id="${id}">${esc(SCHEMAS[id].table.split('.')[1])}</button>`).join('')}</div><div class="sc-card" aria-live="polite"></div>`;
  const card = el.querySelector('.sc-card');
  function draw() {
    const s = SCHEMAS[cur], n = node(cur);
    el.querySelectorAll('.sc-t').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === cur)));
    const vbar = s.versions ? `<div class="sc-ver" role="group" aria-label="Versión"><button type="button" class="btn" data-v="v1">v1</button><button type="button" class="btn" data-v="v2">v2</button><button type="button" class="btn" data-v="diff">diferencias</button></div>` : '';
    let body;
    if (ver === 'diff' && s.versions) {
      const d = diff(s);
      body = `<div class="sc-table"><table><tr><th></th><th>Columna</th><th>Tipo</th><th>Cambio</th></tr>${d.rows.map(([k, nm, ty, what]) => `<tr class="d-${{ '+': 'add', '−': 'del', '~': 'mod', '=': 'same' }[k]}"><td aria-hidden="true">${k}</td><td><code>${esc(nm)}</code></td><td>${esc(ty)}</td><td>${what}</td></tr>`).join('')}</table></div>
        <h4>Migración</h4><div class="sc-code"><pre data-lang="cql"><code>${esc(d.cql)}</code></pre><button type="button" class="btn sc-copy">copiar</button></div>
        <p class="muted">La llave primaria no cambia: si tuviera que cambiar, sería otra tabla y una copia completa.</p>`;
    } else {
      const v = s.versions ? ver : null, cs = cols(s, v);
      body = `<div class="sc-table"><table><tr><th>Columna</th><th>Tipo</th><th>Llave</th><th>Qué guarda</th><th>Ejemplo</th></tr>${cs.map(c => `<tr${c.role ? ' class="is-key"' : ''}><td><code>${esc(c.name)}</code></td><td>${c.type}</td><td>${c.role ? `<span class="badge ${c.role === 'pk' ? 'schema' : 'index'}">${KEY[c.role]}${c.role === 'ck' && s.order && s.order[0] === c.name ? (s.order[1] === 'DESC' ? ' ↓' : ' ↑') : ''}</span>` : ''}</td><td>${esc(c.desc)}</td><td><code>${esc(c.ex)}</code></td></tr>`).join('')}</table></div>
        <h4>CREATE TABLE</h4><div class="sc-code"><pre data-lang="cql"><code>${esc(create(s, v))}</code></pre><button type="button" class="btn sc-copy">copiar</button></div>`;
    }
    card.innerHTML = `<div class="sc-head"><div><h4>${esc(s.table)}</h4><p class="muted">${esc(n.desc)}</p></div><div class="sc-actions">${vbar}<button type="button" class="btn sc-lin">ver linaje</button></div></div>
      <p class="sc-query"><span>Pensada para</span><code>${esc(s.query)}</code></p>${body}
      <p class="muted sc-note">En Cassandra la tabla se diseña para su consulta: la llave de partición decide en qué nodo vive cada fila y la de agrupación el orden dentro de ella. ${s.ttl ? `Las filas se borran solas a los ${s.ttl / 86400} días (TTL).` : ''}</p>`;
    card.querySelectorAll('[data-v]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === ver)));
  }
  el.addEventListener('click', e => {
    const t = e.target.closest('.sc-t'); if (t) { cur = t.dataset.id; ver = 'v2'; draw(); return; }
    const v = e.target.closest('[data-v]'); if (v) { ver = v.dataset.v; draw(); return; }
    if (e.target.closest('.sc-lin')) { pick(cur, 'schemas'); document.getElementById('tab-linaje')?.click(); return; }
    const cp = e.target.closest('.sc-copy');
    if (cp) { const txt = cp.previousElementSibling.textContent, o = cp.textContent; (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => { cp.textContent = 'copiado'; }, () => { cp.textContent = 'no se pudo'; }).finally(() => setTimeout(() => { cp.textContent = o; }, 1300)); }
  });
  onPick(({ id, from }) => { if (from !== 'schemas' && SCHEMAS[id]) { cur = id; ver = 'v2'; draw(); } });
  draw();
}
