import { h } from '../dom.js';
import { api } from '../../api.js';
import { ponerUsuario } from '../estado.js';
import { avisar } from '../avisos.js';
import { crearFormularioAuth } from '../formulario.js';
import { mensajeDeError } from '../componentes.js';
import { crearBloqueGoogle } from '../google.js';

export function montar(raiz, { navegar, destino }) {
  let ultimoEmail = '';

  // Cuenta pendiente de confirmar: se ofrece reenviar el correo
  const botonReenviar = h('button', { class: 'btn btn--secundario btn--ancho', type: 'button' }, 'Reenviar el correo de confirmación');
  const reenvio = h(
    'div',
    { class: 'aviso-reenvio', hidden: true },
    h('p', {}, '¿No te ha llegado el correo de confirmación? Mira en la carpeta de spam o pide otro.'),
    botonReenviar,
  );
  botonReenviar.addEventListener('click', async () => {
    botonReenviar.disabled = true;
    try {
      const { message } = await api.resendConfirmation(ultimoEmail);
      avisar(message, 'exito');
    } catch (error) {
      avisar(mensajeDeError(error, 'reenviar confirmación'), 'error');
    } finally {
      botonReenviar.disabled = false;
    }
  });

  const formulario = crearFormularioAuth({
    modo: 'entrar',
    alEnviar: async (email, password) => {
      ultimoEmail = email;
      let usuario;
      try {
        usuario = await api.login(email, password);
      } catch (error) {
        reenvio.hidden = error.code !== 'ACCOUNT_PENDING';
        throw error;
      }
      ponerUsuario(usuario);
      avisar(`Bienvenido, ${usuario.email}`, 'exito');
      navegar(destino() || '/jugar');
    },
  });
  raiz.replaceChildren(h(
    'section',
    { class: 'auth tarjeta' },
    h('h1', { class: 'auth__titulo', tabIndex: -1 }, 'Entrar'),
    h('p', { class: 'auth__texto' }, 'Vuelve a la grada con tu email y contraseña.'),
    formulario.nodo,
    reenvio,
    crearBloqueGoogle('Entrar con Google'),
    h('p', { class: 'auth__pie' }, '¿Aún no tienes cuenta? ', h('a', { href: '#/registro' }, 'Créala gratis')),
  ));
  return undefined;
}
