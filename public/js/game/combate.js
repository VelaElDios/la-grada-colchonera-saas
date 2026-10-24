// Daño, muertes, recompensas y efectos visuales sencillos (números flotantes y partículas).
import {
  MUNDO, EQUIPOS, JEFES, MOVIMIENTO, CURAS, ELITES,
} from './config.js';

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
  const contra = jugador.contra && jugador.contra.t > 0 ? 1 + jugador.contra.dano : 1; // contragolpe
  return jugador.mult.dano * porTipo * ritmo * contra * (jugador.animo > 0 ? jugador.bonoAnimo : 1);
}

/**
 * Resta vida a un rival aplicando los multiplicadores del jugador (posición, mejoras, entrenador).
 * `empuje` = [dx, dy] unitario y velocidad inicial del empujón.
 */
export function danar(mundo, enemigo, base, empuje = null, velEmpuje = 0, tipo = 'cuerpo') {
  if (enemigo.muerto) return;
  let cantidad = Math.max(1, Math.round(base * multiplicadorDano(mundo.jugador, tipo)));
  // Golpe crítico (Trébol y suerte): el doble de daño
  const critico = (mundo.jugador.mult.critico ?? 0) > 0 && mundo.rng.siguiente() < mundo.jugador.mult.critico;
  if (critico) cantidad *= 2;
  enemigo.vida -= cantidad;
  enemigo.flash = 0.1;
  crearParticulas(mundo, enemigo.x, enemigo.y, '#ffffff', 3, 110); // chispas del golpe
  if (empuje && velEmpuje) {
    enemigo.kx += empuje[0] * velEmpuje * enemigo.freno;
    enemigo.ky += empuje[1] * velEmpuje * enemigo.freno;
  }
  if (!mundo.sinNumeros) {
    crearTexto(mundo, enemigo.x, enemigo.y - enemigo.r, critico ? `${cantidad}!` : String(cantidad), critico ? '#ff9a3c' : enemigo.jefe ? '#ffd166' : '#ffffff');
  }
  if (enemigo.vida <= 0) matar(mundo, enemigo);
  else mundo.eventos.push({ tipo: 'golpe' });
}

/** Daño que no depende de tus multiplicadores (quemaduras): ya viene calculado. */
export function danoFijo(mundo, enemigo, cantidad, color = '#ff9a3c') {
  if (enemigo.muerto) return;
  enemigo.vida -= cantidad;
  enemigo.flash = Math.max(enemigo.flash, 0.05);
  if (!mundo.sinNumeros && mundo.textos.length < 24) crearTexto(mundo, enemigo.x, enemigo.y - enemigo.r, String(cantidad), color);
  if (enemigo.vida <= 0) matar(mundo, enemigo);
}

/** Prende fuego a un rival (Bota de Oro, bengalas): `dano` por golpe cada medio segundo durante 3 s. No se acumula: gana el más fuerte. */
export function quemar(mundo, enemigo, dano, segundos = 3) {
  if (enemigo.muerto) return;
  const d = Math.max(1, Math.round(dano * (enemigo.jefe ? 0.6 : 1) * (1 + (mundo.jugador.mult.fuego ?? 0))));
  const q = enemigo.quemado;
  if (!q || d >= q.dano) enemigo.quemado = { t: segundos, tick: q ? q.tick : 0.5, dano: d };
  else q.t = Math.max(q.t, segundos);
}

/**
 * Aturde a un rival `segundos` (más lo que den las combinaciones). Los jefes no se quedan quietos:
 * solo van más lentos un rato.
 */
export function aturdir(mundo, enemigo, segundos) {
  if (enemigo.muerto) return;
  const t = segundos + (mundo.jugador.mult.aturde ?? 0);
  if (enemigo.jefe) {
    enemigo.lento = Math.max(enemigo.lento, t * 0.6);
  } else {
    enemigo.aturdido = Math.max(enemigo.aturdido ?? 0, t);
    enemigo.embestida = 0;
  }
}

function colorDe(enemigo) {
  if (enemigo.elite) return ELITES.tipos[enemigo.elite].color;
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
  } else if (enemigo.elite) {
    for (let i = 0; i < 2; i += 1) soltarGema(mundo, enemigo.x, enemigo.y, enemigo.xp);
    if (mundo.rng.siguiente() < 0.08 && mundo.curas.length < CURAS.maximo) mundo.curas.push({ x: enemigo.x, y: enemigo.y });
  } else if (mundo.rng.siguiente() < CURAS.probabilidad && mundo.curas.length < CURAS.maximo) {
    mundo.curas.push({ x: enemigo.x, y: enemigo.y });
  }
  mundo.eventos.push({ tipo: 'baja' });
}
