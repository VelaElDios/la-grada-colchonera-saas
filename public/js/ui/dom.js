// Utilidades para construir el DOM de forma segura: el texto siempre se inserta como texto,
// nunca como HTML, así lo que escribe un usuario (por ejemplo su email) no puede inyectar código.

/**
 * Crea un elemento.
 * @param {string} etiqueta Nombre de la etiqueta (p. ej. 'button')
 * @param {object} [props] class, dataset, attrs, on<Evento> (manejadores) y cualquier propiedad DOM
 * @param {...(Node|string|null|false)} hijos
 */
export function h(etiqueta, props = {}, ...hijos) {
  const nodo = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(props || {})) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (clave === 'class') nodo.className = valor;
    else if (clave === 'dataset') Object.assign(nodo.dataset, valor);
    else if (clave === 'attrs') Object.entries(valor).forEach(([k, v]) => nodo.setAttribute(k, v));
    else if (clave.startsWith('on') && typeof valor === 'function') nodo.addEventListener(clave.slice(2).toLowerCase(), valor);
    else if (clave in nodo) nodo[clave] = valor;
    else nodo.setAttribute(clave, valor === true ? '' : valor);
  }
  anadir(nodo, hijos);
  return nodo;
}

function anadir(nodo, hijos) {
  for (const hijo of hijos.flat()) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    nodo.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
}

/** Crea un nodo a partir de una cadena SVG o HTML de confianza (solo para iconos propios). */
export function desdeHtml(html) {
  const plantilla = document.createElement('template');
  plantilla.innerHTML = html.trim();
  return plantilla.content.firstElementChild;
}

/** Fecha corta en español. */
export const fechaCorta = (iso) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

/** Primera letra en mayúscula del email, para el avatar. */
export const inicial = (texto) => (texto?.trim()[0] || '?').toUpperCase();

export const NOMBRES_ROL = { user: 'Aficionado', admin: 'Administrador' };
export const NOMBRES_ESTADO = { pending: 'Pendiente', active: 'Activa', deleted: 'Eliminada' };
