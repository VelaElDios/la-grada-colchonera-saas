import { h } from '../dom.js';
import { api } from '../../api.js';
import { avisar } from '../avisos.js';
import { crearFormularioAuth } from '../formulario.js';

export function montar(raiz, { navegar }) {
  const formulario = crearFormularioAuth({
    modo: 'registro',
    alEnviar: async (email, password) => {
      const usuario = await api.register(email, password);
      if (usuario.status !== 'pending') {
        avisar('Cuenta creada. Ya puedes entrar con tu email y contraseña.', 'exito');
      } else if (usuario.confirmationEmailSent) {
        avisar(`Cuenta creada. Te hemos enviado un correo a ${usuario.email} con un enlace para confirmarla (mira también en spam). Hasta entonces no podrás entrar.`, 'exito');
      } else {
        avisar('Cuenta creada, pero no hemos podido enviar el correo de confirmación. Inténtalo en unos minutos con «Reenviar el correo de confirmación».', 'error');
      }
      navegar('/entrar');
    },
  });
  raiz.replaceChildren(h(
    'section',
    { class: 'auth tarjeta' },
    h('h1', { class: 'auth__titulo', tabIndex: -1 }, 'Crear cuenta'),
    h('p', { class: 'auth__texto' }, 'Con tu cuenta podrás jugar y guardar tu mejor marca.'),
    formulario.nodo,
    h('p', { class: 'auth__pie' }, '¿Ya tienes cuenta? ', h('a', { href: '#/entrar' }, 'Entra')),
  ));
  return undefined;
}
