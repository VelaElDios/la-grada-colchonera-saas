// Habilidades de los jefes. Cada uno tiene su estilo y se vuelve más peligroso en tres fases
// (por encima del 66 % de vida, del 33 % y por debajo): más habilidades, menos espera y más velocidad.
//  · Guardiola: «rondo» (cerco de rivales), pases en círculo, tiki-taka y una espiral de balones.
//  · Mourinho: «autobús» (ondas de choque, muro de defensas y una embestida del autobús).
//  · Cristiano: abanicos y ráfagas de tiros, y «Siuuu»: un salto que cae donde estabas.
//  · Messi: embestidas encadenadas, balones con rosca y una nube de extremos.
//  · Vinicius: embestidas en zigzag, rosca y ráfagas.   · Yamal: rosca, tiki-taka y extremos.
//  · Neymar: lluvia de impactos, saltos y espirales.    · Bale: cañonazos enormes y arrancadas de velocista.
//  · Benzema: disparos de precisión y rondos.           · Suárez: mordiscos (embestida + pulso), murallas y autobús.
import { JEFES, JUGADOR, MUNDO } from './config.js';
import { crearEnemigo } from './oleadas.js';
import { normalizar } from './util.js';

const MAX_DISPAROS = 90;
const MULT_VEL = [1, 1, 1.12, 1.3]; // por fase (el índice 0 no se usa)
const MULT_ESPERA = [1, 1, 0.8, 0.62];

export function dispararAlJugador(mundo, e, angulo, velocidad = 250, danoRel = 0.7, extra = {}) {
  if (mundo.disparosEnemigos.length >= MAX_DISPAROS) return;
  mundo.disparosEnemigos.push({
    x: e.x, y: e.y, vx: Math.cos(angulo) * velocidad, vy: Math.sin(angulo) * velocidad,
    r: 8, dano: Math.max(1, Math.round(e.dano * danoRel)), vida: 3.2, rot: 0, giro: 0, ...extra,
  });
}

/** Resta vida al jugador teniendo en cuenta la armadura. Devuelve el daño aplicado. */
export function danarJugador(mundo, cantidad) {
  const j = mundo.jugador;
  if (j.escudo > 0) { // la barrera absorbe el golpe
    j.invul = 0.15;
    mundo.eventos.push({ tipo: 'escudo' });
    return 0;
  }
  if (j.guantes && j.guantes.cargas > 0) { // Guante de Oro: una carga detiene el golpe entero
    j.guantes.cargas -= 1;
    j.invul = 0.7;
    mundo.eventos.push({ tipo: 'escudo' });
    mundo.ondas.push({ x: j.x, y: j.y, radio: 70, vida: 0.35, total: 0.35, color: '#ffd166' });
    return 0;
  }
  const real = Math.max(1, Math.round(cantidad * (1 - j.mult.armadura)));
  j.vida -= real;
  j.invul = JUGADOR.invulnerabilidad;
  j.flash = 0.18;
  if (real >= j.vidaMax * 0.12) mundo.congelar = Math.max(mundo.congelar, 0.07); // los golpes fuertes se notan
  mundo.sacudida = Math.max(mundo.sacudida, 0.2);
  mundo.eventos.push({ tipo: 'dano' });
  return real;
}

const programar = (e, t, hacer) => e.cola.push({ t, hacer });

function golpePulso(mundo, e, radio, relativo = 0.9) {
  const j = mundo.jugador;
  mundo.ondas.push({ x: e.x, y: e.y, radio, vida: 0.5, total: 0.5, enemiga: true });
  mundo.sacudida = Math.max(mundo.sacudida, 0.25);
  const d = Math.hypot(j.x - e.x, j.y - e.y);
  if (d <= radio + j.r && j.invul <= 0) danarJugador(mundo, Math.round(e.dano * relativo));
}

/** Golpe en un punto fijo (el aterrizaje de Cristiano). */
function golpeEn(mundo, e, x, y, radio) {
  const j = mundo.jugador;
  mundo.ondas.push({ x, y, radio, vida: 0.5, total: 0.5, enemiga: true });
  mundo.sacudida = Math.max(mundo.sacudida, 0.3);
  if (Math.hypot(j.x - x, j.y - y) <= radio + j.r && j.invul <= 0) danarJugador(mundo, Math.round(e.dano * 1.1));
}

function anillo(mundo, e, n, velocidad, giroInicial = 0, danoRel = 0.6) {
  for (let i = 0; i < n; i += 1) dispararAlJugador(mundo, e, giroInicial + (i / n) * Math.PI * 2, velocidad, danoRel);
}

const haciaJugador = (mundo, e) => Math.atan2(mundo.jugador.y - e.y, mundo.jugador.x - e.x);

function invocar(mundo, equipo, x, y) {
  if (mundo.enemigos.length >= MUNDO.maxEnemigos) return;
  mundo.enemigos.push(crearEnemigo(equipo, x, y, mundo.oleada));
}

// ---------------------------------------------------------------------------------------------
// Habilidades sueltas (cada jefe elige entre ellas según su fase)
// ---------------------------------------------------------------------------------------------

const HABILIDADES = {
  // Guardiola
  rondo(mundo, e, def, n = 8) {
    const j = mundo.jugador;
    const equipo = mundo.rng.siguiente() < 0.5 ? 'barca' : 'madrid';
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * Math.PI * 2;
      invocar(mundo, equipo, j.x + Math.cos(a) * 300, j.y + Math.sin(a) * 300);
    }
    mundo.avisosJefe.push({ x: j.x, y: j.y, radio: 300, vida: 0.5, total: 0.5, tipo: 'cerco' });
    mundo.eventos.push({ tipo: 'aviso', texto: '¡Rondo!' });
  },
  rondoDoble(mundo, e, def) {
    HABILIDADES.rondo(mundo, e, def, 14);
  },
  pases(mundo, e) {
    anillo(mundo, e, 12, 175, mundo.rng.rango(0, 6.28));
    programar(e, 0.55, () => anillo(mundo, e, 12, 175, mundo.rng.rango(0, 6.28)));
  },
  tikitaka(mundo, e) {
    for (let k = 0; k < 3; k += 1) {
      programar(e, k * 0.38, () => {
        const a = haciaJugador(mundo, e);
        for (let d = -1; d <= 1; d += 1) dispararAlJugador(mundo, e, a + d * 0.14, 285, 0.7);
        mundo.eventos.push({ tipo: 'chute' });
      });
    }
  },
  espiral(mundo, e) {
    let a = mundo.rng.rango(0, 6.28);
    for (let k = 0; k < 24; k += 1) {
      programar(e, k * 0.12, () => {
        a += 0.55;
        dispararAlJugador(mundo, e, a, 190, 0.55);
        dispararAlJugador(mundo, e, a + Math.PI, 190, 0.55);
      });
    }
  },

  // Mourinho
  pulso(mundo, e, def) {
    mundo.avisosJefe.push({ x: e.x, y: e.y, radio: def.radioPulso, vida: 1.0, total: 1.0, tipo: 'pulso', seguir: e });
    programar(e, 1.0, () => golpePulso(mundo, e, def.radioPulso));
  },
  pulsoDoble(mundo, e, def) {
    HABILIDADES.pulso(mundo, e, def);
    programar(e, 1.05, () => {
      const r2 = def.radioPulso * 1.7;
      mundo.avisosJefe.push({ x: e.x, y: e.y, radio: r2, vida: 0.75, total: 0.75, tipo: 'pulso', seguir: e });
      programar(e, 0.75, () => golpePulso(mundo, e, r2, 0.8));
    });
  },
  muro(mundo, e) {
    // Una línea de defensas gigantes entre él y tú
    const [nx, ny] = normalizar(mundo.jugador.x - e.x, mundo.jugador.y - e.y);
    const cx = e.x + nx * 170;
    const cy = e.y + ny * 170;
    for (let i = -2; i <= 2; i += 1) invocar(mundo, 'united', cx - ny * i * 44, cy + nx * i * 44);
    mundo.eventos.push({ tipo: 'aviso', texto: '¡Aparca el autobús!' });
  },
  autobus(mundo, e) {
    const [dx, dy] = normalizar(mundo.jugador.x - e.x, mundo.jugador.y - e.y);
    e.dirX = dx;
    e.dirY = dy;
    e.estado = 'preparar';
    e.carga = 0.9;
    e.largoAviso = 330;
    e.velEmbestida = 380;
    e.duracionEmbestida = 0.85;
    e.cierre = 'pulso';
    e.radioCierre = 170;
    e.opts = null;
    e.pendientes = 0;
  },

  // Cristiano
  abanico(mundo, e, def, n = 5) {
    const a = haciaJugador(mundo, e);
    const mitad = (n - 1) / 2;
    for (let k = -mitad; k <= mitad; k += 1) dispararAlJugador(mundo, e, a + k * 0.16, 265);
    mundo.eventos.push({ tipo: 'chute' });
  },
  abanico7(mundo, e, def) {
    HABILIDADES.abanico(mundo, e, def, 7);
  },
  rafaga(mundo, e) {
    for (let k = 0; k < 4; k += 1) {
      programar(e, k * 0.22, () => {
        const a = haciaJugador(mundo, e);
        dispararAlJugador(mundo, e, a - 0.08, 330, 0.65);
        dispararAlJugador(mundo, e, a + 0.08, 330, 0.65);
        mundo.eventos.push({ tipo: 'chute' });
      });
    }
  },
  siu(mundo, e, def) {
    saltar(mundo, e);
    e.pendientes = 0;
  },
  siuDoble(mundo, e) {
    saltar(mundo, e);
    e.pendientes = 1;
  },

  // Messi
  embestida(mundo, e) {
    prepararEmbestida(mundo, e, 0.5);
    e.pendientes = 0;
  },
  embestida2(mundo, e) {
    prepararEmbestida(mundo, e, 0.5);
    e.pendientes = 1;
  },
  embestida3(mundo, e) {
    prepararEmbestida(mundo, e, 0.45);
    e.pendientes = 2;
  },
  rosca(mundo, e) {
    const a = haciaJugador(mundo, e);
    for (let k = -2; k <= 2; k += 1) {
      dispararAlJugador(mundo, e, a + k * 0.38, 250, 0.65, { giro: -k * 0.55 }); // salen abiertos y se cierran
    }
    mundo.eventos.push({ tipo: 'chute' });
  },
  nube(mundo, e) {
    const j = mundo.jugador;
    const base = mundo.rng.rango(0, 6.28);
    for (let i = 0; i < 5; i += 1) {
      const a = base + (i / 5) * Math.PI * 2;
      invocar(mundo, 'psg', j.x + Math.cos(a) * 340, j.y + Math.sin(a) * 340);
    }
    mundo.eventos.push({ tipo: 'aviso', texto: '¡Extremos!' });
  },

  // Vinicius
  zigzag(mundo, e) {
    prepararEmbestida(mundo, e, 0.45, { desvio: 0.5, zig: true, vel: 520, dur: 0.5 });
    e.pendientes = 2;
  },
  // Neymar
  lluvia(mundo, e) {
    const j = mundo.jugador;
    const n = e.fase >= 3 ? 8 : e.fase === 2 ? 6 : 4;
    for (let i = 0; i < n; i += 1) {
      const a = mundo.rng.rango(0, Math.PI * 2);
      const d = i === 0 ? 0 : mundo.rng.rango(40, 230);
      const x = j.x + Math.cos(a) * d;
      const y = j.y + Math.sin(a) * d;
      const t = 0.9 + i * 0.12;
      mundo.avisosJefe.push({ x, y, radio: 75, vida: t, total: t, tipo: 'impacto' });
      programar(e, t, () => golpeEn(mundo, e, x, y, 75));
    }
    mundo.eventos.push({ tipo: 'aviso', texto: '¡Bicicletas!' });
  },
  // Bale
  arrancada(mundo, e) {
    prepararEmbestida(mundo, e, 0.55, { vel: 760, dur: 0.6, largo: 460, cierre: null });
    e.pendientes = 0;
  },
  canon(mundo, e) {
    dispararAlJugador(mundo, e, haciaJugador(mundo, e), 340, 1.2, { r: 18, vida: 4 });
    mundo.eventos.push({ tipo: 'cantico' });
  },
  canonTriple(mundo, e) {
    for (let k = 0; k < 3; k += 1) {
      programar(e, k * 0.35, () => {
        dispararAlJugador(mundo, e, haciaJugador(mundo, e), 360, 1.2, { r: 18, vida: 4 });
        mundo.eventos.push({ tipo: 'cantico' });
      });
    }
  },
  // Benzema
  precision(mundo, e, def, n = 3) {
    for (let k = 0; k < n; k += 1) {
      programar(e, k * 0.28, () => {
        dispararAlJugador(mundo, e, haciaJugador(mundo, e), 470, 0.9);
        mundo.eventos.push({ tipo: 'chute' });
      });
    }
  },
  precisionDoble(mundo, e, def) {
    HABILIDADES.precision(mundo, e, def, 6);
  },
  // Suárez
  mordisco(mundo, e, def) {
    prepararEmbestida(mundo, e, 0.4, { vel: 560, dur: 0.55, largo: 300, cierre: 'pulso', radioCierre: def.radioPulso });
    e.pendientes = 0;
  },
  mordisco2(mundo, e, def) {
    prepararEmbestida(mundo, e, 0.4, { vel: 560, dur: 0.55, largo: 300, cierre: 'pulso', radioCierre: def.radioPulso });
    e.pendientes = 1;
  },
};

// ---------------------------------------------------------------------------------------------
// Movimientos propios del jefe (saltos y embestidas)
// ---------------------------------------------------------------------------------------------

/**
 * Prepara una embestida hacia el jugador. Opciones `o`: desvio (ángulo), zig (alterna el desvío en cadena),
 * vel, dur, largo (del aviso), cierre ('pulso' | 'anillo' | null) y radioCierre.
 */
function prepararEmbestida(mundo, e, espera, o = {}) {
  const [dx0, dy0] = normalizar(mundo.jugador.x - e.x, mundo.jugador.y - e.y);
  const a = Math.atan2(dy0, dx0) + (o.desvio ?? 0);
  e.dirX = Math.cos(a);
  e.dirY = Math.sin(a);
  e.estado = 'preparar';
  e.carga = espera;
  e.largoAviso = o.largo ?? 340;
  e.velEmbestida = (o.vel ?? 470) * MULT_VEL[e.fase];
  e.duracionEmbestida = o.dur ?? 0.7;
  e.cierre = o.cierre !== undefined ? o.cierre : (e.fase >= 2 ? 'anillo' : null);
  e.radioCierre = o.radioCierre ?? 170;
  e.opts = o;
}

function saltar(mundo, e) {
  const j = mundo.jugador;
  e.estado = 'salto';
  e.duracionSalto = 0.9;
  e.carga = e.duracionSalto;
  e.sx = e.x;
  e.sy = e.y;
  // Cae donde estás ahora (si te mueves, lo esquivas)
  e.tx = j.x;
  e.ty = j.y;
  mundo.avisosJefe.push({ x: e.tx, y: e.ty, radio: 130, vida: e.duracionSalto, total: e.duracionSalto, tipo: 'impacto' });
}

/** Devuelve true mientras el jefe se mueve por su cuenta (y por tanto no persigue al jugador). */
function moverPropio(mundo, e, dt) {
  const def = JEFES[e.jefe];
  if (e.estado === 'preparar') {
    e.carga -= dt;
    if (e.carga <= 0) {
      e.estado = 'embestida';
      e.carga = e.duracionEmbestida;
    }
    return true;
  }
  if (e.estado === 'embestida') {
    e.carga -= dt;
    e.x += e.dirX * e.velEmbestida * dt;
    e.y += e.dirY * e.velEmbestida * dt;
    if (e.carga <= 0) {
      e.estado = 'normal';
      if (e.cierre === 'pulso') golpePulso(mundo, e, e.radioCierre ?? 170);
      if (e.cierre === 'anillo') anillo(mundo, e, 8, 210, mundo.rng.rango(0, 6.28), 0.55);
      if (e.pendientes > 0) {
        e.pendientes -= 1;
        const o = e.opts ?? {};
        prepararEmbestida(mundo, e, 0.32, o.zig ? { ...o, desvio: -o.desvio } : o);
      } else {
        e.cd = def.cada * MULT_ESPERA[e.fase];
      }
    }
    return true;
  }
  if (e.estado === 'salto') {
    e.carga -= dt;
    const k = Math.min(1, 1 - e.carga / e.duracionSalto);
    e.x = e.sx + (e.tx - e.sx) * k;
    e.y = e.sy + (e.ty - e.sy) * k;
    e.altura = Math.sin(Math.PI * k);
    if (e.carga <= 0) {
      e.estado = 'normal';
      e.altura = 0;
      golpeEn(mundo, e, e.tx, e.ty, 130);
      if (e.pendientes > 0) {
        e.pendientes -= 1;
        saltar(mundo, e);
      } else {
        e.cd = def.cada * MULT_ESPERA[e.fase];
      }
    }
    return true;
  }
  return false;
}

// Qué habilidades usa cada jefe en cada fase (se van turnando en orden)
const PLAN = {
  guardiola: { 1: ['rondo', 'pases'], 2: ['rondo', 'tikitaka', 'pases'], 3: ['rondoDoble', 'tikitaka', 'espiral'] },
  mourinho: { 1: ['pulso', 'muro'], 2: ['pulsoDoble', 'muro', 'autobus'], 3: ['autobus', 'pulsoDoble', 'muro', 'autobus'] },
  cristiano: { 1: ['abanico', 'siu'], 2: ['abanico', 'rafaga', 'siu'], 3: ['abanico7', 'siuDoble', 'rafaga'] },
  messi: { 1: ['embestida', 'rosca'], 2: ['embestida2', 'rosca', 'embestida'], 3: ['embestida3', 'rosca', 'nube'] },
  vinicius: { 1: ['zigzag', 'abanico'], 2: ['zigzag', 'rosca', 'embestida2'], 3: ['zigzag', 'embestida3', 'rafaga', 'nube'] },
  yamal: { 1: ['rosca', 'tikitaka'], 2: ['rosca', 'nube', 'embestida'], 3: ['rosca', 'tikitaka', 'nube', 'embestida2'] },
  neymar: { 1: ['lluvia', 'siu'], 2: ['lluvia', 'espiral', 'siuDoble'], 3: ['lluvia', 'siuDoble', 'espiral', 'abanico7'] },
  bale: { 1: ['canon', 'arrancada'], 2: ['canon', 'arrancada', 'abanico'], 3: ['canonTriple', 'arrancada', 'siu', 'canon'] },
  benzema: { 1: ['precision', 'rondo'], 2: ['precision', 'tikitaka', 'rondo'], 3: ['precisionDoble', 'rondoDoble', 'tikitaka'] },
  suarez: { 1: ['mordisco', 'pulso'], 2: ['mordisco', 'pulsoDoble', 'muro'], 3: ['mordisco2', 'pulsoDoble', 'autobus', 'muro'] },
};

const faseSegunVida = (e) => (e.vida > e.vidaMax * 0.66 ? 1 : e.vida > e.vidaMax * 0.33 ? 2 : 3);

/**
 * Actualiza al jefe `e`. Devuelve true si se ha movido por su cuenta (salto, embestida) y por tanto
 * no debe seguir al jugador este fotograma.
 */
export function actualizarJefe(mundo, e, dt) {
  const def = JEFES[e.jefe];
  if (!e.velBase) e.velBase = e.vel;

  // Cambio de fase: se enfada, suelta una onda y se toma un respiro antes de la siguiente habilidad
  const fase = faseSegunVida(e);
  if (fase > e.fase) {
    e.fase = fase;
    e.cd = 1.4;
    e.cola.length = 0;
    e.estado = 'normal';
    e.altura = 0;
    e.vel = e.velBase * MULT_VEL[fase];
    mundo.ondas.push({ x: e.x, y: e.y, radio: 220, vida: 0.6, total: 0.6, enemiga: true });
    mundo.sacudida = Math.max(mundo.sacudida, 0.35);
    mundo.eventos.push({ tipo: 'aviso', texto: `¡${def.nombre} se enfada!`, jefe: true });
  }

  // Acciones programadas (disparos escalonados, segundas ondas...)
  for (let i = 0; i < e.cola.length; i += 1) e.cola[i].t -= dt;
  while (e.cola.length && e.cola.some((a) => a.t <= 0)) {
    const k = e.cola.findIndex((a) => a.t <= 0);
    const [accion] = e.cola.splice(k, 1);
    accion.hacer();
  }

  if (moverPropio(mundo, e, dt)) return true;

  e.cd -= dt;
  if (e.cd <= 0) {
    const plan = PLAN[e.jefe][e.fase];
    const nombre = plan[e.rotacion % plan.length];
    e.rotacion += 1;
    e.cd = def.cada * MULT_ESPERA[e.fase];
    HABILIDADES[nombre](mundo, e, def);
  }
  return false;
}
