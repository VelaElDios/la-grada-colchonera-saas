// Muñecos «chibi» de píxeles (cabezón, camiseta y botas) dibujados con código: no hay imágenes.
// Cada muñeco se pinta una sola vez, píxel a píxel, en una cuadrícula de 32×40 y por capas (piernas, pantalón,
// torso, brazos y cabeza). Cada capa lleva su propio contorno, del color oscuro de lo que rodea, y luz que viene
// de arriba a la izquierda. Se guardan en caché los 4 fotogramas de caminar y se reutilizan a cualquier tamaño.
// La parte que pinta (pixelesMuneco) no toca el DOM; el resto solo lo toca al llamar a una función.
import {
  EQUIPOS, PIELES, PELOS, PERSONAJES, ENTRENADORES, JEFES, SELECCIONES,
} from './config.js';

export const ANCHO = 32;
export const ALTO = 32; // chibi: cabeza grande, cuerpo y zapatos (sin piernas)
/** Fotogramas de caminar: 0 parado, 1 pie izquierdo arriba, 2 parado, 3 pie derecho arriba. */
export const FOTOGRAMAS = 4;
const MAX_CACHE = 600; // muñecos guardados como mucho (los más antiguos se tiran y se repintan si vuelven)
const cache = new Map();

// ---------------------------------------------------------------------------------------------
// Colores: [r, g, b, a] con a entre 0 y 1
// ---------------------------------------------------------------------------------------------

const colores = new Map();
/** Convierte '#rgb', '#rrggbb', 'rgb()' o 'rgba()' en [r, g, b, a]. */
function rgba(color) {
  if (Array.isArray(color)) return color;
  let c = colores.get(color);
  if (c) return c;
  const s = String(color ?? '').trim();
  let m = /^#([0-9a-f]{3})$/i.exec(s);
  if (m) c = [...m[1]].map((h) => parseInt(h + h, 16)).concat(1);
  else if ((m = /^#([0-9a-f]{6})$/i.exec(s))) {
    const n = parseInt(m[1], 16);
    c = [n >> 16, (n >> 8) & 255, n & 255, 1];
  } else if ((m = /^rgba?\(([^)]+)\)$/i.exec(s))) {
    const p = m[1].split(',').map((v) => parseFloat(v));
    c = [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  } else c = [255, 0, 255, 1]; // magenta: un color que no se entiende se nota enseguida
  colores.set(color, c);
  return c;
}
const mezcla = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] ?? 1];
const opaco = (c) => [c[0], c[1], c[2], 1];
const conAlfa = (c, a) => [c[0], c[1], c[2], a];
// Las sombras tiran un poco a violeta y las luces a amarillo: queda más vivo que oscurecer o aclarar a secas.
const FRIO = [46, 26, 82, 1];
const CALIDO = [255, 240, 205, 1];
/** Oscurece (k < 1). */
const sombra = (c, k = 0.8) => mezcla([c[0] * k, c[1] * k, c[2] * k, c[3]], FRIO, (1 - k) * 0.35);
/** Aclara (t entre 0 y 1). */
const brillo = (c, t = 0.2) => mezcla(c, CALIDO, t);
/** Color del contorno de una zona: el suyo, muy oscuro. */
const contornoDe = (c) => opaco(mezcla([c[0] * 0.36, c[1] * 0.36, c[2] * 0.36, 1], [24, 12, 32, 1], 0.5));
const luminancia = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];

/** Aclara (k > 1) u oscurece (k < 1) un color '#rrggbb'; los demás formatos se devuelven tal cual. */
export function tono(color, k) {
  const m = /^#([0-9a-f]{6})$/i.exec(color ?? '');
  if (!m) return color;
  const n = parseInt(m[1], 16);
  const canal = (v) => Math.max(0, Math.min(255, Math.round(k > 1 ? v + (255 - v) * (k - 1) : v * k)));
  return `#${[n >> 16, (n >> 8) & 255, n & 255].map((v) => canal(v).toString(16).padStart(2, '0')).join('')}`;
}

// ---------------------------------------------------------------------------------------------
// Capas de píxeles (sin DOM)
// ---------------------------------------------------------------------------------------------

const dentro = (x, y) => x >= 0 && y >= 0 && x < ANCHO && y < ALTO;

class Capa {
  constructor() { this.d = new Uint8ClampedArray(ANCHO * ALTO * 4); }

  alfa(x, y) { return dentro(x, y) ? this.d[(y * ANCHO + x) * 4 + 3] / 255 : 0; }

  hay(x, y) { return this.alfa(x, y) > 0.5; }

  leer(x, y) {
    const i = (y * ANCHO + x) * 4;
    return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3] / 255];
  }

  /** Pinta un píxel mezclándolo con lo que ya hay (como «source-over»). */
  px(x, y, color) {
    if (!color || !dentro(x, y)) return;
    const c = rgba(color);
    const a = c[3];
    if (a <= 0) return;
    const d = this.d;
    const i = (y * ANCHO + x) * 4;
    const da = d[i + 3] / 255;
    const oa = a + da * (1 - a);
    for (let k = 0; k < 3; k += 1) d[i + k] = (c[k] * a + d[i + k] * da * (1 - a)) / oa;
    d[i + 3] = oa * 255;
  }

  /** Cambia el color de un píxel ya pintado (conserva su opacidad). */
  retocar(x, y, fn) {
    if (!dentro(x, y) || this.alfa(x, y) <= 0) return;
    const i = (y * ANCHO + x) * 4;
    const n = fn(this.leer(x, y));
    this.d[i] = n[0];
    this.d[i + 1] = n[1];
    this.d[i + 2] = n[2];
  }

  borrar(x, y) { if (dentro(x, y)) this.d[(y * ANCHO + x) * 4 + 3] = 0; }

  rect(x, y, w, h, color) {
    for (let j = y; j < y + h; j += 1) for (let i = x; i < x + w; i += 1) this.px(i, j, color);
  }

  /** Pinta tramos { fila: [[x0, x1], ...] } bajando `dy` filas. */
  tramos(filas, dy, color) {
    if (!filas) return;
    for (const [r, lista] of Object.entries(filas)) {
      for (const [x0, x1] of lista) for (let x = x0; x <= x1; x += 1) this.px(x, Number(r) + dy, color);
    }
  }

  /** Recorre los píxeles pintados. */
  cada(fn) {
    for (let y = 0; y < ALTO; y += 1) for (let x = 0; x < ANCHO; x += 1) if (this.alfa(x, y) > 0) fn(x, y);
  }

  /** Pega esta capa encima de `otra`. */
  sobre(otra) { this.cada((x, y) => otra.px(x, y, this.leer(x, y))); }
}

// Primero se mira abajo y arriba: así la barbilla y lo alto del pelo toman el color de lo que tocan.
const VECINOS = [[0, 1], [0, -1], [1, 0], [-1, 0]];

/** Contorno de 1 píxel alrededor de lo pintado, del color oscuro de lo que toca. */
function contornear(capa) {
  const marcas = [];
  for (let y = 0; y < ALTO; y += 1) {
    for (let x = 0; x < ANCHO; x += 1) {
      if (capa.alfa(x, y) > 0.5) continue;
      const v = VECINOS.find(([dx, dy]) => capa.alfa(x + dx, y + dy) > 0.5);
      if (v) marcas.push([x, y, contornoDe(capa.leer(x + v[0], y + v[1]))]);
    }
  }
  marcas.forEach(([x, y, c]) => capa.px(x, y, c));
}

/**
 * Volumen automático: los bordes de la derecha y de abajo se oscurecen y los de la izquierda y de arriba se aclaran.
 * `si(x, y)` decide qué píxeles se tocan.
 */
function biselar(capa, { claro = 0.16, oscuro = 0.78, bajo = 0.86, si = () => true } = {}) {
  const cambios = [];
  capa.cada((x, y) => {
    if (!si(x, y)) return;
    const libre = (dx, dy) => !capa.hay(x + dx, y + dy);
    let k = 1;
    if (libre(1, 0)) k *= oscuro;
    else if (libre(2, 0)) k *= (1 + oscuro) / 2;
    if (libre(0, 1)) k *= bajo;
    let l = 0;
    if (libre(-1, 0)) l += claro;
    if (libre(0, -1)) l += claro * 0.6;
    if (k !== 1 || l) cambios.push([x, y, k, l]);
  });
  cambios.forEach(([x, y, k, l]) => capa.retocar(x, y, (c) => brillo(sombra(c, k), l)));
}

// ---------------------------------------------------------------------------------------------
// Medidas del cuerpo: complexión (normal, ancha o delgada) y estatura (normal, alta o baja)
// ---------------------------------------------------------------------------------------------

const SUELO = ALTO - 1; // última fila de las botas: todos pisan en el mismo sitio

function medidas(a) {
  const comp = a.complexion ?? 'normal';
  const est = a.estatura ?? 'normal';
  const torsoAncho = comp === 'ancha' ? 16 : comp === 'delgada' ? 12 : 14;
  const pierna = comp === 'ancha' ? 5 : comp === 'delgada' ? 3 : 4;
  // Chibi: sin piernas. Debajo de la camiseta, el pantalón (2 filas) y los zapatos (2 filas).
  let torsoAlto = est === 'alta' ? 8 : est === 'baja' ? 6 : 7;
  const botas = SUELO - 2; // los zapatos ocupan 3 filas
  const pantalonY = botas - 2;
  // Un peinado alto (tupé, moño, cresta...) necesita sitio arriba: se le quita algo de cuerpo
  const pelo = Math.min(0, ...Object.keys(peinado(a.pelo?.e).filas).map(Number));
  while (torsoAlto > 5 && pantalonY - torsoAlto - 19 + pelo < 0) torsoAlto -= 1;
  const torsoY = pantalonY - torsoAlto;
  return {
    torsoAncho, torsoAlto, pierna, medias: 0, botas, mediasY: botas, rodilla: pantalonY + 1, pantalonY, torsoY,
    tx0: 16 - torsoAncho / 2,
    tx1: 15 + torsoAncho / 2,
    cabeza: torsoY - 19,
  };
}

/** Ropa de calle (entrenadores): pantalón largo y zapatos en vez de pantalón corto, medias y botas. */
const deCalle = (a) => a.camiseta.p === 'traje';

// ---------------------------------------------------------------------------------------------
// Cabeza: cráneo, cara, barba, pelo y complementos
// ---------------------------------------------------------------------------------------------

// Ancho del cráneo por fila (desde lo alto), [x0, x1]. Las 4 últimas filas son la mandíbula, que cambia con la cara.
const CRANEO = [[9, 22], [7, 24], [6, 25], [6, 25], [6, 25], [6, 25], [6, 25], [6, 25], [6, 25], [6, 25], [6, 25], [6, 25], [6, 25], [6, 25]];
const MANDIBULAS = {
  normal: [[7, 24], [8, 23], [9, 22], [11, 20]],
  redonda: [[6, 25], [7, 24], [8, 23], [10, 21]],
  cuadrada: [[6, 25], [6, 25], [7, 24], [9, 22]],
  fina: [[7, 24], [9, 22], [10, 21], [12, 19]],
};
const filaCara = (r, forma) => (r < CRANEO.length ? CRANEO[r] : (MANDIBULAS[forma] ?? MANDIBULAS.normal)[r - CRANEO.length]);
const ALTO_CABEZA = CRANEO.length + 4;

/**
 * Peinados. Filas relativas a lo alto del cráneo (las negativas, por encima) con tramos [x0, x1].
 * `lados`: pelo rapado a los lados (se pinta medio transparente). `tapa`: tapa las orejas.
 * `raya`: píxeles de la raya del peinado. `textura`: cómo se dibujan los mechones.
 */
const peinados = new Map();
function peinado(e) {
  if (peinados.has(e)) return peinados.get(e);
  let p;
  switch (e) {
    case 'raya': // corto con la raya a un lado y el pelo echado hacia el otro
      p = {
        filas: { '-1': [[8, 23]], 0: [[6, 25]], 1: [[5, 26]], 2: [[5, 26]], 3: [[5, 26]], 4: [[5, 26]], 5: [[5, 8], [12, 26]], 6: [[5, 7], [17, 26]], 7: [[5, 6], [23, 26]], 8: [[5, 6], [25, 26]] },
        raya: { '-1': [[11, 11]], 0: [[11, 11]], 1: [[11, 11]], 2: [[11, 11]] },
        textura: 'peinado',
      };
      break;
    case 'tupe': // tupé alto que se levanta por delante y lados cortos
      p = {
        filas: { '-3': [[14, 21]], '-2': [[11, 22]], '-1': [[9, 23]], 0: [[8, 24]], 1: [[7, 24]], 2: [[7, 24]], 3: [[8, 13], [16, 23]], 4: [[9, 11], [18, 22]] },
        lados: { 1: [[6, 6], [25, 25]], 2: [[6, 6], [25, 25]], 3: [[6, 7], [24, 25]], 4: [[6, 7], [24, 25]], 5: [[6, 6], [25, 25]], 6: [[6, 6], [25, 25]], 7: [[6, 6], [25, 25]] },
        textura: 'tupe',
      };
      break;
    case 'gomina': // peinado hacia atrás, liso y con brillo
      p = {
        filas: { '-1': [[10, 21]], 0: [[7, 24]], 1: [[6, 25]], 2: [[6, 25]], 3: [[6, 25]], 4: [[6, 9], [14, 17], [22, 25]], 5: [[6, 7], [24, 25]], 6: [[6, 6], [25, 25]], 7: [[6, 6], [25, 25]] },
        textura: 'brillo',
      };
      break;
    case 'atras': // echado hacia atrás con volumen
      p = {
        filas: { '-2': [[11, 20]], '-1': [[8, 23]], 0: [[6, 25]], 1: [[5, 26]], 2: [[5, 26]], 3: [[5, 26]], 4: [[5, 10], [14, 17], [21, 26]], 5: [[5, 7], [24, 26]], 6: [[5, 6], [25, 26]], 7: [[5, 6], [25, 26]] },
        textura: 'peinado',
      };
      break;
    case 'rapado': // al cero: se ve la forma de la cabeza
      p = {
        filas: { 0: [[9, 22]], 1: [[7, 24]], 2: [[6, 25]], 3: [[6, 25]], 4: [[6, 8], [11, 20], [23, 25]], 5: [[6, 7], [24, 25]], 6: [[6, 6], [25, 25]], 7: [[6, 6], [25, 25]] },
        alfa: 0.82,
        textura: 'punteado',
      };
      break;
    case 'calvo': // sin pelo arriba (solo una sombra en las sienes)
      p = { filas: {}, lados: { 5: [[6, 6], [25, 25]], 6: [[6, 6], [25, 25]], 7: [[6, 6], [25, 25]], 8: [[6, 6], [25, 25]] }, alfaLados: 0.3, calvo: true };
      break;
    case 'rizado': // rizos cortos
      p = {
        filas: { '-2': [[9, 10], [13, 14], [17, 18], [21, 22]], '-1': [[7, 24]], 0: [[6, 25]], 1: [[5, 26]], 2: [[5, 26]], 3: [[5, 26]], 4: [[5, 26]], 5: [[5, 7], [9, 10], [13, 14], [17, 18], [21, 22], [24, 26]], 6: [[5, 6], [25, 26]], 7: [[5, 6], [25, 26]] },
        textura: 'rizos',
      };
      break;
    case 'afro': // mucho volumen de rizos
      p = {
        filas: { '-3': [[10, 21]], '-2': [[7, 24]], '-1': [[5, 26]], 0: [[4, 27]], 1: [[4, 27]], 2: [[4, 27]], 3: [[4, 27]], 4: [[4, 27]], 5: [[4, 9], [12, 13], [18, 19], [22, 27]], 6: [[4, 7], [24, 27]], 7: [[4, 6], [25, 27]], 8: [[5, 6], [25, 26]] },
        textura: 'rizos',
      };
      break;
    case 'melena': // hasta los hombros, con raya en medio
      p = {
        filas: {
          '-1': [[9, 22]], 0: [[7, 24]], 1: [[5, 26]], 2: [[4, 27]], 3: [[4, 27]], 4: [[4, 14], [17, 27]], 5: [[4, 10], [21, 27]], 6: [[4, 8], [23, 27]],
          7: [[4, 7], [24, 27]], 8: [[4, 7], [24, 27]], 9: [[4, 7], [24, 27]], 10: [[4, 7], [24, 27]], 11: [[4, 7], [24, 27]], 12: [[4, 7], [24, 27]],
          13: [[3, 7], [24, 28]], 14: [[3, 7], [24, 28]], 15: [[3, 7], [24, 28]], 16: [[3, 7], [24, 28]], 17: [[3, 6], [25, 28]], 18: [[3, 6], [25, 28]], 19: [[4, 6], [25, 27]],
        },
        raya: { 0: [[15, 16]], 1: [[15, 16]], 2: [[15, 16]], 3: [[15, 16]] },
        tapa: true,
        textura: 'mechones',
      };
      break;
    case 'largo': // por la mandíbula, echado a un lado
      p = {
        filas: {
          '-1': [[9, 22]], 0: [[7, 24]], 1: [[6, 25]], 2: [[5, 26]], 3: [[5, 26]], 4: [[5, 26]], 5: [[5, 10], [13, 15], [19, 26]], 6: [[5, 7], [23, 26]],
          7: [[4, 6], [25, 27]], 8: [[4, 6], [25, 27]], 9: [[4, 6], [25, 27]], 10: [[4, 6], [25, 27]], 11: [[4, 6], [25, 27]], 12: [[4, 6], [25, 27]], 13: [[4, 6], [25, 27]],
          14: [[4, 7], [24, 27]], 15: [[4, 7], [24, 27]], 16: [[5, 7], [24, 26]],
        },
        tapa: true,
        textura: 'mechones',
      };
      break;
    case 'flequillo': // flequillo recto sobre la frente y algo largo por los lados
      p = {
        filas: {
          '-1': [[9, 22]], 0: [[7, 24]], 1: [[6, 25]], 2: [[5, 26]], 3: [[5, 26]], 4: [[5, 26]], 5: [[5, 26]],
          6: [[5, 8], [10, 13], [15, 17], [19, 21], [23, 26]], 7: [[5, 6], [25, 26]], 8: [[5, 6], [25, 26]], 9: [[5, 6], [25, 26]], 10: [[5, 6], [25, 26]], 11: [[5, 6], [25, 26]],
        },
        tapa: true,
        textura: 'mechones',
      };
      break;
    case 'mono': // recogido en un moño arriba (con su goma)
      p = {
        filas: { '-3': [[13, 18]], '-2': [[12, 19]], '-1': [[12, 19]], 0: [[8, 23]], 1: [[6, 25]], 2: [[6, 25]], 3: [[6, 25]], 4: [[6, 9], [13, 18], [22, 25]], 5: [[6, 7], [24, 25]], 6: [[6, 6], [25, 25]], 7: [[6, 6], [25, 25]] },
        goma: { 0: [[13, 18]] },
        textura: 'brillo',
      };
      break;
    case 'cresta': // cresta teñida en medio y lados rapados
      p = {
        filas: { '-3': [[13, 13], [15, 16], [18, 18]], '-2': [[13, 18]], '-1': [[13, 18]], 0: [[13, 18]], 1: [[13, 18]], 2: [[13, 18]], 3: [[13, 18]], 4: [[14, 17]] },
        lados: { 0: [[9, 10], [21, 22]], 1: [[7, 10], [21, 24]], 2: [[6, 10], [21, 25]], 3: [[6, 11], [20, 25]], 4: [[6, 8], [23, 25]], 5: [[6, 7], [24, 25]], 6: [[6, 6], [25, 25]], 7: [[6, 6], [25, 25]] },
        alfaLados: 0.7,
        ladosOscuros: true,
        textura: 'cresta',
      };
      break;
    case 'rastas': // rastas o «twists» cortos
      p = {
        filas: {
          '-2': [[9, 10], [13, 14], [17, 18], [21, 22]], '-1': [[7, 24]], 0: [[6, 25]], 1: [[5, 26]], 2: [[5, 26]], 3: [[5, 26]], 4: [[5, 26]],
          5: [[5, 7], [9, 10], [12, 13], [15, 16], [18, 19], [21, 22], [24, 26]], 6: [[5, 6], [9, 10], [15, 16], [21, 22], [25, 26]], 7: [[5, 6], [25, 26]],
        },
        puntas: { '-2': [[9, 10], [13, 14], [17, 18], [21, 22]], 6: [[9, 10], [15, 16], [21, 22]] },
        textura: 'rastas',
      };
      break;
    case 'degradado': // arriba con textura y los lados degradados
      p = {
        filas: { '-2': [[11, 19]], '-1': [[9, 22]], 0: [[8, 23]], 1: [[7, 24]], 2: [[7, 24]], 3: [[7, 24]], 4: [[8, 23]], 5: [[9, 11], [13, 16], [19, 21]] },
        lados: { 1: [[6, 6], [25, 25]], 2: [[6, 6], [25, 25]], 3: [[6, 6], [25, 25]], 4: [[6, 7], [24, 25]], 5: [[6, 7], [24, 25]], 6: [[6, 6], [25, 25]], 7: [[6, 6], [25, 25]] },
        textura: 'rizos',
      };
      break;
    case 'entradas': // se le va la frente hacia atrás
      p = {
        filas: { '-1': [[10, 21]], 0: [[8, 23]], 1: [[6, 25]], 2: [[5, 9], [12, 19], [22, 26]], 3: [[5, 8], [14, 17], [23, 26]], 4: [[5, 7], [24, 26]], 5: [[5, 7], [24, 26]], 6: [[5, 6], [25, 26]], 7: [[5, 6], [25, 26]], 8: [[5, 6], [25, 26]] },
        textura: 'peinado',
      };
      break;
    case 'ondulado': // media melena ondulada
      p = {
        filas: {
          '-2': [[10, 13], [17, 21]], '-1': [[8, 23]], 0: [[6, 25]], 1: [[5, 26]], 2: [[5, 26]], 3: [[5, 26]], 4: [[5, 26]],
          5: [[5, 9], [11, 13], [16, 18], [21, 26]], 6: [[5, 7], [11, 12], [24, 26]], 7: [[5, 6], [25, 26]], 8: [[5, 6], [25, 26]],
        },
        textura: 'ondas',
      };
      break;
    default: // corto
      p = {
        filas: { '-1': [[9, 22]], 0: [[7, 24]], 1: [[6, 25]], 2: [[5, 26]], 3: [[5, 26]], 4: [[5, 26]], 5: [[5, 9], [11, 14], [17, 19], [22, 26]], 6: [[5, 7], [24, 26]], 7: [[5, 6], [25, 26]], 8: [[5, 6], [25, 26]] },
        textura: 'peinado',
      };
  }
  peinados.set(e, p);
  return p;
}

/** Ruido estable entre 0 y 1 para cada (x, y): las texturas salen igual cada vez. */
function ruido(x, y) {
  let h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Mechones, rizos y brillos dentro del pelo (`r` = fila relativa a lo alto del cráneo). */
function texturaPelo(capa, tipo, H, c2) {
  const cambios = [];
  capa.cada((x, y) => {
    if (capa.alfa(x, y) < 0.9) return;
    const r = y - H;
    const arriba = !capa.hay(x, y - 1);
    let f = null;
    switch (tipo) {
      case 'rizos': {
        const v = (x * 3 + r * 5 + 40) % 7;
        if (v === 0) f = (c) => sombra(c, 0.7);
        else if (v === 3 && !arriba) f = (c) => brillo(c, 0.18);
        break;
      }
      case 'mechones': // pelo largo: mechones que caen
        if (r >= 5 ? x % 3 === 1 : ruido(x, (r + 40) >> 1) < 0.22) f = (c) => sombra(c, 0.8);
        break;
      case 'brillo': // pelo engominado: una franja de luz arriba y las rayas del peine
        if ((r === 0 && x >= 9 && x <= 13) || (r === -1 && x >= 11 && x <= 13) || (r === 1 && x >= 8 && x <= 10)) f = (c) => brillo(c, r === 0 ? 0.42 : 0.28);
        else if (r >= 1 && r <= 3 && (x === 13 || x === 18 || x === 22)) f = (c) => sombra(c, 0.8);
        break;
      case 'tupe': // la onda del tupé: una línea de luz que sube hacia la derecha y mechones
        if ((r === -2 && x >= 12 && x <= 15) || (r === -1 && x >= 10 && x <= 12) || (r === -3 && x >= 16 && x <= 18)) f = (c) => brillo(c, 0.42);
        else if (r >= -1 && ruido(x, (r + 40) >> 1) < 0.2) f = (c) => sombra(c, 0.74);
        break;
      case 'rastas':
        if (x % 2 === 0) f = (c) => sombra(c, 0.72);
        else if ((r + 40) % 2 === 0) f = (c) => brillo(c, 0.12);
        break;
      case 'ondas':
        if ((x + Math.floor((r + 40) / 2)) % 4 === 0) f = (c) => sombra(c, 0.78);
        break;
      case 'cresta': // mechones de punta, de abajo arriba
        if (x % 2 === 0) f = (c) => sombra(c, 0.82);
        else if (arriba) f = (c) => brillo(c, 0.35);
        break;
      case 'punteado':
        if ((x + r + 40) % 2 === 0) f = (c) => brillo(c, 0.12);
        break;
      default: // peinado: mechones cortos aquí y allá
        if (ruido(x, (r + 40) >> 1) < 0.18) f = (c) => sombra(c, 0.78);
        else if (r <= 1 && ruido(x + 9, r + 40) < 0.12) f = (c) => brillo(c, 0.2);
    }
    if (f) cambios.push([x, y, f]);
  });
  cambios.forEach(([x, y, f]) => capa.retocar(x, y, f));
  if (c2 && tipo !== 'rastas') { // mechas de otro color en las puntas de arriba
    capa.cada((x, y) => {
      if (capa.alfa(x, y) > 0.9 && (!capa.hay(x, y - 1) || !capa.hay(x, y - 2)) && ruido(x, y) < 0.55) capa.retocar(x, y, () => c2);
    });
  }
}

/** Pinta el pelo en su propia capa y lo pega en la cabeza, con la sombra que deja en la frente. */
function pintarPelo(cabeza, a, H, piel) {
  const def = peinado(a.pelo.e);
  const c = rgba(a.pelo.c);
  const c2 = a.pelo.c2 ? rgba(a.pelo.c2) : null;
  const capa = new Capa();
  if (def.lados) {
    const lado = def.ladosOscuros ? (c2 ?? sombra(c, 0.5)) : c;
    capa.tramos(def.lados, H, conAlfa(mezcla(lado, piel, 0.15), def.alfaLados ?? 0.55));
  }
  capa.tramos(def.filas, H, conAlfa(def.ladosOscuros && c2 ? c : c, def.alfa ?? 1));
  if (def.calvo) { // brillo de la cabeza
    cabeza.rect(10, H + 1, 3, 1, [255, 255, 255, 0.35]);
    cabeza.rect(9, H + 2, 2, 1, [255, 255, 255, 0.25]);
  }
  biselar(capa, { claro: 0.22, oscuro: 0.7, bajo: 0.8, si: (x, y) => capa.alfa(x, y) > 0.9 });
  texturaPelo(capa, def.textura, H, def.ladosOscuros ? null : c2);
  if (def.raya) capa.tramos(def.raya, H, sombra(c, 0.55));
  if (def.goma) capa.tramos(def.goma, H, sombra(c, 0.45));
  if (def.puntas && c2) capa.tramos(def.puntas, H, c2);
  // Sombra del pelo en la piel de justo debajo
  capa.cada((x, y) => {
    if (capa.alfa(x, y) > 0.9 && !capa.hay(x, y + 1) && cabeza.hay(x, y + 1)) cabeza.retocar(x, y + 1, (k) => sombra(k, 0.84));
  });
  capa.sobre(cabeza);
  return def;
}

/**
 * Barba recortada a la forma de la cara. Estilos: completa, corta, incipiente (de tres días), perilla, bigote y candado.
 * Si no se dice el estilo, una barba con transparencia es incipiente y una opaca, completa.
 */
function pintarBarba(cabeza, a, H, esPiel) {
  const c = rgba(a.barba);
  const estilo = a.estiloBarba ?? (c[3] < 0.6 ? 'incipiente' : 'completa');
  const color = opaco(c);
  const zona = (x, r) => {
    const dx = Math.abs(x - 15.5);
    const bigote = r === 13 && dx <= 3.5;
    const comisuras = r === 14 && dx >= 2.5 && dx <= 3.5;
    const perilla = r >= 15 && dx <= 3.5;
    switch (estilo) {
      case 'bigote': return bigote;
      case 'perilla': return (r === 15 && dx <= 2.5) || (r >= 16 && dx <= 1.5) || (r === 13 && dx <= 2.5);
      case 'candado': return perilla || bigote || comisuras;
      case 'corta': return (r >= 12 && dx >= 7.5) || (r >= 14 && dx >= 5.5) || r >= 16 || (r === 13 && dx <= 2.5);
      default: // completa e incipiente
        return (r >= 9 && dx >= 8.5) || (r >= 12 && dx >= 7.5) || (r >= 14 && dx >= 4.5) || r >= 15 || bigote || comisuras;
    }
  };
  for (let r = 9; r < ALTO_CABEZA; r += 1) {
    for (let x = 4; x < 28; x += 1) {
      if (!esPiel(x, H + r) || !zona(x, r)) continue;
      if (estilo === 'incipiente') cabeza.px(x, H + r, conAlfa(color, (x + r) % 2 ? 0.38 : 0.24));
      else {
        const borde = !esPiel(x, H + r + 1) || !zona(x, r + 1);
        cabeza.px(x, H + r, borde ? sombra(color, 0.8) : (x + r) % 3 === 0 ? brillo(color, 0.12) : color);
      }
    }
  }
  return estilo;
}

/** Ojos (2×3), mirando un poco a la derecha; con el espejo miran hacia donde corre el muñeco. */
function pintarOjos(cabeza, a, H, piel) {
  const pupila = rgba(a.ojos ?? '#24130f');
  const parpado = opaco(mezcla(sombra(piel, 0.35), [20, 10, 20, 1], 0.5));
  for (const ex of [10, 20]) {
    cabeza.rect(ex, H + 9, 2, 1, parpado);
    cabeza.px(ex, H + 10, [250, 250, 245, 1]);
    cabeza.px(ex, H + 11, [228, 226, 222, 1]);
    cabeza.rect(ex + 1, H + 10, 1, 2, pupila);
    if (a.edad === 'joven') { // ojos más grandes y con brillo
      cabeza.px(ex - 1, H + 10, [240, 240, 236, 1]);
      cabeza.px(ex + 1, H + 10, brillo(pupila, 0.5));
    }
  }
}

/** Cejas según el gesto. */
function pintarCejas(cabeza, a, H, piel) {
  // Calvos y rapados: del color de la barba; cresta teñida: del color de los lados (el natural)
  let base = rgba(a.pelo.c);
  if (a.pelo.e === 'calvo' || a.pelo.e === 'rapado') base = a.barba ? opaco(rgba(a.barba)) : sombra(piel, 0.5);
  else if (peinado(a.pelo.e).ladosOscuros && a.pelo.c2) base = rgba(a.pelo.c2);
  // Pelo muy claro o canoso: cejas algo más oscuras para que se vean
  const ceja = luminancia(base) > 150 ? sombra(base, 0.62) : sombra(base, 0.85);
  const gruesa = !!a.cejas;
  const gesto = a.gesto ?? 'serio';
  // Ceja izquierda en (9..11); la derecha es su espejo (20..22)
  let puntos;
  if (gesto === 'ceno') puntos = [[9, 6], [10, 7], [11, 7], [11, 8]];
  else puntos = [[9, 7], [10, 7], [11, 7]];
  if (gruesa) puntos = puntos.concat(gesto === 'ceno' ? [[10, 6], [9, 7]] : [[10, 6], [11, 6]]);
  for (const [x, r] of puntos) {
    cabeza.px(x, H + r, ceja);
    let rx = 31 - x;
    let rr = r;
    if (gesto === 'chulo') rr -= 1; // una ceja levantada
    cabeza.px(rx, H + rr, ceja);
  }
}

/** Boca según el gesto. */
function pintarBoca(cabeza, a, H, piel) {
  const labio = opaco(mezcla(sombra(piel, 0.5), [120, 30, 40, 1], 0.35));
  const y = H + 14;
  const gesto = a.dientes ? 'dientes' : a.gesto ?? 'serio';
  switch (gesto) {
    case 'sonrisa':
      cabeza.rect(14, y, 4, 1, labio);
      cabeza.px(13, y - 1, labio);
      cabeza.px(18, y - 1, labio);
      break;
    case 'dientes': // sonrisa grande enseñando los dientes
      cabeza.rect(13, y, 6, 1, sombra(labio, 0.7));
      cabeza.rect(14, y, 4, 1, [252, 250, 240, 1]);
      cabeza.rect(14, y + 1, 4, 1, labio);
      cabeza.px(12, y - 1, labio);
      cabeza.px(19, y - 1, labio);
      break;
    case 'chulo': // media sonrisa de lado
      cabeza.rect(14, y, 4, 1, labio);
      cabeza.px(18, y - 1, labio);
      break;
    case 'grito':
      cabeza.rect(14, y, 4, 2, sombra(labio, 0.6));
      cabeza.rect(15, y + 1, 2, 1, [200, 70, 80, 1]);
      cabeza.rect(14, y, 4, 1, [245, 240, 230, 1]);
      break;
    case 'ceno':
      cabeza.rect(14, y, 4, 1, labio);
      cabeza.px(13, y + 1, labio);
      cabeza.px(18, y + 1, labio);
      break;
    default:
      cabeza.rect(14, y, 4, 1, labio);
      cabeza.px(15, y + 1, [255, 255, 255, 0.12]); // labio de abajo con algo de luz
  }
}

/** La cabeza entera en su capa (sin contorno). Devuelve la capa. */
function pintarCabeza(a, m) {
  const cabeza = new Capa();
  const H = m.cabeza;
  const piel = rgba(a.piel);
  const forma = a.cara ?? (a.edad === 'joven' ? 'redonda' : 'normal');
  const def = peinado(a.pelo.e);
  const orejas = !def.tapa;

  // Cráneo y orejas
  for (let r = 0; r < ALTO_CABEZA; r += 1) {
    const [x0, x1] = filaCara(r, forma);
    cabeza.rect(x0, H + r, x1 - x0 + 1, 1, piel);
  }
  if (orejas) {
    for (const [x, xi, xe] of [[4, 5, 5], [26, 26, 26]]) {
      cabeza.px(xe, H + 9, piel);
      cabeza.rect(x, H + 10, 2, 2, piel);
      cabeza.px(xe, H + 12, piel);
      cabeza.px(xi, H + 10, sombra(piel, 0.8)); // hueco de la oreja
      cabeza.px(xi, H + 11, sombra(piel, 0.88));
    }
  }
  biselar(cabeza, { claro: 0.1, oscuro: 0.86, bajo: 0.9 });
  // Sombra bajo la mandíbula y luz en la frente
  const [, x1b] = filaCara(ALTO_CABEZA - 1, forma);
  cabeza.rect(16, H + ALTO_CABEZA - 1, x1b - 15, 1, [0, 0, 0, 0.08]);
  cabeza.rect(9, H + 4, 3, 1, [255, 240, 210, 0.18]);
  const piezaPiel = new Uint8Array(ANCHO * ALTO);
  cabeza.cada((x, y) => { piezaPiel[y * ANCHO + x] = 1; });
  const esPiel = (x, y) => dentro(x, y) && piezaPiel[y * ANCHO + x] === 1;

  // Mejillas, pecas y arrugas
  if (!a.barba || a.estiloBarba === 'bigote' || a.estiloBarba === 'perilla') {
    cabeza.rect(8, H + 12, 2, 1, [255, 90, 90, a.edad === 'joven' ? 0.32 : 0.2]);
    cabeza.rect(22, H + 12, 2, 1, [255, 90, 90, a.edad === 'joven' ? 0.32 : 0.2]);
  }
  if (a.pecas) [[8, 11], [10, 12], [12, 12], [19, 12], [21, 12], [23, 11]].forEach(([x, r]) => cabeza.px(x, H + r, [150, 80, 40, 0.5]));
  if (a.edad === 'mayor') {
    cabeza.px(12, H + 13, sombra(piel, 0.85)); // surcos junto a la nariz
    cabeza.px(19, H + 13, sombra(piel, 0.85));
    cabeza.px(8, H + 10, sombra(piel, 0.88)); // patas de gallo
    cabeza.px(23, H + 10, sombra(piel, 0.88));
    cabeza.rect(12, H + 5, 2, 1, sombra(piel, 0.9)); // arruga de la frente
    cabeza.rect(18, H + 5, 2, 1, sombra(piel, 0.9));
  }

  // Nariz (luz a la izquierda, sombra a la derecha)
  if (a.nariz === 'grande') {
    cabeza.px(15, H + 11, brillo(piel, 0.2));
    cabeza.rect(16, H + 11, 1, 2, sombra(piel, 0.78));
    cabeza.px(17, H + 12, sombra(piel, 0.84));
    cabeza.px(15, H + 12, sombra(piel, 0.9));
  } else {
    cabeza.px(15, H + 11, brillo(piel, 0.14));
    cabeza.px(16, H + 12, sombra(piel, 0.76));
    cabeza.px(15, H + 12, sombra(piel, 0.92));
  }

  // Barba, boca, ojos y cejas
  if (a.barba) pintarBarba(cabeza, a, H, esPiel);
  pintarBoca(cabeza, a, H, piel);
  pintarOjos(cabeza, a, H, piel);
  pintarCejas(cabeza, a, H, piel);

  // Pelo
  pintarPelo(cabeza, a, H, piel);

  // Cinta del pelo
  if (a.cinta) {
    const cinta = rgba(a.cinta);
    for (let x = 4; x < 28; x += 1) {
      if (!cabeza.hay(x, H + 3)) continue;
      cabeza.px(x, H + 3, brillo(cinta, 0.1));
      if (!a.cintaFina) cabeza.px(x, H + 4, sombra(cinta, 0.86));
    }
  }

  // Gafas
  if (a.gafas) {
    const montura = rgba(typeof a.gafas === 'string' ? a.gafas : '#2a2430');
    for (const ex of [8, 18]) {
      for (let x = ex; x < ex + 6; x += 1) { cabeza.px(x, H + 8, montura); cabeza.px(x, H + 12, montura); }
      for (let r = 9; r < 12; r += 1) { cabeza.px(ex, H + r, montura); cabeza.px(ex + 5, H + r, montura); }
      cabeza.rect(ex + 1, H + 9, 4, 3, [190, 225, 255, 0.22]);
      cabeza.px(ex + 1, H + 9, [255, 255, 255, 0.7]);
    }
    cabeza.rect(14, H + 9, 4, 1, montura);
    cabeza.px(6, H + 9, montura);
    cabeza.px(7, H + 9, montura);
    cabeza.px(24, H + 9, montura);
    cabeza.px(25, H + 9, montura);
  }

  // Pendientes
  if (a.pendiente && orejas) {
    cabeza.px(4, H + 13, a.pendiente);
    cabeza.px(27, H + 13, a.pendiente);
  }
  return cabeza;
}

// ---------------------------------------------------------------------------------------------
// Cuerpo: piernas, pantalón, torso (camiseta, traje, jersey o abrigo) y brazos
// ---------------------------------------------------------------------------------------------

/** Pierna levantada en este fotograma: 'izq' en el 1, 'der' en el 3. */
const levantada = (frame) => (frame === 1 ? 'izq' : frame === 3 ? 'der' : null);

function pintarPiernas(a, m, frame) {
  // Chibi: no hay piernas, solo dos zapatones asomando bajo el pantalón (el que se levanta, sube un píxel)
  const capa = new Capa();
  const bota = rgba(a.botas);
  for (const lado of ['izq', 'der']) {
    const sube = levantada(frame) === lado ? 1 : 0;
    const [x0, x1] = lado === 'izq' ? [m.tx0 + 1, 14] : [17, m.tx1 - 1];
    const fuera = lado === 'izq' ? -1 : 1; // la puntera apunta hacia fuera
    const y = m.botas - sube;
    // Zapatos oscuros (con ropa oscura no se verían): el empeine lleva un brillo más marcado
    const oscuro = bota[0] + bota[1] + bota[2] < 180;
    capa.rect(x0, y, x1 - x0 + 1, 1, oscuro ? brillo(bota, 0.35) : bota); // empeine
    capa.rect(Math.min(x0, x0 + fuera), y + 1, x1 - x0 + 2, 1, bota);
    capa.rect(Math.min(x0, x0 + fuera), y + 2, x1 - x0 + 2, 1, sombra(bota, 0.6)); // suela
    capa.px(lado === 'izq' ? x0 + 1 : x1 - 1, y, brillo(bota, 0.55)); // brillo
    capa.px(lado === 'izq' ? x0 : x1, y + 1, brillo(bota, 0.25));
  }
  biselar(capa, { claro: 0.1, oscuro: 0.8, bajo: 1 });
  return capa;
}

function pintarPantalon(a, m) {
  const capa = new Capa();
  const c = rgba(a.pantalon);
  const x0 = m.tx0 + 1;
  const x1 = m.tx1 - 1;
  capa.rect(x0, m.pantalonY, x1 - x0 + 1, 2, c);
  capa.px(15, m.pantalonY + 1, sombra(c, 0.7)); // costura del centro
  capa.px(16, m.pantalonY + 1, sombra(c, 0.7));
  biselar(capa, { claro: 0.12, oscuro: 0.78, bajo: 0.82 });
  capa.rect(x0, m.pantalonY, x1 - x0 + 1, 1, [0, 0, 0, 0.1]); // sombra de la camiseta
  return capa;
}

/** Color de la camiseta en (x, y) según el dibujo. */
function colorCamiseta(k, x, y, y0) {
  const c = rgba(k.c);
  const c2 = rgba(k.c2 ?? k.c);
  const d = x <= 15 ? 15 - x : x - 16; // distancia al centro (simétrico)
  switch (k.p) {
    case 'franjas': return ((d + 1) >> 1) % 2 ? c2 : c;
    case 'aros': return ((y - y0) >> 1) % 2 ? c2 : c;
    case 'mitad': return x >= 16 ? c2 : c;
    case 'cuadros': return (((x + 32) >> 1) + ((y - y0) >> 1)) % 2 ? c2 : c;
    case 'banda': return d <= 1 ? c2 : c;
    default: return c;
  }
}

function pintarTorso(a, m) {
  const capa = new Capa();
  const k = a.camiseta;
  const calle = deCalle(a);
  const ropa = calle ? (a.ropa ?? 'chaqueta') : null;
  const extra = ropa === 'abrigo' ? m.rodilla - (m.torsoY + m.torsoAlto) : ropa === 'chaqueta' ? 2 : ropa === 'jersey' ? 1 : 0;
  const y0 = m.torsoY;
  const y1 = m.torsoY + m.torsoAlto - 1 + extra;
  for (let y = y0; y <= y1; y += 1) {
    let x0 = m.tx0;
    let x1 = m.tx1;
    if (y === y0) { x0 += 1; x1 -= 1; } // hombros redondeados
    if (ropa === 'abrigo' && y > m.torsoY + m.torsoAlto) { x0 -= 1; x1 += 1; } // el abrigo se abre por abajo
    for (let x = x0; x <= x1; x += 1) capa.px(x, y, colorCamiseta(k, x, y, y0));
  }
  const c = rgba(k.c);
  const c2 = rgba(k.c2 ?? k.c);
  if (calle) {
    const camisa = rgba(a.camisa ?? '#f4f4f4');
    const corbata = rgba(a.corbata ?? k.c2 ?? '#222222');
    const solapa = sombra(c, 0.72);
    if (ropa === 'jersey') { // cuello de pico con la camisa y la corbata
      capa.rect(14, y0, 4, 1, camisa);
      capa.rect(15, y0 + 1, 2, 1, camisa);
      capa.px(13, y0, solapa);
      capa.px(18, y0, solapa);
      capa.px(14, y0 + 1, solapa);
      capa.px(17, y0 + 1, solapa);
      capa.rect(15, y0, 2, 2, corbata);
      capa.rect(m.tx0, y1, m.torsoAncho, 1, sombra(c, 0.8)); // elástico de abajo
    } else { // chaqueta o abrigo: solapas en pico, camisa y corbata
      for (let i = 0; i < 4; i += 1) {
        capa.rect(13 + i, y0 + i, 6 - 2 * i, 1, camisa);
        capa.px(12 + i, y0 + i, solapa);
        capa.px(19 - i, y0 + i, solapa);
      }
      capa.rect(15, y0, 2, 1, sombra(corbata, 0.8)); // nudo
      capa.rect(15, y0 + 1, 2, 4, corbata);
      capa.px(15, y0 + 5, corbata);
      const botones = sombra(c, 0.6);
      capa.px(16, y0 + 6, botones);
      if (ropa === 'abrigo') {
        for (let y = y0 + 6; y <= y1; y += 2) { capa.px(13, y, botones); capa.px(18, y, botones); }
        capa.rect(m.tx0 - 1, y0, 2, 3, solapa); // cuello alto del abrigo
        capa.rect(m.tx1, y0, 2, 3, solapa);
        for (let y = y0 + 6; y <= y1; y += 1) capa.px(15, y, sombra(c, 0.8));
      } else capa.px(16, y0 + 8, botones);
    }
  } else if (k.p === 'cuello') { // cuello redondo del otro color
    capa.rect(13, y0, 6, 1, c2);
    capa.rect(14, y0 + 1, 4, 1, c2);
    capa.rect(15, y0 + 1, 2, 1, sombra(c, 0.7));
  } else { // escote en pico
    capa.rect(14, y0, 4, 1, sombra(colorCamiseta(k, 14, y0, y0), 0.62));
    capa.rect(15, y0 + 1, 2, 1, sombra(colorCamiseta(k, 15, y0 + 1, y0), 0.75));
  }
  biselar(capa, { claro: 0.16, oscuro: 0.76, bajo: 0.84 });
  // La cabeza deja sombra en los hombros
  for (let x = 11; x <= 20; x += 1) capa.retocar(x, y0, (col) => sombra(col, 0.8));
  return capa;
}

function pintarBrazos(a, m, frame) {
  const capa = new Capa();
  const k = a.camiseta;
  const piel = rgba(a.piel);
  const calle = deCalle(a);
  const largas = calle || !!a.guantes; // mangas largas: ropa de calle y porteros
  const manga = rgba(k.p === 'mangas' ? k.c2 : k.c);
  const manos = [];
  for (const lado of ['izq', 'der']) {
    const [x0, x1] = lado === 'izq' ? [m.tx0 - 3, m.tx0 - 1] : [m.tx1 + 1, m.tx1 + 3];
    // Al caminar, el brazo contrario a la pierna levantada va hacia delante (sube 1 píxel)
    const adelante = levantada(frame) && levantada(frame) !== lado ? 1 : 0;
    const top = m.torsoY + 1;
    const fin = m.torsoY + m.torsoAlto - 2 - adelante; // última fila del antebrazo
    const finManga = largas ? fin : top + 2;
    for (let y = top; y <= fin; y += 1) {
      const enManga = y <= finManga;
      let color = enManga ? manga : piel;
      if (enManga && calle && y === fin) color = rgba(a.camisa ?? '#f4f4f4'); // puño de la camisa
      const xa = y === top ? (lado === 'izq' ? x0 + 1 : x0) : x0; // hombro redondeado
      const xb = y === top ? (lado === 'izq' ? x1 : x1 - 1) : x1;
      capa.rect(xa, y, xb - xa + 1, 1, color);
    }
    if (!largas) capa.rect(x0, finManga, 3, 1, sombra(manga, 0.82)); // borde de la manga
    if (a.tatuaje) { // tatuajes en el antebrazo
      for (let y = finManga + 1; y <= fin; y += 1) for (let x = x0; x <= x1; x += 1) if ((x + y) % 2 === 0) capa.px(x, y, conAlfa(rgba(a.tatuaje), 0.55));
    }
    if (a.brazalete && lado === 'der') capa.rect(x0, top + 1, 3, 2, a.brazalete === true ? '#ffd400' : a.brazalete);
    manos.push([lado, x0, x1, fin]);
  }
  biselar(capa, { claro: 0.14, oscuro: 0.78, bajo: 1 });
  // Mano o guante
  for (const [lado, x0, x1, fin] of manos) {
    if (a.guantes) {
      const g = rgba(a.guantes);
      const gx = lado === 'izq' ? x0 - 1 : x0;
      capa.rect(gx, fin + 1, 4, 3, g);
      capa.rect(gx, fin + 1, 4, 1, brillo(g, 0.3));
      capa.px(lado === 'izq' ? gx + 3 : gx, fin + 3, sombra(g, 0.7));
    } else {
      capa.rect(x0, fin + 1, 3, 2, piel);
      capa.rect(x0, fin + 2, 3, 1, sombra(piel, 0.88));
      capa.px(lado === 'izq' ? x1 : x0, fin + 2, sombra(piel, 0.76));
    }
  }
  return capa;
}

/**
 * Pinta el muñeco (sin DOM). Devuelve los píxeles RGBA de la cuadrícula ANCHO×ALTO.
 * `frame`: 0..3 (ver FOTOGRAMAS).
 */
export function pixelesMuneco(aspecto, frame = 0) {
  const m = medidas(aspecto);
  const final = new Capa();
  const capas = [
    pintarPiernas(aspecto, m, frame),
    pintarPantalon(aspecto, m),
    pintarTorso(aspecto, m),
    pintarBrazos(aspecto, m, frame),
    pintarCabeza(aspecto, m),
  ];
  for (const capa of capas) {
    contornear(capa);
    capa.sobre(final);
  }
  return final.d;
}

/** Fila de lo alto del cráneo de un aspecto (para encuadrar la cara en avatares y fotos). */
export const filaCabeza = (aspecto) => medidas(aspecto).cabeza;

// ---------------------------------------------------------------------------------------------
// Aspectos: personajes, entrenadores, jefes y rivales
// ---------------------------------------------------------------------------------------------

// Barbas de los rivales genéricos (se reparten según su piel y su pelo)
const BARBAS_RIVAL = [null, 'incipiente', null, 'corta', null, 'perilla', 'completa', null, 'bigote'];

/** Aspecto completo (con la camiseta del equipo, la piel y el pelo) de un rival normal. */
export function aspectoRival(equipo, piel = 0, pelo = 0) {
  const datos = EQUIPOS[equipo];
  const p = PELOS[pelo % PELOS.length];
  const v = (piel * 5 + pelo * 3) % BARBAS_RIVAL.length;
  const barba = BARBAS_RIVAL[v];
  // Los tanques son anchos, los velocistas delgados; la estatura varía de uno a otro
  const complexion = datos.radio >= 19 ? 'ancha' : datos.velocidad >= 85 ? 'delgada' : (piel + pelo) % 4 === 0 ? 'ancha' : 'normal';
  const estatura = ['normal', 'alta', 'normal', 'baja'][(piel + 2 * pelo) % 4];
  return {
    piel: PIELES[piel % PIELES.length],
    pelo: p,
    ...(barba ? { barba: tono(p.c, 0.9) ?? p.c, estiloBarba: barba } : {}),
    gesto: (piel + pelo) % 3 === 0 ? 'serio' : 'ceno',
    complexion,
    estatura,
    ...datos.kit,
  };
}

/** Aspecto de cualquier cosa dibujable a partir de su tipo: personaje, entrenador, jefe o rival. */
export function aspectoDe(tipo, clave, piel = 0, pelo = 0) {
  if (tipo === 'personaje') return PERSONAJES[clave].aspecto;
  if (tipo === 'entrenador') return ENTRENADORES[clave].aspecto;
  if (tipo === 'jefe') return JEFES[clave].aspecto;
  return aspectoRival(clave, piel, pelo);
}

/** El mismo muñeco con la equipación de una selección (pelo, piel y botas no cambian). */
export function conSeleccion(aspecto, pais) {
  const s = SELECCIONES[pais];
  if (!s || aspecto.camiseta.p === 'traje') return aspecto;
  return { ...aspecto, camiseta: { ...s.camiseta }, pantalon: s.pantalon, medias: s.medias };
}

// ---------------------------------------------------------------------------------------------
// Caché de lienzos y dibujo
// ---------------------------------------------------------------------------------------------

const lienzo = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

function aLienzo(pixeles) {
  const c = lienzo(ANCHO, ALTO);
  const cx = c.getContext('2d');
  const img = cx.createImageData(ANCHO, ALTO);
  img.data.set(pixeles);
  cx.putImageData(img, 0, 0);
  return c;
}

/**
 * Devuelve (y guarda en caché) los fotogramas del muñeco. `blancos` (versión «destello», toda blanca) se rellena
 * al pedirla por primera vez. `cabeza` es la fila de lo alto del cráneo.
 */
export function obtenerSprite(claveCache, aspecto) {
  let s = cache.get(claveCache);
  if (s) return s;
  const frames = [];
  for (let f = 0; f < FOTOGRAMAS; f += 1) frames.push(aLienzo(pixelesMuneco(aspecto, f)));
  s = { frames, blancos: [], cabeza: filaCabeza(aspecto) };
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
  cache.set(claveCache, s);
  return s;
}

function blanco(sprite, f) {
  if (!sprite.blancos[f]) {
    const c = lienzo(ANCHO, ALTO);
    const cx = c.getContext('2d');
    cx.drawImage(sprite.frames[f], 0, 0);
    cx.globalCompositeOperation = 'source-atop';
    cx.fillStyle = '#ffffff';
    cx.fillRect(0, 0, ANCHO, ALTO);
    sprite.blancos[f] = c;
  }
  return sprite.blancos[f];
}

/**
 * Dibuja un muñeco centrado en (x, y) con los pies en `y + alto/2`.
 * @param {number} alto Alto en unidades del mundo
 * @param {number} frame Fotograma de caminar (0..3; cualquier entero vale, se toma el resto)
 * @param {boolean} espejo Mirar hacia la izquierda
 * @param {boolean} destello Pintarlo de blanco (recibe un golpe)
 */
export function dibujarSprite(ctx, sprite, x, y, alto, frame, espejo, destello) {
  const ancho = (alto * ANCHO) / ALTO;
  const n = sprite.frames.length;
  const f = ((Math.floor(frame) % n) + n) % n;
  const origen = destello ? blanco(sprite, f) : sprite.frames[f];
  if (espejo) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(-1, 1);
    ctx.drawImage(origen, -ancho / 2, -alto / 2, ancho, alto);
    ctx.restore();
  } else {
    ctx.drawImage(origen, x - ancho / 2, y - alto / 2, ancho, alto);
  }
}

/** Retrato de un muñeco como imagen (data URL) para las pantallas de selección. */
export function retratoUrl(claveCache, aspecto, factor = 5) {
  const s = obtenerSprite(claveCache, aspecto);
  const c = lienzo(ANCHO * factor, ALTO * factor);
  const cx = c.getContext('2d');
  cx.imageSmoothingEnabled = false;
  cx.drawImage(s.frames[0], 0, 0, ANCHO * factor, ALTO * factor);
  return c.toDataURL('image/png');
}

const avatares = new Map();
/** Aspecto para un avatar: 'p:clave' (jugador) o 'e:clave' (entrenador). Null si no existe. */
export function aspectoAvatar(avatar) {
  const [tipo, clave] = String(avatar || '').split(':');
  if (tipo === 'p' && PERSONAJES[clave]) return PERSONAJES[clave].aspecto;
  if (tipo === 'e' && ENTRENADORES[clave]) return ENTRENADORES[clave].aspecto;
  return null;
}

/** Recorte cuadrado de la cabeza y los hombros de un muñeco: { x, y, lado } en píxeles del muñeco. */
export function encuadreCara(sprite) {
  const lado = 28;
  return { x: (ANCHO - lado) / 2, y: Math.max(0, sprite.cabeza - 3), lado };
}

/**
 * Avatar redondo: la cara y un poco de la camiseta del jugador o entrenador (data URL de `tam` píxeles).
 * Devuelve null si el avatar no existe.
 */
export function avatarUrl(avatar, tam = 64) {
  const clave = `${avatar}:${tam}`;
  if (avatares.has(clave)) return avatares.get(clave);
  const aspecto = aspectoAvatar(avatar);
  if (!aspecto) return null;
  const s = obtenerSprite(`av:${avatar}`, aspecto);
  const c = lienzo(tam, tam);
  const cx = c.getContext('2d');
  cx.imageSmoothingEnabled = false;
  // Fondo con los colores de la camiseta
  const g = cx.createLinearGradient(0, 0, 0, tam);
  g.addColorStop(0, '#1d2348');
  g.addColorStop(1, aspecto.camiseta.c);
  cx.fillStyle = g;
  cx.fillRect(0, 0, tam, tam);
  // Cabeza y hombros, centrados y algo bajos
  const { x, y, lado } = encuadreCara(s);
  const escala = tam / lado;
  cx.drawImage(s.frames[0], x, y, lado, lado, 0, Math.round(tam * 0.06), lado * escala, lado * escala);
  const url = c.toDataURL('image/png');
  avatares.set(clave, url);
  return url;
}
