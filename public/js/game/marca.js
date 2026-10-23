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
