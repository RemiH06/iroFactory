// ══════════════════════════════════════════════════════
// Antes y ahora · dos capturas encimadas con una cortina que se arrastra
// (un <input type="range"> de verdad: teclado y lector de pantalla), y la
// opción de cambiar la captura de ahora por el tema en vivo.
// mount({ host, id, before, after, beforeLabel, afterLabel, live, open })
// ══════════════════════════════════════════════════════
export function mount({ host, id, before, after, beforeLabel = 'antes', afterLabel = 'ahora', live, open }) {
  host.classList.add('tn');
  host.innerHTML = `
    <div class="tn-frame">
      <img class="tn-img tn-after" src="${after}" alt="${id} hoy" loading="lazy" decoding="async">
      <img class="tn-img tn-before" src="${before}" alt="${id} en mayo de 2026" loading="lazy" decoding="async">
      <span class="tn-tag tn-tag-b">${beforeLabel}</span><span class="tn-tag tn-tag-a">${afterLabel}</span>
      <span class="tn-rule" aria-hidden="true"></span>
      <input class="tn-range" type="range" min="0" max="100" value="50" aria-label="Cortina entre ${beforeLabel} y ${afterLabel} de ${id}">
      <div class="tn-live"></div>
    </div>
    <div class="tn-actions">
      ${live ? '<button class="st-btn tn-play" type="button" aria-pressed="false"><span aria-hidden="true">▶</span> Ver en vivo</button>' : ''}
      ${open ? `<a class="st-btn st-btn-solid" href="${open}">Abrir ${id} <span aria-hidden="true">↗</span></a>` : ''}
    </div>`;
  const frame = host.querySelector('.tn-frame'), range = host.querySelector('.tn-range');
  const set = v => frame.style.setProperty('--cut', v + '%');
  range.addEventListener('input', () => set(range.value));
  set(50);

  const play = host.querySelector('.tn-play'), slot = host.querySelector('.tn-live');
  let iframe = null;
  const fit = () => { if (!iframe) return; const k = frame.clientWidth / 1280; iframe.style.height = frame.clientHeight / k + 'px'; iframe.style.transform = `scale(${k})`; };
  new ResizeObserver(fit).observe(frame);
  play?.addEventListener('click', () => {
    const on = !iframe;
    play.setAttribute('aria-pressed', on);
    play.innerHTML = on ? '<span aria-hidden="true">■</span> Detener' : '<span aria-hidden="true">▶</span> Ver en vivo';
    frame.classList.toggle('is-live', on);
    if (!on) { iframe.remove(); iframe = null; return; }
    iframe = document.createElement('iframe');
    iframe.title = `Vista en vivo de ${id}`;
    iframe.src = live;
    slot.replaceChildren(iframe);
    fit();
  });
}
