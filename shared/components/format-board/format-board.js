// ══════════════════════════════════════════════════════
// FORMAT BOARD · una misma pieza en varios formatos a la vez. Cada formato
// es un recuadro con su proporción real y `container-type: size`: el tema
// dibuja la pieza con `render` y la acomoda con container queries. Al pie
// de cada uno va su ficha técnica; las zonas seguras se encienden aparte
// y la tabla de especificaciones se copia en Markdown.
//   mount({
//     el, name,
//     formats: [{ id, name, size, note, ratio: [ancho, alto], safe: [arriba %, abajo %] }],
//     controls: [{ id, label, type: 'text' | 'choice' | 'button', max, options: [[valor, etiqueta, { style, lang }]] }],
//     value: () => estado, onChange(id, valor),
//     render(formato, estado) → HTML, describe(formato, estado) → texto alternativo,
//     spec(formato, estado) → [celdas extra de la ficha], specHead: [títulos de esas celdas],
//     active: estado → [ids de los formatos que entran] })
//   → { update() }   vuelve a pintar con el estado vigente
// Sin JS se queda el contenido que ya traiga `el` (las piezas fijas).
// ══════════════════════════════════════════════════════
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function mount({ el, name = 'pieza', formats, controls = [], value, onChange = () => {}, render, describe = f => f.name, spec = () => [], specHead = [], active = () => formats.map(f => f.id) } = {}) {
  const root = typeof el === 'string' ? document.querySelector(el) : el;
  if (!root) return null;
  const uid = 'fb-' + Math.random().toString(36).slice(2, 7);
  const control = c => {
    const v = value()[c.id];
    if (c.type === 'text') return `<label class="fb-field"><span>${esc(c.label)}</span><input type="text" data-id="${c.id}" value="${esc(v)}"${c.max ? ` maxlength="${c.max}"` : ''} autocomplete="off"></label>`;
    if (c.type === 'choice') return `<fieldset class="fb-field"><legend>${esc(c.label)}</legend><div class="fb-choice">${c.options.map(([val, label, o = {}]) => `<label${o.style ? ` style="${esc(o.style)}"` : ''}><input type="radio" name="${uid}-${c.id}" data-id="${c.id}" value="${esc(val)}"${val === v ? ' checked' : ''}><span${o.lang ? ` lang="${o.lang}"` : ''}>${esc(label)}</span></label>`).join('')}</div></fieldset>`;
    return `<button type="button" class="fb-btn" data-id="${c.id}">${esc(c.label)}</button>`;
  };
  root.innerHTML = `<form class="fb-controls" aria-label="Controles de la pieza">${controls.map(control).join('')}<button type="button" class="fb-btn" data-safe aria-pressed="false">Zonas seguras</button></form>`
    + `<div class="fb-frames"></div><div class="fb-foot"><button type="button" class="fb-btn" data-copy>Copiar especificaciones</button><span class="fb-status" role="status"></span></div>`;
  const frames = root.querySelector('.fb-frames'), status = root.querySelector('.fb-status');
  frames.innerHTML = formats.map(f => `<figure class="fb-fig" data-id="${f.id}" style="--ar:${(f.ratio[0] / f.ratio[1]).toFixed(4)}"><div class="fb-frame" role="img" style="aspect-ratio:${f.ratio[0]}/${f.ratio[1]}"></div><figcaption class="fb-spec"></figcaption></figure>`).join('');

  const row = (f, s) => [f.name, f.size, f.note, ...spec(f, s)];
  function update() {
    const s = value(), on = active(s);
    formats.forEach(f => {
      const fig = frames.querySelector(`[data-id="${f.id}"]`), frame = fig.firstElementChild, off = !on.includes(f.id);
      fig.classList.toggle('is-off', off);
      frame.innerHTML = render(f, s) + `<span class="fb-guides" aria-hidden="true" style="--st:${f.safe?.[0] || 0}%;--sb:${f.safe?.[1] || 0}%"></span>`;
      frame.setAttribute('aria-label', describe(f, s));
      fig.lastElementChild.innerHTML = row(f, s).map((c, i) => (i ? `<span>${esc(c)}</span>` : `<b>${esc(c)}</b>`)).join('') + (off ? '<span class="fb-off">fuera del brief</span>' : '');
    });
    // los controles siguen al estado si cambió por fuera (sin pisar lo que se escribe)
    root.querySelectorAll('.fb-controls [data-id]').forEach(i => { if (i.type === 'text' && i !== document.activeElement) i.value = s[i.dataset.id]; if (i.type === 'radio') i.checked = i.value === s[i.dataset.id]; });
  }
  root.querySelector('.fb-controls').addEventListener('submit', e => e.preventDefault());
  root.addEventListener('input', e => { const i = e.target.closest('.fb-controls [data-id]'); if (i && i.type !== 'button') onChange(i.dataset.id, i.value); });
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.id) return onChange(b.dataset.id, true);
    if ('safe' in b.dataset) { const onNow = root.classList.toggle('show-safe'); b.setAttribute('aria-pressed', String(onNow)); return; }
    if ('copy' in b.dataset) {
      const s = value(), head = ['Formato', 'Medidas', 'Nota', ...specHead], on = active(s);
      const md = `## ${name} · especificaciones\n\n| ${head.join(' | ')} |\n|${head.map(() => '---').join('|')}|\n` + formats.filter(f => on.includes(f.id)).map(f => `| ${row(f, s).join(' | ')} |`).join('\n') + '\n';
      (navigator.clipboard ? navigator.clipboard.writeText(md) : Promise.reject()).then(() => { status.textContent = 'Copiado como Markdown.'; }, () => { status.textContent = 'No se pudo copiar: el navegador no dio permiso.'; });
    }
  });
  update();
  return { update };
}
