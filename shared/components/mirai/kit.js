// ══════════════════════════════════════════════════════
// mirai · base del tema sobre el núcleo: el modo (gofun por defecto, urushi
// como alterno) y su transición, el estado de la campaña que comparten el
// brief, el spot, el cartel de la portada y el tablero de formatos, y los
// gestos de movimiento que son de toda la página: el título que sube letra
// por letra, lo que entra a pantalla, y el cartel que sigue al cursor.
// ══════════════════════════════════════════════════════
import { $, $$, clamp, cssVar, finePointer, initTheme, onTheme, theme, reduceMotion, stickyHeader } from '../../core/core.js';
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

// ── cambio de modo: la luz se va (o vuelve) en un círculo que crece desde el botón ──
let ctl;
function switchMode(btn) {
  if (!document.startViewTransition || reduceMotion.matches) return ctl.toggle();
  const r = btn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const root = document.documentElement; root.classList.add('vt-theme');
  const vt = document.startViewTransition(() => ctl.toggle());
  vt.ready.then(() => root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${R}px at ${x}px ${y}px)`] }, { duration: 850, easing: 'cubic-bezier(.65, 0, .35, 1)', pseudoElement: '::view-transition-new(root)' })).catch(() => {});
  vt.finished.finally(() => root.classList.remove('vt-theme'));
}

export function mount() {
  ctl = initTheme({ render: (dark, b) => { b.innerHTML = dark ? '<span lang="ja">胡粉</span> encender la luz' : '<span lang="ja">漆</span> apagar la luz'; b.setAttribute('aria-label', dark ? 'Cambiar a gofun, el modo claro' : 'Cambiar a urushi, el modo oscuro'); } });
  // el clic se atiende aquí (en captura) para envolver el cambio en su transición
  document.addEventListener('click', e => { const b = e.target.closest?.('[data-theme-toggle]'); if (!b) return; e.stopImmediatePropagation(); switchMode(b); }, true);
  stickyHeader('.mi-top', 8);

  // el título sube letra por letra desde detrás de su renglón (la animación es de CSS)
  $$('[data-cells]').forEach(el => {
    const node = [...el.childNodes].find(c => c.nodeType === 3 && c.textContent.trim()); if (!node) return;
    const frag = document.createDocumentFragment();
    [...node.textContent.trim()].forEach((ch, i) => { const cell = document.createElement('span'), s = document.createElement('span'); cell.className = 'cell'; cell.setAttribute('aria-hidden', 'true'); s.style.setProperty('--i', i); s.textContent = ch; cell.append(s); frag.append(cell); });
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    node.replaceWith(frag);
  });

  // lo que está debajo de la primera pantalla sube a su lugar al entrar (nunca se arma lo que ya se ve)
  if (!reduceMotion.matches && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -7% 0px' });
    $$('.mi-sec').forEach(sec => [...sec.children].filter(el => !el.matches('.mi-head, .mi-tate, #mi-spot')).flatMap(el => (el.matches('.mi-grid') ? [...el.children] : [el])).forEach((el, i) => {
      if (el.getBoundingClientRect().top < innerHeight) return;
      el.classList.add('rise'); el.style.setProperty('--ri', i % 3); io.observe(el);
    }));
  }

  // el cartel de la portada sigue al cursor: cada forma se corre según su profundidad (plate.css)
  const poster = $('#mi-poster'), hero = poster?.closest('.mi-sec');
  if (hero && finePointer.matches) {
    const lean = (x, y) => { poster.style.setProperty('--px', x.toFixed(2)); poster.style.setProperty('--py', y.toFixed(2)); };
    hero.addEventListener('pointermove', e => { const r = poster.getBoundingClientRect(); lean(clamp((e.clientX - r.left - r.width / 2) / 55, -9, 9), clamp((e.clientY - r.top - r.height / 2) / 55, -9, 9)); });
    hero.addEventListener('pointerleave', () => lean(0, 0));
  }
}
