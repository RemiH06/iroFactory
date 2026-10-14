// ══════════════════════════════════════════════════════
// Live Metrics · las métricas dejan de ser adorno: leen la página.
// Cuadros por segundo del neón (con su gráfica en ASCII de los últimos
// 24 s), comandos y regex de siempre, tiempo de esta visita, la vida de la
// mascota y las soldaduras. Se actualizan cada segundo solo a la vista.
//   mount({ el })  ·  en el marcado, cada valor lleva data-metric:
//   fps, spark, cmd, regex, session, pet, petlife, solder
// ══════════════════════════════════════════════════════
import { bloomInfo } from './neon-bloom.js';
import { total, startedAt } from './stats.js';
import { petInfo } from './pet.js';

const BARS = '▁▂▃▄▅▆▇█';

export function mount({ el }) {
  const root = typeof el === 'string' ? document.querySelector(el) : el;
  if (!root) return;
  const m = k => root.querySelector(`[data-metric="${k}"]`);
  const hist = [];
  let timer = 0;
  const tick = () => {
    hist.push(bloomInfo.fps); if (hist.length > 24) hist.shift();
    const max = Math.max(60, ...hist);
    const set = (k, v) => { const n = m(k); if (n && n.textContent !== String(v)) n.textContent = v; };
    set('fps', bloomInfo.fps || '·');
    set('spark', hist.map(v => BARS[Math.min(7, Math.round(v / max * 7))]).join('').padStart(24, BARS[0]));
    set('cmd', total.cmd || 0);
    set('regex', total.regex || 0);
    const s = Math.floor((performance.now() - startedAt) / 1000);
    set('session', `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
    const p = petInfo();
    set('pet', p ? p.name : '·');
    set('petlife', p ? `${Math.round(p.health * 100)}% · ${p.moodLabel}` : 'sin mascota');
    set('solder', total.solder || 0);
  };
  new IntersectionObserver(([e]) => {
    clearInterval(timer);
    if (e.isIntersecting) { tick(); timer = setInterval(tick, 1000); }
  }).observe(root);
}
