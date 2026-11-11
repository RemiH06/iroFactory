// ══════════════════════════════════════════════════════
// mirai · base del tema sobre el núcleo: el modo (gofun por defecto, urushi
// como alterno), el estado de la campaña que comparten el brief, el cartel
// de la portada y el tablero de formatos, el título que se arma por celdas
// y el logo dibujado con puntos y dígitos.
// ══════════════════════════════════════════════════════
import { $, $$, cssVar, initTheme, onTheme, theme, reduceMotion, stickyHeader } from '../../core/core.js';
import { BRIEF } from '../../../assets/data/mirai/campaign.js';

export { $, $$, cssVar, onTheme, theme, reduceMotion };

// ── la campaña: una sola fuente para todas las piezas ──
export const campaign = { titular: BRIEF.mensaje, tinta: BRIEF.tinta, formatos: [...BRIEF.entregables], forma: 'circulo', seed: 7 };
// `from` dice quién cambió el estado, para que no se responda a sí mismo
export function setCampaign(patch, from) { Object.assign(campaign, patch); document.dispatchEvent(new CustomEvent('mirai:campaign', { detail: from })); }
export const onCampaign = fn => document.addEventListener('mirai:campaign', e => fn(e.detail));

// ── el logo en matriz: ceros para el módulo, puntos encendidos para la ventana ──
// (la misma geometría del SVG: módulo redondeado de 8 con radio 2, círculo de radio 2.25)
export function dotLogo(n = 15) {
  let out = '';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const u = (x + .5) / n * 8 - 4, v = (y + .5) / n * 8 - 4;
      const lit = Math.hypot(u, v) <= 2.25, body = Math.hypot(Math.max(Math.abs(u) - 2, 0), Math.max(Math.abs(v) - 2, 0)) <= 2;
      out += lit ? '<i>●</i>' : body ? '<b>0</b>' : '<u>·</u>';
    }
    out += '\n';
  }
  return out;
}

export function mount() {
  initTheme({ render: (dark, b) => { b.innerHTML = dark ? '<span lang="ja">胡粉</span> encender la luz' : '<span lang="ja">漆</span> apagar la luz'; b.setAttribute('aria-label', dark ? 'Cambiar a gofun, el modo claro' : 'Cambiar a urushi, el modo oscuro'); } });
  stickyHeader('.mi-top', 8);
  // el título se arma por celdas: cada letra entra por pasos (la animación es de CSS)
  $$('[data-cells]').forEach(el => {
    const node = [...el.childNodes].find(c => c.nodeType === 3 && c.textContent.trim()); if (!node) return;
    const frag = document.createDocumentFragment();
    [...node.textContent.trim()].forEach((ch, i) => { const s = document.createElement('span'); s.className = 'cell'; s.style.setProperty('--i', i); s.textContent = ch; s.setAttribute('aria-hidden', 'true'); frag.append(s); });
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    node.replaceWith(frag);
  });
}
