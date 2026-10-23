import { h } from '../dom.js';
import { estado } from '../estado.js';
import { estadoError, spinner } from '../componentes.js';

export async function montar(raiz, { navegar }) {
  raiz.replaceChildren(h('h1', { class: 'sr-only', tabIndex: -1 }, 'Jugar'), spinner('Preparando el campo…'));
  let juego;
  try {
    // El motor se descarga solo cuando se entra a jugar
    const { montarJuego } = await import('../../game/juego.js');
    const contenedor = h('div', { class: 'juego-zona' });
    raiz.replaceChildren(h('h1', { class: 'sr-only', tabIndex: -1 }, 'Jugar'), contenedor);
    juego = montarJuego(contenedor, { usuario: estado.usuario, alSalir: () => navegar('/') });
  } catch (error) {
    console.error('[grada] no se pudo cargar el juego', error);
    raiz.replaceChildren(
      h('h1', { class: 'sr-only', tabIndex: -1 }, 'Jugar'),
      estadoError({ titulo: 'No se ha podido cargar el juego', texto: 'Comprueba tu conexión y vuelve a intentarlo.', reintentar: () => montar(raiz, { navegar }) }),
    );
  }
  return () => juego?.destruir();
}
