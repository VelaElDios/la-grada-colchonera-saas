// Terreno del campo, generado como un mundo de Minecraft: varios «ruidos» suaves (distrito, altura, humedad,
// nubes, bosque y caminos) deciden qué hay en cada punto, así que todo se mezcla con continuidad en vez de
// pegar módulos uno al lado de otro. Cada partida (semilla) es un mundo distinto, y siempre el mismo para
// esa semilla. El campo es infinito: se calcula por celdas (parcelas) cuando hace falta y no se guarda nada.
// Es lógica pura (sin DOM), así que se prueba con node:test.
//
//  - Distrito: barrios de estadios (campo + gradas que lo miran + explanadas con puestos y tiendas),
//    plazas con monumento y tiendas deportivas, campos de entrenamiento, parques y prados.
//  - Altura: mesetas de uno o dos niveles por bloques, con taludes que no se pueden subir y escaleras.
//  - Humedad: charcos de barro (nunca sobre el asfalto ni sobre el césped de un estadio).
//  - Nubes: zonas donde llueve (los balones corren más).
//  - Bosque: arboledas y matorrales; y un ruido de caminos que serpentea por todo el mapa.
import { TERRENO } from './config.js';

/** Número pseudoaleatorio estable (0..1) para (cx, cy), la semilla y un «canal» distinto por cosa. */
export function azar(semilla, cx, cy, canal) {
  let h = Math.imul(cx * 374761393 + cy * 668265263 + canal * 2246822519 + Math.imul(semilla, 1597334677), 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Ruido de valor suavizado (0..1) en el punto (x, y) de una rejilla de paso 1. */
function ruidoBase(s, x, y, canal) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = azar(s, xi, yi, canal);
  const b = azar(s, xi + 1, yi, canal);
  const c = azar(s, xi, yi + 1, canal);
  const d = azar(s, xi + 1, yi + 1, canal);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Ruido fractal (varias octavas) normalizado y estirado a 0..1 (el ruido de valor se concentra en el centro). */
export function ruido(s, x, y, escala, canal, octavas = 3) {
  let suma = 0;
  let amp = 1;
  let total = 0;
  let f = 1 / escala;
  for (let o = 0; o < octavas; o += 1) {
    suma += amp * ruidoBase(s, x * f + o * 31.7, y * f - o * 17.3, canal + o * 101);
    total += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  const n = suma / total;
  return Math.max(0, Math.min(1, 0.5 + (n - 0.5) * (octavas > 1 ? 1.75 : 1.2)));
}

const CANAL = { distrito: 10, altura: 20, humedad: 30, nubes: 40, bosque: 50, camino: 60, tono: 70 };
const T = () => TERRENO.celda;
const B = () => TERRENO.baldosa;
const POR_CELDA = () => TERRENO.celda / TERRENO.baldosa; // baldosas por lado de celda (8)
const suave = (a, b, x) => {
  const k = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

/** `pasillo`: semialtura de una franja horizontal sin obstáculos (el menú pasea por ahí y nunca se atasca). */
export function crearTerreno(semilla = 1, { pasillo = 0 } = {}) {
  return { semilla: (semilla >>> 0) % 2147483647, celdas: new Map(), lotes: new Map(), niveles: new Map(), pasillo };
}

// ---------------------------------------------------------------------------------------------
// Campos de ruido
// ---------------------------------------------------------------------------------------------

export const distrito = (t, x, y) => ruido(t.semilla, x, y, TERRENO.escalaDistrito, CANAL.distrito, 3);
export const humedad = (t, x, y) => ruido(t.semilla, x, y, TERRENO.escalaHumedad, CANAL.humedad, 3);
export const nubes = (t, x, y) => ruido(t.semilla, x, y, TERRENO.escalaNubes, CANAL.nubes, 3);
export const bosque = (t, x, y) => ruido(t.semilla, x, y, TERRENO.escalaBosque, CANAL.bosque, 3);
/** Tono del césped (zonas más verdes o más secas): solo es visual. */
export const tono = (t, x, y) => ruido(t.semilla, x, y, 520, CANAL.tono, 2);
/** Caminos: las «crestas» del ruido (donde vale 0,5) forman sendas que serpentean y se cruzan. */
export function caminoEn(t, x, y) {
  const c = ruido(t.semilla, x, y, 1500, CANAL.camino, 2);
  return Math.abs(c - 0.5) < 0.016;
}

/** Distancia del punto de salida (0, 0) a un rectángulo centrado en (x, y). */
function distOrigen(o) {
  const dx = Math.max(Math.abs(o.x) - o.w / 2, 0);
  const dy = Math.max(Math.abs(o.y) - o.h / 2, 0);
  return Math.hypot(dx, dy);
}

// ---------------------------------------------------------------------------------------------
// Parcelas (una por celda): qué hay en cada trozo del mapa
// ---------------------------------------------------------------------------------------------

const URBANO = 0.65;
const ENTRENO = 0.57;
const PARQUE = 0.49;

function claseDe(t, cx, cy) {
  const u = distrito(t, (cx + 0.5) * T(), (cy + 0.5) * T());
  if (u > URBANO) return 'urbano';
  if (u > ENTRENO) return azar(t.semilla, cx, cy, 3) < 0.72 ? 'entrenamiento' : 'parque';
  if (u > PARQUE) return 'parque';
  return 'prado';
}

/** ¿Hay un estadio en esta parcela? Solo en barrio urbano y separados entre sí (máximos locales). */
function esEstadio(t, cx, cy) {
  if (claseDe(t, cx, cy) !== 'urbano') return false;
  const h = azar(t.semilla, cx, cy, 7);
  if (h < 0.3) return false;
  for (let i = -1; i <= 1; i += 1) {
    for (let k = -1; k <= 1; k += 1) {
      if ((i || k) && claseDe(t, cx + i, cy + k) === 'urbano' && azar(t.semilla, cx + i, cy + k, 7) > h) return false;
    }
  }
  return true;
}

/**
 * Tipo de parcela: 'estadio' (un campo), 'grada' (al lado de un campo, con la grada mirándolo),
 * 'plaza', 'entrenamiento', 'parque' o 'prado'. Para 'grada', `mira` es hacia dónde está el campo.
 */
export function loteDe(t, cx, cy) {
  const clave = `${cx},${cy}`;
  let l = t.lotes.get(clave);
  if (l) return l;
  const clase = claseDe(t, cx, cy);
  if (clase === 'urbano') {
    if (esEstadio(t, cx, cy)) l = { tipo: 'estadio' };
    else {
      const vecinos = [['e', 1, 0], ['o', -1, 0], ['s', 0, 1], ['n', 0, -1]].filter(([, i, k]) => esEstadio(t, cx + i, cy + k));
      if (vecinos.length) l = { tipo: 'grada', mira: vecinos[Math.floor(azar(t.semilla, cx, cy, 8) * vecinos.length)][0] };
      else l = { tipo: 'plaza' };
    }
  } else l = { tipo: clase };
  if (t.lotes.size > 6000) t.lotes.clear();
  t.lotes.set(clave, l);
  return l;
}

// ---------------------------------------------------------------------------------------------
// Alturas: mesetas por bloques (solo en parques y prados, lejos de la salida y del pasillo del menú)
// ---------------------------------------------------------------------------------------------

export function nivelBaldosa(t, tx, ty) {
  const clave = `${tx},${ty}`;
  const hecho = t.niveles.get(clave);
  if (hecho !== undefined) return hecho;
  const n = POR_CELDA();
  const lote = loteDe(t, Math.floor(tx / n), Math.floor(ty / n)).tipo;
  let nivel = 0;
  if (lote === 'prado' || lote === 'parque') {
    const x = (tx + 0.5) * B();
    const y = (ty + 0.5) * B();
    let mascara = suave(0.58, 0.47, distrito(t, x, y));
    mascara *= suave(380, 760, Math.hypot(x, y));
    if (t.pasillo) mascara *= suave(t.pasillo + 120, t.pasillo + 380, Math.abs(y));
    if (lote === 'parque') mascara *= 0.85;
    const e = 0.5 + (ruido(t.semilla, x, y, TERRENO.escalaAltura, CANAL.altura, 3) - 0.5) * mascara;
    nivel = e > TERRENO.alturas[1] ? 2 : e > TERRENO.alturas[0] ? 1 : 0;
  }
  if (t.niveles.size > 40000) t.niveles.clear();
  t.niveles.set(clave, nivel);
  return nivel;
}

/** Nivel del suelo (0, 1 o 2) en el punto (x, y). */
export const nivelEn = (t, x, y) => nivelBaldosa(t, Math.floor(x / B()), Math.floor(y / B()));

/** ¿Hay escalera en el borde de esta baldosa? Una cada `cadaEscalera` baldosas, de dos de ancho. */
function escalera(t, a, b, canal) {
  const cada = TERRENO.cadaEscalera;
  const desfase = Math.floor(azar(t.semilla, b, 0, canal) * cada);
  return ((a + desfase) % cada + cada) % cada < 2;
}

// ---------------------------------------------------------------------------------------------
// Celda: obstáculos, adornos y «suelo» (lo que se pinta en la textura del césped)
// ---------------------------------------------------------------------------------------------

const ALTO = {
  grada: 64, cartel: 16, porteria: 46, banquillo: 30, foco: 130, arbol: 96, roca: 16, banco: 14, farola: 110,
  tienda: 84, kiosco: 52, monumento: 110, pantalla: 120, valla: 22, fuente: 34, talud: 0,
};
/** Obstáculos «bajos»: no se pueden cruzar andando, pero los balones pasan por encima. */
const BAJOS = new Set(['talud', 'valla', 'banco', 'roca', 'fuente']);
/**
 * Obstáculos «macizos»: su colisión es TODO lo que se ve (base + altura dibujada), para que nunca puedas meterte
 * detrás de un tejado o de una grada y desaparecer. En ellos `y`/`h` describen el rectángulo completo que se ve
 * y `hBase` el fondo de la base (lo que usa el dibujo). Árboles, focos y farolas solo chocan por la base.
 */
export const MACIZOS = new Set(['grada', 'tienda', 'kiosco', 'monumento', 'pantalla', 'porteria', 'banquillo', 'cartel', 'banco', 'roca']);

/** Contenido de la celda (cx, cy). Se calcula una vez y se guarda. */
export function celda(t, cx, cy) {
  const numero = (cx + 32768) * 65536 + (cy + 32768); // clave numérica: más rápida que un texto
  let c = t.celdas.get(numero);
  if (c) return c;
  const clave = `${cx},${cy}`;
  const s = t.semilla;
  const L = T();
  const ox = cx * L;
  const oy = cy * L;
  const lote = loteDe(t, cx, cy);
  let canal = 200;
  const r = () => azar(s, cx, cy, canal++);
  c = { cx, cy, bioma: lote.tipo, lote, obstaculos: [], decor: [], suelo: [], reservado: [] };
  let n = 0;
  const nuevaId = () => `${clave}:${n++}`;

  const choca = (a, b, margen) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 + margen && Math.abs(a.y - b.y) < (a.h + b.h) / 2 + margen;
  const dentro = (o) => o.x - o.w / 2 >= ox && o.x + o.w / 2 <= ox + L && o.y - o.h / 2 >= oy && o.y + o.h / 2 <= oy + L;
  /** Mete un obstáculo si cabe en la celda y no estorba (salida, pasillo del menú, otros obstáculos). */
  /** En los macizos, (x, y) es el centro de todo lo que se ve y `h` el fondo de la base: se ve y choca h + alto. */
  const meter = (tipo, x, y, w, h, extra = {}, margen = 18) => {
    const o = { tipo, x, y, w, h, alto: ALTO[tipo] ?? 20, bajo: BAJOS.has(tipo), id: nuevaId(), semilla: Math.floor(r() * 1e6), ...extra };
    if (MACIZOS.has(tipo)) {
      o.hBase = h;
      o.h = h + o.alto;
    }
    if (!dentro(o)) return null;
    if (tipo !== 'talud' && distOrigen(o) < TERRENO.claroInicial) return null;
    if (t.pasillo && Math.abs(o.y) < t.pasillo + o.h / 2 + 40) return null;
    if (c.obstaculos.some((p) => choca(o, p, margen))) return null;
    if (tipo !== 'talud' && c.reservado.some((p) => choca(o, p, 6))) return null;
    c.obstaculos.push(o);
    return o;
  };
  const adorno = (tipo, x, y, extra = {}) => {
    if (x < ox || x > ox + L || y < oy || y > oy + L) return;
    if (t.pasillo && tipo !== 'flores' && Math.abs(y) < t.pasillo + 30) return;
    c.decor.push({ tipo, x, y, w: 0, h: 0, id: nuevaId(), semilla: Math.floor(r() * 1e6), ...extra });
  };

  // 1) Taludes de las mesetas (y escaleras)
  const N = POR_CELDA();
  const bx = cx * N;
  const by = cy * N;
  const niv = (i, k) => nivelBaldosa(t, bx + i, by + k);
  const { frente, borde } = TERRENO;
  const bloques = new Set(); // baldosas con talud (no se pone nada encima)
  // Cara sur (se ve de frente): tramos seguidos sin escalera se juntan en un solo obstáculo
  for (let k = 0; k < N; k += 1) {
    let desde = null;
    const cerrar = (hasta, nivelTramo) => {
      if (desde === null) return;
      const x0 = ox + desde * B();
      const x1 = ox + hasta * B();
      meter('talud', (x0 + x1) / 2, oy + (k + 1) * B() - frente / 2, x1 - x0, frente, { lado: 's', nivel: nivelTramo }, -1);
      desde = null;
    };
    let nivelTramo = 0;
    for (let i = 0; i <= N; i += 1) {
      const aqui = i < N ? niv(i, k) : 0;
      const baja = i < N && niv(i, k + 1) < aqui;
      const esc = baja && escalera(t, bx + i, by + k, 71);
      if (baja && !esc && (desde === null || aqui === nivelTramo)) {
        if (desde === null) { desde = i; nivelTramo = aqui; }
      } else {
        cerrar(i, nivelTramo);
        if (baja && !esc) { desde = i; nivelTramo = aqui; }
      }
      if (baja) {
        bloques.add(`${i},${k}`);
        if (esc) {
          const e = { tipo: 'escalera', lado: 's', x: ox + (i + 0.5) * B(), y: oy + (k + 1) * B() - frente / 2, w: B(), h: frente, nivel: aqui };
          c.suelo.push(e);
          c.reservado.push({ x: e.x, y: e.y + 20, w: e.w, h: e.h + 70 });
        }
      }
    }
  }
  // Caras norte, este y oeste: bordes finos
  for (let k = 0; k < N; k += 1) {
    for (let i = 0; i < N; i += 1) {
      const aqui = niv(i, k);
      if (aqui === 0) continue;
      const x = ox + i * B();
      const y = oy + k * B();
      const lados = [
        ['n', niv(i, k - 1), x + B() / 2, y + borde / 2, B(), borde, escalera(t, bx + i, by + k, 72)],
        ['o', niv(i - 1, k), x + borde / 2, y + B() / 2, borde, B(), escalera(t, by + k, bx + i, 73)],
        ['e', niv(i + 1, k), x + B() - borde / 2, y + B() / 2, borde, B(), escalera(t, by + k, bx + i, 74)],
      ];
      for (const [lado, vecino, ex, ey, w, h, esc] of lados) {
        if (vecino >= aqui) continue;
        bloques.add(`${i},${k}`);
        const sur = niv(i, k + 1) < aqui; // la esquina sur la tapa el frente
        const alto = lado !== 'n' && sur ? h - frente : h;
        const cy2 = lado !== 'n' && sur ? ey - frente / 2 : ey;
        if (esc) {
          c.suelo.push({ tipo: 'rampa', lado, x: ex, y: cy2, w, h: alto, nivel: aqui });
          c.reservado.push({ x: ex + (lado === 'e' ? 40 : lado === 'o' ? -40 : 0), y: cy2 + (lado === 'n' ? -40 : 0), w: lado === 'n' ? w : w + 70, h: lado === 'n' ? h + 70 : alto });
        } else meter('talud', ex, cy2, w, alto, { lado, nivel: aqui }, -1);
      }
    }
  }

  // 2) La parcela
  const mx = ox + L / 2;
  const my = oy + L / 2;
  if (lote.tipo === 'estadio') {
    // Campo vertical con porterías arriba y abajo, focos en las esquinas y vallas publicitarias detrás de cada portería
    const campo = { tipo: 'campo', x: mx, y: my, w: 470, h: 560 };
    c.suelo.push(campo);
    meter('porteria', mx, oy + 40, 130, 34, {}, 4);
    meter('porteria', mx, oy + L - 81, 130, 34, {}, 4);
    for (const [fx, fy] of [[ox + 26, oy + 30], [ox + L - 26, oy + 30], [ox + 26, oy + L - 30], [ox + L - 26, oy + L - 30]]) meter('foco', fx, fy, 40, 40);
    for (const fila of [oy + 20, oy + L - 20]) {
      for (const xx of [ox + 80, ox + L - 80]) meter('cartel', xx, fila, 130, 20, {}, 4);
    }
    meter('banquillo', ox + 50, my, 44, 120, { vertical: true, alto: 14 }, 4);
    meter('banquillo', ox + L - 50, my, 44, 120, { vertical: true, alto: 14 }, 4);
    if (r() < 0.8) adorno('balon', mx + (r() - 0.5) * 200, my + (r() - 0.5) * 300);
  } else if (lote.tipo === 'grada') {
    // Grada a lo largo del lado que da al estadio, con un vomitorio en medio; detrás, explanada con puestos
    const fondo = 150;
    const hueco = 130;
    const largo = (L - 60 - hueco) / 2; // lo que se ve de cada pieza
    const m = lote.mira;
    const piezas = [];
    if (m === 'e' || m === 'o') {
      const x = m === 'e' ? ox + L - 24 - fondo / 2 : ox + 24 + fondo / 2;
      piezas.push([x, oy + 30 + largo / 2, fondo, largo - ALTO.grada], [x, oy + L - 30 - largo / 2, fondo, largo - ALTO.grada]);
    } else {
      const visto = fondo + ALTO.grada;
      const y = m === 's' ? oy + L - 24 - visto / 2 : oy + 24 + visto / 2;
      piezas.push([ox + 30 + largo / 2, y, largo, fondo], [ox + L - 30 - largo / 2, y, largo, fondo]);
    }
    piezas.forEach(([x, y, w, h]) => meter('grada', x, y, w, h, { mira: m }, 4));
    // La explanada ocupa el resto de la parcela
    const ex = { tipo: 'explanada', x: mx, y: my, w: L, h: L };
    c.suelo.push(ex);
    const lejos = { e: [-1, 0], o: [1, 0], s: [0, -1], n: [0, 1] }[m];
    const px = mx + lejos[0] * 150;
    const py = my + lejos[1] * 150;
    if (r() < 0.6) meter('tienda', px, py + (lejos[1] ? 0 : (r() - 0.5) * 200), 210, 96);
    meter('kiosco', px + (lejos[1] ? 190 : 0), py + (lejos[0] ? 190 : 0), 86, 54);
    meter('kiosco', px - (lejos[1] ? 190 : 0), py - (lejos[0] ? 190 : 0), 86, 54);
    for (const [fx, fy] of [[ox + 30, oy + 30], [ox + L - 30, oy + L - 30], [ox + L - 30, oy + 30], [ox + 30, oy + L - 30]]) if (r() < 0.55) meter('foco', fx, fy, 40, 40);
    for (let i = 0; i < 3; i += 1) meter('farola', mx + (r() - 0.5) * 460, my + (r() - 0.5) * 460, 12, 10);
  } else if (lote.tipo === 'plaza') {
    const variante = ['monumento', 'tiendas', 'pista', 'fanzone'][Math.floor(azar(s, cx, cy, 9) * 4)];
    lote.variante = variante;
    const jx = (r() - 0.5) * 120;
    const jy = (r() - 0.5) * 120;
    if (variante === 'monumento') {
      // Plaza de piedra (borde irregular) con el trofeo del ambiente sobre una fuente, bancos, farolas y árboles en maceta
      c.suelo.push({ tipo: 'plaza', x: mx + jx, y: my + jy, r: 210 + 60 * r() });
      meter('monumento', mx + jx, my + jy, 110, 70);
      for (const [dx, dy] of [[-150, -140], [150, -140], [-150, 150], [150, 150]]) meter('farola', mx + jx + dx, my + jy + dy, 12, 10);
      for (const [dx, dy] of [[0, 120], [-150, 10], [150, 10]]) meter('banco', mx + jx + dx, my + jy + dy, 56, 16);
      for (const [dx, dy] of [[-230, 200], [230, 200], [-230, -170], [230, -170]]) if (r() < 0.7) meter('arbol', mx + jx + dx, my + jy + dy, 22, 14, { maceta: true, copa: 30 + 8 * r() });
      if (r() < 0.5) meter('tienda', mx + (r() < 0.5 ? -160 : 160), oy + 100, 210, 96);
    } else if (variante === 'tiendas') {
      // Calle comercial: fila de tiendas deportivas mirando a una calle peatonal, puestos y farolas
      const cyCalle = oy + 290 + r() * 100;
      c.suelo.push({ tipo: 'calle', x: mx, y: cyCalle, w: L, h: 170 });
      const n = r() < 0.5 ? 2 : 3;
      const ancho = n === 3 ? 180 : 220;
      for (let i = 0; i < n; i += 1) meter('tienda', ox + (L / n) * (i + 0.5), cyCalle - 85 - 92, ancho, 96, { marca: i + Math.floor(r() * 5) });
      for (let i = 0; i < 4; i += 1) meter('farola', ox + 80 + i * 160, cyCalle + 70, 12, 10);
      meter('kiosco', ox + 140 + r() * 360, cyCalle + 150, 86, 54);
      for (let i = 0; i < 3; i += 1) meter('arbol', ox + 90 + i * 230 + r() * 40, cyCalle + 200 + r() * 30, 22, 14, { copa: 32 + 10 * r() });
    } else if (variante === 'pista') {
      // Pista de fútbol sala enjaulada (con puertas), con focos
      const w = 260;
      const h = 360;
      const x = mx + jx * 0.6;
      const y = my + jy * 0.6;
      c.suelo.push({ tipo: 'pista', x, y, w, h });
      meter('porteria', x, y - h / 2 + 14, 80, 26, { pequena: true }, 2);
      meter('porteria', x, y + h / 2 - 14, 80, 26, { pequena: true }, 2);
      for (const lado of [-1, 1]) {
        meter('valla', x + lado * (w / 2 + 14), y - h / 2 + 60, 10, 120, { vertical: true, jaula: true }, 2);
        meter('valla', x + lado * (w / 2 + 14), y + h / 2 - 60, 10, 120, { vertical: true, jaula: true }, 2);
      }
      for (const lado of [-1, 1]) {
        meter('valla', x - w / 2 + 50, y + lado * (h / 2 + 14), 100, 10, { jaula: true }, 2);
        meter('valla', x + w / 2 - 50, y + lado * (h / 2 + 14), 100, 10, { jaula: true }, 2);
      }
      meter('foco', x - w / 2 - 50, y - h / 2 - 10, 40, 40);
      meter('foco', x + w / 2 + 50, y + h / 2 + 10, 40, 40);
    } else {
      // Fan zone: pantalla gigante con lo que se juega, explanada, puestos y banderas
      const py = oy + 90 + r() * 60;
      c.suelo.push({ tipo: 'plaza', x: mx + jx, y: py + 170, r: 200 + 40 * r() });
      meter('pantalla', mx + jx, py, 230, 30);
      meter('kiosco', mx + jx - 200, py + 200, 86, 54);
      meter('kiosco', mx + jx + 200, py + 200, 86, 54);
      for (let i = 0; i < 6; i += 1) adorno('bandera', mx + jx + (i - 2.5) * 70, py + 330 + (i % 2) * 18);
      for (const dx of [-140, 140]) meter('farola', mx + jx + dx, py + 80, 12, 10);
    }
  } else if (lote.tipo === 'entrenamiento') {
    // Campo de entrenamiento: porterías pequeñas, conos, vallas a los lados (con huecos) y algún banquillo
    const w = 300 + 40 * r();
    const h = 400 + 60 * r();
    const x = mx + (r() - 0.5) * (L - w - 120);
    const y = my + (r() - 0.5) * (L - h - 80);
    c.suelo.push({ tipo: 'campo', x, y, w, h, entreno: true });
    meter('porteria', x, y - h / 2 + 16, 92, 30, { pequena: true }, 4);
    meter('porteria', x, y + h / 2 - 16, 92, 30, { pequena: true }, 4);
    for (const lado of [-1, 1]) {
      const vx = x + lado * (w / 2 + 26);
      meter('valla', vx, y - h / 2 + 70, 10, 140, { vertical: true }, 4);
      meter('valla', vx, y + h / 2 - 70, 10, 140, { vertical: true }, 4);
    }
    if (r() < 0.7) meter('banquillo', x, y + h / 2 + 44, 140, 40, {}, 4);
    if (r() < 0.6) meter('foco', x - w / 2 - 50, y - h / 2 - 20, 40, 40);
    for (let i = 0; i < 2; i += 1) {
      const vertical = r() < 0.5;
      adorno('conos', x + (r() - 0.5) * (w - 80), y + (r() - 0.5) * (h - 120), { n: 4, dx: vertical ? 0 : 34, dy: vertical ? 34 : 0 });
    }
    for (let i = 0; i < 3; i += 1) adorno('balon', x + (r() - 0.5) * w, y + (r() - 0.5) * h);
    c.suelo.push({ tipo: 'tierra', x, y: y - h / 2 + 50, r: 60 }, { tipo: 'tierra', x, y: y + h / 2 - 50, r: 60 });
  } else if (lote.tipo === 'parque' && r() < 0.35) {
    meter('fuente', mx + (r() - 0.5) * 200, my + (r() - 0.5) * 200, 120, 70);
  }

  // 3) Naturaleza: árboles, rocas, matorrales y bancos junto a los caminos (según el ruido, no por piezas)
  const densidad = { prado: 0.55, parque: 0.7, entrenamiento: 0.22, plaza: 0, grada: 0, estadio: 0 }[lote.tipo];
  for (let k = 0; k < N; k += 1) {
    for (let i = 0; i < N; i += 1) {
      const x0 = ox + i * B();
      const y0 = oy + k * B();
      const x = x0 + B() * (0.2 + 0.6 * azar(s, bx + i, by + k, 81));
      const y = y0 + B() * (0.25 + 0.6 * azar(s, bx + i, by + k, 82));
      // Al pie de un talud no se planta nada: dejaría al rival encerrado entre el árbol y la pared
      if (bloques.has(`${i},${k}`) || niv(i, k - 1) > niv(i, k) || niv(i - 1, k) > niv(i, k) || niv(i + 1, k) > niv(i, k)) {
        // Al pie del talud, alguna roca
        if (azar(s, bx + i, by + k, 83) < 0.12) adorno('piedras', x, y);
        continue;
      }
      if (caminoEn(t, x, y)) {
        if ((lote.tipo === 'parque' || lote.tipo === 'entrenamiento') && azar(s, bx + i, by + k, 84) < 0.2) {
          const lado = azar(s, bx + i, by + k, 85) < 0.5 ? -1 : 1;
          const banco = azar(s, bx + i, by + k, 86) < 0.6;
          if (!caminoEn(t, x, y + lado * 34)) meter(banco ? 'banco' : 'farola', x, y + lado * 34, banco ? 56 : 12, banco ? 16 : 10);
        }
        continue;
      }
      const b = bosque(t, x, y);
      const p = Math.max(0, (b - 0.4) * 2.4) * densidad;
      const u = azar(s, bx + i, by + k, 87);
      if (u < p) meter('arbol', x, y, 22, 14, { copa: 30 + 16 * azar(s, bx + i, by + k, 88), especie: azar(s, bx + i, by + k, 89) < 0.25 ? 'pino' : 'frondoso' }, 10);
      else if (u < p + 0.12 * densidad + 0.04) adorno('mata', x, y, { r: 10 + 10 * azar(s, bx + i, by + k, 90) });
      else if (lote.tipo === 'prado' && u > 0.985) meter('roca', x, y, 40, 24, {}, 10);
    }
  }
  if (r() < 0.18 && lote.tipo !== 'estadio') adorno('balon', ox + L * (0.1 + 0.8 * r()), oy + L * (0.1 + 0.8 * r()));

  t.celdas.set(numero, c);
  if (t.celdas.size > 3000) t.celdas.delete(t.celdas.keys().next().value);
  return c;
}

const celdaDe = (v) => Math.floor(v / TERRENO.celda);

/** ¿El punto está sobre asfalto, piedra o el césped de un estadio? (ahí no hay barro). */
export function pavimentado(t, x, y) {
  const c = celda(t, celdaDe(x), celdaDe(y));
  for (const a of c.suelo) {
    if (a.tipo === 'explanada') return true;
    if (a.tipo === 'plaza' && enPlaza(t, a, x, y)) return true;
    if ((a.tipo === 'calle' || a.tipo === 'pista') && Math.abs(x - a.x) < a.w / 2 + 20 && Math.abs(y - a.y) < a.h / 2 + 20) return true;
    if (a.tipo === 'campo' && !a.entreno && Math.abs(x - a.x) < a.w / 2 + 30 && Math.abs(y - a.y) < a.h / 2 + 30) return true;
  }
  return false;
}

/** Borde irregular de la plaza: el radio cambia con el ángulo. */
export function enPlaza(t, a, x, y) {
  const ang = Math.atan2(y - a.y, x - a.x);
  const lim = a.r * (0.86 + 0.09 * Math.sin(ang * 3 + a.x * 0.01) + 0.05 * Math.sin(ang * 7 - a.y * 0.01));
  return (x - a.x) ** 2 + (y - a.y) ** 2 <= lim * lim;
}

/** Zona en la que está el punto: 'barro', 'lluvia' o null. */
export function zonaEn(t, x, y) {
  if (humedad(t, x, y) > TERRENO.umbralBarro && !pavimentado(t, x, y)) return 'barro';
  if (nubes(t, x, y) > TERRENO.umbralLluvia) return 'lluvia';
  return null;
}

/** Llama a `fn` con cada obstáculo de las celdas que rodean el punto. */
/**
 * Llama a `fn` con cada obstáculo que puede tocar el círculo (x, y, r). Como cada obstáculo cabe entero en su
 * celda, basta con mirar las celdas que pisa ese círculo (casi siempre una) y descartar lo que queda lejos.
 */
export function obstaculosCerca(t, x, y, fn, r = 64) {
  const L = TERRENO.celda;
  const x0 = Math.floor((x - r) / L);
  const x1 = Math.floor((x + r) / L);
  const y0 = Math.floor((y - r) / L);
  const y1 = Math.floor((y + r) / L);
  for (let i = x0; i <= x1; i += 1) {
    for (let k = y0; k <= y1; k += 1) {
      const lista = celda(t, i, k).obstaculos;
      for (let n = 0; n < lista.length; n += 1) {
        const o = lista[n];
        if (Math.abs(o.x - x) > o.w / 2 + r || Math.abs(o.y - y) > o.h / 2 + r) continue;
        fn(o);
      }
    }
  }
}

/** Distancia (px) desde (x, y) al borde de la grada más cercana en `alcance`; Infinity si no hay ninguna. */
export function distanciaGrada(t, x, y, alcance = 700) {
  let mejor = Infinity;
  obstaculosCerca(t, x, y, (o) => {
    if (o.tipo !== 'grada') return;
    const dx = Math.max(0, Math.abs(o.x - x) - o.w / 2);
    const dy = Math.max(0, Math.abs(o.y - y) - o.h / 2);
    const d = Math.hypot(dx, dy);
    if (d < mejor) mejor = d;
  }, alcance);
  return mejor;
}

/** Celdas, obstáculos y adornos que caen dentro del rectángulo [x0,x1]×[y0,y1] (para dibujarlas). */
export function visibles(t, x0, y0, x1, y1, margen = 260) {
  const celdas = [];
  const obstaculos = [];
  const decor = [];
  for (let cx = celdaDe(x0 - margen); cx <= celdaDe(x1 + margen); cx += 1) {
    for (let cy = celdaDe(y0 - margen); cy <= celdaDe(y1 + margen); cy += 1) {
      const c = celda(t, cx, cy);
      celdas.push(c);
      for (const o of c.obstaculos) obstaculos.push(o);
      for (const d of c.decor) decor.push(d);
    }
  }
  return { celdas, obstaculos, decor, zonas: [] };
}

/**
 * Saca a la entidad (círculo `x, y, r`) de los obstáculos. Devuelve true si ha chocado con alguno.
 * Si se indica un objetivo (`tx`, `ty`) y `deslizar` > 0, además la empuja de lado, hacia donde
 * está el objetivo, para que los rivales rodeen el obstáculo en vez de quedarse pegados a él.
 */
export function resolver(t, ent, tx = 0, ty = 0, deslizar = 0) {
  let choco = false;
  let sumaNx = 0;
  let sumaNy = 0;
  // Se choca con los PIES (como se ve en la vista 3/4): un círculo algo por debajo del centro del muñeco
  const pies = ent.pies ?? 0;
  const r = ent.rPies ?? ent.r;
  obstaculosCerca(t, ent.x, ent.y + pies, (g) => {
    const ey = ent.y + pies;
    const hx = g.w / 2;
    const hy = g.h / 2;
    const px = Math.max(g.x - hx, Math.min(ent.x, g.x + hx));
    const py = Math.max(g.y - hy, Math.min(ey, g.y + hy));
    const dx = ent.x - px;
    const dy = ey - py;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) return;
    choco = true;
    let nx;
    let ny;
    if (d2 > 1e-9) {
      const d = Math.sqrt(d2);
      nx = dx / d;
      ny = dy / d;
      ent.x = px + nx * r;
      ent.y = py + ny * r - pies;
    } else {
      // Los pies están dentro del obstáculo: se sale por el lado más cercano
      const sx = ent.x < g.x ? -1 : 1;
      const sy = ey < g.y ? -1 : 1;
      const salX = hx - Math.abs(ent.x - g.x);
      const salY = hy - Math.abs(ey - g.y);
      if (salX < salY) { nx = sx; ny = 0; ent.x = g.x + sx * (hx + r); } else { nx = 0; ny = sy; ent.y = g.y + sy * (hy + r) - pies; }
    }
    if (deslizar > 0) {
      // Tangente a la pared. La primera vez se elige el sentido que acerca al objetivo y después se mantiene
      // (`ent.rodeo`): así el rival sigue la pared hasta rodearla en vez de bailar dentro de un rincón.
      let tgx = -ny;
      let tgy = nx;
      if (!ent.rodeo) ent.rodeo = tgx * (tx - ent.x) + tgy * (ty - ent.y) < 0 ? -1 : 1;
      tgx *= ent.rodeo;
      tgy *= ent.rodeo;
      sumaNx += nx;
      sumaNy += ny;
      ent.x += tgx * deslizar;
      ent.y += tgy * deslizar;
    }
  }, r + 2);
  if (sumaNx || sumaNy) {
    const l = Math.hypot(sumaNx, sumaNy);
    ent.nx = sumaNx / l;
    ent.ny = sumaNy / l;
  }
  return choco;
}

/**
 * ¿El círculo (x, y, r) toca algún obstáculo? Por defecto solo los altos (para balones: los taludes,
 * vallas, bancos y rocas se pasan por encima); con `bajos` también los bajos (para andar o colocar cosas).
 */
export function tocaGrada(t, x, y, r = 0, bajos = false) {
  let toca = false;
  obstaculosCerca(t, x, y, (g) => {
    if (toca || (g.bajo && !bajos)) return;
    const px = Math.max(g.x - g.w / 2, Math.min(x, g.x + g.w / 2));
    const py = Math.max(g.y - g.h / 2, Math.min(y, g.y + g.h / 2));
    if ((x - px) ** 2 + (y - py) ** 2 <= r * r) toca = true;
  }, r + 1);
  return toca;
}

/** Compatibilidad con el nombre antiguo. */
export const gradasCerca = obstaculosCerca;

/** ¿Hay camino libre (andando) desde (x, y) hacia (tx, ty) en los próximos `largo` píxeles? */
export function rayoLibre(t, x, y, tx, ty, largo = 400, r = 12) {
  const d = Math.hypot(tx - x, ty - y) || 1;
  const hasta = Math.min(largo, d);
  const ux = (tx - x) / d;
  const uy = (ty - y) / d;
  for (let s = 24; s <= hasta; s += 24) if (tocaGrada(t, x + ux * s, y + uy * s, r, true)) return false;
  return true;
}
