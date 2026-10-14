// Escribe los SVG de la marca desde shared/components/brand/brand.js.
// Uso, desde la raíz: node assets/logo/build.mjs
import { writeFileSync } from 'node:fs';
import { sensu, mazo, INK, PAPER } from '../../shared/components/brand/brand.js';

const out = (name, svg) => writeFileSync(new URL(name, import.meta.url), svg + '\n');
const auto = { ink: INK, paper: PAPER, dark: { ink: PAPER, paper: INK } };

out('favicon.svg', mazo({ ...auto, small: true }));
out('mazo.svg', mazo(auto));
out('sensu.svg', sensu());
out('sensu-dark.svg', sensu({ ink: PAPER, paper: INK }));
out('sensu-small.svg', sensu({ small: true }));
// en un color, para <svg viewBox="0 0 96 68"><use href="…/sensu-mono.svg#sensu"/></svg>: toma el color del texto
out('sensu-mono.svg', sensu({ ink: 'currentColor', mono: true, symbol: 'sensu' }));
