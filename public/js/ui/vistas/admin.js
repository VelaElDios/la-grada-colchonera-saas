// Panel de administración: listado con búsqueda, cambio de rol y baja de cuentas.
import { h, fechaCorta, NOMBRES_ROL, NOMBRES_ESTADO } from '../dom.js';
import { api } from '../../api.js';
import { estado, ponerUsuario } from '../estado.js';
import { avisar } from '../avisos.js';
import { confirmar } from '../modal.js';
import { insignia, listaEsqueleto, estadoVacio, estadoError, mensajeDeError } from '../componentes.js';

export function montar(raiz, { navegar }) {
  let usuarios = [];
  let filtro = '';
  let vivo = true;

  const contadores = h('ul', { class: 'contadores' });
  const busqueda = h('input', { class: 'campo__input', type: 'search', id: 'buscar', placeholder: 'Buscar por email…', autocomplete: 'off' });
  const zona = h('div', { class: 'admin__zona', attrs: { 'aria-live': 'polite' } });

  busqueda.addEventListener('input', () => { filtro = busqueda.value.trim().toLowerCase(); pintar(); });

  const ocupados = new Set();
  async function accion(id, tarea, textoExito) {
    if (ocupados.has(id)) return;
    ocupados.add(id);
    pintar();
    try {
      await tarea();
      const yo = await api.me(); // por si el administrador ha cambiado su propio rol
      if (!vivo) return;
      ponerUsuario(yo);
      if (yo.role !== 'admin') {
        avisar('Ya no tienes rol de administrador.', 'info');
        navegar('/perfil');
        return;
      }
      avisar(textoExito, 'exito');
      await cargar(false);
    } catch (error) {
      avisar(mensajeDeError(error, 'admin'), 'error');
    } finally {
      ocupados.delete(id);
      if (vivo) pintar();
    }
  }

  function filaAcciones(u) {
    if (u.status === 'deleted') return h('span', { class: 'texto-suave' }, 'Sin acciones');
    const esYo = u.id === estado.usuario.id;
    const nuevoRol = u.role === 'admin' ? 'user' : 'admin';
    const ocupado = ocupados.has(u.id);
    return h(
      'div',
      { class: 'acciones' },
      h('button', {
        class: 'btn btn--secundario btn--pequeno', type: 'button', disabled: ocupado,
        onClick: async () => {
          if (esYo && nuevoRol === 'user' && !(await confirmar({ titulo: '¿Quitarte el rol de administrador?', texto: 'Perderás el acceso a este panel.', confirmar: 'Quitar mi rol', peligro: true }))) return;
          accion(u.id, () => api.changeRole(u.id, nuevoRol), `Rol de ${u.email} actualizado.`);
        },
      }, nuevoRol === 'admin' ? 'Hacer admin' : 'Quitar admin'),
      h('button', {
        class: 'btn btn--peligro btn--pequeno', type: 'button', disabled: ocupado,
        onClick: async () => {
          const ok = await confirmar({ titulo: esYo ? '¿Eliminar tu propia cuenta?' : '¿Eliminar esta cuenta?', texto: `${u.email} no podrá volver a entrar. No se puede deshacer.`, confirmar: 'Eliminar', peligro: true });
          if (!ok) return;
          if (esYo) { await api.deleteUser(u.id).catch((e) => avisar(mensajeDeError(e), 'error')); ponerUsuario(null); navegar('/'); return; }
          accion(u.id, () => api.deleteUser(u.id), `Cuenta de ${u.email} eliminada.`);
        },
      }, 'Eliminar'),
    );
  }

  function pintarContadores() {
    const total = usuarios.length;
    const activos = usuarios.filter((u) => u.status === 'active').length;
    const admins = usuarios.filter((u) => u.role === 'admin' && u.status !== 'deleted').length;
    contadores.replaceChildren(...[['Cuentas', total], ['Activas', activos], ['Admins', admins]].map(([t, n]) => h('li', { class: 'tarjeta contador' }, h('span', { class: 'contador__numero' }, String(n)), h('span', { class: 'contador__texto' }, t))));
  }

  function pintar() {
    pintarContadores();
    const visibles = usuarios.filter((u) => u.email.toLowerCase().includes(filtro));
    if (!usuarios.length) {
      zona.replaceChildren(estadoVacio({ titulo: 'Aún no hay cuentas', texto: 'Cuando alguien se registre aparecerá aquí.' }));
      return;
    }
    if (!visibles.length) {
      zona.replaceChildren(estadoVacio({ titulo: 'Sin resultados', texto: `Ninguna cuenta coincide con «${busqueda.value.trim()}».`, accion: h('button', { class: 'btn btn--secundario', type: 'button', onClick: () => { busqueda.value = ''; filtro = ''; pintar(); busqueda.focus(); } }, 'Limpiar búsqueda') }));
      return;
    }
    const filas = visibles.map((u) => h(
      'tr',
      { class: u.status === 'deleted' ? 'fila--baja' : '' },
      h('td', { dataset: { etiqueta: 'Email' }, class: 'celda-email' }, u.email, u.id === estado.usuario.id ? h('span', { class: 'texto-suave' }, ' (tú)') : null),
      h('td', { dataset: { etiqueta: 'Rol' } }, insignia(NOMBRES_ROL[u.role] || u.role, u.role === 'admin' ? 'rojo' : 'neutra')),
      h('td', { dataset: { etiqueta: 'Estado' } }, insignia(NOMBRES_ESTADO[u.status] || u.status, u.status === 'active' ? 'verde' : u.status === 'pending' ? 'ambar' : 'gris')),
      h('td', { dataset: { etiqueta: 'Alta' } }, fechaCorta(u.createdAt)),
      h('td', { dataset: { etiqueta: 'Acciones' } }, filaAcciones(u)),
    ));
    zona.replaceChildren(h(
      'div',
      { class: 'tabla-caja' },
      h('table', { class: 'tabla' },
        h('caption', { class: 'sr-only' }, `Usuarios registrados (${visibles.length})`),
        h('thead', {}, h('tr', {}, ...['Email', 'Rol', 'Estado', 'Alta', 'Acciones'].map((t) => h('th', { scope: 'col' }, t)))),
        h('tbody', {}, ...filas)),
    ));
  }

  async function cargar(conEsqueleto = true) {
    if (conEsqueleto) zona.replaceChildren(listaEsqueleto(5));
    try {
      const lista = await api.listUsers();
      if (!vivo) return;
      usuarios = lista;
      pintar();
    } catch (error) {
      if (!vivo) return;
      zona.replaceChildren(estadoError({ texto: mensajeDeError(error, 'listar usuarios'), reintentar: () => cargar() }));
    }
  }

  raiz.replaceChildren(
    h('h1', { class: 'pagina__titulo', tabIndex: -1 }, 'Panel de administración'),
    h('p', { class: 'pagina__texto' }, 'Usuarios registrados en la grada. Puedes cambiar su rol o dar de baja su cuenta.'),
    contadores,
    h('div', { class: 'campo admin__buscar' }, h('label', { class: 'campo__etiqueta', htmlFor: 'buscar' }, 'Buscar usuario'), busqueda),
    zona,
  );
  pintarContadores();
  cargar();
  return () => { vivo = false; };
}
