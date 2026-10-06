// ══════════════════════════════════════════════════════
// Pixel Card (React Bits "Pixel Card") · port fiel del código fuente
// real (canvas 2D, sin dependencias). Misma clase Pixel: tamaño máximo
// aleatorio por pixel (0.5–2px), crecimiento con paso aleatorio,
// retraso radial desde el centro medido con un contador (no con
// tiempo), y shimmer · mientras dura el hover cada pixel oscila entre
// su tamaño mínimo y máximo, no se queda quieto. Loop a 60fps con el
// mismo throttle del original, y se apaga solo cuando todos los
// pixeles terminan de desaparecer.
//
// Dos adaptaciones al tema: (1) el orden de capas. En el original la
// tarjeta tiene el fondo y el texto va encima del canvas; acá el
// contenido envuelto (.callout, .metric, .card…) trae su propio fondo
// opaco, que tapaba el canvas por completo (bug real de la primera
// versión: los pixeles casi no se veían). Al montar, el fondo del
// contenido se mueve al wrapper y el contenido queda transparente:
// fondo → brillo (::before) → pixeles → texto. (2) El color: el
// original usa variantes con 3 tonos de un mismo matiz; acá el matiz
// sale del acento propio de cada tarjeta (título del callout, valor
// de la métrica, número del paso…), así cada una destella en su color.
// ══════════════════════════════════════════════════════
import { cssVar, reduceMotion } from './kit.js';

export class SherryPixel {
  constructor(canvas, ctx, x, y, color, speed, delay) {
    this.width = canvas.width;
    this.height = canvas.height;
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.color = color;
    this.speed = (Math.random() * 0.8 + 0.1) * speed;
    this.size = 0;
    this.sizeStep = Math.random() * 0.4;
    this.minSize = 0.5;
    this.maxSizeInteger = 2;
    this.maxSize = Math.random() * (this.maxSizeInteger - this.minSize) + this.minSize;
    this.delay = delay;
    this.counter = 0;
    this.counterStep = Math.random() * 4 + (this.width + this.height) * 0.01;
    this.isIdle = false;
    this.isReverse = false;
    this.isShimmer = false;
  }
  draw() {
    const off = this.maxSizeInteger * 0.5 - this.size * 0.5;
    this.ctx.fillStyle = this.color;
    this.ctx.fillRect(this.x + off, this.y + off, this.size, this.size);
  }
  appear() {
    this.isIdle = false;
    if (this.counter <= this.delay) { this.counter += this.counterStep; return; }
    if (this.size >= this.maxSize) this.isShimmer = true;
    if (this.isShimmer) this.shimmer();
    else this.size += this.sizeStep;
    this.draw();
  }
  disappear() {
    this.isShimmer = false;
    this.counter = 0;
    if (this.size <= 0) { this.isIdle = true; return; }
    this.size -= 0.1;
    this.draw();
  }
  shimmer() {
    if (this.size >= this.maxSize) this.isReverse = true;
    else if (this.size <= this.minSize) this.isReverse = false;
    this.size += this.isReverse ? -this.speed : this.speed;
  }
}
export function initPixelCards() {
  const GAP = 6;
  const SPEED = reduceMotion.matches ? 0 : 30 * 0.001; // getEffectiveSpeed(30)
  const ACCENT_SEL = '.callout-title, .metric-val, .step-num, .timeline-dot, .badge';

  function parseRgb(str) {
    const m = String(str).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b] = m[1].split(',').map(v => parseFloat(v));
    return [r, g, b];
  }
  const mixRgb = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const css = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  // Luminancia relativa y razón de contraste WCAG.
  const lum = c => {
    const l = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
  };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

  document.querySelectorAll('.sherry-pixel-card').forEach(setup);

  function setup(wrap) {
    const content = wrap.firstElementChild;
    if (!content) return;

    // Capas: el fondo pasa al wrapper vía CSS (.sherry-pixel-card:has()
    // con tokens, así sigue al modo claro/oscuro sin JS); el contenido
    // queda transparente para que el canvas se vea entre ambos.
    // El margen del contenido (.card margin-bottom, .step-row margin
    // 12px 0…) pasa al wrapper: con overflow:hidden el wrapper es un
    // nuevo contexto de formato, el margen quedaba ADENTRO y el fondo +
    // el canvas lo rellenaban, saliéndose del borde de la tarjeta.
    const ccs = getComputedStyle(content);
    wrap.style.borderRadius = ccs.borderRadius;
    wrap.style.margin = ccs.margin;
    content.style.margin = '0';
    content.classList.add('sherry-pc-content');

    const canvas = document.createElement('canvas');
    canvas.className = 'sherry-pc-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    wrap.insertBefore(canvas, content);
    const ctx = canvas.getContext('2d');

    let pixels = [], raf = null, prev = performance.now();

    function palette() {
      const accentEl = content.matches(ACCENT_SEL) ? content : content.querySelector(ACCENT_SEL);
      const base = parseRgb(getComputedStyle(accentEl || content).color) || parseRgb(cssVar('--accent')) || [255, 45, 120];
      const paper = parseRgb(getComputedStyle(document.body).color) || [240, 240, 240];
      wrap.style.setProperty('--pc-glow', `rgba(${base[0]},${base[1]},${base[2]},.14)`);
      // 3 tonos del mismo matiz, como las variantes del original.
      const tones = [mixRgb(base, paper, 0.7), mixRgb(base, paper, 0.35), base];
      // Con la tarjeta llena de pixeles el texto pierde contraste. El
      // halo del hover usa el token (fondo o texto de la página) que más
      // contrasta con el promedio de los pixeles: oscuro sobre pixeles
      // claros, claro sobre pixeles oscuros.
      const ink = parseRgb(getComputedStyle(document.body).backgroundColor) || [13, 13, 13];
      const avg = [0, 1, 2].map(i => (tones[0][i] + tones[1][i] + tones[2][i]) / 3);
      const halo = contrast(avg, ink) >= contrast(avg, paper) ? ink : paper;
      wrap.style.setProperty('--pc-halo', css(halo));
      return tones.map(css);
    }

    function build() {
      const rect = wrap.getBoundingClientRect();
      const w = Math.floor(rect.width), h = Math.floor(rect.height);
      canvas.width = w; canvas.height = h;
      const colors = palette();
      pixels = [];
      for (let x = 0; x < w; x += GAP) {
        for (let y = 0; y < h; y += GAP) {
          const dx = x - w / 2, dy = y - h / 2;
          const delay = reduceMotion.matches ? 0 : Math.sqrt(dx * dx + dy * dy);
          pixels.push(new SherryPixel(canvas, ctx, x, y, colors[Math.floor(Math.random() * colors.length)], SPEED, delay));
        }
      }
    }

    function animate(fn) {
      raf = requestAnimationFrame(() => animate(fn));
      const now = performance.now(), passed = now - prev, interval = 1000 / 60;
      if (passed < interval) return;
      prev = now - (passed % interval);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let allIdle = true;
      for (let i = 0; i < pixels.length; i++) {
        pixels[i][fn]();
        if (!pixels[i].isIdle) allIdle = false;
      }
      if (allIdle) { cancelAnimationFrame(raf); raf = null; }
    }
    function run(fn) {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => animate(fn));
    }

    wrap.addEventListener('mouseenter', () => {
      // El tema pudo cambiar desde la última vez: recolorear barato
      // sin reconstruir la grilla.
      const colors = palette();
      pixels.forEach(p => { p.color = colors[Math.floor(Math.random() * colors.length)]; });
      run('appear');
    });
    wrap.addEventListener('mouseleave', () => run('disappear'));
    wrap.addEventListener('focusin', e => { if (!wrap.contains(e.relatedTarget)) run('appear'); });
    wrap.addEventListener('focusout', e => { if (!wrap.contains(e.relatedTarget)) run('disappear'); });

    new ResizeObserver(() => build()).observe(wrap);
    build();
  }
}
