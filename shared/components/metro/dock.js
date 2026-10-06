// ══════════════════════════════════════════════════════
// DOCK (React Bits) · el tamaño de cada ícono sigue la distancia
// del cursor a su centro ([-200, 0, 200] → [50, 70, 50]) con un
// resorte (masa 0.1, rigidez 150, amortiguación 12), integrado a
// mano con pasos cortos en vez de useSpring de Motion. Funciona
// como tablist: flechas mueven el foco, Enter/Espacio o clic cambia
// de panel. Cada panel se "carga" la primera vez con Lattice Loader.
// ══════════════════════════════════════════════════════
import { reduceMotion } from './kit.js';
import { createLattice } from './lattice-loader.js';
import { initDome } from './dome-gallery.js';

export function initDock() {
  const panel = document.getElementById('metro-dock');
  const items = [...panel.querySelectorAll('.metro-dock-item')];
  const mobile = window.matchMedia('(max-width: 600px)');
  const cfg = () => mobile.matches ? { base: 36, mag: 50, distance: 140, gap: 6 } : { base: 50, mag: 70, distance: 200, gap: 12 };
  const SPRING = { m: 0.1, k: 150, c: 12 };
  const state = items.map(() => ({ x: cfg().base, v: 0 }));
  let mouseX = Infinity, raf = 0;
  function targetFor(el, i) {
    const { base, mag, distance } = cfg();
    if (!Number.isFinite(mouseX) || reduceMotion.matches) return base;
    const r = el.getBoundingClientRect();
    const d = mouseX - r.x - base / 2;
    const t = Math.min(1, Math.abs(d) / distance);
    return mag + (base - mag) * t;
  }
  let last = 0;
  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60); last = now;
    let moving = false;
    items.forEach((el, i) => {
      const s = state[i], tgt = targetFor(el, i);
      for (let k = 0, sub = 4, h = dt / sub; k < sub; k++) {
        const a = (-SPRING.k * (s.x - tgt) - SPRING.c * s.v) / SPRING.m;
        s.v += a * h; s.x += s.v * h;
      }
      if (Math.abs(s.x - tgt) > 0.05 || Math.abs(s.v) > 0.05) moving = true; else { s.x = tgt; s.v = 0; }
      el.style.width = el.style.height = s.x.toFixed(2) + 'px';
    });
    if (moving) raf = requestAnimationFrame(frame); else last = 0;
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  panel.style.setProperty('--dock-gap', cfg().gap + 'px');
  mobile.addEventListener('change', () => { panel.style.setProperty('--dock-gap', cfg().gap + 'px'); kick(); });
  panel.addEventListener('mousemove', e => { mouseX = e.clientX; kick(); });
  panel.addEventListener('mouseleave', () => { mouseX = Infinity; kick(); });
  items.forEach(el => {
    el.addEventListener('mouseenter', () => el.classList.add('is-hover'));
    el.addEventListener('mouseleave', () => el.classList.remove('is-hover'));
    el.addEventListener('focus', () => el.classList.add('is-hover'));
    el.addEventListener('blur', () => el.classList.remove('is-hover'));
    el.addEventListener('click', () => select(el));
    el.addEventListener('keydown', e => {
      const i = items.indexOf(el);
      let j = null;
      if (e.key === 'ArrowRight') j = (i + 1) % items.length;
      else if (e.key === 'ArrowLeft') j = (i - 1 + items.length) % items.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = items.length - 1;
      if (j !== null) { e.preventDefault(); items[j].focus(); select(items[j]); }
    });
  });
  kick();

  const loaded = new Set();
  function select(tab) {
    items.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    reveal(document.getElementById(tab.getAttribute('aria-controls')));
  }
  function reveal(p) {
    if (loaded.has(p.id)) { onShown(p); return; }
    loaded.add(p.id);
    const slot = p.querySelector('.metro-panel-loader');
    const ll = createLattice({ pattern: p.dataset.pattern || 'orbit', grid: 4, label: 'Cargando', doneLabel: 'Listo en' });
    slot.replaceChildren(ll.el);
    p.classList.add('is-loading');
    const wait = reduceMotion.matches ? 250 : 650 + Math.random() * 600;
    setTimeout(() => {
      ll.setStatus('done');
      setTimeout(() => { p.classList.remove('is-loading'); slot.replaceChildren(); onShown(p); }, reduceMotion.matches ? 100 : 450);
    }, wait);
  }
  function onShown(p) { if (p.id === 'panel-galeria') initDome(); }
  reveal(document.getElementById('panel-paleta'));
}
