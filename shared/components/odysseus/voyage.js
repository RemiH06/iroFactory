// ══════════════════════════════════════════════════════
// Viaje: romper el pase → volar → llegar (carta y pase nuevos).
// ══════════════════════════════════════════════════════
import { $, updateHexes } from './kit.js';
import { HOME, PORTS } from './geography.js';
import { ticket } from './tear-ticket.js';
import { ports } from './ports.js';
import { map } from './world-map.js';

export function mount() {
(() => {
  const docs = [...document.querySelectorAll('.od-doc')], carta = $('#od-carta'), where = $('#od-where'), worldBtn = $('#od-world'), kicker = $('#od-kicker');
  let current = -1, last = -1, busy = false, queued = null;
  const nextOf = i => (i + 1) % PORTS.length;
  const showDoc = id => { docs.forEach(d => { d.hidden = d.dataset.port !== id; }); carta.scrollTop = 0; };
  const fromOf = i => (i < 0 ? HOME : PORTS[i]);
  const arrive = i => {
    current = i; if (i >= 0) last = i;
    const p = i >= 0 ? PORTS[i] : null, from = i >= 0 ? PORTS[i] : (last >= 0 ? PORTS[last] : HOME), to = PORTS[i >= 0 ? nextOf(i) : (last >= 0 ? nextOf(last) : 0)];
    showDoc(p ? p.id : 'intro');
    ticket.set(from, to, PORTS.indexOf(to) + 1);
    ports.show(i);
    worldBtn.hidden = i < 0;
    where.textContent = p ? `${p.wonder} · ${p.place}` : 'Mapamundi · 7 puertos';
    kicker.textContent = p ? `Puerto ${i + 1} de 7 · por visitar` : 'Bitácora · 7 puertos por visitar';
    busy = false;
    if (queued !== null) { const q = queued; queued = null; travel(q); }
  };
  function travel(i, alreadyTorn) {
    if (i === current) return;
    if (busy) { queued = i; return; }
    busy = true;
    const from = current;
    const go = () => map.flyTo(i, () => { if (i >= 0) map.markLeg(from < 0 && last < 0 ? 0 : i); arrive(i); });
    if (i < 0) { go(); return; }
    ticket.setTo(PORTS[i], i + 1);
    if (alreadyTorn) go(); else ticket.tear(go, null);
  }
  map.onPick = i => travel(i);
  ports.onPick = i => travel(i);
  ticket.onUserTear = () => travel(current >= 0 ? nextOf(current) : (last >= 0 ? nextOf(last) : 0), true);
  worldBtn.addEventListener('click', () => travel(-1));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && current >= 0) travel(-1); });
  arrive(-1);
})();
updateHexes();
}
