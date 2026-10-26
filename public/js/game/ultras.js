// ULTRAS: los seis poderes de leyenda. Se consiguen solos al juntar varias combinaciones (config.js → ULTRAS)
// y son los que permiten llegar a los minutos más altos. Aquí vive su simulación; render.js las dibuja.
import {
  ULTRAS, SINERGIAS, PASIVAS, ULTRA_PCT_JEFE,
} from './config.js';
import {
  danar, danoFijo, aturdir, quemar, crearParticulas,
} from './combate.js';
import { normalizar } from './util.js';

const MAX_FUEGOS = 44;

export function estadoUltras() {
  return {
    cometas: [], meteoros: [], estrellas: { ang: 0, nova: 0, t: 0 }, zamora: { t: 0, muro: 0, tick: 0 },
    fuego: { t: 0 }, magia: { t: 0, cd: 6, dur: 0, rastro: [], paso: 0 }, cadena: 0, flash: 0, colorFlash: '#ffffff', anuncio: 0,
  };
}

/** ¿Cuántas de las combinaciones de la lista cuentan? Devuelve true si la ultra está conseguida con ese conjunto. */
export function ultraConseguida(def, sinergias, totalArmas = Infinity) {
  if (totalArmas < (def.maestria ?? 0)) return false;
  const set = sinergias instanceof Set ? sinergias : new Set(sinergias);
  const hechas = def.de.filter((k) => set.has(k));
  if (hechas.length < def.cuantas) return false;
  const conArma = hechas.filter((k) => {
    const s = SINERGIAS[k];
    return s.distintas || Object.keys(s.requiere).some((c) => !PASIVAS[c]);
  });
  return conArma.length >= (def.minArmas ?? 0);
}

/** Claves de las ultras que se tienen con esa lista de combinaciones activas. */
export const ultrasPara = (sinergias, totalArmas = Infinity) => Object.keys(ULTRAS).filter((k) => ultraConseguida(ULTRAS[k], sinergias, totalArmas));

/** Suma de niveles de todas las armas del jugador (la «maestría»). */
export const nivelTotalArmas = (j) => Object.values(j.armas).reduce((s, a) => s + a.nivel, 0);

const enRadio = (mundo, x, y, radio, accion) => {
  mundo.cuadricula.cerca(x, y, radio + 30, (e) => {
    if (e.muerto) return;
    if ((e.x - x) ** 2 + (e.y - y) ** 2 > (radio + e.r) ** 2) return;
    accion(e);
  });
};

/**
 * Golpe de ultra: parte fija (con tus multiplicadores) + parte en % de la vida máxima del rival, que es lo que hace que
 * sigan sirviendo cuando los rivales tienen millones de vida (a los jefes les pega solo ULTRA_PCT_JEFE de ese %).
 */
export function golpeUltra(mundo, e, plano, pct, dir = null, empuje = 0, tipo = 'disparo') {
  if (e.muerto) return;
  if (plano > 0) danar(mundo, e, plano, dir, empuje, tipo);
  if (pct > 0 && !e.muerto) {
    const potencia = Math.sqrt(Math.max(1, mundo.jugador.mult.dano));
    danoFijo(mundo, e, Math.max(1, Math.round(pct * e.vidaMax * (e.jefe ? ULTRA_PCT_JEFE : 1) * potencia)), '#ffe9a8');
  }
}

const onda = (mundo, x, y, radio, color, vida = 0.5, extra = {}) => {
  if (mundo.ondas.length < 60) mundo.ondas.push({ x, y, radio, vida, total: vida, color, ...extra });
};

// --- Premio Puskás: cometas que curvan -------------------------------------------------------

function lanzarCometas(mundo) {
  const j = mundo.jugador;
  const d = ULTRAS.puskas;
  let objetivo = null;
  let mejor = 700 * 700;
  mundo.cuadricula.cerca(j.x, j.y, 700, (e) => {
    const d2 = (e.x - j.x) ** 2 + (e.y - j.y) ** 2;
    if (!e.muerto && d2 < mejor) { mejor = d2; objetivo = e; }
  });
  const base = objetivo ? Math.atan2(objetivo.y - j.y, objetivo.x - j.x) : Math.atan2(j.dirY, j.dirX);
  for (const lado of [-1, 1]) {
    mundo.ult.cometas.push({
      x: j.x, y: j.y, ang: base + lado * 0.9, giro: -lado * 1.9, vel: 450, vida: 2.0, total: 2.0, r: 20, rastro: [], toques: new Map(), lado,
    });
  }
  onda(mundo, j.x, j.y, 70, d.color ?? '#ff5ec8', 0.3);
  mundo.eventos.push({ tipo: 'cantico' });
}

function explotarCometa(mundo, c) {
  const d = ULTRAS.puskas;
  enRadio(mundo, c.x, c.y, d.radioExplosion, (e) => golpeUltra(mundo, e, d.explosion, d.explosionPct, normalizar(e.x - c.x, e.y - c.y), 420));
  onda(mundo, c.x, c.y, d.radioExplosion * 1.15, '#ff5ec8', 0.55);
  onda(mundo, c.x, c.y, d.radioExplosion * 0.7, '#ffffff', 0.4);
  crearParticulas(mundo, c.x, c.y, '#ff5ec8', 22, 260);
  crearParticulas(mundo, c.x, c.y, '#ffffff', 10, 200);
  mundo.sacudida = Math.max(mundo.sacudida, 0.14);
}

function moverCometas(mundo, dt) {
  const d = ULTRAS.puskas;
  const lista = mundo.ult.cometas;
  for (let i = 0; i < lista.length; i += 1) {
    const c = lista[i];
    c.vida -= dt;
    c.ang += c.giro * dt;
    c.giro *= 1 - 0.25 * dt; // la curva se va abriendo
    c.x += Math.cos(c.ang) * c.vel * dt;
    c.y += Math.sin(c.ang) * c.vel * dt;
    c.rastro.push({ x: c.x, y: c.y });
    if (c.rastro.length > 16) c.rastro.shift();
    for (const [id, t] of c.toques) if (t - dt <= 0) c.toques.delete(id); else c.toques.set(id, t - dt);
    enRadio(mundo, c.x, c.y, c.r, (e) => {
      if (c.toques.has(e.id)) return;
      c.toques.set(e.id, 0.4);
      golpeUltra(mundo, e, d.dano, d.pct, normalizar(e.x - c.x, e.y - c.y), 260);
    });
    if (c.vida <= 0) { explotarCometa(mundo, c); c.fin = true; }
  }
  mundo.ult.cometas = lista.filter((c) => !c.fin);
}

// --- Balón de Oro: lluvia de oro -------------------------------------------------------------

function nuevoMeteoro(mundo) {
  const j = mundo.jugador;
  const cand = [];
  mundo.cuadricula.cerca(j.x, j.y, 520, (e) => { if (!e.muerto && cand.length < 30) cand.push(e); });
  const e = cand.length ? mundo.rng.elegir(cand) : null;
  const a = mundo.rng.rango(0, Math.PI * 2);
  const x = e ? e.x + mundo.rng.rango(-20, 20) : j.x + Math.cos(a) * 220;
  const y = e ? e.y + mundo.rng.rango(-20, 20) : j.y + Math.sin(a) * 220;
  if (mundo.ult.meteoros.length < 40) mundo.ult.meteoros.push({ x, y, t: 0.42, total: 0.42 });
}

function caerMeteoros(mundo, dt) {
  const d = ULTRAS.balonOro;
  const lista = mundo.ult.meteoros;
  for (let i = 0; i < lista.length; i += 1) {
    const m = lista[i];
    m.t -= dt;
    if (m.t > 0) continue;
    m.fin = true;
    enRadio(mundo, m.x, m.y, d.radio, (e) => golpeUltra(mundo, e, d.dano, d.pct, normalizar(e.x - m.x, e.y - m.y), 240));
    onda(mundo, m.x, m.y, d.radio * 1.3, '#ffd24a', 0.35);
    crearParticulas(mundo, m.x, m.y, '#ffd24a', 9, 190);
    crearParticulas(mundo, m.x, m.y, '#fff3b0', 4, 140);
  }
  mundo.ult.meteoros = lista.filter((m) => !m.fin);
}

// --- MVP de la Champions: estrellas orbitando + supernova -----------------------------------

export function posicionesEstrellas(mundo) {
  const d = ULTRAS.champions;
  const { ang, nova } = mundo.ult.estrellas;
  const j = mundo.jugador;
  const radio = d.radio * (1 + 0.12 * Math.sin(mundo.tiempo * 3)) + (nova > 0 ? 160 * Math.sin((1 - nova / 0.7) * Math.PI) : 0);
  return Array.from({ length: d.estrellas }, (_, i) => {
    const a = ang + (i / d.estrellas) * Math.PI * 2;
    return { x: j.x + Math.cos(a) * radio, y: j.y + Math.sin(a) * radio * 0.92, a };
  });
}

function actualizarEstrellas(mundo, dt) {
  const d = ULTRAS.champions;
  const st = mundo.ult.estrellas;
  const j = mundo.jugador;
  st.ang += 2.9 * dt;
  st.t += dt;
  st.nova = Math.max(0, st.nova - dt);
  for (const p of posicionesEstrellas(mundo)) {
    enRadio(mundo, p.x, p.y, 24, (e) => {
      if ((e.estrellaT ?? 0) > mundo.tiempo) return;
      e.estrellaT = mundo.tiempo + 0.28;
      golpeUltra(mundo, e, d.dano, d.pct, normalizar(e.x - j.x, e.y - j.y), 200, 'cuerpo');
    });
  }
  if (st.t >= d.supernovaCada * j.mult.cd) {
    st.t = 0;
    st.nova = 0.7;
    enRadio(mundo, j.x, j.y, d.supernovaRadio, (e) => {
      golpeUltra(mundo, e, d.supernova, d.supernovaPct, normalizar(e.x - j.x, e.y - j.y), 520, 'cuerpo');
      aturdir(mundo, e, 1.4);
    });
    onda(mundo, j.x, j.y, d.supernovaRadio, '#6ea8ff', 0.7, { silbato: true });
    onda(mundo, j.x, j.y, d.supernovaRadio * 0.6, '#ffffff', 0.5);
    mundo.sacudida = Math.max(mundo.sacudida, 0.2);
    mundo.eventos.push({ tipo: 'cantico' });
  }
}

// --- Trofeo Zamora: cúpula y muro infranqueable ----------------------------------------------

function actualizarZamora(mundo, dt) {
  const d = ULTRAS.zamora;
  const st = mundo.ult.zamora;
  const j = mundo.jugador;
  st.t += dt;
  st.tick -= dt;
  st.muro = Math.max(0, st.muro - dt);
  // Los balones rivales que tocan la cúpula desaparecen
  for (let i = 0; i < mundo.disparosEnemigos.length; i += 1) {
    const s = mundo.disparosEnemigos[i];
    if ((s.x - j.x) ** 2 + (s.y - j.y) ** 2 < (d.radio + (s.r ?? 6)) ** 2) {
      s.vida = 0;
      crearParticulas(mundo, s.x, s.y, '#8fe3ff', 3, 80);
    }
  }
  if (st.tick <= 0) {
    st.tick = d.tick;
    enRadio(mundo, j.x, j.y, d.radio, (e) => {
      golpeUltra(mundo, e, d.dano, d.pct, normalizar(e.x - j.x, e.y - j.y), 210, 'cuerpo');
      if (!e.jefe) aturdir(mundo, e, 0.3);
    });
  }
  if (st.t >= d.muroCada * j.mult.cd) {
    st.t = 0;
    st.muro = 0.75;
    enRadio(mundo, j.x, j.y, d.muroRadio, (e) => {
      golpeUltra(mundo, e, d.muroDano, d.muroPct, normalizar(e.x - j.x, e.y - j.y), 760, 'cuerpo');
      aturdir(mundo, e, 1.6);
    });
    for (let i = 0; i < mundo.disparosEnemigos.length; i += 1) {
      const s = mundo.disparosEnemigos[i];
      if ((s.x - j.x) ** 2 + (s.y - j.y) ** 2 < d.muroRadio ** 2) s.vida = 0;
    }
    onda(mundo, j.x, j.y, d.muroRadio, '#8fe3ff', 0.75, { silbato: true });
    onda(mundo, j.x, j.y, d.muroRadio * 0.65, '#ffffff', 0.5);
    mundo.sacudida = Math.max(mundo.sacudida, 0.25);
    mundo.congelar = Math.max(mundo.congelar, 0.05);
    mundo.eventos.push({ tipo: 'cantico' });
  }
}

// --- Bota de Oro histórica: rastro de fuego y explosiones en cadena -------------------------

function actualizarRastroDeFuego(mundo, dt) {
  const d = ULTRAS.botaOro;
  const j = mundo.jugador;
  const st = mundo.ult.fuego;
  st.t -= dt;
  if (j.moviendo && st.t <= 0 && mundo.fuegos.length < MAX_FUEGOS) {
    st.t = d.cada;
    mundo.fuegos.push({ x: j.x, y: j.y + j.r * 0.4, radio: d.radio, dano: d.dano, pct: d.pct, t: d.dur, total: d.dur, tick: 0.1, fuente: 'ultra:botaOro' });
  }
}

/** Un rival que muere ardiendo explota y quema a los de al lado (cadena limitada por fotograma). */
export function explosionDeFuego(mundo, enemigo) {
  const d = ULTRAS.botaOro;
  if (mundo.ult.cadena >= 24) return;
  mundo.ult.cadena += 1;
  enRadio(mundo, enemigo.x, enemigo.y, d.explosion, (e) => {
    if (e === enemigo) return;
    golpeUltra(mundo, e, d.explosionDano, d.explosionPct, normalizar(e.x - enemigo.x, e.y - enemigo.y), 200);
    quemar(mundo, e, d.dano, 3);
  });
  onda(mundo, enemigo.x, enemigo.y, d.explosion * 1.2, '#ff7a1a', 0.35);
  crearParticulas(mundo, enemigo.x, enemigo.y, '#ff7a1a', 8, 180);
  crearParticulas(mundo, enemigo.x, enemigo.y, '#ffd24a', 4, 140);
}

// --- Mejor jugador del Mundial: el tiempo se detiene ----------------------------------------

function actualizarMagia(mundo, dt) {
  const d = ULTRAS.mundial;
  const j = mundo.jugador;
  const m = mundo.ult.magia;
  if (m.dur > 0) {
    m.dur = Math.max(0, m.dur - dt);
    m.paso -= dt;
    if (m.paso <= 0) { // los que aparecen durante la magia también se congelan
      m.paso = 0.4;
      mundo.cuadricula.cerca(j.x, j.y, 900, (e) => {
        if (e.muerto) return;
        aturdir(mundo, e, 0.7);
        golpeUltra(mundo, e, 0, d.pctTick); // el tiempo detenido los va desgastando
      });
      m.rastro.push({ x: j.x, y: j.y });
      if (m.rastro.length > 6) m.rastro.shift();
    }
    if (m.dur === 0) m.rastro.length = 0;
    return;
  }
  m.cd -= dt;
  if (m.cd > 0) return;
  m.cd = d.cada * j.mult.cd;
  m.dur = d.dur;
  m.paso = 0;
  j.contra = { t: d.dur, vel: d.vel, dano: d.dano };
  mundo.cuadricula.cerca(j.x, j.y, 900, (e) => {
    if (e.muerto) return;
    aturdir(mundo, e, d.dur);
  });
  onda(mundo, j.x, j.y, 520, '#b784ff', 0.8, { silbato: true });
  onda(mundo, j.x, j.y, 300, '#ffffff', 0.5);
  mundo.ult.flash = 0.35;
  mundo.ult.colorFlash = '#b784ff';
  mundo.eventos.push({ tipo: 'cantico' });
}

/** Avanza todas las ultras que tenga el jugador. */
export function actualizarUltras(mundo, dt) {
  const j = mundo.jugador;
  const u = mundo.ult;
  u.cadena = 0;
  u.flash = Math.max(0, u.flash - dt);
  u.anuncio = Math.max(0, u.anuncio - dt);
  if (!j.ultras.length) return;
  const tiene = (k) => j.ultras.includes(k);

  // `mundo.fuente`: a quién se apunta el daño en las estadísticas de la partida
  mundo.fuente = 'ultra:puskas';
  if (tiene('puskas')) {
    u.puskasCd = (u.puskasCd ?? 1.5) - dt;
    if (u.puskasCd <= 0) { u.puskasCd = ULTRAS.puskas.cd * j.mult.cd; lanzarCometas(mundo); }
  }
  moverCometas(mundo, dt);
  mundo.fuente = 'ultra:balonOro';
  if (tiene('balonOro')) {
    u.oroCd = (u.oroCd ?? 0) - dt;
    while (u.oroCd <= 0) { u.oroCd += ULTRAS.balonOro.cada * Math.max(0.6, j.mult.cd); nuevoMeteoro(mundo); }
  }
  caerMeteoros(mundo, dt);
  mundo.fuente = 'ultra:champions';
  if (tiene('champions')) actualizarEstrellas(mundo, dt);
  mundo.fuente = 'ultra:zamora';
  if (tiene('zamora')) actualizarZamora(mundo, dt);
  mundo.fuente = 'ultra:botaOro';
  if (tiene('botaOro')) actualizarRastroDeFuego(mundo, dt);
  mundo.fuente = 'ultra:mundial';
  if (tiene('mundial')) actualizarMagia(mundo, dt);
  mundo.fuente = undefined;
}

/** Anuncio a lo grande al conseguir una ultra. */
export function celebrarUltra(mundo, clave) {
  const d = ULTRAS[clave];
  const j = mundo.jugador;
  mundo.ult.flash = 0.6;
  mundo.ult.colorFlash = d.color;
  mundo.ult.anuncio = 2.6;
  mundo.ult.anuncioClave = clave;
  mundo.sacudida = Math.max(mundo.sacudida, 0.35);
  onda(mundo, j.x, j.y, 620, d.color, 1.0, { ulti: true });
  onda(mundo, j.x, j.y, 380, '#ffffff', 0.7);
  crearParticulas(mundo, j.x, j.y, d.color, 36, 320);
  crearParticulas(mundo, j.x, j.y, '#ffffff', 18, 240);
  mundo.eventos.push({ tipo: 'ultra', clave, nombre: d.nombre, titulo: d.titulo, descripcion: d.descripcion });
}
