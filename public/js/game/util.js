// Utilidades matemáticas y generador de números aleatorios con semilla (para poder probar el juego).

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;

/** Normaliza un vector; si es nulo devuelve (0, 0). */
export function normalizar(x, y) {
  const l = Math.hypot(x, y);
  return l > 1e-9 ? [x / l, y / l] : [0, 0];
}

/** Generador pseudoaleatorio mulberry32: misma semilla, misma partida. */
export function crearRng(semilla = Date.now()) {
  let a = semilla >>> 0;
  const siguiente = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    siguiente,
    rango: (min, max) => min + siguiente() * (max - min),
    entero: (min, max) => Math.floor(min + siguiente() * (max - min + 1)),
    elegir: (lista) => lista[Math.floor(siguiente() * lista.length)],
    /** Devuelve una copia barajada (Fisher-Yates). */
    barajar(lista) {
      const copia = lista.slice();
      for (let i = copia.length - 1; i > 0; i -= 1) {
        const j = Math.floor(siguiente() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
      }
      return copia;
    },
  };
}

/**
 * Cuadrícula espacial: permite buscar vecinos cercanos sin comparar todas las parejas.
 * Las listas de cada celda se reutilizan de un paso a otro (vaciarlas no crea basura) y la clave es un entero
 * pequeño, que el motor guarda sin crear objetos. Las búsquedas recorren las celdas y, dentro de cada una, las
 * entidades en el orden en que se insertaron (el orden importa: la simulación tiene que ser determinista).
 */
export function crearCuadricula(tamanoCelda = 64) {
  const celdas = new Map();
  const usadas = []; // listas con algo desde la última limpieza
  // 15 bits por eje: da la vuelta cada 32768 celdas (más de un millón de unidades, inalcanzable en una partida)
  const clave = (cx, cy) => ((cx & 0x7fff) << 15) | (cy & 0x7fff);
  return {
    limpiar() {
      for (let i = 0; i < usadas.length; i += 1) usadas[i].length = 0;
      usadas.length = 0;
      if (celdas.size > 4096) celdas.clear(); // no guardar para siempre las celdas por las que ya no se pasa
    },
    insertar(entidad) {
      const k = clave(Math.floor(entidad.x / tamanoCelda), Math.floor(entidad.y / tamanoCelda));
      let lista = celdas.get(k);
      if (!lista) {
        lista = [];
        celdas.set(k, lista);
      }
      if (lista.length === 0) usadas.push(lista);
      lista.push(entidad);
    },
    /** Llama a `fn` con cada entidad que pueda estar a menos de `r` del punto (x, y). */
    cerca(x, y, r, fn) {
      const x0 = Math.floor((x - r) / tamanoCelda);
      const x1 = Math.floor((x + r) / tamanoCelda);
      const y0 = Math.floor((y - r) / tamanoCelda);
      const y1 = Math.floor((y + r) / tamanoCelda);
      for (let cx = x0; cx <= x1; cx += 1) {
        for (let cy = y0; cy <= y1; cy += 1) {
          const lista = celdas.get(clave(cx, cy));
          if (lista) for (let i = 0; i < lista.length; i += 1) fn(lista[i]);
        }
      }
    },
    /**
     * Como `cerca`, pero deja las entidades en `salida` (que se vacía antes) en vez de llamar a una función:
     * para los bucles más calientes, sin crear una función por búsqueda. Mismo orden que `cerca`.
     */
    reunir(x, y, r, salida) {
      salida.length = 0;
      const x0 = Math.floor((x - r) / tamanoCelda);
      const x1 = Math.floor((x + r) / tamanoCelda);
      const y0 = Math.floor((y - r) / tamanoCelda);
      const y1 = Math.floor((y + r) / tamanoCelda);
      for (let cx = x0; cx <= x1; cx += 1) {
        for (let cy = y0; cy <= y1; cy += 1) {
          const lista = celdas.get(clave(cx, cy));
          if (lista) for (let i = 0; i < lista.length; i += 1) salida.push(lista[i]);
        }
      }
      return salida;
    },
  };
}

/** Formatea segundos como m:ss. */
export function formatearTiempo(segundos) {
  const s = Math.max(0, Math.floor(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
