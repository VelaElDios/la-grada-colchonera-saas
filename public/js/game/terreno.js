// Terreno del campo: zonas de barro y de lluvia, y gradas que hacen de obstáculo.
// El campo es infinito, pero siempre es el mismo para una semilla: se calcula con un «hash» por celda,
// sin guardar nada. Es lógica pura (sin DOM), así que se puede probar con node:test.
import { TERRENO } from './config.js';

/** Número pseudoaleatorio estable (0..1) para la celda (cx, cy), la semilla y un «canal» distinto por cosa. */
function azar(semilla, cx, cy, canal) {
  let h = Math.imul(cx * 374761393 + cy * 668265263 + canal * 2246822519 + Math.imul(semilla, 1597334677), 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function crearTerreno(semilla = 1) {
  return { semilla: (semilla >>> 0) % 2147483647, celdas: new Map() };
}

/** Contenido de la celda (cx, cy): como mucho una zona y una grada. Se calcula una vez y se guarda. */
export function celda(t, cx, cy) {
  const clave = `${cx},${cy}`;
  let c = t.celdas.get(clave);
  if (c) return c;
  const T = TERRENO.celda;
  const s = t.semilla;
  const ox = cx * T;
  const oy = cy * T;
  c = { cx, cy, zona: null, grada: null };

  // Zona de lluvia o de barro (un círculo)
  const u = azar(s, cx, cy, 1);
  if (u < TERRENO.probLluvia + TERRENO.probBarro) {
    c.zona = {
      tipo: u < TERRENO.probLluvia ? 'lluvia' : 'barro',
      x: ox + T * (0.25 + 0.5 * azar(s, cx, cy, 2)),
      y: oy + T * (0.25 + 0.5 * azar(s, cx, cy, 3)),
      r: 140 + 110 * azar(s, cx, cy, 4),
      id: clave,
    };
  }

  // Grada (un rectángulo, horizontal o vertical)
  if (azar(s, cx, cy, 5) < TERRENO.probGrada) {
    const largo = 150 + 150 * azar(s, cx, cy, 6);
    const ancho = 56;
    const horizontal = azar(s, cx, cy, 7) < 0.5;
    const w = horizontal ? largo : ancho;
    const h = horizontal ? ancho : largo;
    const x = ox + T * (0.15 + 0.7 * azar(s, cx, cy, 8));
    const y = oy + T * (0.15 + 0.7 * azar(s, cx, cy, 9));
    // Sin gradas encima del punto de salida
    if (Math.hypot(x, y) - Math.max(w, h) / 2 > TERRENO.claroInicial) {
      c.grada = { x, y, w, h, id: clave, semilla: Math.floor(azar(s, cx, cy, 10) * 1e6) };
    }
  }
  t.celdas.set(clave, c);
  if (t.celdas.size > 4000) t.celdas.delete(t.celdas.keys().next().value);
  return c;
}

const celdaDe = (v) => Math.floor(v / TERRENO.celda);

/** Zona en la que está el punto: 'barro', 'lluvia' o null. */
export function zonaEn(t, x, y) {
  const cx = celdaDe(x);
  const cy = celdaDe(y);
  for (let i = cx - 1; i <= cx + 1; i += 1) {
    for (let k = cy - 1; k <= cy + 1; k += 1) {
      const z = celda(t, i, k).zona;
      if (z && (x - z.x) ** 2 + (y - z.y) ** 2 <= z.r * z.r) return z.tipo;
    }
  }
  return null;
}

/** Llama a `fn` con cada grada de las celdas que rodean el punto. */
export function gradasCerca(t, x, y, fn) {
  const cx = celdaDe(x);
  const cy = celdaDe(y);
  for (let i = cx - 1; i <= cx + 1; i += 1) {
    for (let k = cy - 1; k <= cy + 1; k += 1) {
      const g = celda(t, i, k).grada;
      if (g) fn(g);
    }
  }
}

/** Zonas y gradas que caen dentro del rectángulo [x0,x1]×[y0,y1] (para dibujarlas). */
export function visibles(t, x0, y0, x1, y1, margen = 260) {
  const zonas = [];
  const gradas = [];
  for (let cx = celdaDe(x0 - margen); cx <= celdaDe(x1 + margen); cx += 1) {
    for (let cy = celdaDe(y0 - margen); cy <= celdaDe(y1 + margen); cy += 1) {
      const c = celda(t, cx, cy);
      if (c.zona) zonas.push(c.zona);
      if (c.grada) gradas.push(c.grada);
    }
  }
  return { zonas, gradas };
}

/**
 * Saca a la entidad (círculo `x, y, r`) de las gradas. Devuelve true si ha chocado con alguna.
 * Si se indica un objetivo (`tx`, `ty`) y `deslizar` > 0, además la empuja de lado, hacia donde
 * está el objetivo, para que los rivales rodeen la grada en vez de quedarse pegados a ella.
 */
export function resolver(t, ent, tx = 0, ty = 0, deslizar = 0) {
  let choco = false;
  gradasCerca(t, ent.x, ent.y, (g) => {
    const hx = g.w / 2;
    const hy = g.h / 2;
    const px = Math.max(g.x - hx, Math.min(ent.x, g.x + hx));
    const py = Math.max(g.y - hy, Math.min(ent.y, g.y + hy));
    let dx = ent.x - px;
    let dy = ent.y - py;
    const d2 = dx * dx + dy * dy;
    if (d2 >= ent.r * ent.r) return;
    choco = true;
    let nx;
    let ny;
    if (d2 > 1e-9) {
      const d = Math.sqrt(d2);
      nx = dx / d;
      ny = dy / d;
      ent.x = px + nx * ent.r;
      ent.y = py + ny * ent.r;
    } else {
      // El centro está dentro de la grada: se sale por el lado más cercano
      const sx = ent.x < g.x ? -1 : 1;
      const sy = ent.y < g.y ? -1 : 1;
      const salX = hx - Math.abs(ent.x - g.x);
      const salY = hy - Math.abs(ent.y - g.y);
      if (salX < salY) { nx = sx; ny = 0; ent.x = g.x + sx * (hx + ent.r); } else { nx = 0; ny = sy; ent.y = g.y + sy * (hy + ent.r); }
    }
    if (deslizar > 0) {
      // Tangente a la pared, en el sentido que acerca al objetivo
      let tgx = -ny;
      let tgy = nx;
      if (tgx * (tx - ent.x) + tgy * (ty - ent.y) < 0) { tgx = -tgx; tgy = -tgy; }
      ent.x += tgx * deslizar;
      ent.y += tgy * deslizar;
    }
  });
  return choco;
}

/** ¿El círculo (x, y, r) toca alguna grada? (para balones). */
export function tocaGrada(t, x, y, r = 0) {
  let toca = false;
  gradasCerca(t, x, y, (g) => {
    if (toca) return;
    const px = Math.max(g.x - g.w / 2, Math.min(x, g.x + g.w / 2));
    const py = Math.max(g.y - g.h / 2, Math.min(y, g.y + g.h / 2));
    if ((x - px) ** 2 + (y - py) ** 2 <= r * r) toca = true;
  });
  return toca;
}
