// Etiquetas de la paleta, bucle y WebGL: vienen del núcleo. Los lienzos
// de elixir son opacos (sin alfa), así que glProgram pide alpha:false.
import { inkSwatchLabels, makeLoop, glProgram as program } from '../../core/core.js';

export { inkSwatchLabels, makeLoop };
export const glProgram = (canvas, fs, opts = {}) => program(canvas, fs, { alpha: false, ...opts });
