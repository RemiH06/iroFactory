// ══════════════════════════════════════════════════════
// Sensu · el abanico de la marca como selector de temas.
// Un gajo por tema (los que traiga `themes`, no un número fijo); cada gajo
// es papel con el proun del tema impreso, una varilla de laca debajo y una
// tira con el nombre en la letra del tema. El remache lleva el sello 色 y
// pliega o abre el abanico.
//
// Todo se dibuja en coordenadas locales (el gajo apunta a +x) y cada gajo
// solo gira: abrir o plegar es mover un número, `open` de 0 a 1.
// Dos orientaciones: 'side' (remache a la izquierda, abre hacia la derecha)
// y 'up' (remache abajo, abre hacia arriba, como el logo).
//
// mount({ host, themes, root, orient, selected, onPeek, onSelect })
//  → { select(id), fold(), unfold(), setOrient(o), refit() }
// ══════════════════════════════════════════════════════
import { reduceMotion, onTheme, theme } from '../../core/core.js';
import { SEAL_PATH, sealTransform } from '../brand/brand.js';

const NS = 'http://www.w3.org/2000/svg';
const R = 100, RI = 34, LIFT = 9, LIFT_SEL = 13;
const ARC = { side: [-90, 90], up: [-180, 0] };
const VIEW = { side: '-16 -114 132 228', up: '-114 -116 228 134' };
const rad = d => d * Math.PI / 180;
const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
};
const ease = t => 1 - Math.pow(1 - t, 3);

export function mount({ host, themes, root = '', orient = 'side', selected = null, onPeek = () => {}, onSelect = () => {} }) {
  const n = themes.length, W = 180 / n, hw = W / 2;
  const ox = R * Math.cos(rad(hw)), oy = R * Math.sin(rad(hw));
  const ix = RI * Math.cos(rad(hw)), iy = RI * Math.sin(rad(hw));
  const leafD = `M${ix} ${-iy}L${ox} ${-oy}A${R} ${R} 0 0 1 ${ox} ${oy}L${ix} ${iy}A${RI} ${RI} 0 0 0 ${ix} ${-iy}Z`;
  const halfD = `M${ix} ${-iy}L${ox} ${-oy}A${R} ${R} 0 0 1 ${R} 0L${RI} 0A${RI} ${RI} 0 0 0 ${ix} ${-iy}Z`;
  const bandD = `M${(R - 6) * Math.cos(rad(hw))} ${-(R - 6) * Math.sin(rad(hw))}L${ox} ${-oy}A${R} ${R} 0 0 1 ${ox} ${oy}L${(R - 6) * Math.cos(rad(hw))} ${(R - 6) * Math.sin(rad(hw))}A${R - 6} ${R - 6} 0 0 0 ${(R - 6) * Math.cos(rad(hw))} ${-(R - 6) * Math.sin(rad(hw))}Z`;

  const svg = el('svg', { class: 'sf', role: 'radiogroup', 'aria-label': 'Temas de iroFactory' });
  const defs = el('defs', {}, svg);
  // pliegue: la mitad de arriba del gajo es el valle, la de abajo la cresta
  const g = el('linearGradient', { id: 'sf-pleat', gradientUnits: 'userSpaceOnUse', x1: 0, y1: -oy, x2: 0, y2: oy }, defs);
  el('stop', { offset: 0, class: 'sf-valley' }, g);
  el('stop', { offset: 0.5, class: 'sf-flat' }, g);
  el('stop', { offset: 1, class: 'sf-crest' }, g);
  el('clipPath', { id: 'sf-leaf' }, defs).appendChild(el('path', { d: leafD }));

  const leaves = [];
  const fan = el('g', { class: 'sf-fan' }, svg);
  themes.forEach((t, i) => {
    if (t.proun?.tint) {
      // duotono: la luminancia del collage va de la tinta al color del tema
      const f = el('filter', { id: `sf-tint-${t.id}`, 'color-interpolation-filters': 'sRGB' }, defs);
      el('feColorMatrix', { type: 'saturate', values: 0 }, f);
      const [a, b] = t.proun.tint.map(h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16) / 255));
      const ct = el('feComponentTransfer', {}, f);
      ['R', 'G', 'B'].forEach((c, k) => el(`feFunc${c}`, { type: 'table', tableValues: `${a[k]} ${b[k]}` }, ct));
    }
    const leaf = el('g', { class: 'sf-leaf', role: 'radio', tabindex: -1, 'aria-checked': 'false', 'aria-label': `${t.id} · ${t.purpose}`, 'data-id': t.id }, fan);
    leaf.style.setProperty('--c', t.color);
    const body = el('g', { class: 'sf-body' }, leaf);
    el('rect', { class: 'sf-stick', x: 3, y: -1.3, width: RI + 6, height: 2.6, rx: 1.3 }, body);
    const paper = el('g', { 'clip-path': 'url(#sf-leaf)' }, body);
    el('path', { d: leafD, class: 'sf-paper' }, paper);
    const img = el('image', { class: 'sf-img', preserveAspectRatio: 'xMidYMid slice', width: 124, height: 70, x: 5, y: -35 }, paper);
    if (t.proun?.tint) img.setAttribute('filter', `url(#sf-tint-${t.id})`);
    el('path', { d: leafD, fill: 'url(#sf-pleat)' }, paper);
    el('path', { d: halfD, class: 'sf-shade' }, paper);
    el('path', { d: bandD, class: 'sf-band' }, body);
    el('path', { d: leafD, class: 'sf-edge' }, body);
    const tag = el('g', { class: 'sf-tag' }, body);
    const slip = el('rect', { class: 'sf-slip', height: 11, rx: 5.5, y: -5.5 }, tag);
    const label = el('text', { class: 'sf-label', 'dominant-baseline': 'central', 'font-family': `'${t.title.family}', serif` }, tag);
    if (t.title.weight) label.setAttribute('font-weight', t.title.weight);
    label.textContent = t.id;
    leaves.push({ t, i, leaf, body, img, tag, slip, label, center: 0 });

    leaf.addEventListener('click', () => select(t.id, true));
    leaf.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') peek(t); });
    leaf.addEventListener('focus', () => peek(t));
    leaf.addEventListener('keydown', e => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (step) { e.preventDefault(); const j = (i + step + n) % n; select(themes[j].id, true); leaves[j].leaf.focus(); }
      else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); const j = e.key === 'Home' ? 0 : n - 1; select(themes[j].id, true); leaves[j].leaf.focus(); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(t.id, true); }
    });
  });
  fan.addEventListener('pointerleave', () => peek(null));
  fan.addEventListener('focusout', e => { if (!fan.contains(e.relatedTarget)) peek(null); });

  // remache: el sello en un disco de laca
  const rivet = el('g', { class: 'sf-rivet', role: 'button', tabindex: 0, 'aria-label': 'Plegar el abanico' }, svg);
  el('circle', { r: 14, class: 'sf-rivet-disc' }, rivet);
  el('circle', { r: 11.2, class: 'sf-rivet-ring' }, rivet);
  el('path', { d: SEAL_PATH, class: 'sf-seal', transform: `matrix(${sealTransform(0, 0, 15).join(' ')})` }, rivet);
  rivet.addEventListener('click', () => (open > 0.5 ? fold() : unfold()));
  rivet.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); rivet.dispatchEvent(new MouseEvent('click')); } });

  host.appendChild(svg);

  let open = 1, cur = null, raf = 0;

  function layout() {
    const [a0, a1] = ARC[orient], mid = (a0 + a1) / 2;
    svg.setAttribute('viewBox', VIEW[orient]);
    svg.setAttribute('preserveAspectRatio', orient === 'side' ? 'xMinYMid meet' : 'xMidYMax meet');
    leaves.forEach(L => {
      // abierto: repartidos de a0 a a1; plegado: todos encimados a la mitad
      L.center = mid + (L.i - (n - 1) / 2) * W * open;
      L.leaf.setAttribute('transform', `rotate(${L.center.toFixed(3)})`);
      // el collage queda derecho aunque el gajo gire
      L.img.setAttribute('transform', `rotate(${(-L.center).toFixed(3)} 67 0)`);
    });
  }

  // la tira del nombre: del lado de afuera, nunca de cabeza
  function placeTags() {
    leaves.forEach(L => {
      const flip = Math.cos(rad(L.center)) < -0.02;
      L.label.setAttribute('font-size', '7');
      let w = L.label.getComputedTextLength() || 30;
      const max = R - 12 - (RI + 8);
      if (w > max) { L.label.setAttribute('font-size', (7 * max / w).toFixed(2)); w = max; }
      const x1 = R - 11, x0 = x1 - w - 7;
      L.slip.setAttribute('x', x0); L.slip.setAttribute('width', w + 7);
      L.label.setAttribute('x', flip ? -(x1 - 3.5) : x1 - 3.5);
      L.label.setAttribute('text-anchor', flip ? 'start' : 'end');
      L.label.setAttribute('transform', flip ? 'rotate(180)' : '');
    });
  }

  function paintImages() {
    const dark = theme.dark;
    leaves.forEach(L => {
      const p = L.t.proun;
      if (p) L.img.setAttribute('href', root + (dark ? p.dark : p.light));
    });
  }

  function peek(t) {
    leaves.forEach(L => L.leaf.classList.toggle('is-peek', !!t && L.t === t));
    onPeek(t || cur);
  }

  function select(id, user = false) {
    const L = leaves.find(x => x.t.id === id);
    if (!L) return;
    cur = L.t;
    leaves.forEach(x => {
      const on = x === L;
      x.leaf.classList.toggle('is-sel', on);
      x.leaf.setAttribute('aria-checked', on);
      x.leaf.setAttribute('tabindex', on ? 0 : -1);
    });
    if (open < 0.5) unfold();
    onSelect(L.t, user);
  }

  function tween(to, ms) {
    cancelAnimationFrame(raf);
    const from = open;
    if (reduceMotion.matches || ms === 0) { open = to; layout(); placeTags(); return; }
    const t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / ms);
      open = from + (to - from) * ease(k);
      layout();
      if (k < 1) raf = requestAnimationFrame(step); else placeTags();
    };
    raf = requestAnimationFrame(step);
  }
  function fold() { svg.classList.add('is-folded'); rivet.setAttribute('aria-label', 'Abrir el abanico'); tween(0, 650); }
  function unfold(ms = 900) { svg.classList.remove('is-folded'); rivet.setAttribute('aria-label', 'Plegar el abanico'); tween(1, ms); }

  function setOrient(o) { if (o === orient) return; orient = o; svg.dataset.orient = o; layout(); placeTags(); }

  svg.dataset.orient = orient;
  paintImages();
  onTheme(paintImages);
  if (selected) select(selected);
  else leaves[0].leaf.setAttribute('tabindex', 0);
  // abre desde plegado la primera vez (sin animación con reduced motion)
  if (!reduceMotion.matches) { open = 0; svg.classList.add('is-folded'); layout(); requestAnimationFrame(() => unfold(1100)); }
  else { layout(); placeTags(); }

  return { select, fold, unfold, setOrient, refit: placeTags };
}
