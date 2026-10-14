// ══════════════════════════════════════════════════════
// BITÁCORA DE LECTURA · libros y sesiones («llegué a la página N»), con
// racha, ritmo de dos semanas, páginas del mes, libros terminados, una
// gráfica de páginas por día (30 días, una serie, tooltip por día y la
// misma información en tabla), avance por libro con fecha estimada de
// término a tu ritmo, y la línea de sesiones recientes. Se guarda en el
// navegador; trae un ejemplo armado alrededor de hoy. El lector la
// alimenta: al terminar un capítulo llega `bw:read` y se anota sola.
//   mount({ el })
// ══════════════════════════════════════════════════════
const KEY = 'bw-log-v1', DAY = 864e5;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const iso = d => d.toLocaleDateString('sv');
const today = () => iso(new Date());
const shift = (s, n) => { const d = new Date(s + 'T12:00'); d.setDate(d.getDate() + n); return iso(d); };
const fmt = (s, o = { day: 'numeric', month: 'short' }) => new Date(s + 'T12:00').toLocaleDateString('es-MX', o).replace('.', '');
const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;

// Ejemplo: Cien años terminado hace tres semanas, el Quijote a medias con
// una racha viva, El nombre del viento a ratos y el cuaderno del lector sin empezar.
function sample() {
  const t = today(), s = [], add = (d, book, to) => s.push({ id: 's' + s.length, date: shift(t, d), book, to });
  const wob = (d, k, m) => Math.abs(d * k) % m;
  let p = 0; for (let d = -34; d <= -21; d++) { if (d === -29) continue; p = d === -21 ? 432 : p + 27 + wob(d, 7, 11); add(d, 'cien', p); }
  p = 0; for (let d = -18; d <= -1; d++) { if (d === -12 || d === -7) continue; p += 22 + wob(d, 13, 19); add(d, 'quijote', p); }
  [[-15, 40], [-9, 75], [-4, 112]].forEach(([d, to]) => add(d, 'viento', to));
  return {
    books: [
      { id: 'quijote', title: 'Don Quijote de la Mancha', author: 'Miguel de Cervantes', pages: 1104 },
      { id: 'viento', title: 'El nombre del viento', author: 'Patrick Rothfuss', pages: 662 },
      { id: 'cuaderno', title: 'Cuaderno del invernadero', author: 'el lector de bookworm', pages: 48 },
      { id: 'cien', title: 'Cien años de soledad', author: 'Gabriel García Márquez', pages: 432 }
    ],
    sessions: s.sort((a, b) => a.date.localeCompare(b.date))
  };
}
const load = () => { try { const d = JSON.parse(localStorage.getItem(KEY)); return d && d.books ? d : null; } catch { return null; } };

export function mount({ el = document.getElementById('bw-log') } = {}) {
  if (!el) return;
  let data = load() || sample();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} };

  // ── cálculos: cada sesión vale lo que avanzó desde la anterior del mismo libro
  const reads = () => {
    const last = {}; return data.sessions.map(x => { const from = last[x.book] || 0; last[x.book] = Math.max(from, x.to); return { ...x, from, n: Math.max(0, x.to - from) }; });
  };
  const book = id => data.books.find(b => b.id === id);
  const at = id => data.sessions.filter(x => x.book === id).reduce((m, x) => Math.max(m, x.to), 0);
  function stats() {
    const r = reads(), t = today(), byDay = {};
    r.forEach(x => { (byDay[x.date] = byDay[x.date] || []).push(x); });
    const pagesOn = d => (byDay[d] || []).reduce((a, x) => a + x.n, 0);
    let streak = 0, d = pagesOn(t) ? t : shift(t, -1); while (pagesOn(d)) { streak++; d = shift(d, -1); }
    const last14 = Array.from({ length: 14 }, (_, i) => shift(t, -i)), pace = last14.reduce((a, x) => a + pagesOn(x), 0) / 14;
    const month = t.slice(0, 7), monthPages = r.filter(x => x.date.startsWith(month)).reduce((a, x) => a + x.n, 0);
    const finished = data.books.filter(b => at(b.id) >= b.pages).length;
    return { r, byDay, pagesOn, streak, alive: !pagesOn(t) && streak > 0, pace, monthPages, finished, last14 };
  }

  el.innerHTML = `<div class="lg-tiles"></div>
    <figure class="lg-chart"><figcaption><b>Páginas por día</b><span>últimos 30 días</span></figcaption><div class="lg-plot"></div><div class="lg-tip" role="status" hidden></div>
      <details class="lg-table"><summary>Ver como tabla</summary><div class="lg-table-wrap"></div></details></figure>
    <h3>Libros</h3><ul class="lg-books"></ul>
    <h3>Registrar lectura</h3>
    <form class="lg-form lg-add"><label>Libro<select name="book"></select></label><label>Llegué a la página<input name="to" type="number" inputmode="numeric" min="1" required></label><label>Fecha<input name="date" type="date" required></label><button class="btn primary" type="submit">anotar</button></form>
    <p class="lg-msg" aria-live="polite"></p>
    <h3>Sesiones recientes</h3><div class="reading-log lg-recent"></div>
    <details class="lg-new"><summary>Agregar un libro</summary><form class="lg-form lg-book"><label>Título<input name="title" required maxlength="90"></label><label>Autor<input name="author" maxlength="70"></label><label>Páginas<input name="pages" type="number" inputmode="numeric" min="1" max="9999" required></label><button class="btn" type="submit">agregar</button></form></details>
    <p class="lg-foot"><button type="button" class="btn lg-reset">restablecer el ejemplo</button><span class="muted">Se guarda solo en este navegador.</span></p>`;
  const $ = s => el.querySelector(s), plot = $('.lg-plot'), tip = $('.lg-tip'), msg = $('.lg-msg');
  const say = (t, bad) => { msg.textContent = t; msg.classList.toggle('is-bad', !!bad); };

  function tiles(S) {
    const t = [[S.streak ? plural(S.streak, 'día', 'días') : '0', S.alive ? 'racha · lee hoy para seguirla' : 'racha'],
      [S.pace >= 10 ? Math.round(S.pace) : S.pace.toFixed(1), 'páginas al día · 14 días'],
      [S.monthPages, 'páginas en ' + fmt(today(), { month: 'long' })],
      [S.finished, plural(S.finished, 'libro terminado', 'libros terminados').replace(/^\d+ /, '')]];
    $('.lg-tiles').innerHTML = t.map(([v, l]) => `<div class="metric"><div class="metric-val">${esc(v)}</div><div class="metric-lbl">${esc(l)}</div></div>`).join('');
  }

  // ── gráfica: una serie, barras finas con 2px de aire y punta redonda de 4px
  let days = [];
  function chart(S) {
    const t = today(); days = Array.from({ length: 30 }, (_, i) => shift(t, i - 29)).map(d => ({ d, n: S.pagesOn(d), items: S.byDay[d] || [] }));
    const W = Math.max(260, plot.clientWidth || 520), H = 150, L = 30, B = 22, T = 8, max = Math.max(10, ...days.map(x => x.n)), top = Math.ceil(max / 20) * 20;
    const step = (W - L) / days.length, bw = Math.max(2, step - 2), y = v => T + (H - T - B) * (1 - v / top);
    const grid = [0, top / 2, top].map(v => `<line x1="${L}" x2="${W}" y1="${y(v)}" y2="${y(v)}" class="lg-grid${v ? '' : ' base'}"/><text x="${L - 6}" y="${y(v) + 3}" class="lg-ax" text-anchor="end">${v}</text>`).join('');
    const bars = days.map((x, i) => {
      const bx = L + i * step + 1, h = y(0) - y(x.n), r = Math.min(4, h, bw / 2);
      const bar = x.n ? `<path class="lg-bar" d="M${bx},${y(0)}V${y(x.n) + r}Q${bx},${y(x.n)} ${bx + r},${y(x.n)}H${bx + bw - r}Q${bx + bw},${y(x.n)} ${bx + bw},${y(x.n) + r}V${y(0)}Z"/>` : `<rect class="lg-zero" x="${bx}" y="${y(0) - 2}" width="${bw}" height="2"/>`;
      return `<g class="lg-col" data-i="${i}">${bar}<rect class="lg-hit" x="${L + i * step}" y="${T}" width="${step}" height="${H - T}"/></g>`;
    }).join('');
    const ticks = days.map((x, i) => (29 - i) % 7 === 0 ? `<text x="${L + i * step + step / 2}" y="${H - 6}" class="lg-ax" text-anchor="middle">${i === 29 ? 'hoy' : fmt(x.d)}</text>` : '').join('');
    const sum = days.reduce((a, x) => a + x.n, 0), on = days.filter(x => x.n).length;
    plot.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Páginas por día en los últimos 30 días: ${sum} páginas en ${on} días de lectura; el día con más, ${Math.max(...days.map(x => x.n))}.">${grid}${bars}${ticks}</svg>`;
    $('.lg-table-wrap').innerHTML = `<table><tr><th>Día</th><th>Páginas</th><th>Libros</th></tr>${days.filter(x => x.n).reverse().map(x => `<tr><td>${fmt(x.d)}</td><td>${x.n}</td><td>${esc(x.items.filter(i => i.n).map(i => book(i.book)?.title || i.book).join(', '))}</td></tr>`).join('')}</table>`;
  }
  plot.addEventListener('pointermove', e => {
    const g = e.target.closest('.lg-col'); plot.querySelectorAll('.lg-col.is-hot').forEach(c => c !== g && c.classList.remove('is-hot'));
    if (!g) { tip.hidden = true; return; }
    g.classList.add('is-hot'); const x = days[+g.dataset.i];
    tip.innerHTML = `<b>${esc(fmt(x.d, { weekday: 'long', day: 'numeric', month: 'long' }))}</b>${x.n ? `<span>${plural(x.n, 'página', 'páginas')}</span>${x.items.filter(i => i.n).map(i => `<span class="muted">${esc(book(i.book)?.title || i.book)} · ${i.n}</span>`).join('')}` : '<span class="muted">sin lectura</span>'}`;
    const pr = plot.getBoundingClientRect(), hr = g.querySelector('.lg-hit').getBoundingClientRect(), fr = el.querySelector('.lg-chart').getBoundingClientRect();
    tip.hidden = false; const w = tip.offsetWidth;
    tip.style.left = Math.max(0, Math.min(fr.width - w, hr.left - fr.left + hr.width / 2 - w / 2)) + 'px'; tip.style.top = (pr.top - fr.top + 4) + 'px';
  });
  plot.addEventListener('pointerleave', () => { tip.hidden = true; plot.querySelectorAll('.lg-col.is-hot').forEach(c => c.classList.remove('is-hot')); });

  // ── libros con avance y fecha estimada
  function books(S) {
    const t = today();
    $('.lg-books').innerHTML = data.books.map(b => {
      const p = Math.min(at(b.id), b.pages), pct = p / b.pages * 100, done = p >= b.pages;
      const mine = S.last14.reduce((a, d) => a + (S.byDay[d] || []).filter(x => x.book === b.id).reduce((s, x) => s + x.n, 0), 0) / 14;
      const eta = done ? `<span class="badge ok">terminado</span>` : !p ? '<span class="muted">sin empezar</span>' : mine > 0 ? `<span class="muted">a tu ritmo (${mine >= 10 ? Math.round(mine) : mine.toFixed(1)} al día) lo terminas el <b>${esc(fmt(shift(t, Math.ceil((b.pages - p) / mine)), { day: 'numeric', month: 'long', year: 'numeric' }))}</b></span>` : '<span class="muted">sin lecturas en dos semanas</span>';
      return `<li class="lg-book${done ? ' is-done' : ''}"><div class="lg-book-head"><strong>${esc(b.title)}</strong><span class="muted">${esc(b.author || '')}</span><span class="lg-book-p">p. ${p} de ${b.pages}</span></div><div class="lg-meter" role="progressbar" aria-label="Avance de ${esc(b.title)}" aria-valuemin="0" aria-valuemax="${b.pages}" aria-valuenow="${p}"><i style="width:${pct.toFixed(1)}%"></i></div>${eta}</li>`;
    }).join('');
    const sel = $('.lg-add select'), keep = sel.value;
    sel.innerHTML = data.books.filter(b => at(b.id) < b.pages).map(b => `<option value="${b.id}">${esc(b.title)} (vas en la ${at(b.id)})</option>`).join('');
    if (keep && sel.querySelector(`option[value="${keep}"]`)) sel.value = keep;
    syncTo();
  }
  const syncTo = () => { const b = book($('.lg-add select').value), i = $('.lg-add [name=to]'); if (!b) return; i.min = at(b.id) + 1; i.max = b.pages; i.placeholder = `${at(b.id) + 1} a ${b.pages}`; };
  $('.lg-add select').addEventListener('change', syncTo);

  // ── sesiones recientes (la línea de lectura de siempre, ahora viva)
  function recent(S) {
    const list = S.r.slice().reverse().slice(0, 8);
    $('.lg-recent').innerHTML = list.map(x => {
      const b = book(x.book), done = b && x.to >= b.pages;
      return `<div class="reading-entry"><div class="reading-dot ${done ? 'ok' : 'chapter'}" aria-hidden="true">${done ? '✓' : x.n}</div><div class="lg-entry"><h4>${esc(b ? b.title : x.book)} · p. ${x.from} a ${x.to}</h4><p class="muted">${esc(fmt(x.date, { weekday: 'long', day: 'numeric', month: 'long' }))} · ${plural(x.n, 'página', 'páginas')}${done ? ' · terminado' : ''}</p></div><button type="button" class="lg-del" data-id="${x.id}" aria-label="Borrar la sesión del ${esc(fmt(x.date))}">×</button></div>`;
    }).join('') || '<p class="muted lg-none">Sin sesiones todavía.</p>';
  }
  $('.lg-recent').addEventListener('click', e => { const b = e.target.closest('.lg-del'); if (!b) return; data.sessions = data.sessions.filter(x => x.id !== b.dataset.id); save(); draw(); say('Sesión borrada.'); });

  const add = (bookId, to, date) => {
    const b = book(bookId); if (!b) return 'Elige un libro.';
    const later = data.sessions.filter(x => x.book === bookId && x.date > date);
    if (later.length) return `Ya hay una sesión de ese libro después del ${fmt(date)}; anota esta con una fecha posterior.`;
    if (to <= at(bookId)) return `Ya ibas en la página ${at(bookId)} de ${b.title}.`;
    if (to > b.pages) return `${b.title} tiene ${b.pages} páginas.`;
    data.sessions.push({ id: 's' + Date.now().toString(36), date, book: bookId, to });
    data.sessions.sort((a, c) => a.date.localeCompare(c.date)); save(); draw(); return '';
  };
  $('.lg-add').addEventListener('submit', e => {
    e.preventDefault(); const f = e.currentTarget.elements, to = +f.to.value, date = f.date.value || today();
    if (date > today()) { say('La fecha no puede ser futura.', true); return; }
    const before = at(f.book.value), err = add(f.book.value, to, date);
    if (err) { say(err, true); return; }
    say(`Anotado: ${plural(to - before, 'página', 'páginas')} de ${book(f.book.value).title}.`); f.to.value = '';
  });
  $('.lg-book').addEventListener('submit', e => {
    e.preventDefault(); const form = e.currentTarget, f = form.elements, title = f.title.value.trim(), pages = Math.round(+f.pages.value);
    if (!title || !(pages > 0)) return;
    const id = 'b' + Date.now().toString(36); data.books.unshift({ id, title, author: f.author.value.trim(), pages }); save(); form.reset(); draw();
    $('.lg-add select').value = id; syncTo(); say(`Agregado: ${title}.`);
  });
  let armed = 0;
  $('.lg-reset').addEventListener('click', e => {
    const b = e.currentTarget;
    if (Date.now() - armed > 3000) { armed = Date.now(); b.textContent = '¿seguro? toca otra vez'; setTimeout(() => { b.textContent = 'restablecer el ejemplo'; }, 3000); return; }
    armed = 0; b.textContent = 'restablecer el ejemplo'; data = sample(); save(); draw(); say('Ejemplo restablecido.');
  });

  // El lector anota sola la página al terminar cada capítulo.
  window.addEventListener('bw:read', e => {
    const { book: id, page, chapter } = e.detail || {}; const b = book(id);
    if (!b || page <= at(id)) return;
    const last = data.sessions.filter(x => x.book === id).pop(), date = last && last.date > today() ? last.date : today();
    if (!add(id, Math.min(page, b.pages), date)) say(`El lector anotó el capítulo ${chapter} del ${b.title}: página ${Math.min(page, b.pages)}.`);
  });

  function draw() { const S = stats(); tiles(S); chart(S); books(S); recent(S); }
  $('.lg-add [name=date]').value = today(); $('.lg-add [name=date]').max = today();
  new ResizeObserver(() => { const w = plot.clientWidth; if (w && w !== chart.w) { chart.w = w; chart(stats()); } }).observe(plot);
  draw();
}
