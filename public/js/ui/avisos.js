// Avisos emergentes (toasts): confirmaciones y errores que no bloquean la pantalla.
import { h } from './dom.js';

const MAX_VISIBLES = 4;
let zona = null;

function obtenerZona() {
  if (!zona) {
    zona = h('div', { class: 'avisos', attrs: { 'aria-live': 'polite', 'aria-atomic': 'false' } });
    document.body.append(zona);
  }
  return zona;
}

/**
 * Muestra un aviso.
 * @param {string} texto
 * @param {'exito'|'error'|'info'} tipo
 */
export function avisar(texto, tipo = 'info') {
  const contenedor = obtenerZona();
  while (contenedor.children.length >= MAX_VISIBLES) contenedor.firstElementChild.remove();

  const cerrar = () => {
    aviso.classList.add('aviso--saliendo');
    setTimeout(() => aviso.remove(), 180);
  };
  const aviso = h(
    'div',
    { class: `aviso aviso--${tipo}`, attrs: { role: tipo === 'error' ? 'alert' : 'status' } },
    h('span', { class: 'aviso__texto' }, texto),
    h('button', { class: 'aviso__cerrar', type: 'button', attrs: { 'aria-label': 'Cerrar aviso' }, onClick: cerrar }, '×'),
  );
  contenedor.append(aviso);
  setTimeout(cerrar, tipo === 'error' ? 7000 : 4500);
}
