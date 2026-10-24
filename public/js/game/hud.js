// Interfaz que se superpone al juego (vida, experiencia, tiempo, oleada, armas, ulti y barra de jefe...).
// Solo toca el DOM cuando un valor cambia, para no gastar rendimiento en cada fotograma.
import {
  ARMAS, PASIVAS, EXTRAS, ENTRENADORES, MOVIMIENTO, SINERGIAS, ULTRAS,
} from './config.js';
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
    ulti: q('ulti'),
    ultiBarra: q('ulti-barra'),
    ultiNombre: q('ulti-nombre'),
    jefe: q('jefe'),
    jefeNombre: q('jefe-nombre'),
    jefeBarra: q('jefe-barra'),
    ritmo: q('ritmo'),
    ritmoBarra: q('ritmo-barra'),
    ritmoTexto: q('ritmo-texto'),
    zona: q('zona'),
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
    const totalExtras = Object.keys(EXTRAS).reduce((s, k) => s + j.extras[k], 0);
    if (totalExtras > 0) piezas.push({ nombre: 'Mejoras extra', icono: 'mas', nivel: totalExtras, clase: 'extra' });
    j.sinergias.forEach((k) => piezas.push({ nombre: `Combinación: ${SINERGIAS[k].nombre}`, icono: SINERGIAS[k].icono, nivel: '★', clase: 'sinergia' }));
    j.ultras.forEach((k) => piezas.push({ nombre: `ULTRA: ${ULTRAS[k].nombre}`, icono: ULTRAS[k].icono, nivel: '✦', clase: 'ultra' }));
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

  function pintarUlti(mundo) {
    const j = mundo.jugador;
    const u = j.ulti;
    const pct = Math.min(100, (u.carga / u.max) * 100);
    if (ultimo.ultiPct !== Math.round(pct)) {
      ultimo.ultiPct = Math.round(pct);
      el.ultiBarra.style.height = `${pct}%`;
    }
    const lista = u.carga >= u.max;
    if (ultimo.ultiLista !== lista) {
      ultimo.ultiLista = lista;
      el.ulti.classList.toggle('ulti--lista', lista);
      el.ulti.setAttribute('aria-label', lista ? `Lanzar la ulti: ${ENTRENADORES[j.entrenador].ulti.nombre}` : 'Ulti cargándose');
    }
    const activa = j.furia > 0 || j.animo > 0;
    if (ultimo.ultiActiva !== activa) {
      ultimo.ultiActiva = activa;
      el.ulti.classList.toggle('ulti--activa', activa);
    }
    poner('ultiNombre', el.ultiNombre, lista ? '¡LISTA!' : `${Math.floor(pct)} %`);
  }

  function pintarRitmo(mundo) {
    const j = mundo.jugador;
    const pct = Math.round(j.ritmo * 100);
    if (ultimo.ritmoPct !== pct) {
      ultimo.ritmoPct = pct;
      el.ritmoBarra.style.width = `${pct}%`;
    }
    const estado = j.quieto >= MOVIMIENTO.quietoPresion ? 'quieto' : j.ritmo >= 0.98 ? 'maximo' : 'normal';
    if (ultimo.ritmoEstado !== estado) {
      ultimo.ritmoEstado = estado;
      el.ritmo.dataset.estado = estado;
    }
    poner('ritmoTexto', el.ritmoTexto,
      estado === 'quieto' ? '¡Muévete! Te aprietan' : estado === 'maximo' ? `¡A tope! +${Math.round(MOVIMIENTO.bonoDano * 100)} % daño` : 'Ritmo');
    const zona = j.zona ?? '';
    if (ultimo.zona !== zona) {
      ultimo.zona = zona;
      el.zona.hidden = !zona;
      el.zona.dataset.zona = zona;
      el.zona.textContent = zona === 'barro' ? 'Barro: vas más lento' : zona === 'lluvia' ? 'Lluvia: los balones corren más' : '';
    }
  }

  function pintarJefe(mundo) {
    let jefe = null;
    for (let i = 0; i < mundo.enemigos.length; i += 1) {
      if (mundo.enemigos[i].jefe) { jefe = mundo.enemigos[i]; break; }
    }
    if (!jefe) {
      if (ultimo.jefeVisible) {
        ultimo.jefeVisible = false;
        el.jefe.hidden = true;
      }
      return;
    }
    if (!ultimo.jefeVisible) {
      ultimo.jefeVisible = true;
      el.jefe.hidden = false;
    }
    poner('jefeNombre', el.jefeNombre, jefe.fase > 1 ? `${jefe.nombre} · fase ${jefe.fase}` : jefe.nombre);
    const pct = Math.max(0, (jefe.vida / jefe.vidaMax) * 100);
    if (ultimo.jefePct !== Math.round(pct * 2)) {
      ultimo.jefePct = Math.round(pct * 2);
      el.jefeBarra.style.width = `${pct}%`;
    }
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
      pintarUlti(mundo);
      pintarRitmo(mundo);
      pintarJefe(mundo);
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
    /** Al empezar una partida hay que volver a pintar todo. */
    reiniciar() { Object.keys(ultimo).forEach((k) => delete ultimo[k]); },
    destruir() { clearTimeout(temporizadorAviso); },
  };
}
