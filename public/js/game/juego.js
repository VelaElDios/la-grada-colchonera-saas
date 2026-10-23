// Montaje del juego: pantallas (menú, pausa, mejora, final), bucle principal y conexión entre
// la simulación (mundo.js), el dibujo (render.js), el sonido y la interfaz superpuesta (hud.js).
import { MUNDO } from './config.js';
import { crearMundo, avanzar, elegirMejora, resumen } from './mundo.js';
import { dibujar } from './render.js';
import { crearEntrada } from './entrada.js';
import { crearAudio } from './audio.js';
import { crearHud } from './hud.js';
import { icono } from './iconos.js';
import { formatearTiempo } from './util.js';
import { leerMarca, guardarMarca, textoMarca } from './marca.js';

const PLANTILLA = `
  <canvas class="juego__lienzo" role="img" aria-label="Zona de juego: tu colchonero rodeado de rivales"></canvas>
  <div class="juego__vineta" aria-hidden="true"></div>

  <div class="hud" data-zona="hud" hidden>
    <div class="hud__sup">
      <div class="hud__bloque hud__bloque--vida">
        <div class="barra barra--vida" role="progressbar" aria-label="Vida" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100">
          <div class="barra__relleno" data-hud="vida-barra"></div>
          <span class="barra__texto" data-hud="vida-texto"></span>
        </div>
      </div>
      <div class="hud__bloque hud__bloque--centro">
        <span class="hud__dato">${icono('reloj', 16)}<span data-hud="tiempo">0:00</span></span>
        <span class="hud__dato hud__dato--oleada">Oleada <strong data-hud="oleada">1</strong></span>
      </div>
      <div class="hud__bloque hud__bloque--der">
        <span class="hud__dato" title="Rivales eliminados">${icono('calavera', 16)}<span data-hud="bajas">0</span></span>
        <button type="button" class="boton-icono" data-accion="sonido" aria-label="Silenciar sonido" aria-pressed="false">${icono('sonido', 20)}</button>
        <button type="button" class="boton-icono" data-accion="pausa" aria-label="Pausar (Esc)">${icono('pausa', 20)}</button>
      </div>
    </div>
    <ul class="hud__equipo" data-hud="equipo" aria-label="Armas y mejoras"></ul>
    <div class="hud__aviso" data-hud="aviso" aria-hidden="true"></div>
    <div class="hud__xp">
      <span class="hud__nivel" data-hud="nivel">Nivel 1</span>
      <div class="barra barra--xp" aria-hidden="true"><div class="barra__relleno" data-hud="xp-barra"></div></div>
    </div>
  </div>

  <section class="pantalla" data-pantalla="menu" role="dialog" aria-modal="true" aria-labelledby="juego-t-menu">
    <div class="pantalla__caja">
      <p class="pantalla__sobretitulo">Supervivencia rojiblanca</p>
      <h2 id="juego-t-menu" class="pantalla__titulo">Aguanta, colchonero</h2>
      <p class="pantalla__texto">Los rivales llegan en oleadas y no se acaban. Recoge la experiencia que sueltan, sube de nivel y elige mejoras para resistir cada vez más tiempo.</p>
      <ul class="instrucciones">
        <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> o las flechas para moverte. En el móvil, arrastra el dedo por la pantalla.</li>
        <li>Las armas atacan solas: tú solo tienes que esquivar.</li>
        <li>Los diamantes azules dan experiencia. <kbd>Esc</kbd> pausa la partida.</li>
      </ul>
      <p class="pantalla__marca" data-campo="marca"></p>
      <div class="pantalla__acciones">
        <button type="button" class="btn btn--primario btn--grande" data-accion="jugar" data-enfoque>Jugar</button>
      </div>
    </div>
  </section>

  <section class="pantalla" data-pantalla="pausa" role="dialog" aria-modal="true" aria-labelledby="juego-t-pausa" hidden>
    <div class="pantalla__caja pantalla__caja--estrecha">
      <h2 id="juego-t-pausa" class="pantalla__titulo">Partido en pausa</h2>
      <div class="pantalla__acciones pantalla__acciones--columna">
        <button type="button" class="btn btn--primario" data-accion="reanudar" data-enfoque>Seguir jugando</button>
        <button type="button" class="btn btn--secundario" data-accion="reiniciar">Empezar de nuevo</button>
        <button type="button" class="btn btn--fantasma" data-accion="salir">Salir al inicio</button>
      </div>
    </div>
  </section>

  <section class="pantalla" data-pantalla="mejora" role="dialog" aria-modal="true" aria-labelledby="juego-t-mejora" hidden>
    <div class="pantalla__caja">
      <p class="pantalla__sobretitulo">¡Has subido de nivel!</p>
      <h2 id="juego-t-mejora" class="pantalla__titulo" data-campo="titulo-mejora">Elige una mejora</h2>
      <ul class="opciones" data-campo="opciones"></ul>
      <p class="pantalla__ayuda">Haz clic o pulsa <kbd>1</kbd>, <kbd>2</kbd> o <kbd>3</kbd>.</p>
    </div>
  </section>

  <section class="pantalla" data-pantalla="fin" role="dialog" aria-modal="true" aria-labelledby="juego-t-fin" hidden>
    <div class="pantalla__caja">
      <p class="pantalla__sobretitulo">Final del partido</p>
      <h2 id="juego-t-fin" class="pantalla__titulo">Te han eliminado</h2>
      <p class="insignia" data-campo="record" hidden>Nueva mejor marca</p>
      <dl class="resultado" data-campo="resultado"></dl>
      <div class="pantalla__acciones">
        <button type="button" class="btn btn--primario" data-accion="reiniciar" data-enfoque>Jugar otra vez</button>
        <button type="button" class="btn btn--fantasma" data-accion="salir">Salir al inicio</button>
      </div>
    </div>
  </section>

  <p class="sr-only" data-campo="anuncio" role="status" aria-live="polite"></p>
`;

/**
 * Monta el juego dentro de `contenedor`.
 * @param {HTMLElement} contenedor
 * @param {{ usuario: object, alSalir: () => void }} opciones
 * @returns {{ destruir: () => void }}
 */
export function montarJuego(contenedor, { usuario, alSalir }) {
  contenedor.classList.add('juego');
  contenedor.innerHTML = PLANTILLA;

  const q = (sel) => contenedor.querySelector(sel);
  const lienzo = q('.juego__lienzo');
  const ctx = lienzo.getContext('2d');
  const pantallas = {
    menu: q('[data-pantalla="menu"]'),
    pausa: q('[data-pantalla="pausa"]'),
    mejora: q('[data-pantalla="mejora"]'),
    fin: q('[data-pantalla="fin"]'),
  };
  const zonaHud = q('[data-zona="hud"]');
  const anuncio = q('[data-campo="anuncio"]');
  const botonSonido = q('[data-accion="sonido"]');

  const audio = crearAudio();
  const hud = crearHud(contenedor);
  const reducirMovimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  let mundo = crearMundo({ efectosReducidos: reducirMovimiento });
  let fase = 'menu'; // menu | jugando | pausa | mejora | fin
  let vista = { ancho: 800, alto: 600, escala: 1, dpr: 1 };
  let acumulador = 0;
  let previo = performance.now();
  let raf = 0;

  const entrada = crearEntrada(contenedor, { alPausar: alternarPausa, activo: () => fase === 'jugando' });

  // --- Pantallas ------------------------------------------------------------------------------

  function mostrar(nombre) {
    Object.entries(pantallas).forEach(([clave, nodo]) => { nodo.hidden = clave !== nombre; });
    if (nombre) {
      requestAnimationFrame(() => (pantallas[nombre].querySelector('[data-enfoque]') || pantallas[nombre].querySelector('button'))?.focus());
    }
  }

  function anunciar(texto) {
    anuncio.textContent = '';
    setTimeout(() => { anuncio.textContent = texto; }, 30);
  }

  function pintarMenu() {
    q('[data-campo="marca"]').textContent = textoMarca(leerMarca(usuario));
  }

  function actualizarBotonSonido() {
    const mudo = audio.silenciado;
    botonSonido.setAttribute('aria-pressed', String(mudo));
    botonSonido.setAttribute('aria-label', mudo ? 'Activar sonido' : 'Silenciar sonido');
    botonSonido.innerHTML = icono(mudo ? 'silencio' : 'sonido', 20);
  }

  function empezar() {
    audio.activar();
    mundo = crearMundo({ efectosReducidos: reducirMovimiento });
    entrada.soltarTodo();
    acumulador = 0;
    fase = 'jugando';
    zonaHud.hidden = false;
    mostrar(null);
    hud.actualizar(mundo);
    procesarEventos();
    lienzo.focus({ preventScroll: true });
  }

  function alternarPausa() {
    if (fase === 'jugando') {
      fase = 'pausa';
      entrada.soltarTodo();
      mostrar('pausa');
    } else if (fase === 'pausa') {
      reanudar();
    }
  }

  function reanudar() {
    if (fase !== 'pausa') return;
    fase = 'jugando';
    previo = performance.now();
    mostrar(null);
  }

  function mostrarMejora() {
    fase = 'mejora';
    entrada.soltarTodo();
    q('[data-campo="titulo-mejora"]').textContent = `Nivel ${mundo.jugador.nivel}: elige una mejora`;
    const lista = q('[data-campo="opciones"]');
    lista.replaceChildren(...mundo.opciones.map((o, i) => {
      const li = document.createElement('li');
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = `opcion opcion--${o.tipo}`;
      boton.dataset.mejora = o.id;
      if (i === 0) boton.dataset.enfoque = '';
      const etiqueta = o.tipo === 'cura' ? 'Recuperación'
        : o.nivelNuevo === 1 ? '¡Nueva!' : `Nivel ${o.nivelNuevo}`;
      boton.innerHTML = `
        <span class="opcion__icono">${icono(o.icono, 28)}</span>
        <span class="opcion__cuerpo">
          <span class="opcion__nombre"></span>
          <span class="opcion__descripcion"></span>
        </span>
        <span class="opcion__nivel">${etiqueta}</span>
        <kbd class="opcion__tecla" aria-hidden="true">${i + 1}</kbd>`;
      boton.querySelector('.opcion__nombre').textContent = o.nombre;
      boton.querySelector('.opcion__descripcion').textContent = o.descripcion;
      li.append(boton);
      return li;
    }));
    mostrar('mejora');
    anunciar(`Has subido al nivel ${mundo.jugador.nivel}. Elige una mejora.`);
  }

  function elegir(id) {
    if (fase !== 'mejora' || !elegirMejora(mundo, id)) return;
    if (mundo.estado === 'mejora') {
      mostrarMejora(); // todavía quedan subidas de nivel pendientes
      return;
    }
    fase = 'jugando';
    previo = performance.now();
    mostrar(null);
  }

  function mostrarFin() {
    fase = 'fin';
    entrada.soltarTodo();
    const r = resumen(mundo);
    const esRecord = guardarMarca(usuario, r);
    q('[data-campo="record"]').hidden = !esRecord;
    q('[data-campo="resultado"]').innerHTML = `
      <div><dt>Tiempo aguantado</dt><dd>${formatearTiempo(r.tiempo)}</dd></div>
      <div><dt>Oleada</dt><dd>${r.oleada}</dd></div>
      <div><dt>Nivel</dt><dd>${r.nivel}</dd></div>
      <div><dt>Rivales eliminados</dt><dd>${r.bajas}</dd></div>`;
    // Pequeña pausa para que se vea el golpe final antes de tapar la pantalla
    setTimeout(() => {
      if (fase !== 'fin') return;
      zonaHud.hidden = true;
      mostrar('fin');
      anunciar(`Te han eliminado. Has aguantado ${formatearTiempo(r.tiempo)} y llegado a la oleada ${r.oleada}.`);
    }, 900);
  }

  function irAlMenu() {
    fase = 'menu';
    zonaHud.hidden = true;
    mundo = crearMundo({ efectosReducidos: reducirMovimiento });
    pintarMenu();
    mostrar('menu');
  }

  // --- Eventos de la simulación → sonido y avisos -----------------------------------------------

  function procesarEventos() {
    for (const ev of mundo.eventos.splice(0)) {
      audio.reproducir(ev.tipo);
      if (ev.tipo === 'oleada' && ev.oleada > 1) {
        hud.aviso(`Oleada ${ev.oleada}`);
        anunciar(`Oleada ${ev.oleada}`);
      } else if (ev.tipo === 'aviso') {
        hud.aviso(ev.texto, 'alerta');
        anunciar(ev.texto);
      } else if (ev.tipo === 'jefe-derrotado') {
        hud.aviso('¡Míster Rival eliminado!', 'exito');
      }
    }
  }

  // --- Bucle principal --------------------------------------------------------------------------

  function bucle(ahora) {
    raf = requestAnimationFrame(bucle);
    const dt = Math.min(0.1, (ahora - previo) / 1000);
    previo = ahora;

    if (fase === 'jugando') {
      acumulador += dt;
      let pasos = 0;
      while (acumulador >= MUNDO.paso && pasos < 6 && mundo.estado === 'jugando') {
        avanzar(mundo, MUNDO.paso, entrada.leer());
        acumulador -= MUNDO.paso;
        pasos += 1;
      }
      if (pasos >= 6) acumulador = 0;
      procesarEventos();
      hud.actualizar(mundo);
      if (mundo.estado === 'mejora') mostrarMejora();
      else if (mundo.estado === 'fin') mostrarFin();
    }

    ctx.setTransform(vista.dpr, 0, 0, vista.dpr, 0, 0);
    dibujar(ctx, mundo, vista);
  }

  // --- Tamaño del lienzo --------------------------------------------------------------------------

  function ajustarTamano() {
    const caja = contenedor.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const ancho = Math.max(280, Math.round(caja.width));
    const alto = Math.max(280, Math.round(caja.height));
    lienzo.width = Math.round(ancho * dpr);
    lienzo.height = Math.round(alto * dpr);
    // El zoom hace que en un móvil vertical se vea una zona parecida a la de un monitor ancho
    const escala = Math.max(0.7, Math.min(1.5, Math.min(ancho, alto) / 540));
    vista = { ancho, alto, escala, dpr };
  }
  const observador = new ResizeObserver(ajustarTamano);
  observador.observe(contenedor);
  ajustarTamano();

  // --- Eventos de la interfaz -------------------------------------------------------------------

  const acciones = {
    jugar: empezar,
    reiniciar: empezar,
    reanudar,
    salir: alSalir,
    pausa: alternarPausa,
    sonido: () => { audio.alternar(); actualizarBotonSonido(); },
  };

  function alHacerClic(ev) {
    const mejora = ev.target.closest('[data-mejora]');
    if (mejora) {
      elegir(mejora.dataset.mejora);
      return;
    }
    const boton = ev.target.closest('[data-accion]');
    if (boton) acciones[boton.dataset.accion]?.();
  }

  function alPulsarTecla(ev) {
    if (fase === 'mejora' && /^Digit[1-3]$/.test(ev.code)) {
      const opcion = mundo.opciones[Number(ev.code.slice(5)) - 1];
      if (opcion) elegir(opcion.id);
    }
  }

  const alCambiarVisibilidad = () => { if (document.hidden && fase === 'jugando') alternarPausa(); };

  contenedor.addEventListener('click', alHacerClic);
  window.addEventListener('keydown', alPulsarTecla);
  document.addEventListener('visibilitychange', alCambiarVisibilidad);

  lienzo.tabIndex = -1;
  actualizarBotonSonido();
  pintarMenu();
  mostrar('menu');
  raf = requestAnimationFrame(bucle);

  return {
    destruir() {
      cancelAnimationFrame(raf);
      observador.disconnect();
      entrada.destruir();
      hud.destruir();
      contenedor.removeEventListener('click', alHacerClic);
      window.removeEventListener('keydown', alPulsarTecla);
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      contenedor.classList.remove('juego');
      contenedor.replaceChildren();
    },
    irAlMenu,
  };
}
