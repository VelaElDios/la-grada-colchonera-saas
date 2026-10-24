// Lógica del juego ligada a la cuenta: club (plantilla), contratos, entrenamiento, partidas y ranking.
// Las reglas viven en public/js/game/club.js (código puro que comparten cliente y servidor);
// aquí se aplican con autoridad: el cliente solo pide y el servidor decide, reparte el azar y valida.
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { randomInt, randomUUID } = require('node:crypto');

const {
  ValidationError, NotFoundError, ConflictError, ForbiddenError,
} = require('./errors');

const RUTA_JUEGO = path.join(__dirname, '..', '..', 'public', 'js', 'game');
const MAX_REINTENTOS = 4;
const TIEMPO_MAXIMO = 4 * 3600; // s: ninguna partida razonable dura más
const MARGEN_RELOJ = 15; // s de margen entre el reloj del juego y el del servidor

// El juego es un módulo ES del frontend: el servidor lo carga una vez, bajo demanda
let reglasPromesa;
function cargarReglas() {
  if (!reglasPromesa) {
    reglasPromesa = Promise.all([
      import(pathToFileURL(path.join(RUTA_JUEGO, 'club.js')).href),
      import(pathToFileURL(path.join(RUTA_JUEGO, 'config.js')).href),
    ]).then(([club, config]) => ({ club, config }));
  }
  return reglasPromesa;
}

const azarSeguro = () => randomInt(0, 1_000_000) / 1_000_000;
const entero = (v) => Number.isInteger(v);

/** Alias público: el mote si tiene; si no, la parte del correo anterior a la @ (nunca la dirección completa). */
function aliasDe(user) {
  if (user.apodo) return user.apodo;
  const local = String(user.email || 'jugador').split('@')[0].replace(/[^\p{L}\p{N}._-]/gu, '');
  return (local || 'jugador').slice(0, 20);
}

const APODO_VALIDO = /^[\p{L}\p{N}][\p{L}\p{N} ._-]{1,14}[\p{L}\p{N}._-]$/u;
/** Mote normalizado para compararlo: sin tildes, en minúsculas y sin espacios repetidos. */
const claveApodo = (apodo) => apodo.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ');

function createJuegoService({
  juegoRepository, userRepository = null, azar = azarSeguro, ahora = () => Date.now(),
}) {
  /** Lee el perfil (lo crea con el equipo inicial la primera vez), lo transforma y lo guarda con control de versión. */
  async function conPerfil(user, transformar) {
    const { club, config } = await cargarReglas();
    for (let intento = 0; intento < MAX_REINTENTOS; intento += 1) {
      let actual = await juegoRepository.getPerfil(user.id);
      if (!actual) {
        await juegoRepository.crearPerfil(user.id, club.perfilNuevo(azar));
        actual = await juegoRepository.getPerfil(user.id);
      }
      const datos = structuredClone(actual.datos);
      const resultado = await transformar(datos, { club, config });
      if (resultado?.sinCambios || await juegoRepository.guardarPerfil(user.id, datos, actual.version)) {
        return { datos, resultado };
      }
    }
    throw new ConflictError('Hay demasiadas peticiones a la vez. Inténtalo de nuevo.');
  }

  /** Lo que ve el cliente (sin datos internos como la partida en curso). */
  function vista(datos, club, config) {
    const jugadores = {};
    Object.entries(datos.jugadores).forEach(([clave, ficha]) => {
      jugadores[clave] = {
        jefes: ficha.jefes,
        bajas: ficha.bajas || 0,
        siguientePunto: club.proximoPuntoPorBajas(ficha.bajas || 0),
        partidas: ficha.partidas || 0,
        stats: ficha.stats,
        puntosLibres: club.puntosLibres(ficha),
      };
    });
    return {
      jugadores,
      jefesTotal: datos.jefesTotal,
      partidas: datos.partidas,
      fichas: club.fichasDisponibles(datos),
      fichasGanadas: club.fichasGanadas(datos),
      siguienteFichaEn: club.JEFES_POR_FICHA - (datos.jefesTotal % club.JEFES_POR_FICHA),
      totalJugadores: Object.keys(config.PERSONAJES).length,
    };
  }

  const reglas = async (datos) => { const r = await cargarReglas(); return vista(datos, r.club, r.config); };

  return {
    /** Club del usuario. */
    async obtenerPerfil(user) {
      const { datos } = await conPerfil(user, () => ({ sinCambios: true }));
      return reglas(datos);
    },

    /** Empieza una partida: anota cuándo y con quién, para validar el resultado al terminar. */
    async iniciarPartida(user, { personaje, entrenador } = {}) {
      const { config } = await cargarReglas();
      if (!config.ENTRENADORES[entrenador]) throw new ValidationError('Entrenador no válido');
      const { datos, resultado } = await conPerfil(user, (d) => {
        if (typeof personaje !== 'string' || !d.jugadores[personaje]) throw new ValidationError('Ese jugador no está en tu plantilla');
        const partidaId = randomUUID();
        d.partidaActual = { id: partidaId, personaje, entrenador, inicio: ahora() };
        return { partidaId, stats: d.jugadores[personaje].stats };
      });
      return { partidaId: resultado.partidaId, stats: resultado.stats, perfil: await reglas(datos) };
    },

    /** Termina la partida: valida el resultado, reparte progreso (jefes → puntos y fichas) y actualiza el ranking. */
    async finalizarPartida(user, partidaId, { tiempo, nivel, jefes, bajas } = {}) {
      if (![tiempo, nivel, jefes, bajas].every(entero) || tiempo < 0 || nivel < 1 || jefes < 0 || bajas < 0) {
        throw new ValidationError('Resultado de la partida no válido');
      }
      let record = false;
      let partida;
      const { datos, resultado } = await conPerfil(user, (d, { club }) => {
        const actual = d.partidaActual;
        if (!actual || actual.id !== partidaId) throw new NotFoundError('No hay una partida en curso con ese identificador');
        const transcurrido = (ahora() - actual.inicio) / 1000;
        if (tiempo > TIEMPO_MAXIMO || tiempo > transcurrido + MARGEN_RELOJ) throw new ValidationError('El tiempo no coincide con la partida');
        if (jefes > 3 + tiempo / 50 || nivel > 8 + tiempo / 3 || bajas > 20 * tiempo + 50) {
          throw new ValidationError('El resultado no es creíble');
        }
        const ficha = d.jugadores[actual.personaje];
        const puntosAntes = club.puntosLibres(ficha);
        const fichasAntes = club.fichasDisponibles(d);
        ficha.jefes += jefes;
        ficha.bajas = (ficha.bajas || 0) + bajas;
        ficha.partidas = (ficha.partidas || 0) + 1;
        d.jefesTotal += jefes;
        d.partidas += 1;
        delete d.partidaActual;
        partida = actual;
        return {
          jefes,
          puntosNuevos: club.puntosLibres(ficha) - puntosAntes,
          fichasNuevas: club.fichasDisponibles(d) - fichasAntes,
        };
      });

      const previo = await juegoRepository.getRecord(user.id);
      if (!previo || tiempo > previo.tiempo || (tiempo === previo.tiempo && nivel > previo.nivel)) {
        await juegoRepository.guardarRecord(user.id, {
          alias: aliasDe(user), avatar: user.avatar ?? null, personaje: partida.personaje, entrenador: partida.entrenador, tiempo, nivel, jefes, bajas,
        });
        record = true;
      }
      return { recompensas: resultado, record, perfil: await reglas(datos) };
    },

    /** Gasta una ficha de contrato: un jugador nuevo al azar (nunca repetido; los de pocas habilidades salen más). */
    async contratar(user) {
      const { datos, resultado } = await conPerfil(user, (d, { club }) => {
        if (club.fichasDisponibles(d) < 1) throw new ConflictError('No tienes fichas de contrato (una por cada 3 jefes vencidos)');
        const clave = club.sortearContrato(d, azar);
        if (!clave) throw new ConflictError('Ya tienes a todos los jugadores');
        d.fichasUsadas += 1;
        d.jugadores[clave] = club.fichaNueva();
        return { fichado: clave };
      });
      return { fichado: resultado.fichado, perfil: await reglas(datos) };
    },

    /** Sube una estadística de un jugador con un punto de entrenamiento. */
    async entrenar(user, { personaje, estadistica } = {}) {
      const { datos } = await conPerfil(user, (d, { club }) => {
        if (!club.ESTADISTICAS.includes(estadistica)) throw new ValidationError('Estadística no válida');
        const ficha = typeof personaje === 'string' ? d.jugadores[personaje] : null;
        if (!ficha) throw new ValidationError('Ese jugador no está en tu plantilla');
        if (club.puntosLibres(ficha) < 1) throw new ConflictError('No tienes puntos de entrenamiento con ese jugador (se ganan con rivales eliminados y con jefes vencidos)');
        if (ficha.stats[estadistica] >= club.NIVEL_ESTADISTICA_MAX) throw new ConflictError('Esa estadística ya está al máximo');
        ficha.stats[estadistica] += 1;
        return {};
      });
      return reglas(datos);
    },

    /**
     * Modo pruebas: ficha a todos los jugadores y puntos de sobra. Solo para administradores
     * (o, con `forzar`, desde el script de la terminal). No toca el ranking.
     */
    async desbloquearTodo(user, { forzar = false } = {}) {
      if (!forzar && user.role !== 'admin') throw new ForbiddenError('Solo un administrador puede usar el modo pruebas');
      const { datos } = await conPerfil(user, (d, { club, config }) => {
        Object.keys(config.PERSONAJES).forEach((clave) => {
          const ficha = d.jugadores[clave] ?? club.fichaNueva();
          ficha.jefes = Math.max(ficha.jefes, 60);
          ficha.bajas = Math.max(ficha.bajas || 0, 60000);
          d.jugadores[clave] = ficha;
        });
        d.jefesTotal = Math.max(d.jefesTotal, 150);
        return {};
      });
      return reglas(datos);
    },

    /**
     * Mote y avatar del aficionado. El mote es único (sin distinguir mayúsculas ni tildes) y es lo que sale
     * en el ranking y en la cabecera; el avatar es la cara de un jugador que tengas fichado o de un entrenador.
     */
    async ponerIdentidad(user, { apodo, avatar } = {}) {
      if (!userRepository) throw new Error('ponerIdentidad necesita el repositorio de usuarios');
      const { config } = await cargarReglas();
      const cambios = {};
      if (apodo !== undefined) {
        const limpio = typeof apodo === 'string' ? apodo.trim().replace(/\s+/g, ' ') : '';
        if (!APODO_VALIDO.test(limpio)) {
          throw new ValidationError('El mote debe tener entre 3 y 16 caracteres: letras, números, espacios, puntos, guiones o guiones bajos');
        }
        const clave = claveApodo(limpio);
        const otro = await userRepository.findByApodo(clave);
        if (otro && otro.id !== user.id) throw new ConflictError('Ese mote ya lo lleva otro aficionado. Prueba con otro.');
        cambios.apodo = limpio;
        cambios.apodoClave = clave;
      }
      if (avatar !== undefined) {
        const m = typeof avatar === 'string' ? /^(p|e):([a-z0-9]+)$/.exec(avatar) : null;
        if (!m) throw new ValidationError('Avatar no válido');
        if (m[1] === 'e' && !config.ENTRENADORES[m[2]]) throw new ValidationError('Ese entrenador no existe');
        if (m[1] === 'p') {
          const perfil = await juegoRepository.getPerfil(user.id);
          if (!config.PERSONAJES[m[2]] || !perfil?.datos.jugadores[m[2]]) throw new ValidationError('Solo puedes ponerte la cara de un jugador que tengas fichado');
        }
        cambios.avatar = avatar;
      }
      if (!Object.keys(cambios).length) throw new ValidationError('No hay nada que cambiar');
      let actualizado;
      try {
        actualizado = await userRepository.update(user.id, cambios);
      } catch (error) {
        if (error.code === '23505') throw new ConflictError('Ese mote ya lo lleva otro aficionado. Prueba con otro.');
        throw error;
      }
      await juegoRepository.actualizarIdentidad(user.id, { alias: aliasDe(actualizado), avatar: actualizado.avatar ?? null });
      const { passwordHash, apodoClave, ...publico } = actualizado;
      return publico;
    },

    /** Clasificación: las mejores partidas (una por usuario), con quién y a qué nivel. */
    async ranking(user, limite = 20) {
      const lista = await juegoRepository.mejoresRecords(Math.min(Math.max(limite, 1), 100));
      const filas = lista.map((r, i) => ({
        posicion: i + 1,
        alias: r.alias,
        personaje: r.personaje,
        entrenador: r.entrenador,
        tiempo: r.tiempo,
        nivel: r.nivel,
        jefes: r.jefes,
        fecha: r.createdAt,
        avatar: r.avatar ?? null,
        esTuyo: r.userId === user.id,
      }));
      const mio = await juegoRepository.getRecord(user.id);
      return { filas, tuMejor: mio ? { tiempo: mio.tiempo, nivel: mio.nivel, personaje: mio.personaje } : null };
    },
  };
}

module.exports = { createJuegoService, aliasDe, claveApodo };
