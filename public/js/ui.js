// Capa de presentación: pinta las vistas y gestiona la navegación (#/ruta).
// No hace peticiones HTTP: todo pasa por el cliente de comunicación `api` (js/api.js).

const app = document.getElementById('app');
const nav = document.getElementById('nav');
const mensaje = document.getElementById('mensaje');

const estado = {
  usuario: null, // usuario con sesión iniciada (o null)
  aviso: null, // mensaje que debe mostrarse tras la siguiente navegación
};

// --- Utilidades ---------------------------------------------------------------

function mostrarMensaje(texto, tipo = 'error') {
  mensaje.textContent = texto;
  mensaje.className = `mensaje mensaje--${tipo}`;
  mensaje.hidden = !texto;
}

function rutaActual() {
  return location.hash.replace(/^#/, '') || '/';
}

/** Navega a una ruta, opcionalmente mostrando un aviso al llegar. */
function ir(ruta, aviso = null) {
  estado.aviso = aviso;
  if (rutaActual() === ruta) render();
  else location.hash = ruta;
}

// --- Vistas -------------------------------------------------------------------

async function vistaInicio() {
  app.innerHTML = `
    <h2>¡Bienvenido a la grada!</h2>
    <p>La red social de la afición rojiblanca. Muy pronto podrás compartir tus mensajes con el resto de colchoneros.</p>
    <p class="estado">Estado del servidor: <span id="estado-servidor">comprobando…</span></p>`;

  const elemento = document.getElementById('estado-servidor');
  try {
    const { status } = await api.getHealth();
    elemento.textContent = status === 'ok' ? 'en marcha ✅' : status;
  } catch {
    elemento.textContent = 'sin conexión ❌';
  }
}

function formularioCredenciales({ titulo, boton, autocompletarPassword }) {
  return `
    <h2>${titulo}</h2>
    <form id="formulario" class="formulario" novalidate>
      <label>Email
        <input name="email" type="email" autocomplete="email" required>
      </label>
      <label>Contraseña
        <input name="password" type="password" autocomplete="${autocompletarPassword}" minlength="8" required>
      </label>
      <button class="boton" type="submit">${boton}</button>
    </form>`;
}

/** Lee y valida en el cliente los datos del formulario (el servidor vuelve a validarlos). */
function leerCredenciales(formulario, { registro = false } = {}) {
  const { email, password } = Object.fromEntries(new FormData(formulario));
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Introduce un email válido');
  }
  if (!password) {
    throw new Error('Introduce la contraseña');
  }
  if (registro && password.length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres');
  }
  return { email, password };
}

/** Conecta el envío de un formulario con una acción asíncrona, mostrando los errores al usuario. */
function alEnviar(formulario, accion) {
  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const boton = formulario.querySelector('button[type="submit"]');
    boton.disabled = true;
    mostrarMensaje('');
    try {
      await accion();
    } catch (error) {
      mostrarMensaje(error.message, 'error');
    } finally {
      boton.disabled = false;
    }
  });
}

function vistaEntrar() {
  app.innerHTML = formularioCredenciales({ titulo: 'Entrar', boton: 'Entrar', autocompletarPassword: 'current-password' })
    + '<p>¿Aún no tienes cuenta? <a href="#/registro">Regístrate</a></p>';

  const formulario = document.getElementById('formulario');
  alEnviar(formulario, async () => {
    const { email, password } = leerCredenciales(formulario);
    estado.usuario = await api.login(email, password);
    ir('/perfil', { texto: `¡Hola, ${estado.usuario.email}! Ya estás en la grada.`, tipo: 'exito' });
  });
}

function vistaRegistro() {
  app.innerHTML = formularioCredenciales({ titulo: 'Crear cuenta', boton: 'Registrarme', autocompletarPassword: 'new-password' })
    + '<p>La contraseña debe tener al menos 8 caracteres. ¿Ya tienes cuenta? <a href="#/entrar">Entra</a></p>';

  const formulario = document.getElementById('formulario');
  alEnviar(formulario, async () => {
    const { email, password } = leerCredenciales(formulario, { registro: true });
    const usuario = await api.register(email, password);
    const texto = usuario.status === 'pending'
      ? 'Cuenta creada. Revisa tu correo para confirmarla antes de entrar.'
      : 'Cuenta creada. Ya puedes entrar con tu email y contraseña.';
    ir('/entrar', { texto, tipo: 'exito' });
  });
}

const NOMBRES_ROL = { user: 'Aficionado', admin: 'Administrador' };
const NOMBRES_ESTADO = { pending: 'Pendiente de confirmar', active: 'Activa', deleted: 'Eliminada' };

function vistaPerfil() {
  const usuario = estado.usuario;
  app.innerHTML = `
    <h2>Mi cuenta</h2>
    <dl class="datos">
      <dt>Email</dt><dd id="perfil-email"></dd>
      <dt>Rol</dt><dd>${NOMBRES_ROL[usuario.role] || usuario.role}</dd>
      <dt>Estado</dt><dd>${NOMBRES_ESTADO[usuario.status] || usuario.status}</dd>
      <dt>En la grada desde</dt><dd>${new Date(usuario.createdAt).toLocaleDateString('es-ES')}</dd>
    </dl>
    <p><button id="cerrar-sesion" class="boton boton--secundario" type="button">Cerrar sesión</button></p>`;
  // El email lo escribe el usuario: se inserta como texto para evitar inyección de HTML
  document.getElementById('perfil-email').textContent = usuario.email;
  document.getElementById('cerrar-sesion').addEventListener('click', cerrarSesion);
}

async function cerrarSesion() {
  try {
    await api.logout();
    estado.usuario = null;
    ir('/', { texto: 'Has cerrado sesión. ¡Hasta el próximo partido!', tipo: 'exito' });
  } catch (error) {
    mostrarMensaje(error.message, 'error');
  }
}

// protegida: solo con sesión iniciada · soloInvitados: solo sin sesión
const vistas = {
  '/': { titulo: 'Inicio', render: vistaInicio },
  '/entrar': { titulo: 'Entrar', render: vistaEntrar, soloInvitados: true },
  '/registro': { titulo: 'Registrarse', render: vistaRegistro, soloInvitados: true },
  '/perfil': { titulo: 'Mi cuenta', render: vistaPerfil, protegida: true },
};

// --- Navegación ---------------------------------------------------------------

function pintarNav() {
  const ruta = rutaActual();
  const enlaces = estado.usuario ? ['/', '/perfil'] : ['/', '/entrar', '/registro'];
  nav.innerHTML = enlaces
    .map((r) => `<a href="#${r}" class="${r === ruta ? 'activo' : ''}">${vistas[r].titulo}</a>`)
    .join('');

  if (estado.usuario) {
    const salir = document.createElement('button');
    salir.type = 'button';
    salir.textContent = 'Salir';
    salir.addEventListener('click', cerrarSesion);
    nav.append(salir);
  }
}

async function render() {
  const vista = vistas[rutaActual()] || vistas['/'];

  // Redirecciones de la interfaz (la protección real está en el servidor)
  if (vista.protegida && !estado.usuario) {
    ir('/entrar', estado.aviso || { texto: 'Inicia sesión para ver esa página.', tipo: 'error' });
    return;
  }
  if (vista.soloInvitados && estado.usuario) {
    ir('/perfil');
    return;
  }

  pintarNav();
  if (estado.aviso) {
    mostrarMensaje(estado.aviso.texto, estado.aviso.tipo);
    estado.aviso = null;
  } else {
    mostrarMensaje('');
  }

  await vista.render();
}

async function iniciar() {
  // Si ya había una sesión iniciada, se recupera: el usuario no tiene que volver a entrar al recargar
  try {
    estado.usuario = await api.me();
  } catch {
    estado.usuario = null;
  }
  // Si el servidor rechaza una petición por falta de sesión, se vuelve a la pantalla de entrada
  api.alExpirarSesion(() => {
    estado.usuario = null;
    ir('/entrar', { texto: 'Tu sesión ha caducado. Vuelve a entrar.', tipo: 'error' });
  });

  window.addEventListener('hashchange', render);
  render();
}

iniciar();
