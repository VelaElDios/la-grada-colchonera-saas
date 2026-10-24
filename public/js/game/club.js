// Reglas del CLUB (la progresión que se guarda en la cuenta): plantilla, fichas de contrato y entrenamiento.
// Es lógica PURA (sin DOM ni red): la usa el servidor para validar y repartir y el cliente para mostrar.
// El servidor es quien manda: aquí solo se definen las reglas y las cuentas.
import { PERSONAJES } from './config.js';

export const ESTADISTICAS = ['vida', 'defensa', 'disparo', 'suerte'];
export const ESTADISTICA_NOMBRES = {
  vida: { nombre: 'Vida', icono: 'corazon', descripcion: '+6 % de vida máxima por punto.' },
  defensa: { nombre: 'Defensa', icono: 'escudo', descripcion: '-2 % de daño recibido por punto (hasta -40 %).' },
  disparo: { nombre: 'Disparo', icono: 'balon', descripcion: '+4 % de daño por punto, en todas tus armas.' },
  suerte: { nombre: 'Suerte', icono: 'trebol', descripcion: '+2 % de golpe crítico y +2 % de experiencia por punto.' },
};
export const NIVEL_ESTADISTICA_MAX = 20;
export const JEFES_POR_PUNTO = 3; // un punto de entrenamiento por cada 3 jefes vencidos con ese jugador
export const JEFES_POR_FICHA = 5; // una ficha de contrato por cada 5 jefes vencidos (con cualquiera)
export const HABILIDADES_MIN = 8;

export const estadisticasVacias = () => ({ vida: 0, defensa: 0, disparo: 0, suerte: 0 });

/** Un jugador es "de los malos" (puede salir en el equipo inicial) si tiene pocas habilidades. */
export const esInicial = (clave) => (PERSONAJES[clave]?.habilidades.length ?? 99) <= 10;

/** Probabilidad relativa de que un jugador salga en un contrato: cuantas más habilidades, menos. */
export const pesoContrato = (clave) => 1.4 ** -((PERSONAJES[clave]?.habilidades.length ?? HABILIDADES_MIN) - HABILIDADES_MIN);

/** Ficha vacía de un jugador recién fichado. */
export const fichaNueva = () => ({ jefes: 0, partidas: 0, stats: estadisticasVacias() });

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
export const puntosLibres = (ficha) => Math.max(0, Math.floor(ficha.jefes / JEFES_POR_PUNTO) - puntosGastados(ficha));

/** Jugadores que aún no se tienen (los candidatos de un contrato). */
export const sinFichar = (perfil) => Object.keys(PERSONAJES).filter((k) => !perfil.jugadores[k]);

/** Elige un jugador que no se tenga, con más probabilidad cuantas menos habilidades tenga. Devuelve null si ya están todos. */
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

/** Nivel de rareza para etiquetar a un jugador según su número de habilidades. */
export function rareza(clave) {
  const n = PERSONAJES[clave]?.habilidades.length ?? HABILIDADES_MIN;
  if (n <= 10) return { id: 'comun', nombre: 'Común' };
  if (n <= 12) return { id: 'raro', nombre: 'Raro' };
  if (n <= 14) return { id: 'epico', nombre: 'Épico' };
  return { id: 'leyenda', nombre: 'Leyenda' };
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
