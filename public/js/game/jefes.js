// Habilidades de los jefes. Cada uno tiene una mecánica distinta:
//  · Guardiola: «rondo», invoca un cerco de rivales alrededor del jugador.
//  · Mourinho: «autobús», avisa y suelta una onda de choque a su alrededor.
//  · Cristiano: «cañonazo», dispara un abanico de balones.
//  · Messi: «regate», se prepara y embiste a toda velocidad.
import { JEFES, JUGADOR, MUNDO } from './config.js';
import { crearEnemigo } from './oleadas.js';
import { normalizar } from './util.js';

const MAX_DISPAROS = 80;

export function dispararAlJugador(mundo, e, angulo, velocidad = 250, danoRel = 0.7) {
  if (mundo.disparosEnemigos.length >= MAX_DISPAROS) return;
  mundo.disparosEnemigos.push({
    x: e.x, y: e.y, vx: Math.cos(angulo) * velocidad, vy: Math.sin(angulo) * velocidad,
    r: 8, dano: Math.max(1, Math.round(e.dano * danoRel)), vida: 3, rot: 0,
  });
}

function rondo(mundo, e) {
  const j = mundo.jugador;
  const n = 8;
  const equipo = mundo.rng.siguiente() < 0.5 ? 'barca' : 'madrid';
  for (let i = 0; i < n; i += 1) {
    if (mundo.enemigos.length >= MUNDO.maxEnemigos) break;
    const a = (i / n) * Math.PI * 2;
    mundo.enemigos.push(crearEnemigo(equipo, j.x + Math.cos(a) * 300, j.y + Math.sin(a) * 300, mundo.oleada));
  }
  mundo.avisosJefe.push({ x: j.x, y: j.y, radio: 300, vida: 0.5, total: 0.5, tipo: 'cerco' });
  mundo.eventos.push({ tipo: 'aviso', texto: '¡Rondo!' });
}

function golpePulso(mundo, e, radio) {
  const j = mundo.jugador;
  mundo.ondas.push({ x: e.x, y: e.y, radio, vida: 0.5, total: 0.5, enemiga: true });
  mundo.sacudida = Math.max(mundo.sacudida, 0.25);
  const d = Math.hypot(j.x - e.x, j.y - e.y);
  if (d <= radio + j.r && j.invul <= 0) danarJugador(mundo, Math.round(e.dano * 0.9));
}

/** Resta vida al jugador teniendo en cuenta la armadura. Devuelve el daño aplicado. */
export function danarJugador(mundo, cantidad) {
  const j = mundo.jugador;
  const real = Math.max(1, Math.round(cantidad * (1 - j.mult.armadura)));
  j.vida -= real;
  j.invul = JUGADOR.invulnerabilidad;
  j.flash = 0.18;
  mundo.sacudida = Math.max(mundo.sacudida, 0.2);
  mundo.eventos.push({ tipo: 'dano' });
  return real;
}

/**
 * Actualiza la habilidad del jefe `e`. Devuelve true si el jefe se ha movido por su cuenta
 * (por ejemplo, en una embestida) y por tanto no debe seguir al jugador este fotograma.
 */
export function actualizarJefe(mundo, e, dt) {
  const j = mundo.jugador;
  const def = JEFES[e.jefe];

  switch (e.jefe) {
    case 'guardiola': {
      e.cd -= dt;
      if (e.cd <= 0) {
        e.cd = def.cada;
        rondo(mundo, e);
      }
      return false;
    }
    case 'mourinho': {
      if (e.carga > 0) {
        e.carga -= dt;
        if (e.carga <= 0) golpePulso(mundo, e, def.radioPulso);
        return false;
      }
      e.cd -= dt;
      if (e.cd <= 0) {
        e.cd = def.cada;
        e.carga = 1.0;
        mundo.avisosJefe.push({ x: e.x, y: e.y, radio: def.radioPulso, vida: 1.0, total: 1.0, tipo: 'pulso', seguir: e });
      }
      return false;
    }
    case 'cristiano': {
      e.cd -= dt;
      if (e.cd <= 0) {
        e.cd = def.cada;
        const a = Math.atan2(j.y - e.y, j.x - e.x);
        for (let k = -2; k <= 2; k += 1) dispararAlJugador(mundo, e, a + k * 0.16, 260);
        mundo.eventos.push({ tipo: 'chute' });
      }
      return false;
    }
    case 'messi': {
      if (e.estado === 'preparar') {
        e.carga -= dt;
        if (e.carga <= 0) {
          e.estado = 'embestida';
          e.carga = 0.7;
        }
        return true; // parado, preparándose
      }
      if (e.estado === 'embestida') {
        e.carga -= dt;
        e.x += e.dirX * 470 * dt;
        e.y += e.dirY * 470 * dt;
        if (e.carga <= 0) {
          e.estado = 'normal';
          e.cd = def.cada;
        }
        return true;
      }
      e.cd -= dt;
      if (e.cd <= 0) {
        const [dx, dy] = normalizar(j.x - e.x, j.y - e.y);
        e.dirX = dx;
        e.dirY = dy;
        e.estado = 'preparar';
        e.carga = 0.5;
      }
      return false;
    }
    default:
      return false;
  }
}
