// Punto de entrada de la interfaz: enrutador por hash, control de acceso, foco y errores globales.
// Cada vista es un módulo en ui/vistas/ que exporta montar(raiz, contexto) y devuelve (opcional)
// una función de limpieza. El fetch vive solo en api.js.
import { api, ApiError } from './api.js';
import { estado, ponerUsuario, esAdmin } from './ui/estado.js';
import { avisar } from './ui/avisos.js';
import { montarCabecera } from './ui/cabecera.js';
import { estadoError, spinner, mensajeDeError } from './ui/componentes.js';
import { h } from './ui/dom.js';

// protegida: requiere sesión · soloAdmin: requiere rol admin · soloInvitados: solo sin sesión
// completa: el juego ocupa toda la pantalla (sin pie)
const RUTAS = {
  '/': { titulo: 'Inicio', cargar: () => import('./ui/vistas/inicio.js') },
  '/entrar': { titulo: 'Entrar', cargar: () => import('./ui/vistas/entrar.js'), soloInvitados: true },
  '/registro': { titulo: 'Crear cuenta', cargar: () => import('./ui/vistas/registro.js'), soloInvitados: true },
  '/perfil': { titulo: 'Mi cuenta', cargar: () => import('./ui/vistas/perfil.js'), protegida: true },
  '/jugar': { titulo: 'Jugar', cargar: () => import('./ui/vistas/jugar.js'), protegida: true, completa: true },
  '/admin': { titulo: 'Administración', cargar: () => import('./ui/vistas/admin.js'), protegida: true, soloAdmin: true, ancha: true },
};
const NO_ENCONTRADA = { titulo: 'Página no encontrada', cargar: () => import('./ui/vistas/noEncontrada.js') };

const raiz = document.getElementById('app');
const principal = document.getElementById('contenido');
const cuerpo = document.body;
let limpiar = null;
let ticket = 0;
let destinoPendiente = null;

const rutaActual = () => (location.hash.replace(/^#/, '') || '/').split('?')[0];

export function navegar(ruta) {
  if (rutaActual() === ruta) { renderizar(); return; }
  location.hash = ruta;
}

const cabecera = montarCabecera(document.getElementById('cabecera'), { alSalir: cerrarSesion });

async function cerrarSesion() {
  try { await api.logout(); } catch (error) { console.error('[grada] logout', error); }
  ponerUsuario(null);
  avisar('Has cerrado sesión. ¡Hasta el próximo partido!', 'info');
  navegar('/');
}

async function renderizar() {
  const miTicket = ++ticket;
  const ruta = rutaActual();
  const def = RUTAS[ruta] || NO_ENCONTRADA;

  // Redirecciones de la interfaz (la protección real está en el servidor)
  if (def.protegida && !estado.usuario) {
    destinoPendiente = ruta;
    avisar('Inicia sesión para ver esa página.', 'info');
    navegar('/entrar');
    return;
  }
  if (def.soloAdmin && !esAdmin()) {
    avisar('Esa página es solo para administradores.', 'error');
    navegar('/perfil');
    return;
  }
  if (ruta === '/' && estado.usuario) {
    navegar('/jugar'); // con sesión, el inicio es el menú del juego
    return;
  }
  if (def.soloInvitados && estado.usuario) {
    navegar('/jugar');
    return;
  }

  try { limpiar?.(); } catch (error) { console.error('[grada] limpieza de vista', error); }
  limpiar = null;

  cuerpo.classList.toggle('modo-completo', Boolean(def.completa));
  principal.classList.toggle('contenido--ancho', Boolean(def.ancha));
  cabecera.marcarRuta(ruta in RUTAS ? ruta : '');
  document.title = `${def.titulo} · La Grada Colchonera`;
  raiz.replaceChildren(spinner('Cargando…'));

  try {
    const vista = await def.cargar();
    if (miTicket !== ticket) return; // el usuario ya ha navegado a otra parte
    const destruir = await vista.montar(raiz, { navegar, destino: () => { const d = destinoPendiente; destinoPendiente = null; return d; } });
    if (miTicket !== ticket) { destruir?.(); return; }
    limpiar = destruir || null;
  } catch (error) {
    if (miTicket !== ticket) return;
    mensajeDeError(error, `vista ${ruta}`);
    raiz.replaceChildren(estadoError({
      titulo: 'Algo ha fallado',
      texto: error instanceof ApiError ? error.message : 'No hemos podido mostrar esta página.',
      reintentar: renderizar,
    }));
  }

  window.scrollTo(0, 0);
  // Mueve el foco al título para que los lectores de pantalla anuncien el cambio de página
  const titulo = raiz.querySelector('h1');
  if (titulo) { titulo.tabIndex = -1; titulo.focus({ preventScroll: true }); }
}

// Avisos que llegan en la URL (?aviso=...) cuando el servidor redirige a la interfaz,
// por ejemplo al abrir el enlace del correo de confirmación o al volver de Google
const AVISOS = {
  'cuenta-confirmada': { texto: '¡Cuenta confirmada! Ya puedes entrar en la grada.', tipo: 'exito' },
  'enlace-no-valido': { texto: 'El enlace de confirmación no es válido o ha caducado. Entra con tu email y contraseña para pedir otro.', tipo: 'error' },
  'google-ok': { texto: 'Has entrado con Google. ¡A jugar!', tipo: 'exito' },
  'google-cuenta-creada': { texto: 'Cuenta creada con tu cuenta de Google. ¡Bienvenido a la grada!', tipo: 'exito' },
  'google-cancelado': { texto: 'Has cancelado el acceso con Google.', tipo: 'info' },
  'google-rechazado': { texto: 'No hemos podido entrar con esa cuenta de Google (está eliminada o sin email verificado).', tipo: 'error' },
  'google-error': { texto: 'Algo ha fallado al entrar con Google. Inténtalo de nuevo.', tipo: 'error' },
  'google-no-disponible': { texto: 'El acceso con Google no está disponible ahora mismo.', tipo: 'error' },
  'error-servidor': { texto: 'Ha habido un problema en el servidor. Inténtalo de nuevo en unos minutos.', tipo: 'error' },
};

/** Lee el aviso de la URL (si lo hay) y lo quita de la barra de direcciones. */
function leerAvisoDeLaUrl() {
  const parametros = new URLSearchParams(location.search);
  const aviso = AVISOS[parametros.get('aviso')];
  if (parametros.has('aviso')) history.replaceState(null, '', location.pathname + location.hash);
  return aviso || null;
}

async function iniciar() {
  const avisoUrl = leerAvisoDeLaUrl();
  // Si ya había sesión, se recupera para que recargar no obligue a entrar de nuevo
  try {
    ponerUsuario(await api.me());
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      raiz.replaceChildren(estadoError({ titulo: 'Sin conexión', texto: mensajeDeError(error, 'recuperar sesión'), reintentar: iniciar }));
      return;
    }
    ponerUsuario(null);
  }
  api.alExpirarSesion(() => {
    ponerUsuario(null);
    avisar('Tu sesión ha caducado. Vuelve a entrar.', 'error');
    navegar('/entrar');
  });
  window.addEventListener('hashchange', renderizar);
  if (avisoUrl) avisar(avisoUrl.texto, avisoUrl.tipo);
  renderizar();
}

window.addEventListener('unhandledrejection', (ev) => {
  console.error('[grada] promesa sin capturar', ev.reason);
  avisar('Ha ocurrido un error inesperado.', 'error');
});

iniciar();
