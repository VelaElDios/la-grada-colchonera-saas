// Ulti del entrenador: se carga con las bajas (y un poco con el tiempo) y se lanza con un botón.
// Cada vez que se usa, la siguiente tarda más en cargarse, y su daño es fijo: brilla pronto y se queda corta tarde.
import { ENTRENADORES, ULTI } from './config.js';
import { danar } from './combate.js';
import { normalizar } from './util.js';

export const ultiLista = (mundo) => mundo.jugador.ulti.carga >= mundo.jugador.ulti.max;

export function cargarUlti(mundo, cantidad) {
  const u = mundo.jugador.ulti;
  u.carga = Math.min(u.max, u.carga + cantidad);
}

/** Avanza los temporizadores de la ulti y de sus efectos. */
export function actualizarUlti(mundo, dt) {
  const j = mundo.jugador;
  if (!ultiLista(mundo)) cargarUlti(mundo, ULTI.pasiva * dt);
  j.animo = Math.max(0, j.animo - dt);
  j.furia = Math.max(0, j.furia - dt);
}

/** Lanza la ulti si está cargada. Devuelve true si se ha lanzado. */
export function lanzarUlti(mundo) {
  const j = mundo.jugador;
  if (mundo.estado !== 'jugando' || !ultiLista(mundo)) return false;
  const def = ENTRENADORES[j.entrenador].ulti;
  mundo.fuente = 'ulti';

  if (j.entrenador === 'cholo') {
    const dano = def.dano + def.danoPorNivel * j.nivel;
    for (let i = 0; i < mundo.enemigos.length; i += 1) {
      const e = mundo.enemigos[i];
      if (e.muerto) continue;
      const dx = e.x - j.x;
      const dy = e.y - j.y;
      if (Math.hypot(dx, dy) <= def.radio + e.r) danar(mundo, e, dano, normalizar(dx, dy), def.empuje, 'ulti');
    }
    j.animo = def.animo;
    mundo.ondas.push({ x: j.x, y: j.y, radio: def.radio, vida: 0.7, total: 0.7, ulti: true });
    mundo.sacudida = Math.max(mundo.sacudida, 0.45);
  } else {
    j.furia = def.duracion;
    mundo.ondas.push({ x: j.x, y: j.y, radio: 220, vida: 0.6, total: 0.6, ulti: true });
  }

  mundo.congelar = Math.max(mundo.congelar, 0.1);
  j.ulti.carga = 0;
  j.ulti.usos += 1;
  j.ulti.max = Math.min(ULTI.tope, ULTI.base + ULTI.incremento * j.ulti.usos);
  mundo.eventos.push({ tipo: 'ulti', texto: def.nombre });
  mundo.fuente = undefined;
  return true;
}
