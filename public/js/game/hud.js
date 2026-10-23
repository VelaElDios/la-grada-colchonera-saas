// Interfaz que se superpone al juego (vida, experiencia, tiempo, oleada, armas...).
// Solo toca el DOM cuando un valor cambia, para no gastar rendimiento en cada fotograma.
import { ARMAS, PASIVAS } from './config.js';
import { xpSiguiente } from './mundo.js';
import { formatearTiempo } from './util.js';
import { icono } from './iconos.js';

export function crearHud(raiz) {
  const q = (nombre) => raiz.querySelector(`[data-hud="${nombre}"]`);
  const el = {
    vidaBarra: q('vida-barra'),
    vidaTexto: q('vida-texto'),
    tiempo: q('tiempo'),
    oleada: q('oleada'),
    bajas: q('bajas'),
    nivel: q('nivel'),
    xpBarra: q('xp-barra'),
    equipo: q('equipo'),
    aviso: q('aviso'),
  };
  const ultimo = {};
  let temporizadorAviso = 0;

  /** Cambia el texto solo si es distinto del anterior. */
  const poner = (clave, nodo, valor) => {
    if (ultimo[clave] !== valor) {
      ultimo[clave] = valor;
      nodo.textContent = valor;
    }
  };

  function pintarEquipo(mundo) {
    const j = mundo.jugador;
    const piezas = [];
    Object.entries(ARMAS).forEach(([clave, arma]) => {
      const n = j.armas[clave].nivel;
      if (n > 0) piezas.push({ nombre: arma.nombre, icono: arma.icono, nivel: n, clase: 'arma' });
    });
    Object.entries(PASIVAS).forEach(([clave, pasiva]) => {
      const n = j.pasivas[clave];
      if (n > 0) piezas.push({ nombre: pasiva.nombre, icono: pasiva.icono, nivel: n, clase: 'pasiva' });
    });
    const firma = piezas.map((p) => `${p.nombre}${p.nivel}`).join('|');
    if (firma === ultimo.equipo) return;
    ultimo.equipo = firma;
    el.equipo.innerHTML = piezas.map((p) => `
      <li class="pieza pieza--${p.clase}" title="${p.nombre}, nivel ${p.nivel}">
        ${icono(p.icono, 20)}
        <span class="pieza__nivel" aria-hidden="true">${p.nivel}</span>
        <span class="sr-only">${p.nombre}, nivel ${p.nivel}</span>
      </li>`).join('');
  }

  return {
    actualizar(mundo) {
      const j = mundo.jugador;
      const vidaPct = Math.max(0, (j.vida / j.vidaMax) * 100);
      if (ultimo.vidaPct !== Math.round(vidaPct * 2)) {
        ultimo.vidaPct = Math.round(vidaPct * 2);
        el.vidaBarra.style.width = `${vidaPct}%`;
        el.vidaBarra.parentElement.classList.toggle('barra--critica', vidaPct < 30);
        el.vidaBarra.parentElement.setAttribute('aria-valuenow', String(Math.round(vidaPct)));
      }
      poner('vidaTexto', el.vidaTexto, `${Math.ceil(j.vida)} / ${j.vidaMax}`);
      poner('tiempo', el.tiempo, formatearTiempo(mundo.tiempo));
      poner('oleada', el.oleada, String(mundo.oleada));
      poner('bajas', el.bajas, String(j.bajas));
      poner('nivel', el.nivel, `Nivel ${j.nivel}`);
      const xpPct = Math.min(100, (j.xp / xpSiguiente(mundo)) * 100);
      if (ultimo.xpPct !== Math.round(xpPct * 2)) {
        ultimo.xpPct = Math.round(xpPct * 2);
        el.xpBarra.style.width = `${xpPct}%`;
      }
      pintarEquipo(mundo);
    },
    /** Muestra un cartel grande durante un par de segundos. */
    aviso(texto, tipo = 'oleada') {
      clearTimeout(temporizadorAviso);
      el.aviso.textContent = texto;
      el.aviso.dataset.tipo = tipo;
      el.aviso.classList.remove('hud__aviso--visible');
      void el.aviso.offsetWidth; // reinicia la animación CSS
      el.aviso.classList.add('hud__aviso--visible');
      temporizadorAviso = setTimeout(() => el.aviso.classList.remove('hud__aviso--visible'), 2200);
    },
    destruir() { clearTimeout(temporizadorAviso); },
  };
}
