// Reglas del CLUB (la progresión que se guarda en la cuenta): plantilla, fichas de contrato y entrenamiento.
// Es lógica PURA (sin DOM ni red): la usa el servidor para validar y repartir y el cliente para mostrar.
// El servidor es quien manda: aquí solo se definen las reglas y las cuentas.
import { PERSONAJES, RAREZAS } from './config.js';

export const ESTADISTICAS = ['vida', 'defensa', 'disparo', 'suerte'];
export const ESTADISTICA_NOMBRES = {
  vida: { nombre: 'Vida', icono: 'corazon', descripcion: '+6 % de vida máxima por punto.' },
  defensa: { nombre: 'Defensa', icono: 'escudo', descripcion: '-2 % de daño recibido por punto (hasta -40 %).' },
  disparo: { nombre: 'Disparo', icono: 'balon', descripcion: '+4 % de daño por punto, en todas tus armas.' },
  suerte: { nombre: 'Suerte', icono: 'trebol', descripcion: '+2 % de golpe crítico y +2 % de experiencia por punto.' },
};
export const NIVEL_ESTADISTICA_MAX = 20;
export const JEFES_POR_PUNTO = 3; // un punto de entrenamiento por cada 3 jefes vencidos con ese jugador
export const JEFES_POR_FICHA = 3; // una ficha de contrato por cada 3 jefes vencidos (con cualquiera)
export const PUNTOS_BAJAS_MAX = 40; // los rivales eliminados dan hasta 40 puntos de entrenamiento por jugador

/** Rivales que hay que eliminar con un jugador para ganar su punto nº `k`: los primeros salen baratos y los últimos cuestan mucho. */
export const costePunto = (k) => Math.round(90 + 30 * k + 0.9 * k * k);

/** Puntos de entrenamiento que dan `bajas` rivales eliminados con un jugador. */
export function puntosPorBajas(bajas = 0) {
  let k = 0;
  let acumulado = 0;
  while (k < PUNTOS_BAJAS_MAX && acumulado + costePunto(k + 1) <= bajas) {
    acumulado += costePunto(k + 1);
    k += 1;
  }
  return k;
}

/** Cuántos rivales faltan para el próximo punto por bajas (null si ya está en el tope) y lo que cuesta ese punto. */
export function proximoPuntoPorBajas(bajas = 0) {
  const k = puntosPorBajas(bajas);
  if (k >= PUNTOS_BAJAS_MAX) return null;
  let acumulado = 0;
  for (let i = 1; i <= k; i += 1) acumulado += costePunto(i);
  const coste = costePunto(k + 1);
  return { faltan: acumulado + coste - bajas, coste, hechas: bajas - acumulado };
}
export const HABILIDADES_MIN = 8;

export const estadisticasVacias = () => ({ vida: 0, defensa: 0, disparo: 0, suerte: 0 });

/** Clave de rareza de un jugador (según lo que fue en el Atleti: ver RAREZAS en config.js). */
export const rarezaDe = (clave) => PERSONAJES[clave]?.rareza ?? 'comun';

/** Un jugador puede salir en el equipo inicial si es de rareza común. */
export const esInicial = (clave) => rarezaDe(clave) === 'comun';

/** Probabilidad relativa de que un jugador salga en un contrato: cuanto más raro, menos. */
export const pesoContrato = (clave) => RAREZAS[rarezaDe(clave)].peso;

/** Ficha vacía de un jugador recién fichado. */
export const fichaNueva = () => ({ jefes: 0, bajas: 0, partidas: 0, stats: estadisticasVacias() });

/** Equipo inicial: un portero, un defensa, un medio y un delantero de entre los "malos". `azar()` devuelve [0,1). */
export function plantillaInicial(azar) {
  return ['portero', 'defensa', 'medio', 'delantero'].map((posicion) => {
    const candidatos = Object.keys(PERSONAJES).filter((k) => PERSONAJES[k].posicion === posicion && esInicial(k));
    return candidatos[Math.min(candidatos.length - 1, Math.floor(azar() * candidatos.length))];
  });
}

export function perfilNuevo(azar) {
  const jugadores = {};
  plantillaInicial(azar).forEach((k) => { jugadores[k] = fichaNueva(); });
  return { version: 1, jefesTotal: 0, fichasUsadas: 0, partidas: 0, jugadores };
}

export const fichasGanadas = (perfil) => Math.floor(perfil.jefesTotal / JEFES_POR_FICHA);
export const fichasDisponibles = (perfil) => Math.max(0, fichasGanadas(perfil) - perfil.fichasUsadas);

export const puntosGastados = (ficha) => ESTADISTICAS.reduce((s, k) => s + (ficha.stats[k] || 0), 0);
/** Puntos ganados en total: 1 por cada 3 jefes y los de las bajas. */
export const puntosGanados = (ficha) => Math.floor(ficha.jefes / JEFES_POR_PUNTO) + puntosPorBajas(ficha.bajas || 0);
export const puntosLibres = (ficha) => Math.max(0, puntosGanados(ficha) - puntosGastados(ficha));

/** Jugadores que aún no se tienen (los candidatos de un contrato). */
export const sinFichar = (perfil) => Object.keys(PERSONAJES).filter((k) => !perfil.jugadores[k]);

/** Elige un jugador que no se tenga, con más probabilidad cuanto menos raro sea. Devuelve null si ya están todos. */
export function sortearContrato(perfil, azar) {
  const candidatos = sinFichar(perfil);
  if (!candidatos.length) return null;
  const total = candidatos.reduce((s, k) => s + pesoContrato(k), 0);
  let punto = azar() * total;
  for (const k of candidatos) {
    punto -= pesoContrato(k);
    if (punto < 0) return k;
  }
  return candidatos[candidatos.length - 1];
}

/** Probabilidad (0-1) de cada candidato en el próximo contrato, para enseñarla en pantalla. */
export function probabilidadesContrato(perfil) {
  const candidatos = sinFichar(perfil);
  const total = candidatos.reduce((s, k) => s + pesoContrato(k), 0);
  return candidatos.map((k) => ({ clave: k, probabilidad: pesoContrato(k) / total }));
}

/** Rareza para etiquetar a un jugador: { id, nombre, color }. */
export function rareza(clave) {
  const id = rarezaDe(clave);
  return { id, nombre: RAREZAS[id].nombre, color: RAREZAS[id].color };
}

/** Efecto de las estadísticas de entrenamiento (lo usa recalcular en mejoras.js). */
export function efectoEstadisticas(stats = estadisticasVacias()) {
  return {
    vida: 1 + 0.06 * (stats.vida || 0),
    armadura: Math.min(0.4, 0.02 * (stats.defensa || 0)),
    dano: 1 + 0.04 * (stats.disparo || 0),
    critico: 0.02 * (stats.suerte || 0),
    xp: 1 + 0.02 * (stats.suerte || 0),
  };
}
