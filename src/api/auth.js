// Rutas HTTP de autenticación: registro, confirmación del correo, inicio y cierre de sesión,
// y usuario actual.
const express = require('express');
const { requireAuth } = require('./currentUser');
const { STATUS } = require('../models/user');
const { AppError, ValidationError, ServiceUnavailableError } = require('../services/errors');

// express-session usa callbacks: se envuelven en promesas para usarlas con async/await
const regenerate = (session) => new Promise((resolve, reject) => {
  session.regenerate((error) => (error ? reject(error) : resolve()));
});
const destroy = (session) => new Promise((resolve, reject) => {
  session.destroy((error) => (error ? reject(error) : resolve()));
});

/**
 * URL pública de la aplicación: la configurada (PUBLIC_URL) o la de la propia petición.
 * Detrás del proxy HTTPS de Cloud Run, req.protocol es "https" gracias a "trust proxy".
 */
function publicBaseUrl(req, publicUrl) {
  return publicUrl || `${req.protocol}://${req.get('host')}`;
}

function createAuthRouter({ userService, accountConfirmation, sessionCookieName, publicUrl }) {
  const router = express.Router();

  router.post('/register', async (req, res) => {
    const user = await userService.registerUser({
      email: req.body?.email,
      password: req.body?.password,
    });
    req.log.info('user.registered', 'Nuevo usuario registrado', { userId: user.id, email: user.email, status: user.status });

    // Correo de confirmación. Si falla el envío, la cuenta ya está creada: se avisa al usuario
    // para que pida otro correo más tarde (no se le obliga a registrarse de nuevo).
    let confirmationEmailSent = false;
    if (user.status === STATUS.PENDING) {
      try {
        confirmationEmailSent = await accountConfirmation.sendConfirmation(user, { baseUrl: publicBaseUrl(req, publicUrl) });
        req.log.info('mail.confirmation_sent', 'Correo de confirmación enviado', { userId: user.id });
      } catch (error) {
        req.log.error('mail.failed', 'No se ha podido enviar el correo de confirmación', { userId: user.id, error });
      }
    }
    res.status(201).json({ ...user, confirmationEmailSent });
  });

  // Enlace del correo de confirmación. Lo abre el navegador, así que responde con una
  // redirección a la interfaz, que muestra el resultado (y no con JSON).
  router.get('/confirm', async (req, res) => {
    try {
      const user = await accountConfirmation.confirm(req.query.token);
      req.log.info('user.confirmed', 'Cuenta confirmada por correo', { userId: user.id });
      res.redirect(303, '/?aviso=cuenta-confirmada#/entrar');
    } catch (error) {
      if (error instanceof AppError) {
        req.log.warn('user.confirm_failed', 'Enlace de confirmación rechazado', { reason: error.code });
        res.redirect(303, '/?aviso=enlace-no-valido#/entrar');
      } else {
        req.log.error('http.error', 'Error interno al confirmar la cuenta', { error });
        res.redirect(303, '/?aviso=error-servidor#/entrar');
      }
    }
  });

  // Reenvío del correo de confirmación. La respuesta es la misma exista o no la cuenta.
  router.post('/resend-confirmation', async (req, res) => {
    const email = req.body?.email;
    if (typeof email !== 'string' || !email.trim()) {
      throw new ValidationError('Indica el email con el que te registraste');
    }
    let sent;
    try {
      sent = await accountConfirmation.resendConfirmation(email, { baseUrl: publicBaseUrl(req, publicUrl) });
    } catch (error) {
      req.log.error('mail.failed', 'No se ha podido reenviar el correo de confirmación', { error });
      throw new ServiceUnavailableError('No se ha podido enviar el correo. Inténtalo de nuevo en unos minutos.');
    }
    if (sent) req.log.info('mail.confirmation_sent', 'Correo de confirmación reenviado', { email: email.trim().toLowerCase() });
    res.status(202).json({
      message: 'Si hay una cuenta pendiente con ese email, te hemos enviado un nuevo enlace de confirmación.',
    });
  });

  router.post('/login', async (req, res) => {
    let user;
    try {
      user = await userService.authenticate({
        email: req.body?.email,
        password: req.body?.password,
      });
    } catch (error) {
      // Intento fallido: se registra el email (no la contraseña) para detectar abusos
      req.log.warn('auth.login_failed', 'Inicio de sesión rechazado', {
        email: typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : null,
        reason: error.code,
        ip: req.ip,
      });
      throw error;
    }
    // Nueva sesión al iniciar sesión (evita la fijación de sesión)
    await regenerate(req.session);
    req.session.userId = user.id;
    req.log.info('auth.login', 'Inicio de sesión', { userId: user.id, role: user.role });
    res.json(user);
  });

  // Cierra la sesión invalidándola en el servidor, no solo borrando la cookie del navegador
  router.post('/logout', async (req, res) => {
    if (req.user) req.log.info('auth.logout', 'Cierre de sesión', { userId: req.user.id });
    await destroy(req.session);
    res.clearCookie(sessionCookieName);
    res.status(204).end();
  });

  // Usuario de la sesión actual: permite recuperar la sesión al recargar la página
  router.get('/me', requireAuth, (req, res) => {
    res.json(req.user);
  });

  return router;
}

module.exports = { createAuthRouter, publicBaseUrl };
