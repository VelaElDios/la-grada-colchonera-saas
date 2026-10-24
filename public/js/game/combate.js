// Daño, muertes, recompensas y efectos visuales sencillos (números flotantes y partículas).
import { MUNDO, EQUIPOS, JEFES, MOVIMIENTO } from './config.js';

const MAX_TEXTOS = 40;
const MAX_PARTICULAS = 260;

export function crearTexto(mundo, x, y, texto, color = '#ffffff') {
  if (mundo.textos.length >= MAX_TEXTOS) mundo.textos.shift();
  mundo.textos.push({ x, y, texto, color, vida: 0.7, total: 0.7 });
}

export function crearParticulas(mundo, x, y, color, cantidad = 6, velocidad = 120) {
  if (!mundo.efectosReducidos) {
    for (let i = 0; i < cantidad; i += 1) {
      if (mundo.particulas.length >= MAX_PARTICULAS) mundo.particulas.shift();
      const ang = mundo.rng.rango(0, Math.PI * 2);
      const v = mundo.rng.rango(0.3, 1) * velocidad;
      const vida = mundo.rng.rango(0.25, 0.5);
      mundo.particulas.push({ x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, vida, total: vida, color, r: mundo.rng.rango(2, 4) });
    }
  }
}

/** Suelta una gema de experiencia; si hay demasiadas, la suma a una existente. */
export function soltarGema(mundo, x, y, valor) {
  if (mundo.gemas.length >= MUNDO.maxGemas) {
    mundo.rng.elegir(mundo.gemas).valor += valor;
    return;
  }
  mundo.gemas.push({ x: x + mundo.rng.rango(-6, 6), y: y + mundo.rng.rango(-6, 6), valor, atraida: false });
}

export function curar(mundo, cantidad) {
  const j = mundo.jugador;
  const antes = j.vida;
  j.vida = Math.min(j.vidaMax, j.vida + cantidad);
  return j.vida - antes;
}

/** Multiplicador de daño del jugador según el tipo de ataque ('cuerpo', 'disparo' o 'ulti'). */
export function multiplicadorDano(jugador, tipo) {
  const porTipo = tipo === 'disparo' ? jugador.mult.disparo : tipo === 'cuerpo' ? jugador.mult.cuerpo : 1;
  const ritmo = 1 + MOVIMIENTO.bonoDano * (jugador.ritmo ?? 0); // correr da más daño
  return jugador.mult.dano * porTipo * ritmo * (jugador.animo > 0 ? jugador.bonoAnimo : 1);
}

/**
 * Resta vida a un rival aplicando los multiplicadores del jugador (posición, mejoras, entrenador).
 * `empuje` = [dx, dy] unitario y velocidad inicial del empujón.
 */
export function danar(mundo, enemigo, base, empuje = null, velEmpuje = 0, tipo = 'cuerpo') {
  if (enemigo.muerto) return;
  const cantidad = Math.max(1, Math.round(base * multiplicadorDano(mundo.jugador, tipo)));
  enemigo.vida -= cantidad;
  enemigo.flash = 0.1;
  crearParticulas(mundo, enemigo.x, enemigo.y, '#ffffff', 3, 110); // chispas del golpe
  if (empuje && velEmpuje) {
    enemigo.kx += empuje[0] * velEmpuje * enemigo.freno;
    enemigo.ky += empuje[1] * velEmpuje * enemigo.freno;
  }
  if (!mundo.sinNumeros) crearTexto(mundo, enemigo.x, enemigo.y - enemigo.r, String(cantidad), enemigo.jefe ? '#ffd166' : '#ffffff');
  if (enemigo.vida <= 0) matar(mundo, enemigo);
  else mundo.eventos.push({ tipo: 'golpe' });
}

function colorDe(enemigo) {
  if (enemigo.jefe) return JEFES[enemigo.jefe].aspecto.camiseta.c;
  return EQUIPOS[enemigo.tipo]?.kit.camiseta.c ?? '#ffffff';
}

function matar(mundo, enemigo) {
  enemigo.muerto = true;
  mundo.jugador.bajas += 1;
  mundo.cargaPendiente += enemigo.jefe ? 12 : 1;
  soltarGema(mundo, enemigo.x, enemigo.y, enemigo.xp);
  crearParticulas(mundo, enemigo.x, enemigo.y, colorDe(enemigo), enemigo.jefe ? 30 : 7, enemigo.jefe ? 260 : 130);

  if (enemigo.jefe) {
    for (let i = 0; i < 4; i += 1) soltarGema(mundo, enemigo.x, enemigo.y, enemigo.xp);
    mundo.curas.push({ x: enemigo.x, y: enemigo.y });
    mundo.sacudida = Math.max(mundo.sacudida, 0.4);
    mundo.congelar = Math.max(mundo.congelar, 0.14);
    mundo.jugador.jefes += 1;
    mundo.eventos.push({ tipo: 'jefe-derrotado', nombre: enemigo.nombre });
  } else if (mundo.rng.siguiente() < 0.018) {
    mundo.curas.push({ x: enemigo.x, y: enemigo.y });
  }
  mundo.eventos.push({ tipo: 'baja' });
}
