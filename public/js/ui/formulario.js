// Formulario de email y contraseña compartido por «Entrar» y «Registrarme».
// Valida mientras se escribe (una vez tocado el campo), enlaza los errores con aria-describedby
// y bloquea el envío doble mostrando una rueda de carga.
import { h } from './dom.js';
import { spinner, mensajeDeError } from './componentes.js';

export const MIN_PASSWORD = 8;
const PATRON_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarEmail(valor) {
  const email = valor.trim();
  if (!email) return 'Escribe tu email.';
  if (!PATRON_EMAIL.test(email)) return 'Escribe un email válido, por ejemplo aficionado@correo.com.';
  return '';
}

export function validarPassword(valor, { registro }) {
  if (!valor) return 'Escribe tu contraseña.';
  if (registro && valor.length < MIN_PASSWORD) return `Debe tener al menos ${MIN_PASSWORD} caracteres (llevas ${valor.length}).`;
  return '';
}

function campo({ id, etiqueta, tipo, autocompletar, ayuda, validar, extra }) {
  const error = h('p', { class: 'campo__error', id: `${id}-error`, hidden: true });
  const input = h('input', {
    id,
    name: id,
    type: tipo,
    class: 'campo__input',
    autocomplete: autocompletar,
    required: true,
    spellcheck: false,
    attrs: { 'aria-describedby': ayuda ? `${id}-ayuda ${id}-error` : `${id}-error` },
  });
  if (tipo === 'email') { input.inputMode = 'email'; input.autocapitalize = 'none'; }
  let tocado = false;

  const comprobar = () => {
    const mensaje = validar(input.value);
    error.textContent = mensaje;
    error.hidden = !mensaje;
    if (mensaje) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    return mensaje;
  };
  input.addEventListener('blur', () => { tocado = true; comprobar(); });
  input.addEventListener('input', () => { if (tocado) comprobar(); });

  const caja = h('div', { class: 'campo__caja' }, input, extra);
  const nodo = h(
    'div',
    { class: 'campo' },
    h('label', { class: 'campo__etiqueta', htmlFor: id }, etiqueta),
    caja,
    ayuda && h('p', { class: 'campo__ayuda', id: `${id}-ayuda` }, ayuda),
    error,
  );
  return { nodo, input, comprobar, marcarTocado: () => { tocado = true; } };
}

/**
 * @param {{ modo: 'entrar'|'registro', alEnviar: (email: string, password: string) => Promise<void> }} opciones
 */
export function crearFormularioAuth({ modo, alEnviar }) {
  const registro = modo === 'registro';

  const email = campo({
    id: 'email',
    etiqueta: 'Email',
    tipo: 'email',
    autocompletar: 'email',
    validar: validarEmail,
  });

  const botonVer = h('button', {
    class: 'campo__ver',
    type: 'button',
    attrs: { 'aria-label': 'Mostrar contraseña', 'aria-pressed': 'false' },
  }, 'Mostrar');
  const password = campo({
    id: 'password',
    etiqueta: 'Contraseña',
    tipo: 'password',
    autocompletar: registro ? 'new-password' : 'current-password',
    ayuda: registro ? `Mínimo ${MIN_PASSWORD} caracteres.` : '',
    validar: (v) => validarPassword(v, { registro }),
    extra: botonVer,
  });
  botonVer.addEventListener('click', () => {
    const visible = password.input.type === 'password';
    password.input.type = visible ? 'text' : 'password';
    botonVer.textContent = visible ? 'Ocultar' : 'Mostrar';
    botonVer.setAttribute('aria-pressed', String(visible));
    botonVer.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });

  const alerta = h('div', { class: 'alerta alerta--error', attrs: { role: 'alert' }, hidden: true });
  const textoBoton = registro ? 'Crear mi cuenta' : 'Entrar';
  const boton = h('button', { class: 'btn btn--primario btn--grande btn--ancho', type: 'submit' }, textoBoton);

  const formulario = h('form', { class: 'formulario', noValidate: true }, alerta, email.nodo, password.nodo, boton);

  const ocupado = (valor) => {
    boton.disabled = valor;
    boton.replaceChildren(...(valor ? [spinner(registro ? 'Creando cuenta…' : 'Entrando…')] : [textoBoton]));
    formulario.setAttribute('aria-busy', String(valor));
    email.input.readOnly = valor;
    password.input.readOnly = valor;
  };

  formulario.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    alerta.hidden = true;
    email.marcarTocado();
    password.marcarTocado();
    const fallos = [email, password].filter((c) => c.comprobar());
    if (fallos.length) { fallos[0].input.focus(); return; }

    ocupado(true);
    try {
      await alEnviar(email.input.value.trim(), password.input.value);
    } catch (error) {
      alerta.textContent = mensajeDeError(error, modo);
      alerta.hidden = false;
      password.input.value = '';
      ocupado(false);
      (error.status === 409 ? email : password).input.focus();
    }
  });

  return { nodo: formulario, enfocar: () => email.input.focus() };
}
