// Oleadas: cuántos rivales salen, de qué equipo y con qué fuerza según avanza la partida.
// La partida es infinita: los rivales ganan vida, daño y velocidad sin parar (ver ESCALADO en config.js).
import {
  EQUIPOS, JEFES, ORDEN_JEFES, MUNDO, ESCALADO, ESCALADO_JEFE, ELITES, minutosDeOleada, PIELES, PELOS, fuerzaAmbiente, PIES,
} from './config.js';

let contadorId = 1;

/** Oleada actual (empieza en 1 y sube cada 30 s). */
export const oleadaEn = (tiempo) => 1 + Math.floor(tiempo / MUNDO.duracionOleada);

// Menos rivales que antes, pero cada uno más duro (y con élites): la tensión viene de la calidad, no de la cantidad.
const intervaloAparicion = (oleada) => Math.max(0.25, 1.7 - 0.072 * (oleada - 1));
const gruposPorAparicion = (oleada) => 1 + Math.floor((oleada - 1) / 4);

/** `elite`: clave de ELITES.tipos para un rival más duro (ver config.js). */
export function crearEnemigo(tipo, x, y, oleada, elite = null) {
  const base = EQUIPOS[tipo];
  const m = minutosDeOleada(oleada);
  const id = contadorId++;
  const el = elite ? ELITES.tipos[elite] : null;
  const fa = fuerzaAmbiente(m);
  const vida = Math.max(1, Math.round(base.vida * ESCALADO.vida(m) * fa.vida * (el ? el.vida : 1)));
  return {
    id,
    tipo,
    jefe: null,
    elite,
    x,
    y,
    r: base.radio * (el ? el.radio : 1),
    pies: base.radio * (el ? el.radio : 1) * PIES.alto,
    rPies: base.radio * (el ? el.radio : 1) * PIES.radio,
    vida,
    vidaMax: vida,
    vel: base.velocidad * ESCALADO.velocidad(m) * MUNDO.velRivales * (el ? el.vel : 1),
    dano: Math.max(1, Math.round(base.dano * ESCALADO.dano(m) * fa.dano * (el ? el.dano : 1))),
    xp: Math.max(1, Math.round(base.xp * ESCALADO.xp(m) * (el ? el.xp : 1))),
    // Reparto estable (sin azar) para que no todos embistan o disparen a la vez
    cdEmbestida: base.embiste ? base.embiste.cada * (0.3 + ((id * 37) % 100) / 140) : 0,
    cdDisparo: base.dispara ? base.dispara.cada * (0.3 + ((id * 53) % 100) / 140) : 0,
    aviso: 0,
    embestida: 0,
    dirX: 0,
    dirY: 0,
    freno: base.radio * (el ? el.radio : 1) >= 19 ? 0.5 : 1,
    kx: 0,
    ky: 0,
    flash: 0,
    lento: 0,
    cdBanderin: 0,
    piel: id % PIELES.length,
    pelo: (id * 7) % PELOS.length,
    anim: Math.random() * 6.28, // solo para animar el dibujo
    muerto: false,
  };
}

/**
 * Un jefe. Sin `claveElegida` sale por orden (ORDEN_JEFES); con ella, ese jefe. `indice` es cuántos jefes han salido ya:
 * cada vuelta completa a la lista los hace un 50 % más duros.
 */
export function crearJefe(indice, x, y, oleada, claveElegida = null) {
  const clave = claveElegida ?? ORDEN_JEFES[indice % ORDEN_JEFES.length];
  const ciclo = Math.floor(indice / ORDEN_JEFES.length);
  const def = JEFES[clave];
  const m = minutosDeOleada(oleada);
  const fa = fuerzaAmbiente(m);
  const vida = Math.round(def.vida * ESCALADO_JEFE.vida(m, indice) * fa.vida * (1 + 0.25 * ciclo));
  return {
    id: contadorId++,
    tipo: clave,
    jefe: clave,
    nombre: def.nombre,
    x,
    y,
    r: def.radio,
    pies: def.radio * PIES.alto,
    rPies: def.radio * PIES.radio,
    vida,
    vidaMax: vida,
    vel: def.velocidad * Math.min(1.35, ESCALADO.velocidad(m)) * MUNDO.velRivales,
    dano: Math.max(1, Math.round(def.dano * ESCALADO_JEFE.dano(m, indice) * fa.dano)),
    xp: Math.round(def.xp * ESCALADO.xp(m)),
    freno: def.freno,
    kx: 0,
    ky: 0,
    flash: 0,
    lento: 0,
    cdBanderin: 0,
    cd: def.cada * 0.6, // temporizador hasta su siguiente habilidad
    carga: 0,
    estado: 'normal',
    fase: 1, // 1, 2 o 3 según la vida que le queda
    cola: [], // acciones programadas { t, hacer }
    rotacion: 0, // por cuál de sus habilidades va
    pendientes: 0, // embestidas o saltos que quedan en la cadena actual
    anim: Math.random() * 6.28,
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

/** ¿Este rival sale como élite? Más a menudo cuanto más avanzada la partida. */
function elegirElite(mundo, oleada) {
  if (oleada < ELITES.desde || mundo.rng.siguiente() >= ELITES.probabilidad(oleada)) return null;
  return mundo.rng.elegir(Object.keys(ELITES.tipos));
}

function aparecer(mundo, tipo, angulo, margen) {
  if (mundo.enemigos.length >= MUNDO.maxEnemigos) return;
  const [x, y] = colocarEnAnillo(mundo, angulo, margen);
  mundo.enemigos.push(crearEnemigo(tipo, x, y, mundo.oleada, elegirElite(mundo, mundo.oleada)));
}

/**
 * Jefe que toca: al azar entre los que ya pueden salir (`desde` = a partir de qué jefe de la partida) y que
 * no han salido aún en esta ronda. Cuando han salido todos, empieza otra ronda (sin repetir el último).
 */
export function elegirJefe(mundo, indice) {
  const aptos = ORDEN_JEFES.filter((c) => (JEFES[c].desde ?? 0) <= indice);
  let libres = aptos.filter((c) => !mundo.jefesVistos.includes(c));
  if (!libres.length) {
    const ultimo = mundo.jefesVistos[mundo.jefesVistos.length - 1];
    mundo.jefesVistos = [];
    libres = aptos.filter((c) => c !== ultimo);
    if (!libres.length) libres = aptos;
  }
  const clave = mundo.rng.elegir(libres);
  mundo.jefesVistos.push(clave);
  return clave;
}

/** Eventos especiales al empezar una oleada: cercos, manadas y jefes. */
export function empezarOleada(mundo) {
  const o = mundo.oleada;
  mundo.eventos.push({ tipo: 'oleada', oleada: o });

  if (o >= 2 && o % 3 === 1) {
    const n = Math.min(110, 12 + 3 * o);
    for (let i = 0; i < n; i += 1) aparecer(mundo, elegirTipo(mundo, o), (i / n) * Math.PI * 2, mundo.rng.rango(-10, 10));
    mundo.eventos.push({ tipo: 'aviso', texto: '¡Te rodean!' });
  }
  if (o >= 2 && o % 4 === 2) {
    const centro = mundo.rng.rango(0, Math.PI * 2);
    const n = 10 + o;
    for (let i = 0; i < n; i += 1) aparecer(mundo, 'liverpool', centro + mundo.rng.rango(-0.35, 0.35), mundo.rng.rango(0, 60));
    mundo.eventos.push({ tipo: 'aviso', texto: '¡Contraataque rápido!' });
  }
  if (o >= 4 && o % 4 === 0) { // un jefe cada 2 minutos, el primero a los 1:30
    const indice = o / 4 - 1;
    const salen = o >= 24 && o % 8 === 0 ? 2 : 1; // más adelante salen dos a la vez
    for (let k = 0; k < salen; k += 1) {
      const [x, y] = colocarEnAnillo(mundo, mundo.rng.rango(0, Math.PI * 2), 0);
      const jefe = crearJefe(indice, x, y, o, elegirJefe(mundo, indice));
      mundo.enemigos.push(jefe);
      mundo.eventos.push({ tipo: 'aviso', texto: `¡${jefe.nombre}!`, jefe: true });
    }
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
    if (!Number.isFinite(e.x + e.y)) { // red de seguridad: un rival con posición rota vuelve al campo
      const [x, y] = colocarEnAnillo(mundo, mundo.rng.rango(0, Math.PI * 2));
      e.x = x; e.y = y; e.kx = 0; e.ky = 0; e.rodeo = 0;
    } else if ((e.x - j.x) ** 2 + (e.y - j.y) ** 2 > lim2 && !e.jefe) {
      const [x, y] = colocarEnAnillo(mundo, mundo.rng.rango(0, Math.PI * 2));
      e.x = x;
      e.y = y;
    }
  }
}
