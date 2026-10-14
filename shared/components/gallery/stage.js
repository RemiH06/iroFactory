// ══════════════════════════════════════════════════════
// Galería · el escenario del tema elegido: nombre en la letra del tema,
// para qué sirve, su navegación, juguete y plantilla, paleta, y una
// ventana con el proun que se vuelve el tema en vivo solo si se pide
// (doce temas con WebGL no se cargan de paso).
// El iframe va sin sandbox: carga páginas propias del mismo origen, y
// `allow-scripts allow-same-origin` juntos no aislaban nada.
// ══════════════════════════════════════════════════════
import { theme, onTheme, reduceMotion } from '../../core/core.js';

const $ = id => document.getElementById(id);
const pad = v => String(v).padStart(2, '0');

/** Carga la letra de títulos de cada tema (archivo o Bunny). Resuelve cuando están todas o fallaron. */
export function loadTitleFonts(themes, root = '') {
  const bunny = themes.filter(t => t.title.bunny).map(t => t.title.bunny);
  // las familias de Bunny no existen para document.fonts hasta que llega su hoja
  const sheet = new Promise(res => {
    if (!bunny.length) return res();
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.bunny.net/css?family=${bunny.join('|')}&display=swap`;
    link.onload = link.onerror = () => res();
    document.head.appendChild(link);
  });
  const jobs = themes.map(t => {
    const { family, src, weight = 400 } = t.title;
    if (src) {
      const f = new FontFace(family, `url(${root}${src})`, { weight: String(weight), display: 'swap' });
      document.fonts.add(f);
      return f.load().catch(() => null);
    }
    return sheet.then(() => document.fonts.load(`${weight} 1em "${family}"`, t.id)).catch(() => null);
  });
  return Promise.all(jobs);
}

export function mount({ themes, root = '', fonts = Promise.resolve(), onStep = () => {} }) {
  const n = themes.length;
  const host = $('gl-stage'), frame = $('st-frame'), poster = $('st-poster'), live = $('st-live'), play = $('st-play');
  let cur = null, playing = false, iframe = null;
  host.hidden = false;
  document.getElementById('gl-list')?.setAttribute('hidden', '');

  // vista en vivo: el tema se dibuja al tamaño de una pantalla real y se escala a la ventana
  const phone = matchMedia('(max-width: 760px) and (orientation: portrait)');
  const virtualW = () => (phone.matches ? 390 : 1280);
  function fit() {
    if (!iframe) return;
    const w = frame.clientWidth, h = frame.clientHeight, vw = virtualW(), k = w / vw;
    iframe.style.width = vw + 'px';
    iframe.style.height = h / k + 'px';
    iframe.style.transform = `scale(${k})`;
  }
  new ResizeObserver(fit).observe(frame);

  function goLive(on) {
    playing = on;
    play.setAttribute('aria-pressed', on);
    play.innerHTML = on ? '<span aria-hidden="true">■</span> Detener' : '<span aria-hidden="true">▶</span> Ver en vivo';
    frame.classList.toggle('is-live', on);
    if (!on) { iframe?.remove(); iframe = null; return; }
    iframe = document.createElement('iframe');
    iframe.title = `Vista en vivo de ${cur.id}`;
    iframe.loading = 'eager';
    iframe.src = `${root}${cur.id}/index.html`;
    frame.classList.add('is-loading');
    iframe.addEventListener('load', () => frame.classList.remove('is-loading'), { once: true });
    live.replaceChildren(iframe);
    fit();
  }
  play.addEventListener('click', () => goLive(!playing));

  function paintPoster() {
    if (!cur) return;
    const p = cur.proun;
    poster.src = root + (theme.dark ? p.dark : p.light);
    // el duotono es el mismo filtro SVG del abanico
    poster.style.filter = p.tint ? `url(#sf-tint-${cur.id})` : '';
  }
  onTheme(paintPoster);

  function show(t) {
    if (cur === t) return;
    const i = themes.indexOf(t);
    cur = t;
    host.style.setProperty('--t', t.color);
    $('st-num').textContent = `${pad(i + 1)} / ${pad(n)}`;
    const name = $('st-name');
    name.textContent = t.id;
    name.style.fontFamily = `'${t.title.family}', 'Shippori Mincho', serif`;
    name.style.fontWeight = t.title.weight || 400;
    $('st-purpose').textContent = t.purpose;
    $('st-pitch').textContent = t.pitch;
    $('st-nav').textContent = t.nav;
    $('st-toy').textContent = t.toy;
    $('st-template').textContent = t.template;
    $('st-fonts').textContent = t.fonts;
    $('st-mode').textContent = t.mode;
    $('st-open').href = `${root}${t.id}/`;
    $('st-open').setAttribute('aria-label', `Abrir el tema ${t.id}`);
    poster.alt = `Proun de ${t.id}: collage del tema.`;
    $('st-palette').innerHTML = t.palette.map(c => `<li><span class="sw" style="background:${c}"></span><code>${c}</code></li>`).join('');
    const prev = themes[(i - 1 + n) % n], next = themes[(i + 1) % n];
    $('st-prev').innerHTML = `<span aria-hidden="true">‹</span> ${prev.id}`;
    $('st-next').innerHTML = `${next.id} <span aria-hidden="true">›</span>`;
    $('st-prev').onclick = () => onStep(prev.id);
    $('st-next').onclick = () => onStep(next.id);
    $('st-prev').setAttribute('aria-label', `Tema anterior: ${prev.id}`);
    $('st-next').setAttribute('aria-label', `Tema siguiente: ${next.id}`);
    paintPoster();
    fitName();
    if (playing) goLive(true);
    // entrada: el texto sube un poco, sin esconder nada si no hay animación
    if (!reduceMotion.matches) host.animate([{ opacity: 0.35, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }

  // el nombre va en un renglón: si la letra del tema es ancha, se achica
  function fitName() {
    const name = $('st-name');
    name.style.fontSize = '';
    const k = name.clientWidth / name.scrollWidth;
    if (k < 1) name.style.fontSize = parseFloat(getComputedStyle(name).fontSize) * k * 0.98 + 'px';
  }
  new ResizeObserver(fitName).observe($('st-name').parentElement);
  fonts.then(fitName);
  return { show };
}
