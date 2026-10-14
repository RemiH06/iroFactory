// ══════════════════════════════════════════════════════
// TABLA DE REGISTROS · cada registro con dirección, valor de reinicio y
// sus ocho bits como interruptores (los de solo lectura y los reservados
// no se mueven). Debajo, lo que significa el valor en palabras, avisos de
// configuraciones que fallan en la vida real, y la línea de C lista para
// copiar. Filtro por nombre de registro o de bit; valores de ejemplo o de
// reinicio. Mueve el estado compartido (datasheet-data.js).
//   mount({ el })
// ══════════════════════════════════════════════════════
import { REGS, PINS, CHIP, state, bit, set, resetAll, on, spi, uart, hz } from './datasheet-data.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const hex = v => '0x' + v.toString(16).toUpperCase().padStart(2, '0');
const bin = v => v.toString(2).padStart(8, '0').replace(/(\d{4})(\d{4})/, '$1 $2');
const ard = n => { const p = PINS.find(x => x.name === n); return p && p.ard ? ` (${p.ard})` : ''; };
const BAUDS = [2400, 4800, 9600, 14400, 19200, 38400, 57600, 115200, 250000, 500000, 1000000];

// Lectura de cada registro: [texto, avisos].
function read(name) {
  const warns = [];
  if (name === 'SPCR') {
    const s = spi();
    if (s.on && s.master && !bit('DDRB', 'DDB2') && !bit('PORTB', 'PORTB2')) warns.push('SS (PB2) es entrada sin pull-up: un nivel bajo por ruido pasa el SPI a esclavo. Hazla salida en DDRB.');
    if (s.on && s.master && !(bit('DDRB', 'DDB3') && bit('DDRB', 'DDB5'))) warns.push('En maestro, MOSI (PB3) y SCK (PB5) tienen que ser salidas en DDRB.');
    return [s.on ? `SPI encendido, ${s.master ? 'maestro' : 'esclavo'}, modo ${s.cpol * 2 + s.cpha} (CPOL ${s.cpol}, CPHA ${s.cpha}), ${s.lsb ? 'LSB' : 'MSB'} primero, SCK = fosc/${s.div} = ${hz(s.hz)}` : 'SPI apagado (SPE = 0).', warns];
  }
  if (name === 'SPSR') return [bit('SPSR', 'SPI2X') ? `Velocidad doble: SCK = ${hz(spi().hz)}.` : 'Velocidad normal.', warns];
  if (name === 'UCSR0A') return [`${bit('UCSR0A', 'U2X0') ? 'Velocidad doble (divide entre 8).' : 'Velocidad normal (divide entre 16).'} ${bit('UCSR0A', 'UDRE0') ? 'UDRE0 = 1: listo para escribir en UDR0.' : ''}`, warns];
  if (name === 'UCSR0B') { const u = uart(); return [`Receptor ${u.rx ? 'encendido' : 'apagado'}, transmisor ${u.tx ? 'encendido' : 'apagado'}.`, warns]; }
  if (name === 'UCSR0C') {
    const u = uart(), modes = ['asíncrono', 'síncrono', 'reservado', 'SPI maestro'];
    if (u.parity === 'reserved') warns.push('UPM0 = 01 está reservado.');
    return [`Modo ${modes[u.mode]}; trama ${u.size}${{ none: 'N', even: 'E', odd: 'O', reserved: '?' }[u.parity]}${u.stop}: ${u.size} bits de datos, ${{ none: 'sin paridad', even: 'paridad par', odd: 'paridad impar', reserved: 'paridad reservada' }[u.parity]}, ${u.stop} de paro.`, warns];
  }
  if (name === 'UBRR0L') {
    const u = uart(), near = BAUDS.reduce((a, b) => Math.abs(b - u.baud) < Math.abs(a - u.baud) ? b : a), err = (u.baud / near - 1) * 100;
    if (Math.abs(err) > 2) warns.push(`Error de ${err.toFixed(1)} % contra ${near} baudios: con más de 2 % la trama llega corrupta.`);
    return [`${Math.round(u.baud)} baudios a ${CHIP.fosc / 1e6} MHz; el estándar más cercano es ${near} (error ${err >= 0 ? '+' : ''}${err.toFixed(2)} %).`, warns];
  }
  if (name === 'ADCSRA') {
    const ps = [2, 2, 4, 8, 16, 32, 64, 128][bit('ADCSRA', 'ADPS2') * 4 + bit('ADCSRA', 'ADPS1') * 2 + bit('ADCSRA', 'ADPS0')], f = CHIP.fosc / ps;
    if (bit('ADCSRA', 'ADEN') && (f < 50e3 || f > 200e3)) warns.push(`Reloj del ADC en ${hz(f)}: para los 10 bits completos tiene que estar entre 50 y 200 kHz.`);
    return [`ADC ${bit('ADCSRA', 'ADEN') ? 'encendido' : 'apagado'}; prescaler ${ps}, reloj ${hz(f)}; una conversión tarda 13 ciclos: ${(13 / f * 1e6).toFixed(0)} µs.`, warns];
  }
  if (name === 'TCCR0A') {
    const wgm = bit('TCCR0A', 'WGM01') * 2 + bit('TCCR0A', 'WGM00'), modes = ['normal', 'PWM de fase correcta', 'CTC', 'PWM rápido'], pwm = wgm % 2 === 1;
    const com = (h, l) => { const c = bit('TCCR0A', h) * 2 + bit('TCCR0A', l); return pwm ? ['desconectada', 'reservada', 'no invertida', 'invertida'][c] : ['desconectada', 'conmuta', 'se limpia', 'se pone'][c]; };
    return [`Modo ${modes[wgm]} (con WGM02 = 0). OC0A${ard('PD6')}: ${com('COM0A1', 'COM0A0')}; OC0B${ard('PD5')}: ${com('COM0B1', 'COM0B0')}.`, warns];
  }
  if (name === 'DDRB' || name === 'PORTB') {
    const outs = [], ins = [];
    for (let i = 0; i < 8; i++) { const n = `PB${i}`, d = (state.DDRB >> i) & 1, p = (state.PORTB >> i) & 1; (d ? outs : ins).push(`${n}${ard(n)} ${d ? (p ? 'en alto' : 'en bajo') : (p ? 'con pull-up' : 'flotante')}`); }
    return [name === 'DDRB' ? `Salidas: ${outs.length ? outs.map(s => s.split(' ').slice(0, 2).join(' ')).join(', ') : 'ninguna'}.` : `Salidas: ${outs.join(', ') || 'ninguna'}. Entradas: ${ins.filter(s => s.includes('pull-up')).join(', ') || 'todas flotantes'}${ins.some(s => s.includes('flotante')) && ins.some(s => s.includes('pull-up')) ? '; las demás flotantes' : ''}.`, warns];
  }
  return ['', warns];
}
const code = r => {
  const v = state[r.name];
  if (r.num) return `${r.name} = ${v};  // ${hex(v)}`;
  const on = r.bits.map((b, i) => b && (v >> (7 - i)) & 1 && b[1] === 'R/W' ? b[0] : null).filter(Boolean);
  return `${r.name} = ${on.length ? on.map(n => `(1 << ${n})`).join(' | ') : '0'};  // ${hex(v)}`;
};

export function mount({ el = document.getElementById('fg-regs') } = {}) {
  if (!el) return;
  el.innerHTML = `<div class="rg-bar"><label class="rg-find"><span>Buscar</span><input type="search" placeholder="SPCR, CPOL, baudios…" autocomplete="off"></label>
      <div class="rg-presets"><button type="button" class="btn rg-start">valores de ejemplo</button><button type="button" class="btn rg-reset">valores de reinicio</button></div></div>
    <div class="rg-list">${REGS.map(r => `<article class="rg" data-reg="${r.name}" data-g="${r.group}">
      <header class="rg-head"><h4>${r.name}</h4><span class="rg-addr">${hex(r.addr)}</span><span class="rg-desc">${esc(r.desc)}</span><span class="rg-val" aria-live="polite"></span></header>
      <div class="rg-bits" role="group" aria-label="Bits de ${r.name}">${r.bits.map((b, i) => b ? `<button type="button" class="rg-bit${b[1] === 'R' ? ' ro' : ''}" data-i="${i}" aria-pressed="false"${b[1] === 'R' ? ' aria-disabled="true"' : ''} title="${esc(b[0])} · ${b[1] === 'R' ? 'solo lectura' : 'lectura y escritura'}"><small>${7 - i}</small><b>${b[0]}</b><i></i></button>` : `<span class="rg-bit rsv" aria-hidden="true"><small>${7 - i}</small><b>·</b></span>`).join('')}</div>
      <p class="rg-help muted" aria-live="polite">reinicio ${hex(r.reset)}${r.num ? ' · <label class="rg-num">valor <input type="number" min="0" max="255" inputmode="numeric"></label>' : ''}</p>
      <p class="rg-read"></p><ul class="rg-warn"></ul>
      <div class="rg-code"><code></code><button type="button" class="btn rg-copy" aria-label="Copiar la línea de ${r.name}">copiar</button></div>
    </article>`).join('')}</div>
    <p class="rg-none muted" hidden>Ningún registro coincide.</p>`;
  const cards = [...el.querySelectorAll('.rg')];
  const paint = () => cards.forEach(c => {
    const r = REGS.find(x => x.name === c.dataset.reg), v = state[r.name];
    c.querySelector('.rg-val').textContent = `${hex(v)} · ${bin(v)}`;
    c.querySelectorAll('.rg-bit[data-i]').forEach(b => { const on = (v >> (7 - +b.dataset.i)) & 1; b.setAttribute('aria-pressed', String(!!on)); b.querySelector('i').textContent = on; });
    const [t, w] = read(r.name); c.querySelector('.rg-read').textContent = t;
    c.querySelector('.rg-warn').innerHTML = w.map(x => `<li>${esc(x)}</li>`).join('');
    c.querySelector('code').textContent = code(r);
    const num = c.querySelector('.rg-num input'); if (num && document.activeElement !== num) num.value = v;
    c.classList.toggle('is-off', v === r.reset);
  });
  el.addEventListener('click', e => {
    const b = e.target.closest('.rg-bit[data-i]');
    if (b) {
      const c = b.closest('.rg'), r = REGS.find(x => x.name === c.dataset.reg), i = +b.dataset.i;
      if (r.bits[i][1] === 'R') { help(c, r, i, ' Solo lectura: lo pone el hardware.'); return; }
      set(r.name, state[r.name] ^ (1 << (7 - i))); help(c, r, i); return;
    }
    const cp = e.target.closest('.rg-copy');
    if (cp) { const t = cp.previousElementSibling.textContent, o = cp.textContent; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { cp.textContent = 'copiado'; }, () => { cp.textContent = 'no se pudo'; }).finally(() => setTimeout(() => { cp.textContent = o; }, 1300)); }
    if (e.target.closest('.rg-start')) resetAll('start');
    if (e.target.closest('.rg-reset')) resetAll('reset');
  });
  const help = (c, r, i, extra = '') => { const b = r.bits[i]; c.querySelector('.rg-help').innerHTML = `<b>${esc(b[0])}</b> (bit ${7 - i}, ${b[1] === 'R' ? 'solo lectura' : 'lectura y escritura'}): ${esc(b[2])}${extra}${r.num ? ' · <label class="rg-num">valor <input type="number" min="0" max="255" inputmode="numeric" value="' + state[r.name] + '"></label>' : ''}`; };
  el.addEventListener('pointerover', e => { const b = e.target.closest('.rg-bit[data-i]'); if (b) { const c = b.closest('.rg'); help(c, REGS.find(x => x.name === c.dataset.reg), +b.dataset.i); } });
  el.addEventListener('focusin', e => { const b = e.target.closest('.rg-bit[data-i]'); if (b) { const c = b.closest('.rg'); help(c, REGS.find(x => x.name === c.dataset.reg), +b.dataset.i); } });
  el.addEventListener('input', e => {
    const n = e.target.closest('.rg-num input'); if (n) { const v = Math.max(0, Math.min(255, Math.round(+n.value || 0))); set(n.closest('.rg').dataset.reg, v); return; }
    const q = e.target.closest('.rg-find input'); if (!q) return;
    const t = q.value.trim().toLowerCase(); let shown = 0;
    cards.forEach(c => { const r = REGS.find(x => x.name === c.dataset.reg), hay = [r.name, r.desc, ...r.bits.filter(Boolean).map(b => b[0])].join(' ').toLowerCase(); const ok = !t || hay.includes(t) || (t.startsWith('baud') && r.group === 'uart'); c.hidden = !ok; shown += ok; });
    el.querySelector('.rg-none').hidden = shown > 0;
  });
  on('change', paint); paint();
}
