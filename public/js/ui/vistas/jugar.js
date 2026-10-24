import { h } from '../dom.js';
import { estado, ponerUsuario } from '../estado.js';
import { api } from '../../api.js';
import { estadoError, spinner } from '../componentes.js';

export async function montar(raiz, { navegar }) {
  raiz.replaceChildren(h('h1', { class: 'sr-only', tabIndex: -1 }, 'Jugar'), spinner('Preparando el campo…'));
  let juego;
  try {
    // El motor se descarga solo cuando se entra a jugar
    const { montarJuego } = await import('../../game/juego.js');
    const contenedor = h('div', { class: 'juego-zona' });
    raiz.replaceChildren(h('h1', { class: 'sr-only', tabIndex: -1 }, 'Jugar'), contenedor);
    // El juego no habla con el servidor directamente: recibe estas funciones (así se puede probar aparte)
    const servidor = {
      perfil: () => api.getJuegoPerfil(),
      iniciar: (personaje, entrenador) => api.iniciarPartida(personaje, entrenador),
      finalizar: (id, resultado) => api.finalizarPartida(id, resultado),
      finalizarAlCerrar: (id, resultado) => api.finalizarPartidaAlCerrar(id, resultado),
      contratar: () => api.contratarJugador(),
      desbloquear: () => api.desbloquearJuego(),
      identidad: (cambios) => api.ponerIdentidad(cambios),
      entrenar: (personaje, estadistica) => api.entrenarJugador(personaje, estadistica),
      ranking: () => api.getRankingJuego(20),
    };
    juego = montarJuego(contenedor, {
      usuario: { ...estado.usuario }, alSalir: () => navegar('/'), servidor, alCambiarUsuario: (u) => ponerUsuario(u),
    });
  } catch (error) {
    console.error('[grada] no se pudo cargar el juego', error);
    raiz.replaceChildren(
      h('h1', { class: 'sr-only', tabIndex: -1 }, 'Jugar'),
      estadoError({ titulo: 'No se ha podido cargar el juego', texto: 'Comprueba tu conexión y vuelve a intentarlo.', reintentar: () => montar(raiz, { navegar }) }),
    );
  }
  return () => juego?.destruir();
}
