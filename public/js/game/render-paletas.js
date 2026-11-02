// Paletas y utilidades de color del mundo: los colores y la luz de cada ambiente (pretemporada a mediodía,
// Final de Copa por la tarde, Final de Liga al atardecer, Champions de noche y la gala del Mundial), una letra
// de píxeles para los carteles y un pequeño «lienzo de píxeles» para pintar dibujos sin miles de fillRect.
// No depende del DOM salvo `aLienzo`, que solo se llama al crear un dibujo.
import { AMBIENTES, SELECCIONES, PERSONAJES } from './config.js';

export const PX = 2; // un píxel del suelo y de los dibujos del mundo mide 2 unidades (como los muñecos, más o menos)
export const CONTORNO = '#14102a';

// ---------------------------------------------------------------------------------------------
// Colores
// ---------------------------------------------------------------------------------------------

const memo = new Map();
/** '#rrggbb' → [r, g, b] (memorizado: se llama muchísimo). */
export function rgb(h) {
  let c = memo.get(h);
  if (!c) {
    c = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    memo.set(h, c);
  }
  return c;
}
/** Mezcla dos colores [r, g, b] (k = 0 → a, k = 1 → b). */
export const mezcla = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
/** Multiplica un color por k (k < 1 oscurece, k > 1 aclara). */
export const por = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
/** [r, g, b] → '#rrggbb'. */
export const aHex = (c) => `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;

/** Número estable 0..1 para dos enteros (para el grano de las texturas y los adornos). */
export function hash(x, y) {
  let h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Matriz de Bayer 4×4 (0..1): el tramado ordenado de toda la vida para pasar de un tono a otro. */
export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

// ---------------------------------------------------------------------------------------------
// Paletas de cada ambiente
// ---------------------------------------------------------------------------------------------
//  cesped: cinco verdes de oscuro a claro.        franjas: las dos del corte del césped de los campos.
//  sol: hacia dónde y cuánto se alargan las sombras por unidad de altura (siempre abajo a la derecha).
//  sombra: color por el que se multiplica lo que queda a la sombra.   gradoLuz: tinte de toda la escena.
//  noche: cuánto oscurece la capa de noche (0 = de día).

export const PALETAS = {
  inicio: {
    cesped: ['#2c7330', '#378637', '#43993f', '#52ab48', '#69bf57'], franjas: ['#4aa846', '#3d973d'],
    flores: ['#ffffff', '#fff3a0', '#f7c6e0', '#c9b8ff'], hojas: ['#6a9a3a', '#8bb04a'],
    aficion: ['#c8102e', '#ffffff', '#c8102e', '#1b2a5c'], vacios: 0.4, banderas: ['#c8102e', '#ffffff'],
    carteles: [['#c8102e', '#ffffff'], ['#1b2a5c', '#ffffff'], ['#ffffff', '#c8102e']],
    textos: ['LA GRADA', 'AUPA ATLETI', 'PRETEMPORADA', 'ROJIBLANCOS'],
    sol: [0.42, 0.18], sombra: [0.56, 0.62, 0.76], gradoLuz: [1, 1, 1], arbol: ['#1f5a2a', '#2d7232', '#3d8a3a', '#56a347', '#7cc05c'],
    noche: 0, tinte: null, confeti: null,
  },
  copa: {
    cesped: ['#33702a', '#438431', '#549739', '#66aa41', '#84bf52'], franjas: ['#62a83f', '#4f9437'],
    flores: ['#ffc400', '#e8202f', '#ffffff', '#ffe27a'], hojas: ['#8a9a3a', '#b0a040'],
    aficion: ['#c8102e', '#ffffff', '#c8102e', '#ffc400', '#c60b1e'], vacios: 0.06, banderas: ['#c60b1e', '#ffc400'],
    carteles: [['#c60b1e', '#ffc400'], ['#ffc400', '#8a0816'], ['#1b2a5c', '#ffc400']],
    textos: ['FINAL DE COPA', 'AUPA ATLETI', 'A POR LA COPA', 'LA GRADA'],
    sol: [0.7, 0.22], sombra: [0.58, 0.56, 0.7], gradoLuz: [1.04, 1.0, 0.91], arbol: ['#2a5a24', '#3a7230', '#4d8a36', '#69a443', '#93c05a'],
    noche: 0, tinte: 'tarde', confeti: ['#c60b1e', '#ffc400'],
  },
  liga: {
    cesped: ['#2c6332', '#387436', '#46853a', '#55953e', '#73a54a'], franjas: ['#529240', '#428038'],
    flores: ['#ff8a3c', '#ffffff', '#ffd1e0', '#ffb347'], hojas: ['#c0702a', '#d89a3a'],
    aficion: ['#c8102e', '#ffffff', '#c8102e', '#ffffff', '#1b2a5c'], vacios: 0.03, banderas: ['#c8102e', '#ffffff', '#ff7a2f'],
    carteles: [['#1e1e3c', '#ff8a3c'], ['#c8102e', '#ffffff'], ['#ffffff', '#c8102e']],
    textos: ['FINAL DE LIGA', 'ULTIMA JORNADA', 'CAMPEONES', 'AUPA ATLETI'],
    sol: [1.0, 0.26], sombra: [0.52, 0.44, 0.66], gradoLuz: [1.07, 0.96, 0.9], arbol: ['#26502c', '#335f2e', '#456f33', '#68853a', '#a49a48'],
    noche: 0, tinte: 'atardecer', confeti: null,
  },
  champions: {
    cesped: ['#154a37', '#1b5a40', '#226a49', '#2b7a52', '#3a8e60'], franjas: ['#2a7a54', '#1f6847'],
    flores: ['#cfe0ff', '#ffffff', '#9ab8ff', '#e6ecff'], hojas: ['#2a5a50', '#3a6a60'],
    aficion: ['#c8102e', '#ffffff', '#c8102e', '#ffffff'], vacios: 0, banderas: ['#0b1f5c', '#ffffff'],
    carteles: [['#0b1f5c', '#ffffff'], ['#13307f', '#9ab8ff'], ['#050f33', '#c8d8ff']],
    textos: ['NOCHE EUROPEA', 'FINAL EUROPEA', 'AUPA ATLETI', 'LA GRADA'],
    sol: [0.28, 0.22], sombra: [0.62, 0.66, 0.82], gradoLuz: [0.9, 0.97, 1.04], arbol: ['#0f3a2c', '#164a36', '#1e5c40', '#2c7050', '#4a8a6a'],
    noche: 0.62, tinte: null, confeti: null, tifo: true,
  },
  mundial: {
    cesped: ['#1d6438', '#257540', '#2f8649', '#3a9852', '#4fae62'], franjas: ['#3a9a54', '#2c8646'],
    flores: ['#ffd166', '#ffffff', '#ffe9a8', '#ff9ec0'], hojas: ['#4a8a4a', '#6a9a50'],
    aficion: null, vacios: 0, banderas: ['#ffd166', '#0d8a6a', '#ffffff'],
    carteles: [['#0d6b5a', '#ffd166'], ['#5a1a6b', '#ffd166'], ['#ffd166', '#5a1a6b']],
    textos: ['FINAL DEL MUNDIAL', 'CAMPEONES', 'LA GRADA', 'AUPA ATLETI'],
    sol: [0.3, 0.2], sombra: [0.62, 0.56, 0.74], gradoLuz: [1.0, 0.95, 1.06], arbol: ['#164a2e', '#1f5c36', '#2a6e40', '#3a8450', '#58a066'],
    noche: 0.55, tinte: null, confeti: ['#ffd166', '#ffffff', '#ffe08a'],
  },
};

/** Ambiente que se ve: el de la partida (o el del menú). */
export const ambienteVisible = (mundo) => AMBIENTES[mundo.ambiente ?? 0] ?? AMBIENTES[0];

/** Colores de la afición: en el Mundial, los de la selección de tu jugador. */
export function aficionDe(amb, mundo) {
  const p = PALETAS[amb.clave];
  if (p.aficion) return p.aficion;
  const pais = PERSONAJES[mundo?.jugador?.personaje]?.nacionalidad;
  const sel = SELECCIONES[pais];
  return sel ? [...sel.colores, sel.colores[0], '#ffd166'] : ['#ffd166', '#ffffff'];
}

// ---------------------------------------------------------------------------------------------
// Letra de píxeles (3×5) para carteles, pancartas y marcadores: solo textos inventados o rojiblancos
// ---------------------------------------------------------------------------------------------

// Cada letra son 5 filas de 3 píxeles (# encendido)
const LETRAS = {
  A: '.#. #.# ### #.# #.#', B: '##. #.# ##. #.# ##.', C: '.## #.. #.. #.. .##', D: '##. #.# #.# #.# ##.',
  E: '### #.. ##. #.. ###', F: '### #.. ##. #.. #..', G: '.## #.. #.# #.# .##', H: '#.# #.# ### #.# #.#',
  I: '### .#. .#. .#. ###', J: '..# ..# ..# #.# .#.', K: '#.# #.# ##. #.# #.#', L: '#.. #.. #.. #.. ###',
  M: '#.# ### ### #.# #.#', N: '##. #.# #.# #.# #.#', O: '.#. #.# #.# #.# .#.', P: '##. #.# ##. #.. #..',
  Q: '.#. #.# #.# ##. .##', R: '##. #.# ##. #.# #.#', S: '.## #.. .#. ..# ##.', T: '### .#. .#. .#. .#.',
  U: '#.# #.# #.# #.# ###', V: '#.# #.# #.# #.# .#.', W: '#.# #.# ### ### #.#', X: '#.# #.# .#. #.# #.#',
  Y: '#.# #.# .#. .#. .#.', Z: '### ..# .#. #.. ###', '0': '### #.# #.# #.# ###', '1': '.#. ##. .#. .#. ###',
  '2': '##. ..# .#. #.. ###', '3': '##. ..# .#. ..# ##.', '4': '#.# #.# ### ..# ..#', '5': '### #.. ##. ..# ##.',
  '6': '.## #.. ### #.# ###', '7': '### ..# .#. .#. .#.', '8': '### #.# ### #.# ###', '9': '### #.# ### ..# ##.',
  '!': '.#. .#. .#. ... .#.', '-': '... ... ### ... ...', '·': '... ... .#. ... ...', ' ': '... ... ... ... ...',
};
for (const k of Object.keys(LETRAS)) LETRAS[k] = LETRAS[k].replaceAll(' ', '');

/** Ancho en píxeles de un texto escrito con la letra de 3×5 (con un píxel entre letras). */
export const anchoTexto = (texto) => Math.max(0, texto.length * 4 - 1);

/** Llama a `punto(x, y)` por cada píxel encendido del texto, empezando en (x, y). */
export function escribir(texto, x, y, punto) {
  let cx = x;
  for (const ch of texto.toUpperCase()) {
    const g = LETRAS[ch] ?? LETRAS[' '];
    for (let i = 0; i < 15; i += 1) if (g[i] === '#') punto(cx + (i % 3), y + Math.floor(i / 3));
    cx += 4;
  }
}

// ---------------------------------------------------------------------------------------------
// Lienzo de píxeles: se pinta en un búfer y se pasa al canvas de una vez (mucho más rápido que fillRect)
// ---------------------------------------------------------------------------------------------

export class Pixeles {
  constructor(w, h) {
    this.w = Math.max(1, Math.round(w));
    this.h = Math.max(1, Math.round(h));
    this.d = new Uint8ClampedArray(this.w * this.h * 4);
  }

  /** Pinta un píxel (color [r, g, b] o '#rrggbb'); con `a` < 1 se mezcla con lo que ya hay. */
  p(x, y, c, a = 1) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const col = typeof c === 'string' ? rgb(c) : c;
    const o = (y * this.w + x) * 4;
    const d = this.d;
    if (a >= 1 || d[o + 3] === 0) {
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = a >= 1 ? 255 : Math.round(a * 255);
    } else {
      d[o] += (col[0] - d[o]) * a; d[o + 1] += (col[1] - d[o + 1]) * a; d[o + 2] += (col[2] - d[o + 2]) * a;
      d[o + 3] = Math.max(d[o + 3], Math.round(a * 255));
    }
  }

  r(x, y, w, h, c, a = 1) {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.w, Math.floor(x + w));
    const y1 = Math.min(this.h, Math.floor(y + h));
    for (let yy = y0; yy < y1; yy += 1) for (let xx = x0; xx < x1; xx += 1) this.p(xx, yy, c, a);
  }

  /** ¿Hay algo pintado en (x, y)? */
  lleno(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    return this.d[(y * this.w + x) * 4 + 3] > 0;
  }

  /** Oscurece (k < 1) o aclara lo que ya hay en un rectángulo. */
  tono(x, y, w, h, k) {
    for (let yy = Math.max(0, y); yy < Math.min(this.h, y + h); yy += 1) {
      for (let xx = Math.max(0, x); xx < Math.min(this.w, x + w); xx += 1) {
        const o = (yy * this.w + xx) * 4;
        if (!this.d[o + 3]) continue;
        this.d[o] *= k; this.d[o + 1] *= k; this.d[o + 2] *= k;
      }
    }
  }

  /** Contorno de un píxel alrededor de todo lo pintado (en los huecos que tocan algo pintado). */
  contorno(c) {
    const marcar = [];
    for (let y = 0; y < this.h; y += 1) {
      for (let x = 0; x < this.w; x += 1) {
        if (this.lleno(x, y)) continue;
        if (this.lleno(x - 1, y) || this.lleno(x + 1, y) || this.lleno(x, y - 1) || this.lleno(x, y + 1)) marcar.push(x, y);
      }
    }
    for (let i = 0; i < marcar.length; i += 2) this.p(marcar[i], marcar[i + 1], c);
  }

  /** Escribe un texto con la letra de 3×5. */
  texto(t, x, y, c, a = 1) { escribir(t, x, y, (px, py) => this.p(px, py, c, a)); }

  /** Pasa el búfer a un canvas (solo en el navegador o con un `document` falso en las pruebas). */
  aLienzo() {
    const c = document.createElement('canvas');
    c.width = this.w;
    c.height = this.h;
    const cx = c.getContext('2d');
    const img = cx.createImageData(this.w, this.h);
    img.data.set(this.d);
    cx.putImageData(img, 0, 0);
    return c;
  }
}
