import { h, fechaCorta, NOMBRES_ROL, NOMBRES_ESTADO } from '../dom.js';
import { nodoAvatar } from '../avatar.js';
import { api } from '../../api.js';
import { estado, ponerUsuario } from '../estado.js';
import { avisar } from '../avisos.js';
import { confirmar } from '../modal.js';
import { insignia, enlaceBoton, mensajeDeError } from '../componentes.js';
import { leerMarca, textoMarca } from '../../game/marca.js';
import { campo, crearFormulario, botonVerContrasenas, validarPassword, validarRepeticion, MIN_PASSWORD } from '../formulario.js';

/** Tarjeta «Cambiar contraseña»: pide la actual y la nueva dos veces. Cierra las sesiones de otros dispositivos. */
function tarjetaContrasena() {
  const actual = campo({
    id: 'password-actual',
    etiqueta: 'Contraseña actual',
    tipo: 'password',
    autocompletar: 'current-password',
    validar: (v) => (v ? '' : 'Escribe tu contraseña actual.'),
  });
  const nueva = campo({
    id: 'password-nueva',
    etiqueta: 'Contraseña nueva',
    tipo: 'password',
    autocompletar: 'new-password',
    ayuda: `Mínimo ${MIN_PASSWORD} caracteres.`,
    validar: (v) => validarPassword(v, { registro: true }) || (v === actual.input.value ? 'Debe ser distinta de la actual.' : ''),
  });
  const repetida = campo({
    id: 'password-nueva2',
    etiqueta: 'Repite la contraseña nueva',
    tipo: 'password',
    autocompletar: 'new-password',
    validar: (v) => validarRepeticion(v, nueva.input.value),
  });
  actual.nodo.querySelector('.campo__caja').append(botonVerContrasenas(actual.input, nueva.input, repetida.input));
  nueva.input.addEventListener('input', () => { if (repetida.input.value) repetida.comprobar(); });

  const formulario = crearFormulario({
    campos: [actual, nueva, repetida],
    textoBoton: 'Cambiar contraseña',
    textoOcupado: 'Guardando…',
    contexto: 'cambiar contraseña',
    claseBoton: 'btn--secundario btn--ancho',
    alEnviar: async () => {
      await api.changePassword(actual.input.value, nueva.input.value);
      [actual, nueva, repetida].forEach((c) => c.vaciar());
      avisar('Contraseña cambiada. Se ha cerrado la sesión en tus otros dispositivos.', 'exito');
    },
  });

  return h(
    'section',
    { class: 'tarjeta perfil__contrasena', attrs: { 'aria-labelledby': 'contrasena-t' } },
    h('h2', { class: 'tarjeta__titulo', id: 'contrasena-t' }, 'Cambiar contraseña'),
    h('p', { class: 'perfil__nota' }, '¿Entras con Google y no tienes contraseña? Puedes crear una con «¿Olvidaste tu contraseña?» en la pantalla de entrar.'),
    formulario.nodo,
  );
}

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
      texto: 'Tu cuenta y tu progreso en el juego se eliminarán y saldrás del ranking. Esta acción no se puede deshacer: si vuelves, empezarás con una cuenta nueva (puedes usar el mismo email o Google).',
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
        nodoAvatar(u, 'grande'),
        u.apodo ? h('p', { class: 'perfil__mote' }, u.apodo) : null,
        h('p', { class: 'perfil__email' }, u.email),
        h('a', { class: 'perfil__cambiar', href: '#/jugar' }, u.apodo ? 'Cambiar mote y avatar (en el juego, «Tu ficha»)' : 'Ponte un mote y un avatar en el juego'),
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
      tarjetaContrasena(),
      h(
        'section',
        { class: 'tarjeta zona-peligro', attrs: { 'aria-labelledby': 'baja-t' } },
        h('h2', { class: 'tarjeta__titulo', id: 'baja-t' }, 'Darme de baja'),
        h('p', {}, 'Tu cuenta y tu progreso se eliminarán. Si vuelves, empezarás de cero con una cuenta nueva.'),
        botonBaja,
      ),
    ),
  );
  return undefined;
}
