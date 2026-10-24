// Terreno del campo: zonas de barro y de lluvia, y gradas que hacen de obstáculo.
// El campo es infinito, pero siempre es el mismo para una semilla: se calcula con un «hash» por celda,
// sin guardar nada. Es lógica pura (sin DOM), así que se puede probar con node:test.
import { TERRENO, BIOMAS } from './config.js';

/** Número pseudoaleatorio estable (0..1) para la celda (cx, cy), la semilla y un «canal» distinto por cosa. */
function azar(semilla, cx, cy, canal) {
  let h = Math.imul(cx * 374761393 + cy * 668265263 + canal * 2246822519 + Math.imul(semilla, 1597334677), 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function crearTerreno(semilla = 1) {
  return { semilla: (semilla >>> 0) % 2147483647, celdas: new Map() };
}

// Grosor de cada pieza. La grada es gruesa y alta; el cartel, fino.
const G = 72;
const C = 22;

/** Bioma de la celda: se decide por «regiones» de 3×3 celdas, así que el campo cambia de aspecto por tramos. */
export function biomaDe(t, cx, cy) {
  const u = azar(t.semilla, Math.floor(cx / 3), Math.floor(cy / 3), 50);
  let acum = 0;
  for (const [nombre, b] of Object.entries(BIOMAS)) {
    acum += b.peso;
    if (u < acum) return nombre;
  }
  return 'abierto';
}

// Piezas (en coordenadas locales: el centro de cada rectángulo dentro de una caja w×h)
const pieza = (tipo, x, y, w, h) => ({ tipo, x, y, w, h });

/** Gira 90° (a derechas) una estructura `veces` veces. */
function girar(est, veces) {
  let e = est;
  for (let k = 0; k < (veces & 3); k += 1) {
    const { w, h } = e;
    e = {
      w: h,
      h: w,
      obs: e.obs.map((o) => ({ ...o, x: h - o.y, y: o.x, w: o.h, h: o.w })),
      decor: e.decor.map((d) => ({ ...d, x: h - d.y, y: d.x, w: d.h, h: d.w })),
    };
  }
  return e;
}

const ESTRUCTURAS = {
  /** Muro de gradas que corta el paso; a veces con una puerta por la que hay que pasar. */
  muralla(r) {
    const L = 340 + 180 * r();
    if (r() < 0.55) {
      const puerta = 140 + 30 * r();
      const a = (L - puerta) * (0.35 + 0.3 * r());
      const b = L - puerta - a;
      return { w: L, h: G, obs: [pieza('grada', a / 2, G / 2, a, G), pieza('grada', L - b / 2, G / 2, b, G)], decor: [] };
    }
    return { w: L, h: G, obs: [pieza('grada', L / 2, G / 2, L, G)], decor: [] };
  },
  /** Corral en U: grada al fondo y carteles a los lados. Está abierto por un solo lado. */
  corral(r) {
    const L = 300 + 90 * r();
    const D = 230 + 60 * r();
    return {
      w: L,
      h: D,
      obs: [pieza('grada', L / 2, G / 2, L, G), pieza('cartel', C / 2, (G + D) / 2, C, D - G), pieza('cartel', L - C / 2, (G + D) / 2, C, D - G)],
      decor: [],
    };
  },
  /** Dos gradas paralelas: un pasillo estrecho que embudo para los rivales. */
  pasillo(r) {
    const L = 380 + 120 * r();
    const hueco = 150 + 40 * r();
    return {
      w: L,
      h: 2 * G + hueco,
      obs: [pieza('grada', L / 2, G / 2, L, G), pieza('grada', L / 2, G + hueco + G / 2, L, G)],
      decor: [],
    };
  },
  /** Carteles publicitarios en zigzag: hay que serpentear. */
  hilera(r) {
    const w = 110 + 20 * r();
    const sep = 80;
    const desnivel = 80;
    const obs = [];
    for (let i = 0; i < 3; i += 1) obs.push(pieza('cartel', w / 2 + i * (w + sep), C / 2 + (i % 2) * desnivel, w, C));
    return { w: 3 * w + 2 * sep, h: C + desnivel, obs, decor: [] };
  },
  /** Mini campo de entrenamiento: dos porterías enfrentadas y líneas pintadas en el suelo. */
  miniCampo(r) {
    const W = 300;
    const H = 400;
    return {
      w: W,
      h: H,
      obs: [pieza('porteria', W / 2, 22, 130, 34), pieza('porteria', W / 2, H - 22, 130, 34)],
      decor: [
        { tipo: 'marca', x: W / 2, y: H / 2, w: W, h: H },
        { tipo: 'conos', x: 30, y: 60, w: 0, h: 0, n: 3, dx: 0, dy: 36 },
        { tipo: 'conos', x: W - 30, y: H - 60, w: 0, h: 0, n: 3, dx: 0, dy: -36 },
      ].slice(0, r() < 0.5 ? 3 : 1),
    };
  },
  /** Banquillos con su cartel detrás. */
  banquillos(r) {
    const w = 160 + 20 * r();
    const sep = 110;
    return {
      w: 2 * w + sep,
      h: 44,
      obs: [pieza('banquillo', w / 2, 22, w, 44), pieza('banquillo', w * 1.5 + sep, 22, w, 44)],
      decor: [],
    };
  },
  /** Un foco alto de estadio. */
  foco() {
    return { w: 44, h: 44, obs: [pieza('foco', 22, 22, 44, 44)], decor: [] };
  },
};

function elegir(pesos, u) {
  let acum = 0;
  for (const [nombre, p] of Object.entries(pesos)) {
    acum += p;
    if (u < acum) return nombre;
  }
  return Object.keys(pesos)[0];
}

/** Distancia del origen (el punto de salida) a un rectángulo. */
function distOrigen(o) {
  const dx = Math.max(Math.abs(o.x) - o.w / 2, 0);
  const dy = Math.max(Math.abs(o.y) - o.h / 2, 0);
  return Math.hypot(dx, dy);
}

const ALTO_DE = { grada: 28, cartel: 16, porteria: 46, banquillo: 30, foco: 120 };

/** Contenido de la celda (cx, cy): bioma, zona, obstáculos y adornos. Se calcula una vez y se guarda. */
export function celda(t, cx, cy) {
  const clave = `${cx},${cy}`;
  let c = t.celdas.get(clave);
  if (c) return c;
  const T = TERRENO.celda;
  const s = t.semilla;
  const ox = cx * T;
  const oy = cy * T;
  const bioma = biomaDe(t, cx, cy);
  const B = BIOMAS[bioma];
  let canal = 100;
  const r = () => azar(s, cx, cy, canal++);
  c = { cx, cy, bioma, zona: null, obstaculos: [], decor: [] };

  // Zona de lluvia o de barro (un círculo)
  const u = azar(s, cx, cy, 1);
  if (u < B.lluvia + B.barro) {
    c.zona = {
      tipo: u < B.lluvia ? 'lluvia' : 'barro',
      x: ox + T * (0.25 + 0.5 * azar(s, cx, cy, 2)),
      y: oy + T * (0.25 + 0.5 * azar(s, cx, cy, 3)),
      r: 140 + 110 * azar(s, cx, cy, 4),
      id: clave,
    };
  }

  const meter = (est, id) => {
    const margen = 40;
    const x0 = ox + margen + r() * Math.max(0, T - est.w - 2 * margen);
    const y0 = oy + margen + r() * Math.max(0, T - est.h - 2 * margen);
    const obs = est.obs.map((o, i) => ({ ...o, x: x0 + o.x, y: y0 + o.y, alto: ALTO_DE[o.tipo], id: `${clave}:${id}:${i}`, semilla: Math.floor(r() * 1e6) }));
    // Nada encima (ni pegado) del punto de salida
    if (obs.some((o) => distOrigen(o) < TERRENO.claroInicial)) return false;
    // Ni encima de lo que ya hay en la celda
    const choca = (a, b) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 + 30 && Math.abs(a.y - b.y) < (a.h + b.h) / 2 + 30;
    if (obs.some((o) => c.obstaculos.some((p) => choca(o, p)))) return false;
    obs.forEach((o) => c.obstaculos.push(o));
    est.decor.forEach((d, i) => c.decor.push({ ...d, x: x0 + d.x, y: y0 + d.y, id: `${clave}:${id}:d${i}`, semilla: Math.floor(r() * 1e6) }));
    // Debajo de lo gordo, una explanada de baldosas (estadio) o un parche de tierra (cantera)
    if (obs.some((o) => o.tipo === 'grada')) {
      const px = x0 + est.w / 2;
      const py = y0 + est.h / 2;
      if (bioma === 'estadio') c.decor.unshift({ tipo: 'losa', x: px, y: py, w: est.w + 90, h: est.h + 90, id: `${clave}:${id}:l`, semilla: Math.floor(r() * 1e6) });
      else if (bioma === 'cantera') c.decor.unshift({ tipo: 'parche', x: px, y: py, r: Math.max(est.w, est.h) * 0.62 + 40, color: 'tierra', id: `${clave}:${id}:p`, semilla: Math.floor(r() * 1e6) });
    }
    return true;
  };

  if (r() < B.estructura) {
    const nombre = elegir(B.pesos, r());
    let est = ESTRUCTURAS[nombre](r);
    // Porterías y banquillos solo se dan la vuelta (180°): de lado no se verían bien
    const libre = ['muralla', 'corral', 'pasillo', 'hilera'].includes(nombre);
    est = girar(est, libre ? Math.floor(r() * 4) : 2 * Math.floor(r() * 2));
    meter(est, nombre);
  }
  // Un foco suelto más en los campos con estadio
  if (B.focos > 0 && r() < B.focos) meter(ESTRUCTURAS.foco(r), 'foco');

  // Adornos sueltos
  if (r() < 0.3) {
    c.decor.unshift({ tipo: 'parche', x: ox + T * r(), y: oy + T * r(), r: 90 + 90 * r(), color: r() < 0.5 ? 'oscuro' : 'claro', id: `${clave}:pc`, semilla: Math.floor(r() * 1e6) });
  }
  if (r() < 0.22) c.decor.push({ tipo: 'balon', x: ox + T * (0.1 + 0.8 * r()), y: oy + T * (0.1 + 0.8 * r()), w: 0, h: 0, id: `${clave}:b`, semilla: Math.floor(r() * 1e6) });
  if (bioma === 'entrenamiento' && r() < 0.5) {
    c.decor.push({ tipo: 'conos', x: ox + T * (0.15 + 0.7 * r()), y: oy + T * (0.15 + 0.7 * r()), w: 0, h: 0, n: 4, dx: 34, dy: r() < 0.5 ? 0 : 34, id: `${clave}:c`, semilla: 0 });
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

/** Llama a `fn` con cada obstáculo de las celdas que rodean el punto. */
export function obstaculosCerca(t, x, y, fn) {
  const cx = celdaDe(x);
  const cy = celdaDe(y);
  for (let i = cx - 1; i <= cx + 1; i += 1) {
    for (let k = cy - 1; k <= cy + 1; k += 1) {
      for (const o of celda(t, i, k).obstaculos) fn(o);
    }
  }
}

/** Zonas, obstáculos y adornos que caen dentro del rectángulo [x0,x1]×[y0,y1] (para dibujarlas). */
export function visibles(t, x0, y0, x1, y1, margen = 260) {
  const zonas = [];
  const obstaculos = [];
  const decor = [];
  for (let cx = celdaDe(x0 - margen); cx <= celdaDe(x1 + margen); cx += 1) {
    for (let cy = celdaDe(y0 - margen); cy <= celdaDe(y1 + margen); cy += 1) {
      const c = celda(t, cx, cy);
      if (c.zona) zonas.push(c.zona);
      for (const o of c.obstaculos) obstaculos.push(o);
      for (const d of c.decor) decor.push(d);
    }
  }
  return { zonas, obstaculos, decor };
}

/**
 * Saca a la entidad (círculo `x, y, r`) de las gradas. Devuelve true si ha chocado con alguna.
 * Si se indica un objetivo (`tx`, `ty`) y `deslizar` > 0, además la empuja de lado, hacia donde
 * está el objetivo, para que los rivales rodeen la grada en vez de quedarse pegados a ella.
 */
export function resolver(t, ent, tx = 0, ty = 0, deslizar = 0) {
  let choco = false;
  let sumaNx = 0;
  let sumaNy = 0;
  obstaculosCerca(t, ent.x, ent.y, (g) => {
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
      // Tangente a la pared. La primera vez se elige el sentido que acerca al objetivo y después se mantiene
      // (`ent.rodeo`): así el rival sigue la pared hasta rodearla en vez de bailar dentro de un corral.
      let tgx = -ny;
      let tgy = nx;
      if (!ent.rodeo) ent.rodeo = tgx * (tx - ent.x) + tgy * (ty - ent.y) < 0 ? -1 : 1;
      tgx *= ent.rodeo;
      tgy *= ent.rodeo;
      sumaNx += nx; // normal de la(s) pared(es) que toca: el rival la sigue para rodearla (en una esquina, la media)
      sumaNy += ny;
      ent.x += tgx * deslizar;
      ent.y += tgy * deslizar;
    }
  });
  if (sumaNx || sumaNy) {
    const l = Math.hypot(sumaNx, sumaNy);
    ent.nx = sumaNx / l;
    ent.ny = sumaNy / l;
  }
  return choco;
}

/** ¿El círculo (x, y, r) toca alguna grada? (para balones). */
export function tocaGrada(t, x, y, r = 0) {
  let toca = false;
  obstaculosCerca(t, x, y, (g) => {
    if (toca) return;
    const px = Math.max(g.x - g.w / 2, Math.min(x, g.x + g.w / 2));
    const py = Math.max(g.y - g.h / 2, Math.min(y, g.y + g.h / 2));
    if ((x - px) ** 2 + (y - py) ** 2 <= r * r) toca = true;
  });
  return toca;
}

/** Compatibilidad con el nombre antiguo. */
export const gradasCerca = obstaculosCerca;

/** ¿Hay camino libre (sin gradas) desde (x, y) hacia (tx, ty) en los próximos `largo` píxeles? */
export function rayoLibre(t, x, y, tx, ty, largo = 400, r = 12) {
  const d = Math.hypot(tx - x, ty - y) || 1;
  const hasta = Math.min(largo, d);
  const ux = (tx - x) / d;
  const uy = (ty - y) / d;
  for (let s = 24; s <= hasta; s += 24) if (tocaGrada(t, x + ux * s, y + uy * s, r)) return false;
  return true;
}
