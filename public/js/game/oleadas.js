// Oleadas: cuántos enemigos salen, de qué tipo y con qué fuerza según avanza la partida.
import { ENEMIGOS, MUNDO } from './config.js';

let contadorId = 1;

/** Oleada actual (empieza en 1 y sube cada 30 s). */
export const oleadaEn = (tiempo) => 1 + Math.floor(tiempo / MUNDO.duracionOleada);

const escalaVida = (oleada) => 1 + 0.14 * (oleada - 1);
const escalaVelocidad = (oleada) => Math.min(1.5, 1 + 0.02 * (oleada - 1));
const intervaloAparicion = (oleada) => Math.max(0.12, 1.05 - 0.04 * (oleada - 1));
const gruposPorAparicion = (oleada) => 1 + Math.floor((oleada - 1) / 4);

export function crearEnemigo(tipo, x, y, oleada) {
  const base = ENEMIGOS[tipo];
  const vida = Math.round(base.vida * escalaVida(oleada));
  return {
    id: contadorId++,
    tipo,
    x,
    y,
    r: base.radio,
    vida,
    vidaMax: vida,
    vel: base.velocidad * escalaVelocidad(oleada),
    dano: base.dano,
    xp: base.xp,
    color: base.color,
    kx: 0,
    ky: 0,
    flash: 0,
    cdBanderin: 0,
    fase: Math.random() * 6.28, // solo para animar el dibujo
    muerto: false,
  };
}

/** Elige un tipo de enemigo según los pesos de los tipos ya desbloqueados. */
function elegirTipo(mundo, oleada) {
  const tipos = Object.entries(ENEMIGOS).filter(([, e]) => e.peso > 0 && oleada >= e.desdeOleada);
  const total = tipos.reduce((suma, [, e]) => suma + e.peso * (1 + 0.04 * oleada), 0);
  let punto = mundo.rng.siguiente() * total;
  for (const [tipo, e] of tipos) {
    punto -= e.peso * (1 + 0.04 * oleada);
    if (punto <= 0) return tipo;
  }
  return 'rival';
}

function colocarEnAnillo(mundo, angulo, margen = 0) {
  const j = mundo.jugador;
  const d = MUNDO.distanciaAparicion + margen;
  return [j.x + Math.cos(angulo) * d, j.y + Math.sin(angulo) * d];
}

function aparecer(mundo, tipo, angulo, margen) {
  if (mundo.enemigos.length >= MUNDO.maxEnemigos) return;
  const [x, y] = colocarEnAnillo(mundo, angulo, margen);
  mundo.enemigos.push(crearEnemigo(tipo, x, y, mundo.oleada));
}

/** Eventos especiales al empezar una oleada: cercos, manadas y jefes. */
export function empezarOleada(mundo) {
  const o = mundo.oleada;
  mundo.eventos.push({ tipo: 'oleada', oleada: o });

  if (o >= 2 && o % 3 === 1) {
    const n = 12 + 2 * o;
    for (let i = 0; i < n; i += 1) aparecer(mundo, 'rival', (i / n) * Math.PI * 2, mundo.rng.rango(-10, 10));
    mundo.eventos.push({ tipo: 'aviso', texto: '¡Te rodean!' });
  }
  if (o >= 2 && o % 4 === 2) {
    const centro = mundo.rng.rango(0, Math.PI * 2);
    const n = 10 + o;
    for (let i = 0; i < n; i += 1) aparecer(mundo, 'velocista', centro + mundo.rng.rango(-0.35, 0.35), mundo.rng.rango(0, 60));
    mundo.eventos.push({ tipo: 'aviso', texto: '¡Una manada de velocistas!' });
  }
  if (o >= 5 && o % 5 === 0) {
    aparecer(mundo, 'jefe', mundo.rng.rango(0, Math.PI * 2), 0);
    mundo.eventos.push({ tipo: 'aviso', texto: '¡Llega el Míster Rival!' });
  }
}

/** Aparición continua de enemigos entre eventos. */
export function actualizarApariciones(mundo, dt) {
  mundo.temporizadorAparicion -= dt;
  while (mundo.temporizadorAparicion <= 0) {
    mundo.temporizadorAparicion += intervaloAparicion(mundo.oleada);
    const grupos = gruposPorAparicion(mundo.oleada);
    for (let i = 0; i < grupos; i += 1) {
      aparecer(mundo, elegirTipo(mundo, mundo.oleada), mundo.rng.rango(0, Math.PI * 2), mundo.rng.rango(0, 40));
    }
  }
}

/** Recoloca delante del jugador a los enemigos que se han quedado muy atrás. */
export function reciclarLejanos(mundo) {
  const j = mundo.jugador;
  const lim2 = MUNDO.distanciaDescarte ** 2;
  for (let i = 0; i < mundo.enemigos.length; i += 1) {
    const e = mundo.enemigos[i];
    if ((e.x - j.x) ** 2 + (e.y - j.y) ** 2 > lim2 && e.tipo !== 'jefe') {
      const [x, y] = colocarEnAnillo(mundo, mundo.rng.rango(0, Math.PI * 2));
      e.x = x;
      e.y = y;
    }
  }
}
