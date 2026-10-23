import { h } from '../dom.js';
import { api } from '../../api.js';
import { ponerUsuario } from '../estado.js';
import { avisar } from '../avisos.js';
import { crearFormularioAuth } from '../formulario.js';

export function montar(raiz, { navegar, destino }) {
  const formulario = crearFormularioAuth({
    modo: 'entrar',
    alEnviar: async (email, password) => {
      const usuario = await api.login(email, password);
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
    h('p', { class: 'auth__pie' }, '¿Aún no tienes cuenta? ', h('a', { href: '#/registro' }, 'Créala gratis')),
  ));
  return undefined;
}
