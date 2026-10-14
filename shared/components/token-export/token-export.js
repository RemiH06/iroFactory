// ══════════════════════════════════════════════════════
// TOKEN EXPORT · lee los tokens del tema directo de la página, en los dos
// modos, y los entrega en el formato que pida otro proyecto: CSS, SCSS,
// JSON de Design Tokens (W3C), Tailwind, SwiftUI o Jetpack Compose.
// Cada modo se lee cambiando la clase de <body> y regresándola en la
// misma tarea (el navegador nunca pinta el cambio). Los colores se
// resuelven a hexadecimal pintándolos en un lienzo de 1 px, así que
// color-mix() y var() anidadas también salen bien.
//   mount({ el, name, altClass, groups: [[nombre, tipo, [tokens]]] })
//   tipo: 'color' | 'dimension' | 'font'
// ══════════════════════════════════════════════════════
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
// Si css no es válido, fillStyle se queda con el anterior.
const hex = css => {
  probe.clearRect(0, 0, 1, 1); probe.fillStyle = '#080808'; probe.fillStyle = css; probe.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data, h = v => v.toString(16).padStart(2, '0').toUpperCase();
  return '#' + h(r) + h(g) + h(b) + (a < 255 ? h(a) : '');
};
const camel = s => s.replace(/^--/, '').replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const pascal = s => { const c = camel(s); return c[0].toUpperCase() + c.slice(1); };
const kebab = s => s.replace(/^--/, '');
const SWIFT_RESERVED = new Set(['new', 'default', 'class', 'struct', 'let', 'var', 'func', 'return', 'self', 'init', 'in', 'is', 'as', 'case', 'repeat']);

const noTransitions = Object.assign(document.createElement('style'), { textContent: '*,*::before,*::after{transition:none!important}' });
// Lee todos los tokens en un modo; `alt` = clase del modo alterno puesta o no.
function readMode(groups, altClass, alt) {
  const body = document.body, had = body.classList.contains(altClass);
  document.head.appendChild(noTransitions); body.classList.toggle(altClass, alt);
  const el = document.createElement('span'); el.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none'; body.appendChild(el);
  const out = {};
  groups.forEach(([, type, toks]) => toks.forEach(t => {
    if (type === 'color') { el.style.color = `var(${t})`; out[t] = hex(getComputedStyle(el).color); }
    else out[t] = getComputedStyle(body).getPropertyValue(t).trim();
  }));
  el.remove(); body.classList.toggle(altClass, had); getComputedStyle(body).color; noTransitions.remove();
  return out;
}

const FORMATS = {
  css: { label: 'CSS', file: 'tokens.css', lang: 'css', build({ sel, light, dark, both, mode }) {
    const block = (head, vals) => `${head} {\n${sel.map(t => `  ${t}: ${vals[t]};`).join('\n')}\n}`;
    return both ? `${block(':root', light)}\n\n${block(':root[data-theme="dark"]', dark)}\n` : block(':root', mode === 'dark' ? dark : light) + '\n';
  } },
  scss: { label: 'SCSS', file: '_tokens.scss', lang: 'scss', build({ sel, light, dark, both, mode }) {
    if (!both) { const v = mode === 'dark' ? dark : light; return sel.map(t => `$${kebab(t)}: ${v[t]};`).join('\n') + '\n'; }
    const map = (n, v) => `$${n}: (\n${sel.map(t => `  '${kebab(t)}': ${/^[#\d]/.test(v[t]) ? v[t] : `'${v[t].replace(/'/g, '"')}'`},`).join('\n')}\n);`;
    return `${map('tokens-light', light)}\n\n${map('tokens-dark', dark)}\n\n// Uso: map-get($tokens-light, 'accent')\n`;
  } },
  json: { label: 'JSON (W3C)', file: 'tokens.json', lang: 'json', build({ groups, sel, light, dark, both, mode }) {
    const TYPE = { color: 'color', dimension: 'dimension', font: 'fontFamily' }, out = {};
    groups.forEach(([g, type, toks]) => toks.filter(t => sel.includes(t)).forEach(t => {
      const grp = out[camel('--' + g.toLowerCase().replace(/\s+/g, '-'))] ||= {};
      const v = mode === 'dark' && !both ? dark[t] : light[t];
      grp[camel(t)] = { $type: TYPE[type], $value: type === 'font' ? v.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')) : v };
      if (both && dark[t] !== light[t]) grp[camel(t)].$extensions = { mode: { dark: dark[t] } };
    }));
    return JSON.stringify(out, null, 2) + '\n';
  } },
  tailwind: { label: 'Tailwind', file: 'tailwind.config.js', lang: 'js', build({ groups, sel, light, dark, both, mode }) {
    const pick = type => groups.filter(g => g[1] === type).flatMap(g => g[2]).filter(t => sel.includes(t));
    const val = t => both ? `'var(${t})'` : `'${(mode === 'dark' ? dark : light)[t]}'`;
    const obj = (type, f = kebab) => pick(type).map(t => `        '${f(t)}': ${val(t)},`).join('\n');
    const fonts = pick('font').map(t => `        '${kebab(t)}': [${(light[t] || '').split(',').map(s => `'${s.trim().replace(/^['"]|['"]$/g, '')}'`).join(', ')}],`).join('\n');
    return `/** @type {import('tailwindcss').Config} */\nexport default {\n${both ? "  darkMode: ['selector', '[data-theme=\"dark\"]'],\n" : ''}  theme: {\n    extend: {\n      colors: {\n${obj('color')}\n      },\n      borderRadius: {\n${obj('dimension', t => kebab(t).replace(/^radius-?/, '') || 'DEFAULT')}\n      },\n      fontFamily: {\n${fonts}\n      },\n    },\n  },\n};\n${both ? '// Con los dos modos, los colores apuntan a variables: incluye también tokens.css.\n' : ''}`;
  } },
  swift: { label: 'SwiftUI', file: 'Color+Tokens.swift', lang: 'swift', build({ groups, sel, light, dark, both, mode, name }) {
    const id = t => { const c = camel(t); return SWIFT_RESERVED.has(c) ? `\`${c}\`` : c; };
    const h = v => '0x' + v.slice(1, 7), al = v => v.length > 7 ? `, alpha: ${(parseInt(v.slice(7, 9), 16) / 255).toFixed(2)}` : '';
    const colors = groups.filter(g => g[1] === 'color').flatMap(g => g[2]).filter(t => sel.includes(t));
    const dims = groups.filter(g => g[1] === 'dimension').flatMap(g => g[2]).filter(t => sel.includes(t));
    const lines = colors.map(t => both ? `    static let ${id(t)} = Color(light: ${h(light[t])}${al(light[t])}, dark: ${h(dark[t])}${al(dark[t])})` : `    static let ${id(t)} = Color(hex: ${h((mode === 'dark' ? dark : light)[t])}${al((mode === 'dark' ? dark : light)[t])})`);
    return `import SwiftUI\n\n// Tokens de ${name}, generados desde la página del tema.\nextension Color {\n${lines.join('\n')}\n}\n${dims.length ? `\nenum ${pascal('--' + name)}Radius {\n${dims.map(t => `    static let ${id(t)}: CGFloat = ${parseFloat(light[t])}`).join('\n')}\n}\n` : ''}
extension Color {
    init(hex: UInt32, alpha: Double = 1) {
        self.init(.sRGB, red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255, blue: Double(hex & 0xFF) / 255, opacity: alpha)
    }${both ? `
    init(light: UInt32, dark: UInt32, alpha: Double = 1) {
        self.init(UIColor { trait in
            let v = trait.userInterfaceStyle == .dark ? dark : light
            return UIColor(red: CGFloat((v >> 16) & 0xFF) / 255, green: CGFloat((v >> 8) & 0xFF) / 255, blue: CGFloat(v & 0xFF) / 255, alpha: alpha)
        })
    }` : ''}
}
`;
  } },
  compose: { label: 'Compose', file: 'Tokens.kt', lang: 'kotlin', build({ groups, sel, light, dark, both, mode, name }) {
    const k = v => `Color(0x${(v.length > 7 ? v.slice(7, 9) : 'FF')}${v.slice(1, 7)})`;
    const colors = groups.filter(g => g[1] === 'color').flatMap(g => g[2]).filter(t => sel.includes(t));
    const dims = groups.filter(g => g[1] === 'dimension').flatMap(g => g[2]).filter(t => sel.includes(t));
    const obj = (n, v) => `object ${n} {\n${colors.map(t => `    val ${pascal(t)} = ${k(v[t])}`).join('\n')}\n}`;
    const P = pascal('--' + name);
    return `package ${name}.tokens\n\nimport androidx.compose.ui.graphics.Color\nimport androidx.compose.ui.unit.dp\n\n// Tokens de ${name}, generados desde la página del tema.\n${both ? `${obj(P + 'Light', light)}\n\n${obj(P + 'Dark', dark)}` : obj(P + 'Colors', mode === 'dark' ? dark : light)}\n${dims.length ? `\nobject ${P}Radius {\n${dims.map(t => `    val ${pascal(t)} = ${parseFloat(light[t])}.dp`).join('\n')}\n}\n` : ''}`;
  } }
};

export function mount({ el = document.getElementById('token-export'), name = 'tema', altClass = 'dark', groups = [] } = {}) {
  if (!el || !groups.length) return;
  let fmt = 'css', mode = 'both';
  const on = new Set(groups.map(g => g[0]));
  el.innerHTML = `<div class="tx-bar">
      <div class="tx-fmts" role="tablist" aria-label="Formato">${Object.entries(FORMATS).map(([k, f]) => `<button type="button" role="tab" class="tx-fmt" data-f="${k}">${f.label}</button>`).join('')}</div>
      <div class="tx-modes" role="group" aria-label="Modo"><button type="button" data-m="light">día</button><button type="button" data-m="dark">noche</button><button type="button" data-m="both">los dos</button></div>
    </div>
    <div class="tx-groups" role="group" aria-label="Grupos de tokens">${groups.map(([g, , toks]) => `<label class="tx-g"><input type="checkbox" checked data-g="${esc(g)}"> ${esc(g)} <small>${toks.length}</small></label>`).join('')}</div>
    <p class="tx-sum" aria-live="polite"></p>
    <div class="tx-out"><div class="tx-head"><code class="tx-file"></code><span><button type="button" class="tx-copy">copiar</button><button type="button" class="tx-dl">descargar</button></span></div><pre class="tx-code"><code></code></pre></div>`;
  const $ = s => el.querySelector(s);
  let cache = null;
  const values = () => cache || (cache = { light: readMode(groups, altClass, false), dark: readMode(groups, altClass, true) });
  function draw() {
    const { light, dark } = values(), sel = groups.filter(g => on.has(g[0])).flatMap(g => g[2]), both = mode === 'both';
    const text = sel.length ? FORMATS[fmt].build({ groups, sel, light, dark, both, mode, name }) : '';
    $('.tx-code code').textContent = text || 'Elige al menos un grupo.';
    $('.tx-file').textContent = FORMATS[fmt].file;
    const changes = sel.filter(t => light[t] !== dark[t]).length;
    $('.tx-sum').textContent = `${sel.length} tokens · ${changes} cambian entre día y noche · ${text.split('\n').length - 1} líneas`;
    el.querySelectorAll('.tx-fmt').forEach(b => { const a = b.dataset.f === fmt; b.setAttribute('aria-selected', String(a)); b.tabIndex = a ? 0 : -1; });
    el.querySelectorAll('[data-m]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === mode)));
    $('.tx-copy').disabled = $('.tx-dl').disabled = !sel.length;
  }
  el.addEventListener('click', e => {
    const f = e.target.closest('.tx-fmt'); if (f) { fmt = f.dataset.f; draw(); return; }
    const m = e.target.closest('[data-m]'); if (m) { mode = m.dataset.m; draw(); return; }
    const b = e.target.closest('.tx-copy, .tx-dl'); if (!b) return;
    const text = $('.tx-code code').textContent, o = b.textContent;
    if (b.classList.contains('tx-dl')) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' })); a.download = FORMATS[fmt].file; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); return; }
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => { b.textContent = 'copiado'; }, () => { b.textContent = 'no se pudo'; }).finally(() => setTimeout(() => { b.textContent = o; }, 1300));
  });
  el.querySelector('.tx-fmts').addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; e.preventDefault();
    const keys = Object.keys(FORMATS), i = (keys.indexOf(fmt) + (e.key === 'ArrowRight' ? 1 : -1) + keys.length) % keys.length;
    fmt = keys[i]; draw(); el.querySelector(`[data-f="${fmt}"]`).focus();
  });
  el.addEventListener('change', e => { const c = e.target.closest('[data-g]'); if (c) { c.checked ? on.add(c.dataset.g) : on.delete(c.dataset.g); draw(); } });
  draw();
}
