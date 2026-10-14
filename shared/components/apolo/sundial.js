// ══════════════════════════════════════════════════════
// El reloj de sol · una pastilla fija abajo a la izquierda con la hora del
// paño (helios-3d.js avisa con `ap:hour`): un cuadrante con la sombra
// del gnomon, la hora y el momento del día con su nombre griego (Ἠώς la
// aurora, Ἡμέρα el día, Ἑσπέρα el ocaso, Νύξ la noche). De noche el
// cuadrante no da sombra: marca la luna.
//   mount({ el })
// ══════════════════════════════════════════════════════
const NAMES = [[5, 'Ἠώς', 'aurora'], [8.5, 'Ἡμέρα', 'día'], [17, 'Ἑσπέρα', 'ocaso'], [20, 'Νύξ', 'noche'], [29, 'Ἠώς', 'aurora']];
const hourName = h => { const x = ((h % 24) + 24) % 24, y = x < 5 ? x + 24 : x; let n = NAMES[0]; for (const r of NAMES) if (y >= r[0]) n = r; return n; };

export function mount({ el = document.getElementById('ap-sundial') } = {}) {
  if (!el) return;
  el.innerHTML = `<svg viewBox="-22 -22 44 26" width="44" height="26" aria-hidden="true">
      <path d="M-20 0 A20 20 0 0 1 20 0 Z" class="ap-dial-face"/>
      ${Array.from({ length: 13 }, (_, i) => { const a = Math.PI * i / 12, x = -Math.cos(a), y = -Math.sin(a); return `<line x1="${(x * 14).toFixed(1)}" y1="${(y * 14).toFixed(1)}" x2="${(x * (i % 3 ? 17 : 19)).toFixed(1)}" y2="${(y * (i % 3 ? 17 : 19)).toFixed(1)}"/>`; }).join('')}
      <line class="ap-dial-shadow" x1="0" y1="0" x2="-16" y2="0"/><circle class="ap-dial-moon" r="2.6" cx="0" cy="-10"/>
    </svg><span class="ap-dial-text"><b class="ap-dial-greek" lang="grc"></b> <span class="ap-dial-name"></span> · <time class="ap-dial-time"></time></span>`;
  const shadow = el.querySelector('.ap-dial-shadow'), moon = el.querySelector('.ap-dial-moon');
  const greek = el.querySelector('.ap-dial-greek'), name = el.querySelector('.ap-dial-name'), time = el.querySelector('.ap-dial-time');
  document.addEventListener('ap:hour', ({ detail: { hour, sun } }) => {
    const h = ((hour % 24) + 24) % 24, hh = Math.floor(h), mm = Math.floor((h - hh) * 60 / 10) * 10;
    const clock = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    if (time.textContent !== clock) { time.textContent = clock; time.dateTime = clock; }
    const [, g, n] = hourName(hour); if (greek.textContent !== g) { greek.textContent = g; name.textContent = n; }
    // la sombra cae del lado contrario al sol y se acorta a mediodía
    const a = (hour - 6) / 12 * Math.PI, len = 8 + 9 * (1 - Math.max(0, sun));
    shadow.setAttribute('x2', (Math.cos(a) * len).toFixed(1)); shadow.setAttribute('y2', (-Math.abs(Math.sin(a)) * len).toFixed(1));
    el.classList.toggle('is-night', sun < -0.05);
    const ma = a - Math.PI; moon.setAttribute('cx', (-Math.cos(ma) * 12).toFixed(1)); moon.setAttribute('cy', (-Math.max(0, Math.sin(ma)) * 12).toFixed(1));
  });
}
