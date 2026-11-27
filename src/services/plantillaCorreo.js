// Plantilla común de los correos de la aplicación (confirmar la cuenta, recuperar la contraseña...).
// Devuelve el asunto, el texto plano y el HTML de un mensaje con la imagen de La Grada Colchonera.
//
// El HTML de un correo no es el de una web: los clientes de correo (Gmail, Outlook, el móvil...)
// ignoran las hojas de estilo y muchas propiedades modernas. Por eso va todo en tablas y con los
// estilos en línea, con un ancho máximo de 560 px y colores sólidos. Lo que viene de fuera
// (el enlace, el email) se escapa siempre antes de meterlo en el HTML.

const MARCA = Object.freeze({
  nombre: 'La Grada Colchonera',
  rojo: '#d4152f',
  rojoOscuro: '#a50f24',
  azul: '#0b1230',
  azulClaro: '#19235a',
  fondo: '#eef0f7',
  texto: '#1d2340',
  textoSuave: '#5b6385',
});

const FUENTE = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function escapeHtml(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/** Franja rojiblanca de la cabecera (como la camiseta), hecha con celdas para que se vea en cualquier cliente. */
function franjas() {
  const celdas = Array.from({ length: 9 }, (_, i) => (
    `<td style="height:8px;background:${i % 2 === 0 ? MARCA.rojo : '#ffffff'};font-size:0;line-height:0">&nbsp;</td>`
  )).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${celdas}</tr></table>`;
}

/**
 * Construye un correo con la plantilla de la marca.
 * @param {object} opciones
 * @param {string} opciones.asunto Asunto del correo
 * @param {string} opciones.titulo Titular grande del mensaje
 * @param {string[]} opciones.parrafos Párrafos del cuerpo (texto plano; se escapan)
 * @param {{ texto: string, url: string }} opciones.boton Botón principal (llamada a la acción)
 * @param {string} [opciones.aviso] Nota pequeña bajo el botón (caducidad, "si no has sido tú"...)
 * @param {string} [opciones.previa] Texto que los clientes de correo muestran junto al asunto
 * @returns {{ subject: string, text: string, html: string }}
 */
function crearCorreo({ asunto, titulo, parrafos, boton, aviso = '', previa = '' }) {
  const url = escapeHtml(boton.url);
  const cuerpo = parrafos
    .map((p) => `<p style="margin:0 0 16px;font-family:${FUENTE};font-size:16px;line-height:1.55;color:${MARCA.texto}">${escapeHtml(p)}</p>`)
    .join('');

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(asunto)}</title>
</head>
<body style="margin:0;padding:0;background:${MARCA.fondo}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(previa || titulo)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${MARCA.fondo}">
<tr><td align="center" style="padding:32px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #dde1ef">
    <tr><td style="background:${MARCA.azul};padding:26px 32px 22px;text-align:center">
      <div style="font-family:${FUENTE};font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#b4bde0">⚽ El juego de la afición</div>
      <div style="font-family:${FUENTE};font-size:26px;font-weight:800;color:#ffffff;margin-top:6px">La Grada <span style="color:#ff5a6e">Colchonera</span></div>
    </td></tr>
    <tr><td>${franjas()}</td></tr>
    <tr><td style="padding:34px 32px 8px">
      <h1 style="margin:0 0 18px;font-family:${FUENTE};font-size:24px;line-height:1.3;color:${MARCA.azul}">${escapeHtml(titulo)}</h1>
      ${cuerpo}
    </td></tr>
    <tr><td align="center" style="padding:8px 32px 26px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="center" style="border-radius:10px;background:${MARCA.rojo}">
          <a href="${url}" target="_blank" style="display:inline-block;padding:15px 30px;font-family:${FUENTE};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;border-bottom:3px solid ${MARCA.rojoOscuro}">${escapeHtml(boton.texto)}</a>
        </td>
      </tr></table>
    </td></tr>
    ${aviso ? `<tr><td style="padding:0 32px 22px"><p style="margin:0;font-family:${FUENTE};font-size:14px;line-height:1.5;color:${MARCA.textoSuave};text-align:center">${escapeHtml(aviso)}</p></td></tr>` : ''}
    <tr><td style="padding:0 32px 30px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${MARCA.fondo};border-radius:10px"><tr><td style="padding:14px 16px">
        <p style="margin:0 0 6px;font-family:${FUENTE};font-size:13px;color:${MARCA.textoSuave}">¿El botón no funciona? Copia este enlace en el navegador:</p>
        <p style="margin:0;font-family:${FUENTE};font-size:13px;word-break:break-all"><a href="${url}" target="_blank" style="color:${MARCA.rojoOscuro}">${url}</a></p>
      </td></tr></table>
    </td></tr>
    <tr><td style="background:${MARCA.azulClaro};padding:18px 32px;text-align:center">
      <p style="margin:0;font-family:${FUENTE};font-size:12px;line-height:1.5;color:#b4bde0">Has recibido este correo porque alguien ha usado tu dirección en ${MARCA.nombre}.<br>Proyecto de aficionado sin relación oficial con el club.</p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    titulo,
    '',
    ...parrafos.flatMap((p) => [p, '']),
    `${boton.texto}: ${boton.url}`,
    '',
    ...(aviso ? [aviso, ''] : []),
    `— ${MARCA.nombre}`,
  ].join('\n');

  return { subject: asunto, text, html };
}

module.exports = { crearCorreo, escapeHtml, MARCA };
