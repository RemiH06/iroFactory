// Manual · dos documentos en la misma cara (el de diseño del tablero y la
// notación del cubo) con un selector de pestañas; flechas, Inicio y Fin.
export function mount({ el = document.querySelector('.lx-docs') } = {}) {
  if (!el) return;
  const tabs = [...el.querySelectorAll('[role=tab]')], panels = tabs.map(t => document.getElementById(t.getAttribute('aria-controls')));
  const pick = (i, focus) => {
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; panels[k].hidden = k !== i; });
    if (focus) tabs[i].focus();
  };
  el.addEventListener('click', e => { const t = e.target.closest('[role=tab]'); if (t) pick(tabs.indexOf(t)); });
  el.addEventListener('keydown', e => {
    const i = tabs.indexOf(document.activeElement); if (i < 0) return;
    const n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key]; if (n == null) return;
    e.preventDefault(); pick((n + tabs.length) % tabs.length, true);
  });
}
