// Mejor marca de cada usuario, guardada solo en este navegador (no se envía al servidor).
import { formatearTiempo } from './util.js';

const clave = (usuario) => `grada.marca.${usuario?.id ?? 'anonimo'}`;

export function leerMarca(usuario) {
  try {
    return JSON.parse(localStorage.getItem(clave(usuario)));
  } catch {
    return null;
  }
}

/** Guarda la partida si supera la mejor marca (por tiempo). Devuelve true si es un récord. */
export function guardarMarca(usuario, partida) {
  const anterior = leerMarca(usuario);
  if (anterior && anterior.tiempo >= partida.tiempo) return false;
  try {
    localStorage.setItem(clave(usuario), JSON.stringify(partida));
  } catch { /* sin almacenamiento: no pasa nada */ }
  return true;
}

export const textoMarca = (marca) => (marca
  ? `Tu mejor marca: ${formatearTiempo(marca.tiempo)} · oleada ${marca.oleada} · ${marca.bajas} rivales eliminados`
  : 'Aún no has jugado ninguna partida. ¡Estrena la grada!');

// ---------------------------------------------------------------------------------------------
// Tus tiempos: totales, mejores marcas y últimas partidas (también solo en este navegador).
// ---------------------------------------------------------------------------------------------

const claveStats = (usuario) => `grada.stats.${usuario?.id ?? 'anonimo'}`;
const VACIAS = {
  partidas: 0, bajas: 0, jefes: 0, mejorTiempo: 0, mejorOleada: 0, mejorNivel: 0, ultimas: [], mejores: [],
};

export function leerStats(usuario) {
  let guardadas = null;
  try { guardadas = JSON.parse(localStorage.getItem(claveStats(usuario))); } catch { /* sin datos */ }
  const stats = { ...VACIAS, ultimas: [], mejores: [], ...(guardadas || {}) };
  // Si solo existe la marca antigua (antes de este menú), se aprovecha
  const vieja = leerMarca(usuario);
  if (vieja && stats.mejorTiempo < vieja.tiempo) {
    stats.mejorTiempo = vieja.tiempo;
    stats.mejorOleada = Math.max(stats.mejorOleada, vieja.oleada || 0);
    stats.mejorNivel = Math.max(stats.mejorNivel, vieja.nivel || 0);
  }
  return stats;
}

/** Suma una partida terminada. Devuelve { stats, record } (record = nuevo mejor tiempo). */
export function registrarPartida(usuario, partida) {
  const stats = leerStats(usuario);
  const record = partida.tiempo > stats.mejorTiempo;
  const fila = {
    tiempo: Math.round(partida.tiempo), oleada: partida.oleada, nivel: partida.nivel, bajas: partida.bajas,
    jefes: partida.jefes, personaje: partida.personaje, entrenador: partida.entrenador, fecha: Date.now(),
  };
  stats.partidas += 1;
  stats.bajas += partida.bajas;
  stats.jefes += partida.jefes;
  stats.mejorTiempo = Math.max(stats.mejorTiempo, partida.tiempo);
  stats.mejorOleada = Math.max(stats.mejorOleada, partida.oleada);
  stats.mejorNivel = Math.max(stats.mejorNivel, partida.nivel);
  stats.ultimas = [fila, ...stats.ultimas].slice(0, 6);
  stats.mejores = [...stats.mejores, fila].sort((a, b) => b.tiempo - a.tiempo).slice(0, 5);
  try { localStorage.setItem(claveStats(usuario), JSON.stringify(stats)); } catch { /* sin almacenamiento */ }
  guardarMarca(usuario, partida);
  return { stats, record };
}
