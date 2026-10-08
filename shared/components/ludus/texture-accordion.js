// ══════════════════════════════════════════════════════
// Acordeón con texturas: cada renglón lleva
// su número romano, una etiqueta chica y su propia textura de fondo
// (puntos enlazados, código de barras, rayado, rejilla, damero…); al abrirlo
// se enciende su borde con el color de su cara. Uno abierto a la vez.
// Botón con aria-expanded y región con aria-labelledby; sin JS, todo abierto.
// ══════════════════════════════════════════════════════
export function mount({ root = document.querySelector('.lx-acc') } = {}) {
  if (!root) return;
  const rows = [...root.querySelectorAll('.lx-acc-row')];
  const set = (row, on) => {
    row.classList.toggle('is-open', on);
    row.querySelector('.lx-acc-btn').setAttribute('aria-expanded', String(on));
    row.querySelector('.lx-acc-body').hidden = !on;
  };
  rows.forEach((row, i) => {
    const btn = row.querySelector('.lx-acc-btn'), body = row.querySelector('.lx-acc-body');
    btn.id ||= `lx-acc-b${i}`; body.id ||= `lx-acc-p${i}`;
    btn.setAttribute('aria-controls', body.id); body.setAttribute('role', 'region'); body.setAttribute('aria-labelledby', btn.id);
    set(row, i === 0);
    btn.addEventListener('click', () => { const on = !row.classList.contains('is-open'); rows.forEach(r => set(r, r === row && on)); });
  });
}
