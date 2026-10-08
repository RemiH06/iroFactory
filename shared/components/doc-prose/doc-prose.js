// ══════════════════════════════════════════════════════
// Doc Prose · índice de la página: se arma solo con los h2 y h3 (con id)
// de cada `.doc` y marca la sección que se está leyendo. Sin JS, el
// documento se lee igual (el índice simplemente no aparece).
// ══════════════════════════════════════════════════════
export function mount({ root = '.doc', toc = '.doc-toc' } = {}) {
  document.querySelectorAll(root).forEach(doc => {
    const box = doc.closest('.doc-layout')?.querySelector(toc) || doc.querySelector(toc);
    if (!box) return;
    const heads = [...doc.querySelectorAll('h2[id], h3[id]')];
    if (!heads.length) return;
    box.innerHTML = '<p>En esta página</p><ol>' + heads.map(h => `<li class="${h.tagName === 'H3' ? 'is-h3' : ''}"><a href="#${h.id}">${h.textContent}</a></li>`).join('') + '</ol>';
    const links = new Map(heads.map(h => [h, box.querySelector(`a[href="#${CSS.escape(h.id)}"]`)]));
    let current = null;
    const io = new IntersectionObserver(es => {
      // la sección actual es el último encabezado que ya pasó por arriba del tercio de la pantalla
      for (const e of es) if (e.isIntersecting) current = e.target;
      links.forEach((a, h) => a.setAttribute('aria-current', String(h === current)));
    }, { rootMargin: '0px 0px -66% 0px' });
    heads.forEach(h => io.observe(h));
  });
}
