// ══════════════════════════════════════════════════════
// DIAGRAMA DE TIEMPOS · SPI y UART dibujados desde los registros, no a
// mano: CPOL, CPHA, DORD y el divisor de SPCR/SPSR mueven el reloj, el
// orden de los bits y los flancos de muestreo; UCSR0B/C y UBRR0L dan el
// tamaño, la paridad, los bits de paro y el tiempo de bit de la trama.
// El byte se escribe en hexadecimal. Cada fila nombra su pin; al pasar
// por ella se enciende en el diagrama de pines, y al revés.
//   mount({ el })
// ══════════════════════════════════════════════════════
import { PINS, on, pinFocus, spi, uart, hz } from './datasheet-data.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const pin = name => PINS.find(p => p.funcs.includes(name));
const us = s => s >= 1e-3 ? `${+(s * 1e3).toFixed(2)} ms` : `${+(s * 1e6).toFixed(2)} µs`;

export function mount({ el = document.getElementById('fg-timing') } = {}) {
  if (!el) return;
  let tab = 'spi', mosi = 0xA5, miso = 0x3C, tx = 0x4B, hot = 0;
  el.innerHTML = `<div class="tm-bar"><div class="tm-tabs" role="tablist" aria-label="Protocolo"><button type="button" role="tab" class="btn" data-t="spi">SPI</button><button type="button" role="tab" class="btn" data-t="uart">UART</button></div>
      <div class="tm-bytes"></div></div>
    <p class="tm-sum" aria-live="polite"></p><div class="tm-plot"></div><p class="tm-legend muted"></p>`;
  const $ = s => el.querySelector(s), plot = $('.tm-plot');

  const byteInput = (label, key, v) => `<label class="tm-byte">${label} <span>0x</span><input data-k="${key}" value="${v.toString(16).toUpperCase().padStart(2, '0')}" maxlength="2" spellcheck="false" autocomplete="off" inputmode="text" pattern="[0-9a-fA-F]{1,2}" aria-label="${label} en hexadecimal"></label>`;
  function bytes() { $('.tm-bytes').innerHTML = tab === 'spi' ? byteInput('MOSI', 'mosi', mosi) + byteInput('MISO', 'miso', miso) : byteInput('dato', 'tx', tx); }

  // Dibuja una fila digital a partir de tramos [t0, t1, nivel, etiqueta]; nivel null = sin manejar.
  function rows(list, T, sample) {
    const W = Math.max(300, plot.clientWidth || 700), LBL = W < 520 ? 88 : Math.min(132, W * 0.3), RH = 40, top = 22, H = top + list.length * RH + 24;
    const x = t => LBL + (W - LBL - 10) * (t / T);
    let out = '';
    list.forEach((r, i) => {
      const y0 = top + i * RH, hi = y0 + 8, lo = y0 + RH - 12, mid = (hi + lo) / 2;
      let d = '', prev = null;
      r.spans.forEach(([a, b, lv]) => {
        const y = lv == null ? mid : lv ? hi : lo;
        d += prev == null ? `M${x(a)},${y}` : `L${x(a)},${y}`; d += `L${x(b)},${y}`; prev = y;
      });
      const labels = r.spans.filter(s => s[3] != null).map(([a, b, , t]) => `<text class="tm-bitlab" x="${(x(a) + x(b)) / 2}" y="${lo + 11}" text-anchor="middle">${esc(t)}</text>`).join('');
      const p = r.pin;
      out += `<g class="tm-row${p && p.n === hot ? ' is-hot' : ''}" data-pin="${p ? p.n : ''}"><rect class="tm-hit" x="0" y="${y0}" width="${W}" height="${RH}"/>
        <text class="tm-name" x="0" y="${mid - 2}">${esc(r.name)}</text><text class="tm-pin" x="0" y="${mid + 11}">${p ? (W < 520 ? `${p.name} · pin ${p.n}` : `${p.name}${p.ard ? ' · ' + p.ard : ''} · pin ${p.n}`) : ''}</text>
        <path class="tm-wave ${r.cls || ''}" d="${d}"/>${labels}</g>`;
    });
    const marks = sample.map(t => `<line class="tm-sample" x1="${x(t)}" x2="${x(t)}" y1="${top - 4}" y2="${H - 22}"/>`).join('');
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(list.map(r => r.name).join(', '))}">${marks}${out}</svg>`;
  }

  function draw() {
    el.querySelectorAll('.tm-tabs .btn').forEach(b => { const on = b.dataset.t === tab; b.setAttribute('aria-selected', String(on)); b.setAttribute('aria-pressed', String(on)); });
    if (tab === 'spi') {
      const s = spi(), T = 18, order = i => s.lsb ? i : 7 - i, bitOf = (v, i) => (v >> order(i)) & 1;
      const span = i => s.cpha ? [1 + 2 * i, 3 + 2 * i] : [i ? 2 * i : 0.5, 2 * i + 2];
      const data = (v, name, cls) => {
        const sp = [[0, span(0)[0], null]];
        for (let i = 0; i < 8; i++) { const [a, b] = span(i); sp.push([a, b, s.on ? bitOf(v, i) : null, s.on ? `${bitOf(v, i)}` : null]); }
        sp.push([span(7)[1], T, null]);
        return { name, pin: pin(name), spans: sp, cls };
      };
      // 16 flancos en t = 1…16: los impares son el primer flanco de cada bit; en t = 16 vuelve al reposo.
      const sck = [[0, 1, s.cpol]]; for (let k = 1; k < 16; k++) sck.push([k, k + 1, (s.cpol + k) % 2]); sck.push([16, T, s.cpol]);
      const list = [{ name: 'SS', pin: pin('SS'), spans: [[0, 0.5, 1], [0.5, 17.5, s.on ? 0 : 1], [17.5, T, 1]] },
        { name: 'SCK', pin: pin('SCK'), spans: s.on ? sck : [[0, T, s.cpol]], cls: 'clk' },
        data(mosi, 'MOSI', 'mosi'), data(miso, 'MISO', 'miso')];
      const sample = s.on ? Array.from({ length: 8 }, (_, i) => s.cpha ? 2 + 2 * i : 1 + 2 * i) : [];
      plot.innerHTML = rows(list, T, sample);
      $('.tm-sum').innerHTML = s.on ? `<b>Modo ${s.cpol * 2 + s.cpha}</b>: SCK en reposo ${s.cpol ? 'alto' : 'bajo'}, muestrea en el ${s.cpha ? 'segundo' : 'primer'} flanco (${(s.cpol ^ s.cpha) ? 'de bajada' : 'de subida'}), ${s.lsb ? 'LSB' : 'MSB'} primero. SCK a ${hz(s.hz)}: un bit dura ${us(1 / s.hz)}, el byte ${us(8 / s.hz)}.${s.master ? '' : ' En esclavo, el reloj lo pone el maestro.'}`
        : '<b>SPI apagado</b>: SPE = 0 en SPCR. Enciéndelo en la tabla de registros.';
      $('.tm-legend').textContent = 'Las líneas punteadas son los flancos de muestreo: ahí se lee cada bit de MOSI y MISO.';
    } else {
      const u = uart(), n = Math.min(u.size, 9), bits = [];
      for (let i = 0; i < n; i++) bits.push(i < 8 ? (tx >> i) & 1 : 1);
      const ones = bits.reduce((a, b) => a + b, 0), par = u.parity === 'even' ? ones % 2 : u.parity === 'odd' ? 1 - ones % 2 : null;
      const seq = [[0, 'inicio']].concat(bits.map((b, i) => [b, `d${i}`]));
      if (par != null) seq.push([par, 'P']);
      for (let i = 0; i < u.stop; i++) seq.push([1, 'paro']);
      const T = seq.length + 2, spans = [[0, 1, 1]];
      seq.forEach(([v, l], i) => spans.push([1 + i, 2 + i, u.tx ? v : 1, u.tx ? `${l === 'inicio' || l === 'paro' ? '' : v}` : null]));
      spans.push([T - 1, T, 1]);
      const fields = { name: 'trama', pin: null, spans: [[0, 1, null]].concat(seq.map(([, l], i) => [1 + i, 2 + i, null, l])).concat([[T - 1, T, null]]), cls: 'fields' };
      plot.innerHTML = rows([fields, { name: 'TXD', pin: pin('TXD'), spans, cls: 'mosi' }], T, u.tx ? seq.map((_, i) => 1.5 + i) : []);
      const frame = `${u.size}${{ none: 'N', even: 'E', odd: 'O', reserved: '?' }[u.parity]}${u.stop}`;
      $('.tm-sum').innerHTML = u.mode ? '<b>El USART no está en modo asíncrono</b> (UMSEL0 en UCSR0C): esta trama es la del modo asíncrono.' : !u.tx ? '<b>Transmisor apagado</b>: TXEN0 = 0 en UCSR0B; la línea se queda en alto.'
        : `<b>${frame}</b> a ${Math.round(u.baud)} baudios: un bit dura ${us(1 / u.baud)} y la trama de ${seq.length} bits ${us(seq.length / u.baud)}. Reposo en alto, inicio en bajo, datos del bit 0 al ${n - 1}${par != null ? `, paridad ${u.parity === 'even' ? 'par' : 'impar'} = ${par}` : ''}.`;
      $('.tm-legend').textContent = 'El receptor lee cada bit a la mitad (líneas punteadas); por eso tolera un poco de error en los baudios.';
    }
  }
  el.querySelector('.tm-tabs').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) { tab = b.dataset.t; bytes(); draw(); } });
  el.addEventListener('input', e => {
    const i = e.target.closest('.tm-byte input'); if (!i) return;
    const clean = i.value.replace(/[^0-9a-f]/gi, '').slice(0, 2).toUpperCase(); if (clean !== i.value) i.value = clean;
    const v = parseInt(clean || '0', 16); if (i.dataset.k === 'mosi') mosi = v; else if (i.dataset.k === 'miso') miso = v; else tx = v; draw();
  });
  plot.addEventListener('pointerover', e => { const g = e.target.closest('.tm-row'); const n = g && +g.dataset.pin; if (n && n !== hot) pinFocus(n, 'timing'); });
  plot.addEventListener('pointerleave', () => { if (hot) pinFocus(0, 'timing'); });
  on('change', draw);
  on('pin', ({ n, source }) => {
    hot = n || 0; const p = PINS.find(x => x.n === n);
    if (source === 'pinout' && p) { const t = p.groups.includes('spi') ? 'spi' : p.funcs.some(f => f === 'TXD' || f === 'RXD') ? 'uart' : null; if (t && t !== tab) { tab = t; bytes(); } }
    draw();
  });
  new ResizeObserver(() => { const w = plot.clientWidth; if (w && w !== draw.w) { draw.w = w; draw(); } }).observe(plot);
  bytes(); draw();
}
