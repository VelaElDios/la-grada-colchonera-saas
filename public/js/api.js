// Cliente de comunicación con el servidor: único punto del frontend que hace peticiones HTTP.
// Convierte las respuestas de la API en objetos JavaScript y los errores en ApiError,
// de modo que la interfaz nunca trabaja directamente con fetch ni con códigos HTTP.

const TIEMPO_MAXIMO_MS = 15000;

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// Función a la que se avisa cuando el servidor responde 401 (sesión caducada o inexistente)
let alNoAutenticado = null;

async function peticion(metodo, ruta, cuerpo) {
  const opciones = { method: metodo, headers: {}, credentials: 'same-origin' };
  if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }

  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), TIEMPO_MAXIMO_MS);
  opciones.signal = control.signal;

  let respuesta;
  try {
    respuesta = await fetch(`/api${ruta}`, opciones);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ApiError(0, 'TIMEOUT', 'El servidor tarda demasiado en responder. Inténtalo de nuevo.');
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'No se ha podido conectar con el servidor. Comprueba tu conexión.');
  } finally {
    clearTimeout(reloj);
  }

  if (respuesta.status === 204) return null;
  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    const error = new ApiError(
      respuesta.status,
      datos?.error?.code || 'ERROR',
      datos?.error?.message || `Error ${respuesta.status}`,
    );
    // Un 401 en una ruta protegida significa que la sesión ya no es válida
    const esRutaDeSesion = ruta.startsWith('/auth/');
    if (respuesta.status === 401 && !esRutaDeSesion && alNoAutenticado) {
      alNoAutenticado(error);
    }
    throw error;
  }
  return datos;
}

export const api = {
  getHealth: () => peticion('GET', '/health'),

  // Autenticación
  register: (email, password) => peticion('POST', '/auth/register', { email, password }),
  login: (email, password) => peticion('POST', '/auth/login', { email, password }),
  logout: () => peticion('POST', '/auth/logout'),
  me: () => peticion('GET', '/auth/me'),
  getProviders: () => peticion('GET', '/auth/providers'),
  resendConfirmation: (email) => peticion('POST', '/auth/resend-confirmation', { email }),

  // Usuarios
  listUsers: () => peticion('GET', '/users'),
  isUserActive: (id) => peticion('GET', `/users/${encodeURIComponent(id)}/active`),
  deleteUser: (id) => peticion('DELETE', `/users/${encodeURIComponent(id)}`),
  changeRole: (id, role) => peticion('PATCH', `/users/${encodeURIComponent(id)}/role`, { role }),

  // Juego: club (plantilla, entrenamiento, contratos) y ranking de la grada
  getJuegoPerfil: () => peticion('GET', '/juego/perfil'),
  iniciarPartida: (personaje, entrenador) => peticion('POST', '/juego/partidas', { personaje, entrenador }),
  finalizarPartida: (partidaId, resultado) => peticion('POST', `/juego/partidas/${encodeURIComponent(partidaId)}/fin`, resultado),
  contratarJugador: () => peticion('POST', '/juego/contratar'),
  entrenarJugador: (personaje, estadistica) => peticion('POST', '/juego/entrenar', { personaje, estadistica }),
  getRankingJuego: (limite = 20) => peticion('GET', `/juego/ranking?limite=${encodeURIComponent(limite)}`),
  /** Al cerrar la pestaña en plena partida: envía el resultado sin esperar respuesta (el navegador lo completa solo). */
  finalizarPartidaAlCerrar: (partidaId, resultado) => {
    try {
      const cuerpo = new Blob([JSON.stringify(resultado)], { type: 'application/json' });
      return navigator.sendBeacon(`/api/juego/partidas/${encodeURIComponent(partidaId)}/fin`, cuerpo);
    } catch {
      return false;
    }
  },

  /** Registra la función que se ejecuta cuando la sesión deja de ser válida. */
  alExpirarSesion: (funcion) => {
    alNoAutenticado = funcion;
  },
};
