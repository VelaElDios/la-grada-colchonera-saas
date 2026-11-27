// «¿Olvidaste tu contraseña?»: pide el email y el servidor envía un enlace para poner una nueva.
// La respuesta es la misma exista o no la cuenta (no se revela qué emails están registrados).
import { h } from '../dom.js';
import { api } from '../../api.js';
import { campo, crearFormulario, validarEmail } from '../formulario.js';

export function montar(raiz) {
  const email = campo({ id: 'email', etiqueta: 'Email de tu cuenta', tipo: 'email', autocompletar: 'email', validar: validarEmail });
  const hecho = h('div', { class: 'alerta alerta--exito', attrs: { role: 'status' }, hidden: true });

  const formulario = crearFormulario({
    campos: [email],
    textoBoton: 'Enviarme el enlace',
    textoOcupado: 'Enviando…',
    contexto: 'recuperar contraseña',
    alEnviar: async () => {
      const { message } = await api.forgotPassword(email.input.value.trim());
      hecho.textContent = message;
      hecho.hidden = false;
      formulario.nodo.hidden = true;
    },
  });

  raiz.replaceChildren(h(
    'section',
    { class: 'auth tarjeta' },
    h('h1', { class: 'auth__titulo', tabIndex: -1 }, 'Recuperar la contraseña'),
    h('p', { class: 'auth__texto' }, 'Escribe el email de tu cuenta y te mandaremos un enlace para poner una contraseña nueva. Caduca en una hora.'),
    formulario.nodo,
    hecho,
    h('p', { class: 'auth__pie' }, '¿Te has acordado? ', h('a', { href: '#/entrar' }, 'Vuelve a entrar')),
  ));
  return undefined;
}
