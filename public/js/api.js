// Cliente de comunicación con el servidor: único punto del frontend que hace peticiones HTTP.
// Convierte las respuestas de la API en objetos JavaScript y los errores en ApiError,
// de modo que la interfaz (ui.js) nunca trabaja directamente con fetch ni con códigos HTTP.

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

const api = (() => {
  // Función a la que se avisa cuando el servidor responde 401 (sesión caducada o inexistente)
  let alNoAutenticado = null;

  async function peticion(metodo, ruta, cuerpo) {
    const opciones = { method: metodo, headers: {}, credentials: 'same-origin' };
    if (cuerpo !== undefined) {
      opciones.headers['Content-Type'] = 'application/json';
      opciones.body = JSON.stringify(cuerpo);
    }

    let respuesta;
    try {
      respuesta = await fetch(`/api${ruta}`, opciones);
    } catch {
      throw new ApiError(0, 'NETWORK_ERROR', 'No se ha podido conectar con el servidor');
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
      const esRutaDeSesion = ruta === '/auth/login' || ruta === '/auth/me';
      if (respuesta.status === 401 && !esRutaDeSesion && alNoAutenticado) {
        alNoAutenticado(error);
      }
      throw error;
    }
    return datos;
  }

  return {
    getHealth: () => peticion('GET', '/health'),

    // Autenticación
    register: (email, password) => peticion('POST', '/auth/register', { email, password }),
    login: (email, password) => peticion('POST', '/auth/login', { email, password }),
    logout: () => peticion('POST', '/auth/logout'),
    me: () => peticion('GET', '/auth/me'),

    // Usuarios
    listUsers: () => peticion('GET', '/users'),
    isUserActive: (id) => peticion('GET', `/users/${encodeURIComponent(id)}/active`),
    deleteUser: (id) => peticion('DELETE', `/users/${encodeURIComponent(id)}`),

    /** Registra la función que se ejecuta cuando la sesión deja de ser válida. */
    alExpirarSesion: (funcion) => {
      alNoAutenticado = funcion;
    },
  };
})();
