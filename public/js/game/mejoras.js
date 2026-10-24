// Mejoras que se ofrecen al subir de nivel y cómo se aplican al jugador.
// Hay mejoras sin límite (EXTRAS), así que el juego nunca se queda sin opciones que ofrecer.
// Cada jugador solo puede aprender SUS habilidades (config.js → PERSONAJES[...].habilidades), y juntar
// ciertas habilidades a cierto nivel activa combinaciones («metas») con bonus (config.js → SINERGIAS).
import {
  ARMAS, PASIVAS, EXTRAS, POSICIONES, ENTRENADORES, JUGADOR, NIVEL_MAXIMO, PERSONAJES, SINERGIAS, ULTRAS,
} from './config.js';
import { curar } from './combate.js';
import { efectoEstadisticas, estadisticasVacias } from './club.js';
import { ultrasPara, celebrarUltra, nivelTotalArmas } from './ultras.js';

/** Nivel que tiene el jugador de una habilidad (arma) o mejora pasiva. */
const nivelDe = (j, clave) => j.armas[clave]?.nivel ?? j.pasivas[clave] ?? 0;

/** ¿Cumple el jugador los requisitos de la combinación? `cambio` = { clave, nivel } simula una mejora. */
function cumple(j, sin, cambio = null) {
  const nivel = (clave) => (cambio && cambio.clave === clave ? Math.max(cambio.nivel, nivelDe(j, clave)) : nivelDe(j, clave));
  for (const [clave, minimo] of Object.entries(sin.requiere)) if (nivel(clave) < minimo) return false;
  if (sin.distintas) {
    const claves = Object.keys(ARMAS);
    const cuantas = claves.filter((k) => nivel(k) >= sin.distintas.nivel).length;
    if (cuantas < sin.distintas.cuantas) return false;
  }
  return true;
}

/** Claves de las combinaciones que el jugador tiene activas ahora mismo. */
export const sinergiasActivas = (j) => Object.keys(SINERGIAS).filter((k) => cumple(j, SINERGIAS[k]));

/** Combinaciones aún sin activar que se completarían subiendo `clave` a `nivel`. */
function completaria(j, clave, nivel) {
  return Object.keys(SINERGIAS).filter((k) => !j.sinergias.includes(k) && cumple(j, SINERGIAS[k], { clave, nivel }));
}

/** Recalcula los atributos derivados (multiplicadores, vida máxima...) a partir de los niveles. */
export function recalcular(jugador) {
  const pos = POSICIONES[jugador.posicion];
  const ent = ENTRENADORES[jugador.entrenador];
  const mods = PERSONAJES[jugador.personaje]?.mods ?? {};
  const p = jugador.pasivas;
  const x = jugador.extras;

  // Combinaciones activas: suman sus bonus
  jugador.sinergias = sinergiasActivas(jugador);
  jugador.ultras = [...new Set([...ultrasPara(jugador.sinergias, nivelTotalArmas(jugador)), ...(jugador.ultrasForzadas ?? [])])]; // forzadas: solo para pruebas y calibración
  if (jugador.ultrasExactas) jugador.ultras = [...jugador.ultrasExactas]; // solo para calibrar: build con exactamente estas ultras
  const b = {
    dano: 0, vel: 0, cd: 0, armadura: 0, regen: 0, disparo: 0, cuerpo: 0, xp: 0, perfora: 0, aturde: 0, cdArbitro: 0, critico: 0, fuego: 0,
  };
  jugador.sinergias.forEach((k) => Object.entries(SINERGIAS[k].bonus).forEach(([campo, v]) => { b[campo] += v; }));

  const ef = efectoEstadisticas(jugador.entrenamiento ?? estadisticasVacias()); // estadísticas del club (entrenamiento)

  jugador.vidaMax = Math.round((pos.vida * (mods.vida ?? 1) + PASIVAS.pasion.porNivel * p.pasion + 12 * x.vida) * ent.mult.vida * ef.vida);
  jugador.velBase = pos.vel * (mods.vel ?? 1);
  jugador.mult = {
    vel: (1 + PASIVAS.botas.porNivel * p.botas + Math.min(0.4, 0.02 * x.vel) + 0.03 * p.brazalete) * ent.mult.vel * (1 + b.vel),
    dano: (1 + PASIVAS.tactica.porNivel * p.tactica + 0.04 * x.dano) * ent.mult.dano * (1 + b.dano) * ef.dano,
    cuerpo: pos.cuerpo * (mods.cuerpo ?? 1) * (1 + b.cuerpo),
    disparo: pos.disparo * (mods.disparo ?? 1) * (1 + b.disparo) * (1 + PASIVAS.balonOro.porNivel * p.balonOro) * (jugador.ultras.includes('balonOro') ? 1 + ULTRAS.balonOro.disparo : 1),
    xp: (1 + PASIVAS.cantera.porNivel * p.cantera + 0.05 * x.xp) * ent.mult.xp * (1 + b.xp) * ef.xp,
    cd: Math.max(0.35, (1 - PASIVAS.pulmones.porNivel * p.pulmones - 0.02 * x.recarga) * (1 - b.cd)),
    armadura: Math.min(0.7, PASIVAS.espinilleras.porNivel * p.espinilleras + b.armadura + ef.armadura + (jugador.ultras.includes('zamora') ? ULTRAS.zamora.armadura : 0)),
    critico: Math.min(0.8, PASIVAS.trebol.porNivel * p.trebol + ef.critico + b.critico),
    carga: 1 + PASIVAS.brazalete.porNivel * p.brazalete,
    fuego: b.fuego,
    perfora: b.perfora,
    aturde: b.aturde,
    cdArbitro: Math.min(0.6, b.cdArbitro),
  };
  jugador.radioIman = JUGADOR.radioImanBase * (1 + PASIVAS.iman.porNivel * p.iman);
  jugador.regen = PASIVAS.masaje.porNivel * p.masaje + b.regen;
  jugador.puedeDisparar = pos.disparo > 0;

  // Poderes de oro (cómo cambian el juego, más allá de los números)
  jugador.poder = {
    oro: p.balonOro,
    oroPerfora: p.balonOro >= 5 ? 2 : p.balonOro >= 3 ? 1 : 0,
    fuego: p.botaOro,
    guantes: Math.ceil(p.guanteOro / 2), // cargas máximas: 1, 1, 2, 2, 3
    guantesCada: Math.max(5, 16 - 2 * p.guanteOro), // segundos por carga
    prorroga: p.prorroga,
  };
  if (jugador.guantes) jugador.guantes.max = jugador.poder.guantes;
}

/** Elige hasta 3 mejoras distintas entre las que se pueden ofrecer. */
export function generarOpciones(mundo) {
  const j = mundo.jugador;
  const candidatas = [];
  const habilidades = PERSONAJES[j.personaje]?.habilidades;

  Object.entries(ARMAS).forEach(([clave, arma]) => {
    if (habilidades && !habilidades.includes(clave) && j.armas[clave].nivel === 0) return; // no es de su estilo
    if (arma.tipo === 'disparo' && !j.puedeDisparar) return; // el portero no dispara
    const nivel = j.armas[clave].nivel;
    if (nivel >= NIVEL_MAXIMO) return;
    candidatas.push({
      id: `arma:${clave}`, tipo: 'arma', clave, nivelNuevo: nivel + 1, nombre: arma.nombre, icono: arma.icono,
      descripcion: nivel === 0 ? arma.descripcion : arma.mejoras[nivel - 1],
    });
  });
  Object.entries(PASIVAS).forEach(([clave, pasiva]) => {
    const nivel = j.pasivas[clave];
    if (nivel >= NIVEL_MAXIMO) return;
    candidatas.push({
      id: `pasiva:${clave}`, tipo: 'pasiva', clave, nivelNuevo: nivel + 1, nombre: pasiva.nombre, icono: pasiva.icono, descripcion: pasiva.descripcion,
    });
  });

  // Cuando quedan pocas mejoras "normales", se completan con extras sin límite
  if (candidatas.length < 3) {
    Object.entries(EXTRAS).forEach(([clave, extra]) => {
      candidatas.push({
        id: `extra:${clave}`, tipo: 'extra', clave, nivelNuevo: j.extras[clave] + 1, nombre: extra.nombre, icono: extra.icono, descripcion: extra.descripcion,
      });
    });
  }

  // Marca con ★ las que completan una combinación
  candidatas.forEach((c) => {
    if (c.tipo === 'extra') return;
    const claves = completaria(j, c.clave, c.nivelNuevo);
    if (claves.length) {
      c.sinergia = SINERGIAS[claves[0]].nombre;
      // ¿Esa combinación nos da una ULTRA?
      const con = new Set([...j.sinergias, ...claves]);
      const nueva = ultrasPara(con, nivelTotalArmas(j) + (c.tipo === 'arma' ? 1 : 0)).find((u) => !j.ultras.includes(u));
      if (nueva) c.ultra = ULTRAS[nueva].nombre;
    }
  });

  const elegidas = mundo.rng.barajar(candidatas).slice(0, 3);
  // Para que perseguir una meta tenga recompensa, a menudo se cuela en la oferta una mejora que la completa
  const clave = candidatas.filter((c) => c.sinergia && !elegidas.includes(c));
  if (clave.length && !elegidas.some((c) => c.sinergia) && mundo.rng.siguiente() < 0.6) {
    elegidas[elegidas.length - 1] = mundo.rng.elegir(clave);
  }
  return elegidas;
}

/** Aplica la mejora elegida. Devuelve false si el id no existe (no hace nada). */
export function aplicarMejora(mundo, id) {
  const opcion = mundo.opciones.find((o) => o.id === id);
  if (!opcion) return false;
  const j = mundo.jugador;
  const antes = new Set(j.sinergias);
  const ultrasAntes = new Set(j.ultras);

  if (opcion.tipo === 'arma') {
    j.armas[opcion.clave].nivel = opcion.nivelNuevo;
    j.armas[opcion.clave].cd = 0;
    recalcular(j);
  } else if (opcion.tipo === 'pasiva') {
    j.pasivas[opcion.clave] = opcion.nivelNuevo;
    recalcular(j);
    if (opcion.clave === 'pasion') curar(mundo, PASIVAS.pasion.porNivel);
    if (opcion.clave === 'guanteOro') j.guantes.cargas = Math.min(j.guantes.max, j.guantes.cargas + 1);
  } else {
    j.extras[opcion.clave] += 1;
    recalcular(j);
    if (opcion.clave === 'vida') curar(mundo, 12);
  }

  // ¿Ha conseguido una combinación nueva?
  j.sinergias.filter((k) => !antes.has(k)).forEach((k) => {
    if (!mundo.sinergiasLogradas.includes(k)) mundo.sinergiasLogradas.push(k);
    mundo.eventos.push({ tipo: 'sinergia', clave: k, nombre: SINERGIAS[k].nombre, descripcion: SINERGIAS[k].descripcion });
  });
  // ¿Ha conseguido una ULTRA?
  j.ultras.filter((k) => !ultrasAntes.has(k)).forEach((k) => {
    if (!mundo.ultrasLogradas.includes(k)) mundo.ultrasLogradas.push(k);
    celebrarUltra(mundo, k);
  });
  return true;
}
