import { h } from '../dom.js';
import { api } from '../../api.js';
import { avisar } from '../avisos.js';
import { crearFormularioAuth } from '../formulario.js';

export function montar(raiz, { navegar }) {
  const formulario = crearFormularioAuth({
    modo: 'registro',
    alEnviar: async (email, password) => {
      const usuario = await api.register(email, password);
      avisar(
        usuario.status === 'pending'
          ? 'Cuenta creada. Revisa tu correo para confirmarla antes de entrar.'
          : 'Cuenta creada. Ya puedes entrar con tu email y contraseña.',
        'exito',
      );
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
