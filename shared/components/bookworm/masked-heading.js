// ══════════════════════════════════════════════════════
// MASKED HEADING (React Bits) · el original es un clipPath SVG hecho
// de texto con la imagen adentro; GSAP solo anima la entrada. Mismo
// mecanismo sin GSAP: sync() coloca el <text> del clipPath sobre la
// línea base medida del texto real (que queda invisible pero sigue
// siendo el nombre accesible del h1), la imagen se mueve con deriva
// lenta + paralaje del cursor, y la entrada "rise" sube el glifo con
// power4.out. Mismos valores por defecto (fillScale 1.25, parallax 26,
// drift 18, duración 1.1s); textScale subido de .115 a .17 porque aquí
// el título es la portada entera.
// ══════════════════════════════════════════════════════
import { $, WALL, clamp, isDark, reduceMotion } from './kit.js';

export const Masked = (() => {
  const root = $('#bw-title'), measure = root.querySelector('.mh-measure'), word = root.querySelector('.mh-word'), base = root.querySelector('.mh-base');
  const glyph = root.querySelector('.mh-glyph'), media = root.querySelector('.mh-media'), img = root.querySelector('.mh-src');
  const S = { fillScale: 1.25, parallax: 26, drift: 18, textScale: .17 };
  const off = { x: 0, y: 0, tx: 0, ty: 0 };
  // El glifo arranca fuera del recorte para que no se vea antes de subir.
  let riseY = reduceMotion.matches ? 0 : 4000, raf = 0, last = 0, clock = 0, running = false;
  function place() {
    const Wd = root.clientWidth, Hd = root.clientHeight, mx = ((S.fillScale - 1) / 2) * Wd, my = ((S.fillScale - 1) / 2) * Hd;
    media.style.transform = `translate3d(${clamp(off.x, -mx, mx).toFixed(2)}px, ${clamp(off.y, -my, my).toFixed(2)}px, 0) scale(${S.fillScale})`;
    glyph.setAttribute('transform', `translate(0 ${riseY.toFixed(2)})`);
  }
  function sync() {
    root.style.fontSize = clamp(root.clientWidth * S.textScale, 20, 220).toFixed(1) + 'px';
    const cs = getComputedStyle(measure);
    glyph.setAttribute('x', word.offsetLeft);
    glyph.setAttribute('y', base.offsetTop);
    Object.assign(glyph.style, { fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontStyle: cs.fontStyle, letterSpacing: cs.letterSpacing });
    place();
  }
  function frame(now) {
    raf = 0; if (!running) return;
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now; clock += dt;
    const ease = 1 - Math.exp(-dt / .18);
    off.x += (off.tx + Math.sin(clock * .21) * S.drift - off.x) * ease;
    off.y += (off.ty + Math.cos(clock * .17) * S.drift * .6 - off.y) * ease;
    place();
    raf = requestAnimationFrame(frame);
  }
  root.addEventListener('pointermove', e => {
    const r = root.getBoundingClientRect();
    off.tx = clamp(((e.clientX - r.left) / (r.width || 1)) * 2 - 1, -1, 1) * -S.parallax;
    off.ty = clamp(((e.clientY - r.top) / (r.height || 1)) * 2 - 1, -1, 1) * -S.parallax;
  });
  root.addEventListener('pointerleave', () => { off.tx = 0; off.ty = 0; });
  function rise() {
    if (reduceMotion.matches) { riseY = 0; place(); return; }
    const d = (parseFloat(getComputedStyle(root).fontSize) || 48) * 1.15, t0 = performance.now(), dur = 1100;
    riseY = d; place();
    const step = now => { const t = Math.min(1, (now - t0) / dur); riseY = d * Math.pow(1 - t, 5); place(); if (t < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  new ResizeObserver(sync).observe(root);
  return {
    init() { img.src = isDark ? WALL.dark : WALL.light; sync(); document.fonts.ready.then(() => { sync(); rise(); }); },
    setImage(src) { img.src = src; },
    start() { if (running || reduceMotion.matches) return; running = true; last = 0; raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); raf = 0; },
  };
})();
