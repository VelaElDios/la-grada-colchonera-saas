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

function vistaEntrar() {
  app.innerHTML = formularioCredenciales({ titulo: 'Entrar', boton: 'Entrar', autocompletarPassword: 'current-password' })
    + '<p>¿Aún no tienes cuenta? <a href="#/registro">Regístrate</a></p>';
}

function vistaRegistro() {
  app.innerHTML = formularioCredenciales({ titulo: 'Crear cuenta', boton: 'Registrarme', autocompletarPassword: 'new-password' })
    + '<p>La contraseña debe tener al menos 8 caracteres. ¿Ya tienes cuenta? <a href="#/entrar">Entra</a></p>';
}

function vistaPerfil() {
  app.innerHTML = '<h2>Mi cuenta</h2><p>Inicia sesión para ver los datos de tu cuenta.</p>';
}

const vistas = {
  '/': { titulo: 'Inicio', render: vistaInicio },
  '/entrar': { titulo: 'Entrar', render: vistaEntrar },
  '/registro': { titulo: 'Registrarse', render: vistaRegistro },
  '/perfil': { titulo: 'Mi cuenta', render: vistaPerfil },
};

// --- Navegación ---------------------------------------------------------------

function pintarNav() {
  const ruta = rutaActual();
  const enlaces = ['/', '/entrar', '/registro'];
  nav.innerHTML = enlaces
    .map((r) => `<a href="#${r}" class="${r === ruta ? 'activo' : ''}">${vistas[r].titulo}</a>`)
    .join('');
}

async function render() {
  const vista = vistas[rutaActual()] || vistas['/'];

  pintarNav();
  if (estado.aviso) {
    mostrarMensaje(estado.aviso.texto, estado.aviso.tipo);
    estado.aviso = null;
  } else {
    mostrarMensaje('');
  }

  await vista.render();
}

window.addEventListener('hashchange', render);
render();
