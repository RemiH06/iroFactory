// ══════════════════════════════════════════════════════
// Boot · arranque tipo BIOS, una vez por sesión: chequeo de memoria, las
// piezas reales del tema detectadas una por una, el huevo de Tamauijetto
// y el neón. Dura ~1.6 s; cualquier tecla, clic o toque lo salta. Con
// reduced motion no aparece al cargar. `reboot` en la terminal lo repite.
// ══════════════════════════════════════════════════════
import { reduceMotion } from './kit.js';
import { addCommand } from './terminal.js';
import { NAMES } from './pet.js';

const SEEN = 'sherry:booted';
const PARTS = ['capacitor 1500 µF', 'resistencias 220 Ω ×6', 'LilyPad', 'inductor toroidal', 'relé SRD-5VDC', 'IC 74HC08', 'ESP32 DevKit'];

function lines() {
  let pet = null;
  try { pet = JSON.parse(localStorage.getItem('sherry:pet')); } catch { pet = null; }
  const tama = !pet ? 'Tamauijetto ........ huevo nuevo, generación 1'
    : pet.diedAt ? `Tamauijetto ........ <span class="bad">sin señal</span> (gen ${pet.generation})`
    : `Tamauijetto ........ ${NAMES[pet.stage] || pet.stage}, generación ${pet.generation}`;
  return [
    '<b>SHERRY BIOS</b> v0.4.2 · construye desde basura',
    '(c) 2026 RemiH06 · iroFactory',
    '',
    'CPU ................ ESP32 dual core @ 240 MHz',
    'Memoria ............ <span class="cnt">0</span> K <span class="ok">OK</span>',
    '',
    'Detectando componentes:',
    ...PARTS.map(p => `  ${p.padEnd(22, '.')} <span class="ok">OK</span>`),
    '',
    tama,
    'Neón ............... <span class="ok">encendido</span>',
    '',
    'Arrancando sherry_theme<span class="dots"></span>',
  ];
}

export function mount() {
  const run = ({ fast = false } = {}) => {
    if (document.querySelector('.sh-boot')) return;
    const el = document.createElement('div');
    el.className = 'sh-boot';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<pre class="sh-boot-pre"></pre><p class="sh-boot-skip">cualquier tecla para saltar</p>';
    document.body.appendChild(el);
    const pre = el.querySelector('pre'), ls = lines();
    let i = 0, timer = 0, done = false;
    const close = () => {
      if (done) return; done = true;
      clearTimeout(timer);
      el.classList.add('is-out');
      setTimeout(() => el.remove(), reduceMotion.matches ? 0 : 320);
      removeEventListener('keydown', close, true); removeEventListener('pointerdown', close, true);
    };
    addEventListener('keydown', close, true); addEventListener('pointerdown', close, true);
    if (fast || reduceMotion.matches) { pre.innerHTML = ls.join('\n'); pre.querySelector('.cnt').textContent = '640'; timer = setTimeout(close, 1200); return; }
    const step = () => {
      pre.innerHTML += (i ? '\n' : '') + ls[i];
      const cnt = pre.querySelector('.cnt:not(.is-done)');
      if (cnt) { cnt.classList.add('is-done'); let k = 0; const up = () => { k = Math.min(640, k + 64); cnt.textContent = k; if (k < 640) setTimeout(up, 18); }; up(); }
      i++;
      if (i < ls.length) timer = setTimeout(step, ls[i - 1] === '' ? 40 : i > 6 && i < 7 + PARTS.length ? 70 : 90);
      else timer = setTimeout(close, 520);
    };
    step();
  };
  addCommand('reboot', { help: 'reinicia (vuelve a mostrar el arranque)', entry: { group: 'Acciones', label: 'Reiniciar (BIOS)', keys: 'boot bios arranque' }, fn: () => { setTimeout(() => run(), 80); return ['Reiniciando…']; } });
  let seen = false;
  try { seen = sessionStorage.getItem(SEEN) === '1'; sessionStorage.setItem(SEEN, '1'); } catch { seen = true; }
  if (!seen && !reduceMotion.matches) run();
}
