# Third-party notices

iroFactory's own code is MIT licensed (see `LICENSE`). Some themes include code, data or images from third parties. Those parts keep their own license and are **not** covered by iroFactory's MIT license. Each theme file also lists its third-party parts in a comment at the top and credits them in its footer.

## Code

| Source | Author | License | Used in |
|---|---|---|---|
| [React Bits](https://github.com/DavidHDev/react-bits) | David Haz ([@DavidHDev](https://github.com/DavidHDev)) | MIT + Commons Clause | apolo, bookworm, disco, elixir, forge, lambda, metro, odysseus, sherry, shui |
| [WebGL-Fluid-Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation) | Pavel Dobryakov ([@PavelDoGreat](https://github.com/PavelDoGreat)) | MIT | shui (Splash Cursor is built on it) |
| [Three.js](https://threejs.org) r186 · `shared/vendor/three/` (minified core + GLTFLoader, BufferGeometryUtils, SkeletonUtils, meshopt decoder) | three.js authors ([@mrdoob](https://github.com/mrdoob)) | MIT (`shared/vendor/three/LICENSE`) | apolo (3D statue) |
| [Motion](https://motion.dev) v11.18.2, mini build, inlined | Motion B.V. ([@motiondivision](https://github.com/motiondivision)) | MIT | apolo |

React Bits components ported per theme:

- **apolo** · Circular Gallery, LightRays, Ripple Distortion
- **bookworm** · Ghost Fibers, Glass Icons, Masked Heading, Paper Crumple, Side Rays
- **disco** · Halftone Reveal, Prism, Prismatic Burst, Soft Aurora, Split Flap Text, Spotlight Card, Staggered Menu
- **elixir** · Antigravity, Gooey Nav, Infinite Spiral, Light Pillar, Line Sidebar, Liquid Chrome, Meta Balls, Refine Frame, Tech Text
- **forge** · Electric Border, Laser Flow, Lightning, Molten Metal, Noise, Split Flap Text, Strands, Target Cursor
- **lambda** · Fluid Glass, Logo Loop, Magnet Lines, Staggered Menu, Stroke Text, Waves
- **metro** · Border Glow, Cursor Grid, Dock, Dome Gallery, Lattice Loader, Warp Text
- **odysseus** · Galaxy, Gradient Text, Line Waves, Tear Ticket, Topography
- **sherry** · ASCII Text, Dither, Dither Veil, Pixel Card
- **shui** · Blur Text, Ferrofluid, Morph Slider, Splash Cursor, Swarm Cursor

The React Bits license allows using the components as part of an application, website or product, but not selling, sublicensing or redistributing the components themselves, alone, in a bundle or as a ported version. The ports here are part of the iroFactory documentation sites and are not offered as a standalone component library.

## Data and images

| Source | License | Used in |
|---|---|---|
| [OpenStreetMap](https://www.openstreetmap.org/copyright) · © OpenStreetMap contributors | ODbL 1.0 | odysseus (streets, water and parks around each port) |
| [Natural Earth](https://www.naturalearthdata.com) | Public domain | odysseus (world map and coastlines) |
| [Simple Icons](https://simpleicons.org) v16.34.0 · tool logos | CC0 1.0 (the brands belong to their owners) | lambda (tool strip) |
| "Apollo Statue" · 3D scan by artfletch ([Sketchfab](https://sketchfab.com/3d-models/apollo-statue-a01dbaf0b7db4c308c9fcecade6d4283)) · reduced to 142k triangles, 2048 px texture, meshopt compression | CC BY 4.0 | apolo (`assets/models/apolo/apollo-statue.glb`) |
| Fish radiographs · Sandra Raredon, Smithsonian National Museum of Natural History, Division of Fishes | Credited to the author and institution | elixir, shui |

## Fonts from ffonts.net (unmodified; embedded in the older single-file themes, as files in `assets/fonts/` in the migrated ones)

| Font | Author | License | Used in |
|---|---|---|---|
| BPdots Vertical Bold | George Triantafyllakos (Backpacker) | Freeware | forge (section titles) |
| Universe | Vincent Labonne | Free Font (as stated in the font file) | forge (nixie cathodes) |
| Y2KBUG | Ray Larabie (Larabie Fonts) | Freeware | shui (title, section headings, scroll button) |
| Dolphian | Unknown («Please Steal This Font», as stated in the font file) | Free to use and modify | apolo (titles) · two broken tables removed (PCLT, kern) so browsers accept it; glyphs untouched |
| GreeKish | Manfred Klein | Freeware (Manfred Klein's usual terms; no license text in the file) | apolo (only its Greek vase dingbats, as section dividers) |
| Boogie Nights NF | Nick Curtis (Nick's Fonts) | Nick's Fonts license: free for personal and paid projects, no modification | disco (split flap board, headings, metrics) |
| Debonair Inline NF | Nick Curtis (Nick's Fonts) | Nick's Fonts license: free for personal and paid projects, no modification | odysseus (port titles, cards) |
| Cabaret Voltaire | Haimeluna ([morbofly.com](http://www.morbofly.com)) | Free with mandatory credit: "Cabaret Voltaire" Designed by Haimeluna | odysseus (boarding pass codes, map labels) |

## Design references (no code copied)

- Figma riff "Ice cubes" by [@helorebyron](https://www.figma.com/@helorebyron) · shui ice containers
- Figma riffs by [@hardikgondhiya](https://www.figma.com/@hardikgondhiya) (charge along cables), [@nellucci](https://www.figma.com/@nellucci) (storm ribbons) and [@quanhoangindex](https://www.figma.com/@quanhoangindex) (ASCII with a wave) · forge
- Figma riff (glass helix) by [@brettmcm](https://www.figma.com/@brettmcm) · lambda hero helix, written from scratch as a shader
- Figma riffs by [@singhshristi](https://www.figma.com/@singhshristi) (bottle caps pulling focus) and [@dd_uiux](https://www.figma.com/@dd_uiux) (glass bento design system) · disco gallery and component bentos
- Figma riff "Iconic Cities" by [@ariantaheri](https://www.figma.com/@ariantaheri) · odysseus port carousel
- motion.dev examples "js-tilt-card" and "Shader Lens" · apolo, rebuilt from the concept

## License texts

### React Bits

```
MIT + Commons Clause License Condition v1.0

Copyright (c) 2026 David Haz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, and distribute the Software as part of
an application, website, or product, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

Commons Clause Restriction: You may use this Software, including for any
commercial purpose, so long as you do not sell, sublicense, or redistribute
the components themselves-whether alone, in a bundle, or as a ported version.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### WebGL-Fluid-Simulation

```
MIT License

Copyright (c) 2017 Pavel Dobryakov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Motion

```
The MIT License (MIT)

Copyright (c) 2024 Motion B.V.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
