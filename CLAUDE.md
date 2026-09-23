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
| `elixir` | Iosevka | oscuro | Grafo neuronal; nodos cambian de color permanentemente al terminar el pulso. |
| `forge` | Azeret Mono | oscuro | Oscuro: lava por ambos costados + chispas/cenizas. Claro: arcos eléctricos + 3 osciloscopios apilados. |
| `lambda` | Cormorant Garamond + Fira Code | claro, auto-toggle a oscuro al cargar | Grid hexagonal CSS + objetos matemáticos estáticos con doble trazo (simula gis). |
| `ludus` | Righteous + Fira Code | oscuro | Oscuro: carpa de circo, cortinas SVG, damero crimson/dorado, polvo dorado. Claro: feria pastel, **no tocar**. |
| `metro` | Space Mono + DM Sans | oscuro | Grafo de nodos con aristas dinámicas; semántica solo rojo/amarillo/verde. |
| `odysseus` | IM Fell English + Fira Code | claro | Mesa de madera + mapa inclinado en ángulo aleatorio, agua animada clipeada, brújula que titubea buscando el norte. |
| `sherry` | JetBrains Mono | oscuro | Triángulos orgánicos que flashean en 7 colores neón. Toggle de CRT. |
| `shui` | Recursive (`CASL 1`) | claro | Claro: turquesa Caribe, un haz de luz, burbujas. Oscuro: casi negro, partículas bioluminiscentes. |
| `tarot` | Cinzel + Josefin Sans | claro | Lienzo art deco estático (7 tipos de módulo) + cartas flotantes lentas. |
