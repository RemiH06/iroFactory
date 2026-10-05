# iroFactory

Colección personal de 12 temas de diseño en HTML, cada uno autocontenido en un solo archivo (todo el CSS y JS inline, sin build step, sin dependencias externas salvo fuentes por CDN). Sirven como skins de documentación para proyectos propios. Se hostean en GitHub Pages, galería en `index.html`.

Roadmap activo y estado de fases: ver `steps.md`.

## Reglas duras

No romper sin discutirlo primero.

1. **Autocontenido.** Todo el CSS y JS va inline en el `.html` de cada tema. Sin dependencias externas salvo fuentes por CDN. No negociable sin una razón fuerte.
2. **Fuentes desde Bunny Fonts**, no Google Fonts. Mismo string de import.
3. **Ningún color llega a `#000` ni `#fff` puros.**
4. **Sin guiones largos en ningún texto.** Se reemplazan por punto medio (`·`).
5. **Tokens CSS declarados en `body` y en `body.dark` o `body.light`.** El toggle opera `document.body.classList` directamente.
6. **El modo claro de `ludus` no se toca.** Está aprobado tal cual.
7. Commits estilo conventional commits, lo más breves posible, sin saltos de línea innecesarios. Se les llama checkpoints.

## Decisiones técnicas ya tomadas

**Three.js descartado.** Pesa ~600KB minificado; inlinearlo doce veces es absurdo y traerlo por CDN rompe la regla de autocontenido. El camino para animación avanzada es WebGL crudo: shaders como strings de GLSL, boilerplate de contexto ~40 líneas, todo cabe inline.

**Solo tres temas ganan algo con shaders**, en este orden de piloto: `shui` (agua/causticas, caso canónico de fragment shader) → `forge` (lava con turbulencia por noise) → `sherry` (bloom real sobre el neón). Los otros nueve temas son composiciones estáticas o sistemas de partículas donde canvas 2D ya es la herramienta correcta; reescribirlos sería trabajo sin ganancia.

**No aplicar el checklist anti-vibecode mecánicamente.** Varios temas cruzan señales literales (neón en sherry, franja lateral, gis de lambda) pero cada una se sostiene en una frase de justificación ligada al concepto del tema, no a una moda. Antes de tocar el diseño visual de un tema, verificar si el elemento en cuestión es la estética completa del concepto (se queda) o una decoración suelta encima de un diseño distinto (se quita).

## Referencia por tema

| Tema | Fuente | Default | Técnica de fondo |
|---|---|---|---|
| `apolo` | Cinzel + Fira Code | claro | Columnas jónicas SVG (entasis, estrías, volutas), rosetas, pétalos derivando sobre gradiente de cielo. |
| `bookworm` | Libre Baskerville + Fira Code | claro | 4 capas: triángulos isométricos, komorebi estático, lienzo SVG con máscara de agujeros, partículas (hojas claro / lluvia oscuro). |
| `disco` | Plus Jakarta Sans | claro | Patrón asanoha + luces disco flotantes en canvas con `mix-blend-mode` multiply/screen. |
| `elixir` | Iosevka | oscuro | Cuatro segmentos con Line Sidebar: hero Tech Text + Refine Frame; Liquid Chrome bajo la paleta; grafo del pipeline (los nodos se quedan con el color del pulso que los alcanzó) + espiral de radiografías; Light Pillar + Meta Balls + Antigravity bajo los componentes en Gooey Nav. |
| `forge` | Azeret Mono | oscuro | Oscuro: lava por ambos costados + chispas/cenizas. Claro: arcos eléctricos + 3 osciloscopios apilados. |
| `lambda` | Cormorant Garamond + Fira Code | oscuro | Libro de texto en el pizarrón: capítulos § con Staggered Menu; portada con Stroke Text y hélice de vidrio (shader, riff de @brettmcm) sobre wallpaper temporal; una curva de vidrio tenue por capítulo; Waves en §1 y §4; Raimei Hakke (Magnet Lines con los 64 hexagramas); formulario de apuntes CETI/ITESO por área con lente Fluid Glass y vista completa filtrable con gises; colofón con Logo Loop en bandas cruzadas por área y graficador de curvas r(t) (ADN por default). Base: rejilla hexagonal + objetos en gis. |
| `ludus` | Righteous + Fira Code | oscuro | Oscuro: carpa de circo, cortinas SVG, damero crimson/dorado, polvo dorado. Claro: feria pastel, **no tocar**. |
| `metro` | Space Mono + DM Sans | oscuro | Grafo de nodos con aristas dinámicas; semántica solo rojo/amarillo/verde. |
| `odysseus` | IM Fell English + Fira Code | claro | Mapamundi real (Natural Earth) en una hoja sobre la mesa; siete puertos con calles de OpenStreetMap y relieve de Topography, vuelo entre ellos, pase de abordar Tear Ticket por puerto, carrusel 3D de tarjetas. Noche: carta estelar con Galaxy y las constelaciones del canto V. |
| `sherry` | JetBrains Mono | oscuro | Triángulos orgánicos que flashean en 7 colores neón. Toggle de CRT. |
| `shui` | Recursive (`CASL 1`) | claro | Ferrofluid como cáusticas de fondo; día: Splash Cursor (fluidos); noche: Swarm Cursor + partículas bioluminiscentes que suben. Proun de fondo en el hero al 50%. Radiografías invertidas de día. Grafo radial + pestañas que cambian el módulo visible tras una consulta tipo cqlsh; contenedores de hielo (riff de Figma), Morph Slider con ripple suave, Blur Text. |
| `tarot` | Cinzel + Josefin Sans | claro | Lienzo art deco estático (7 tipos de módulo) + cartas flotantes lentas. |
