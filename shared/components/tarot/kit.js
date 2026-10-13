// ══════════════════════════════════════════════════════
// tarot · base del tema sobre el núcleo: modo (noche por defecto, día como
// alterno), el bioma vigente en los tokens (--b1 --b2 --b3) y los acentos
// compuestos para CassandraTwo y Busorama, que no traen vocales acentuadas:
// la letra base de la fuente y un trazo del mismo color encima (como shui).
// ══════════════════════════════════════════════════════
import { $, $$, cssVar, initTheme, onTheme, theme, makeLoop, reduceMotion, updateHexes } from '../../core/core.js';
import { biome } from './biomes.js';

export { $, $$, cssVar, onTheme, makeLoop, reduceMotion };
export const night = () => !theme.alt;

// el bioma pinta sus tres colores en el body (los lee el CSS de las vitrinas y las cartas)
export function paintBiome(b = biome()) {
  const c = b[night() ? 'night' : 'day'];
  ['--b1', '--b2', '--b3'].forEach((t, i) => document.body.style.setProperty(t, c[i]));
  document.body.dataset.biome = b.id;
}

// ── acentos compuestos: Á → A + trazo
const ACUTE = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U' };
export function composeAccents(root = document) {
  root.querySelectorAll('[data-compose]').forEach(el => {
    if (el.dataset.composed) return; el.dataset.composed = 1;
    const walk = node => {
      if (node.nodeType === 3) {
        const t = node.textContent; if (![...t].some(ch => ACUTE[ch])) return;
        const frag = document.createDocumentFragment();
        for (const ch of t) { if (ACUTE[ch]) { const s = document.createElement('span'); s.className = 'acc'; s.textContent = ACUTE[ch]; frag.append(s); } else frag.append(ch); }
        node.replaceWith(frag);
      } else [...node.childNodes].forEach(walk);
    };
    // el texto original queda para lectores de pantalla
    if (!el.hasAttribute('aria-label') && !el.closest('a, button')) el.setAttribute('aria-label', el.textContent.trim());
    walk(el);
  });
}

let ctl;
export const toggleTheme = () => ctl && ctl.toggle();
export function mount() {
  // el botón va en Busorama, que no trae la í: se compone como en los títulos
  ctl = initTheme({ altClass: 'light', render: (alt, btn) => { btn.innerHTML = alt ? '☾ noche' : '☀ d<span class="acc">i</span>a'; btn.setAttribute('aria-label', alt ? 'Cambiar al gabinete de noche' : 'Cambiar al gabinete de día'); }, hexes: updateHexes });
  paintBiome(); onTheme(() => paintBiome());
  document.addEventListener('tarot:biome', e => paintBiome(e.detail));
  composeAccents();
}
