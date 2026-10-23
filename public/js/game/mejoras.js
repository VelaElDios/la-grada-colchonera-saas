// Mejoras que se ofrecen al subir de nivel y cómo se aplican al jugador.
// Hay mejoras sin límite (EXTRAS), así que el juego nunca se queda sin opciones que ofrecer.
import {
  ARMAS, PASIVAS, EXTRAS, POSICIONES, ENTRENADORES, JUGADOR, NIVEL_MAXIMO,
} from './config.js';
import { curar } from './combate.js';

/** Recalcula los atributos derivados (multiplicadores, vida máxima...) a partir de los niveles. */
export function recalcular(jugador) {
  const pos = POSICIONES[jugador.posicion];
  const ent = ENTRENADORES[jugador.entrenador];
  const p = jugador.pasivas;
  const x = jugador.extras;

  jugador.vidaMax = Math.round((pos.vida + PASIVAS.pasion.porNivel * p.pasion + 12 * x.vida) * ent.mult.vida);
  jugador.velBase = pos.vel;
  jugador.mult = {
    vel: (1 + PASIVAS.botas.porNivel * p.botas + Math.min(0.4, 0.02 * x.vel)) * ent.mult.vel,
    dano: (1 + PASIVAS.tactica.porNivel * p.tactica + 0.04 * x.dano) * ent.mult.dano,
    cuerpo: pos.cuerpo,
    disparo: pos.disparo,
    xp: (1 + PASIVAS.cantera.porNivel * p.cantera + 0.05 * x.xp) * ent.mult.xp,
    cd: Math.max(0.45, 1 - PASIVAS.pulmones.porNivel * p.pulmones - 0.02 * x.recarga),
    armadura: Math.min(0.6, PASIVAS.espinilleras.porNivel * p.espinilleras),
  };
  jugador.radioIman = JUGADOR.radioImanBase * (1 + PASIVAS.iman.porNivel * p.iman);
  jugador.regen = PASIVAS.masaje.porNivel * p.masaje;
  jugador.puedeDisparar = pos.disparo > 0;
}

/** Elige hasta 3 mejoras distintas entre las que se pueden ofrecer. */
export function generarOpciones(mundo) {
  const j = mundo.jugador;
  const candidatas = [];

  Object.entries(ARMAS).forEach(([clave, arma]) => {
    if (arma.tipo === 'disparo' && !j.puedeDisparar) return; // el portero no dispara
    const nivel = j.armas[clave].nivel;
    if (nivel >= NIVEL_MAXIMO) return;
    candidatas.push({
      id: `arma:${clave}`, tipo: 'arma', clave, nivelNuevo: nivel + 1, nombre: arma.nombre, icono: arma.icono,
      descripcion: nivel === 0 ? arma.descripcion : arma.mejoras[nivel - 1],
    });
  });
  Object.entries(PASIVAS).forEach(([clave, pasiva]) => {
    const nivel = j.pasivas[clave];
    if (nivel >= NIVEL_MAXIMO) return;
    candidatas.push({
      id: `pasiva:${clave}`, tipo: 'pasiva', clave, nivelNuevo: nivel + 1, nombre: pasiva.nombre, icono: pasiva.icono, descripcion: pasiva.descripcion,
    });
  });

  // Cuando quedan pocas mejoras "normales", se completan con extras sin límite
  if (candidatas.length < 3) {
    Object.entries(EXTRAS).forEach(([clave, extra]) => {
      candidatas.push({
        id: `extra:${clave}`, tipo: 'extra', clave, nivelNuevo: j.extras[clave] + 1, nombre: extra.nombre, icono: extra.icono, descripcion: extra.descripcion,
      });
    });
  }
  return mundo.rng.barajar(candidatas).slice(0, 3);
}

/** Aplica la mejora elegida. Devuelve false si el id no existe (no hace nada). */
export function aplicarMejora(mundo, id) {
  const opcion = mundo.opciones.find((o) => o.id === id);
  if (!opcion) return false;
  const j = mundo.jugador;

  if (opcion.tipo === 'arma') {
    j.armas[opcion.clave].nivel = opcion.nivelNuevo;
    j.armas[opcion.clave].cd = 0;
  } else if (opcion.tipo === 'pasiva') {
    j.pasivas[opcion.clave] = opcion.nivelNuevo;
    recalcular(j);
    if (opcion.clave === 'pasion') curar(mundo, PASIVAS.pasion.porNivel);
  } else {
    j.extras[opcion.clave] += 1;
    recalcular(j);
    if (opcion.clave === 'vida') curar(mundo, 12);
  }
  return true;
}
