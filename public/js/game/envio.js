// Envío del resultado de una partida al servidor con reintentos. Sin DOM: se prueba con node:test.
// Antes, si la red fallaba una vez al acabar la partida, el resultado se perdía (jefes, puntos y ranking).

/** Esperas (ms) antes de cada reintento: el primero enseguida y el segundo algo después. */
export const ESPERAS_REINTENTO = [1500, 4000];

/**
 * ¿Merece la pena volver a intentarlo? Sí si no hubo respuesta (sin red o tardó demasiado: estado 0), si el
 * servidor falló (5xx) o si había otra escritura a la vez (409, 429). Un 4xx de validación no se arregla repitiendo.
 */
export function esReintentable(error) {
  const estado = error?.status;
  return estado === undefined || estado === 0 || estado === 409 || estado === 429 || estado >= 500;
}

const dormir = (ms) => new Promise((resolver) => { setTimeout(resolver, ms); });

/**
 * Llama a `enviar()` hasta que funcione, con un reintento por cada espera de `esperas`.
 * Devuelve `{ ok: true, respuesta, intentos }` o `{ ok: false, error, intentos, quizaGuardada }`. `quizaGuardada`
 * indica que un intento anterior se cortó sin respuesta y el siguiente dice que la partida ya no está en curso
 * (404): lo normal es que el primero sí llegara y se guardara, así que no hay que guardarla otra vez.
 */
export async function enviarConReintentos(enviar, { esperas = ESPERAS_REINTENTO, esperar = dormir } = {}) {
  let sinRespuesta = false;
  let error = null;
  for (let i = 0; i <= esperas.length; i += 1) {
    if (i > 0) await esperar(esperas[i - 1]);
    try {
      return { ok: true, respuesta: await enviar(), intentos: i + 1 };
    } catch (e) {
      error = e;
      if (sinRespuesta && e?.status === 404) return { ok: false, error, intentos: i + 1, quizaGuardada: true };
      if (!esReintentable(e)) return { ok: false, error, intentos: i + 1, quizaGuardada: false };
      if (!e?.status) sinRespuesta = true;
    }
  }
  return { ok: false, error, intentos: esperas.length + 1, quizaGuardada: false };
}

/**
 * Por qué no se ha guardado una partida, dicho para el jugador, y si tiene sentido ofrecer «Reintentar».
 * Antes el fallo solo salía en la consola: la partida acababa y el club y el ranking seguían igual sin explicación.
 */
export function motivoSinGuardar(error) {
  const estado = error?.status;
  if (estado === 401) {
    return { texto: 'Tu sesión ha caducado: vuelve a iniciar sesión. Esta partida no se ha podido guardar.', reintentable: false };
  }
  if (estado === 404) {
    return { texto: 'El servidor ya no tenía abierta esta partida (¿la cerraste o la terminaste en otra pestaña?). No se ha guardado.', reintentable: false };
  }
  if (estado === 400 || estado === 422) {
    const detalle = error?.message ? ` (${error.message})` : '';
    return { texto: `El servidor no ha aceptado el resultado${detalle}. No se ha guardado.`, reintentable: false };
  }
  if (esReintentable(error)) {
    return { texto: 'No se ha podido conectar con el servidor para guardar la partida. Comprueba tu conexión y dale a «Reintentar».', reintentable: true };
  }
  return { texto: 'No se ha podido guardar la partida en el servidor.', reintentable: false };
}
