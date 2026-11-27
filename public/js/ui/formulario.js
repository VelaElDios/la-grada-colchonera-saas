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

/** Al crear la cuenta, la contraseña se escribe dos veces para no registrarse con una errata. */
export function validarRepeticion(valor, password) {
  if (!valor) return 'Repite la contraseña.';
  if (valor !== password) return 'Las contraseñas no coinciden.';
  return '';
}

export function validarPassword(valor, { registro }) {
  if (!valor) return 'Escribe tu contraseña.';
  if (registro && valor.length < MIN_PASSWORD) return `Debe tener al menos ${MIN_PASSWORD} caracteres (llevas ${valor.length}).`;
  return '';
}

export function campo({ id, etiqueta, tipo, autocompletar, ayuda, validar, extra }) {
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
  let editado = false; // se ha escrito algo desde la última vez que se vació

  const comprobar = () => {
    const mensaje = validar(input.value);
    error.textContent = mensaje;
    error.hidden = !mensaje;
    if (mensaje) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    return mensaje;
  };
  // Al salir de un campo solo se avisa si se ha escrito en él: un campo vacío que nadie ha tocado no da error
  // (si no, el aviso aparece al pulsar otro botón, mueve la página y ese clic se pierde)
  input.addEventListener('blur', () => { if (editado || input.value) { tocado = true; comprobar(); } });
  input.addEventListener('input', () => { editado = true; if (tocado) comprobar(); });
  /** Vacía el campo sin mostrar error (tras un fallo del servidor se borra la contraseña). */
  const vaciar = () => {
    input.value = '';
    tocado = false;
    editado = false;
    error.hidden = true;
    input.removeAttribute('aria-invalid');
  };

  const caja = h('div', { class: 'campo__caja' }, input, extra);
  const nodo = h(
    'div',
    { class: 'campo' },
    h('label', { class: 'campo__etiqueta', htmlFor: id }, etiqueta),
    caja,
    ayuda && h('p', { class: 'campo__ayuda', id: `${id}-ayuda` }, ayuda),
    error,
  );
  return { nodo, input, comprobar, vaciar, marcarTocado: () => { tocado = true; } };
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
  // Solo al registrarse: segundo campo para confirmar la contraseña
  const repetida = registro ? campo({
    id: 'password2',
    etiqueta: 'Repite la contraseña',
    tipo: 'password',
    autocompletar: 'new-password',
    validar: (v) => validarRepeticion(v, password.input.value),
  }) : null;
  // Si ya se ha comprobado la repetición, se vuelve a mirar al cambiar la primera contraseña
  if (repetida) password.input.addEventListener('input', () => { if (repetida.input.value) repetida.comprobar(); });

  botonVer.addEventListener('click', () => {
    const visible = password.input.type === 'password';
    password.input.type = visible ? 'text' : 'password';
    if (repetida) repetida.input.type = password.input.type;
    botonVer.textContent = visible ? 'Ocultar' : 'Mostrar';
    botonVer.setAttribute('aria-pressed', String(visible));
    botonVer.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });

  const alerta = h('div', { class: 'alerta alerta--error', attrs: { role: 'alert' }, hidden: true });
  const textoBoton = registro ? 'Crear mi cuenta' : 'Entrar';
  const boton = h('button', { class: 'btn btn--primario btn--grande btn--ancho', type: 'submit' }, textoBoton);

  const campos = [email, password, ...(repetida ? [repetida] : [])];
  const formulario = h('form', { class: 'formulario', noValidate: true }, alerta, ...campos.map((c) => c.nodo), boton);

  const ocupado = (valor) => {
    boton.disabled = valor;
    boton.replaceChildren(...(valor ? [spinner(registro ? 'Creando cuenta…' : 'Entrando…')] : [textoBoton]));
    formulario.setAttribute('aria-busy', String(valor));
    campos.forEach((c) => { c.input.readOnly = valor; });
  };

  formulario.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    alerta.hidden = true;
    campos.forEach((c) => c.marcarTocado());
    const fallos = campos.filter((c) => c.comprobar());
    if (fallos.length) { fallos[0].input.focus(); return; }

    ocupado(true);
    try {
      await alEnviar(email.input.value.trim(), password.input.value);
    } catch (error) {
      alerta.textContent = mensajeDeError(error, modo);
      alerta.hidden = false;
      password.vaciar();
      repetida?.vaciar();
      ocupado(false);
      (error.status === 409 ? email : password).input.focus();
    }
  });

  return { nodo: formulario, enfocar: () => email.input.focus() };
}

/** Botón «Mostrar / Ocultar» para uno o varios campos de contraseña (se cambian todos a la vez). */
export function botonVerContrasenas(...inputs) {
  const boton = h('button', {
    class: 'campo__ver',
    type: 'button',
    attrs: { 'aria-label': 'Mostrar contraseña', 'aria-pressed': 'false' },
  }, 'Mostrar');
  boton.addEventListener('click', () => {
    const visible = inputs[0].type === 'password';
    inputs.forEach((i) => { i.type = visible ? 'text' : 'password'; });
    boton.textContent = visible ? 'Ocultar' : 'Mostrar';
    boton.setAttribute('aria-pressed', String(visible));
    boton.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });
  return boton;
}

/**
 * Formulario genérico con los campos ya creados con `campo`: valida al enviar, muestra el error del
 * servidor arriba, bloquea el doble envío con una rueda y vacía los campos de contraseña si falla.
 * Lo usan «¿Olvidaste tu contraseña?», «Poner una contraseña nueva» y «Cambiar contraseña».
 * @param {{ campos: object[], textoBoton: string, textoOcupado: string, alEnviar: () => Promise<void>, contexto: string }} opciones
 */
export function crearFormulario({ campos, textoBoton, textoOcupado, alEnviar, contexto, claseBoton = 'btn--primario btn--grande btn--ancho' }) {
  const alerta = h('div', { class: 'alerta alerta--error', attrs: { role: 'alert' }, hidden: true });
  const boton = h('button', { class: `btn ${claseBoton}`, type: 'submit' }, textoBoton);
  const formulario = h('form', { class: 'formulario', noValidate: true }, alerta, ...campos.map((c) => c.nodo), boton);

  const ocupado = (valor) => {
    boton.disabled = valor;
    boton.replaceChildren(...(valor ? [spinner(textoOcupado)] : [textoBoton]));
    formulario.setAttribute('aria-busy', String(valor));
    campos.forEach((c) => { c.input.readOnly = valor; });
  };

  formulario.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    alerta.hidden = true;
    campos.forEach((c) => c.marcarTocado());
    const fallos = campos.filter((c) => c.comprobar());
    if (fallos.length) { fallos[0].input.focus(); return; }

    ocupado(true);
    try {
      await alEnviar();
      ocupado(false);
    } catch (error) {
      alerta.textContent = mensajeDeError(error, contexto);
      alerta.hidden = false;
      campos.filter((c) => c.input.type === 'password' || c.input.autocomplete.endsWith('password')).forEach((c) => c.vaciar());
      ocupado(false);
      campos[0].input.focus();
    }
  });

  return { nodo: formulario, enfocar: () => campos[0].input.focus() };
}
