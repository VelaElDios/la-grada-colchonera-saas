import { h } from '../dom.js';
import { estadoVacio, enlaceBoton } from '../componentes.js';

export function montar(raiz) {
  raiz.replaceChildren(
    h('h1', { class: 'sr-only', tabIndex: -1 }, 'Página no encontrada'),
    estadoVacio({ titulo: 'Fuera de juego', texto: 'La página que buscas no existe o ha cambiado de sitio.', accion: enlaceBoton('Volver al inicio', '/') }),
  );
  return undefined;
}
