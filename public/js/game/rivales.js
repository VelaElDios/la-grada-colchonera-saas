// Comportamientos de los rivales normales: algunos embisten a toda velocidad y otros disparan balones.
// Los jefes tienen sus propias habilidades en jefes.js.
import { EQUIPOS, MOVIMIENTO } from './config.js';
import { dispararAlJugador } from './jefes.js';

const TIEMPO_AVISO = 0.45; // el rival se «agacha» antes de embestir

/**
 * Actualiza lo propio de cada rival y devuelve cuánto debe correr hoy respecto a su velocidad normal.
 * `dist` es la distancia al jugador. Puede cambiar la dirección de la embestida (`e.dirX`, `e.dirY`).
 */
export function comportamiento(mundo, e, dt, dist) {
  const j = mundo.jugador;
  const base = EQUIPOS[e.tipo];
  let factor = 1;

  // La grada rival aprieta si te quedas quieto
  if (j.quieto >= MOVIMIENTO.quietoPresion && dist < MOVIMIENTO.presionRadio) factor *= MOVIMIENTO.presionVel;

  if (base?.embiste) {
    if (e.embestida > 0) {
      e.embestida -= dt;
      factor *= base.embiste.mult;
    } else if (e.aviso > 0) {
      e.aviso -= dt;
      factor *= 0.2;
      if (e.aviso <= 0) {
        e.embestida = base.embiste.dur;
        const d = dist || 1;
        e.dirX = (j.x - e.x) / d;
        e.dirY = (j.y - e.y) / d;
      }
    } else {
      e.cdEmbestida -= dt;
      if (e.cdEmbestida <= 0 && dist < 460) {
        e.aviso = TIEMPO_AVISO;
        e.cdEmbestida = base.embiste.cada;
      }
    }
  }

  if (base?.dispara) {
    e.cdDisparo -= dt;
    if (e.cdDisparo <= 0 && dist < base.dispara.rango && dist > 90) {
      e.cdDisparo = base.dispara.cada;
      dispararAlJugador(mundo, e, Math.atan2(j.y - e.y, j.x - e.x), base.dispara.vel, 0.65);
    }
  }
  return factor;
}
