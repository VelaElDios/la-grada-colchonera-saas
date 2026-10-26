// HTML de la pantalla de fin de partida (estadísticas) y de la pantalla de logros.
// Solo construye texto a partir de datos (sin DOM ni red), así se puede probar con node:test.
import {
  ARMAS, ULTRAS, SINERGIAS, ENTRENADORES, PERSONAJES, AMBIENTES,
} from './config.js';
import { LOGROS, EQUIPACIONES } from './logros.js';
import { icono } from './iconos.js';
import { formatearTiempo } from './util.js';
import { esc } from './club-ui.js';

const numero = (n) => Math.round(n).toLocaleString('es-ES');

/** Nombre e icono de quien ha hecho el daño (arma, ultra, ulti o fuego). */
export function nombreFuente(f, entrenador = 'cholo') {
  if (ARMAS[f]) return { nombre: ARMAS[f].nombre, icono: ARMAS[f].icono };
  if (f.startsWith('ultra:') && ULTRAS[f.slice(6)]) return { nombre: ULTRAS[f.slice(6)].nombre, icono: ULTRAS[f.slice(6)].icono, ultra: true };
  if (f === 'ulti') return { nombre: `Ulti: ${ENTRENADORES[entrenador]?.ulti.nombre ?? 'del míster'}`, icono: 'pizarra' };
  if (f === 'fuego') return { nombre: 'Quemaduras', icono: 'botaOro' };
  return { nombre: 'Otros', icono: 'mas' };
}

/**
 * Estadísticas del final de la partida. `r` es el resumen del mundo; `extra.logrosNuevos` los logros conseguidos.
 */
export function htmlEstadisticas(r, extra = {}) {
  const st = r.stats ?? { dano: {}, danoTotal: 0, jefes: [] };
  const amb = AMBIENTES[r.ambiente ?? 0];
  const fuentes = Object.entries(st.dano).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maximo = fuentes[0]?.[1] ?? 1;
  const barras = fuentes.map(([f, v]) => {
    const n = nombreFuente(f, r.entrenador);
    const pct = st.danoTotal ? (v / st.danoTotal) * 100 : 0;
    return `<li class="dano${n.ultra ? ' dano--ultra' : ''}">
      <span class="dano__icono">${icono(n.icono, 16)}</span>
      <span class="dano__nombre">${esc(n.nombre)}${ARMAS[f] && r.armas?.[f] ? ` <small>nv ${r.armas[f]}</small>` : ''}</span>
      <span class="dano__barra"><span style="width:${Math.max(2, (v / maximo) * 100).toFixed(1)}%"></span></span>
      <b>${numero(v)}</b><small class="dano__pct">${pct.toFixed(0)} %</small>
    </li>`;
  }).join('');
  const cifras = [
    ['Oleada', r.oleada], ['Nivel', r.nivel], ['Rivales eliminados', numero(r.bajas)], ['Jefes', r.jefes],
    ['Daño total', numero(st.danoTotal)], ['Golpe más fuerte', numero(st.golpeMax ?? 0)], ['Críticos', numero(st.criticos ?? 0)],
    ['Daño recibido', numero(st.recibido ?? 0)], ['Vida recuperada', numero(st.curado ?? 0)],
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  const jefes = st.jefes.length ? `<ul class="fin__jefes">${st.jefes.map((j) => `<li>${icono('calavera', 14)} ${esc(j.nombre)} <small>${formatearTiempo(j.t)}${j.vivo ? ` · en ${Math.round(j.vivo)} s` : ''}</small></li>`).join('')}</ul>` : '';
  const chips = [
    ...r.ultras.map((k) => `<span class="req req--hecha">${icono(ULTRAS[k].icono, 14)}${esc(ULTRAS[k].nombre)}</span>`),
    ...r.sinergias.map((k) => `<span class="req req--tuyo">${icono(SINERGIAS[k].icono, 14)}${esc(SINERGIAS[k].nombre)}</span>`),
  ].join('');
  const logros = (extra.logrosNuevos ?? []).filter((k) => LOGROS[k]).map((k) => htmlLogro(k, true, true)).join('');
  return `
    <div class="fin__cabeza">
      <div class="fin__tiempo"><small>Tiempo aguantado</small><strong>${formatearTiempo(r.tiempo)}</strong></div>
      <span class="fin__ambiente" style="--color-ambiente:${amb.color}">${esc(amb.nombre)}</span>
      <p class="fin__quien">${esc(PERSONAJES[r.personaje]?.nombre ?? '')} · ${esc(ENTRENADORES[r.entrenador]?.nombre ?? '')}</p>
    </div>
    <dl class="resultado resultado--fin">${cifras}</dl>
    ${barras ? `<h3 class="combos__subtitulo">Daño por habilidad</h3><ul class="danos">${barras}</ul>` : ''}
    ${jefes ? `<h3 class="combos__subtitulo">Jefes derrotados</h3>${jefes}` : ''}
    ${chips ? `<h3 class="combos__subtitulo">Ultras y combinaciones</h3><p class="combo__reqs">${chips}</p>` : ''}
    ${logros ? `<h3 class="combos__subtitulo">¡Logros nuevos!</h3><ul class="logros logros--fin">${logros}</ul>` : ''}`;
}

/** Tarjeta de un logro. Los no conseguidos dicen cómo se consiguen, pero guardan el dato curioso. */
export function htmlLogro(k, conseguido, nuevo = false) {
  const l = LOGROS[k];
  const camiseta = l.camiseta ? EQUIPACIONES[l.camiseta] : null;
  return `<li class="logro${conseguido ? ' logro--hecho' : ''}${nuevo ? ' logro--nuevo' : ''}">
    <span class="logro__icono">${icono(conseguido ? l.icono : 'candado', 22)}</span>
    <span class="logro__cuerpo">
      <strong>${esc(l.nombre)}</strong>
      <small class="logro__como">${esc(l.como)}</small>
      ${conseguido ? `<span class="logro__dato">${icono('estrella', 12)} ${esc(l.dato)}</span>` : '<span class="logro__dato logro__dato--oculto">Consíguelo para descubrir un dato de la historia rojiblanca.</span>'}
      ${camiseta ? `<span class="logro__premio">${icono('camiseta', 12)} Equipación «${esc(camiseta.nombre)}»</span>` : ''}
    </span>
  </li>`;
}

/** Pantalla de logros: los conseguidos primero. */
export function htmlLogros(conseguidos = {}) {
  const claves = Object.keys(LOGROS);
  const hechos = claves.filter((k) => conseguidos[k]);
  const orden = [...hechos, ...claves.filter((k) => !conseguidos[k])];
  return {
    cuenta: `${hechos.length} de ${claves.length} conseguidos`,
    html: orden.map((k) => htmlLogro(k, Boolean(conseguidos[k]))).join(''),
  };
}
