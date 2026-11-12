// ══════════════════════════════════════════════════════
// mirai · la hoja de imposición (面付け): la navegación es un pliego de
// imprenta con un recuadro por sección, cada uno con la proporción de un
// formato de la campaña. El marcado es un <nav> con una lista de enlaces y
// así funciona sin JS; aquí se marca el recuadro de la sección que se lee,
// se escribe la pleca (el pie del pliego) y se abre el pliego completo.
//   mount({ nav: '#mi-sheet', inert: ['main', '.mi-top'] })
// Teclado: flechas, Inicio y Fin entre recuadros; Esc cierra el pliego.
// ══════════════════════════════════════════════════════
export function mount({ nav = '#mi-sheet', inert = ['main', '.mi-top'] } = {}) {
  const root = document.querySelector(nav); if (!root) return null;
  const links = [...root.querySelectorAll('.mi-sheet-list a')], slug = root.querySelector('.mi-sheet-slug'), btn = root.querySelector('.mi-sheet-open');
  const text = a => ['.n', '.t', '.f'].map(s => a.querySelector(s)?.textContent.trim()).filter(Boolean).join(' · ');
  let current = links[0];
  const say = a => { if (slug) slug.textContent = text(a || current); };

  const mark = a => { current = a; links.forEach(l => { l.parentElement.classList.toggle('is-current', l === a); if (l === a) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current'); }); say(); };
  // la sección vigente es la que cruza la mitad de la pantalla
  const io = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) mark(links.find(l => l.hash === '#' + e.target.id)); }, { rootMargin: '-45% 0px -54% 0px' });
  links.forEach(l => { const s = document.querySelector(l.hash); if (s) io.observe(s); });
  mark(current);

  links.forEach(l => { l.addEventListener('pointerenter', () => say(l)); l.addEventListener('focus', () => say(l)); l.addEventListener('pointerleave', () => say()); l.addEventListener('blur', () => say()); });
  root.addEventListener('keydown', e => {
    const i = links.indexOf(document.activeElement), to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: links.length - 1 }[e.key];
    if (e.key === 'Escape' && root.classList.contains('is-open')) { e.preventDefault(); return open(false); }
    if (i < 0 || to === undefined) return;
    e.preventDefault(); links[(to + links.length) % links.length].focus();
  });

  // abrir y cerrar: el recuadro chico se transforma en el pliego (transición de vista; sin ella, cambia de golpe)
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const open = on => (document.startViewTransition && !calm.matches ? document.startViewTransition(() => flip(on)) : flip(on));
  function flip(on) {
    root.classList.toggle('is-open', on);
    btn.setAttribute('aria-expanded', String(on)); btn.textContent = on ? 'Cerrar el pliego' : 'Pliego';
    inert.forEach(s => document.querySelectorAll(s).forEach(el => { el.inert = on; }));
    document.documentElement.style.overflow = on ? 'hidden' : '';
    (on ? current : btn).focus();
  }
  if (btn) { btn.hidden = false; btn.addEventListener('click', () => open(!root.classList.contains('is-open'))); }
  links.forEach(l => l.addEventListener('click', () => { if (root.classList.contains('is-open')) open(false); }));
  return { open };
}
