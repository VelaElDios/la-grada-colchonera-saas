import { h, inicial, fechaCorta, NOMBRES_ROL, NOMBRES_ESTADO } from '../dom.js';
import { api } from '../../api.js';
import { estado, ponerUsuario } from '../estado.js';
import { avisar } from '../avisos.js';
import { confirmar } from '../modal.js';
import { insignia, enlaceBoton, mensajeDeError } from '../componentes.js';
import { leerMarca, textoMarca } from '../../game/marca.js';

export function montar(raiz, { navegar }) {
  const u = estado.usuario;
  const marca = leerMarca(u);

  async function salir() {
    try { await api.logout(); } catch (e) { console.error('[grada] logout', e); }
    ponerUsuario(null);
    avisar('Has cerrado sesión. ¡Hasta el próximo partido!', 'info');
    navegar('/');
  }

  const botonBaja = h('button', { class: 'btn btn--peligro', type: 'button' }, 'Eliminar mi cuenta');
  botonBaja.addEventListener('click', async () => {
    const ok = await confirmar({
      titulo: '¿Eliminar tu cuenta?',
      texto: 'Tu cuenta quedará eliminada y no podrás volver a entrar con ella. Esta acción no se puede deshacer.',
      confirmar: 'Sí, eliminar',
      peligro: true,
    });
    if (!ok) return;
    botonBaja.disabled = true;
    try {
      await api.deleteUser(u.id);
      await api.logout().catch(() => {});
      ponerUsuario(null);
      avisar('Tu cuenta se ha eliminado. ¡Gracias por pasar por la grada!', 'exito');
      navegar('/');
    } catch (error) {
      botonBaja.disabled = false;
      avisar(mensajeDeError(error, 'eliminar cuenta'), 'error');
    }
  });

  raiz.replaceChildren(
    h('h1', { class: 'pagina__titulo', tabIndex: -1 }, 'Mi cuenta'),
    h(
      'div',
      { class: 'perfil' },
      h(
        'section',
        { class: 'tarjeta perfil__ficha' },
        h('span', { class: 'avatar avatar--grande', attrs: { 'aria-hidden': 'true' } }, inicial(u.email)),
        h('p', { class: 'perfil__email' }, u.email),
        h('div', { class: 'perfil__chapas' }, insignia(NOMBRES_ROL[u.role] || u.role, u.role === 'admin' ? 'rojo' : 'neutra'), insignia(NOMBRES_ESTADO[u.status] || u.status, u.status === 'active' ? 'verde' : 'ambar')),
        h('p', { class: 'perfil__desde' }, `En la grada desde el ${fechaCorta(u.createdAt)}`),
        h('button', { class: 'btn btn--secundario btn--ancho', type: 'button', onClick: salir }, 'Cerrar sesión'),
      ),
      h(
        'section',
        { class: 'tarjeta perfil__marca', attrs: { 'aria-labelledby': 'marca-t' } },
        h('h2', { class: 'tarjeta__titulo', id: 'marca-t' }, 'Tu mejor partido'),
        h('p', {}, textoMarca(marca)),
        enlaceBoton(marca ? 'Superar mi marca' : 'Jugar mi primera partida', '/jugar'),
      ),
      h(
        'section',
        { class: 'tarjeta zona-peligro', attrs: { 'aria-labelledby': 'baja-t' } },
        h('h2', { class: 'tarjeta__titulo', id: 'baja-t' }, 'Darme de baja'),
        h('p', {}, 'Tu cuenta quedará eliminada y no podrás volver a entrar con ella.'),
        botonBaja,
      ),
    ),
  );
  return undefined;
}
