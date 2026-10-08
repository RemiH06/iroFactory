# iroFactory

Colección personal de 12 temas de diseño en HTML. Sirven como skins de documentación para proyectos propios. Se hostean en GitHub Pages, galería en `index.html`.

Roadmap activo y estado de fases: ver `steps.md`.

## Estructura (atomizada, 2026-10-06)

Cada tema no tiene código propio: solo su contenido, su piel (tokens y estilos de contenido) y la composición de componentes compartidos.

- `shared/core/`: `core.js` (tokens y color, `initTheme`, `makeLoop`, `glProgram`, `EASE`, etiquetas de la paleta, cabecera fija) y `core.css` (base común).
- `shared/components/<nombre>/`: un `.js` (exporta `mount(opts)`) y un `.css` por componente. Las diferencias entre temas van en `opts`, nunca en copias.
- `assets/fonts/` y `assets/img/<tema>/`: archivos, no base64.
- `<tema>/index.html` (contenido, marcado, imports con su configuración y los CSS de sus componentes) y `<tema>/<tema>.css` (tokens y piel).
- Para probar en local hace falta servidor (módulos ES e imágenes en WebGL no funcionan por `file://`): `python serve.py` en la raíz (como `http.server`, pero sin caché y con más cola de conexiones: con `http.server` el navegador guardaba módulos viejos y rechazaba peticiones en ráfaga) (puerto registrado en `48.SkillShot/PORTS.md`). En GitHub Pages no aplica.
- Migrados los 12. disco usa componentes con nombre propio en `shared/components/<nombre>/`; los otros 11 tienen sus piezas en `shared/components/<tema>/`: un `kit.js` con la base del tema (modo, tokens, sus utilidades tal como estaban) y un módulo por sección (`laser-flow.js`, `curve-plotter.js`…), cada uno con `mount()`. Los datos grandes van en `assets/data/<tema>/`. Los kits ya no copian utilidades: reexportan las del núcleo y solo guardan lo propio del tema; el modo de todos pasa por `initTheme` (sin `onclick` en el marcado). El CSS también está repartido: `<tema>.css` es la piel y cada módulo con estilos propios tiene su `shared/components/<tema>/<módulo>.css`. Cuidado al mover reglas con `url()` relativa: se resuelve respecto a la hoja que la usa.

## Reglas duras

No romper sin discutirlo primero.

1. **Fuentes desde Bunny Fonts**, no Google Fonts. Mismo string de import. Excepción aprobada (2026-10-05): fuentes de ffonts.net como archivo en `assets/fonts/` **sin modificar** (sin convertir ni recortar), solo si su licencia es abierta, freeware explícito o zona gris aceptada (Nick's Fonts, Cabaret Voltaire con crédito). Excepción puntual: Dolphian (apolo) trae las tablas PCLT y kern rotas y el navegador la rechaza; se usa sin esas dos tablas, letras intactas. Nunca las de uso personal/no comercial, demo, licencia de escritorio o sin licencia («todos los derechos reservados»). Lista y licencias en `THIRD_PARTY_NOTICES.md`.
2. **Ningún color llega a `#000` ni `#fff` puros.**
3. **Sin guiones largos en ningún texto.** Se reemplazan por punto medio (`·`).
4. **Tokens CSS declarados en `body` y en `body.dark` o `body.light`.** El toggle opera `document.body.classList` directamente.
5. Commits estilo conventional commits, lo más breves posible, sin saltos de línea innecesarios. Se les llama checkpoints.

## Decisiones técnicas ya tomadas

**Three.js, solo donde haya escena 3D de verdad** (decidido 2026-10-06, al dejar de ser un solo archivo). Una sola copia en `shared/vendor/three/` (r186 minificado + los addons que se usen, MIT), cargada con import map y `import()` dinámico para no frenar la primera pintura. La usan: apolo (estatua 3D y pétalos), odysseus (esfera celeste, tarjetas de papel y la hoja que se curva en vuelo) y shui (animales en rayos X, descenso, hielo y partículas). y metro (Guadalajara con WebGPURenderer y los generadores de mobiliario: `three.core/webgpu/tsl.min.js` aparte del `three.module.min.js` de WebGL, con su propio import map). Candidatos ludus y tarot. Para fondos y efectos de pantalla completa sigue valiendo WebGL crudo.

**anime.js v4.5.0** en `shared/vendor/anime/anime.esm.min.js` (un solo archivo: los módulos sueltos eran ~90 peticiones y saturaban el servidor local; no trae el adaptador de Three). Se carga con el import map (`"animejs"`). La usan: odysseus, metro y forge.

**Solo tres temas ganan algo con shaders**, en este orden de piloto: `shui` (agua/causticas, caso canónico de fragment shader) → `forge` (lava con turbulencia por noise) → `sherry` (bloom real sobre el neón). Los otros nueve temas son composiciones estáticas o sistemas de partículas donde canvas 2D ya es la herramienta correcta; reescribirlos sería trabajo sin ganancia.

**No aplicar el checklist anti-vibecode mecánicamente.** Varios temas cruzan señales literales (neón en sherry, franja lateral, gis de lambda) pero cada una se sostiene en una frase de justificación ligada al concepto del tema, no a una moda. Antes de tocar el diseño visual de un tema, verificar si el elemento en cuestión es la estética completa del concepto (se queda) o una decoración suelta encima de un diseño distinto (se quita).

## Referencia por tema

| Tema | Fuente | Default | Técnica de fondo |
|---|---|---|---|
| `apolo` | Cinzel + Newsreader + Fira Code · Dolphian (títulos) · GreeKish (vasijas en los separadores) | claro | Columnas jónicas SVG (entasis, estrías, volutas), rosetas, pétalos 3D (Three.js, una malla instanciada) derivando sobre gradiente de cielo; estatua de Apolo en 3D con Ripple como postproceso. |
| `bookworm` | Libre Baskerville + Fira Code | claro | 4 capas: triángulos isométricos, komorebi estático, lienzo SVG con máscara de agujeros, partículas (hojas claro / lluvia oscuro). |
| `disco` | Plus Jakarta Sans + Fira Code · Boogie Nights (tablero, títulos y métricas) | claro | Pista para apps y sistemas de diseño. Portada: el proun en Halftone Reveal a pantalla completa (la lupa revela el color) con tablero Split Flap Text en una placa. Bentos de vidrio con Spotlight Card, circuitos entre módulos y esferas (riff @dd_uiux), botón «+» que muestra cómo se usa cada componente. secciones separadas por hilos de Soft Aurora que siguen el hilo de Ariadne (ruta nueva en cada carga, se dibujan de punta a punta); Corcholatas que se enfocan (riff @singhshristi, canvas 2D) sobre Prismatic Burst; pie con la pirámide de Prism. Staggered Menu. Base: asanoha + luces de disco. |
| `elixir` | Iosevka | oscuro | Cuatro segmentos con Line Sidebar: hero Tech Text + Refine Frame; Liquid Chrome bajo la paleta; grafo del pipeline (los nodos se quedan con el color del pulso que los alcanzó) + espiral de radiografías; Light Pillar + Meta Balls + Antigravity bajo los componentes en Gooey Nav. |
| `forge` | Azeret Mono | oscuro (forja) · alterno taller | Dos oficios en penumbra. Portada con tubos nixie en Universe (cátodos apagados apilados como en un tubo real) (Split Flap Text); títulos en BPdots Vertical: FORGE y el hex del oficio (idea Nixie hex del vault). Forja: Laser Flow como chorro de metal, brasas y ceniza, contenedores al rojo, Molten Metal en el crisol. Taller: Lightning + núcleo Strands en esfera de vidrio, chispas de arco, Electric Border, tormenta en cintas (riff @nellucci). Navegación con tablero de breakers con palancas de resorte que se arrastran; la carga se dibuja por los cables hasta el título y sus letras se encienden una por una (riff @hardikgondhiya, anime.js). Osciloscopio con fósforo y perillas TIME/DIV y VOLTS/DIV con detentes, protoboard en ASCII con onda de fondo en §4 (riff @quanhoangindex), Noise, Target Cursor. |
| `lambda` | Cormorant Garamond + Fira Code | oscuro | Libro de texto en el pizarrón: capítulos § con Staggered Menu; portada con Stroke Text y hélice de vidrio (shader, riff de @brettmcm) sobre el proun de lambda; una curva de vidrio tenue por capítulo; Waves en §1 y §4; Raimei Hakke (Magnet Lines con los 64 hexagramas); formulario de apuntes CETI/ITESO por área con lente Fluid Glass y vista completa filtrable con gises; colofón con Logo Loop en bandas cruzadas por área y graficador de curvas r(t) (ADN por default). Base: rejilla hexagonal + objetos en gis. |
| `ludus` | Righteous + Fira Code | oscuro | Oscuro: carpa de circo, cortinas SVG, damero crimson/dorado, polvo dorado. Claro: feria pastel. |
| `metro` | Space Mono + DM Sans | oscuro | Grafo de nodos con aristas dinámicas; semántica solo rojo/amarillo/verde. Bajo las pestañas, Guadalajara en 3D (Three.js WebGPU, datos de OpenStreetMap): el cruce de L1, L2 y L3 del Tren Ligero con calles reales, edificios de OSM y generados, mobiliario de los generadores de Three, túneles en rayos X y L3 elevada; se expande para explorar con zoom. Al lado, tablero en anime.js con pestañas Salidas (se teclea, filtra con reacomodo, el filtro manda en los semáforos) y Mapa (vista desde arriba con los trenes como bolitas). |
| `odysseus` | IM Fell English + Fira Code · Debonair Inline (puertos y tarjetas) · Cabaret Voltaire (pase y mapa) | claro | Mapamundi real (Natural Earth) en una hoja sobre la mesa; siete puertos con calles de OpenStreetMap y relieve de Topography, vuelo entre ellos (avión sobre el tramo, la hoja se curva en Three.js), pase de abordar Tear Ticket con sello y códigos que se descifran (anime.js), carrusel de tarjetas de papel en Three.js. Noche: carta estelar con Galaxy y una esfera celeste 3D arrastrable con las constelaciones del canto V en sus coordenadas reales. |
| `sherry` | JetBrains Mono + Doto (títulos) | oscuro | Triángulos orgánicos que flashean en 7 colores neón. Toggle de CRT. |
| `shui` | Recursive (`CASL 1`) · Y2KBUG (título, subtítulos y botón) | claro | Ferrofluid como cáusticas de fondo; encima, el mar en Three.js: animales en rayos X (Animated Fish Pack de Quaternius, CC0, con su animación de nado): tres cardúmenes que huyen del cursor y delfín, tiburón, mantarraya y ballena que cruzan cada uno a su profundidad, descenso que oscurece el agua según scroll y corriente, cubos de hielo en el hero, partículas 3D de noche; día: Splash Cursor (fluidos); noche: Swarm Cursor + partículas bioluminiscentes que suben. Proun de fondo en el hero al 50%. Radiografías invertidas de día. Grafo radial + pestañas que cambian el módulo visible tras una consulta tipo cqlsh; contenedores de hielo (riff de Figma), Morph Slider con ripple suave, Blur Text. |
| `tarot` | Cinzel + Josefin Sans | claro | Lienzo art deco estático (7 tipos de módulo) + cartas flotantes lentas. |
