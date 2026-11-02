// Montaje del juego: pantallas (menú, pausa, mejora, final), bucle principal y conexión entre
// la simulación (mundo.js), el dibujo (render.js), el sonido y la interfaz superpuesta (hud.js).
import {
  MUNDO, CAMARA, PERSONAJES, POSICIONES, ENTRENADORES, ARMAS, PASIVAS, SINERGIAS, ULTRAS, AMBIENTES,
} from './config.js';
import { crearMundo, avanzar, elegirMejora, resumen, usarUlti } from './mundo.js';
import { retratoUrl, aspectoDe, avatarUrl } from './sprites.js';
import { dibujar, actualizarCamara } from './render.js';
import { crearEntrada } from './entrada.js';
import { crearAudio } from './audio.js';
import { intensidadMusica, cercaniaGrada } from './musica.js';
import { distanciaGrada } from './terreno.js';
import { crearHud } from './hud.js';
import { icono } from './iconos.js';
import { formatearTiempo } from './util.js';
import { leerStats, registrarPartida, registrarSinergia } from './marca.js';
import { leerAjustes, guardarAjustes, ZOOM } from './ajustes.js';
import {
  puntosLibres, esInicial, rareza, ESTADISTICAS, ESTADISTICA_NOMBRES, JEFES_POR_FICHA,
} from './club.js';
import {
  CONSEJOS, consejo, letras, bufanda, crearPapelitos, abrirPantalla, cerrarPantalla, pararAnimaciones, escalonar, cambiarTexto, contar,
  salidaAlCampo,
} from './menu-fx.js';
import { animarFirma } from './firma.js';
import { htmlEstadisticas, htmlLogros } from './fin-ui.js';
import { LOGROS, EQUIPACIONES, logrosDePartida, logroDeEquipacion } from './logros.js';
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

  <div class="juego__focos" aria-hidden="true"><i></i><i></i></div>

  <section class="hub" data-pantalla="hub" aria-labelledby="juego-t-hub">
    <h2 id="juego-t-hub" class="sr-only">Menú principal</h2>
    <aside class="panel hub__tiempos" aria-labelledby="juego-t-tiempos">
      <button type="button" class="ficha-fan" data-accion="identidad" data-campo="ficha-fan" aria-label="Tu ficha: mote y avatar"></button>
      <h3 class="panel__titulo">Tu equipo</h3>
        <section class="once" aria-labelledby="juego-t-once">
        <h3 id="juego-t-once" class="once__titulo">Tu equipo para el próximo partido</h3>
        <div class="once__fila">
          <div class="once__parte once__parte--jugador" data-campo="once-jugador"></div>
          <div class="once__parte once__parte--mister" data-campo="once-mister"></div>
        </div>
        <div class="consejo" data-campo="consejo-caja">
          <img class="consejo__cara" data-campo="consejo-cara" alt="" width="40" height="40">
          <p class="consejo__texto"><span><strong data-campo="consejo-quien">El míster:</strong> <span data-campo="consejo"></span></span></p>
          <button type="button" class="consejo__otro" data-accion="consejo" aria-label="Otro consejo del míster" title="Otro consejo">${icono('volver', 18)}</button>
        </div>
      </section>
      <h3 id="juego-t-tiempos" class="panel__titulo">Tus tiempos</h3>
      <p class="club-estado" data-campo="club-estado" hidden></p>
      <div class="hub__marcas" data-campo="tiempos"></div>
      <div class="hub__club" data-campo="club-bloque" hidden>
        <h3 id="juego-t-club" class="panel__titulo">Tu club</h3>
        <ul class="accesos" data-campo="accesos" aria-labelledby="juego-t-club"></ul>
      </div>
    </aside>
    <div class="hub__centro">
      <div class="hub__cabecera" aria-hidden="true">
        <p class="hub__logo"><span class="hub__logo-sup">La Grada</span><strong class="hub__logo-titulo" data-texto="Colchonera">${letras('Colchonera')}</strong><span class="hub__estrellas">★ ★ ★</span></p>
      </div>
      <div class="hub__escenario" data-campo="escenario" aria-hidden="true"></div>
    </div>
    <nav class="panel hub__menu hub__menu--v2" aria-label="Menú del juego">
      <p class="hub__menu-titulo" aria-hidden="true">Menú del partido</p>
      <button type="button" class="menu-item menu-item--jugar" data-accion="jugar" data-enfoque style="--i:0">
        <span class="entrada__talon" aria-hidden="true"></span>
        <span class="entrada__cuerpo"><small class="entrada__sup" aria-hidden="true">Entrada · Fondo Sur</small><strong>Jugar</strong><small>Sal al campo y aguanta</small></span>
      </button>
      <button type="button" class="menu-item menu-item--baldosa" data-accion="vestuario" style="--c:#ff4d63; --i:1">
        ${icono('camiseta', 26)}<span><strong>Vestuario</strong><small>Elige a tu jugador</small></span>
      </button>
      <button type="button" class="menu-item menu-item--baldosa" data-accion="entrenamiento" style="--c:#3ddc97; --i:2">
        ${icono('mas', 26)}<span><strong>Entrenamiento</strong><small>Sube vida, defensa, disparo y suerte</small></span><b class="menu-item__aviso" data-campo="aviso-puntos" hidden></b>
      </button>
      <button type="button" class="menu-item menu-item--baldosa" data-accion="contratar" style="--c:#ffc23d; --i:3">
        ${icono('estrellaLlena', 26)}<span><strong>Contratar</strong><small>Canjea fichas por fichajes</small></span><b class="menu-item__aviso" data-campo="aviso-fichas" hidden></b>
      </button>
      <button type="button" class="menu-item menu-item--baldosa" data-accion="logros" style="--c:#ffd166; --i:4">
        ${icono('trofeo', 26)}<span><strong>Logros</strong><small>Hazañas y datos rojiblancos</small></span><b class="menu-item__aviso" data-campo="aviso-logros" hidden></b>
      </button>
      <button type="button" class="menu-item menu-item--baldosa" data-accion="combos" style="--c:#b784ff; --i:5">
        ${icono('estrella', 26)}<span><strong>Combinaciones</strong><small>Las metas: qué juntar</small></span>
      </button>
      <button type="button" class="menu-item menu-item--baldosa" data-accion="direccion" style="--c:#5cc8ff; --i:6">
        ${icono('pizarra', 26)}<span><strong>Dirección</strong><small>Elige a tu entrenador</small></span>
      </button>
      <button type="button" class="menu-item menu-item--baldosa" data-accion="ranking" style="--c:#4de0e0; --i:7">
        ${icono('trofeo', 26)}<span><strong>Ranking</strong><small>Los mejores de la grada</small></span>
      </button>
      <button type="button" class="menu-item menu-item--baldosa" data-accion="ajustes" style="--c:#aab4d6; --i:8">
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
      <div class="equipaciones">
        <h3 class="combos__subtitulo">Equipación <span class="combos__cuenta" data-campo="equip-cuenta"></span></h3>
        <ul class="equipaciones__lista" data-campo="equipaciones" aria-label="Equipaciones"></ul>
      </div>
      <div class="pantalla__acciones"><button type="button" class="btn btn--primario" data-accion="cerrarAjustes" data-enfoque>${icono('volver', 18)} Listo</button></div>
    </div>
  </section>

  <section class="pantalla" data-pantalla="logros" role="dialog" aria-modal="true" aria-labelledby="juego-t-logros" hidden>
    <div class="pantalla__caja pantalla__caja--ancha pantalla__caja--combos">
      <p class="pantalla__sobretitulo">Logros</p>
      <h2 id="juego-t-logros" class="pantalla__titulo">La vitrina rojiblanca <span class="combos__cuenta" data-campo="logros-cuenta"></span></h2>
      <p class="pantalla__texto">Cada logro esconde un dato de la historia del Atleti, y algunos desbloquean <strong>equipaciones</strong> para el Vestuario.</p>
      <ul class="logros" data-campo="logros"></ul>
      <div class="pantalla__acciones"><button type="button" class="btn btn--primario" data-accion="hub" data-enfoque>${icono('volver', 18)} Volver</button></div>
    </div>
  </section>

  <section class="pantalla" data-pantalla="combos" role="dialog" aria-modal="true" aria-labelledby="juego-t-combos" hidden>
    <div class="pantalla__caja pantalla__caja--ancha pantalla__caja--combos">
      <p class="pantalla__sobretitulo">Combinaciones y ultras</p>
      <h2 id="juego-t-combos" class="pantalla__titulo">Las metas de la grada</h2>
      <p class="pantalla__texto">Sube ciertas habilidades a cierto nivel durante la partida y se activa una <strong>combinación</strong> con un bonus. Junta varias combinaciones y desbloqueas una <strong>ULTRA</strong>. Aquí las tienes todas, con lo que pide cada una.</p>
      <div class="combos__filtros" role="group" aria-label="Filtrar">
        <button type="button" class="filtro" data-filtro-combos="todas" aria-pressed="true">Todas</button>
        <button type="button" class="filtro" data-filtro-combos="posibles" aria-pressed="false" data-campo="filtro-posibles">Con mi jugador</button>
        <button type="button" class="filtro" data-filtro-combos="hechas" aria-pressed="false">Conseguidas</button>
      </div>
      <h3 class="combos__subtitulo">Ultras <span class="combos__cuenta" data-campo="ultras-cuenta"></span></h3>
      <ul class="combos combos--ultras" data-campo="ultras"></ul>
      <h3 class="combos__subtitulo">Combinaciones <span class="combos__cuenta" data-campo="combos-cuenta"></span></h3>
      <ul class="combos" data-campo="combos"></ul>
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
    <div class="pantalla__caja pantalla__caja--ajustes">
      <p class="pantalla__sobretitulo">Ajustes</p>
      <h2 id="juego-t-aj" class="pantalla__titulo">Sonido, gráficos y controles</h2>
      <fieldset class="ajustes__grupo">
        <legend>Sonido</legend>
        <label class="ajuste"><span>Efectos</span><input type="range" min="0" max="100" step="5" data-ajuste="volumen"><output data-campo="volumen-valor"></output></label>
        <label class="ajuste"><span>Música y grada</span><input type="range" min="0" max="100" step="5" data-ajuste="musica"><output data-campo="musica-valor"></output></label>
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
      <div class="pantalla__acciones"><button type="button" class="btn btn--primario" data-accion="cerrarAjustes" data-enfoque>${icono('volver', 18)} Listo</button></div>
    </div>
  </section>

  <section class="pantalla" data-pantalla="ayuda" role="dialog" aria-modal="true" aria-labelledby="juego-t-ayuda" hidden>
    <div class="pantalla__caja pantalla__caja--ayuda">
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
    <div class="pantalla__caja pantalla__caja--pausa">
      <div class="pausa__lado">
        <p class="pantalla__sobretitulo">Descanso</p>
        <h2 id="juego-t-pausa" class="pantalla__titulo">Partido en pausa</h2>
        <dl class="pausa__datos" data-campo="pausa-datos"></dl>
        <div class="pantalla__acciones pantalla__acciones--columna" data-campo="pausa-botones">
          <button type="button" class="btn btn--primario" data-accion="reanudar" data-enfoque>${icono('jugar', 18)} Seguir jugando</button>
          <button type="button" class="btn btn--secundario" data-accion="ajustesPartida">${icono('ajustes', 18)} Ajustes</button>
          <button type="button" class="btn btn--secundario" data-accion="reiniciar">Empezar de nuevo</button>
          <button type="button" class="btn btn--fantasma" data-accion="pedirSalir">${icono('volver', 18)} Volver al menú</button>
        </div>
        <div class="pausa__confirmar" data-campo="pausa-confirmar" role="alertdialog" aria-labelledby="juego-t-salir" aria-describedby="juego-d-salir" hidden>
          <h3 id="juego-t-salir">¿Seguro que quieres salir del partido?</h3>
          <p id="juego-d-salir">La partida no se puede retomar, pero <strong>lo que llevas conseguido se guarda</strong>: el tiempo para tu marca y el ranking, los rivales eliminados y los jefes vencidos (puntos de entrenamiento y fichas) y los logros.</p>
          <div class="pantalla__acciones">
            <button type="button" class="btn btn--primario" data-accion="hub">Sí, salir y guardar</button>
            <button type="button" class="btn btn--secundario" data-accion="cancelarSalir">Seguir jugando</button>
          </div>
        </div>
      </div>
      <div class="pausa__arbol" data-campo="pausa-arbol" aria-label="Tus habilidades y combinaciones en esta partida"></div>
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
    <div class="pantalla__caja pantalla__caja--ancha pantalla__caja--fin">
      <p class="pantalla__sobretitulo">Final del partido</p>
      <h2 id="juego-t-fin" class="pantalla__titulo">Te han eliminado</h2>
      <p class="insignia" data-campo="record" hidden>Nueva mejor marca</p>
      <div class="fin" data-campo="resultado"></div>
      <div class="recompensas__caja" data-campo="recompensas" aria-live="polite"></div>
      <div class="pantalla__acciones">
        <button type="button" class="btn btn--primario" data-accion="reiniciar" data-enfoque>Jugar otra vez</button>
        <button type="button" class="btn btn--secundario" data-accion="vestuario">Vestuario</button>
        <button type="button" class="btn btn--fantasma" data-accion="hub">Menú</button>
      </div>
    </div>
  </section>

  <div class="salida" data-campo="salida" aria-hidden="true" hidden>
    <div class="salida__franjas">${Array.from({ length: 9 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
    <div class="salida__cartel"><span class="salida__quien" data-campo="salida-quien"></span><strong>¡Saltan al campo!</strong></div>
  </div>

  <p class="sr-only" data-campo="anuncio" role="status" aria-live="polite"></p>
`;

// Listas cuyas tarjetas entran escalonadas al abrir una pantalla del menú
const TARJETAS = [
  '.tarjetas > li', '.logros > li', '.combos > li', '.plantilla > li', '.equipaciones__lista > li', '.identidad__caras > li',
  '.entrena__lista > li', '.ranking > li', '.rareza-tarjetas > li', '.instrucciones > li', '.ajustes__grupo', '.vest__filtros > .filtro',
  '.detalle__cabecera', '.contrato__ficha', '.resultado--fin > div', '.danos > li', '.recompensas > li',
].join(', ');

const PANTALLAS = ['hub', 'identidad', 'logros', 'vestuario', 'entrenamiento', 'contratar', 'combos', 'direccion', 'ranking', 'ajustes', 'ayuda', 'pausa', 'mejora', 'fin'];
const PANELES_DEL_HUB = new Set(['identidad', 'logros', 'vestuario', 'entrenamiento', 'contratar', 'combos', 'direccion', 'ranking', 'ajustes', 'ayuda']);

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
  const consultaMovimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reducirMovimiento = consultaMovimiento?.matches ?? false;
  /** Se mira cada vez (el sistema puede cambiarlo con el juego abierto). */
  const movimientoReducido = () => consultaMovimiento?.matches ?? false;
  let ajustes = leerAjustes();
  if (reducirMovimiento && localStorage.getItem('grada.ajustes') === null) ajustes.efectos = false;

  const CLAVE_ELECCION = 'grada.eleccion';
  let eleccion = { personaje: 'koke', entrenador: 'cholo' };
  try {
    const guardada = JSON.parse(localStorage.getItem(CLAVE_ELECCION));
    if (PERSONAJES[guardada?.personaje]) eleccion.personaje = guardada.personaje;
    if (ENTRENADORES[guardada?.entrenador]) eleccion.entrenador = guardada.entrenador;
    if (EQUIPACIONES[guardada?.equipacion]) eleccion.equipacion = guardada.equipacion;
  } catch { /* sin almacenamiento: se usa la elección por defecto */ }

  // --- El club (se guarda en el servidor, ligado a tu cuenta) -------------------------------------
  let club = null; // { jugadores, fichas, jefesTotal, ... } tal como lo devuelve el servidor
  let estadoClub = servidor ? 'cargando' : 'libre'; // cargando | listo | error | libre (sin servidor: todo desbloqueado, no se guarda nada)
  let previa = null; // jugador cuya ficha se está viendo en el vestuario (aunque no se tenga)
  let seleccionEntrena = null;
  let pestanaRanking = 'grada';
  let partida = null; // { id, enviada } de la partida en curso
  let ocupado = false; // hay una petición del club en marcha
  let marcaGrada = null; // tu mejor partida guardada en el servidor: { tiempo, puesto }
  let destruido = false;


  /** `paraMenu`: el mundo del menú tiene un pasillo libre de obstáculos por el que pasea el muñeco. */
  /** Equipación elegida, si la tienes desbloqueada (si no, la primera). */
  const equipacionValida = () => (eleccion.equipacion && (!club || club.equipaciones?.includes(eleccion.equipacion)) ? eleccion.equipacion : 'primera');
  const nuevoMundo = (paraMenu = false) => {
    const entrenamiento = club?.jugadores[eleccion.personaje]?.stats ?? null; // lo entrenado en el club se nota en el campo
    const m = crearMundo({
      efectosReducidos: !ajustes.efectos, ...eleccion, equipacion: equipacionValida(), pasilloMenu: paraMenu, entrenamiento,
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
    apunta('aviso-logros', club ? Object.keys(club.logros ?? {}).filter((k) => !logrosVistos.has(k)).length : 0);
    pintarAccesos();
  }

  /** Tu club de un vistazo: plantilla, logros, equipaciones y la próxima ficha, con acceso directo a cada pantalla. */
  function pintarAccesos() {
    const bloque = q('[data-campo="club-bloque"]');
    if (estadoClub !== 'listo' || !club) { bloque.hidden = true; return; }
    bloque.hidden = false;
    const total = club.totalJugadores ?? Object.keys(PERSONAJES).length;
    const fichados = Object.keys(club.jugadores).length;
    const logros = Object.keys(club.logros ?? {}).length;
    const totalLogros = Object.keys(LOGROS).length;
    const equipaciones = (club.equipaciones ?? ['primera']).length;
    const totalEquip = Object.keys(EQUIPACIONES).length;
    const faltan = club.siguienteFichaEn ?? JEFES_POR_FICHA;
    const fichas = club.fichas ?? 0;
    const accesos = [
      {
        accion: 'vestuario', icono: 'balon', valor: `${fichados}/${total}`, texto: 'Plantilla', fraccion: fichados / total,
        etiqueta: `Plantilla: ${fichados} de ${total} jugadores. Abrir el Vestuario`,
      },
      {
        accion: 'logros', icono: 'trofeo', valor: `${logros}/${totalLogros}`, texto: 'Logros', fraccion: logros / totalLogros,
        etiqueta: `Logros: ${logros} de ${totalLogros}. Abrir la vitrina`,
      },
      {
        accion: 'vestuario', icono: 'camiseta', valor: `${equipaciones}/${totalEquip}`, texto: 'Equipaciones', fraccion: equipaciones / totalEquip,
        etiqueta: `Equipaciones: ${equipaciones} de ${totalEquip}. Abrir el Vestuario`,
      },
      fichas > 0
        ? {
          accion: 'contratar', icono: 'estrellaLlena', valor: String(fichas), texto: fichas === 1 ? 'Ficha lista' : 'Fichas listas', fraccion: 1, destacado: true,
          etiqueta: `${fichas} ${fichas === 1 ? 'ficha de contrato lista' : 'fichas de contrato listas'}. Ir a Contratar`,
        }
        : {
          accion: 'contratar', icono: 'estrella', valor: `${JEFES_POR_FICHA - faltan}/${JEFES_POR_FICHA}`, texto: 'Próxima ficha', fraccion: (JEFES_POR_FICHA - faltan) / JEFES_POR_FICHA,
          etiqueta: `Próxima ficha de contrato: te ${faltan === 1 ? 'falta 1 jefe' : `faltan ${faltan} jefes`}. Ir a Contratar`,
        },
    ];
    q('[data-campo="accesos"]').innerHTML = accesos.map((a) => `<li><button type="button" class="acceso${a.destacado ? ' acceso--destacado' : ''}" data-accion="${a.accion}" aria-label="${esc(a.etiqueta)}">
        <span class="acceso__icono">${icono(a.icono, 18)}</span>
        <span class="acceso__texto"><strong>${esc(a.valor)}</strong><small>${esc(a.texto)}</small></span>
        <span class="acceso__barra"><span style="width:${Math.round(Math.max(0, Math.min(1, a.fraccion)) * 100)}%"></span></span>
      </button></li>`).join('');
  }

  // --- Logros y equipaciones ---------------------------------------------------------------------

  const CLAVE_LOGROS_VISTOS = 'grada.logrosVistos';
  let logrosVistos = new Set();
  try { logrosVistos = new Set(JSON.parse(localStorage.getItem(CLAVE_LOGROS_VISTOS)) ?? []); } catch { /* sin almacenamiento */ }
  let logrosAvisados = new Set(); // los ya anunciados en esta partida
  let proximaRevisionLogros = 0;

  /** Durante la partida, avisa en cuanto consigues un logro que aún no tenías (se guarda al terminar). */
  function vigilarLogros() {
    if (!club || mundo.tiempo < proximaRevisionLogros) return;
    proximaRevisionLogros = mundo.tiempo + 1;
    const r = { ...resumen(mundo), muerto: false };
    for (const k of logrosDePartida(r)) {
      if (club.logros?.[k] || logrosAvisados.has(k)) continue;
      logrosAvisados.add(k);
      hud.aviso(`🏆 Logro: ${LOGROS[k].nombre}`, 'exito');
      audio.reproducir('logro');
      anunciar(`Logro conseguido: ${LOGROS[k].nombre}. ${LOGROS[k].dato}`);
    }
  }

  function pintarLogros() {
    const { cuenta, html } = htmlLogros(club?.logros ?? {});
    q('[data-campo="logros-cuenta"]').textContent = cuenta;
    q('[data-campo="logros"]').innerHTML = html;
    Object.keys(club?.logros ?? {}).forEach((k) => logrosVistos.add(k));
    try { localStorage.setItem(CLAVE_LOGROS_VISTOS, JSON.stringify([...logrosVistos])); } catch { /* da igual */ }
    pintarAvisosClub();
  }

  /** Equipaciones del Vestuario: las desbloqueadas se pueden elegir; las demás dicen qué logro piden. */
  function pintarEquipaciones() {
    const tengo = new Set(club?.equipaciones ?? ['primera']);
    const elegida = equipacionValida();
    const yo = PERSONAJES[eleccion.personaje];
    q('[data-campo="equip-cuenta"]').textContent = `${tengo.size} de ${Object.keys(EQUIPACIONES).length}`;
    q('[data-campo="equipaciones"]').innerHTML = Object.entries(EQUIPACIONES).map(([k, e]) => {
      const libre = tengo.has(k);
      const aspecto = e.kit ? { ...yo.aspecto, camiseta: { ...e.kit.camiseta }, pantalon: e.kit.pantalon, medias: e.kit.medias } : yo.aspecto;
      const logro = logroDeEquipacion(k);
      return `<li><button type="button" class="equipacion${libre ? '' : ' equipacion--bloqueada'}" data-equipacion="${k}" aria-pressed="${elegida === k}" ${libre ? '' : 'aria-disabled="true"'}
        title="${esc(libre ? e.descripcion : `Se desbloquea con el logro «${LOGROS[logro]?.nombre ?? ''}»: ${LOGROS[logro]?.como ?? ''}`)}">
        <img src="${retratoUrl(`eq:${eleccion.personaje}:${k}`, aspecto, 4)}" alt="" width="32" height="40">
        <span>${esc(e.nombre)}</span>${libre ? '' : `<small>${icono('candado', 12)} ${esc(LOGROS[logro]?.nombre ?? '')}</small>`}
      </button></li>`;
    }).join('');
  }

  const entrada = crearEntrada(contenedor, { alPausar: alternarPausa, activo: () => fase === 'jugando' });

  // --- Ajustes ----------------------------------------------------------------------------------

  function aplicarAjustes() {
    audio.volumen = ajustes.volumen / 100;
    audio.volumenMusica = ajustes.musica / 100;
    entrada.ponerJoystick(ajustes.joystick);
    mundo.efectosReducidos = !ajustes.efectos;
    mundo.sinNumeros = !ajustes.numeros;
    ajustarTamano();
  }

  function pintarAjustes() {
    q('[data-ajuste="volumen"]').value = String(ajustes.volumen);
    q('[data-campo="volumen-valor"]').textContent = `${ajustes.volumen} %`;
    q('[data-ajuste="musica"]').value = String(ajustes.musica);
    q('[data-campo="musica-valor"]').textContent = `${ajustes.musica} %`;
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
    q('[data-campo="musica-valor"]').textContent = `${ajustes.musica} %`;
    if (clave === 'volumen') { audio.activar(); audio.reproducir('gema'); }
    if (clave === 'musica') audio.activar();
  }

  // --- Pantallas ------------------------------------------------------------------------------

  let volverFoco = null; // botón del menú que abrió una pantalla: al volver, el foco regresa a él

  /**
   * Enseña una pantalla (o ninguna, `null`, durante la partida). En el menú hay transición: la pantalla nueva
   * entra fundiéndose y subiendo, la anterior se funde al salir y el menú se queda debajo hasta que la tapa.
   * Durante la partida (pausa, mejora, fin) el cambio es inmediato, como siempre.
   */
  function mostrar(nombre) {
    const anterior = pantallaActual;
    pantallaActual = nombre;
    contenedor.classList.toggle('juego--en-hub', nombre === 'hub');
    const conTransicion = fase === 'hub' && nombre !== null && anterior !== nombre;
    const reducido = movimientoReducido();
    if (anterior === 'hub' && nombre && nombre !== 'hub' && pantallas.hub.contains(document.activeElement)) volverFoco = document.activeElement;
    let entrada = null;
    if (nombre) {
      const nodo = pantallas[nombre];
      pararAnimaciones(nodo);
      nodo.inert = false;
      nodo.hidden = false;
      if (conTransicion && nombre !== 'hub') {
        entrada = abrirPantalla(nodo, { reducido });
        escalonar(nodo.querySelectorAll(TARJETAS), { reducido });
      }
    }
    Object.entries(pantallas).forEach(([clave, nodo]) => {
      if (clave === nombre || nodo.hidden) return;
      if (!conTransicion || clave !== anterior) { nodo.hidden = true; return; }
      nodo.inert = true; // mientras se va, ya no se puede usar
      const fuera = clave === 'hub' ? (entrada ?? Promise.resolve()) : cerrarPantalla(nodo, { reducido });
      fuera.then(() => {
        if (pantallaActual === clave) return; // ha vuelto a mostrarse mientras tanto
        nodo.hidden = true;
        pararAnimaciones(nodo);
      });
    });
    if (nombre) {
      requestAnimationFrame(() => {
        const nodo = pantallas[nombre];
        const vuelta = nombre === 'hub' && volverFoco?.isConnected && nodo.contains(volverFoco) ? volverFoco : null;
        if (nombre === 'hub') volverFoco = null;
        // En las pantallas del menú el foco va a su botón principal sin desplazarlas: se empiezan a leer desde arriba
        const enMenu = fase === 'hub' && nombre !== 'hub';
        (vuelta || nodo.querySelector('[data-enfoque]') || nodo.querySelector('button'))?.focus({ preventScroll: enMenu });
        if (enMenu) nodo.scrollTop = 0;
      });
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

  /** Tus tiempos: la mejor marca (la de este navegador o la guardada en el servidor) y tus estadísticas. */
  function pintarTiempos({ contarMarca = false } = {}) {
    const st = leerStats(usuario);
    const caja = q('[data-campo="tiempos"]');
    const mejor = Math.max(st.mejorTiempo || 0, marcaGrada?.tiempo || 0);
    if (!st.partidas && !mejor) {
      caja.innerHTML = '<p class="panel__vacio">Aún no has jugado ninguna partida. ¡Estrena la grada!</p>';
      return;
    }
    const numero = (n) => n.toLocaleString('es-ES');
    const puesto = marcaGrada?.puesto;
    caja.innerHTML = `
      <p class="tiempo-grande"><span>Tu mejor marca</span>
        <strong><span aria-hidden="true" data-campo="marca-cifra">${formatearTiempo(mejor)}</span><span class="sr-only">${formatearTiempo(mejor)}</span></strong>
        ${puesto ? `<small class="tiempo-grande__puesto">${icono('trofeo', 14)} Puesto ${puesto} en la grada</small>` : ''}</p>
      ${st.partidas ? `<dl class="datos">
        <div><dt>Oleada máxima</dt><dd>${st.mejorOleada}</dd></div>
        <div><dt>Nivel máximo</dt><dd>${st.mejorNivel}</dd></div>
        <div><dt>Partidas</dt><dd>${numero(st.partidas)}</dd></div>
        <div><dt>Rivales derrotados</dt><dd>${numero(st.bajas)}</dd></div>
        <div><dt>Jefes derrotados</dt><dd>${numero(st.jefes)}</dd></div>
      </dl>
      ${st.ultimas.length ? `<h4 class="panel__subtitulo">Últimas partidas</h4><ol class="lista-partidas">${st.ultimas.slice(0, 4).map((f) => `<li>${textoPartida(f)}</li>`).join('')}</ol>` : ''}`
    : '<p class="panel__vacio panel__vacio--suave">El resto de tus estadísticas se apuntan en este navegador cuando juegas.</p>'}`;
    if (contarMarca) contar(q('[data-campo="marca-cifra"]'), mejor, formatearTiempo, { reducido: movimientoReducido() });
  }

  /** Tu mejor partida en el ranking de la grada (para enseñar tu marca y tu puesto aunque juegues en otro navegador). */
  async function cargarMarcaGrada() {
    if (!servidor?.ranking) return;
    try {
      const datos = await servidor.ranking();
      const tuya = datos?.filas?.find((f) => f.esTuyo);
      const antes = marcaGrada?.tiempo ?? 0;
      marcaGrada = datos?.tuMejor ? { tiempo: datos.tuMejor.tiempo, puesto: tuya?.posicion ?? null } : null;
      // Si la marca es nueva para este menú, la cifra cuenta hacia arriba
      if (fase === 'hub' && !destruido) pintarTiempos({ contarMarca: (marcaGrada?.tiempo ?? 0) > Math.max(antes, leerStats(usuario).mejorTiempo || 0) });
    } catch { /* sin conexión: solo se ven los datos de este navegador */ }
  }

  /** Tu equipo en el menú: el jugador (con su equipación, posición, rareza y estadísticas) y el míster con su ulti. */
  function pintarCartelJugador() {
    const clave = eleccion.personaje;
    const p = PERSONAJES[clave];
    const e = ENTRENADORES[eleccion.entrenador];
    const st = estadisticasDe(clave);
    const entrenado = club?.jugadores[clave]?.stats;
    const equipacion = equipacionValida();
    const kit = EQUIPACIONES[equipacion]?.kit;
    const aspecto = kit ? { ...p.aspecto, camiseta: { ...kit.camiseta }, pantalon: kit.pantalon, medias: kit.medias } : p.aspecto;
    q('[data-campo="once-jugador"]').innerHTML = `
      <img class="once__retrato" alt="" width="80" height="100" src="${retratoUrl(`eq:${clave}:${equipacion}`, aspecto)}">
      <div class="once__datos">
        <p class="once__rol">Tu jugador</p>
        <p class="once__nombre">${esc(p.nombre)}</p>
        <p class="once__pos">${POSICIONES[p.posicion].nombre} ${htmlRareza(clave)}</p>
        <div class="once__stats">
          ${barraEstadistica('Vida', st.vida / 190, st.vida)}
          ${barraEstadistica('Velocidad', st.vel / 195, st.vel)}
          ${barraEstadistica('Cuerpo', st.cuerpo / 1.5, `x${st.cuerpo}`)}
          ${barraEstadistica('Disparo', st.disparo / 1.5, st.disparo ? `x${st.disparo}` : 'No')}
        </div>
        ${entrenado ? `<p class="once__entreno"><span>Entrenado</span>${ESTADISTICAS.map((k) => `<span class="once__chip" title="${ESTADISTICA_NOMBRES[k].nombre}">${icono(ESTADISTICA_NOMBRES[k].icono, 13)}<span class="sr-only">${ESTADISTICA_NOMBRES[k].nombre}</span> ${entrenado[k]}</span>`).join('')}</p>` : ''}
      </div>
      <button type="button" class="once__cambiar" data-accion="vestuario">Cambiar<span class="sr-only"> de jugador en el Vestuario</span></button>`;
    q('[data-campo="once-mister"]').innerHTML = `
      <img class="once__retrato once__retrato--mister" alt="" width="64" height="80" src="${retratoUrl(`c:${eleccion.entrenador}`, aspectoDe('entrenador', eleccion.entrenador))}">
      <div class="once__datos">
        <p class="once__rol">Tu míster</p>
        <p class="once__nombre">${esc(e.nombre)}</p>
        <p class="once__resumen">${esc(e.resumen)}</p>
        <p class="once__ulti">${icono('rayo', 14)}<span><b>Ulti:</b> ${esc(e.ulti.nombre)}</span></p>
        <p class="once__ulti-texto">${esc(e.ulti.descripcion)}</p>
      </div>
      <button type="button" class="once__cambiar" data-accion="direccion">Cambiar<span class="sr-only"> de entrenador en Dirección</span></button>`;
    q('[data-campo="consejo-cara"]').src = avatarUrl(`e:${eleccion.entrenador}`, 40) ?? '';
    q('[data-campo="consejo-quien"]').textContent = `${e.apodo ?? e.nombre}:`;
    ponerConsejo();
  }

  // --- Consejo del míster: rota solo cada pocos segundos (se para con el ratón encima o el foco dentro) ---
  let numConsejo = Math.floor(Math.random() * CONSEJOS.length);
  let consejoQuieto = false;
  const textoConsejo = () => `«${consejo(numConsejo, eleccion.entrenador)}»`;
  function ponerConsejo({ animado = false } = {}) {
    const el = q('[data-campo="consejo"]');
    if (animado && !movimientoReducido()) cambiarTexto(el, textoConsejo());
    else el.textContent = textoConsejo();
  }
  function otroConsejo() {
    numConsejo += 1;
    ponerConsejo({ animado: true });
    anunciar(`${ENTRENADORES[eleccion.entrenador].apodo ?? 'El míster'}: ${consejo(numConsejo, eleccion.entrenador)}`);
  }
  const relojConsejos = setInterval(() => {
    if (fase !== 'hub' || pantallaActual !== 'hub' || document.hidden || consejoQuieto) return;
    numConsejo += 1;
    ponerConsejo({ animado: true });
  }, 9000);
  const cajaConsejo = q('[data-campo="consejo-caja"]');
  const quieto = (si) => () => { consejoQuieto = si; };
  cajaConsejo.addEventListener('pointerenter', quieto(true));
  cajaConsejo.addEventListener('pointerleave', quieto(false));
  cajaConsejo.addEventListener('focusin', quieto(true));
  cajaConsejo.addEventListener('focusout', quieto(false));

  async function pintarRanking() {
    const caja = q('[data-campo="mejores"]');
    contenedor.querySelectorAll('[data-ranking]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ranking === pestanaRanking)));
    if (pestanaRanking === 'grada' && servidor) {
      caja.innerHTML = '<p class="panel__vacio">Cargando la clasificación…</p>';
      try {
        const datos = await servidor.ranking();
        if (pestanaRanking === 'grada' && pantallaActual === 'ranking') {
          caja.innerHTML = htmlRankingGrada(datos, (a) => avatarUrl(a, 40));
          escalonar(caja.querySelectorAll('.ranking > li'), { reducido: movimientoReducido(), retraso: 0, paso: 30 });
        }
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
    pintarEquipaciones();
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
      (r.logrosNuevos ?? []).forEach((k) => setTimeout(() => anunciar(`Logro conseguido: ${LOGROS[k]?.nombre}`), 5200));
      audio.reproducir('sinergia');
    } catch (error) {
      anunciar(error.message || 'No se ha podido contratar');
    } finally {
      ocupado = false;
      pintarContratar();
    }
    if (fichado) {
      anunciar(`Firmando el contrato de ${PERSONAJES[fichado].nombre}…`);
      // La firma del contrato (unos 5 s; se puede saltar) y después la carta del fichaje
      ocupado = true;
      await animarFirma(contenedor, {
        nombre: PERSONAJES[fichado].nombre,
        aspecto: aspectoDe('personaje', fichado),
        rareza: rareza(fichado),
        posicion: POSICIONES[PERSONAJES[fichado].posicion].nombre,
      });
      ocupado = false;
      audio.reproducir('ultra');
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

  let filtroCombos = 'todas';

  /** ¿Puede tu jugador conseguir esta combinación? (tiene sus habilidades y, si es portero, no pide disparos) */
  function combinacionPosible(yo, c) {
    if (c.distintas) return yo.habilidades.length >= c.distintas.cuantas;
    return Object.keys(c.requiere).every((x) => !ARMAS[x] || (yo.habilidades.includes(x) && !(yo.posicion === 'portero' && ARMAS[x].tipo === 'disparo')));
  }

  /** Requisito como «chip»: icono, nombre y nivel; en verde si tu jugador puede aprenderlo. */
  function chipRequisito(yo, clave, nivel) {
    const def = ARMAS[clave] ?? PASIVAS[clave];
    const tuyo = !ARMAS[clave] || (yo.habilidades.includes(clave) && !(yo.posicion === 'portero' && ARMAS[clave].tipo === 'disparo'));
    return `<span class="req${tuyo ? ' req--tuyo' : ' req--no'}" title="${tuyo ? 'La puede aprender' : 'No la puede aprender'} ${esc(yo.nombre)}">${icono(def?.icono ?? 'mas', 14)}${esc(def?.nombre ?? clave)} <b>nv ${nivel}</b></span>`;
  }

  /** Panel de combinaciones: todas a la vista, con lo que piden, lo que dan y si tu jugador puede conseguirlas. */
  function pintarCombos() {
    const st = leerStats(usuario);
    const hechas = new Set(st.sinergias);
    const yo = PERSONAJES[eleccion.personaje];
    const claves = Object.keys(SINERGIAS);
    q('[data-campo="filtro-posibles"]').textContent = `Con ${yo.nombre}`;
    contenedor.querySelectorAll('[data-filtro-combos]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filtroCombos === filtroCombos)));
    q('[data-campo="combos-cuenta"]').textContent = `${claves.filter((k) => hechas.has(k)).length} de ${claves.length} conseguidas`;
    const visibles = claves.filter((k) => (filtroCombos === 'hechas' ? hechas.has(k) : filtroCombos === 'posibles' ? combinacionPosible(yo, SINERGIAS[k]) : true));
    q('[data-campo="combos"]').innerHTML = visibles.map((k) => {
      const c = SINERGIAS[k];
      const conocida = hechas.has(k);
      const posible = combinacionPosible(yo, c);
      const requisitos = c.distintas
        ? `<span class="req req--tuyo">${c.distintas.cuantas} habilidades distintas <b>nv ${c.distintas.nivel}</b></span>`
        : Object.entries(c.requiere).map(([x, n]) => chipRequisito(yo, x, n)).join('');
      const ultras = Object.values(ULTRAS).filter((u) => u.de.includes(k)).map((u) => u.nombre);
      return `<li class="combo${conocida ? ' combo--hecha' : ''}${posible ? '' : ' combo--imposible'}">
        <span class="combo__icono">${icono(c.icono, 22)}</span>
        <span class="combo__cuerpo">
          <span class="combo__cabeza"><strong>${esc(c.nombre)}</strong><em class="combo__estado">${conocida ? '★ Conseguida' : posible ? 'Posible' : 'No para él'}</em></span>
          <span class="combo__bonus">${esc(c.descripcion)}</span>
          <span class="combo__reqs">${requisitos}</span>
          ${ultras.length ? `<small class="combo__ultras">Cuenta para: ${ultras.map(esc).join(' · ')}</small>` : ''}
        </span>
      </li>`;
    }).join('') || '<li class="panel__vacio">No hay ninguna con este filtro todavía.</li>';
  }

  /** Las seis ULTRAS: poderes de leyenda que se consiguen juntando varias combinaciones. */
  function pintarUltras() {
    const st = leerStats(usuario);
    const hechas = new Set(st.sinergias);
    const yo = PERSONAJES[eleccion.personaje];
    const claves = Object.keys(ULTRAS);
    q('[data-campo="ultras-cuenta"]').textContent = `${claves.filter((k) => hechas.has(`u:${k}`)).length} de ${claves.length} conseguidas`;
    const visibles = claves.filter((k) => {
      const u = ULTRAS[k];
      const alcanzable = u.de.filter((c) => combinacionPosible(yo, SINERGIAS[c])).length >= u.cuantas;
      return filtroCombos === 'hechas' ? hechas.has(`u:${k}`) : filtroCombos === 'posibles' ? alcanzable : true;
    });
    q('[data-campo="ultras"]').innerHTML = visibles.map((k) => {
      const u = ULTRAS[k];
      const conocida = hechas.has(`u:${k}`);
      const posibles = u.de.filter((c) => combinacionPosible(yo, SINERGIAS[c]));
      const alcanzable = posibles.length >= u.cuantas;
      const chips = u.de.map((c) => `<span class="req${hechas.has(c) ? ' req--hecha' : posibles.includes(c) ? ' req--tuyo' : ' req--no'}">${icono(SINERGIAS[c].icono, 14)}${esc(SINERGIAS[c].nombre)}</span>`).join('');
      return `<li class="combo combo--ultra${conocida ? ' combo--hecha' : ''}${alcanzable ? '' : ' combo--imposible'}" style="--color-ultra:${u.color}">
        <span class="combo__icono">${icono(u.icono, 26)}</span>
        <span class="combo__cuerpo">
          <span class="combo__cabeza"><strong>${esc(u.nombre)}</strong><em class="combo__estado">${conocida ? '✦ Conseguida' : alcanzable ? `Posible con ${esc(yo.nombre)}` : `No para ${esc(yo.nombre)}`}</em></span>
          <small class="combo__titulo">${esc(u.titulo)}</small>
          <span class="combo__bonus">${esc(u.descripcion)}</span>
          <span class="combo__pide">Junta <b>${u.cuantas}</b> de estas${u.minArmas ? ` (al menos ${u.minArmas} con armas)` : ''} y suma <b>${u.maestria}</b> niveles de armas:</span>
          <span class="combo__reqs">${chips}</span>
        </span>
      </li>`;
    }).join('') || '<li class="panel__vacio">Ninguna con este filtro todavía.</li>';
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
    const r = { ...resumen(mundo), muerto: mundo.estado === 'fin' };
    const datos = {
      tiempo: Math.floor(r.tiempo), nivel: r.nivel, jefes: r.jefes, bajas: r.bajas, logros: logrosDePartida(r),
    };
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

  // --- Efectos del menú: papelitos, estreno del menú y posición del muñeco -----------------------

  const papelitos = crearPapelitos();
  /** Los papelitos van con el ajuste de partículas y se quitan si el sistema pide menos movimiento. */
  const efectosMenu = () => ajustes.efectos && !movimientoReducido();
  let estrenado = false; // la primera vez (y al volver de un partido) el menú entra con todo

  /** Dos cañones de papelitos desde las esquinas de abajo. */
  function lanzarPapelitos() {
    const { ancho, alto } = vista;
    const fuerza = Math.sqrt(2 * 640 * alto * 0.55) / Math.sin(Math.PI / 3);
    papelitos.rafaga(0, alto, 28, -Math.PI / 3, 0.28, fuerza);
    papelitos.rafaga(ancho, alto, 28, (-2 * Math.PI) / 3, 0.28, fuerza);
  }

  // El muñeco del menú se coloca en el hueco del escenario (centro del hub en el ordenador, bajo el título en el móvil)
  let escenario = { dx: 0, dy: 0 };
  function medirEscenario() {
    const hueco = q('[data-campo="escenario"]');
    if (!hueco || pantallas.hub.hidden) return;
    const r = hueco.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const c = contenedor.getBoundingClientRect();
    // El punto de la cámara son los pies del muñeco: se dejan cerca de la base del hueco para que se vea entero
    escenario = { dx: r.left + r.width / 2 - (c.left + c.width / 2), dy: r.top + r.height * 0.8 - (c.top + c.height / 2) };
  }
  const observadorEscenario = new ResizeObserver(medirEscenario);
  observadorEscenario.observe(q('[data-campo="escenario"]'));
  pantallas.hub.addEventListener('scroll', medirEscenario, { passive: true });

  function irAlHub(panel = 'hub') {
    ponerEnPartida(false);
    let vuelveDelCampo = false;
    if (fase !== 'hub') {
      if (fase !== 'fin') cerrarPartida(); // abandonar la partida también cuenta: los jefes vencidos ya son tuyos
      fase = 'hub';
      zonaHud.hidden = true;
      mundo = nuevoMundo(true);
      entrada.soltarTodo();
      vuelveDelCampo = true;
    }
    if (panel === 'hub') {
      const estreno = !estrenado || vuelveDelCampo;
      estrenado = true;
      // Con la clase, el título cae letra a letra y el menú entra más despacio; sin ella, solo un repaso rápido
      pantallas.hub.classList.toggle('hub--estreno', estreno);
      previa = null;
      pintarFichaFan();
      pintarTiempos({ contarMarca: estreno });
      pintarCartelJugador();
      pintarAvisosClub();
      if (estreno && efectosMenu()) lanzarPapelitos();
      requestAnimationFrame(medirEscenario);
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
    else if (panel === 'logros') pintarLogros();
    mostrar(panel);
  }

  let salida = null; // cortinilla de «¡Saltan al campo!» en marcha

  /**
   * Empieza una partida. Desde el menú (`conEntrada`) primero sale la cortinilla rojiblanca: dura un segundo,
   * se salta con un clic o una tecla y se aprovecha para pedir la partida al servidor a la vez.
   */
  async function empezar({ conEntrada = false } = {}) {
    if (ocupado || salida) return;
    if (fase === 'jugando' || fase === 'pausa' || fase === 'mejora') await cerrarPartida();
    audio.activar();
    partida = null;
    logrosAvisados = new Set();
    proximaRevisionLogros = 0;
    entrada.soltarTodo(); // lo que pulses durante la cortinilla ya cuenta para la partida
    if (conEntrada && fase === 'hub') {
      const quien = `${PERSONAJES[eleccion.personaje].nombre} · con ${ENTRENADORES[eleccion.entrenador].nombre}`;
      q('[data-campo="salida-quien"]').textContent = quien;
      pantallas.hub.inert = true;
      salida = salidaAlCampo(q('[data-campo="salida"]'), { reducido: movimientoReducido(), alCartel: () => audio.reproducir('oleada') });
      anunciar(`¡Saltan al campo! ${quien}.`);
    }
    const pedirPartida = async () => {
      if (!servidor || estadoClub !== 'listo') return;
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
    };
    await Promise.all([pedirPartida(), salida?.tapada]);
    if (destruido) return;
    mundo = nuevoMundo(false);
    hud.reiniciar();
    acumulador = 0;
    fase = 'jugando';
    ponerEnPartida(true);
    zonaHud.hidden = false;
    mostrar(null);
    hud.actualizar(mundo);
    audio.saqueInicial();
    procesarEventos();
    if (salida) { salida.abrir(); salida = null; }
    lienzo.focus({ preventScroll: true });
  }

  function alternarPausa() {
    if (fase === 'pausa' && pantallaActual === 'ajustes') {
      pintarPausa();
      mostrar('pausa'); // Esc dentro de los ajustes de la partida: vuelves a la pausa
      return;
    }
    if (fase === 'jugando') {
      fase = 'pausa';
      entrada.soltarTodo();
      pintarPausa();
      mostrar('pausa');
    } else if (fase === 'pausa') {
      reanudar();
    }
  }


  // --- Pausa: lo que llevas en la partida (habilidades y combinaciones) y salir con confirmación ----

  /** En la pausa, «Volver al menú» pide confirmación: la partida se cierra y se guarda lo conseguido. */
  function confirmarSalida(pedir) {
    const caja = q('[data-campo="pausa-confirmar"]');
    caja.hidden = !pedir;
    q('[data-campo="pausa-botones"]').hidden = pedir;
    requestAnimationFrame(() => (pedir ? caja.querySelector('[data-accion="cancelarSalir"]') : q('[data-accion="pedirSalir"]'))?.focus());
  }

  const nivelEn = (j, clave) => j.armas[clave]?.nivel ?? j.pasivas[clave] ?? 0;
  const datosDe = (clave) => ARMAS[clave] ?? PASIVAS[clave];
  const puntitos = (n) => `<span class="pips" aria-label="nivel ${n} de 5">${[1, 2, 3, 4, 5].map((i) => `<i${i <= n ? ' class="on"' : ''}></i>`).join('')}</span>`;

  /** Árbol de la partida: tus habilidades (con su nivel) → las combinaciones que forman → las ultras. */
  function pintarPausa() {
    confirmarSalida(false);
    if (!mundo) return;
    const j = mundo.jugador;
    const r = resumen(mundo);
    q('[data-campo="pausa-datos"]').innerHTML = [
      ['Tiempo', formatearTiempo(r.tiempo)], ['Nivel', r.nivel], ['Rivales', r.bajas], ['Jefes', r.jefes],
    ].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(String(v))}</dd></div>`).join('');

    const tengo = [...Object.keys(ARMAS), ...Object.keys(PASIVAS)].filter((k) => nivelEn(j, k) > 0);
    const activas = new Set(j.sinergias ?? []);
    const nodo = (k) => {
      const d = datosDe(k);
      const n = nivelEn(j, k);
      return `<li class="nodo${ARMAS[k] ? '' : ' nodo--pasiva'}" data-hab="${k}">${icono(d.icono, 20)}<span><strong>${esc(d.nombre)}</strong>${puntitos(n)}</span></li>`;
    };
    // Combinaciones que tocan alguna de tus habilidades (o ya activas), las más cerca de completarse primero
    const combos = Object.entries(SINERGIAS).map(([k, c]) => {
      const reqs = Object.entries(c.requiere).map(([x, min]) => ({ x, min, n: nivelEn(j, x) }));
      let hechos = reqs.filter((q2) => q2.n >= q2.min).length;
      let total = reqs.length;
      if (c.distintas) {
        const cuantas = Object.keys(ARMAS).filter((x) => nivelEn(j, x) >= c.distintas.nivel).length;
        reqs.push({ distintas: true, tiene: cuantas, pide: c.distintas.cuantas, nivel: c.distintas.nivel });
        total += 1;
        if (cuantas >= c.distintas.cuantas) hechos += 1;
      }
      const toca = reqs.some((q2) => q2.x && q2.n > 0) || (c.distintas && tengo.length > 0);
      // Avance por niveles: cuántos de los niveles que pide ya tienes
      const pide = reqs.reduce((t, q2) => t + (q2.distintas ? q2.pide : q2.min), 0);
      const llevas = reqs.reduce((t, q2) => t + (q2.distintas ? Math.min(q2.tiene, q2.pide) : Math.min(q2.n, q2.min)), 0);
      return { k, c, reqs, activa: activas.has(k), avance: pide ? llevas / pide : 0, hechos, total, toca };
    }).filter((x) => x.activa || x.toca)
      .sort((a, b) => Number(b.activa) - Number(a.activa) || b.avance - a.avance)
      .slice(0, 9);
    const chip = (q2) => {
      const d = datosDe(q2.x);
      const ok = q2.n >= q2.min;
      return `<span class="req ${ok ? 'req--hecha' : q2.n > 0 ? 'req--tuyo' : 'req--no'}" title="${esc(d.nombre)}">${icono(d.icono, 14)}${esc(d.nombre)} <b>${q2.n}/${q2.min}</b></span>`;
    };
    const filaCombo = ({ c, reqs, activa, avance }) => `<li class="rama${activa ? ' rama--activa' : ''}">
        <span class="rama__reqs">${reqs.map((q2) => (q2.distintas
          ? `<span class="req ${q2.tiene >= q2.pide ? 'req--hecha' : 'req--tuyo'}">Habilidades distintas a nv ${q2.nivel} <b>${q2.tiene}/${q2.pide}</b></span>`
          : chip(q2))).join('')}</span>
        <span class="rama__flecha" aria-hidden="true"></span>
        <span class="rama__combo">${icono(c.icono, 20)}<span><strong>${esc(c.nombre)}</strong><small>${activa ? '✓ Activa · ' : `${Math.round(avance * 100)} % hecho · `}${esc(c.descripcion)}</small></span></span>
      </li>`;
    const ultras = Object.entries(ULTRAS).map(([k, u]) => ({ k, u, hechas: u.de.filter((c) => activas.has(c)).length, tiene: (j.ultras ?? []).includes(k) }))
      .filter((x) => x.tiene || x.hechas > 0);
    q('[data-campo="pausa-arbol"]').innerHTML = `
      <h3 class="pausa__titulo">Tus habilidades <small>${tengo.length}</small></h3>
      <ul class="nodos">${tengo.map(nodo).join('') || '<li class="panel__vacio">Todavía ninguna.</li>'}</ul>
      <h3 class="pausa__titulo">Combinaciones <small>${activas.size} activas</small></h3>
      <ul class="ramas">${combos.map(filaCombo).join('') || '<li class="panel__vacio">Sube habilidades para empezar a formar combinaciones.</li>'}</ul>
      ${ultras.length ? `<h3 class="pausa__titulo">Ultras</h3><ul class="nodos nodos--ultras">${ultras.map(({ u, hechas, tiene }) => `<li class="nodo nodo--ultra${tiene ? ' nodo--hecha' : ''}" style="--color-ultra:${u.color}">${icono(u.icono, 20)}<span><strong>${esc(u.nombre)}</strong><small>${tiene ? '✦ Conseguida' : `${hechas}/${u.cuantas} combinaciones`}</small></span></li>`).join('')}</ul>` : ''}`;
  }

  /** El engranaje de la partida: pausa y abre todos los ajustes. */
  function abrirAjustesPartida() {
    if (fase === 'jugando') alternarPausa();
    if (fase !== 'pausa') return;
    pintarAjustes();
    mostrar('ajustes');
  }

  function cerrarAjustes() {
    if (fase === 'pausa') { pintarPausa(); mostrar('pausa'); }
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
    audio.reproducir('fin');
    const { record } = registrarPartida(usuario, r);
    q('[data-campo="record"]').hidden = !record;
    const cajaRecompensas = q('[data-campo="recompensas"]');
    const cajaResultado = q('[data-campo="resultado"]');
    cajaRecompensas.innerHTML = partida ? '<p class="panel__vacio">Guardando tu partida…</p>' : '';
    cajaResultado.innerHTML = htmlEstadisticas(r);
    cerrarPartida().then((respuesta) => {
      if (fase !== 'fin') return;
      cajaRecompensas.innerHTML = respuesta ? htmlRecompensas(respuesta, PERSONAJES[r.personaje].nombre)
        : (partida ? '<p class="panel__vacio">No se ha podido guardar la partida en el servidor.</p>' : '');
      if (respuesta?.record) q('[data-campo="record"]').hidden = false;
      const nuevos = respuesta?.recompensas?.logrosNuevos ?? [];
      if (nuevos.length) {
        cajaResultado.innerHTML = htmlEstadisticas(r, { logrosNuevos: nuevos });
        audio.reproducir('logro');
      }
      escalonar(cajaRecompensas.querySelectorAll('.recompensas > li'), { reducido: movimientoReducido(), retraso: 0 });
      pintarAvisosClub();
      cargarMarcaGrada(); // tu marca y tu puesto pueden haber cambiado
    });
    // Pequeña pausa para que se vea el golpe final antes de tapar la pantalla
    setTimeout(() => {
      if (fase !== 'fin') return;
      zonaHud.hidden = true;
      mostrar('fin');
      // Las estadísticas del partido aparecen una detrás de otra
      escalonar(pantallas.fin.querySelectorAll('.fin__cabeza, .resultado--fin > div, .danos > li'), { reducido: movimientoReducido(), paso: 30, retraso: 120 });
      anunciar(`Te han eliminado. Has aguantado ${formatearTiempo(r.tiempo)} y llegado a la oleada ${r.oleada}.`);
    }, 900);
  }

  // --- Eventos de la simulación → sonido y avisos -----------------------------------------------

  function procesarEventos() {
    for (const ev of mundo.eventos.splice(0)) {
      audio.reproducir(ev.tipo, ev);
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

  // Música y grada: qué canción toca, con cuánta intensidad y cuánto se oye la grada (se mide 4 veces por segundo)
  const oido = { proximo: 0, cerca: 0, jefe: false };
  function sonarAmbiente(ahora) {
    if (ahora >= oido.proximo && fase !== 'hub') {
      oido.proximo = ahora + 250;
      const j = mundo.jugador;
      oido.cerca = cercaniaGrada(distanciaGrada(mundo.terreno, j.x, j.y, 700));
      oido.jefe = mundo.enemigos.some((e) => e.jefe && !e.muerto);
    }
    const minuto = mundo.tiempo / 60 - AMBIENTES[mundo.ambiente ?? 0].desde;
    audio.actualizar({
      fase, ambiente: mundo.ambiente ?? 0, intensidad: intensidadMusica(minuto, oido.jefe), cercaGrada: fase === 'hub' ? 0 : oido.cerca,
    });
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
      vigilarLogros();
      if (mundo.estado === 'mejora') mostrarMejora();
      else if (mundo.estado === 'fin') mostrarFin();
    } else if (fase === 'hub') {
      pasearEnElMenu(dt);
    }

    sonarAmbiente(ahora);
    actualizarCamara(mundo, dt);
    ctx.setTransform(vista.dpr, 0, 0, vista.dpr, 0, 0);
    if (fase !== 'hub') {
      dibujar(ctx, mundo, vista);
      return;
    }
    // En el menú el jugador se ve más grande y pasea por el hueco del escenario (la cámara se corre solo al dibujar)
    const escala = vista.escala * 2.1;
    const camara = mundo.camara;
    const { x, y } = camara;
    camara.x = mundo.jugador.x - escenario.dx / escala; // sin adelanto: el muñeco, justo en el centro del hueco
    camara.y -= escenario.dy / (escala * CAMARA.inclinacion);
    dibujar(ctx, mundo, { ...vista, escala });
    camara.x = x;
    camara.y = y;
    // Papelitos solo con el menú a la vista (con otra pantalla encima, o la pestaña oculta, se paran)
    if (pantallaActual === 'hub' && efectosMenu()) {
      papelitos.paso(dt);
      ctx.setTransform(vista.dpr, 0, 0, vista.dpr, 0, 0);
      papelitos.dibujar(ctx);
    }
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
    papelitos.medir(ancho, alto);
    medirEscenario();
  }
  const observador = new ResizeObserver(ajustarTamano);
  observador.observe(contenedor);
  ajustarTamano();

  // --- Eventos de la interfaz -------------------------------------------------------------------

  const acciones = {
    jugar: () => empezar({ conEntrada: true }),
    empezar,
    consejo: otroConsejo,
    hub: () => irAlHub('hub'),
    vestuario: () => irAlHub('vestuario'),
    entrenamiento: () => irAlHub('entrenamiento'),
    contratar: () => irAlHub('contratar'),
    canjear: canjearFicha,
    desbloquear: desbloquearTodo,
    combos: () => irAlHub('combos'),
    identidad: () => irAlHub('identidad'),
    logros: () => irAlHub('logros'),
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
    pedirSalir: () => confirmarSalida(true),
    cancelarSalir: () => confirmarSalida(false),
    cerrarAjustes,
    sonido: () => { audio.alternar(); actualizarBotonSonido(); },
  };

  function alHacerClic(ev) {
    // Clic fuera de la caja de una pantalla del menú (en el fondo oscuro): se cierra, como con Esc o «Volver»
    if (ev.target.classList?.contains('pantalla')) {
      if (fase === 'hub' && PANELES_DEL_HUB.has(pantallaActual)) { irAlHub('hub'); return; }
      if (pantallaActual === 'ajustes') { cerrarAjustes(); return; }
    }
    const mejora = ev.target.closest('[data-mejora]');
    if (mejora) {
      elegir(mejora.dataset.mejora);
      return;
    }
    const filtroC = ev.target.closest('[data-filtro-combos]');
    if (filtroC) {
      filtroCombos = filtroC.dataset.filtroCombos;
      pintarCombos();
      pintarUltras();
      return;
    }
    const equip = ev.target.closest('[data-equipacion]');
    if (equip) {
      if (equip.getAttribute('aria-disabled') === 'true') { anunciar(equip.title); return; }
      eleccion = { ...eleccion, equipacion: equip.dataset.equipacion };
      try { localStorage.setItem(CLAVE_ELECCION, JSON.stringify(eleccion)); } catch { /* da igual */ }
      mundo = nuevoMundo(true);
      pintarEquipaciones();
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
    // En el menú principal, las flechas (y Inicio/Fin) recorren las opciones del menú
    if (fase === 'hub' && pantallaActual === 'hub' && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(ev.key)) {
      const opciones = [...contenedor.querySelectorAll('.hub__menu .menu-item')];
      const i = opciones.indexOf(document.activeElement);
      if (i < 0) return;
      ev.preventDefault();
      const n = opciones.length;
      const destino = { ArrowDown: (i + 1) % n, ArrowUp: (i - 1 + n) % n, Home: 0, End: n - 1 }[ev.key];
      opciones[destino].focus();
      return;
    }
    if (fase === 'mejora' && /^Digit[1-3]$/.test(ev.code)) {
      const opcion = mundo.opciones[Number(ev.code.slice(5)) - 1];
      if (opcion) elegir(opcion.id);
    }
  }

  // El navegador no deja sonar nada hasta el primer gesto: con el primero arranca la música del vestuario
  const alPrimerGesto = () => { audio.activar(); };
  contenedor.addEventListener('pointerdown', alPrimerGesto, { once: true });
  window.addEventListener('keydown', alPrimerGesto, { once: true });
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
  cargarMarcaGrada();

  return {
    destruir() {
      destruido = true;
      if (partida && !partida.enviada && fase !== 'hub') cerrarPartida({ alCerrarPagina: true });
      window.removeEventListener('pagehide', alCerrarPagina);
      cancelAnimationFrame(raf);
      clearInterval(relojConsejos);
      salida?.cancelar();
      observador.disconnect();
      observadorEscenario.disconnect();
      entrada.destruir();
      hud.destruir();
      contenedor.removeEventListener('click', alHacerClic);
      contenedor.removeEventListener('input', alCambiarAjuste);
      contenedor.removeEventListener('change', alCambiarAjuste);
      window.removeEventListener('keydown', alPulsarTecla);
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      document.removeEventListener('fullscreenchange', alCambiarPantalla);
      contenedor.removeEventListener('pointerdown', alPrimerGesto);
      window.removeEventListener('keydown', alPrimerGesto);
      audio.cerrar();
      ponerEnPartida(false);
      if (document.fullscreenElement) document.exitFullscreen?.();
      contenedor.classList.remove('juego');
      contenedor.replaceChildren();
    },
    irAlMenu: () => irAlHub('hub'),
  };
}
