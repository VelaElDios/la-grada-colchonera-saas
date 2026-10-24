// Montaje del juego: pantallas (menú, pausa, mejora, final), bucle principal y conexión entre
// la simulación (mundo.js), el dibujo (render.js), el sonido y la interfaz superpuesta (hud.js).
import {
  MUNDO, PERSONAJES, POSICIONES, ENTRENADORES, ARMAS, SINERGIAS, ULTRAS,
} from './config.js';
import { crearMundo, avanzar, elegirMejora, resumen, usarUlti } from './mundo.js';
import { retratoUrl, aspectoDe, avatarUrl } from './sprites.js';
import { dibujar, actualizarCamara } from './render.js';
import { crearEntrada } from './entrada.js';
import { crearAudio } from './audio.js';
import { crearHud } from './hud.js';
import { icono } from './iconos.js';
import { formatearTiempo } from './util.js';
import { leerStats, registrarPartida, registrarSinergia } from './marca.js';
import { leerAjustes, guardarAjustes, ZOOM } from './ajustes.js';
import { puntosLibres, esInicial } from './club.js';
import {
  esc, htmlRareza, htmlEntrenamiento, htmlContratar, htmlFichado, htmlRankingGrada, htmlRecompensas, porPosicion,
} from './club-ui.js';

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
        <span class="hud__dato hud__dato--ambiente" data-hud="ambiente" data-ambiente="inicio">Pretemporada</span>
      </div>
      <div class="hud__bloque hud__bloque--der">
        <span class="hud__dato" title="Rivales eliminados">${icono('calavera', 16)}<span data-hud="bajas">0</span></span>
        <button type="button" class="boton-icono" data-accion="sonido" aria-label="Silenciar sonido" aria-pressed="false">${icono('sonido', 20)}</button>
        <button type="button" class="boton-icono" data-accion="pantalla" aria-label="Pantalla completa (F)" aria-pressed="false">${icono('pantalla', 20)}</button>
        <button type="button" class="boton-icono" data-accion="ajustesPartida" aria-label="Ajustes">${icono('ajustes', 20)}</button>
        <button type="button" class="boton-icono" data-accion="pausa" aria-label="Pausar (Esc)">${icono('pausa', 20)}</button>
      </div>
    </div>
    <ul class="hud__equipo" data-hud="equipo" aria-label="Armas y mejoras"></ul>
    <div class="hud__aviso" data-hud="aviso" aria-hidden="true"></div>
    <div class="hud__jefe" data-hud="jefe" hidden>
      <span class="hud__jefe-nombre" data-hud="jefe-nombre"></span>
      <div class="barra barra--jefe" aria-hidden="true"><div class="barra__relleno" data-hud="jefe-barra"></div></div>
    </div>
    <button type="button" class="ulti" data-hud="ulti" data-accion="ulti" aria-label="Ulti cargándose">
      <span class="ulti__barra" aria-hidden="true"><span class="ulti__relleno" data-hud="ulti-barra"></span></span>
      <span class="ulti__texto"><strong>ULTI</strong><span data-hud="ulti-nombre">0 %</span><kbd aria-hidden="true">Espacio</kbd></span>
    </button>
    <p class="hud__zona" data-hud="zona" hidden></p>
    <div class="hud__xp">
      <div class="hud__ritmo" data-hud="ritmo" data-estado="normal" aria-hidden="true">
        <span class="hud__ritmo-texto" data-hud="ritmo-texto">Ritmo</span>
        <span class="hud__ritmo-barra"><span data-hud="ritmo-barra"></span></span>
      </div>
      <span class="hud__nivel" data-hud="nivel">Nivel 1</span>
      <div class="barra barra--xp" aria-hidden="true"><div class="barra__relleno" data-hud="xp-barra"></div></div>
    </div>
  </div>

  <section class="hub" data-pantalla="hub" aria-labelledby="juego-t-hub">
    <h2 id="juego-t-hub" class="sr-only">Menú principal</h2>
    <aside class="panel hub__tiempos" aria-labelledby="juego-t-tiempos">
      <button type="button" class="ficha-fan" data-accion="identidad" data-campo="ficha-fan" aria-label="Tu ficha: mote y avatar"></button>
      <h3 id="juego-t-tiempos" class="panel__titulo">Tus tiempos</h3>
      <p class="club-estado" data-campo="club-estado" hidden></p>
      <div data-campo="tiempos"></div>
    </aside>
    <div class="hub__centro">
      <p class="hub__logo" aria-hidden="true"><span>La Grada</span><strong>Colchonera</strong></p>
      <button type="button" class="hub__jugador" data-accion="vestuario" aria-label="Cambiar de jugador en el vestuario">
        <span class="hub__nombre" data-campo="nombre-jugador"></span>
        <span class="hub__entrenador" data-campo="nombre-entrenador"></span>
      </button>
    </div>
    <nav class="panel hub__menu" aria-label="Menú del juego">
      <button type="button" class="menu-item menu-item--jugar" data-accion="jugar" data-enfoque>
        ${icono('jugar', 26)}<span><strong>Jugar</strong><small>Sal al campo y aguanta</small></span>
      </button>
      <button type="button" class="menu-item" data-accion="vestuario">
        ${icono('camiseta', 26)}<span><strong>Vestuario</strong><small>Elige a tu jugador</small></span>
      </button>
      <button type="button" class="menu-item" data-accion="entrenamiento">
        ${icono('mas', 26)}<span><strong>Entrenamiento</strong><small>Sube vida, defensa, disparo y suerte</small></span><b class="menu-item__aviso" data-campo="aviso-puntos" hidden></b>
      </button>
      <button type="button" class="menu-item" data-accion="contratar">
        ${icono('estrellaLlena', 26)}<span><strong>Contratar</strong><small>Canjea fichas por fichajes</small></span><b class="menu-item__aviso" data-campo="aviso-fichas" hidden></b>
      </button>
      <button type="button" class="menu-item" data-accion="combos">
        ${icono('estrella', 26)}<span><strong>Combinaciones</strong><small>Las metas: qué juntar</small></span>
      </button>
      <button type="button" class="menu-item" data-accion="direccion">
        ${icono('pizarra', 26)}<span><strong>Dirección</strong><small>Elige a tu entrenador</small></span>
      </button>
      <button type="button" class="menu-item" data-accion="ranking">
        ${icono('trofeo', 26)}<span><strong>Ranking</strong><small>Los mejores de la grada</small></span>
      </button>
      <button type="button" class="menu-item" data-accion="ajustes">
        ${icono('ajustes', 26)}<span><strong>Ajustes</strong><small>Sonido, gráficos y controles</small></span>
      </button>
    </nav>
    <button type="button" class="btn btn--secundario hub__ayuda" data-accion="ayuda">${icono('ayuda', 18)} Cómo se juega</button>
  </section>

  <section class="pantalla" data-pantalla="vestuario" role="dialog" aria-modal="true" aria-labelledby="juego-t-vest" hidden>
    <div class="pantalla__caja pantalla__caja--vestuario">
      <div class="vest__cabecera">
        <div>
          <p class="pantalla__sobretitulo">Vestuario</p>
          <h2 id="juego-t-vest" class="pantalla__titulo">Elige a tu jugador</h2>
        </div>
        <p class="vest__aviso">Cada jugador tiene sus estadísticas y <strong>solo puede aprender las habilidades que encajan con su forma de jugar</strong>.</p>
      </div>
      <div class="vest__filtros" role="group" aria-label="Filtrar por posición" data-campo="filtros"></div>
      <div class="vest">
        <ul class="plantilla" data-campo="personajes" aria-label="Plantilla"></ul>
        <aside class="vest__detalle" data-campo="detalle" aria-live="polite"></aside>
      </div>
      <div class="pantalla__acciones"><button type="button" class="btn btn--primario" data-accion="cerrarAjustes" data-enfoque>${icono('volver', 18)} Listo</button></div>
    </div>
  </section>

  <section class="pantalla" data-pantalla="combos" role="dialog" aria-modal="true" aria-labelledby="juego-t-combos" hidden>
    <div class="pantalla__caja pantalla__caja--ancha">
      <p class="pantalla__sobretitulo">Combinaciones</p>
      <h2 id="juego-t-combos" class="pantalla__titulo">Las metas de la grada</h2>
      <p class="pantalla__texto">Junta ciertas habilidades a cierto nivel durante la partida y se activa una combinación con un bonus extra. Algunas son más fuertes que otras: ¡descúbrelas todas!</p>
      <p class="combos__cuenta" data-campo="combos-cuenta"></p>
      <ul class="combos" data-campo="combos"></ul>
      <h3 class="combos__subtitulo">Ultras</h3>
      <p class="combos__cuenta" data-campo="ultras-cuenta"></p>
      <ul class="combos combos--ultras" data-campo="ultras"></ul>
      <div class="pantalla__acciones"><button type="button" class="btn btn--primario" data-accion="hub" data-enfoque>${icono('volver', 18)} Volver</button></div>
    </div>
  </section>

  <section class="pantalla" data-pantalla="identidad" role="dialog" aria-modal="true" aria-labelledby="juego-t-ident" hidden>
    <div class="pantalla__caja pantalla__caja--ancha">
      <p class="pantalla__sobretitulo">Tu ficha de aficionado</p>
      <h2 id="juego-t-ident" class="pantalla__titulo">Ponte un mote y una cara</h2>
      <p class="pantalla__texto">Tu mote sale en el ranking de la grada y arriba, en la web, en vez de tu correo. La cara la eliges entre los jugadores que tienes fichados y los entrenadores.</p>
      <form class="identidad" data-campo="form-identidad" novalidate>
        <div class="identidad__vista">
          <img class="identidad__avatar" data-campo="ident-vista" alt="" width="96" height="96">
          <label class="identidad__campo">
            <span>Mote (3 a 16 caracteres)</span>
            <input type="text" name="apodo" data-campo="ident-apodo" maxlength="16" minlength="3" autocomplete="nickname" spellcheck="false" required>
          </label>
        </div>
        <p class="identidad__error" data-campo="ident-error" role="alert" hidden></p>
        <h3 class="combos__subtitulo">Elige tu cara</h3>
        <ul class="identidad__caras" data-campo="ident-caras" aria-label="Caras disponibles"></ul>
        <div class="pantalla__acciones">
          <button type="button" class="btn btn--secundario" data-accion="hub">Ahora no</button>
          <button type="submit" class="btn btn--primario" data-campo="ident-guardar">Guardar mi ficha</button>
        </div>
      </form>
    </div>
  </section>

  <section class="pantalla" data-pantalla="direccion" role="dialog" aria-modal="true" aria-labelledby="juego-t-dir" hidden>
    <div class="pantalla__caja pantalla__caja--ancha">
      <p class="pantalla__sobretitulo">Dirección deportiva</p>
      <h2 id="juego-t-dir" class="pantalla__titulo">Elige a tu entrenador</h2>
      <p class="pantalla__texto">Mejora tus estadísticas y te da una ulti que se carga con las bajas… y corriendo.</p>
      <ul class="tarjetas tarjetas--dos" data-campo="entrenadores"></ul>
      <div class="pantalla__acciones"><button type="button" class="btn btn--primario" data-accion="hub" data-enfoque>${icono('volver', 18)} Listo</button></div>
    </div>
  </section>

  <section class="pantalla" data-pantalla="entrenamiento" role="dialog" aria-modal="true" aria-labelledby="juego-t-entr" hidden>
    <div class="pantalla__caja pantalla__caja--vestuario">
      <div class="vest__cabecera">
        <div>
          <p class="pantalla__sobretitulo">Entrenamiento</p>
          <h2 id="juego-t-entr" class="pantalla__titulo">Mejora a tus jugadores</h2>
        </div>
        <p class="vest__aviso">Cada jugador gana puntos <strong>eliminando rivales</strong> (los primeros salen baratos, los últimos cuestan mucho) y <strong>1 punto extra por cada 3 jefes</strong>. Sube su <strong>vida, defensa, disparo y suerte</strong>.</p>
        <button type="button" class="btn btn--secundario" data-accion="desbloquear" data-campo="boton-pruebas" hidden>Modo pruebas: desbloquearlo todo</button>
      </div>
      <div class="vest vest--entrena">
        <ul class="plantilla plantilla--uno" data-campo="entrena-lista" aria-label="Jugador elegido"></ul>
        <aside class="vest__detalle" data-campo="entrena-panel" aria-live="polite"></aside>
      </div>
      <div class="pantalla__acciones"><button type="button" class="btn btn--primario" data-accion="hub" data-enfoque>${icono('volver', 18)} Listo</button></div>
    </div>
  </section>

  <section class="pantalla" data-pantalla="contratar" role="dialog" aria-modal="true" aria-labelledby="juego-t-contr" hidden>
    <div class="pantalla__caja">
      <p class="pantalla__sobretitulo">Mercado de fichajes</p>
      <h2 id="juego-t-contr" class="pantalla__titulo" tabindex="-1" data-enfoque>Contratar</h2>
      <p class="pantalla__texto">Cada <strong>3 jefes</strong> que venzas (con cualquier jugador) consigues una ficha de contrato. Canjéala y te llega un jugador al azar que aún no tengas.</p>
      <div data-campo="contratar-panel"></div>
      <div class="pantalla__acciones"><button type="button" class="btn btn--primario" data-accion="hub">${icono('volver', 18)} Volver</button></div>
    </div>
  </section>

  <section class="pantalla" data-pantalla="ranking" role="dialog" aria-modal="true" aria-labelledby="juego-t-rank" hidden>
    <div class="pantalla__caja pantalla__caja--ancha">
      <p class="pantalla__sobretitulo">Ranking</p>
      <h2 id="juego-t-rank" class="pantalla__titulo">Los que más aguantan</h2>
      <div class="vest__filtros" role="group" aria-label="Tipo de ranking">
        <button type="button" class="filtro" data-ranking="grada" aria-pressed="true">La grada</button>
        <button type="button" class="filtro" data-ranking="mio" aria-pressed="false">Tus partidas</button>
      </div>
      <div class="ranking__caja" data-campo="mejores" aria-live="polite"></div>
      <div class="pantalla__acciones"><button type="button" class="btn btn--primario" data-accion="hub" data-enfoque>${icono('volver', 18)} Volver</button></div>
    </div>
  </section>

  <section class="pantalla" data-pantalla="ajustes" role="dialog" aria-modal="true" aria-labelledby="juego-t-aj" hidden>
    <div class="pantalla__caja">
      <p class="pantalla__sobretitulo">Ajustes</p>
      <h2 id="juego-t-aj" class="pantalla__titulo">Sonido, gráficos y controles</h2>
      <fieldset class="ajustes__grupo">
        <legend>Sonido</legend>
        <label class="ajuste"><span>Volumen</span><input type="range" min="0" max="100" step="5" data-ajuste="volumen"><output data-campo="volumen-valor"></output></label>
        <label class="ajuste ajuste--check"><input type="checkbox" data-ajuste="sonido"><span>Sonido activado</span></label>
      </fieldset>
      <fieldset class="ajustes__grupo">
        <legend>Gráficos</legend>
        <label class="ajuste ajuste--check"><input type="checkbox" data-ajuste="efectos"><span>Partículas y sacudidas de pantalla</span></label>
        <label class="ajuste ajuste--check"><input type="checkbox" data-ajuste="numeros"><span>Números de daño sobre los rivales</span></label>
        <label class="ajuste"><span>Cámara</span>
          <select data-ajuste="zoom"><option value="cerca">Cerca</option><option value="normal">Normal</option><option value="lejos">Lejos (ves más campo)</option></select>
        </label>
      </fieldset>
      <fieldset class="ajustes__grupo">
        <legend>Controles</legend>
        <ul class="instrucciones">
          <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> o las flechas: moverte.</li>
          <li><kbd>Espacio</kbd> o <kbd>E</kbd>: lanzar la ulti. <kbd>Esc</kbd> o <kbd>P</kbd>: pausa. <kbd>F</kbd>: pantalla completa.</li>
          <li><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd>: elegir una mejora al subir de nivel.</li>
        </ul>
        <label class="ajuste ajuste--check"><input type="checkbox" data-ajuste="joystick"><span>Joystick táctil en el móvil</span></label>
      </fieldset>
      <div class="pantalla__acciones"><button type="button" class="btn btn--primario" data-accion="hub" data-enfoque>${icono('volver', 18)} Listo</button></div>
    </div>
  </section>

  <section class="pantalla" data-pantalla="ayuda" role="dialog" aria-modal="true" aria-labelledby="juego-t-ayuda" hidden>
    <div class="pantalla__caja">
      <p class="pantalla__sobretitulo">Cómo se juega</p>
      <h2 id="juego-t-ayuda" class="pantalla__titulo">Aguanta, colchonero</h2>
      <ul class="instrucciones">
        <li><strong>Muévete siempre.</strong> Corriendo sube tu <em>ritmo</em>: más daño, más experiencia y la ulti se carga sola. Si te quedas quieto, los rivales aprietan.</li>
        <li>Las armas atacan solas. Los diamantes azules dan experiencia y los <strong>premios</strong> del campo (flechas en el borde) te curan, suben de nivel o cargan la ulti.</li>
        <li><strong>Cada partida es un mundo distinto</strong>: barrios de estadios con sus gradas, plazas con tiendas, campos de entrenamiento, parques y prados con <strong>mesetas</strong> (los taludes no se suben: busca las escaleras). <strong>Barro</strong>: te frena. <strong>Lluvia</strong>: los balones, tuyos y rivales, corren más. Gradas, tiendas, árboles y porterías no se atraviesan; los balones pasan por encima de taludes, vallas y bancos.</li>
        <li><strong>Cada 5 minutos cambia la pantalla</strong>: de la pretemporada a la final de la Copa del Rey, la final de Liga, la final de la Champions y, por último, la final del Mundial con la camiseta de tu selección. Cambian la luz y la decoración, y los rivales salen más fuertes.</li>
        <li>Algunos rivales embisten (se agachan antes) y otros disparan balones. Cada 4 oleadas (cada 2 minutos) llega un <strong>jefe</strong> con tres fases; salen al azar entre todos y cada vez son más duros. También aparecen <strong>rivales élite</strong> con aro de color. Los rivales que elimines te dan puntos de <strong>entrenamiento</strong> (más baratos al principio), cada 3 jefes dan 1 punto más y <strong>fichas de contrato</strong> (1 por cada 3). Al juntar varias combinaciones consigues <strong>ULTRAS</strong>, los poderes de leyenda que hacen falta para llegar a los minutos altos.</li>
        <li>Cada jugador solo aprende <strong>las habilidades de su estilo</strong> (un portero no chuta, un defensa mete cabezazos y entradas…). Al juntar ciertas habilidades se activan <strong>combinaciones</strong> con bonus: mira las metas en el menú.</li>
      </ul>
      <div class="pantalla__acciones"><button type="button" class="btn btn--primario" data-accion="hub" data-enfoque>${icono('volver', 18)} Entendido</button></div>
    </div>
  </section>

  <section class="pantalla" data-pantalla="pausa" role="dialog" aria-modal="true" aria-labelledby="juego-t-pausa" hidden>
    <div class="pantalla__caja pantalla__caja--estrecha">
      <h2 id="juego-t-pausa" class="pantalla__titulo">Partido en pausa</h2>
      <div class="pantalla__acciones pantalla__acciones--columna">
        <button type="button" class="btn btn--primario" data-accion="reanudar" data-enfoque>Seguir jugando</button>
        <button type="button" class="btn btn--secundario" data-accion="reiniciar">Empezar de nuevo</button>
        <button type="button" class="btn btn--fantasma" data-accion="hub">Volver al menú</button>
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
      <div class="recompensas__caja" data-campo="recompensas" aria-live="polite"></div>
      <div class="pantalla__acciones">
        <button type="button" class="btn btn--primario" data-accion="reiniciar" data-enfoque>Jugar otra vez</button>
        <button type="button" class="btn btn--secundario" data-accion="vestuario">Vestuario</button>
        <button type="button" class="btn btn--fantasma" data-accion="hub">Menú</button>
      </div>
    </div>
  </section>

  <p class="sr-only" data-campo="anuncio" role="status" aria-live="polite"></p>
`;

const PANTALLAS = ['hub', 'identidad', 'vestuario', 'entrenamiento', 'contratar', 'combos', 'direccion', 'ranking', 'ajustes', 'ayuda', 'pausa', 'mejora', 'fin'];
const PANELES_DEL_HUB = new Set(['identidad', 'vestuario', 'entrenamiento', 'contratar', 'combos', 'direccion', 'ranking', 'ajustes', 'ayuda']);

const textoPartida = (f) => `${formatearTiempo(f.tiempo)} · ${PERSONAJES[f.personaje]?.nombre ?? '—'} · oleada ${f.oleada}`;

/**
 * Monta el juego dentro de `contenedor`.
 * @param {HTMLElement} contenedor
 * @param {{ usuario: object, alSalir: () => void, alCambiarUsuario?: (u: object) => void }} opciones
 * @returns {{ destruir: () => void }}
 */
export function montarJuego(contenedor, {
  usuario, alSalir, servidor = null, alCambiarUsuario = () => {},
}) {
  contenedor.classList.add('juego');
  contenedor.innerHTML = PLANTILLA;
  const botonPruebas = contenedor.querySelector('[data-campo="boton-pruebas"]');
  if (botonPruebas && usuario?.role === 'admin' && servidor?.desbloquear) botonPruebas.hidden = false;

  const q = (sel) => contenedor.querySelector(sel);
  const lienzo = q('.juego__lienzo');
  const ctx = lienzo.getContext('2d');
  const pantallas = Object.fromEntries(PANTALLAS.map((n) => [n, q(`[data-pantalla="${n}"]`)]));
  const zonaHud = q('[data-zona="hud"]');
  const anuncio = q('[data-campo="anuncio"]');
  const botonSonido = q('[data-accion="sonido"]');

  const audio = crearAudio();
  const hud = crearHud(contenedor);
  const reducirMovimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  let ajustes = leerAjustes();
  if (reducirMovimiento && localStorage.getItem('grada.ajustes') === null) ajustes.efectos = false;

  const CLAVE_ELECCION = 'grada.eleccion';
  let eleccion = { personaje: 'koke', entrenador: 'cholo' };
  try {
    const guardada = JSON.parse(localStorage.getItem(CLAVE_ELECCION));
    if (PERSONAJES[guardada?.personaje]) eleccion.personaje = guardada.personaje;
    if (ENTRENADORES[guardada?.entrenador]) eleccion.entrenador = guardada.entrenador;
  } catch { /* sin almacenamiento: se usa la elección por defecto */ }

  // --- El club (se guarda en el servidor, ligado a tu cuenta) -------------------------------------
  let club = null; // { jugadores, fichas, jefesTotal, ... } tal como lo devuelve el servidor
  let estadoClub = servidor ? 'cargando' : 'libre'; // cargando | listo | error | libre (sin servidor: todo desbloqueado, no se guarda nada)
  let previa = null; // jugador cuya ficha se está viendo en el vestuario (aunque no se tenga)
  let seleccionEntrena = null;
  let pestanaRanking = 'grada';
  let partida = null; // { id, enviada } de la partida en curso
  let ocupado = false; // hay una petición del club en marcha


  /** `paraMenu`: el mundo del menú tiene un pasillo libre de obstáculos por el que pasea el muñeco. */
  const nuevoMundo = (paraMenu = false) => {
    const entrenamiento = club?.jugadores[eleccion.personaje]?.stats ?? null; // lo entrenado en el club se nota en el campo
    const m = crearMundo({
      efectosReducidos: !ajustes.efectos, ...eleccion, pasilloMenu: paraMenu, entrenamiento,
    });
    m.sinNumeros = !ajustes.numeros;
    return m;
  };
  let mundo = nuevoMundo(true);
  let fase = 'hub'; // hub | jugando | pausa | mejora | fin
  let pantallaActual = 'hub';
  let vista = { ancho: 800, alto: 600, escala: 1, dpr: 1 };
  let acumulador = 0;
  let previo = performance.now();
  let raf = 0;
  let filtroPos = 'todos'; // filtro de posición del vestuario

  const posee = (clave) => estadoClub !== 'listo' || Boolean(club?.jugadores[clave]);
  const propios = () => Object.keys(PERSONAJES).filter(posee).sort(porPosicion);

  function aplicarClub(nuevo) {
    club = nuevo;
    estadoClub = 'listo';
    if (!posee(eleccion.personaje)) eleccion = { ...eleccion, personaje: propios()[0] };
    if (!seleccionEntrena || !club.jugadores[seleccionEntrena]) seleccionEntrena = eleccion.personaje;
    pintarAvisosClub();
  }

  // --- Tu ficha: mote y avatar ------------------------------------------------------------------

  let avatarElegido = null;
  let preguntadoMote = false;

  /** Caras que puedes ponerte: los jugadores que tienes y los entrenadores. */
  function carasDisponibles() {
    const jugadores = club ? propios() : [eleccion.personaje];
    return [...jugadores.map((k) => `p:${k}`), ...Object.keys(ENTRENADORES).map((k) => `e:${k}`)];
  }
  const nombreDeCara = (a) => {
    const [tipo, clave] = a.split(':');
    return tipo === 'p' ? PERSONAJES[clave]?.nombre : ENTRENADORES[clave]?.nombre;
  };

  function pintarFichaFan() {
    const boton = q('[data-campo="ficha-fan"]');
    const url = usuario?.avatar ? avatarUrl(usuario.avatar, 64) : null;
    const nombre = usuario?.apodo || 'Ponte un mote';
    boton.innerHTML = `${url ? `<img src="${url}" alt="" width="44" height="44">` : '<span class="ficha-fan__vacia" aria-hidden="true">?</span>'}
      <span><strong>${esc(nombre)}</strong><small>${usuario?.apodo ? 'Tu ficha · cambiar' : 'Saldrá en el ranking'}</small></span>`;
  }

  function pintarIdentidad() {
    const caras = carasDisponibles();
    if (!avatarElegido || !caras.includes(avatarElegido)) avatarElegido = usuario?.avatar && caras.includes(usuario.avatar) ? usuario.avatar : caras[0];
    const input = q('[data-campo="ident-apodo"]');
    if (!input.value) input.value = usuario?.apodo ?? '';
    q('[data-campo="ident-vista"]').src = avatarUrl(avatarElegido, 96) ?? '';
    q('[data-campo="ident-caras"]').innerHTML = caras.map((a) => `<li><button type="button" class="cara" data-avatar="${a}" aria-pressed="${a === avatarElegido}" title="${esc(nombreDeCara(a) ?? a)}">
        <img src="${avatarUrl(a, 56)}" alt="" width="56" height="56"><span class="sr-only">${esc(nombreDeCara(a) ?? a)}</span></button></li>`).join('');
    q('[data-campo="ident-error"]').hidden = true;
  }

  async function guardarIdentidad() {
    if (ocupado || !servidor?.identidad) return;
    const apodo = q('[data-campo="ident-apodo"]').value.trim();
    const error = q('[data-campo="ident-error"]');
    if (apodo.length < 3) {
      error.textContent = 'El mote tiene que tener al menos 3 caracteres.';
      error.hidden = false;
      return;
    }
    ocupado = true;
    q('[data-campo="ident-guardar"]').disabled = true;
    try {
      const nuevo = await servidor.identidad({ apodo, avatar: avatarElegido });
      Object.assign(usuario, nuevo);
      alCambiarUsuario({ ...usuario });
      anunciar(`Guardado: ahora eres ${nuevo.apodo}`);
      pintarFichaFan();
      irAlHub('hub');
    } catch (e) {
      error.textContent = e.message || 'No se ha podido guardar. Inténtalo de nuevo.';
      error.hidden = false;
    } finally {
      ocupado = false;
      q('[data-campo="ident-guardar"]').disabled = false;
    }
  }

  async function cargarClub() {
    if (!servidor) return;
    estadoClub = 'cargando';
    pintarAvisosClub();
    try {
      aplicarClub(await servidor.perfil());
      if (fase === 'hub') { mundo = nuevoMundo(true); pintarCartelJugador(); }
      // La primera vez (sin mote todavía) se ofrece ponerse uno
      if (fase === 'hub' && pantallaActual === 'hub' && !usuario?.apodo && servidor.identidad && !preguntadoMote) {
        preguntadoMote = true;
        irAlHub('identidad');
      }
    } catch (error) {
      console.error('[grada] no se pudo cargar el club', error);
      estadoClub = 'error';
    }
    pintarAvisosClub();
  }

  function pintarAvisosClub() {
    const nota = q('[data-campo="club-estado"]');
    const textos = {
      cargando: 'Cargando tu club…',
      error: 'No se ha podido cargar tu club. Puedes jugar, pero no se guardará el progreso.',
      libre: 'Modo libre: no se guarda el progreso.',
    };
    nota.hidden = estadoClub === 'listo';
    nota.textContent = textos[estadoClub] ?? '';
    nota.dataset.estado = estadoClub;
    const puntos = club ? Object.values(club.jugadores).reduce((s, f) => s + f.puntosLibres, 0) : 0;
    const fichas = club?.fichas ?? 0;
    const apunta = (campo, n) => { const b = q(`[data-campo="${campo}"]`); b.hidden = n <= 0; b.textContent = String(n); };
    apunta('aviso-puntos', puntos);
    apunta('aviso-fichas', fichas);
  }

  const entrada = crearEntrada(contenedor, { alPausar: alternarPausa, activo: () => fase === 'jugando' });

  // --- Ajustes ----------------------------------------------------------------------------------

  function aplicarAjustes() {
    audio.volumen = ajustes.volumen / 100;
    entrada.ponerJoystick(ajustes.joystick);
    mundo.efectosReducidos = !ajustes.efectos;
    mundo.sinNumeros = !ajustes.numeros;
    ajustarTamano();
  }

  function pintarAjustes() {
    q('[data-ajuste="volumen"]').value = String(ajustes.volumen);
    q('[data-campo="volumen-valor"]').textContent = `${ajustes.volumen} %`;
    q('[data-ajuste="sonido"]').checked = !audio.silenciado;
    q('[data-ajuste="efectos"]').checked = ajustes.efectos;
    q('[data-ajuste="numeros"]').checked = ajustes.numeros;
    q('[data-ajuste="zoom"]').value = ajustes.zoom;
    q('[data-ajuste="joystick"]').checked = ajustes.joystick;
  }

  function alCambiarAjuste(ev) {
    const campo = ev.target.closest('[data-ajuste]');
    if (!campo) return;
    const clave = campo.dataset.ajuste;
    if (clave === 'sonido') {
      if (audio.silenciado === campo.checked) audio.alternar(); // «activado» = no silenciado
      actualizarBotonSonido();
      return;
    }
    ajustes = { ...ajustes, [clave]: campo.type === 'checkbox' ? campo.checked : campo.type === 'range' ? Number(campo.value) : campo.value };
    guardarAjustes(ajustes);
    aplicarAjustes();
    q('[data-campo="volumen-valor"]').textContent = `${ajustes.volumen} %`;
    if (clave === 'volumen') { audio.activar(); audio.reproducir('gema'); }
  }

  // --- Pantallas ------------------------------------------------------------------------------

  function mostrar(nombre) {
    pantallaActual = nombre;
    Object.entries(pantallas).forEach(([clave, nodo]) => { nodo.hidden = clave !== nombre; });
    if (nombre) {
      requestAnimationFrame(() => (pantallas[nombre].querySelector('[data-enfoque]') || pantallas[nombre].querySelector('button'))?.focus());
    }
  }

  function anunciar(texto) {
    anuncio.textContent = '';
    setTimeout(() => { anuncio.textContent = texto; }, 30);
  }

  function actualizarBotonSonido() {
    const mudo = audio.silenciado;
    botonSonido.setAttribute('aria-pressed', String(mudo));
    botonSonido.setAttribute('aria-label', mudo ? 'Activar sonido' : 'Silenciar sonido');
    botonSonido.innerHTML = icono(mudo ? 'silencio' : 'sonido', 20);
  }

  // --- Menú: tus tiempos, vestuario, dirección y ranking --------------------------------------------

  function pintarTiempos() {
    const st = leerStats(usuario);
    const caja = q('[data-campo="tiempos"]');
    if (!st.partidas && !st.mejorTiempo) {
      caja.innerHTML = '<p class="panel__vacio">Aún no has jugado ninguna partida. ¡Estrena la grada!</p>';
      return;
    }
    const numero = (n) => n.toLocaleString('es-ES');
    caja.innerHTML = `
      <p class="tiempo-grande"><span>Mejor tiempo</span><strong>${formatearTiempo(st.mejorTiempo)}</strong></p>
      <dl class="datos">
        <div><dt>Oleada máxima</dt><dd>${st.mejorOleada}</dd></div>
        <div><dt>Nivel máximo</dt><dd>${st.mejorNivel}</dd></div>
        <div><dt>Partidas</dt><dd>${numero(st.partidas)}</dd></div>
        <div><dt>Rivales derrotados</dt><dd>${numero(st.bajas)}</dd></div>
        <div><dt>Jefes derrotados</dt><dd>${numero(st.jefes)}</dd></div>
      </dl>
      ${st.ultimas.length ? `<h4 class="panel__subtitulo">Últimas partidas</h4><ol class="lista-partidas">${st.ultimas.slice(0, 4).map((f) => `<li>${textoPartida(f)}</li>`).join('')}</ol>` : ''}`;
  }

  function pintarCartelJugador() {
    q('[data-campo="nombre-jugador"]').textContent = PERSONAJES[eleccion.personaje].nombre;
    q('[data-campo="nombre-entrenador"]').textContent = `con ${ENTRENADORES[eleccion.entrenador].nombre}`;
  }

  async function pintarRanking() {
    const caja = q('[data-campo="mejores"]');
    contenedor.querySelectorAll('[data-ranking]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ranking === pestanaRanking)));
    if (pestanaRanking === 'grada' && servidor) {
      caja.innerHTML = '<p class="panel__vacio">Cargando la clasificación…</p>';
      try {
        const datos = await servidor.ranking();
        if (pestanaRanking === 'grada' && pantallaActual === 'ranking') caja.innerHTML = htmlRankingGrada(datos, (a) => avatarUrl(a, 40));
      } catch (error) {
        console.error('[grada] ranking', error);
        caja.innerHTML = '<p class="panel__vacio">No se ha podido cargar el ranking de la grada. Inténtalo de nuevo en un rato.</p>';
      }
      return;
    }
    const st = leerStats(usuario);
    caja.innerHTML = st.mejores.length
      ? `<ol class="ranking">${st.mejores.map((f, k) => `
          <li><span class="ranking__puesto">${k + 1}</span><span class="ranking__datos">${textoPartida(f)}</span><span class="ranking__extra">${f.bajas} rivales</span></li>`).join('')}</ol>`
      : '<p class="panel__vacio">Todavía no hay partidas. ¡Sal al campo y marca un tiempo!</p>';
  }

  const barraEstadistica = (etiqueta, fraccion, texto) => `
    <div class="stat"><span class="stat__etiqueta">${etiqueta}</span>
      <span class="stat__barra"><span style="width:${Math.round(Math.max(0, Math.min(1, fraccion)) * 100)}%"></span></span>
      <span class="stat__valor">${texto}</span></div>`;

  const ORDEN_POSICIONES = ['portero', 'defensa', 'medio', 'delantero'];
  const NOMBRE_TIPO = { cuerpo: 'Cuerpo a cuerpo', disparo: 'Disparo', movil: 'Regates y movilidad' };

  /** Estadísticas reales de un jugador: las de su posición retocadas con sus propios rasgos. */
  function estadisticasDe(clave) {
    const p = PERSONAJES[clave];
    const pos = POSICIONES[p.posicion];
    const m = p.mods ?? {};
    return {
      vida: Math.round(pos.vida * (m.vida ?? 1)),
      vel: Math.round(pos.vel * (m.vel ?? 1)),
      cuerpo: Math.round(pos.cuerpo * (m.cuerpo ?? 1) * 100) / 100,
      disparo: Math.round(pos.disparo * (m.disparo ?? 1) * 100) / 100,
    };
  }

  function pintarDetalle() {
    const clave = previa ?? eleccion.personaje;
    const p = PERSONAJES[clave];
    const ficha = club?.jugadores[clave];
    const entren = ficha ? ficha.stats : null;
    const pos = POSICIONES[p.posicion];
    const st = estadisticasDe(clave);
    const habs = p.habilidades.map((k) => ({ k, ...ARMAS[k] }));
    const porTipo = ['cuerpo', 'disparo', 'movil'].map((tipo) => ({ tipo, lista: habs.filter((h) => h.tipo === tipo) })).filter((g) => g.lista.length);
    q('[data-campo="detalle"]').innerHTML = `
      <div class="detalle__cabecera">
        <img class="detalle__retrato" alt="" width="96" height="120" src="${retratoUrl(`p:${clave}`, aspectoDe('personaje', clave))}">
        <div>
          <h3 class="detalle__nombre">${p.nombre}</h3>
          <p class="detalle__posicion">${pos.nombre} ${htmlRareza(clave)}</p>
          <p class="detalle__total"><strong>${habs.length}</strong> habilidades</p>
        </div>
      </div>
      <p class="detalle__nac"><strong>${esc(p.nacionalidad ?? '')}</strong>${p.epoca ? ` · ${esc(p.epoca)}` : ''}</p>
      <p class="detalle__desc">${esc(p.descripcion ?? '')}</p>
      <p class="detalle__estilo">${p.estilo}</p>
      ${posee(clave) ? '' : '<p class="detalle__bloqueado">Aún no lo tienes. Consíguelo canjeando una ficha en <strong>Contratar</strong> (una por cada 3 jefes vencidos).</p>'}
      ${entren ? `<p class="detalle__entreno">Entrenamiento: ${['vida', 'defensa', 'disparo', 'suerte'].map((e) => `<span class="chip-stat">${e} <b>${entren[e]}</b></span>`).join('')}</p>` : ''}
      <div class="detalle__stats">
        ${barraEstadistica('Vida', st.vida / 190, st.vida)}
        ${barraEstadistica('Velocidad', st.vel / 195, st.vel)}
        ${barraEstadistica('Cuerpo a cuerpo', st.cuerpo / 1.5, `x${st.cuerpo}`)}
        ${barraEstadistica('Disparo', st.disparo / 1.5, st.disparo ? `x${st.disparo}` : 'No')}
      </div>
      <div class="detalle__habs">
        ${porTipo.map((g) => `
          <h4 class="detalle__tipo">${NOMBRE_TIPO[g.tipo]} <span>${g.lista.length}</span></h4>
          <ul class="habs">${g.lista.map((h) => `
            <li class="hab hab--${g.tipo}${h.k === p.armaInicial ? ' hab--inicial' : ''}" title="${h.descripcion}">
              ${icono(h.icono, 18)}<span>${h.nombre}</span>${h.k === p.armaInicial ? '<em>inicial</em>' : ''}
            </li>`).join('')}</ul>`).join('')}
      </div>`;
  }

  function pintarVestuario() {
    const lista = q('[data-campo="personajes"]');
    const scroll = lista.scrollTop;
    const claves = Object.keys(PERSONAJES);
    q('[data-campo="filtros"]').innerHTML = ['todos', ...ORDEN_POSICIONES].map((f) => {
      const n = f === 'todos' ? claves.length : claves.filter((c) => PERSONAJES[c].posicion === f).length;
      if (!n) return '';
      return `<button type="button" class="filtro" data-filtro="${f}" aria-pressed="${filtroPos === f}">${f === 'todos' ? 'Todos' : POSICIONES[f].nombre} <span>${n}</span></button>`;
    }).join('') + (estadoClub === 'listo' ? `<span class="vest__cuenta">${Object.keys(club.jugadores).length} de ${claves.length} fichados</span>` : '');
    const visibles = claves
      .filter((c) => filtroPos === 'todos' || PERSONAJES[c].posicion === filtroPos)
      .sort((x, y) => (Number(posee(y)) - Number(posee(x))) || porPosicion(x, y));
    lista.innerHTML = visibles.map((clave) => {
      const p = PERSONAJES[clave];
      const tengo = posee(clave);
      const visto = (previa ?? eleccion.personaje) === clave;
      return `<li><button type="button" class="ficha${tengo ? '' : ' ficha--bloqueada'}" data-personaje="${clave}" aria-pressed="${visto}" ${tengo ? '' : 'aria-label="' + p.nombre + ' (sin fichar)"'}>
        <img class="ficha__retrato" alt="" width="40" height="50" src="${retratoUrl(`p:${clave}`, aspectoDe('personaje', clave))}">
        <span class="ficha__texto"><span class="ficha__nombre">${p.nombre}${eleccion.personaje === clave ? ' ✔' : ''}</span><span class="ficha__posicion">${POSICIONES[p.posicion].nombre} · ${p.habilidades.length} hab. · ${tengo ? (p.nacionalidad ?? '') : 'Sin fichar'}</span></span>
        ${tengo ? '' : icono('candado', 18)}
      </button></li>`;
    }).join('');
    lista.scrollTop = scroll;
    pintarDetalle();
  }

  function pintarEntrenamiento() {
    if (estadoClub !== 'listo') {
      q('[data-campo="entrena-lista"]').innerHTML = '';
      q('[data-campo="entrena-panel"]').innerHTML = `<p class="panel__vacio">${estadoClub === 'cargando' ? 'Cargando tu club…' : 'Tu club no está disponible ahora mismo. Vuelve a entrar al juego para reintentarlo.'}</p>`;
      return;
    }
    seleccionEntrena = eleccion.personaje; // solo se entrena al jugador elegido (se cambia en el Vestuario)
    const { lista, panel } = htmlEntrenamiento(club, seleccionEntrena, (c) => retratoUrl(`p:${c}`, aspectoDe('personaje', c)));
    const caja = q('[data-campo="entrena-lista"]');
    const scroll = caja.scrollTop;
    caja.innerHTML = lista;
    caja.scrollTop = scroll;
    q('[data-campo="entrena-panel"]').innerHTML = panel;
  }

  function pintarContratar() {
    const caja = q('[data-campo="contratar-panel"]');
    if (estadoClub !== 'listo') {
      caja.innerHTML = `<p class="panel__vacio">${estadoClub === 'cargando' ? 'Cargando tu club…' : 'Tu club no está disponible ahora mismo.'}</p>`;
      return;
    }
    caja.innerHTML = htmlContratar(club, (c) => retratoUrl(`p:${c}`, aspectoDe('personaje', c)));
  }

  async function entrenar(estadistica) {
    if (ocupado || estadoClub !== 'listo' || !seleccionEntrena) return;
    ocupado = true;
    try {
      aplicarClub(await servidor.entrenar(seleccionEntrena, estadistica));
      audio.reproducir('cura');
      anunciar(`${PERSONAJES[seleccionEntrena].nombre}: ${estadistica} +1`);
    } catch (error) {
      anunciar(error.message || 'No se ha podido entrenar');
    } finally {
      ocupado = false;
      pintarEntrenamiento();
    }
  }

  async function desbloquearTodo() {
    if (ocupado || !servidor?.desbloquear) return;
    ocupado = true;
    try {
      aplicarClub(await servidor.desbloquear());
      anunciar('Modo pruebas: todos los jugadores desbloqueados y con puntos de sobra');
    } catch (error) {
      anunciar(error.message || 'No se ha podido desbloquear');
    } finally {
      ocupado = false;
      pintarEntrenamiento();
    }
  }

  async function canjearFicha() {
    if (ocupado || estadoClub !== 'listo') return;
    ocupado = true;
    const boton = q('[data-accion="canjear"]');
    if (boton) boton.disabled = true;
    let fichado = null;
    try {
      const r = await servidor.contratar();
      fichado = r.fichado;
      aplicarClub(r.perfil);
      audio.reproducir('sinergia');
    } catch (error) {
      anunciar(error.message || 'No se ha podido contratar');
    } finally {
      ocupado = false;
      pintarContratar();
    }
    if (fichado) {
      q('[data-campo="fichado"]').innerHTML = htmlFichado(fichado, (c) => retratoUrl(`p:${c}`, aspectoDe('personaje', c)));
      anunciar(`Nuevo fichaje: ${PERSONAJES[fichado].nombre}`);
    }
  }

  function pintarDireccion() {
    q('[data-campo="entrenadores"]').innerHTML = Object.entries(ENTRENADORES).map(([clave, e]) => `
      <li><button type="button" class="tarjeta tarjeta--entrenador" data-entrenador="${clave}" aria-pressed="${eleccion.entrenador === clave}">
        <img class="tarjeta__retrato" alt="" width="80" height="100" src="${retratoUrl(`c:${clave}`, aspectoDe('entrenador', clave))}">
        <span class="tarjeta__nombre">${e.nombre}</span>
        <span class="tarjeta__posicion">${e.resumen}</span>
        <span class="tarjeta__ulti"><strong>Ulti: ${e.ulti.nombre}</strong> ${e.ulti.descripcion}</span>
      </button></li>`).join('');
  }

  /** Panel de combinaciones: las descubiertas se explican; las que no, solo dan una pista. */
  function pintarCombos() {
    const st = leerStats(usuario);
    const hechas = new Set(st.sinergias);
    const yo = PERSONAJES[eleccion.personaje];
    const nombreDe = (k) => ARMAS[k]?.nombre ?? k;
    const esPasiva = (k) => !ARMAS[k];
    const claves = Object.keys(SINERGIAS);
    q('[data-campo="combos-cuenta"]').textContent = `${claves.filter((k) => hechas.has(k)).length} de ${claves.length} descubiertas`;
    q('[data-campo="combos"]').innerHTML = claves.map((k) => {
      const c = SINERGIAS[k];
      const conocida = hechas.has(k);
      const armasNecesarias = Object.keys(c.requiere).filter((x) => !esPasiva(x));
      const posible = armasNecesarias.every((x) => yo.habilidades.includes(x));
      const requisitos = c.distintas
        ? `${c.distintas.cuantas} habilidades distintas al nivel ${c.distintas.nivel}`
        : Object.entries(c.requiere).map(([x, n]) => `${nombreDe(x)} <b>nv ${n}</b>`).join(' + ');
      const pista = c.distintas
        ? `Domina ${c.distintas.cuantas} habilidades a la vez.`
        : `Necesita ${Object.keys(c.requiere).length} habilidades; una de ellas: ${nombreDe(Object.keys(c.requiere)[0])}.`;
      return `<li class="combo${conocida ? ' combo--hecha' : ''}${posible ? '' : ' combo--imposible'}">
        <span class="combo__icono">${icono(conocida ? c.icono : 'candado', 24)}</span>
        <span class="combo__cuerpo">
          <strong>${conocida ? c.nombre : '???'}</strong>
          <span>${conocida ? c.descripcion : pista}</span>
          ${conocida ? `<small>${requisitos}</small>` : ''}
        </span>
        <span class="combo__marca">${posible ? `Posible con ${yo.nombre}` : `No para ${yo.nombre}`}</span>
      </li>`;
    }).join('');
  }

  /** Las seis ULTRAS: poderes de leyenda que se consiguen juntando varias combinaciones. */
  function pintarUltras() {
    const st = leerStats(usuario);
    const hechas = new Set(st.sinergias);
    const yo = PERSONAJES[eleccion.personaje];
    const claves = Object.keys(ULTRAS);
    q('[data-campo="ultras-cuenta"]').textContent = `${claves.filter((k) => hechas.has(`u:${k}`)).length} de ${claves.length} conseguidas`;
    q('[data-campo="ultras"]').innerHTML = claves.map((k) => {
      const u = ULTRAS[k];
      const conocida = hechas.has(`u:${k}`);
      const posibles = u.de.filter((c) => Object.keys(SINERGIAS[c].requiere).filter((x) => ARMAS[x]).every((x) => yo.habilidades.includes(x))
        && !(yo.posicion === 'portero' && Object.keys(SINERGIAS[c].requiere).some((x) => ARMAS[x]?.tipo === 'disparo')));
      const alcanzable = posibles.length >= u.cuantas;
      return `<li class="combo combo--ultra${conocida ? ' combo--hecha' : ''}${alcanzable ? '' : ' combo--imposible'}" style="--color-ultra:${u.color}">
        <span class="combo__icono">${icono(conocida ? u.icono : 'candado', 26)}</span>
        <span class="combo__cuerpo">
          <strong>${conocida ? u.nombre : '???'}</strong>
          <span>${conocida ? u.descripcion : `Un poder de leyenda: junta ${u.cuantas} de estas combinaciones.`}</span>
          <small>${u.de.map((c) => `${SINERGIAS[c].nombre}${posibles.includes(c) ? '' : ' ✗'}`).join(' · ')}</small>
        </span>
        <span class="combo__marca">${alcanzable ? `Posible con ${yo.nombre}` : `No para ${yo.nombre}`}</span>
      </li>`;
    }).join('');
  }

  function elegirOpcion(tipo, clave) {
    if (tipo === 'personaje') {
      previa = clave; // se ve su ficha aunque todavía no se tenga
      if (!posee(clave)) { pintarVestuario(); return; }
    }
    eleccion = { ...eleccion, [tipo]: clave };
    try { localStorage.setItem(CLAVE_ELECCION, JSON.stringify(eleccion)); } catch { /* da igual */ }
    contenedor.querySelectorAll(`[data-${tipo}]`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset[tipo] === clave)));
    mundo = nuevoMundo(true); // el menú enseña al jugador elegido paseando
    pintarCartelJugador();
    if (tipo === 'personaje') pintarVestuario();
  }

  /** Cierra la partida en curso en el servidor: reparte puntos y fichas y actualiza el ranking. Devuelve la respuesta o null. */
  async function cerrarPartida({ alCerrarPagina = false } = {}) {
    const p = partida;
    if (!p || p.enviada || !servidor) return null;
    p.enviada = true;
    const r = resumen(mundo);
    const datos = { tiempo: Math.floor(r.tiempo), nivel: r.nivel, jefes: r.jefes, bajas: r.bajas };
    if (alCerrarPagina) {
      servidor.finalizarAlCerrar?.(p.id, datos);
      return null;
    }
    try {
      const respuesta = await servidor.finalizar(p.id, datos);
      aplicarClub(respuesta.perfil);
      return respuesta;
    } catch (error) {
      console.error('[grada] no se pudo guardar la partida', error);
      return null;
    }
  }

  // En partida la cabecera de la web se esconde para no quitar visión (la clase la oculta con CSS)
  const ponerEnPartida = (si) => document.body.classList.toggle('en-partida', si);

  function irAlHub(panel = 'hub') {
    ponerEnPartida(false);
    if (fase !== 'hub') {
      if (fase !== 'fin') cerrarPartida(); // abandonar la partida también cuenta: los jefes vencidos ya son tuyos
      fase = 'hub';
      zonaHud.hidden = true;
      mundo = nuevoMundo(true);
      entrada.soltarTodo();
    }
    if (panel === 'hub') {
      previa = null;
      pintarFichaFan();
      pintarTiempos();
      pintarCartelJugador();
      pintarAvisosClub();
    } else if (panel === 'vestuario') {
      previa = null;
      pintarVestuario();
      requestAnimationFrame(() => { // la lista se desplaza hasta el jugador elegido (sin mover el resto de la pantalla)
        const lista = q('[data-campo="personajes"]');
        const ficha = lista.querySelector('.ficha[aria-pressed="true"]');
        if (ficha) lista.scrollTop = Math.max(0, ficha.offsetTop - lista.offsetTop - lista.clientHeight / 2 + ficha.offsetHeight / 2);
      });
    } else if (panel === 'entrenamiento') pintarEntrenamiento();
    else if (panel === 'contratar') pintarContratar();
    else if (panel === 'direccion') pintarDireccion();
    else if (panel === 'combos') { pintarCombos(); pintarUltras(); }
    else if (panel === 'ranking') {
      pestanaRanking = servidor ? pestanaRanking : 'mio';
      pintarRanking();
    }
    else if (panel === 'ajustes') pintarAjustes();
    else if (panel === 'identidad') pintarIdentidad();
    mostrar(panel);
  }

  async function empezar() {
    if (ocupado) return;
    if (fase === 'jugando' || fase === 'pausa' || fase === 'mejora') await cerrarPartida();
    audio.activar();
    partida = null;
    if (servidor && estadoClub === 'listo') {
      ocupado = true;
      try {
        const r = await servidor.iniciar(eleccion.personaje, eleccion.entrenador);
        partida = { id: r.partidaId, enviada: false };
        aplicarClub(r.perfil);
      } catch (error) {
        console.error('[grada] no se pudo iniciar la partida en el servidor', error);
        anunciar('No se ha podido conectar con el servidor: esta partida no se guardará.');
      } finally {
        ocupado = false;
      }
    }
    mundo = nuevoMundo(false);
    hud.reiniciar();
    entrada.soltarTodo();
    acumulador = 0;
    fase = 'jugando';
    ponerEnPartida(true);
    zonaHud.hidden = false;
    mostrar(null);
    hud.actualizar(mundo);
    procesarEventos();
    lienzo.focus({ preventScroll: true });
  }

  function alternarPausa() {
    if (fase === 'pausa' && pantallaActual === 'ajustes') {
      mostrar('pausa'); // Esc dentro de los ajustes de la partida: vuelves a la pausa
      return;
    }
    if (fase === 'jugando') {
      fase = 'pausa';
      entrada.soltarTodo();
      mostrar('pausa');
    } else if (fase === 'pausa') {
      reanudar();
    }
  }

  /** El engranaje de la partida: pausa y abre todos los ajustes. */
  function abrirAjustesPartida() {
    if (fase === 'jugando') alternarPausa();
    if (fase !== 'pausa') return;
    pintarAjustes();
    mostrar('ajustes');
  }

  function cerrarAjustes() {
    if (fase === 'pausa') mostrar('pausa');
    else irAlHub('hub');
  }

  // --- Pantalla completa -------------------------------------------------------------------------

  const botonPantalla = q('[data-accion="pantalla"]');
  function pintarBotonPantalla() {
    const dentro = Boolean(document.fullscreenElement);
    botonPantalla.setAttribute('aria-pressed', String(dentro));
    botonPantalla.setAttribute('aria-label', dentro ? 'Salir de pantalla completa (F)' : 'Pantalla completa (F)');
    botonPantalla.innerHTML = icono(dentro ? 'pantallaSalir' : 'pantalla', 20);
  }
  function alternarPantallaCompleta() {
    try {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else document.documentElement.requestFullscreen?.();
    } catch { /* algunos navegadores (iPhone) no la permiten */ }
  }
  const alCambiarPantalla = () => pintarBotonPantalla();
  document.addEventListener('fullscreenchange', alCambiarPantalla);
  if (!document.documentElement.requestFullscreen) botonPantalla.hidden = true;

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
      const etiqueta = o.tipo === 'extra' ? 'Extra'
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
      if (o.sinergia) {
        const nota = document.createElement('span');
        nota.className = 'opcion__sinergia';
        nota.textContent = o.ultra ? `✦ ¡Completa «${o.sinergia}» y consigues la ULTRA «${o.ultra}»!` : `★ Completa la combinación «${o.sinergia}»`;
        if (o.ultra) nota.classList.add('opcion__sinergia--ultra');
        boton.querySelector('.opcion__cuerpo').append(nota);
      }
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
    const { record } = registrarPartida(usuario, r);
    q('[data-campo="record"]').hidden = !record;
    const cajaRecompensas = q('[data-campo="recompensas"]');
    cajaRecompensas.innerHTML = partida ? '<p class="panel__vacio">Guardando tu partida…</p>' : '';
    cerrarPartida().then((respuesta) => {
      if (fase !== 'fin') return;
      cajaRecompensas.innerHTML = respuesta ? htmlRecompensas(respuesta, PERSONAJES[r.personaje].nombre)
        : (partida ? '<p class="panel__vacio">No se ha podido guardar la partida en el servidor.</p>' : '');
      if (respuesta?.record) q('[data-campo="record"]').hidden = false;
      pintarAvisosClub();
    });
    q('[data-campo="resultado"]').innerHTML = `
      <div><dt>Tiempo aguantado</dt><dd>${formatearTiempo(r.tiempo)}</dd></div>
      <div><dt>Oleada</dt><dd>${r.oleada}</dd></div>
      <div><dt>Nivel</dt><dd>${r.nivel}</dd></div>
      <div><dt>Rivales eliminados</dt><dd>${r.bajas}</dd></div>
      <div><dt>Jefes derrotados</dt><dd>${r.jefes}</dd></div>
      ${r.sinergias.length ? `<div><dt>Combinaciones</dt><dd>${r.sinergias.map((k) => SINERGIAS[k].nombre).join(', ')}</dd></div>` : ''}
      <div><dt>Jugador</dt><dd>${PERSONAJES[r.personaje].nombre}</dd></div>
      <div><dt>Entrenador</dt><dd>${ENTRENADORES[r.entrenador].nombre}</dd></div>`;
    // Pequeña pausa para que se vea el golpe final antes de tapar la pantalla
    setTimeout(() => {
      if (fase !== 'fin') return;
      zonaHud.hidden = true;
      mostrar('fin');
      anunciar(`Te han eliminado. Has aguantado ${formatearTiempo(r.tiempo)} y llegado a la oleada ${r.oleada}.`);
    }, 900);
  }

  // --- Eventos de la simulación → sonido y avisos -----------------------------------------------

  function procesarEventos() {
    for (const ev of mundo.eventos.splice(0)) {
      audio.reproducir(ev.tipo);
      if (ev.tipo === 'oleada' && ev.oleada > 1) {
        hud.aviso(`Oleada ${ev.oleada}`);
        anunciar(`Oleada ${ev.oleada}`);
      } else if (ev.tipo === 'aviso') {
        hud.aviso(ev.texto, ev.jefe ? 'jefe' : 'alerta');
        anunciar(ev.texto);
      } else if (ev.tipo === 'ulti') {
        hud.aviso(ev.texto, 'exito');
      } else if (ev.tipo === 'sinergia') {
        const nueva = registrarSinergia(usuario, ev.clave);
        hud.aviso(`★ ${nueva ? 'Combinación nueva: ' : ''}${ev.nombre}`, 'exito');
        anunciar(`Combinación conseguida: ${ev.nombre}. ${ev.descripcion}`);
      } else if (ev.tipo === 'ultra') {
        registrarSinergia(usuario, `u:${ev.clave}`);
        hud.aviso(`✦ ULTRA: ${ev.nombre}`, 'exito');
        anunciar(`Ultra conseguida: ${ev.nombre}. ${ev.descripcion}`);
      } else if (ev.tipo === 'jefe-derrotado') {
        hud.aviso(`¡${ev.nombre} eliminado!`, 'exito');
      } else if (ev.tipo === 'ambiente' && ev.indice > 0) {
        anunciar(`Cambio de pantalla: ${ev.nombre}. Los rivales salen más fuertes.`);
      }
    }
  }

  // --- Bucle principal --------------------------------------------------------------------------

  /** En el menú el jugador pasea por el campo (sin rivales) para que la pantalla tenga vida. */
  function pasearEnElMenu(dt) {
    const j = mundo.jugador;
    mundo.tiempo += dt;
    j.moviendo = true;
    j.dirX = 1;
    j.dirY = 0;
    j.zona = null;
    // Recto por un pasillo sin obstáculos (el mundo del menú lo deja libre): nunca se queda pillado
    j.vx = 80;
    j.vy = 0;
    j.x += 80 * dt;
    j.y = 0;
    if (j.x > 9000) mundo = nuevoMundo(true);
  }

  function bucle(ahora) {
    raf = requestAnimationFrame(bucle);
    const dt = Math.max(0, Math.min(0.1, (ahora - previo) / 1000)); // el reloj del navegador puede ir un pelo atrasado
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
    } else if (fase === 'hub') {
      pasearEnElMenu(dt);
    }

    actualizarCamara(mundo, dt);
    ctx.setTransform(vista.dpr, 0, 0, vista.dpr, 0, 0);
    // En el menú el jugador se ve más grande
    dibujar(ctx, mundo, fase === 'hub' ? { ...vista, escala: vista.escala * 2.1 } : vista);
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
    const escala = Math.max(0.7, Math.min(1.5, Math.min(ancho, alto) / 540)) * (ZOOM[ajustes.zoom] ?? 1);
    vista = { ancho, alto, escala, dpr };
  }
  const observador = new ResizeObserver(ajustarTamano);
  observador.observe(contenedor);
  ajustarTamano();

  // --- Eventos de la interfaz -------------------------------------------------------------------

  const acciones = {
    jugar: empezar,
    empezar,
    hub: () => irAlHub('hub'),
    vestuario: () => irAlHub('vestuario'),
    entrenamiento: () => irAlHub('entrenamiento'),
    contratar: () => irAlHub('contratar'),
    canjear: canjearFicha,
    desbloquear: desbloquearTodo,
    combos: () => irAlHub('combos'),
    identidad: () => irAlHub('identidad'),
    direccion: () => irAlHub('direccion'),
    ranking: () => irAlHub('ranking'),
    ajustes: () => irAlHub('ajustes'),
    ayuda: () => irAlHub('ayuda'),
    ulti: () => { if (fase === 'jugando') usarUlti(mundo); },
    reiniciar: empezar,
    reanudar,
    salir: alSalir,
    pausa: alternarPausa,
    pantalla: alternarPantallaCompleta,
    ajustesPartida: abrirAjustesPartida,
    cerrarAjustes,
    sonido: () => { audio.alternar(); actualizarBotonSonido(); },
  };

  function alHacerClic(ev) {
    const mejora = ev.target.closest('[data-mejora]');
    if (mejora) {
      elegir(mejora.dataset.mejora);
      return;
    }
    const cara = ev.target.closest('[data-avatar]');
    if (cara) {
      avatarElegido = cara.dataset.avatar;
      q('[data-campo="ident-vista"]').src = avatarUrl(avatarElegido, 96) ?? '';
      contenedor.querySelectorAll('[data-avatar]').forEach((b) => b.setAttribute('aria-pressed', String(b === cara)));
      return;
    }
    const entrenaJugador = ev.target.closest('[data-entrena-jugador]');
    if (entrenaJugador) {
      seleccionEntrena = entrenaJugador.dataset.entrenaJugador;
      pintarEntrenamiento();
      return;
    }
    const entrenarBtn = ev.target.closest('[data-entrenar]');
    if (entrenarBtn) {
      entrenar(entrenarBtn.dataset.entrenar);
      return;
    }
    const tab = ev.target.closest('[data-ranking]');
    if (tab) {
      pestanaRanking = tab.dataset.ranking;
      pintarRanking();
      return;
    }
    const filtro = ev.target.closest('[data-filtro]');
    if (filtro) {
      filtroPos = filtro.dataset.filtro;
      pintarVestuario();
      return;
    }
    const personaje = ev.target.closest('[data-personaje]');
    if (personaje) {
      elegirOpcion('personaje', personaje.dataset.personaje);
      return;
    }
    const entrenador = ev.target.closest('[data-entrenador]');
    if (entrenador) {
      elegirOpcion('entrenador', entrenador.dataset.entrenador);
      return;
    }
    const boton = ev.target.closest('[data-accion]');
    if (boton) acciones[boton.dataset.accion]?.();
  }

  function alPulsarTecla(ev) {
    if (ev.code !== 'Escape' && ev.target?.closest?.('input, textarea, select')) return; // escribiendo el mote
    if (ev.code === 'KeyF' && !ev.repeat && !ev.ctrlKey && !ev.metaKey && fase !== 'hub') {
      alternarPantallaCompleta();
      return;
    }
    if (fase === 'jugando' && (ev.code === 'Space' || ev.code === 'KeyE') && !ev.repeat) {
      ev.preventDefault();
      usarUlti(mundo);
      return;
    }
    if (fase === 'hub' && ev.code === 'Escape' && PANELES_DEL_HUB.has(pantallaActual)) {
      irAlHub('hub');
      return;
    }
    if (fase === 'mejora' && /^Digit[1-3]$/.test(ev.code)) {
      const opcion = mundo.opciones[Number(ev.code.slice(5)) - 1];
      if (opcion) elegir(opcion.id);
    }
  }

  const alCambiarVisibilidad = () => { if (document.hidden && fase === 'jugando') alternarPausa(); };
  const alCerrarPagina = () => { if (partida && !partida.enviada && fase !== 'hub') cerrarPartida({ alCerrarPagina: true }); };
  window.addEventListener('pagehide', alCerrarPagina);

  contenedor.addEventListener('click', alHacerClic);
  q('[data-campo="form-identidad"]').addEventListener('submit', (ev) => { ev.preventDefault(); guardarIdentidad(); });
  contenedor.addEventListener('input', alCambiarAjuste);
  contenedor.addEventListener('change', alCambiarAjuste);
  window.addEventListener('keydown', alPulsarTecla);
  document.addEventListener('visibilitychange', alCambiarVisibilidad);

  lienzo.tabIndex = -1;
  aplicarAjustes();
  pintarBotonPantalla();
  actualizarBotonSonido();
  irAlHub('hub');
  raf = requestAnimationFrame(bucle);
  cargarClub();

  return {
    destruir() {
      if (partida && !partida.enviada && fase !== 'hub') cerrarPartida({ alCerrarPagina: true });
      window.removeEventListener('pagehide', alCerrarPagina);
      cancelAnimationFrame(raf);
      observador.disconnect();
      entrada.destruir();
      hud.destruir();
      contenedor.removeEventListener('click', alHacerClic);
      contenedor.removeEventListener('input', alCambiarAjuste);
      contenedor.removeEventListener('change', alCambiarAjuste);
      window.removeEventListener('keydown', alPulsarTecla);
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      document.removeEventListener('fullscreenchange', alCambiarPantalla);
      ponerEnPartida(false);
      if (document.fullscreenElement) document.exitFullscreen?.();
      contenedor.classList.remove('juego');
      contenedor.replaceChildren();
    },
    irAlMenu: () => irAlHub('hub'),
  };
}
