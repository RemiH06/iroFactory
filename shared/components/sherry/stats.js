// ══════════════════════════════════════════════════════
// Stats · el bus de actividad de sherry. Cada cosa que se hace en la
// página suma a un contador (comandos, regex probadas, piezas soldadas…);
// de aquí come la mascota y de aquí leen las métricas. Los totales se
// recuerdan entre visitas; `session` cuenta solo esta visita.
//   bump('cmd')  ·  onStat((key, n) => …)  ·  total.cmd  ·  session.cmd
// Claves: cmd, regex, json, neon, sign, solder, pulse, feed, play.
// ══════════════════════════════════════════════════════
const KEY = 'sherry:stats';
let saved = {};
try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { saved = {}; }

export const total = saved;
export const session = {};
export const startedAt = performance.now();
const fns = [];
export const onStat = fn => fns.push(fn);

let pending = 0;
export function bump(key, n = 1) {
  total[key] = (total[key] || 0) + n;
  session[key] = (session[key] || 0) + n;
  fns.forEach(fn => fn(key, n));
  clearTimeout(pending);
  pending = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(total)); } catch { /* sin almacenamiento */ } }, 400);
}
