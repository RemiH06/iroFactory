// ══════════════════════════════════════════════════════
// LECTOR · un libro por capítulos dentro de una ventana: progreso del
// capítulo y del libro, minutos que faltan (a 230 palabras por minuto),
// marcapáginas, tamaño de letra y ← → para cambiar de capítulo. Se
// recuerda dónde ibas. Notas al margen: seleccionar texto lo subraya y
// abre una nota en el margen del párrafo; se exportan en Markdown.
// El libro llega en el marcado (se lee sin JS); aquí se pagina.
// Al terminar un capítulo avisa con `bw:read` (la bitácora lo anota).
//   mount({ el, book, pagesPerChapter })
// ══════════════════════════════════════════════════════
const KEY = 'bw-reader-v1', WPM = 230;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
const words = s => (s.match(/\S+/g) || []).length;
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export function mount({ el = document.getElementById('bw-reader'), book = 'cuaderno', pagesPerChapter = 12 } = {}) {
  if (!el) return;
  const doc = el.closest('.bw-doc'), title = el.querySelector('.rd-booktitle').textContent;
  const chapters = [...el.querySelectorAll('.rd-ch')].map((c, i) => {
    const paras = [...c.querySelectorAll('p')].map(p => p.textContent.replace(/\s+/g, ' ').trim());
    return { n: i + 1, title: c.dataset.title, paras, words: paras.reduce((a, p) => a + words(p), 0) };
  });
  const total = chapters.reduce((a, c) => a + c.words, 0);
  const st = Object.assign({ pos: { ch: 1, frac: 0 }, mark: null, notes: null, done: {}, size: 16 }, load());
  // Una nota de ejemplo la primera vez, para que se vea cómo funcionan.
  if (!st.notes) {
    st.notes = [];
    const ch = chapters.find(c => c.paras.some(p => p.includes('komorebi')));
    if (ch) { const p = ch.paras.findIndex(t => t.includes('komorebi')), s = ch.paras[p].indexOf('komorebi');
      st.notes.push({ id: 'n1', ch: ch.n, p, start: s, end: s + 8, quote: 'komorebi', text: 'Del japonés: 木漏れ日, la luz del sol que se filtra entre las hojas.' }); }
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} };

  el.innerHTML = `<div class="rd-bar">
      <div class="rd-nav"><button type="button" class="rd-btn rd-prev" aria-label="Capítulo anterior">‹</button><span class="rd-where" aria-live="polite"></span><button type="button" class="rd-btn rd-next" aria-label="Capítulo siguiente">›</button></div>
      <div class="rd-tools">
        <button type="button" class="rd-btn rd-mark" aria-pressed="false" title="Marcar el párrafo de arriba">♦ <span>marcar</span></button>
        <button type="button" class="rd-btn rd-goto" hidden>ir al marcapáginas</button>
        <button type="button" class="rd-btn rd-size" data-d="-1" aria-label="Letra más chica">A−</button><button type="button" class="rd-btn rd-size" data-d="1" aria-label="Letra más grande">A+</button>
        <button type="button" class="rd-btn rd-notes-btn" aria-expanded="false">notas <span class="rd-count"></span></button>
      </div>
      <div class="rd-progress"><div class="rd-meter" role="progressbar" aria-label="Avance del libro" aria-valuemin="0" aria-valuemax="100"><i class="rd-meter-book"></i><i class="rd-meter-ch"></i></div><span class="rd-left"></span></div>
    </div>
    <div class="rd-notes" hidden><div class="rd-notes-head"><b>Notas de ${esc(title)}</b><span><button type="button" class="rd-btn rd-copy">copiar Markdown</button><button type="button" class="rd-btn rd-dl">descargar .md</button></span></div><ol class="rd-notes-list"></ol></div>
    <article class="rd-page"></article>
    <button type="button" class="rd-annotate" hidden>✎ anotar</button>`;
  const $ = s => el.querySelector(s), page = $('.rd-page'), annotate = $('.rd-annotate');
  el.style.setProperty('--rd-size', st.size + 'px');
  const scroller = () => el.closest('.bw-win-content') || document.scrollingElement;

  // ── un capítulo a la vez, cada párrafo con su margen
  let cur = null;
  const paraHTML = (ch, i) => {
    const text = chapters[ch - 1].paras[i], ns = st.notes.filter(n => n.ch === ch && n.p === i).sort((a, b) => a.start - b.start);
    let out = '', at = 0;
    ns.forEach(n => { out += esc(text.slice(at, n.start)) + `<mark class="rd-hl" data-note="${n.id}" tabindex="0">${esc(text.slice(n.start, n.end))}</mark>`; at = n.end; });
    return out + esc(text.slice(at));
  };
  const noteHTML = n => `<div class="rd-note" data-note="${n.id}"><button type="button" class="rd-note-x" aria-label="Borrar nota">×</button><q>${esc(n.quote.length > 60 ? n.quote.slice(0, 58) + '…' : n.quote)}</q><textarea rows="2" aria-label="Nota sobre «${esc(n.quote.slice(0, 40))}»" placeholder="Escribe tu nota">${esc(n.text)}</textarea></div>`;
  const rowHTML = (ch, i) => `<div class="rd-row${st.mark && st.mark.ch === ch && st.mark.p === i ? ' is-marked' : ''}" data-p="${i}"><p class="rd-p">${paraHTML(ch, i)}</p><aside class="rd-margin">${st.notes.filter(n => n.ch === ch && n.p === i).map(noteHTML).join('')}</aside></div>`;
  function render(ch) {
    cur = ch; const c = chapters[ch - 1];
    page.innerHTML = `<header class="rd-ch-head"><p class="rd-kicker">${esc(title)}</p><h3 class="rd-ch-title"><span>${ROMAN[ch] || ch}</span> ${esc(c.title)}</h3></header>${c.paras.map((_, i) => rowHTML(ch, i)).join('')}<footer class="rd-end">${ch < chapters.length ? `<button type="button" class="rd-btn rd-next2">Sigue: ${ROMAN[ch + 1]} · ${esc(chapters[ch].title)} ›</button>` : '<p class="rd-fin">Fin</p>'}</footer>`;
    $('.rd-prev').disabled = ch === 1; $('.rd-next').disabled = ch === chapters.length;
    $('.rd-where').textContent = `${ROMAN[ch]} · ${c.title}`;
    annotate.hidden = true; syncMark(); progress();
  }
  const rerow = i => { const r = page.querySelector(`.rd-row[data-p="${i}"]`); if (r) r.outerHTML = rowHTML(cur, i); };

  // ── progreso y tiempo restante
  const frac = () => {
    const sc = scroller(), sr = sc === document.scrollingElement ? { top: 0 } : sc.getBoundingClientRect(), pr = page.getBoundingClientRect();
    const seen = (sr.top + sc.clientHeight - pr.top) / Math.max(1, pr.height);
    return Math.min(1, Math.max(0, (sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 4) ? 1 : seen));
  };
  const mins = w => { const m = Math.ceil(w / WPM); return m <= 1 ? 'menos de un minuto' : `${m} min`; };
  function progress() {
    // Solo dentro de una ventana: oculto en la biblioteca todo mide cero y parecería leído.
    if (!cur || !el.closest('.bw-win-content')) return;
    const f = frac(), c = chapters[cur - 1], before = chapters.slice(0, cur - 1).reduce((a, x) => a + x.words, 0), read = before + c.words * f;
    $('.rd-meter-book').style.width = (read / total * 100).toFixed(1) + '%';
    $('.rd-meter-ch').style.left = (before / total * 100).toFixed(1) + '%'; $('.rd-meter-ch').style.width = (c.words / total * 100).toFixed(1) + '%';
    $('.rd-meter').setAttribute('aria-valuenow', Math.round(read / total * 100));
    $('.rd-left').textContent = `${Math.round(read / total * 100)}% · faltan ${mins(c.words * (1 - f))} del capítulo, ${mins(total - read)} del libro`;
    st.pos = { ch: cur, frac: +f.toFixed(3) };
    if (f >= 0.98 && !st.done[cur]) { st.done[cur] = true; window.dispatchEvent(new CustomEvent('bw:read', { detail: { book, page: cur * pagesPerChapter, chapter: cur } })); }
    clearTimeout(progress.t); progress.t = setTimeout(save, 300);
  }
  let sc = null;
  const onScroll = () => { if (!progress.raf) progress.raf = requestAnimationFrame(() => { progress.raf = 0; progress(); }); };
  const attach = () => { const s = scroller(); if (s === sc) return; if (sc) sc.removeEventListener('scroll', onScroll); sc = s; sc.addEventListener('scroll', onScroll, { passive: true }); };
  const barH = () => $('.rd-bar').offsetHeight - 6; // la barra pegada tapa ese tanto arriba
  // f es lo leído hasta el borde de abajo de la vista; 0 es el principio del capítulo.
  const scrollToFrac = f => { const s = scroller(), pr = page.getBoundingClientRect(), sr = s.getBoundingClientRect(); s.scrollTop += f < 0.05 ? pr.top - sr.top - barH() : pr.top - sr.top - s.clientHeight + f * pr.height; };
  const scrollToPara = i => { const r = page.querySelector(`.rd-row[data-p="${i}"]`), s = scroller(); if (r) s.scrollTop += r.getBoundingClientRect().top - s.getBoundingClientRect().top - barH() - 12; };
  const go = (ch, where = 0) => { ch = Math.min(chapters.length, Math.max(1, ch)); render(ch); attach(); requestAnimationFrame(() => { typeof where === 'number' ? scrollToFrac(where) : scrollToPara(where.p); progress(); }); };

  // ── marcapáginas: el párrafo que está arriba de la vista
  const topPara = () => { const s = scroller(), top = s.getBoundingClientRect().top + 80; const rows = [...page.querySelectorAll('.rd-row')]; return +(rows.find(r => r.getBoundingClientRect().bottom > top) || rows[0]).dataset.p; };
  function syncMark() {
    const has = !!st.mark, here = has && st.mark.ch === cur;
    $('.rd-mark').setAttribute('aria-pressed', String(here));
    $('.rd-mark span').textContent = here ? 'quitar' : 'marcar';
    const g = $('.rd-goto'); g.hidden = !has; if (has) g.textContent = `ir al marcapáginas (${ROMAN[st.mark.ch]}, párrafo ${st.mark.p + 1})`;
  }
  $('.rd-mark').addEventListener('click', () => {
    const p = topPara(), old = st.mark;
    st.mark = old && old.ch === cur ? null : { ch: cur, p };
    page.querySelectorAll('.rd-row.is-marked').forEach(r => r.classList.remove('is-marked'));
    if (st.mark) page.querySelector(`.rd-row[data-p="${p}"]`).classList.add('is-marked');
    syncMark(); save();
  });
  $('.rd-goto').addEventListener('click', () => st.mark && go(st.mark.ch, { p: st.mark.p }));
  $('.rd-prev').addEventListener('click', () => go(cur - 1));
  $('.rd-next').addEventListener('click', () => go(cur + 1));
  page.addEventListener('click', e => { if (e.target.closest('.rd-next2')) go(cur + 1); });
  el.querySelectorAll('.rd-size').forEach(b => b.addEventListener('click', () => { st.size = Math.min(21, Math.max(14, st.size + +b.dataset.d)); el.style.setProperty('--rd-size', st.size + 'px'); save(); progress(); }));
  doc.addEventListener('keydown', e => {
    if (e.target.closest('textarea,input') || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowLeft' && cur > 1) { e.preventDefault(); go(cur - 1); }
    if (e.key === 'ArrowRight' && cur < chapters.length) { e.preventDefault(); go(cur + 1); }
  });

  // ── notas al margen
  const offsetIn = (p, node, off) => { const r = document.createRange(); r.selectNodeContents(p); r.setEnd(node, off); return r.toString().length; };
  let pending = null;
  const readSel = () => {
    const s = getSelection(); if (!s.rangeCount || s.isCollapsed) return null;
    const host = n => { const e = n.nodeType === 1 ? n : n.parentElement; return e && e.closest('.rd-p'); };
    const r = s.getRangeAt(0), a = host(r.startContainer), b = host(r.endContainer);
    if (!a || a !== b || !page.contains(a)) return null;
    let start = offsetIn(a, r.startContainer, r.startOffset), end = offsetIn(a, r.endContainer, r.endOffset);
    const text = a.textContent; while (start < end && /\s/.test(text[start])) start++; while (end > start && /\s/.test(text[end - 1])) end--;
    if (end - start < 2) return null;
    const p = +a.closest('.rd-row').dataset.p;
    if (st.notes.some(n => n.ch === cur && n.p === p && start < n.end && end > n.start)) return null;
    return { p, start, end, quote: text.slice(start, end), rect: r.getBoundingClientRect() };
  };
  document.addEventListener('selectionchange', () => {
    clearTimeout(readSel.t); readSel.t = setTimeout(() => {
      pending = readSel(); if (!pending) { annotate.hidden = true; return; }
      const er = el.getBoundingClientRect();
      annotate.style.left = Math.max(4, Math.min(er.width - 96, pending.rect.left - er.left + pending.rect.width / 2 - 44)) + 'px';
      annotate.style.top = (pending.rect.top - er.top - 40) + 'px'; annotate.hidden = false;
    }, 120);
  });
  annotate.addEventListener('pointerdown', e => e.preventDefault()); // que no se pierda la selección
  annotate.addEventListener('click', () => {
    if (!pending) return;
    const n = { id: 'n' + Date.now().toString(36), ch: cur, p: pending.p, start: pending.start, end: pending.end, quote: pending.quote, text: '' };
    st.notes.push(n); save(); getSelection().removeAllRanges(); annotate.hidden = true; pending = null;
    rerow(n.p); count(); list();
    const t = page.querySelector(`.rd-note[data-note="${n.id}"] textarea`); t && t.focus({ preventScroll: false });
  });
  page.addEventListener('input', e => { const t = e.target.closest('.rd-note textarea'); if (!t) return; const n = st.notes.find(x => x.id === t.closest('.rd-note').dataset.note); if (n) { n.text = t.value; clearTimeout(save.t); save.t = setTimeout(() => { save(); list(); }, 400); } });
  page.addEventListener('click', e => {
    const x = e.target.closest('.rd-note-x');
    if (x) { const id = x.closest('.rd-note').dataset.note, n = st.notes.find(y => y.id === id); st.notes = st.notes.filter(y => y.id !== id); save(); rerow(n.p); count(); list(); return; }
    const m = e.target.closest('.rd-hl'); if (m) { const t = page.querySelector(`.rd-note[data-note="${m.dataset.note}"] textarea`); t && t.focus(); }
  });
  page.addEventListener('keydown', e => { const m = e.target.closest('.rd-hl'); if (m && e.key === 'Enter') m.click(); });
  const hot = (id, on) => page.querySelectorAll(`[data-note="${id}"]`).forEach(x => x.classList.toggle('is-hot', on));
  page.addEventListener('pointerover', e => { const t = e.target.closest('[data-note]'); if (t) hot(t.dataset.note, true); });
  page.addEventListener('pointerout', e => { const t = e.target.closest('[data-note]'); if (t) hot(t.dataset.note, false); });
  page.addEventListener('focusin', e => { const t = e.target.closest('[data-note]'); if (t) hot(t.dataset.note, true); });
  page.addEventListener('focusout', e => { const t = e.target.closest('[data-note]'); if (t) hot(t.dataset.note, false); });

  const count = () => { $('.rd-count').textContent = st.notes.length ? `(${st.notes.length})` : ''; };
  const sorted = () => [...st.notes].sort((a, b) => a.ch - b.ch || a.p - b.p || a.start - b.start);
  function list() {
    const ol = $('.rd-notes-list');
    ol.innerHTML = sorted().map(n => `<li><button type="button" class="rd-jump" data-ch="${n.ch}" data-p="${n.p}"><span>${ROMAN[n.ch]} · ${esc(chapters[n.ch - 1].title)}</span><q>${esc(n.quote)}</q></button>${n.text ? `<p>${esc(n.text)}</p>` : ''}</li>`).join('') || '<li class="rd-empty">Todavía no hay notas. Selecciona un pedazo del texto y toca «anotar».</li>';
  }
  $('.rd-notes-list').addEventListener('click', e => { const j = e.target.closest('.rd-jump'); if (j) go(+j.dataset.ch, { p: +j.dataset.p }); });
  const toggleNotes = () => { const box = $('.rd-notes'), open = box.hidden; box.hidden = !open; $('.rd-notes-btn').setAttribute('aria-expanded', String(open)); if (open) list(); };
  $('.rd-notes-btn').addEventListener('click', toggleNotes);
  const markdown = () => {
    let md = `# Notas · ${title}\n`, last = 0;
    sorted().forEach(n => { if (n.ch !== last) { last = n.ch; md += `\n## ${ROMAN[n.ch]} · ${chapters[n.ch - 1].title}\n`; } md += `\n> ${n.quote}\n${n.text ? '\n' + n.text + '\n' : ''}`; });
    return md;
  };
  const flash = (b, msg) => { const t = b.textContent; b.textContent = msg; setTimeout(() => { b.textContent = t; }, 1400); };
  $('.rd-copy').addEventListener('click', e => { const b = e.currentTarget; navigator.clipboard ? navigator.clipboard.writeText(markdown()).then(() => flash(b, 'copiado'), () => flash(b, 'no se pudo')) : flash(b, 'no se pudo'); });
  $('.rd-dl').addEventListener('click', () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([markdown()], { type: 'text/markdown' })); a.download = 'notas-cuaderno-del-invernadero.md'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); });

  // ── abrir: vuelve a donde ibas; los capítulos de otra ventana abren aquí
  let jump = null;
  document.addEventListener('click', e => { const t = e.target.closest('[data-win][data-ch]'); if (t && t.dataset.win === doc.id.replace('doc-', '')) jump = +t.dataset.ch; }, true);
  let shown = false;
  doc.addEventListener('bw:open', () => requestAnimationFrame(() => { if (jump) go(jump); else if (!shown) go(st.pos.ch, st.pos.frac); jump = null; shown = true; }));
  doc.addEventListener('bw:close', () => { shown = false; annotate.hidden = true; });
  count(); render(st.pos.ch);
}
