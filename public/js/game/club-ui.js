// HTML de las pantallas del CLUB: entrenamiento, contratos, ranking de la grada y recompensas de fin de partida.
// Solo construye texto HTML a partir de datos (sin DOM ni red), así se puede probar con node:test.
// `retrato(clave)` devuelve la URL del retrato de un jugador (lo pone juego.js).
import { PERSONAJES, POSICIONES } from './config.js';
import {
  ESTADISTICAS, ESTADISTICA_NOMBRES, NIVEL_ESTADISTICA_MAX, JEFES_POR_PUNTO, JEFES_POR_FICHA, PUNTOS_BAJAS_MAX, costePunto,
  rareza, probabilidadesContrato, efectoEstadisticas, estadisticasVacias,
} from './club.js';
import { icono } from './iconos.js';
import { formatearTiempo } from './util.js';

const ESC = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
};
export const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

const ORDEN_POSICIONES = ['portero', 'defensa', 'medio', 'delantero'];
export const porPosicion = (a, b) => ORDEN_POSICIONES.indexOf(PERSONAJES[a].posicion) - ORDEN_POSICIONES.indexOf(PERSONAJES[b].posicion);

export const htmlRareza = (clave) => {
  const r = rareza(clave);
  return `<span class="rareza rareza--${r.id}">${r.nombre}</span>`;
};

/** Texto del efecto de cada estadística según su nivel actual. */
export function textoEfecto(estadistica, nivel) {
  const e = efectoEstadisticas({ ...estadisticasVacias(), [estadistica]: nivel });
  if (estadistica === 'vida') return `+${Math.round((e.vida - 1) * 100)} % de vida`;
  if (estadistica === 'defensa') return `-${Math.round(e.armadura * 100)} % de daño recibido`;
  if (estadistica === 'disparo') return `+${Math.round((e.dano - 1) * 100)} % de daño`;
  return `${Math.round(e.critico * 100)} % crítico · +${Math.round((e.xp - 1) * 100)} % experiencia`;
}

/** Tarjeta pequeña de un jugador para listas. */
const miniatura = (clave, retrato) => `<img class="ficha__retrato" alt="" width="40" height="50" src="${retrato(clave)}">`;

// ---------------------------------------------------------------------------------------------
// Entrenamiento
// ---------------------------------------------------------------------------------------------

/**
 * Entrenamiento del jugador elegido para jugar (solo ese: para entrenar a otro, se cambia en el Vestuario).
 */
export function htmlEntrenamiento(club, seleccionado, retrato) {
  const fj = club.jugadores[seleccionado];
  const lista = fj ? `<li><div class="ficha ficha--elegida" aria-current="true">
      ${miniatura(seleccionado, retrato)}
      <span class="ficha__texto"><span class="ficha__nombre">${esc(PERSONAJES[seleccionado].nombre)}</span>
      <span class="ficha__posicion">${POSICIONES[PERSONAJES[seleccionado].posicion].nombre} · ${fj.jefes} jefes</span></span>
      ${fj.puntosLibres > 0 ? `<span class="insignia-puntos" title="Puntos por gastar">${fj.puntosLibres}</span>` : ''}
    </div></li>
    <li class="entrena__cambiar"><p>Entrenas al jugador con el que vas a jugar. ¿Quieres entrenar a otro?</p>
      <button type="button" class="btn btn--secundario" data-accion="vestuario">Cambiar en el Vestuario</button></li>` : '';
  const f = club.jugadores[seleccionado];
  if (!f) return { lista, panel: '<p class="panel__vacio">Elige un jugador de tu plantilla.</p>' };
  const p = PERSONAJES[seleccionado];
  const faltan = JEFES_POR_PUNTO - (f.jefes % JEFES_POR_PUNTO);
  const sig = f.siguientePunto;
  const filas = ESTADISTICAS.map((e) => {
    const nivel = f.stats[e];
    const info = ESTADISTICA_NOMBRES[e];
    const tope = nivel >= NIVEL_ESTADISTICA_MAX;
    const puede = f.puntosLibres > 0 && !tope;
    return `<li class="entrena">
      <span class="entrena__icono">${icono(info.icono, 24)}</span>
      <span class="entrena__cuerpo">
        <strong>${info.nombre} <em>nivel ${nivel}${tope ? ' · máx.' : ''}</em></strong>
        <span class="entrena__barra"><span style="width:${Math.round((nivel / NIVEL_ESTADISTICA_MAX) * 100)}%"></span></span>
        <small>${nivel ? textoEfecto(e, nivel) : info.descripcion}${nivel && !tope ? ` → <b>${textoEfecto(e, nivel + 1)}</b>` : ''}</small>
      </span>
      <button type="button" class="btn btn--primario entrena__mas" data-entrenar="${e}" ${puede ? '' : 'disabled'} aria-label="Subir ${info.nombre} de ${esc(p.nombre)}">+1</button>
    </li>`;
  }).join('');

  const panel = `
    <div class="detalle__cabecera">
      <img class="detalle__retrato" alt="" width="72" height="90" src="${retrato(seleccionado)}">
      <div>
        <h3 class="detalle__nombre">${esc(p.nombre)}</h3>
        <p class="detalle__posicion">${POSICIONES[p.posicion].nombre} ${htmlRareza(seleccionado)}</p>
        <p class="detalle__total"><strong>${f.puntosLibres}</strong> ${f.puntosLibres === 1 ? 'punto' : 'puntos'} por gastar</p>
      </div>
    </div>
    <div class="entrena__nota">
      <p>Eliminados con ${esc(p.nombre)}: <strong>${f.bajas ?? 0}</strong> rivales. ${sig
    ? `Próximo punto en <strong>${sig.faltan}</strong> más <span class="entrena__coste">(este punto cuesta ${sig.coste}; el último, ${costePunto(PUNTOS_BAJAS_MAX)})</span>.`
    : 'Ya has ganado todos los puntos por rivales eliminados.'}</p>
      ${sig ? `<span class="entrena__barra" aria-hidden="true"><span style="width:${Math.round((sig.hechas / sig.coste) * 100)}%"></span></span>` : ''}
      <p>Además, <strong>1 punto</strong> por cada <strong>${JEFES_POR_PUNTO} jefes</strong> vencidos (te faltan <strong>${faltan}</strong> para el siguiente).</p>
    </div>
    <ul class="entrena__lista">${filas}</ul>`;
  return { lista, panel };
}

// ---------------------------------------------------------------------------------------------
// Contratar
// ---------------------------------------------------------------------------------------------

export function htmlContratar(club, retrato) {
  const progreso = club.jefesTotal % JEFES_POR_FICHA;
  const probs = probabilidadesContrato({ jugadores: club.jugadores });
  const todos = probs.length === 0;
  const grupos = {};
  probs.forEach((x) => {
    const r = rareza(x.clave);
    grupos[r.id] = grupos[r.id] || { nombre: r.nombre, id: r.id, p: 0, n: 0 };
    grupos[r.id].p += x.probabilidad;
    grupos[r.id].n += 1;
  });
  const orden = ['comun', 'raro', 'epico', 'leyenda'].filter((id) => grupos[id]);
  const barras = orden.map((id) => `<li class="prob rareza--${id}"><span>${grupos[id].nombre} <small>(${grupos[id].n})</small></span>
      <span class="prob__barra"><span style="width:${Math.round(grupos[id].p * 100)}%"></span></span><b>${(grupos[id].p * 100).toFixed(1).replace('.', ',')} %</b></li>`).join('');
  const detalle = [...probs].sort((a, b) => b.probabilidad - a.probabilidad).map((x) => `
      <li class="prob-jugador"><img alt="" width="28" height="35" src="${retrato(x.clave)}"><span>${esc(PERSONAJES[x.clave].nombre)}</span>
      <span class="prob-jugador__hab">${PERSONAJES[x.clave].habilidades.length} hab.</span><b>${(x.probabilidad * 100).toFixed(1).replace('.', ',')} %</b></li>`).join('');

  return `
    <div class="contrato">
      <div class="contrato__ficha ${club.fichas > 0 ? 'contrato__ficha--lista' : ''}">
        <span class="contrato__icono">${icono('camiseta', 44)}</span>
        <div>
          <p class="contrato__cuenta"><strong>${club.fichas}</strong> ${club.fichas === 1 ? 'ficha de contrato' : 'fichas de contrato'}</p>
          <p class="contrato__sub">${todos ? '¡Ya tienes a todos los jugadores!' : `Te faltan <b>${JEFES_POR_FICHA - progreso}</b> jefes para la siguiente`}</p>
        </div>
      </div>
      <div class="contrato__progreso" role="progressbar" aria-label="Jefes hasta la siguiente ficha" aria-valuemin="0" aria-valuemax="${JEFES_POR_FICHA}" aria-valuenow="${progreso}">
        ${Array.from({ length: JEFES_POR_FICHA }, (_, i) => `<span class="${i < progreso ? 'lleno' : ''}"></span>`).join('')}
      </div>
      <button type="button" class="btn btn--primario contrato__canjear" data-accion="canjear" ${club.fichas > 0 && !todos ? '' : 'disabled'}>Canjear ficha: ¡un fichaje al azar!</button>
      <div class="contrato__resultado" data-campo="fichado" aria-live="polite"></div>
      ${todos ? '' : `
      <h4 class="panel__subtitulo">Probabilidades (cuantas más habilidades, menos probable)</h4>
      <ul class="probs">${barras}</ul>
      <details class="contrato__detalle"><summary>Ver jugador a jugador (${probs.length} por fichar)</summary><ul class="prob-jugadores">${detalle}</ul></details>`}
      <p class="entrena__nota">Tienes <strong>${Object.keys(club.jugadores).length}</strong> de <strong>${club.totalJugadores}</strong> jugadores.</p>
    </div>`;
}

/** La carta del jugador recién fichado. */
export function htmlFichado(clave, retrato) {
  const p = PERSONAJES[clave];
  return `<div class="fichado fichado--${rareza(clave).id}">
    <img alt="" width="96" height="120" src="${retrato(clave)}">
    <div>
      <p class="fichado__sobre">¡Nuevo fichaje! ${htmlRareza(clave)}</p>
      <h3>${esc(p.nombre)}</h3>
      <p class="fichado__nac">${esc(p.nacionalidad ?? '')}${p.epoca ? ` · ${esc(p.epoca)}` : ''} · ${POSICIONES[p.posicion].nombre} · ${p.habilidades.length} habilidades</p>
      <p>${esc(p.descripcion ?? p.estilo)}</p>
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------------------------
// Ranking de la grada y recompensas
// ---------------------------------------------------------------------------------------------

const fechaCorta = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

/** `avatar(a)`: URL de la imagen de un avatar ('p:koke'…) o null. */
export function htmlRankingGrada(datos, avatar = () => null) {
  if (!datos.filas.length) return '<p class="panel__vacio">Todavía no hay marcas. ¡Sé el primero en poner un tiempo!</p>';
  const filas = datos.filas.map((f) => `
    <li class="${f.esTuyo ? 'ranking__tuyo' : ''}">
      <span class="ranking__puesto">${f.posicion}</span>
      ${(() => { const url = f.avatar && /^[pe]:[a-z0-9]+$/.test(f.avatar) ? avatar(f.avatar) : null; return url ? `<img class="ranking__avatar" src="${url}" alt="" width="32" height="32">` : `<span class="ranking__avatar ranking__avatar--vacio" aria-hidden="true">${esc((f.alias || '?').slice(0, 1).toUpperCase())}</span>`; })()}
      <span class="ranking__datos"><strong>${esc(f.alias)}${f.esTuyo ? ' (tú)' : ''}</strong>
        <small>${esc(PERSONAJES[f.personaje]?.nombre ?? f.personaje)} · nivel ${f.nivel} · ${f.jefes} jefes${f.fecha ? ` · ${fechaCorta(f.fecha)}` : ''}</small></span>
      <span class="ranking__tiempo">${formatearTiempo(f.tiempo)}</span>
    </li>`).join('');
  const aviso = datos.tuMejor && !datos.filas.some((f) => f.esTuyo)
    ? `<p class="entrena__nota">Tu mejor marca: <strong>${formatearTiempo(datos.tuMejor.tiempo)}</strong> (nivel ${datos.tuMejor.nivel}). ¡Aún no entras en el top!</p>` : '';
  return `<ol class="ranking ranking--grada">${filas}</ol>${aviso}`;
}

/** Lo que has ganado al terminar la partida (según la respuesta del servidor). */
export function htmlRecompensas(r, nombreJugador) {
  if (!r) return '';
  const lineas = [];
  if (r.recompensas.puntosNuevos > 0) lineas.push(`<li>${icono('mas', 18)} <b>+${r.recompensas.puntosNuevos}</b> ${r.recompensas.puntosNuevos === 1 ? 'punto' : 'puntos'} de entrenamiento para ${esc(nombreJugador)}</li>`);
  if (r.recompensas.fichasNuevas > 0) lineas.push(`<li>${icono('camiseta', 18)} <b>+${r.recompensas.fichasNuevas}</b> ${r.recompensas.fichasNuevas === 1 ? 'ficha de contrato' : 'fichas de contrato'}: ¡ve a Contratar!</li>`);
  if (r.record) lineas.push(`<li>${icono('trofeo', 18)} <b>¡Nuevo récord personal en el ranking de la grada!</b></li>`);
  if (!lineas.length) lineas.push(`<li>${icono('calavera', 18)} ${r.recompensas.jefes} jefes: ${JEFES_POR_PUNTO} con el mismo jugador dan un punto y ${JEFES_POR_FICHA} dan una ficha.</li>`);
  return `<h4 class="panel__subtitulo">Tu club</h4><ul class="recompensas">${lineas.join('')}</ul>`;
}
