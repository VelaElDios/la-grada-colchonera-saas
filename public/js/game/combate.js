// Daño, muertes, recompensas y efectos visuales sencillos (números flotantes y partículas).
import { MUNDO } from './config.js';

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
      mundo.particulas.push({ x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, vida, total: vida, color, r: mundo.rng.rango(1.5, 3.2) });
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

/**
 * Resta vida a un enemigo (aplicando el multiplicador de daño del jugador).
 * `empuje` = [dx, dy] unitario y velocidad inicial del empujón.
 */
export function danar(mundo, enemigo, base, empuje = null, velEmpuje = 0) {
  if (enemigo.muerto) return;
  const cantidad = Math.max(1, Math.round(base * mundo.jugador.mult.dano));
  enemigo.vida -= cantidad;
  enemigo.flash = 0.1;
  if (empuje && velEmpuje) {
    const freno = enemigo.tipo === 'jefe' ? 0.15 : enemigo.tipo === 'central' ? 0.5 : 1;
    enemigo.kx += empuje[0] * velEmpuje * freno;
    enemigo.ky += empuje[1] * velEmpuje * freno;
  }
  crearTexto(mundo, enemigo.x, enemigo.y - enemigo.r, String(cantidad), enemigo.tipo === 'jefe' ? '#ffd166' : '#ffffff');
  if (enemigo.vida <= 0) matar(mundo, enemigo);
  else mundo.eventos.push({ tipo: 'golpe' });
}

function matar(mundo, enemigo) {
  enemigo.muerto = true;
  mundo.jugador.bajas += 1;
  soltarGema(mundo, enemigo.x, enemigo.y, enemigo.xp);
  crearParticulas(mundo, enemigo.x, enemigo.y, enemigo.color, enemigo.tipo === 'jefe' ? 30 : 7, enemigo.tipo === 'jefe' ? 260 : 130);

  if (enemigo.tipo === 'jefe') {
    for (let i = 0; i < 4; i += 1) soltarGema(mundo, enemigo.x, enemigo.y, 8);
    mundo.curas.push({ x: enemigo.x, y: enemigo.y });
    mundo.sacudida = Math.max(mundo.sacudida, 0.4);
    mundo.eventos.push({ tipo: 'jefe-derrotado' });
  } else if (mundo.rng.siguiente() < 0.018) {
    mundo.curas.push({ x: enemigo.x, y: enemigo.y });
  }
  mundo.eventos.push({ tipo: 'baja' });
}
