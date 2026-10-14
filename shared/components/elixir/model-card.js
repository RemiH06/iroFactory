// ══════════════════════════════════════════════════════
// TARJETA DE MODELO · plantilla con las secciones de «Model Cards for
// Model Reporting» (Mitchell et al., 2019): detalles, uso previsto,
// factores, métricas, datos de evaluación y de entrenamiento, análisis,
// consideraciones éticas y advertencias. Se llena con un objeto; lo que
// falte aparece como «por llenar» y cuenta en el indicador de avance.
// Las métricas llegan en vivo de la matriz de confusión (`ex:metrics`).
// Se exporta a Markdown y copia la cita en BibTeX.
//   mount({ el, card })
// ══════════════════════════════════════════════════════
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const pct = v => (v * 100).toFixed(1) + '%';

export const CARD = {
  name: 'fish-xray-cls', version: '3.1.0', date: '2026-10-13', license: 'MIT',
  sections: [
    ['Detalles del modelo', [
      ['Tipo', 'Clasificador de imágenes: ResNet-50 preentrenado, cabeza nueva de 31 clases'],
      ['Autores', 'Equipo de ejemplo de elixir'],
      ['Entrenado con', 'PyTorch 2.4 · una GPU de 12 GB · 2 h 40 min'],
      ['Contacto', '']]],
    ['Uso previsto', [
      ['Uso principal', 'Sugerir la especie de una radiografía de colección para acelerar el catálogo; una persona confirma'],
      ['Usuarios', 'Curadores y estudiantes de ictiología'],
      ['Fuera de alcance', 'Fotos de peces vivos, diagnóstico veterinario, especies que no están en las 31 clases']]],
    ['Factores', [
      ['Relevantes', 'Postura del ejemplar, calidad del revelado, tamaño del pez en la placa'],
      ['Evaluados', 'Por especie (abajo); por postura todavía no']]],
    ['Métricas', [
      ['Exactitud', '{acc}'], ['F1 macro', '{macro}'], ['Cobertura', '{cov}'],
      ['Por qué estas', 'Las clases están desbalanceadas: el F1 macro pesa igual a cada especie. La cobertura dice cuánto se queda sin respuesta al subir el umbral']]],
    ['Datos de evaluación', [
      ['Conjunto', 'test: 598 imágenes, separadas por ejemplar (ningún pez aparece en dos conjuntos)'],
      ['En esta página', 'Las seis especies con más ejemplares: {n} imágenes']]],
    ['Datos de entrenamiento', [
      ['Conjunto', 'train: 4 812 imágenes; valid: 602, para hiperparámetros y parada temprana'],
      ['Aumentos', 'Giro horizontal y brillo ±15 %; nunca recortes']]],
    ['Análisis cuantitativo', [
      ['Peor clase', '{worst}'],
      ['Curva de pérdida', 'Parada temprana con paciencia 4; se guarda el mejor punto de control de validación']]],
    ['Consideraciones éticas', [
      ['Datos', 'Radiografías de colección pública, sin personas'],
      ['Riesgo', 'Una especie mal catalogada se propaga a los estudios que usan el catálogo: por eso hay umbral y revisión humana']]],
    ['Advertencias y recomendaciones', [
      ['Conocidas', 'Las especies alargadas se confunden entre sí'],
      ['Recomendación', 'Usar umbral de confianza y mandar a revisión lo que quede «sin decidir»'],
      ['Pendiente', '']]]
  ]
};

export function mount({ el = document.getElementById('ex-card'), card = CARD } = {}) {
  if (!el) return;
  let m = null;
  const fill = v => v.replace(/\{(\w+)\}/g, (_, k) => {
    if (!m) return '…';
    if (k === 'acc') return `${pct(m.acc)}${m.thr ? ` en lo decidido (umbral ${m.thr.toFixed(2)})` : ''}`;
    if (k === 'macro') return m.macro.toFixed(3);
    if (k === 'cov') return `${pct(m.cov)} de las imágenes reciben respuesta`;
    if (k === 'n') return String(m.n);
    if (k === 'worst') return m.worst ? `${m.worst.name}, F1 ${m.worst.f1.toFixed(2)}${m.worst.with ? `; se confunde sobre todo con ${m.worst.with}` : ''}` : '';
    return '';
  });
  const fields = card.sections.flatMap(([, f]) => f), filled = () => fields.filter(([, v]) => v).length;
  function draw() {
    const done = filled(), total = fields.length;
    el.innerHTML = `<header class="mc-head">
        <div><p class="mc-kicker">Tarjeta de modelo</p><h3 class="mc-name">${esc(card.name)} <span class="badge slate">v${esc(card.version)}</span></h3>
        <p class="muted">${esc(card.date)} · licencia ${esc(card.license)} · plantilla de Mitchell et al. (2019)</p></div>
        <div class="mc-actions"><button type="button" class="btn primary mc-md">exportar Markdown</button><button type="button" class="btn mc-bib">copiar cita</button></div>
        <div class="mc-done" role="progressbar" aria-label="Campos llenos" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}"><i style="width:${(done / total * 100).toFixed(0)}%"></i><span>${done} de ${total} campos</span></div>
      </header>
      <div class="mc-grid">${card.sections.map(([title, f], i) => `<section class="mc-sec"><h4><span>${String(i + 1).padStart(2, '0')}</span>${esc(title)}</h4><dl>${f.map(([k, v]) => `<dt>${esc(k)}</dt><dd${v ? (/\{/.test(v) ? ' class="live"' : '') : ' class="todo"'}>${v ? esc(fill(v)) : 'por llenar'}</dd>`).join('')}</dl></section>`).join('')}</div>`;
  }
  const markdown = () => `# Tarjeta de modelo · ${card.name} v${card.version}\n\n${card.date} · licencia ${card.license}\n` + card.sections.map(([t, f]) => `\n## ${t}\n\n` + f.map(([k, v]) => `- **${k}:** ${v ? fill(v) : '_por llenar_'}`).join('\n')).join('\n') + '\n';
  const bib = () => `@misc{${card.name.replace(/\W/g, '')}${card.date.slice(0, 4)},\n  title = {${card.name}: tarjeta de modelo},\n  version = {${card.version}},\n  year = {${card.date.slice(0, 4)}},\n  note = {Licencia ${card.license}}\n}`;
  const flash = (b, t) => { const o = b.textContent; b.textContent = t; setTimeout(() => { b.textContent = o; }, 1400); };
  const copy = (b, text) => navigator.clipboard ? navigator.clipboard.writeText(text).then(() => flash(b, 'copiado'), () => flash(b, 'no se pudo')) : flash(b, 'no se pudo');
  el.addEventListener('click', e => {
    if (e.target.closest('.mc-bib')) copy(e.target.closest('.mc-bib'), bib());
    if (e.target.closest('.mc-md')) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([markdown()], { type: 'text/markdown' })); a.download = `${card.name}-v${card.version}.md`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
  });
  // Solo se reescriben los valores vivos, para no perder el foco de los botones.
  window.addEventListener('ex:metrics', e => {
    const first = !m; m = e.detail;
    if (first) { draw(); return; }
    const live = el.querySelectorAll('dd.live'); let i = 0;
    fields.forEach(([, v]) => { if (v && /\{/.test(v)) { if (live[i]) live[i].textContent = fill(v); i++; } });
  });
  draw();
}
