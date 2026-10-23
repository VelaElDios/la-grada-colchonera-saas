// Piezas reutilizables de interfaz: estados de carga, vacío y error, y traducción de errores a texto.
import { h } from './dom.js';
import { ApiError } from '../api.js';

/** Registra el error en la consola (para depurar) y devuelve un texto amable para el usuario. */
export function mensajeDeError(error, contexto = '') {
  console.error(`[grada]${contexto ? ` ${contexto}:` : ''}`, error);
  if (error instanceof ApiError) return error.message;
  return 'Ha ocurrido un error inesperado. Inténtalo de nuevo.';
}

/** Rueda de carga con texto accesible. */
export const spinner = (texto = 'Cargando…') => h(
  'span',
  { class: 'spinner', attrs: { role: 'status' } },
  h('span', { class: 'spinner__rueda', attrs: { 'aria-hidden': 'true' } }),
  h('span', { class: 'spinner__texto' }, texto),
);

/** Bloque gris animado que ocupa el sitio del contenido mientras llega. */
export const esqueleto = (clase = '') => h('span', { class: `esqueleto ${clase}`.trim(), attrs: { 'aria-hidden': 'true' } });

/** Varias filas-esqueleto con un texto oculto para lectores de pantalla. */
export function listaEsqueleto(filas = 4, clase = 'esqueleto--fila') {
  return h(
    'div',
    { class: 'carga', attrs: { role: 'status', 'aria-busy': 'true' } },
    h('span', { class: 'sr-only' }, 'Cargando…'),
    ...Array.from({ length: filas }, () => esqueleto(clase)),
  );
}

/** Estado vacío: explica por qué no hay nada y qué puede hacer el usuario. */
export function estadoVacio({ titulo, texto, accion }) {
  return h(
    'div',
    { class: 'estado estado--vacio' },
    h('h2', { class: 'estado__titulo' }, titulo),
    texto && h('p', { class: 'estado__texto' }, texto),
    accion,
  );
}

/** Estado de error con botón para reintentar. */
export function estadoError({ titulo = 'No hemos podido cargarlo', texto, reintentar }) {
  return h(
    'div',
    { class: 'estado estado--error', attrs: { role: 'alert' } },
    h('h2', { class: 'estado__titulo' }, titulo),
    h('p', { class: 'estado__texto' }, texto),
    reintentar && h('button', { class: 'btn btn--secundario', type: 'button', onClick: reintentar }, 'Reintentar'),
  );
}

/** Enlace con aspecto de botón. */
export const enlaceBoton = (texto, ruta, variante = 'primario', extra = '') => h(
  'a',
  { class: `btn btn--${variante} ${extra}`.trim(), href: `#${ruta}` },
  texto,
);

/** Etiqueta de color (rol, estado...). */
export const insignia = (texto, tono = 'neutra') => h('span', { class: `chapa chapa--${tono}` }, texto);
