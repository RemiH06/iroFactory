# iroFactory · Contexto de trabajo

Documento de handoff para continuar el proyecto en Claude Code.
Última sesión en claude.ai: agosto 2026.

---

## 1. Qué es el proyecto

Colección personal de 12 temas de diseño en HTML, cada uno autocontenido en un solo archivo.
Sirven como skins de documentación para proyectos propios. Se hostean en GitHub Pages.

Repo: `github.com/RemiH06/iroFactory`
Gallery: `remih06.github.io/iroFactory/iroFactory_gallery.html`
Licencia: AGPL-3.0 (el archivo `LICENSE` ya existe en el repo)

---

## 2. Estado actual

```
iroFactory/
├── iroFactory_gallery.html
├── README.md
├── LICENSE
├── apolo/apolo_theme_demo.html
├── bookworm/bookworm_theme_demo.html
├── disco/disco_theme_demo.html
├── elixir/elixir_theme_demo.html
├── forge/forge_theme_demo.html
├── lambda/lambda_theme_demo.html
├── ludus/ludus_theme_demo.html
├── metro/metro_theme_demo.html
├── odysseus/odysseus_theme_demo.html
├── sherry/sherry_theme_demo.html
├── shui/shui_theme_demo.html
└── tarot/tarot_theme_demo.html
```

Los 12 temas están terminados y aprobados visualmente. La galería funciona.
`metro` era el único que estaba en tres archivos (CSS + JS + HTML) y ya se unificó.

Existen además varios sandboxes de calibración que no están en el repo:
`tri_sandbox`, `tri_sandbox_v2`, `asanoha_sandbox`, `organic_tri_bg_sandbox`,
`tarot_deco_sandbox`, `bookworm_wood_sandbox`, `bookworm_text_sandbox`,
`ludus_curtain_sandbox`. Decidir si se versionan.

---

## 3. Reglas duras del proyecto

Estas son invariantes. No romperlas sin discutirlo primero.

1. **Autocontenido.** Todo el CSS y JS va inline en el `.html`. Sin dependencias externas
   salvo las fuentes por CDN. Esto es lo que hace portables a los temas y no es negociable
   sin una razón fuerte.
2. **Fuentes desde Bunny Fonts**, no Google Fonts. Mismo string de import.
3. **Ningún color llega a `#000` ni `#fff` puros.**
4. **Sin guiones largos en ningún texto.** Se reemplazan por punto medio (`·`).
5. **Tokens CSS declarados en `body` y en `body.dark` o `body.light`.** El toggle opera
   `document.body.classList` directamente.
6. **El modo claro de `ludus` no se toca.** Está aprobado tal cual.
7. Commits estilo conventional commits, lo más breves posible, sin saltos de línea
   innecesarios. Se les llama checkpoints.

---

## 4. Hallazgos de auditoría (verificados, no de memoria)

Corrido sobre los 13 archivos con grep:

| Hallazgo | Estado |
|---|---|
| `<meta name="description">` | **0 archivos lo tienen** |
| `<h1>` | **0 archivos lo tienen** (el título visual es un `div` con estilos inline, se salta directo a `h2`) |
| Atributos `aria-*` | **0 archivos los usan** |
| Estados `:focus` o `:focus-visible` | **0 archivos los definen** |
| `lang` | correcto: `es` en los temas, `en` en la galería |
| `border-left` decorativo | entre 2 y 6 usos por archivo |

Además:
- **No existen `robots.txt` ni `sitemap.xml`** en el repo.
- **Ningún tema respeta `prefers-reduced-motion`.** Todos corren `requestAnimationFrame`
  en loop continuo.
- **La galería usa `sandbox="allow-scripts allow-same-origin"` en el iframe.** Esas dos
  banderas juntas anulan el sandbox cuando el contenido es del mismo origen, que es
  exactamente el caso del fallback local.

Sobre `border-left`: el veredicto honesto es que en callouts es funcional (el color
codifica severidad) y en bloques `pre` es decoración pura. No es urgente.

---

## 5. Plan acordado

### Fase 1.1 · Accesibilidad y metadata
Alcance: los 13 archivos. Trabajo mecánico, bajo riesgo.

- Agregar `<meta name="description">` a cada tema, describiendo el tema, no el proyecto.
- Convertir el título visual en `<h1>` real, conservando la apariencia con CSS.
- `aria-label` en los toggles de tema y en el botón `☰` de la galería.
- Definir `:focus-visible` en todos los elementos interactivos, con el color de acento
  de cada tema.
- `prefers-reduced-motion`: pausar o congelar los loops de canvas.
- Arreglar el sandbox del iframe de la galería.
- Crear `robots.txt` y `sitemap.xml` en la raíz.

### Fase 1.2 · Piloto de shader en shui
Solo si 1.1 quedó limpio.

Reescribir el fondo de `shui` en WebGL crudo, sin librería, para tener agua real
con cáusticas en vez de senoides dibujadas línea por línea.

Si el resultado convence, evaluar `forge` y `sherry`. Los otros nueve temas no se tocan.

---

## 6. Decisiones técnicas ya tomadas

**Three.js queda descartado.** Pesa alrededor de 600KB minificado. Inlinearlo doce veces
es absurdo y traerlo por CDN rompe la regla de autocontenido. El camino es WebGL crudo:
los shaders son strings de GLSL, el boilerplate de contexto son unas cuarenta líneas,
y todo cabe inline.

**Solo tres temas ganan algo con shaders:**
- `shui`: cáusticas y refracción son el caso canónico de fragment shaders.
- `forge`: lava con turbulencia por noise y distorsión por calor.
- `sherry`: bloom real sobre el neón, caro en canvas 2D y gratis en shader.

Los otros nueve son composiciones estáticas o sistemas de partículas donde canvas 2D
ya es la herramienta correcta. Reescribirlos sería trabajo sin ganancia.

**No se va a reworkear el diseño visual.** Se corrió la sección anti-vibecode del
checklist mentalmente sobre la colección: varios temas cruzarían el umbral por lista
literal (neón, gradientes, franja izquierda), pero la regla que gobierna esa sección es
la de la frase justificable, y todos los temas la pasan. El neón de sherry es vaporwave
por decisión. El gis de lambda es el medio como estética. El titubeo de la brújula de
odysseus imita una brújula real buscando el norte. Aplicar esa sección mecánicamente
aplanaría justo lo que hace buena a la colección.

---

## 7. Referencia por tema

| Tema | Fuente | Default | Técnica de fondo |
|---|---|---|---|
| `apolo` | Cinzel + Fira Code | claro | Columnas jónicas SVG (4 por pared, entasis, estrías, volutas), rosetas entre columnas, pétalos izq→der sobre gradiente de cielo. Padding lateral 34% |
| `bookworm` | Libre Baskerville + Fira Code | claro | 4 capas: triángulos isométricos (s=48, h=83.14), komorebi estático, lienzo SVG con 20 agujeros aleatorios (r=100), partículas (hojas en claro, lluvia en oscuro) |
| `disco` | Plus Jakarta Sans | claro | Patrón asanoha + luces disco flotantes en canvas con `mix-blend-mode` multiply/screen |
| `elixir` | Iosevka | oscuro | Grafo neuronal; los nodos cambian de color de forma permanente al terminar el pulso |
| `forge` | Azeret Mono | oscuro | Oscuro: lava por ambos costados con gradiente `gx0→gx1` y borde brillante, chispas desde `y=75-100%` sin gravedad (decay 0.018-0.043, generación 0.30/frame), cenizas hacia la derecha. Claro: arcos eléctricos de 3 capas (blur 40/18/núcleo) + 3 osciloscopios apilados (`oscW=55%`, `oscH=90`, `startY=H*0.50-oscH/2`, `gapY=24`) |
| `lambda` | Cormorant Garamond + Fira Code | claro, auto-toggle a oscuro al cargar | Grid hexagonal CSS + objetos matemáticos estáticos en canvas con doble trazo (simula gis) |
| `ludus` | Righteous + Fira Code | oscuro | Oscuro: carpa de circo. Cortinas SVG con `cw=0.335, pd=0.010, st=12, cv=1.00, mp=0.50, al=0.90`, área útil 35%, padding 34%. Damero bicromático crimson/dorado, polvo dorado, spotlight estático aleatorio. Claro: feria de día en pasteles, **no tocar** |
| `metro` | Space Mono + DM Sans | oscuro | Grafo de nodos con aristas dinámicas; cuadrados solo en rojo, amarillo y verde |
| `odysseus` | IM Fell English + Fira Code | claro | Mesa de madera (vetas bezier) + mapa inclinado `MAP_ROT` aleatorio -7° a 7°, `MAP_SCALE=0.82`, agua animada clipeada, tintero y pluma SVG en espacio rotado, brújula r=10% del mapa titubeando ±8.6° cada 1.2-2.8s. `POS_COMPASS`, `POS_INK`, `POS_QUILL` en cuadrantes separados |
| `sherry` | JetBrains Mono | oscuro | Triángulos orgánicos (mezcla de equiláteros y escalenos), flashean individualmente en 7 colores neón (80-300ms). Toggle de CRT |
| `shui` | Recursive (`CASL 1`) | claro | Claro: gradiente turquesa Caribe, un solo haz desde esquina sup-izq con `blur(32px)`, burbujas con wobble y reflejo. Oscuro: negro casi total, partículas bioluminiscentes subiendo (violeta y rosa dominantes, cian y verde de acento), parpadeo individual. Títulos claro: `h2=#FF8050`, `h3=#E8FCFF`, título=`#E8FCFF`, subtítulo=`#FF9060` |
| `tarot` | Cinzel + Josefin Sans | claro | Lienzo art deco estático con 7 tipos de módulo, cartas flotantes lentas (intervalo 2000ms, duración 14-26s), arcanos en inglés. Opacidad 0.70 oscuro / 0.45 claro |

---

## 8. Galería

- Sidebar colapsable con 12 pills, cada una con el color y tipografía de su tema.
- Hover cambia todo el entorno; click lo fija.
- Carga local-first con timeout de 1.5s, luego fallback a GitHub Pages.
- Tema inicial: `disco`.
- Iconos: `disco=♫`, `metro=◼`, `sherry=⬡`, `elixir=◈`, `lambda=λ`, `ludus=▦`,
  `tarot=✦`, `bookworm=◫`, `apolo=☼`, `odysseus=➣`, `shui=〰`, `forge=⚙`.

---

## 9. Skills en Claude Code

Las skills funcionan ahí y de hecho es donde viven mejor.

Las skills personalizadas en Claude Code son basadas en el sistema de archivos y no
requieren subirlas por API: van en `~/.claude/skills/` (personales) o `.claude/skills/`
(del proyecto). Las skills de proyecto se cargan desde `.claude/skills/` en el
directorio donde arrancas Claude Code y en cada directorio padre hasta la raíz del repo,
así que arrancar en un subdirectorio sigue tomando las de la raíz.

Claude Code vigila los directorios de skills y toma los cambios dentro de la misma
sesión sin reiniciar, aunque la detección en vivo cubre solo el texto de `SKILL.md`.

Un detalle que conviene saber: las skills prefabricadas de documentos (pptx, xlsx, docx,
pdf) no están disponibles en Claude Code. Tus tres skills son personalizadas, así que
funcionan sin problema.

Para este proyecto conviene `site-launch-checklist`. Si la quieres versionada con el
repo, va en `.claude/skills/site-launch-checklist/`; si la quieres en todos tus
proyectos, en `~/.claude/skills/`.

Docs: https://code.claude.com/docs/en/skills

---

## 10. Primer paso sugerido en Claude Code

```
Lee CONTEXT_iroFactory.md. Vamos con la fase 1.1, empezando solo por disco
para que yo revise el patrón antes de replicarlo a los otros 12.
```