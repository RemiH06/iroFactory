// ══════════════════════════════════════════════════════
// Datos de ejemplo del linaje y los esquemas: un sistema de datos
// costeros (boyas, avistamientos de especies y mareas) que corre de las
// fuentes a las tablas finales y a quienes las usan. Cada columna sabe de
// dónde viene y qué transformación la produjo. Un bus comparte la tabla
// elegida entre los dos módulos.
// ══════════════════════════════════════════════════════
export const LAYERS = ['Fuentes', 'Limpieza', 'Intermedias', 'Tablas finales', 'Consumidores'];
const c = (name, from = [], how = '') => ({ name, from, how });
// fresh: minutos desde la última carga; sla: cada cuánto debe llegar (null = catálogo fijo).
export const NODES = [
  { id: 'boyas', name: 'boyas.lecturas_crudas', layer: 0, kind: 'flujo', fresh: 2, sla: 10, desc: 'Lecturas de 14 boyas cada minuto, tal como llegan.', cols: [c('boya_id'), c('ts'), c('temp_f'), c('salinidad'), c('profundidad_m')] },
  { id: 'zonas', name: 'ref.zonas', layer: 0, kind: 'catálogo', fresh: 43200, sla: null, desc: 'Qué boya está en qué zona de la costa.', cols: [c('boya_id'), c('zona'), c('lat'), c('lon')] },
  { id: 'avist', name: 'avistamientos.csv', layer: 0, kind: 'archivo', fresh: 540, sla: 1560, desc: 'Conteos de especies que suben los observadores cada noche.', cols: [c('fecha'), c('especie'), c('zona'), c('conteo'), c('observador')] },
  { id: 'mareas', name: 'api.mareas', layer: 0, kind: 'API', fresh: 420, sla: 60, desc: 'Altura de la marea por estación, cada 15 minutos.', cols: [c('estacion'), c('ts'), c('altura_m')] },
  { id: 'stg_lect', name: 'stg_lecturas', layer: 1, kind: 'tabla', fresh: 4, sla: 15, desc: 'Lecturas limpias: grados Celsius, UTC y zona.', cols: [
    c('boya_id', [['boyas', 'boya_id']]), c('ts', [['boyas', 'ts']], 'a UTC'), c('temp_c', [['boyas', 'temp_f']], '(temp_f − 32) · 5/9'),
    c('salinidad', [['boyas', 'salinidad']], 'se descartan valores fuera de 0 a 42'), c('zona', [['zonas', 'zona']], 'unión por boya_id')] },
  { id: 'stg_avist', name: 'stg_avistamientos', layer: 1, kind: 'tabla', fresh: 545, sla: 1560, desc: 'Avistamientos con el nombre científico normalizado.', cols: [
    c('fecha', [['avist', 'fecha']]), c('especie', [['avist', 'especie']], 'nombre científico normalizado'), c('zona', [['avist', 'zona']]), c('conteo', [['avist', 'conteo']], 'entero ≥ 0')] },
  { id: 'stg_mar', name: 'stg_mareas', layer: 1, kind: 'tabla', fresh: 425, sla: 60, desc: 'Mareas con la zona de la estación más cercana.', cols: [
    c('ts', [['mareas', 'ts']]), c('altura_m', [['mareas', 'altura_m']]), c('zona', [['mareas', 'estacion']], 'estación más cercana')] },
  { id: 'int_hora', name: 'int_lecturas_horarias', layer: 2, kind: 'tabla', fresh: 35, sla: 70, desc: 'Promedios por zona y hora.', cols: [
    c('zona', [['stg_lect', 'zona']]), c('hora', [['stg_lect', 'ts']], 'truncar a la hora'), c('temp_c', [['stg_lect', 'temp_c']], 'promedio de la hora'), c('salinidad', [['stg_lect', 'salinidad']], 'promedio de la hora')] },
  { id: 'int_avist', name: 'int_avistamientos_dia', layer: 2, kind: 'tabla', fresh: 550, sla: 1560, desc: 'Conteo por especie, zona y día.', cols: [
    c('zona', [['stg_avist', 'zona']]), c('fecha', [['stg_avist', 'fecha']]), c('especie', [['stg_avist', 'especie']]), c('conteo', [['stg_avist', 'conteo']], 'suma del día')] },
  { id: 'mart_cond', name: 'mart_condiciones_diarias', layer: 3, kind: 'tabla', fresh: 50, sla: 1440, desc: 'Condiciones del mar por zona y día.', cols: [
    c('zona', [['int_hora', 'zona']]), c('fecha', [['int_hora', 'hora']], 'truncar al día'), c('temp_media', [['int_hora', 'temp_c']], 'promedio del día'), c('temp_max', [['int_hora', 'temp_c']], 'máximo del día'),
    c('salinidad_psu', [['int_hora', 'salinidad']], 'promedio del día'), c('marea_max', [['stg_mar', 'altura_m']], 'máximo del día, unión por zona'), c('oxigeno_mg_l', [], 'llega en la versión 2, todavía sin fuente')] },
  { id: 'mart_esp', name: 'mart_especies_temp', layer: 3, kind: 'tabla', fresh: 560, sla: 1560, desc: 'Cuántos de cada especie se vieron y a qué temperatura.', cols: [
    c('especie', [['int_avist', 'especie']]), c('zona', [['int_avist', 'zona']]), c('fecha', [['int_avist', 'fecha']]), c('conteo', [['int_avist', 'conteo']]),
    c('temp_media', [['mart_cond', 'temp_media']], 'unión por zona y fecha')] },
  { id: 'tablero', name: 'Tablero costero', layer: 4, kind: 'tablero', fresh: null, sla: null, uses: ['mart_cond'], desc: 'Lo consulta protección civil cada mañana.', cols: [] },
  { id: 'alerta', name: 'Alerta de marea roja', layer: 4, kind: 'alerta', fresh: null, sla: null, uses: ['int_hora'], desc: 'Avisa si la temperatura sube y la salinidad baja tres horas seguidas.', cols: [] },
  { id: 'modelo', name: 'Modelo de migración', layer: 4, kind: 'modelo', fresh: null, sla: null, uses: ['mart_esp'], desc: 'Predice dónde aparecerá cada especie según la temperatura.', cols: [] }
];
export const node = id => NODES.find(n => n.id === id);
export const parents = id => { const n = node(id); return [...new Set([...(n.uses || []), ...n.cols.flatMap(k => k.from.map(f => f[0]))])]; };
export const children = id => NODES.filter(n => parents(n.id).includes(id)).map(n => n.id);
export const closure = (id, step) => { const seen = new Set(), go = x => step(x).forEach(y => { if (!seen.has(y)) { seen.add(y); go(y); } }); go(id); return seen; };

// Esquemas en CQL (keyspace shui). role: pk = partición, ck = agrupación (con orden).
const col = (name, type, desc, ex, role) => ({ name, type, desc, ex, role });
export const SCHEMAS = {
  boyas: { table: 'shui.lecturas_crudas', query: 'SELECT * FROM lecturas_crudas WHERE boya_id = ? AND ts > ?', ttl: 7776000, order: ['ts', 'DESC'], cols: [
    col('boya_id', 'text', 'Identificador de la boya', 'B-07', 'pk'), col('ts', 'timestamp', 'Hora de la lectura, hora local del equipo', '2026-10-14 06:31:00', 'ck'),
    col('temp_f', 'double', 'Temperatura del agua en °F', '79.2'), col('salinidad', 'double', 'Salinidad práctica (PSU)', '34.8'), col('profundidad_m', 'double', 'Profundidad del sensor', '1.5')] },
  stg_lect: { table: 'shui.stg_lecturas', query: 'SELECT * FROM stg_lecturas WHERE zona = ? AND ts > ?', order: ['ts', 'DESC'], cols: [
    col('zona', 'text', 'Zona de la costa', 'bahía norte', 'pk'), col('ts', 'timestamp', 'Hora de la lectura en UTC', '2026-10-14 12:31:00', 'ck'), col('boya_id', 'text', 'Boya de origen', 'B-07', 'ck'),
    col('temp_c', 'double', 'Temperatura en °C', '26.2'), col('salinidad', 'double', 'Salinidad (PSU), entre 0 y 42', '34.8')] },
  int_hora: { table: 'shui.int_lecturas_horarias', query: 'SELECT * FROM int_lecturas_horarias WHERE zona = ? AND hora >= ?', order: ['hora', 'DESC'], cols: [
    col('zona', 'text', 'Zona de la costa', 'bahía norte', 'pk'), col('hora', 'timestamp', 'Inicio de la hora (UTC)', '2026-10-14 12:00:00', 'ck'),
    col('temp_c', 'double', 'Temperatura media de la hora', '26.1'), col('salinidad', 'double', 'Salinidad media de la hora', '34.7')] },
  stg_avist: { table: 'shui.stg_avistamientos', query: 'SELECT * FROM stg_avistamientos WHERE zona = ? AND fecha = ?', cols: [
    col('zona', 'text', 'Zona del avistamiento', 'arrecife sur', 'pk'), col('fecha', 'date', 'Día del avistamiento', '2026-10-13', 'pk'), col('especie', 'text', 'Nombre científico', 'Nemichthys scolopaceus', 'ck'),
    col('conteo', 'int', 'Individuos vistos', '3')] },
  mart_cond: { table: 'shui.mart_condiciones_diarias', query: 'SELECT * FROM mart_condiciones_diarias WHERE zona = ? AND fecha >= ?', order: ['fecha', 'DESC'],
    versions: {
      v1: [col('zona', 'text', 'Zona de la costa', 'bahía norte', 'pk'), col('fecha', 'date', 'Día', '2026-10-13', 'ck'), col('temp', 'double', 'Temperatura media del día', '26.0'),
        col('temp_max', 'double', 'Máxima del día', '27.4'), col('salinidad', 'int', 'Salinidad redondeada', '35'), col('marea_max', 'double', 'Marea más alta del día (m)', '1.8')],
      v2: [col('zona', 'text', 'Zona de la costa', 'bahía norte', 'pk'), col('fecha', 'date', 'Día', '2026-10-13', 'ck'), col('temp_media', 'double', 'Temperatura media del día', '26.0'),
        col('temp_max', 'double', 'Máxima del día', '27.4'), col('salinidad_psu', 'double', 'Salinidad media (PSU), con decimales', '34.72'), col('marea_max', 'double', 'Marea más alta del día (m)', '1.8'),
        col('oxigeno_mg_l', 'double', 'Oxígeno disuelto', '6.1')] },
    renames: { temp: 'temp_media', salinidad: 'salinidad_psu' } }
};

const bus = new EventTarget();
export const pick = (id, from) => bus.dispatchEvent(new CustomEvent('pick', { detail: { id, from } }));
export const onPick = fn => bus.addEventListener('pick', e => fn(e.detail));
const span = m => m < 60 ? `${m} min` : m < 1440 || m % 1440 ? `${Math.round(m / 60)} h` : m === 1440 ? 'día' : `${m / 1440} días`;
export const ago = m => m == null ? '·' : m >= 2880 ? `hace ${Math.round(m / 1440)} días` : m >= 1440 ? 'hace un día' : `hace ${span(m)}`;
export const every = m => `cada ${span(m)}`;
