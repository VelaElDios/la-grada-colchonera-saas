// Registro (log) de la actividad de la aplicación.
// Cada evento se escribe como una línea JSON en la salida estándar: Render (o cualquier
// plataforma) la recoge y permite buscar y filtrar por campos (nivel, evento, usuario...).
//
//   {"time":"2026-10-12T10:00:00.000Z","level":"info","event":"auth.login","msg":"Inicio de sesión","userId":"..."}
//
// Nunca se registran contraseñas, hashes, cookies ni secretos: esos campos se ocultan siempre.

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

const SENSITIVE_KEYS = /pass(word)?|hash|secret|token|cookie|authorization|database_?url|smtp_?url/i;

/** Copia de los datos con los campos sensibles ocultos (también en objetos anidados). */
function redact(value, depth = 0) {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, ...(value.code ? { code: value.code } : {}), stack: value.stack };
  }
  if (!value || typeof value !== 'object' || depth > 4) return value;
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  return Object.fromEntries(Object.entries(value).map(([key, val]) => [
    key,
    SENSITIVE_KEYS.test(key) ? '[oculto]' : redact(val, depth + 1),
  ]));
}

/**
 * @param {object} [options]
 * @param {'debug'|'info'|'warn'|'error'|'silent'} [options.level='info'] Nivel mínimo que se registra
 * @param {(line: string) => void} [options.write] Dónde se escribe cada línea (por defecto, stdout)
 * @param {object} [options.base] Campos que se añaden a todas las líneas
 */
function createLogger({ level = 'info', write = (line) => process.stdout.write(`${line}\n`), base = {} } = {}) {
  if (!(level in LEVELS)) throw new Error(`Nivel de log no válido: ${level}`);
  const minimum = LEVELS[level];

  function log(lvl, event, msg, fields = {}) {
    if (LEVELS[lvl] < minimum) return;
    write(JSON.stringify({
      time: new Date().toISOString(),
      level: lvl,
      event,
      msg,
      ...redact({ ...base, ...fields }),
    }));
  }

  return {
    level,
    debug: (event, msg, fields) => log('debug', event, msg, fields),
    info: (event, msg, fields) => log('info', event, msg, fields),
    warn: (event, msg, fields) => log('warn', event, msg, fields),
    error: (event, msg, fields) => log('error', event, msg, fields),
    /** Logger con campos fijos añadidos (por ejemplo, el id de la petición). */
    child: (fields) => createLogger({ level, write, base: { ...base, ...fields } }),
  };
}

module.exports = { createLogger, redact, LEVELS };
