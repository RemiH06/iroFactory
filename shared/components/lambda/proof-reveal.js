// ══════════════════════════════════════════════════════
// DEMOSTRACIONES QUE SE REVELAN · la plantilla es el marcado: cada
// `.lm-proof` trae su teorema y una lista de pasos con `data-why` (la
// justificación) y `data-uses` (los pasos de los que depende). Sin JS se
// lee completa. Con JS: una pestaña por demostración (con su método), los
// pasos se escriben uno a uno como en el pizarrón, «¿por qué?» abre la
// justificación, las referencias a otros pasos los encienden, el paso que
// lleva al absurdo se marca ⊥ y el último cierra con □.
// Teclado: → o Espacio siguiente, ← anterior (con el foco en la pizarra).
//   mount({ el })
// ══════════════════════════════════════════════════════
import { reduceMotion } from './kit.js';

export function mount({ el = document.getElementById('lm-proofs') } = {}) {
  if (!el) return;
  const proofs = [...el.querySelectorAll('.lm-proof')];
  if (!proofs.length) return;
  el.classList.add('is-live');
  const tabs = document.createElement('div'); tabs.className = 'pr-tabs'; tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Demostraciones');
  tabs.innerHTML = proofs.map((p, i) => `<button type="button" role="tab" class="pr-tab" id="pr-tab-${i}" aria-controls="pr-${i}" data-i="${i}"><span>${p.dataset.method}</span>${p.dataset.name}</button>`).join('');
  el.prepend(tabs);

  const states = proofs.map((p, i) => {
    p.id = `pr-${i}`; p.setAttribute('role', 'tabpanel'); p.setAttribute('aria-labelledby', `pr-tab-${i}`); p.tabIndex = 0;
    const steps = [...p.querySelectorAll('.lm-proof-steps > li')];
    steps.forEach((li, k) => {
      const body = li.innerHTML, uses = (li.dataset.uses || '').split(',').map(Number).filter(Boolean);
      li.innerHTML = `<span class="pr-n" aria-hidden="true">${k + 1}</span><div class="pr-body"><p class="pr-text">${body}${li.dataset.absurd != null ? ' <span class="pr-bot" title="contradicción">⊥</span>' : ''}${k === steps.length - 1 ? ' <span class="pr-qed" title="queda demostrado">□</span>' : ''}</p>
        <p class="pr-meta">${uses.length ? `<span class="pr-uses">usa ${uses.map(u => `<button type="button" class="pr-ref" data-ref="${u}">paso ${u}</button>`).join(' ')}</span>` : ''}${li.dataset.why ? `<button type="button" class="pr-whybtn" aria-expanded="false">¿por qué?</button>` : ''}</p>
        ${li.dataset.why ? `<p class="pr-why" hidden>${li.dataset.why}</p>` : ''}</div>`;
      if (li.dataset.absurd != null) li.classList.add('is-absurd');
    });
    const bar = document.createElement('div'); bar.className = 'pr-bar';
    bar.innerHTML = `<button type="button" class="btn pr-prev" aria-label="Paso anterior">‹ anterior</button><button type="button" class="btn primary pr-next">siguiente paso ›</button><button type="button" class="btn pr-all">todo</button><button type="button" class="btn pr-reset">desde el principio</button><span class="pr-count" aria-live="polite"></span>`;
    p.append(bar);
    const after = p.querySelector('.pr-after'); if (after) p.append(after);
    return { p, steps, shown: 0, bar, after };
  });

  let cur = 0;
  const show = (s, n, animate) => {
    s.shown = Math.max(0, Math.min(s.steps.length, n));
    s.steps.forEach((li, k) => {
      const on = k < s.shown; li.hidden = !on;
      if (on && animate && k === s.shown - 1 && !reduceMotion.matches) { li.classList.remove('is-writing'); void li.offsetWidth; li.classList.add('is-writing'); }
    });
    s.bar.querySelector('.pr-prev').disabled = s.shown === 0;
    s.bar.querySelector('.pr-next').disabled = s.shown === s.steps.length;
    s.bar.querySelector('.pr-next').textContent = s.shown === 0 ? 'empezar ›' : 'siguiente paso ›';
    s.bar.querySelector('.pr-count').textContent = s.shown === s.steps.length ? `${s.steps.length} de ${s.steps.length} · queda demostrado` : `paso ${s.shown} de ${s.steps.length}`;
    if (s.after) s.after.hidden = s.shown < s.steps.length;
  };
  const select = i => {
    cur = i;
    tabs.querySelectorAll('.pr-tab').forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
    states.forEach((s, k) => { s.p.hidden = k !== i; });
  };
  states.forEach(s => {
    show(s, 1, false);
    s.bar.addEventListener('click', e => {
      if (e.target.closest('.pr-next')) show(s, s.shown + 1, true);
      if (e.target.closest('.pr-prev')) show(s, s.shown - 1, false);
      if (e.target.closest('.pr-all')) show(s, s.steps.length, false);
      if (e.target.closest('.pr-reset')) show(s, 1, true);
    });
    s.p.addEventListener('click', e => {
      const w = e.target.closest('.pr-whybtn');
      if (w) { const box = w.closest('.pr-body').querySelector('.pr-why'), open = box.hidden; box.hidden = !open; w.setAttribute('aria-expanded', String(open)); w.textContent = open ? 'ocultar' : '¿por qué?'; }
    });
    const lightRef = (e, on) => { const r = e.target.closest('.pr-ref'); if (r) s.steps[+r.dataset.ref - 1]?.classList.toggle('is-ref', on); };
    s.p.addEventListener('pointerover', e => lightRef(e, true)); s.p.addEventListener('pointerout', e => lightRef(e, false));
    s.p.addEventListener('focusin', e => lightRef(e, true)); s.p.addEventListener('focusout', e => lightRef(e, false));
    s.p.addEventListener('keydown', e => {
      if (e.target.closest('input,textarea') || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight' || (e.key === ' ' && e.target === s.p)) { e.preventDefault(); show(s, s.shown + 1, true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(s, s.shown - 1, false); }
    });
  });
  tabs.addEventListener('click', e => { const t = e.target.closest('.pr-tab'); if (t) select(+t.dataset.i); });
  tabs.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; e.preventDefault();
    const n = (cur + (e.key === 'ArrowRight' ? 1 : -1) + states.length) % states.length; select(n); tabs.querySelector(`[data-i="${n}"]`).focus();
  });
  select(0);
}
