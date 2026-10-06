// ── 04 · Gooey Nav (React Bits) como pestañas ─────────────────────
import { $, reduceMotion } from './kit.js';
import { updateHexes } from './theme-toggle.js';

export function mount() {
(() => {
  const root = $('#ex-gooey'), lis = [...root.querySelectorAll('li')], tabs = lis.map(li => li.querySelector('button'));
  const panels = tabs.map(b => document.getElementById(b.getAttribute('aria-controls')));
  const filter = root.querySelector('.effect.filter'), text = root.querySelector('.effect.text');
  const animationTime = 600, particleCount = 15, particleDistances = [90, 10], particleR = 100, timeVariance = 300, colors = [1, 2, 3, 1, 2, 3, 1, 4];
  let activeIndex = 0;
  const noise = (n = 1) => n / 2 - Math.random() * n;
  const getXY = (distance, i, total) => { const angle = ((360 + noise(8)) / total) * i * (Math.PI / 180); return [distance * Math.cos(angle), distance * Math.sin(angle)]; };
  const createParticle = (i, t, d, r) => { const rotate = noise(r / 10); return { start: getXY(d[0], particleCount - i, particleCount), end: getXY(d[1] + noise(7), particleCount - i, particleCount), time: t, scale: 1 + noise(0.2), color: colors[Math.floor(Math.random() * colors.length)], rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10 }; };
  const makeParticles = el => {
    const bubbleTime = animationTime * 2 + timeVariance; el.style.setProperty('--time', `${bubbleTime}ms`);
    for (let i = 0; i < particleCount; i++) {
      const t = animationTime * 2 + noise(timeVariance * 2), p = createParticle(i, t, particleDistances, particleR);
      el.classList.remove('active');
      setTimeout(() => {
        const particle = document.createElement('span'), point = document.createElement('span');
        particle.classList.add('particle');
        particle.style.setProperty('--start-x', `${p.start[0]}px`); particle.style.setProperty('--start-y', `${p.start[1]}px`);
        particle.style.setProperty('--end-x', `${p.end[0]}px`); particle.style.setProperty('--end-y', `${p.end[1]}px`);
        particle.style.setProperty('--time', `${p.time}ms`); particle.style.setProperty('--scale', `${p.scale}`);
        particle.style.setProperty('--color', `var(--color-${p.color})`); particle.style.setProperty('--rotate', `${p.rotate}deg`);
        point.classList.add('point'); particle.appendChild(point); el.appendChild(particle);
        requestAnimationFrame(() => el.classList.add('active'));
        setTimeout(() => { particle.remove(); }, t);
      }, 30);
    }
  };
  const place = li => {
    const cr = root.getBoundingClientRect(), pr = li.getBoundingClientRect();
    const st = { left: `${pr.x - cr.x}px`, top: `${pr.y - cr.y}px`, width: `${pr.width}px`, height: `${pr.height}px` };
    Object.assign(filter.style, st); Object.assign(text.style, st); text.textContent = li.textContent;
  };
  const select = (index, focus) => {
    if (index === activeIndex) { if (focus) tabs[index].focus(); return; }
    activeIndex = index;
    lis.forEach((li, i) => li.classList.toggle('active', i === index));
    tabs.forEach((b, i) => { b.setAttribute('aria-selected', String(i === index)); b.tabIndex = i === index ? 0 : -1; });
    // Fija la altura actual, cambia de panel y desliza hacia la nueva.
    const stack = panels[0].parentElement, from = stack.offsetHeight;
    panels.forEach((p, i) => { p.hidden = i !== index; p.classList.remove('is-entering'); });
    if (!reduceMotion.matches) {
      stack.style.height = 'auto'; const to = stack.offsetHeight;
      stack.style.height = from + 'px'; void stack.offsetHeight; stack.style.height = to + 'px';
      clearTimeout(stack._t); stack._t = setTimeout(() => { stack.style.height = ''; }, 420);
      panels[index].classList.add('is-entering');
    }
    if (focus) tabs[index].focus();
    place(lis[index]);
    filter.querySelectorAll('.particle').forEach(p => p.remove());
    text.classList.remove('active'); void text.offsetWidth; text.classList.add('active');
    if (!reduceMotion.matches) makeParticles(filter); else filter.classList.add('active');
  };
  tabs.forEach((b, i) => {
    b.addEventListener('click', () => select(i, false));
    b.addEventListener('keydown', e => {
      const last = tabs.length - 1, k = e.key;
      const next = k === 'ArrowRight' ? (activeIndex + 1) % tabs.length : k === 'ArrowLeft' ? (activeIndex + last) % tabs.length : k === 'Home' ? 0 : k === 'End' ? last : -1;
      if (next >= 0) { e.preventDefault(); select(next, true); }
    });
  });
  panels.forEach((p, i) => { p.hidden = i !== activeIndex; });
  place(lis[activeIndex]); text.classList.add('active'); filter.classList.add('active');
  new ResizeObserver(() => place(lis[activeIndex])).observe(root);
})();
updateHexes();
}
