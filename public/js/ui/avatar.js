// Avatar del aficionado: la cara de un jugador o entrenador del juego (si la ha elegido) o la inicial del mote o del correo.
// El dibujo sale del mismo código que pinta los muñecos del juego (se carga solo cuando hace falta).
import { h, inicial } from './dom.js';

/** Nombre que se enseña: el mote si lo tiene; si no, el correo. */
export const nombreVisible = (usuario) => usuario?.apodo || usuario?.email || '';

/**
 * @param {{ apodo?: string, email?: string, avatar?: string }} usuario
 * @param {string} tamano 'pequeno' | 'grande'
 */
export function nodoAvatar(usuario, tamano = 'pequeno') {
  const nodo = h('span', { class: `avatar avatar--${tamano}`, attrs: { 'aria-hidden': 'true' } }, inicial(nombreVisible(usuario)));
  if (usuario?.avatar) {
    import('../game/sprites.js').then(({ avatarUrl }) => {
      const url = avatarUrl(usuario.avatar, tamano === 'grande' ? 96 : 48);
      if (url) nodo.replaceChildren(h('img', { class: 'avatar__img', src: url, alt: '' }));
    }).catch(() => {});
  }
  return nodo;
}
