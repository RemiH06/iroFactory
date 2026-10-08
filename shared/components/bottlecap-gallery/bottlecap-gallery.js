// ══════════════════════════════════════════════════════
// Corcholatas (riff de Figma de @singhshristi), canvas 2D. Una al centro,
// nítida; las demás en un anillo, desenfocadas, con estela radial y
// aberración cromática hacia afuera, como un jalón de foco. Cada
// corcholata se dibuja una vez a sprite (21 pliegues, borde metálico,
// sombra) y su versión desenfocada se hornea con la estela y los tres
// canales separados; al dibujar solo se gira hacia afuera.
// Como navegación: cada corcholata puede llevar `href`; la del centro es
// la elegida, y tocarla (o Enter) lleva a su destino. El enlace «Ir a…»
// de `opts.go` se actualiza con la elegida.
// ══════════════════════════════════════════════════════
import { $, $$, theme, cssVar, hexRgb, rgb01, rgba, onTheme, reduceMotion, makeLoop, glProgram, EASE } from '../../core/core.js';

export function mount(opts = {}) {
  const canvas = $(opts.canvas ?? '[data-bottlecaps]'); if (!canvas) return;
  const ctx = canvas.getContext('2d'), DATA = opts.items, N = DATA.length;
  const cap = $(opts.caption ?? '#caps-caption'), canFilter = 'filter' in ctx;
  let W = 0, H = 0, dpr = 1, focus = 0, imgs = [], sharp = [], soft = [], baseS = 0, drift = 0, lastT = 0, built = false;
  const st = DATA.map(() => ({ x: 0, y: 0, s: 0, f: 0, init: false }));
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  const loadAll = () => Promise.all(DATA.map(d => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = theme.dark ? d.dark : d.light; })));
  // Sprite nítido: corcholata de 21 pliegues con la imagen en el centro.
  const capSprite = (im, S) => {
    const pad = S * .12, c = mk(S + pad * 2, S + pad * 2), x = c.getContext('2d'), cx = c.width / 2, cy = c.height / 2, R = S / 2;
    const rim = cssVar('--gray'), hi = cssVar('--white'), lo = cssVar('--black');
    x.save(); x.shadowColor = rgba(lo, .35); x.shadowBlur = S * .08; x.shadowOffsetY = S * .04;
    x.beginPath(); for (let i = 0; i <= 252; i++) { const a = i / 252 * Math.PI * 2, r = R * (.94 + .06 * Math.cos(a * 21)); x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.closePath();
    const mg = x.createLinearGradient(cx - R, cy - R, cx + R, cy + R); mg.addColorStop(0, hi); mg.addColorStop(.45, rim); mg.addColorStop(1, lo);
    x.fillStyle = mg; x.fill(); x.restore();
    const ri = R * .8; x.save(); x.beginPath(); x.arc(cx, cy, ri, 0, Math.PI * 2); x.clip();
    if (im) { const k = Math.max(ri * 2 / im.naturalWidth, ri * 2 / im.naturalHeight); x.drawImage(im, cx - im.naturalWidth * k / 2, cy - im.naturalHeight * k / 2, im.naturalWidth * k, im.naturalHeight * k); }
    const lip = x.createRadialGradient(cx, cy, ri * .82, cx, cy, ri); lip.addColorStop(0, rgba(lo, 0)); lip.addColorStop(1, rgba(lo, .45)); x.fillStyle = lip; x.fillRect(cx - ri, cy - ri, ri * 2, ri * 2);
    const sh = x.createLinearGradient(cx - ri, cy - ri, cx, cy); sh.addColorStop(0, rgba(hi, .35)); sh.addColorStop(1, rgba(hi, 0)); x.fillStyle = sh; x.fillRect(cx - ri, cy - ri, ri * 2, ri * 2);
    x.restore();
    x.strokeStyle = rgba(hi, .5); x.lineWidth = Math.max(1, S * .01); x.beginPath(); x.arc(cx, cy, ri, 0, Math.PI * 2); x.stroke();
    return c;
  };
  // Un canal de color de un sprite (para separar R, G y B).
  const channel = (src, rgb) => { const c = mk(src.width, src.height), x = c.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'multiply'; x.fillStyle = rgb; x.fillRect(0, 0, c.width, c.height); x.globalCompositeOperation = 'destination-in'; x.drawImage(src, 0, 0); return c; };
  // Sprite desenfocado, orientado a +x (hacia afuera): estela, desenfoque y aberración.
  const softSprite = src => {
    const b = mk(src.width, src.height), bx = b.getContext('2d'), blur = src.width * .028;
    if (canFilter) { bx.filter = `blur(${blur}px)`; bx.drawImage(src, 0, 0); bx.filter = 'none'; }
    else { const t = mk(src.width / 6, src.height / 6); t.getContext('2d').drawImage(src, 0, 0, t.width, t.height); bx.imageSmoothingQuality = 'high'; bx.drawImage(t, 0, 0, b.width, b.height); }
    // Lienzo con aire arriba y abajo (y = .2 alto) y la estela hacia +x, que se desvanece sin cortes.
    const ext = src.width * .6, oy = src.height * .2, c = mk(src.width + ext, src.height * 1.4), x = c.getContext('2d'), ox = src.width * .04;
    const tr = mk(c.width, c.height), tx = tr.getContext('2d');
    for (let k = 6; k >= 1; k--) { tx.globalAlpha = .07 * (7 - k) / 6 + .03; const sc = 1 + k * .045; tx.drawImage(b, ext * k / 12, oy + src.height * (1 - sc) / 2, src.width * sc, src.height * sc); }
    tx.globalAlpha = 1; tx.globalCompositeOperation = 'destination-in';
    const fade = tx.createLinearGradient(src.width * .5, 0, c.width, 0); fade.addColorStop(0, 'rgba(128,128,128,1)'); fade.addColorStop(1, 'rgba(128,128,128,0)');
    tx.fillStyle = fade; tx.fillRect(0, 0, c.width, c.height);
    x.drawImage(tr, 0, 0); x.globalCompositeOperation = 'lighter';
    x.drawImage(channel(b, '#ff0000'), ox * 1.6, oy); x.drawImage(channel(b, '#00ff00'), ox * .5, oy); x.drawImage(channel(b, '#0000ff'), -ox * .6, oy);
    return c;
  };
  const layout = () => {
    const m = Math.min(W, H), F = m * .56, O = F * .42, rx = Math.min(W / 2 - O * .66, m * .78), ry = Math.min(H * .36, H / 2 - O * .66);
    baseS = F;
    return st.map((_, i) => {
      if (i === focus) return { x: W / 2, y: H / 2, s: F, f: 1 };
      const k = (i - focus + N) % N - 1, a = -Math.PI / 2 + (k + .5) / (N - 1) * Math.PI * 2 + drift;
      return { x: W / 2 + Math.cos(a) * rx, y: H / 2 + Math.sin(a) * ry, s: O, f: 0 };
    });
  };
  const build = async () => {
    imgs = await loadAll();
    const S = Math.round(Math.min(W, H) * .56 * dpr);
    if (S < 4) return;
    sharp = imgs.map(im => capSprite(im, S));
    soft = imgs.map(im => softSprite(capSprite(im, Math.round(S * .42))));
    built = true; loop.still();
  };
  const resize = () => {
    const r = canvas.getBoundingClientRect(); dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = r.width; H = r.height; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    st.forEach(s => { s.init = false; });
    build();
  };
  const draw = t => {
    const dt = Math.min(.05, lastT ? (t - lastT) / 1000 : 0); lastT = t;
    if (!reduceMotion.matches) drift += dt * .06;
    const target = layout(), k = reduceMotion.matches ? 1 : 1 - Math.exp(-dt * 7);
    st.forEach((s, i) => { const g = target[i]; if (!s.init) { Object.assign(s, g, { init: true }); return; } s.x += (g.x - s.x) * k; s.y += (g.y - s.y) * k; s.s += (g.s - s.s) * k; s.f += (g.f - s.f) * k; });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    if (!built) return;
    const order = st.map((s, i) => i).sort((a, b) => st[a].f - st[b].f);
    order.forEach(i => {
      const s = st[i], sp = sharp[i], so = soft[i];
      if (s.f < .99 && so) {
        // El sprite es cuadrado más la estela hacia +x: se gira para que la estela apunte hacia afuera.
        const ang = Math.atan2(s.y - H / 2, s.x - W / 2), sh = s.s * 1.24, th = sh * 1.4, sw = th * so.width / so.height;
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(Number.isFinite(ang) ? ang : 0); ctx.globalAlpha = 1 - s.f;
        ctx.drawImage(so, -sh / 2, -th / 2, sw, th); ctx.restore();
      }
      if (s.f > .01 && sp) { const sz = s.s * 1.24; ctx.globalAlpha = s.f; ctx.drawImage(sp, s.x - sz / 2, s.y - sz / 2, sz, sz); ctx.globalAlpha = 1; }
    });
  };
  const loop = makeLoop(canvas, draw, 30);
  const go = $(opts.go ?? '#caps-go');
  const select = i => {
    focus = (i + N) % N; const d = DATA[focus];
    cap.innerHTML = `<b>${d.name}</b><span>${d.note ?? `${focus + 1} de ${N}`}</span>`;
    if (go && d.href) { go.href = d.href; go.textContent = `Ir a ${d.name} →`; if (/^https?:/.test(d.href)) { go.target = '_blank'; go.rel = 'noopener'; } else { go.removeAttribute('target'); go.removeAttribute('rel'); } }
    loop.still(); loop.start();
  };
  const activate = () => { const d = DATA[focus]; if (!d.href) return; if (/^https?:/.test(d.href)) window.open(d.href, '_blank', 'noopener'); else document.querySelector(d.href)?.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' }); };
  $(opts.prev ?? '#caps-prev').addEventListener('click', () => select(focus - 1));
  $(opts.next ?? '#caps-next').addEventListener('click', () => select(focus + 1));
  canvas.addEventListener('click', e => {
    const r = canvas.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    let best = -1, bd = Infinity; st.forEach((s, i) => { const d = Math.hypot(s.x - px, s.y - py); if (d < s.s * .6 && d < bd) { bd = d; best = i; } });
    if (best >= 0 && best !== focus) select(best); else if (best === focus) activate();
  });
  canvas.parentElement.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') select(focus - 1); if (e.key === 'ArrowRight') select(focus + 1); if (e.key === 'Enter') activate(); });
  select(0);
  new ResizeObserver(resize).observe(canvas);
  onTheme(() => { built = false; build(); });
}
