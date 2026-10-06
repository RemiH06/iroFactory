// ══════════════════════════════════════════════════════
// Pestañas (nivel "Detalles") como galería circular · ver el comentario
// largo junto a .ap-gallery-tabs en el CSS para el porqué de esta
// reconstrucción (Circular Gallery + Decay Card, sin OGL/GSAP).
// selectTab() sigue siendo la única fuente de verdad de accesibilidad
// (aria-selected, hidden, tabindex); la física de abajo es puramente
// visual y nunca decide qué panel está activo · centrar un plato al
// arrastrar no selecciona su panel, evita disparar el iframe de Mapa
// del código o saltar de contenido solo por explorar la galería.
// ══════════════════════════════════════════════════════
import { animate, animateSequence, reduceMotion } from './kit.js';

export function initTabs() {
  const wrap = document.getElementById('ap-gallery-tabs');
  const track = document.getElementById('ap-gallery-track');
  const tabs = Array.from(document.querySelectorAll('.ap-tab'));
  const displaceEl = document.getElementById('ap-decay-displace');
  if (!tabs.length || !track) return;

  function selectTab(tab) {
    tabs.forEach(t => {
      const selected = t === tab;
      t.setAttribute('aria-selected', selected ? 'true' : 'false');
      t.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (!panel) return;
      panel.hidden = !selected;
      if (selected) {
        // Por si el panel estaba oculto cuando la animación de entrada
        // general quiso revelarlo (un elemento con `hidden` no
        // intersecta nunca) · la red de seguridad de más abajo ya lo
        // hace a los 3s, esto cubre el caso de togglear una pestaña
        // antes de eso.
        panel.querySelectorAll('.swatch, .callout, .badge, .btn, .metric, .card, .strophe, .ode-entry')
          .forEach(el => { el.style.opacity = ''; el.style.transform = ''; });
      }
    });
  }

  // No-op hasta que la física se active más abajo · con reduced-motion
  // se queda así, un click sigue seleccionando sin centrar nada.
  let centerOn = () => {};
  let dragMoved = false;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      if (dragMoved) { dragMoved = false; return; }
      selectTab(tab);
      centerOn(tabs.indexOf(tab));
    });
  });
  track.addEventListener('keydown', (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i === -1) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); const n = tabs[(i + 1) % tabs.length]; n.focus(); selectTab(n); centerOn(tabs.indexOf(n)); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); const p = tabs[(i - 1 + tabs.length) % tabs.length]; p.focus(); selectTab(p); centerOn(tabs.indexOf(p)); }
  });

  if (reduceMotion.matches) {
    // Sin arco ni arrastre · fila plana con scroll nativo, la
    // distorsión de Decay Card tampoco corre (scale se queda en 0).
    track.style.display = 'flex';
    track.style.gap = '16px';
    track.style.overflowX = 'auto';
    track.style.height = 'auto';
    track.style.cursor = 'default';
    tabs.forEach(t => { t.style.position = 'static'; });
    return;
  }

  const GAP = 166;       // separación centro-a-centro entre platos
  const BEND_NORM = 2.2; // distancia (en platos) a la que el arco satura
  const BEND_PX = 46;    // profundidad máxima del arco
  const BEND_DEG = 12;   // inclinación máxima
  let containerW = wrap.clientWidth;
  const scroll = { current: 0, target: 0, last: 0, ease: 0.14 };
  let displacement = 0;
  let isDown = false, startX = 0, startScroll = 0, pointerId = null;

  function clampTarget(v) { return Math.max(0, Math.min((tabs.length - 1) * GAP, v)); }
  centerOn = (i) => { scroll.target = clampTarget(i * GAP); };

  function nearestIndex() {
    return Math.max(0, Math.min(tabs.length - 1, Math.round(scroll.current / GAP)));
  }

  function snap() { centerOn(nearestIndex()); }

  function onResize() {
    containerW = wrap.clientWidth;
    const current = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true');
    centerOn(current === -1 ? 0 : current);
    scroll.current = scroll.target;
  }

  track.addEventListener('pointerdown', (e) => {
    isDown = true; dragMoved = false;
    startX = e.clientX; startScroll = scroll.target;
    pointerId = e.pointerId;
    // Sin capturar el puntero todavía: si esto termina siendo un click
    // simple (sin arrastre), capturar de entrada redirige el evento
    // click del <button> hacia el track y el botón nunca lo recibe.
    // Se captura recién en pointermove, cuando ya hay arrastre real.
  });
  track.addEventListener('pointermove', (e) => {
    if (!isDown) return;
    const dx = startX - e.clientX;
    if (!dragMoved && Math.abs(dx) > 6) {
      dragMoved = true;
      track.classList.add('is-dragging');
      try { track.setPointerCapture(pointerId); } catch (err) { /* noop */ }
    }
    if (dragMoved) scroll.target = clampTarget(startScroll + dx);
  });
  function endDrag() {
    if (!isDown) return;
    isDown = false;
    track.classList.remove('is-dragging');
    if (dragMoved) snap();
  }
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.addEventListener('wheel', (e) => {
    e.preventDefault();
    scroll.target = clampTarget(scroll.target + (e.deltaY || e.deltaX) * 0.6);
    clearTimeout(track._wheelSnap);
    track._wheelSnap = setTimeout(snap, 160);
  }, { passive: false });

  function render() {
    scroll.current += (scroll.target - scroll.current) * scroll.ease;
    const speed = scroll.current - scroll.last;
    scroll.last = scroll.current;

    let nearestI = 0, nearestDist = Infinity;
    tabs.forEach((tab, i) => {
      const x = i * GAP - scroll.current;
      const norm = Math.max(-BEND_NORM, Math.min(BEND_NORM, x / GAP));
      const t = Math.abs(norm) / BEND_NORM;
      const arc = t * BEND_PX;
      const rot = Math.sign(norm) * t * BEND_DEG;
      const screenX = containerW / 2 + x - tab.offsetWidth / 2;
      tab.style.transform = `translateX(${screenX}px) translateY(${arc}px) rotate(${rot}deg)`;
      if (Math.abs(x) < nearestDist) { nearestDist = Math.abs(x); nearestI = i; }
    });
    tabs.forEach((t, i) => t.classList.toggle('is-centered', i === nearestI));

    // Las miniaturas miden ~40-56px · un scale calibrado para la imagen
    // grande de Decay Card (~600px) las desplazaría fuera del propio
    // recuadro del filtro y se verían desaparecer. Tope bajo, a escala
    // del tamaño real de la miniatura.
    displacement += (Math.min(Math.abs(speed) * 0.9, 13) - displacement) * 0.15;
    if (displaceEl) displaceEl.setAttribute('scale', displacement.toFixed(1));

    requestAnimationFrame(render);
  }

  onResize();
  window.addEventListener('resize', onResize);
  requestAnimationFrame(render);
}
export function mount() {
// ── Coreografía de estrofas + ode log + entrada general ──
(function() {
  if (reduceMotion.matches) return;

  // Estrofa/antistrofa/épodo reenactan su propio texto: el coro avanza
  // desde la derecha, retrocede desde la izquierda, se detiene sin
  // desplazarse · no es decoración, es literal al contenido.
  const strophes = ['strophe-1', 'strophe-2', 'strophe-3'].map(id => document.getElementById(id));
  if (strophes.every(Boolean)) {
    strophes[0].style.opacity = '0'; strophes[0].style.transform = 'translateX(50px)';
    strophes[1].style.opacity = '0'; strophes[1].style.transform = 'translateX(-50px)';
    strophes[2].style.opacity = '0'; strophes[2].style.transform = 'scale(0.97)';

    const stropheIo = new IntersectionObserver((entries) => {
      if (!entries.some(e => e.isIntersecting)) return;
      stropheIo.disconnect();
      animateSequence([
        [strophes[0], { opacity: [0, 1], transform: ['translateX(50px)', 'translateX(0)'] }, { duration: 0.5, easing: 'circOut' }],
        [strophes[1], { opacity: [0, 1], transform: ['translateX(-50px)', 'translateX(0)'] }, { duration: 0.5, easing: 'circOut' }],
        [strophes[2], { opacity: [0, 1], transform: ['scale(0.97)', 'scale(1)'] }, { duration: 0.6, easing: 'easeOut' }],
      ]);
    }, { threshold: 0.3 });
    stropheIo.observe(strophes[0]);
  }

  // Ode Log · se revela verso por verso, en orden de recitación
  const odeEntries = document.querySelectorAll('.ode-entry');
  const odeLog = document.querySelector('.ode-log');
  if (odeEntries.length && odeLog) {
    odeEntries.forEach(el => { el.style.opacity = '0'; el.style.transform = 'translateY(14px)'; });
    const odeIo = new IntersectionObserver((entries) => {
      if (!entries.some(e => e.isIntersecting)) return;
      odeIo.disconnect();
      animate(odeEntries,
        { opacity: [0, 1], transform: ['translateY(14px)', 'translateY(0)'] },
        { duration: 0.6, delay: (i) => i * 0.15, easing: 'easeOut' }
      );
    }, { threshold: 0.2 });
    odeIo.observe(odeLog);
  }

  // Resto de secciones · entrada más ligera, sin coreografía propia
  const items = document.querySelectorAll('.swatch, .callout, .badge, .btn, .metric, .card');
  if (items.length) {
    items.forEach(el => { el.style.opacity = '0'; el.style.transform = 'translateY(10px)'; });
    const io = new IntersectionObserver((entries) => {
      const revealing = entries.filter(e => e.isIntersecting);
      if (!revealing.length) return;
      revealing.forEach(e => io.unobserve(e.target));
      animate(
        revealing.map(e => e.target),
        { opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0)'] },
        { duration: 0.4, delay: (i) => Math.min(i, 8) * 0.035, easing: 'easeOut' }
      );
    }, { threshold: 0.15 });
    items.forEach(el => io.observe(el));
  }

  // red de seguridad: nunca se queda oculto si un observer no dispara
  setTimeout(() => {
    document.querySelectorAll('.swatch, .callout, .badge, .btn, .metric, .card, .strophe, .ode-entry')
      .forEach(el => { el.style.opacity = ''; el.style.transform = ''; });
  }, 3000);
})();
}
