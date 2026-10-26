// Habilidades de los jefes. Cada uno tiene su estilo y se vuelve más peligroso en tres fases
// (por encima del 66 % de vida, del 33 % y por debajo): más habilidades, menos espera y más velocidad.
//  · Guardiola: «rondo» (cerco de rivales), pases en círculo, tiki-taka y una espiral de balones.
//  · Mourinho: «autobús» (ondas de choque, muro de defensas y una embestida del autobús).
//  · Cristiano: abanicos y ráfagas de tiros, y «Siuuu»: un salto que cae donde estabas.
//  · Messi: embestidas encadenadas, balones con rosca y una nube de extremos.
//  · Vinicius: embestidas en zigzag, rosca y ráfagas.   · Yamal: rosca, tiki-taka y extremos.
//  · Neymar: lluvia de impactos, saltos y espirales.    · Bale: cañonazos enormes y arrancadas de velocista.
//  · Benzema: disparos de precisión y rondos.           · Suárez: mordiscos (embestida + pulso), murallas y autobús.
// En la fase 3 cada uno saca su jugada estrella (ver PLAN). Además, desde el segundo jefe de la partida llegan
// con escolta (élites de su equipo, y refuerzos al cambiar de fase), y si tardas en ganarles pierden la paciencia
// (furia: más rápidos, más daño y menos espera).
import { JEFES, JUGADOR, MUNDO } from './config.js';
import { crearEnemigo } from './oleadas.js';
import { normalizar } from './util.js';

const MAX_DISPAROS = 90;
const MULT_VEL = [1, 1, 1.12, 1.3]; // por fase (el índice 0 no se usa)
const MULT_ESPERA = [1, 1, 0.8, 0.62];

export function dispararAlJugador(mundo, e, angulo, velocidad = 250, danoRel = 0.7, extra = {}) {
  if (mundo.disparosEnemigos.length >= MAX_DISPAROS) return null;
  const d = {
    x: e.x, y: e.y, vx: Math.cos(angulo) * velocidad, vy: Math.sin(angulo) * velocidad,
    r: 8, dano: Math.max(1, Math.round(e.dano * danoRel)), vida: 3.2, rot: 0, giro: 0, ...extra,
  };
  mundo.disparosEnemigos.push(d);
  return d;
}

/** Furia: cuánto se acortan las esperas del jefe enfadado. */
export const FURIA = { paciencia: 45, pacienciaPrimero: 70, vel: 1.2, dano: 1.15, espera: 0.75 };
/** Escolta: equipo de los élites que acompañan a cada jefe (según su club). */
const EQUIPO_ESCOLTA = { 'FC Barcelona': 'barca', 'Real Madrid': 'madrid', Brasil: 'psg' };

/** Resta vida al jugador teniendo en cuenta la armadura. Devuelve el daño aplicado. */
export function danarJugador(mundo, cantidad) {
  const j = mundo.jugador;
  if (j.escudo > 0) { // la barrera absorbe el golpe
    j.invul = 0.15;
    mundo.eventos.push({ tipo: 'escudo' });
    return 0;
  }
  if (j.guantes && j.guantes.cargas > 0) { // Paradón: una carga detiene el golpe entero
    j.guantes.cargas -= 1;
    j.invul = 0.7;
    mundo.eventos.push({ tipo: 'escudo' });
    mundo.ondas.push({ x: j.x, y: j.y, radio: 70, vida: 0.35, total: 0.35, color: '#ffd166' });
    return 0;
  }
  const real = Math.max(1, Math.round(cantidad * (1 - j.mult.armadura)));
  j.vida -= real;
  if (mundo.stats) {
    mundo.stats.recibido += real;
    mundo.stats.golpes += 1;
    if (mundo.stats.primerGolpe === null) mundo.stats.primerGolpe = mundo.tiempo;
  }
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

function invocar(mundo, equipo, x, y, elite = null) {
  if (mundo.enemigos.length >= MUNDO.maxEnemigos) return null;
  const r = crearEnemigo(equipo, x, y, mundo.oleada, elite);
  mundo.enemigos.push(r);
  return r;
}

/** Cuántos escoltas trae el jefe número `indice` de la partida (el primero, ninguno). */
export const escoltasDe = (indice) => (indice >= 1 ? Math.min(4, 1 + Math.floor(indice / 2)) : 0);

/** Élites de su equipo alrededor del jefe. */
function escoltar(mundo, e, n) {
  const equipo = EQUIPO_ESCOLTA[JEFES[e.jefe].equipo] ?? 'madrid';
  const tipos = e.indice >= 3 ? ['blindado', 'furia', 'veloz'] : ['blindado', 'veloz'];
  for (let i = 0; i < n; i += 1) {
    const a = (i / Math.max(1, n)) * Math.PI * 2 + mundo.rng.rango(0, 1);
    const r = invocar(mundo, equipo, e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 70, tipos[i % tipos.length]);
    if (r) r.escolta = e.id;
  }
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
  rosca(mundo, e, def, signo = 1) {
    const a = haciaJugador(mundo, e);
    for (let k = -2; k <= 2; k += 1) {
      dispararAlJugador(mundo, e, a + k * 0.38 * signo, 250, 0.65, { giro: -k * 0.55 * signo }); // salen abiertos y se cierran
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
  lluvia(mundo, e, def, n = e.fase >= 3 ? 8 : e.fase === 2 ? 6 : 4, alcance = 230, radio = 75, texto = '¡Bicicletas!') {
    const j = mundo.jugador;
    for (let i = 0; i < n; i += 1) {
      const a = mundo.rng.rango(0, Math.PI * 2);
      const d = i === 0 ? 0 : mundo.rng.rango(40, alcance);
      const x = j.x + Math.cos(a) * d;
      const y = j.y + Math.sin(a) * d;
      const t = 0.9 + i * 0.12;
      mundo.avisosJefe.push({ x, y, radio, vida: t, total: t, tipo: 'impacto' });
      programar(e, t, () => golpeEn(mundo, e, x, y, radio));
    }
    mundo.eventos.push({ tipo: 'aviso', texto });
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

  // --- Jugadas estrella (fase 3) -----------------------------------------------------------
  espiralTriple(mundo, e) { // Guardiola: tiki-taka infinito, tres brazos girando
    let a = mundo.rng.rango(0, 6.28);
    for (let k = 0; k < 30; k += 1) {
      programar(e, k * 0.1, () => {
        a += 0.42;
        for (let b = 0; b < 3; b += 1) dispararAlJugador(mundo, e, a + (b * Math.PI * 2) / 3, 200, 0.5);
      });
    }
    mundo.eventos.push({ tipo: 'aviso', texto: '¡Tiki-taka infinito!', jefe: true });
  },
  autobusDoble(mundo, e) { // Mourinho: dos autobuses seguidos
    HABILIDADES.autobus(mundo, e);
    e.opts = { largo: 330, vel: 380, dur: 0.85, cierre: 'pulso', radioCierre: 170 };
    e.pendientes = 1;
    mundo.eventos.push({ tipo: 'aviso', texto: '¡Doble autobús!', jefe: true });
  },
  siuTriple(mundo, e) { // Cristiano: tres saltos y cada caída suelta un anillo
    saltar(mundo, e);
    e.pendientes = 2;
    e.anilloAlCaer = true;
    mundo.eventos.push({ tipo: 'aviso', texto: '¡SIUUU!', jefe: true });
  },
  eslalon(mundo, e) { // Messi: cinco arrancadas encadenadas
    prepararEmbestida(mundo, e, 0.4, { vel: 540, dur: 0.45, largo: 260 });
    e.pendientes = 4;
    mundo.eventos.push({ tipo: 'aviso', texto: '¡Eslalon!', jefe: true });
  },
  samba(mundo, e) { // Vinicius: zigzag de cuatro con anillo en cada quiebro
    prepararEmbestida(mundo, e, 0.4, { desvio: 0.6, zig: true, vel: 560, dur: 0.45, cierre: 'anillo' });
    e.pendientes = 3;
    mundo.eventos.push({ tipo: 'aviso', texto: '¡Samba!', jefe: true });
  },
  roscaDoble(mundo, e, def) { // Yamal: roscas que se cruzan
    HABILIDADES.rosca(mundo, e, def, 1);
    programar(e, 0.3, () => HABILIDADES.rosca(mundo, e, def, -1));
    programar(e, 0.6, () => HABILIDADES.rosca(mundo, e, def, 1));
    mundo.eventos.push({ tipo: 'aviso', texto: '¡Roscas cruzadas!', jefe: true });
  },
  lluviaTotal(mundo, e, def) { // Neymar: lluvia de bicicletas por toda la zona
    HABILIDADES.lluvia(mundo, e, def, 14, 320, 85, '¡Lluvia de bicicletas!');
  },
  balonGigante(mundo, e) { // Bale: un balón enorme y lento que revienta en un anillo
    const p = dispararAlJugador(mundo, e, haciaJugador(mundo, e), 170, 1.5, { r: 34, vida: 6 });
    if (p) {
      programar(e, 1.6, () => {
        if (p.vida <= 0) return;
        p.vida = 0;
        anillo(mundo, { x: p.x, y: p.y, dano: e.dano }, 12, 230, mundo.rng.rango(0, 6.28), 0.6);
        mundo.ondas.push({ x: p.x, y: p.y, radio: 90, vida: 0.4, total: 0.4, enemiga: true });
        mundo.sacudida = Math.max(mundo.sacudida, 0.25);
      });
    }
    mundo.eventos.push({ tipo: 'aviso', texto: '¡Balón gigante!', jefe: true });
  },
  francotirador(mundo, e) { // Benzema: tres tiros rapidísimos, avisados con una línea láser
    for (let k = 0; k < 3; k += 1) {
      programar(e, k * 0.55, () => {
        const ang = haciaJugador(mundo, e);
        mundo.avisosJefe.push({ x: e.x, y: e.y, ang, largo: 760, vida: 0.6, total: 0.6, tipo: 'linea', seguir: e });
        programar(e, 0.6, () => {
          dispararAlJugador(mundo, e, ang, 640, 1.0, { r: 7 });
          mundo.eventos.push({ tipo: 'chute' });
        });
      });
    }
    mundo.eventos.push({ tipo: 'aviso', texto: '¡Francotirador!', jefe: true });
  },
  mordiscoTriple(mundo, e, def) { // Suárez: tres mordiscos seguidos
    prepararEmbestida(mundo, e, 0.4, { vel: 580, dur: 0.5, largo: 300, cierre: 'pulso', radioCierre: def.radioPulso });
    e.pendientes = 2;
    mundo.eventos.push({ tipo: 'aviso', texto: '¡Mordisco!', jefe: true });
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
        e.cd = espera(e, def);
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
      if (e.anilloAlCaer) anillo(mundo, e, 8, 200, mundo.rng.rango(0, 6.28), 0.5);
      if (e.pendientes > 0) {
        e.pendientes -= 1;
        saltar(mundo, e);
      } else {
        e.anilloAlCaer = false;
        e.cd = espera(e, def);
      }
    }
    return true;
  }
  return false;
}

// Qué habilidades usa cada jefe en cada fase (se van turnando en orden). La primera de la fase 3 es su jugada estrella.
export const PLAN = {
  guardiola: { 1: ['rondo', 'pases'], 2: ['rondo', 'tikitaka', 'pases'], 3: ['espiralTriple', 'rondoDoble', 'tikitaka', 'espiral'] },
  mourinho: { 1: ['pulso', 'muro'], 2: ['pulsoDoble', 'muro', 'autobus'], 3: ['autobusDoble', 'pulsoDoble', 'muro', 'autobus'] },
  cristiano: { 1: ['abanico', 'siu'], 2: ['abanico', 'rafaga', 'siu'], 3: ['siuTriple', 'abanico7', 'rafaga', 'siuDoble'] },
  messi: { 1: ['embestida', 'rosca'], 2: ['embestida2', 'rosca', 'embestida'], 3: ['eslalon', 'rosca', 'nube', 'embestida3'] },
  vinicius: { 1: ['zigzag', 'abanico'], 2: ['zigzag', 'rosca', 'embestida2'], 3: ['samba', 'embestida3', 'rafaga', 'nube'] },
  yamal: { 1: ['rosca', 'tikitaka'], 2: ['rosca', 'nube', 'embestida'], 3: ['roscaDoble', 'tikitaka', 'nube', 'embestida2'] },
  neymar: { 1: ['lluvia', 'siu'], 2: ['lluvia', 'espiral', 'siuDoble'], 3: ['lluviaTotal', 'siuDoble', 'espiral', 'abanico7'] },
  bale: { 1: ['canon', 'arrancada'], 2: ['canon', 'arrancada', 'abanico'], 3: ['balonGigante', 'arrancada', 'canonTriple', 'siu'] },
  benzema: { 1: ['precision', 'rondo'], 2: ['precision', 'tikitaka', 'rondo'], 3: ['francotirador', 'rondoDoble', 'precisionDoble', 'tikitaka'] },
  suarez: { 1: ['mordisco', 'pulso'], 2: ['mordisco', 'pulsoDoble', 'muro'], 3: ['mordiscoTriple', 'pulsoDoble', 'autobus', 'muro'] },
};

/** Habilidades que existen (para las pruebas). */
export const NOMBRES_HABILIDADES = Object.keys(HABILIDADES);

/** Espera hasta la siguiente habilidad: menos en fases altas y con furia. */
const espera = (e, def) => def.cada * MULT_ESPERA[e.fase] * (e.furia ? FURIA.espera : 1);

const faseSegunVida = (e) => (e.vida > e.vidaMax * 0.66 ? 1 : e.vida > e.vidaMax * 0.33 ? 2 : 3);

/**
 * Actualiza al jefe `e`. Devuelve true si se ha movido por su cuenta (salto, embestida) y por tanto
 * no debe seguir al jugador este fotograma.
 */
export function actualizarJefe(mundo, e, dt) {
  const def = JEFES[e.jefe];
  if (!e.velBase) e.velBase = e.vel;
  if (e.nacio === undefined) { // acaba de salir: llega con su escolta
    e.nacio = mundo.tiempo;
    const n = escoltasDe(e.indice ?? 0);
    if (n) escoltar(mundo, e, n);
  }

  // Si tardas mucho en ganarle, pierde la paciencia
  const paciencia = (e.indice ?? 0) === 0 ? FURIA.pacienciaPrimero : FURIA.paciencia;
  if (!e.furia && mundo.tiempo - e.nacio > paciencia) {
    e.furia = true;
    e.vel = e.velBase * MULT_VEL[e.fase] * FURIA.vel;
    e.dano = Math.round(e.dano * FURIA.dano);
    e.cd = Math.min(e.cd, 1);
    mundo.ondas.push({ x: e.x, y: e.y, radio: 260, vida: 0.7, total: 0.7, enemiga: true });
    mundo.sacudida = Math.max(mundo.sacudida, 0.4);
    mundo.eventos.push({ tipo: 'aviso', texto: `¡${def.nombre} pierde la paciencia!`, jefe: true });
  }

  // Cambio de fase: se enfada, suelta una onda y se toma un respiro antes de la siguiente habilidad
  const fase = faseSegunVida(e);
  if (fase > e.fase) {
    e.fase = fase;
    e.cd = 1.4;
    e.cola.length = 0;
    e.estado = 'normal';
    e.altura = 0;
    e.vel = e.velBase * MULT_VEL[fase] * (e.furia ? FURIA.vel : 1);
    e.rotacion = 0; // la primera habilidad de la fase nueva (en la 3, su jugada estrella)
    if ((e.indice ?? 0) >= 1) escoltar(mundo, e, 2); // refuerzos
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
    e.cd = espera(e, def);
    HABILIDADES[nombre](mundo, e, def);
  }
  return false;
}
