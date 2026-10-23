// Mejoras que se ofrecen al subir de nivel y cómo se aplican al jugador.
import { ARMAS, PASIVAS, JUGADOR, NIVEL_MAXIMO } from './config.js';
import { curar } from './combate.js';

/** Recalcula los atributos derivados (multiplicadores, vida máxima...) a partir de los niveles. */
export function recalcular(jugador) {
  const p = jugador.pasivas;
  jugador.vidaMax = JUGADOR.vida + PASIVAS.pasion.porNivel * p.pasion;
  jugador.mult = {
    vel: 1 + PASIVAS.botas.porNivel * p.botas,
    dano: 1 + PASIVAS.tactica.porNivel * p.tactica,
    xp: 1 + PASIVAS.cantera.porNivel * p.cantera,
  };
  jugador.radioIman = JUGADOR.radioImanBase * (1 + PASIVAS.iman.porNivel * p.iman);
  jugador.regen = PASIVAS.masaje.porNivel * p.masaje;
}

/** Elige hasta 3 mejoras distintas entre las que aún se pueden subir. */
export function generarOpciones(mundo) {
  const j = mundo.jugador;
  const candidatas = [];

  Object.entries(ARMAS).forEach(([clave, arma]) => {
    const nivel = j.armas[clave].nivel;
    if (nivel >= NIVEL_MAXIMO) return;
    candidatas.push({
      id: `arma:${clave}`,
      tipo: 'arma',
      clave,
      nivelNuevo: nivel + 1,
      nombre: arma.nombre,
      icono: arma.icono,
      descripcion: nivel === 0 ? arma.descripcion : arma.mejoras[nivel - 1],
    });
  });
  Object.entries(PASIVAS).forEach(([clave, pasiva]) => {
    const nivel = j.pasivas[clave];
    if (nivel >= NIVEL_MAXIMO) return;
    candidatas.push({
      id: `pasiva:${clave}`,
      tipo: 'pasiva',
      clave,
      nivelNuevo: nivel + 1,
      nombre: pasiva.nombre,
      icono: pasiva.icono,
      descripcion: pasiva.descripcion,
    });
  });

  if (candidatas.length === 0) {
    return [{ id: 'cura', tipo: 'cura', clave: 'cura', nivelNuevo: 0, nombre: 'Descanso en el vestuario', icono: 'corazon', descripcion: 'Lo tienes todo al máximo: recuperas la mitad de la vida.' }];
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
    curar(mundo, j.vidaMax / 2);
  }
  return true;
}
