# Hito 4: configuración de Google y del correo

Esta guía deja listos los dos servicios externos del Hito 4. Se hace una sola vez.

URL de la aplicación: `https://la-grada-colchonera-1081564062572.europe-southwest1.run.app`

## 1. Cliente OAuth de Google (inicio de sesión)

Se hace en el mismo proyecto de Google Cloud donde está Cloud Run.

1. Entra en <https://console.cloud.google.com/auth/overview> y elige el proyecto `la-grada-colchonera-…`.
2. Si te pide configurar la pantalla de consentimiento (*Google Auth Platform → Comenzar*):
   - Nombre de la aplicación: `La Grada Colchonera`. Correo de asistencia: el tuyo.
   - Público: **Externo**. Correo de contacto: el tuyo. Acepta las condiciones y crea.
3. En **Público** (*Audience*) deja la aplicación en *Pruebas* y añade tu correo (y el del profesor, si va a probarlo) como **usuarios de prueba**. Para que entre cualquiera, pulsa *Publicar aplicación*: con los permisos básicos (`openid`, `email`, `profile`) no hace falta verificación.
4. En **Clientes → Crear cliente**:
   - Tipo de aplicación: **Aplicación web**. Nombre: `La Grada Colchonera web`.
   - **URIs de redireccionamiento autorizados** (añade las dos):
     - `https://la-grada-colchonera-1081564062572.europe-southwest1.run.app/api/auth/google/callback`
     - `http://localhost:3000/api/auth/google/callback`
5. Al crear te muestra el **ID de cliente** y el **secreto del cliente**. Cópialos: son `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.

## 2. Correo saliente (SMTP con Gmail)

1. En la cuenta de Gmail que enviará los correos, activa la **verificación en dos pasos** (<https://myaccount.google.com/security>).
2. Entra en <https://myaccount.google.com/apppasswords>, crea una contraseña de aplicación llamada `La Grada` y copia las 16 letras (sin espacios).
3. La `SMTP_URL` queda así (la `@` del usuario se escribe `%40`):

   ```
   smtps://tucorreo%40gmail.com:abcdefghijklmnop@smtp.gmail.com:465
   ```

   y `MAIL_FROM`: `La Grada Colchonera <tucorreo@gmail.com>`.

> Gmail limita los envíos diarios (unos 500), de sobra para una práctica. Si prefieres no usar tu cuenta personal, Brevo ofrece SMTP gratuito con el mismo formato de URL.

## 3. Probar en local

Copia `.env.example` a `.env` y rellena `SMTP_URL`, `MAIL_FROM`, `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`, y arranca con `npm start`. Sin `SMTP_URL`, los correos no se envían: el enlace de confirmación aparece en la consola.

## 4. Producción (Cloud Run)

1. En Cloud Shell, desde la carpeta `scripts/gcp`: `PROJECT_ID=tu-proyecto bash configurar-hito4.sh` (pide los cuatro valores y los guarda en Secret Manager).
2. Fusiona la PR del despliegue (T25): a partir de ahí Cloud Run recibe esos secretos como variables de entorno.
3. Comprueba en la web: registro → llega el correo → enlace → entrar, y el botón *Entrar con Google*.

## Qué ocurre con las cuentas

| Caso | Resultado |
|---|---|
| Registro con email y contraseña | Cuenta `pending` + correo con enlace (24 h). Hasta confirmar, el login devuelve `ACCOUNT_PENDING` |
| Entrar con Google, email nuevo | Cuenta creada ya activa (`authProvider: google`) |
| Entrar con Google, email de una cuenta local pendiente | La cuenta queda confirmada (Google ya verificó el correo) |
| Entrar con Google, email de una cuenta eliminada | Rechazado |
| Administrador inicial | Se crea activo desde `ADMIN_EMAIL` / `ADMIN_PASSWORD` |
