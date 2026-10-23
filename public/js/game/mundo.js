// Simulación del juego: sin dibujar nada y sin tocar el DOM, así se puede probar con node:test.
// Estados: 'jugando' → 'mejora' (elegir mejora al subir de nivel) → 'jugando' ... → 'fin'.
import {
  JUGADOR, POSICIONES, PERSONAJES, ENTRENADORES, ARMAS, PASIVAS, EXTRAS, ULTI, xpParaSubir,
} from './config.js';
import { crearRng, crearCuadricula, normalizar } from './util.js';
import { actualizarArmas } from './armas.js';
import { curar, danar, crearParticulas } from './combate.js';
import { generarOpciones, aplicarMejora, recalcular } from './mejoras.js';
import { oleadaEn, empezarOleada, actualizarApariciones, reciclarLejanos } from './oleadas.js';
import { actualizarJefe, danarJugador } from './jefes.js';
import { actualizarUlti, cargarUlti, lanzarUlti } from './ulti.js';

const SIN_ENTRADA = { x: 0, y: 0 };

/**
 * @param {object} [opciones]
 * @param {number} [opciones.semilla] Semilla del generador aleatorio
 * @param {boolean} [opciones.efectosReducidos] Sin partículas ni sacudidas (accesibilidad)
 * @param {string} [opciones.personaje] Clave de PERSONAJES (oblak, godin, koke, griezmann)
 * @param {string} [opciones.entrenador] Clave de ENTRENADORES (cholo, aragones)
 */
export function crearMundo({
  semilla = Date.now(), efectosReducidos = false, personaje = 'koke', entrenador = 'cholo',
} = {}) {
  const pj = PERSONAJES[personaje] ?? PERSONAJES.koke;
  const clavePersonaje = PERSONAJES[personaje] ? personaje : 'koke';
  const claveEntrenador = ENTRENADORES[entrenador] ? entrenador : 'cholo';
  const posicion = POSICIONES[pj.posicion];

  const armas = {};
  Object.keys(ARMAS).forEach((k) => { armas[k] = { nivel: 0, cd: 0 }; });
  armas[posicion.armaInicial] = { nivel: 1, cd: 0.3 };
  const pasivas = {};
  Object.keys(PASIVAS).forEach((k) => { pasivas[k] = 0; });
  const extras = {};
  Object.keys(EXTRAS).forEach((k) => { extras[k] = 0; });

  const mundo = {
    rng: crearRng(semilla),
    efectosReducidos,
    tiempo: 0,
    estado: 'jugando',
    oleada: 1,
    temporizadorAparicion: 0.6,
    jugador: {
      personaje: clavePersonaje,
      entrenador: claveEntrenador,
      posicion: pj.posicion,
      x: 0,
      y: 0,
      r: JUGADOR.radio,
      vida: 1,
      vidaMax: 1,
      velBase: posicion.vel,
      dirX: 1,
      dirY: 0,
      moviendo: false,
      invul: 0,
      flash: 0,
      xp: 0,
      nivel: 1,
      bajas: 0,
      jefes: 0,
      angBanderines: 0,
      ladoBufanda: false,
      banderines: [],
      armas,
      pasivas,
      extras,
      mult: { vel: 1, dano: 1, cuerpo: 1, disparo: 1, xp: 1, cd: 1, armadura: 0 },
      radioIman: JUGADOR.radioImanBase,
      regen: 0,
      puedeDisparar: true,
      ulti: { carga: 0, max: ULTI.base, usos: 0 },
      animo: 0, // segundos que le quedan al bonus de daño del Cholo
      furia: 0, // segundos que le quedan a la Furia Roja de Luis
      bonoAnimo: ENTRENADORES.cholo.ulti.bonoDano,
    },
    enemigos: [],
    proyectiles: [],
    disparosEnemigos: [],
    gemas: [],
    curas: [],
    tajos: [],
    ondas: [],
    rayos: [],
    tarjetas: [],
    avisosJefe: [],
    textos: [],
    particulas: [],
    sacudida: 0,
    pendientes: 0,
    cargaPendiente: 0,
    opciones: [],
    eventos: [],
    cuadricula: crearCuadricula(48),
  };
  recalcular(mundo.jugador);
  mundo.jugador.vida = mundo.jugador.vidaMax;
  mundo.eventos.push({ tipo: 'oleada', oleada: 1 });
  return mundo;
}

/** Experiencia necesaria para el siguiente nivel del jugador. */
export const xpSiguiente = (mundo) => xpParaSubir(mundo.jugador.nivel);

function ganarExperiencia(mundo, cantidad) {
  const j = mundo.jugador;
  j.xp += cantidad;
  while (j.xp >= xpParaSubir(j.nivel)) {
    j.xp -= xpParaSubir(j.nivel);
    j.nivel += 1;
    mundo.pendientes += 1;
  }
}

function moverJugador(mundo, dt, entrada) {
  const j = mundo.jugador;
  const [dx, dy] = normalizar(entrada.x, entrada.y);
  // Con un joystick la magnitud es analógica (0..1): se respeta
  const fuerza = Math.min(1, Math.hypot(entrada.x, entrada.y));
  j.moviendo = fuerza > 0.05;
  if (dx !== 0 || dy !== 0) {
    j.dirX = dx;
    j.dirY = dy;
  }
  const bonoFuria = j.furia > 0 ? ENTRENADORES.aragones.ulti.bonoVel : 1;
  const v = j.velBase * j.mult.vel * bonoFuria * fuerza;
  j.x += dx * v * dt;
  j.y += dy * v * dt;

  j.invul = Math.max(0, j.invul - dt);
  j.flash = Math.max(0, j.flash - dt);
  if (j.regen > 0) curar(mundo, j.regen * dt);
}

function moverEnemigos(mundo, dt) {
  const j = mundo.jugador;
  const { cuadricula, enemigos } = mundo;
  cuadricula.limpiar();
  for (let i = 0; i < enemigos.length; i += 1) cuadricula.insertar(enemigos[i]);

  const decaimiento = Math.exp(-5 * dt);
  for (let i = 0; i < enemigos.length; i += 1) {
    const e = enemigos[i];
    if (e.muerto) continue;
    e.flash = Math.max(0, e.flash - dt);
    e.cdBanderin = Math.max(0, e.cdBanderin - dt);
    e.lento = Math.max(0, e.lento - dt);

    const habilidadPropia = e.jefe ? actualizarJefe(mundo, e, dt) : false;
    if (!habilidadPropia) {
      const [dx, dy] = normalizar(j.x - e.x, j.y - e.y);
      const v = e.lento > 0 ? e.vel * 0.35 : e.vel;
      e.x += dx * v * dt;
      e.y += dy * v * dt;
    }
    e.x += e.kx * dt;
    e.y += e.ky * dt;
    e.kx *= decaimiento;
    e.ky *= decaimiento;

    // Separación: los rivales no se amontonan en un solo punto
    cuadricula.cerca(e.x, e.y, e.r * 2, (otro) => {
      if (otro === e || otro.muerto) return;
      const ox = e.x - otro.x;
      const oy = e.y - otro.y;
      const minimo = (e.r + otro.r) * 0.85;
      const d2 = ox * ox + oy * oy;
      if (d2 > 0 && d2 < minimo * minimo) {
        const d = Math.sqrt(d2);
        const empuje = ((minimo - d) / d) * 0.5;
        e.x += ox * empuje;
        e.y += oy * empuje;
      }
    });

    // Contacto con el jugador
    if (j.invul <= 0 && (e.x - j.x) ** 2 + (e.y - j.y) ** 2 < (e.r + j.r * 0.8) ** 2) {
      danarJugador(mundo, e.dano);
    }
  }
}

function moverProyectiles(mundo, dt) {
  const { proyectiles } = mundo;
  for (let i = 0; i < proyectiles.length; i += 1) {
    const p = proyectiles[i];
    if (p.teledirigido) {
      if (!p.objetivo || p.objetivo.muerto) p.objetivo = buscarObjetivo(mundo, p);
      if (p.objetivo) {
        const [tx, ty] = normalizar(p.objetivo.x - p.x, p.objetivo.y - p.y);
        const [vx, vy] = normalizar(p.vx, p.vy);
        const [nx, ny] = normalizar(vx + (tx - vx) * Math.min(1, 6 * dt), vy + (ty - vy) * Math.min(1, 6 * dt));
        p.vx = nx * 300;
        p.vy = ny * 300;
      }
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += dt * 14;
    p.vida -= dt;
    if (p.vida > 0) {
      mundo.cuadricula.cerca(p.x, p.y, p.r + 24, (e) => {
        if (p.perfora <= 0 || e.muerto || p.golpeados.has(e.id)) return;
        if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > (e.r + p.r) ** 2) return;
        p.golpeados.add(e.id);
        p.perfora -= 1;
        danar(mundo, e, p.dano, normalizar(p.vx, p.vy), p.empuje, 'disparo');
      });
    }
    if (p.vida <= 0 || p.perfora <= 0) p.muerto = true;
  }
}

/** Rival más cercano al proyectil (para los balones teledirigidos que han perdido a su objetivo). */
function buscarObjetivo(mundo, p) {
  let mejor = null;
  let mejorD2 = 420 * 420;
  mundo.cuadricula.cerca(p.x, p.y, 420, (e) => {
    if (e.muerto) return;
    const d2 = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
    if (d2 < mejorD2) {
      mejorD2 = d2;
      mejor = e;
    }
  });
  return mejor;
}

function moverDisparosEnemigos(mundo, dt) {
  const j = mundo.jugador;
  for (let i = 0; i < mundo.disparosEnemigos.length; i += 1) {
    const d = mundo.disparosEnemigos[i];
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.rot += dt * 10;
    d.vida -= dt;
    if (d.vida > 0 && j.invul <= 0 && (d.x - j.x) ** 2 + (d.y - j.y) ** 2 < (d.r + j.r * 0.8) ** 2) {
      danarJugador(mundo, d.dano);
      d.vida = 0;
    }
  }
}

function recogerObjetos(mundo, dt) {
  const j = mundo.jugador;
  const radioIman = j.radioIman * (j.furia > 0 ? ENTRENADORES.aragones.ulti.iman : 1);
  const iman2 = radioIman ** 2;
  const gemas = mundo.gemas;
  for (let i = 0; i < gemas.length; i += 1) {
    const g = gemas[i];
    const d2 = (g.x - j.x) ** 2 + (g.y - j.y) ** 2;
    if (!g.atraida && d2 < iman2) g.atraida = true;
    if (g.atraida) {
      const [dx, dy] = normalizar(j.x - g.x, j.y - g.y);
      const v = 300 + 200 * (1 - Math.min(1, Math.sqrt(d2) / radioIman));
      g.x += dx * v * dt;
      g.y += dy * v * dt;
    }
    if (d2 < (j.r + 10) ** 2) {
      g.recogida = true;
      ganarExperiencia(mundo, g.valor * j.mult.xp);
      mundo.eventos.push({ tipo: 'gema' });
    }
  }
  for (let i = 0; i < mundo.curas.length; i += 1) {
    const c = mundo.curas[i];
    if ((c.x - j.x) ** 2 + (c.y - j.y) ** 2 < (j.r + 14) ** 2) {
      c.recogida = true;
      curar(mundo, 25);
      mundo.eventos.push({ tipo: 'cura' });
    }
  }
}

function actualizarEfectos(mundo, dt) {
  mundo.sacudida = mundo.efectosReducidos ? 0 : Math.max(0, mundo.sacudida - dt);
  for (const lista of [mundo.tajos, mundo.ondas, mundo.textos, mundo.particulas, mundo.rayos, mundo.tarjetas, mundo.avisosJefe]) {
    for (let i = 0; i < lista.length; i += 1) lista[i].vida -= dt;
  }
  for (let i = 0; i < mundo.textos.length; i += 1) mundo.textos[i].y -= 28 * dt;
  for (let i = 0; i < mundo.tarjetas.length; i += 1) mundo.tarjetas[i].y -= 20 * dt;
  for (let i = 0; i < mundo.avisosJefe.length; i += 1) {
    const a = mundo.avisosJefe[i];
    if (a.seguir && !a.seguir.muerto) {
      a.x = a.seguir.x;
      a.y = a.seguir.y;
    }
  }
  for (let i = 0; i < mundo.particulas.length; i += 1) {
    const p = mundo.particulas[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
  }
}

/** Quita de una lista los elementos que ya no valen (muertos, recogidos o con la vida agotada). */
function compactar(lista, vale) {
  let k = 0;
  for (let i = 0; i < lista.length; i += 1) if (vale(lista[i])) lista[k++] = lista[i];
  lista.length = k;
}

/**
 * Avanza la simulación `dt` segundos.
 * @param {object} entrada Dirección deseada { x, y } (cada componente entre -1 y 1)
 */
export function avanzar(mundo, dt, entrada = SIN_ENTRADA) {
  if (mundo.estado !== 'jugando') return;
  const j = mundo.jugador;
  mundo.tiempo += dt;

  const oleada = oleadaEn(mundo.tiempo);
  if (oleada !== mundo.oleada) {
    mundo.oleada = oleada;
    empezarOleada(mundo);
  }

  moverJugador(mundo, dt, entrada);
  actualizarApariciones(mundo, dt);
  moverEnemigos(mundo, dt);
  actualizarArmas(mundo, dt);
  moverProyectiles(mundo, dt);
  moverDisparosEnemigos(mundo, dt);
  recogerObjetos(mundo, dt);
  actualizarEfectos(mundo, dt);
  reciclarLejanos(mundo);

  compactar(mundo.enemigos, (e) => !e.muerto);
  compactar(mundo.proyectiles, (p) => !p.muerto);
  compactar(mundo.disparosEnemigos, (d) => d.vida > 0);
  compactar(mundo.gemas, (g) => !g.recogida);
  compactar(mundo.curas, (c) => !c.recogida);
  compactar(mundo.tajos, (t) => t.vida > 0);
  compactar(mundo.ondas, (o) => o.vida > 0);
  compactar(mundo.rayos, (r) => r.vida > 0);
  compactar(mundo.tarjetas, (t) => t.vida > 0);
  compactar(mundo.avisosJefe, (a) => a.vida > 0);
  compactar(mundo.textos, (t) => t.vida > 0);
  compactar(mundo.particulas, (p) => p.vida > 0);

  // La ulti se carga con las bajas de este fotograma
  if (mundo.cargaPendiente > 0) {
    cargarUlti(mundo, mundo.cargaPendiente);
    mundo.cargaPendiente = 0;
  }
  actualizarUlti(mundo, dt);

  if (j.vida <= 0) {
    j.vida = 0;
    mundo.estado = 'fin';
    crearParticulas(mundo, j.x, j.y, '#c8102e', 24, 220);
    mundo.eventos.push({ tipo: 'fin' });
    return;
  }
  if (mundo.pendientes > 0) abrirMejora(mundo);
}

function abrirMejora(mundo) {
  mundo.estado = 'mejora';
  mundo.opciones = generarOpciones(mundo);
  mundo.eventos.push({ tipo: 'nivel', nivel: mundo.jugador.nivel });
}

/** El jugador elige una mejora. Devuelve true si era válida. */
export function elegirMejora(mundo, id) {
  if (mundo.estado !== 'mejora' || !aplicarMejora(mundo, id)) return false;
  mundo.pendientes -= 1;
  if (mundo.pendientes > 0) abrirMejora(mundo);
  else {
    mundo.estado = 'jugando';
    mundo.opciones = [];
  }
  return true;
}

/** Lanza la ulti del entrenador si está cargada. Devuelve true si se ha lanzado. */
export const usarUlti = (mundo) => lanzarUlti(mundo);

/** Resumen de la partida para la pantalla final. */
export function resumen(mundo) {
  const j = mundo.jugador;
  return {
    tiempo: mundo.tiempo, oleada: mundo.oleada, nivel: j.nivel, bajas: j.bajas, jefes: j.jefes, personaje: j.personaje, entrenador: j.entrenador,
  };
}
