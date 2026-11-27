// Página del enlace del correo «Cambia tu contraseña»: /#/restablecer?token=...
// El token se lee del fragmento y se quita de la barra de direcciones (no queda en el historial).
import { h } from '../dom.js';
import { api } from '../../api.js';
import { avisar } from '../avisos.js';
import { campo, crearFormulario, botonVerContrasenas, validarPassword, validarRepeticion, MIN_PASSWORD } from '../formulario.js';
import { enlaceBoton } from '../componentes.js';

function tokenDeLaUrl() {
  const consulta = location.hash.split('?')[1] || '';
  const token = new URLSearchParams(consulta).get('token');
  if (token) history.replaceState(null, '', `${location.pathname}#/restablecer`);
  return token;
}

let tokenGuardado = null; // por si la vista se vuelve a montar tras quitar el token de la URL

export function montar(raiz, { navegar }) {
  tokenGuardado = tokenDeLaUrl() || tokenGuardado;

  if (!tokenGuardado) {
    raiz.replaceChildren(h(
      'section',
      { class: 'auth tarjeta' },
      h('h1', { class: 'auth__titulo', tabIndex: -1 }, 'Enlace no válido'),
      h('p', { class: 'auth__texto' }, 'Para cambiar la contraseña abre el enlace del correo que te hemos enviado. Si ha caducado, pide otro.'),
      enlaceBoton('Pedir un enlace nuevo', '/recuperar', 'primario', 'btn--ancho'),
    ));
    return undefined;
  }

  const password = campo({
    id: 'password',
    etiqueta: 'Contraseña nueva',
    tipo: 'password',
    autocompletar: 'new-password',
    ayuda: `Mínimo ${MIN_PASSWORD} caracteres.`,
    validar: (v) => validarPassword(v, { registro: true }),
  });
  const repetida = campo({
    id: 'password2',
    etiqueta: 'Repite la contraseña nueva',
    tipo: 'password',
    autocompletar: 'new-password',
    validar: (v) => validarRepeticion(v, password.input.value),
  });
  password.nodo.querySelector('.campo__caja').append(botonVerContrasenas(password.input, repetida.input));
  password.input.addEventListener('input', () => { if (repetida.input.value) repetida.comprobar(); });

  const formulario = crearFormulario({
    campos: [password, repetida],
    textoBoton: 'Guardar la contraseña nueva',
    textoOcupado: 'Guardando…',
    contexto: 'restablecer contraseña',
    alEnviar: async () => {
      const { message } = await api.resetPassword(tokenGuardado, password.input.value);
      tokenGuardado = null;
      avisar(message, 'exito');
      navegar('/entrar');
    },
  });

  raiz.replaceChildren(h(
    'section',
    { class: 'auth tarjeta' },
    h('h1', { class: 'auth__titulo', tabIndex: -1 }, 'Pon una contraseña nueva'),
    h('p', { class: 'auth__texto' }, 'Al guardarla se cerrará la sesión en el resto de dispositivos.'),
    formulario.nodo,
    h('p', { class: 'auth__pie' }, h('a', { href: '#/recuperar' }, 'Pedir otro enlace')),
  ));
  return undefined;
}
