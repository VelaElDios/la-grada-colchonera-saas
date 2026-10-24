// Muñecos «chibi» de píxeles (cabeza grande, camiseta y botas), dibujados con código: no hay imágenes.
// Cada muñeco se dibuja una vez en una cuadrícula de 16×20 y luego se reutiliza (caché) a cualquier tamaño.
// Este módulo solo toca el DOM cuando se llama a una función (no al importarlo).
import {
  EQUIPOS, PIELES, PELOS, PERSONAJES, ENTRENADORES, JEFES, SELECCIONES,
} from './config.js';

export const ANCHO = 16;
export const ALTO = 20;
const CONTORNO = '#1a1020';
const cache = new Map();

const rect = (ctx, color, x, y, w = 1, h = 1) => {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
};

/** Rectángulo con las 4 esquinas recortadas (forma redondeada en píxeles). */
function redondeado(ctx, color, x, y, w, h) {
  rect(ctx, color, x + 1, y, w - 2, h);
  rect(ctx, color, x, y + 1, w, h - 2);
}

function pintarPelo(ctx, pelo, piel) {
  const { c, e } = pelo;
  switch (e) {
    case 'calvo':
      rect(ctx, c, 3, 3, 1, 2);
      rect(ctx, c, 12, 3, 1, 2);
      rect(ctx, 'rgba(255,255,255,0.35)', 6, 1, 3, 1); // brillo de la cabeza
      break;
    case 'largo':
      rect(ctx, c, 3, 1, 10, 3);
      rect(ctx, c, 3, 4, 1, 5);
      rect(ctx, c, 12, 4, 1, 5);
      rect(ctx, c, 4, 4, 2, 1);
      rect(ctx, c, 10, 4, 2, 1);
      break;
    case 'rizado':
      rect(ctx, c, 3, 1, 10, 3);
      [4, 6, 9, 11].forEach((x) => rect(ctx, c, x, 0, 1, 1));
      rect(ctx, c, 3, 4, 1, 1);
      rect(ctx, c, 12, 4, 1, 1);
      break;
    case 'tupe': // flequillo alto
      rect(ctx, c, 3, 1, 10, 3);
      rect(ctx, c, 5, 0, 7, 1);
      rect(ctx, c, 4, 4, 2, 1);
      rect(ctx, c, 3, 4, 1, 2);
      rect(ctx, c, 12, 4, 1, 2);
      break;
    case 'gomina': // peinado hacia atrás, muy liso
      rect(ctx, c, 3, 1, 10, 2);
      rect(ctx, c, 3, 3, 1, 2);
      rect(ctx, c, 12, 3, 1, 2);
      rect(ctx, 'rgba(255,255,255,0.3)', 5, 1, 4, 1);
      break;
    case 'rapado': // pelo muy corto, apenas una sombra
      rect(ctx, c, 4, 1, 8, 1);
      rect(ctx, c, 3, 2, 1, 2);
      rect(ctx, c, 12, 2, 1, 2);
      break;
    case 'cresta': // cresta teñida hacia arriba
      rect(ctx, c, 3, 2, 10, 1);
      rect(ctx, c, 5, 0, 6, 2);
      [6, 8, 10].forEach((x) => rect(ctx, c, x, 0, 1, 1));
      rect(ctx, c, 3, 3, 1, 2);
      rect(ctx, c, 12, 3, 1, 2);
      break;
    default: // corto
      rect(ctx, c, 3, 1, 10, 2);
      rect(ctx, c, 3, 3, 1, 2);
      rect(ctx, c, 12, 3, 1, 2);
      rect(ctx, c, 4, 3, 2, 1);
      rect(ctx, c, 10, 3, 2, 1);
  }
  return piel;
}

function pintarCamiseta(ctx, k) {
  const { c, c2, p } = k.camiseta;
  // contorno del torso y camiseta
  rect(ctx, CONTORNO, 2, 10, 12, 5);
  rect(ctx, c, 4, 10, 8, 5);
  switch (p) {
    case 'franjas':
      for (let i = 0; i < 8; i += 1) if (Math.floor(i / 2) % 2 === 1) rect(ctx, c2, 4 + i, 10, 1, 5);
      break;
    case 'aros':
      for (let r = 0; r < 5; r += 1) if (r % 2 === 1) rect(ctx, c2, 4, 10 + r, 8, 1);
      break;
    case 'mitad':
      rect(ctx, c2, 8, 10, 4, 5);
      break;
    case 'cuadros': // a cuadros (Croacia)
      for (let i = 0; i < 8; i += 1) for (let r = 0; r < 5; r += 1) if ((i + r) % 2 === 1) rect(ctx, c2, 4 + i, 10 + r, 1, 1);
      break;
    case 'banda':
      rect(ctx, c2, 7, 10, 2, 5);
      break;
    case 'cuello':
      rect(ctx, c2, 6, 10, 4, 1);
      rect(ctx, c2, 7, 11, 2, 1);
      break;
    case 'traje':
      rect(ctx, '#ffffff', 6, 10, 4, 2); // camisa blanca
      rect(ctx, k.corbata ?? c2, 7, 11, 2, 4); // corbata
      rect(ctx, 'rgba(0,0,0,0.25)', 4, 10, 1, 5); // solapas
      rect(ctx, 'rgba(0,0,0,0.25)', 11, 10, 1, 5);
      break;
    default: // liso
  }
  // brazos
  const manga = p === 'mangas' || p === 'traje' ? (p === 'mangas' ? c2 : c) : c;
  rect(ctx, manga, 3, 11, 1, 2);
  rect(ctx, manga, 12, 11, 1, 2);
  rect(ctx, k.guantes ?? k.piel, 3, 13, 1, 2);
  rect(ctx, k.guantes ?? k.piel, 12, 13, 1, 2);
}

/** Dibuja un muñeco en el contexto `ctx` (cuadrícula de 16×20). `frame` 0 o 1 mueve los pies. */
function pintarChibi(ctx, a, frame) {
  const piel = a.piel;
  const traje = a.camiseta.p === 'traje';

  // Piernas, medias y botas
  rect(ctx, CONTORNO, 3, 15, 10, 2);
  rect(ctx, a.pantalon, 4, 15, 8, 2);
  if (traje) rect(ctx, a.pantalon, 4, 17, 8, 1);
  const izq = frame === 0 ? 0 : 1;
  const der = frame === 0 ? 1 : 0;
  if (!traje) {
    rect(ctx, a.medias, 5, 17, 2, 1);
    rect(ctx, a.medias, 9, 17, 2, 1);
  } else {
    rect(ctx, a.pantalon, 5, 17, 2, 1);
    rect(ctx, a.pantalon, 9, 17, 2, 1);
  }
  rect(ctx, CONTORNO, 4, 18 - izq, 4, 2 - 0);
  rect(ctx, a.botas, 4, 18 - izq, 3, 1 + izq === 1 ? 2 : 1);
  rect(ctx, CONTORNO, 8, 18 - der, 4, 2);
  rect(ctx, a.botas, 9, 18 - der, 3, 1 + der === 1 ? 2 : 1);

  // Torso
  pintarCamiseta(ctx, a);

  // Cabeza
  redondeado(ctx, CONTORNO, 2, 0, 12, 10);
  redondeado(ctx, piel, 3, 1, 10, 8);
  pintarPelo(ctx, a.pelo, piel);
  rect(ctx, 'rgba(255,120,120,0.35)', 4, 7, 1, 1); // mejillas
  rect(ctx, 'rgba(255,120,120,0.35)', 11, 7, 1, 1);
  if (a.barba) {
    rect(ctx, a.barba, 4, 7, 8, 2);
    rect(ctx, a.barba, 3, 6, 1, 2);
    rect(ctx, a.barba, 12, 6, 1, 2);
    rect(ctx, '#8a5a44', 7, 7, 2, 1); // boca
  } else {
    rect(ctx, '#9a4b3a', 7, 7, 2, 1); // boca
  }
  if (a.gafas) {
    rect(ctx, '#111111', 4, 4, 3, 3);
    rect(ctx, '#111111', 9, 4, 3, 3);
    rect(ctx, '#111111', 7, 5, 2, 1);
    rect(ctx, '#ffffff', 5, 5, 1, 1);
    rect(ctx, '#ffffff', 10, 5, 1, 1);
  } else {
    rect(ctx, CONTORNO, 5, 5, 1, 2); // ojos
    rect(ctx, CONTORNO, 10, 5, 1, 2);
    rect(ctx, '#ffffff', 5, 5, 1, 1);
    rect(ctx, '#ffffff', 10, 5, 1, 1);
  }
}

const lienzo = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

/** Aspecto completo (con la camiseta del equipo, la piel y el pelo) de un rival normal. */
export function aspectoRival(equipo, piel = 0, pelo = 0) {
  const kit = EQUIPOS[equipo].kit;
  return { piel: PIELES[piel % PIELES.length], pelo: PELOS[pelo % PELOS.length], ...kit };
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

/** Devuelve (y guarda en caché) los dos fotogramas del muñeco y su versión «destello» (blanca). */
export function obtenerSprite(claveCache, aspecto) {
  let s = cache.get(claveCache);
  if (s) return s;
  const frames = [0, 1].map((f) => {
    const c = lienzo(ANCHO, ALTO);
    pintarChibi(c.getContext('2d'), aspecto, f);
    return c;
  });
  const blancos = frames.map((f) => {
    const c = lienzo(ANCHO, ALTO);
    const cx = c.getContext('2d');
    cx.drawImage(f, 0, 0);
    cx.globalCompositeOperation = 'source-atop';
    cx.fillStyle = '#ffffff';
    cx.fillRect(0, 0, ANCHO, ALTO);
    return c;
  });
  s = { frames, blancos };
  cache.set(claveCache, s);
  return s;
}

/**
 * Dibuja un muñeco centrado en (x, y) con los pies en `y + alto/2`.
 * @param {number} alto Alto en unidades del mundo
 * @param {number} frame 0 o 1 (animación de caminar)
 * @param {boolean} espejo Mirar hacia la izquierda
 * @param {boolean} destello Pintarlo de blanco (recibe un golpe)
 */
export function dibujarSprite(ctx, sprite, x, y, alto, frame, espejo, destello) {
  const ancho = (alto * ANCHO) / ALTO;
  const origen = destello ? sprite.blancos[frame] : sprite.frames[frame];
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
  // Cabeza y hombros (las 15 primeras filas del muñeco), centrados y algo bajos
  const escala = tam / 13;
  cx.drawImage(s.frames[0], 0, 0, ANCHO, 14, (tam - ANCHO * escala) / 2, tam * 0.1, ANCHO * escala, 14 * escala);
  const url = c.toDataURL('image/png');
  avatares.set(clave, url);
  return url;
}
