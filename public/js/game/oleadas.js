// Oleadas: cuántos rivales salen, de qué equipo y con qué fuerza según avanza la partida.
// La partida es infinita: los rivales ganan vida, daño y velocidad sin parar (ver ESCALADO en config.js).
import {
  EQUIPOS, JEFES, ORDEN_JEFES, MUNDO, ESCALADO, minutosDeOleada, PIELES, PELOS,
} from './config.js';

let contadorId = 1;

/** Oleada actual (empieza en 1 y sube cada 30 s). */
export const oleadaEn = (tiempo) => 1 + Math.floor(tiempo / MUNDO.duracionOleada);

const intervaloAparicion = (oleada) => Math.max(0.12, 1.05 - 0.04 * (oleada - 1));
const gruposPorAparicion = (oleada) => 1 + Math.floor((oleada - 1) / 4);

export function crearEnemigo(tipo, x, y, oleada) {
  const base = EQUIPOS[tipo];
  const m = minutosDeOleada(oleada);
  const id = contadorId++;
  const vida = Math.max(1, Math.round(base.vida * ESCALADO.vida(m)));
  return {
    id,
    tipo,
    jefe: null,
    x,
    y,
    r: base.radio,
    vida,
    vidaMax: vida,
    vel: base.velocidad * ESCALADO.velocidad(m),
    dano: Math.max(1, Math.round(base.dano * ESCALADO.dano(m))),
    xp: Math.max(1, Math.round(base.xp * ESCALADO.xp(m))),
    freno: base.radio >= 19 ? 0.5 : 1,
    kx: 0,
    ky: 0,
    flash: 0,
    lento: 0,
    cdBanderin: 0,
    piel: id % PIELES.length,
    pelo: (id * 7) % PELOS.length,
    fase: Math.random() * 6.28, // solo para animar el dibujo
    muerto: false,
  };
}

/** Un jefe: `indice` 0 = Guardiola, 1 = Mourinho, 2 = Cristiano, 3 = Messi, y vuelta a empezar más fuertes. */
export function crearJefe(indice, x, y, oleada) {
  const clave = ORDEN_JEFES[indice % ORDEN_JEFES.length];
  const ciclo = Math.floor(indice / ORDEN_JEFES.length);
  const def = JEFES[clave];
  const m = minutosDeOleada(oleada);
  const vida = Math.round(def.vida * ESCALADO.vida(m) * (1 + 0.5 * ciclo));
  return {
    id: contadorId++,
    tipo: clave,
    jefe: clave,
    nombre: def.nombre,
    x,
    y,
    r: def.radio,
    vida,
    vidaMax: vida,
    vel: def.velocidad * Math.min(1.35, ESCALADO.velocidad(m)),
    dano: Math.max(1, Math.round(def.dano * ESCALADO.dano(m))),
    xp: Math.round(def.xp * ESCALADO.xp(m)),
    freno: def.freno,
    kx: 0,
    ky: 0,
    flash: 0,
    lento: 0,
    cdBanderin: 0,
    cd: def.cada * 0.6, // temporizador de su habilidad
    carga: 0,
    estado: 'normal',
    fase: Math.random() * 6.28,
    muerto: false,
  };
}

/** Elige un equipo según los pesos de los ya desbloqueados. */
function elegirTipo(mundo, oleada) {
  const tipos = Object.entries(EQUIPOS).filter(([, e]) => e.peso > 0 && oleada >= e.desde);
  const peso = (e) => e.peso * (1 + 0.04 * oleada);
  const total = tipos.reduce((suma, [, e]) => suma + peso(e), 0);
  let punto = mundo.rng.siguiente() * total;
  for (const [tipo, e] of tipos) {
    punto -= peso(e);
    if (punto <= 0) return tipo;
  }
  return 'madrid';
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
    for (let i = 0; i < n; i += 1) aparecer(mundo, elegirTipo(mundo, o), (i / n) * Math.PI * 2, mundo.rng.rango(-10, 10));
    mundo.eventos.push({ tipo: 'aviso', texto: '¡Te rodean!' });
  }
  if (o >= 2 && o % 4 === 2) {
    const centro = mundo.rng.rango(0, Math.PI * 2);
    const n = 10 + o;
    for (let i = 0; i < n; i += 1) aparecer(mundo, 'liverpool', centro + mundo.rng.rango(-0.35, 0.35), mundo.rng.rango(0, 60));
    mundo.eventos.push({ tipo: 'aviso', texto: '¡Contraataque rápido!' });
  }
  if (o >= 5 && o % 5 === 0) {
    const indice = o / 5 - 1;
    const [x, y] = colocarEnAnillo(mundo, mundo.rng.rango(0, Math.PI * 2), 0);
    const jefe = crearJefe(indice, x, y, o);
    mundo.enemigos.push(jefe);
    mundo.eventos.push({ tipo: 'aviso', texto: `¡${jefe.nombre}!`, jefe: true });
  }
}

/** Aparición continua de rivales entre eventos. */
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

/** Recoloca delante del jugador a los rivales que se han quedado muy atrás. */
export function reciclarLejanos(mundo) {
  const j = mundo.jugador;
  const lim2 = MUNDO.distanciaDescarte ** 2;
  for (let i = 0; i < mundo.enemigos.length; i += 1) {
    const e = mundo.enemigos[i];
    if ((e.x - j.x) ** 2 + (e.y - j.y) ** 2 > lim2 && !e.jefe) {
      const [x, y] = colocarEnAnillo(mundo, mundo.rng.rango(0, Math.PI * 2));
      e.x = x;
      e.y = y;
    }
  }
}
