// Cabecera con la navegación. Se repinta cuando cambia el usuario o la ruta.
import { h, inicial } from './dom.js';
import { estado, alCambiarUsuario, esAdmin } from './estado.js';

const ENLACES_INVITADO = [['/', 'Inicio'], ['/entrar', 'Entrar'], ['/registro', 'Crear cuenta']];

function enlacesPara() {
  if (!estado.usuario) return ENLACES_INVITADO;
  const enlaces = [['/', 'Inicio'], ['/jugar', 'Jugar'], ['/perfil', 'Mi cuenta']];
  if (esAdmin()) enlaces.push(['/admin', 'Administración']);
  return enlaces;
}

/**
 * @param {HTMLElement} raiz Elemento <header>
 * @param {{ alSalir: () => void }} opciones
 */
export function montarCabecera(raiz, { alSalir }) {
  let rutaActual = '/';

  const boton = h('button', {
    class: 'cabecera__menu',
    type: 'button',
    attrs: { 'aria-expanded': 'false', 'aria-controls': 'nav-principal', 'aria-label': 'Abrir menú' },
  }, h('span', { class: 'cabecera__barras', attrs: { 'aria-hidden': 'true' } }));
  const nav = h('nav', { class: 'nav', id: 'nav-principal', attrs: { 'aria-label': 'Principal' } });
  const logo = h(
    'a',
    { class: 'logo', href: '#/', attrs: { 'aria-label': 'La Grada Colchonera, ir al inicio' } },
    h('span', { class: 'logo__escudo', attrs: { 'aria-hidden': 'true' } }),
    h('span', { class: 'logo__texto' }, 'La Grada ', h('strong', {}, 'Colchonera')),
  );
  raiz.replaceChildren(h('div', { class: 'cabecera__interior' }, logo, boton, nav));

  const abrir = (valor) => {
    nav.classList.toggle('nav--abierto', valor);
    boton.setAttribute('aria-expanded', String(valor));
    boton.setAttribute('aria-label', valor ? 'Cerrar menú' : 'Abrir menú');
  };
  boton.addEventListener('click', () => abrir(!nav.classList.contains('nav--abierto')));
  raiz.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && nav.classList.contains('nav--abierto')) { abrir(false); boton.focus(); } });
  nav.addEventListener('click', (ev) => { if (ev.target.closest('a')) abrir(false); });

  function pintar() {
    const lista = h('ul', { class: 'nav__lista' });
    for (const [ruta, texto] of enlacesPara()) {
      const activo = ruta === rutaActual;
      lista.append(h('li', {}, h('a', {
        class: `nav__enlace${activo ? ' nav__enlace--activo' : ''}`,
        href: `#${ruta}`,
        attrs: activo ? { 'aria-current': 'page' } : {},
      }, texto)));
    }
    const extras = [];
    if (estado.usuario) {
      extras.push(h(
        'div',
        { class: 'nav__usuario' },
        h('span', { class: 'avatar avatar--pequeno', attrs: { 'aria-hidden': 'true' } }, inicial(estado.usuario.email)),
        h('span', { class: 'nav__email', title: estado.usuario.email }, estado.usuario.email),
        h('button', { class: 'btn btn--fantasma btn--pequeno', type: 'button', onClick: alSalir }, 'Salir'),
      ));
    }
    nav.replaceChildren(lista, ...extras);
  }

  alCambiarUsuario(pintar);
  pintar();

  return {
    /** Marca la ruta actual en el menú. */
    marcarRuta(ruta) { rutaActual = ruta; abrir(false); pintar(); },
  };
}
