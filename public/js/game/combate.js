// Daño, muertes, recompensas y efectos visuales sencillos (números flotantes y partículas).
import {
  MUNDO, EQUIPOS, JEFES, MOVIMIENTO, CURAS, ELITES, AYUDA_INICIAL, CUERPO, resistenciaCurtidos,
} from './config.js';
import { explosionDeFuego } from './ultras.js';
import {
  emitir, texto, numeroDeDano, chispasDeImpacto, restosDeBaja,
} from './efectos.js';

export function crearTexto(mundo, x, y, contenido, color = '#ffffff') {
  texto(mundo, x, y, contenido, color);
}

/** Partículas sencillas (con tope y reutilizando objetos: ver efectos.js). */
export function crearParticulas(mundo, x, y, color, cantidad = 6, velocidad = 120) {
  emitir(mundo, x, y, color, cantidad, velocidad);
}

/**
 * ¿Toca el círculo (x, y, r) lo que se ve del rival `e`? Para balones y demás cosas que vuelan: se mira la
 * cabeza y el cuerpo del muñeco (ver CUERPO en config.js), no solo un círculo en su centro.
 */
export function tocaCuerpo(e, x, y, r = 0) {
  const { cabeza, tronco } = CUERPO;
  const dx2 = (x - e.x) ** 2;
  if (dx2 + (y - e.y - cabeza.y * e.r) ** 2 <= (cabeza.radio * e.r + r) ** 2) return true;
  if (dx2 + (y - e.y - tronco.y * e.r) ** 2 <= (tronco.radio * e.r + r) ** 2) return true;
  return dx2 + (y - e.y) ** 2 <= (e.r + r) ** 2; // el cuello (entre los dos), como antes
}

/** Suelta una gema de experiencia; si hay demasiadas, la suma a una existente. */
export function soltarGema(mundo, x, y, valor) {
  const gx = x + mundo.rng.rango(-6, 6);
  const gy = y + mundo.rng.rango(-6, 6);
  if (mundo.gemas.length >= MUNDO.maxGemas) {
    // Lleno: la gema más lejana del jugador (la que se ha quedado atrás) se trae aquí con su valor. Antes el valor
    // iba a una gema al azar, casi siempre lejos y fuera de la pantalla, y parecía que los rivales dejaban de soltar
    // experiencia en cuanto te alejabas de donde habías luchado.
    const j = mundo.jugador;
    let lejana = mundo.gemas[0];
    let max = -1;
    for (let i = 0; i < mundo.gemas.length; i += 1) {
      const g = mundo.gemas[i];
      if (g.atraida || g.recogida) continue;
      const d2 = (g.x - j.x) ** 2 + (g.y - j.y) ** 2;
      if (d2 > max) { max = d2; lejana = g; }
    }
    lejana.valor += valor;
    lejana.x = gx;
    lejana.y = gy;
    lejana.atraida = false;
    return;
  }
  mundo.gemas.push({ x: gx, y: gy, valor, atraida: false });
}

export function curar(mundo, cantidad) {
  const j = mundo.jugador;
  const antes = j.vida;
  j.vida = Math.min(j.vidaMax, j.vida + cantidad);
  if (mundo.stats) mundo.stats.curado += j.vida - antes;
  return j.vida - antes;
}

/** Multiplicador de daño del jugador según el tipo de ataque ('cuerpo', 'disparo' o 'ulti'). */
export function multiplicadorDano(jugador, tipo) {
  const porTipo = tipo === 'disparo' ? jugador.mult.disparo : tipo === 'cuerpo' ? jugador.mult.cuerpo : 1;
  const ritmo = 1 + MOVIMIENTO.bonoDano * (jugador.ritmo ?? 0); // correr da más daño
  const novato = 1 + AYUDA_INICIAL.dano * (jugador.ayuda ?? 0); // ayuda de los primeros minutos
  const contra = jugador.contra && jugador.contra.t > 0 ? 1 + jugador.contra.dano : 1; // contragolpe
  return jugador.mult.dano * porTipo * ritmo * novato * contra * (jugador.animo > 0 ? jugador.bonoAnimo : 1);
}

/**
 * Resta vida a un rival aplicando los multiplicadores del jugador (posición, mejoras, entrenador).
 * `empuje` = [dx, dy] unitario y velocidad inicial del empujón.
 */
export function danar(mundo, enemigo, base, empuje = null, velEmpuje = 0, tipo = 'cuerpo') {
  if (enemigo.muerto) return;
  // «Partidos grandes»: más daño a jefes y élites
  const grandes = enemigo.jefe || enemigo.elite ? 1 + (mundo.jugador.mult.grandes ?? 0) : 1;
  let cantidad = Math.max(1, Math.round(base * multiplicadorDano(mundo.jugador, tipo) * grandes * resistenciaCurtidos(mundo.tiempo / 60)));
  // Golpe crítico (Trébol y suerte): el doble de daño
  const critico = (mundo.jugador.mult.critico ?? 0) > 0 && mundo.rng.siguiente() < mundo.jugador.mult.critico;
  if (critico) cantidad *= 2;
  anotarDano(mundo, enemigo, cantidad, critico);
  enemigo.vida -= cantidad;
  enemigo.flash = 0.1;
  chispasDeImpacto(mundo, enemigo, empuje, critico); // chispas del color de la habilidad
  if (empuje && velEmpuje) {
    enemigo.kx += empuje[0] * velEmpuje * enemigo.freno;
    enemigo.ky += empuje[1] * velEmpuje * enemigo.freno;
  }
  if (!mundo.sinNumeros) numeroDeDano(mundo, enemigo, cantidad, critico, critico ? '#ffd23f' : enemigo.jefe ? '#ffe08a' : '#ffffff');
  if (enemigo.vida <= 0) matar(mundo, enemigo);
  else mundo.eventos.push({ tipo: 'golpe' });
}

/**
 * Estadísticas de la partida: cuánto daño hace cada arma (`mundo.fuente`, que fija quien ataca) sin contar
 * el que sobra al matar.
 */
function anotarDano(mundo, enemigo, cantidad, critico, porDefecto = 'otros') {
  const st = mundo.stats;
  if (!st) return;
  const util = Math.max(0, Math.min(cantidad, enemigo.vida));
  const f = mundo.fuente ?? porDefecto;
  st.dano[f] = (st.dano[f] ?? 0) + util;
  st.danoTotal += util;
  if (critico) st.criticos += 1;
  if (cantidad > st.golpeMax) st.golpeMax = cantidad;
}

/** Daño que no depende de tus multiplicadores (quemaduras): ya viene calculado. */
export function danoFijo(mundo, enemigo, cantidad, color = '#ff9a3c') {
  if (enemigo.muerto) return;
  anotarDano(mundo, enemigo, cantidad, false, 'fuego');
  enemigo.vida -= cantidad;
  enemigo.flash = Math.max(enemigo.flash, 0.05);
  if (!mundo.sinNumeros && mundo.textos.length < 30) numeroDeDano(mundo, enemigo, cantidad, false, color);
  if (enemigo.vida <= 0) matar(mundo, enemigo);
}

/** Prende fuego a un rival (Botas en llamas, bengalas): `dano` por golpe cada medio segundo durante 3 s. No se acumula: gana el más fuerte. */
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
  if (enemigo.quemado && mundo.jugador.ultras.includes('botaOro')) explosionDeFuego(mundo, enemigo);
  mundo.cargaPendiente += enemigo.jefe ? 12 : 1;
  soltarGema(mundo, enemigo.x, enemigo.y, enemigo.xp);
  restosDeBaja(mundo, enemigo.x, enemigo.y, colorDe(enemigo), !!enemigo.jefe);

  if (enemigo.jefe) {
    for (let i = 0; i < 4; i += 1) soltarGema(mundo, enemigo.x, enemigo.y, enemigo.xp);
    mundo.curas.push({ x: enemigo.x, y: enemigo.y });
    mundo.sacudida = Math.max(mundo.sacudida, 0.4);
    mundo.congelar = Math.max(mundo.congelar, 0.14);
    mundo.jugador.jefes += 1;
    if (mundo.stats) mundo.stats.jefes.push({ clave: enemigo.jefe, nombre: enemigo.nombre, t: mundo.tiempo, vivo: mundo.tiempo - (enemigo.nacio ?? mundo.tiempo) });
    mundo.eventos.push({ tipo: 'jefe-derrotado', nombre: enemigo.nombre });
  } else if (enemigo.elite) {
    for (let i = 0; i < 2; i += 1) soltarGema(mundo, enemigo.x, enemigo.y, enemigo.xp);
    if (mundo.rng.siguiente() < 0.08 && mundo.curas.length < CURAS.maximo) mundo.curas.push({ x: enemigo.x, y: enemigo.y });
  } else if (mundo.rng.siguiente() < CURAS.probabilidad && mundo.curas.length < CURAS.maximo) {
    mundo.curas.push({ x: enemigo.x, y: enemigo.y });
  }
  mundo.eventos.push({ tipo: 'baja' });
}
