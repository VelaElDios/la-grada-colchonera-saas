// Capa de presentación: pinta las vistas y gestiona la navegación (#/ruta).
// No hace peticiones HTTP: todo pasa por el cliente de comunicación `api` (js/api.js).

const app = document.getElementById('app');
const contenido = document.querySelector('.contenido');
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
    <p><button id="cerrar-sesion" class="boton boton--secundario" type="button">Cerrar sesión</button></p>
    <section class="zona-peligro">
      <h3>Darme de baja</h3>
      <p>Tu cuenta quedará eliminada y no podrás volver a entrar con ella.</p>
      <button id="eliminar-cuenta" class="boton boton--peligro" type="button">Eliminar mi cuenta</button>
    </section>`;
  // El email lo escribe el usuario: se inserta como texto para evitar inyección de HTML
  document.getElementById('perfil-email').textContent = usuario.email;
  document.getElementById('cerrar-sesion').addEventListener('click', cerrarSesion);
  document.getElementById('eliminar-cuenta').addEventListener('click', eliminarMiCuenta);
}

async function eliminarMiCuenta() {
  if (!confirm('¿Seguro que quieres eliminar tu cuenta? Esta acción no se puede deshacer.')) return;
  try {
    await api.deleteUser(estado.usuario.id);
    await api.logout().catch(() => {});
    estado.usuario = null;
    ir('/', { texto: 'Tu cuenta se ha eliminado. ¡Gracias por pasar por la grada!', tipo: 'exito' });
  } catch (error) {
    mostrarMensaje(error.message, 'error');
  }
}

/** Crea un elemento con texto (siempre como texto, nunca como HTML). */
function crear(etiqueta, texto = '', clase = '') {
  const elemento = document.createElement(etiqueta);
  if (texto) elemento.textContent = texto;
  if (clase) elemento.className = clase;
  return elemento;
}

async function vistaAdmin() {
  app.innerHTML = `
    <h2>Panel de administración</h2>
    <p>Usuarios registrados en la grada. Puedes cambiar su rol o eliminar su cuenta.</p>
    <div class="tabla-contenedor">
      <table class="tabla">
        <thead><tr><th>Email</th><th>Rol</th><th>Estado</th><th>Alta</th><th>Acciones</th></tr></thead>
        <tbody id="usuarios"><tr><td colspan="5">Cargando…</td></tr></tbody>
      </table>
    </div>`;
  await pintarUsuarios();
}

async function pintarUsuarios() {
  const cuerpo = document.getElementById('usuarios');
  if (!cuerpo) return;
  let usuarios;
  try {
    usuarios = await api.listUsers();
  } catch (error) {
    cuerpo.innerHTML = '';
    mostrarMensaje(error.message, 'error');
    return;
  }

  cuerpo.replaceChildren(...usuarios.map((usuario) => {
    const fila = document.createElement('tr');
    const esYo = usuario.id === estado.usuario.id;
    const celdas = [
      ['Email', crear('td', esYo ? `${usuario.email} (tú)` : usuario.email)],
      ['Rol', crear('td', NOMBRES_ROL[usuario.role] || usuario.role)],
      ['Estado', crear('td', NOMBRES_ESTADO[usuario.status] || usuario.status, `estado-${usuario.status}`)],
      ['Alta', crear('td', new Date(usuario.createdAt).toLocaleDateString('es-ES'))],
    ];
    // La etiqueta de cada celda se muestra en el móvil, donde cada fila se ve como una tarjeta
    celdas.forEach(([etiqueta, celda]) => { celda.dataset.etiqueta = etiqueta; });
    fila.append(...celdas.map(([, celda]) => celda));

    const acciones = crear('td', '', 'acciones');
    acciones.dataset.etiqueta = 'Acciones';
    if (usuario.status !== 'deleted') {
      const nuevoRol = usuario.role === 'admin' ? 'user' : 'admin';
      const cambiar = crear('button', nuevoRol === 'admin' ? 'Hacer admin' : 'Quitar admin', 'boton boton--pequeno boton--secundario');
      cambiar.type = 'button';
      cambiar.addEventListener('click', () => accionAdmin(
        () => api.changeRole(usuario.id, nuevoRol),
        `Rol de ${usuario.email} actualizado.`,
      ));

      const eliminar = crear('button', 'Eliminar', 'boton boton--pequeno boton--peligro');
      eliminar.type = 'button';
      eliminar.addEventListener('click', () => {
        if (!confirm(`¿Eliminar la cuenta de ${usuario.email}?`)) return;
        accionAdmin(() => api.deleteUser(usuario.id), `Cuenta de ${usuario.email} eliminada.`);
      });
      acciones.append(cambiar, eliminar);
    }
    fila.append(acciones);
    return fila;
  }));
}

/** Ejecuta una acción del panel, muestra el resultado y refresca el listado. */
async function accionAdmin(accion, textoExito) {
  try {
    await accion();
    estado.usuario = await api.me(); // por si el administrador ha cambiado su propio rol
    if (estado.usuario.role !== 'admin') {
      ir('/perfil', { texto: 'Ya no tienes rol de administrador.', tipo: 'exito' });
      return;
    }
    mostrarMensaje(textoExito, 'exito');
    await pintarUsuarios();
  } catch (error) {
    mostrarMensaje(error.message, 'error');
  }
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

// protegida: solo con sesión iniciada · soloInvitados: solo sin sesión · soloAdmin: solo administradores
const vistas = {
  '/': { titulo: 'Inicio', render: vistaInicio },
  '/entrar': { titulo: 'Entrar', render: vistaEntrar, soloInvitados: true },
  '/registro': { titulo: 'Registrarse', render: vistaRegistro, soloInvitados: true },
  '/perfil': { titulo: 'Mi cuenta', render: vistaPerfil, protegida: true },
  '/admin': { titulo: 'Administración', render: vistaAdmin, protegida: true, soloAdmin: true, ancho: true },
};

// --- Navegación ---------------------------------------------------------------

function pintarNav() {
  const ruta = rutaActual();
  let enlaces = ['/', '/entrar', '/registro'];
  if (estado.usuario) {
    enlaces = estado.usuario.role === 'admin' ? ['/', '/perfil', '/admin'] : ['/', '/perfil'];
  }
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
  if (vista.soloAdmin && estado.usuario.role !== 'admin') {
    ir('/perfil', { texto: 'Esa página es solo para administradores.', tipo: 'error' });
    return;
  }
  if (vista.soloInvitados && estado.usuario) {
    ir('/perfil');
    return;
  }

  pintarNav();
  contenido.classList.toggle('contenido--ancho', Boolean(vista.ancho));
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
