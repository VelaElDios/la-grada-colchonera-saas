// Rutas HTTP de autenticación: registro, inicio y cierre de sesión, y usuario actual.
const express = require('express');
const { requireUser } = require('./currentUser');

// express-session usa callbacks: se envuelven en promesas para usarlas con async/await
const regenerate = (session) => new Promise((resolve, reject) => {
  session.regenerate((error) => (error ? reject(error) : resolve()));
});
const destroy = (session) => new Promise((resolve, reject) => {
  session.destroy((error) => (error ? reject(error) : resolve()));
});

function createAuthRouter({ userService, sessionCookieName }) {
  const router = express.Router();

  router.post('/register', async (req, res) => {
    const user = await userService.registerUser({
      email: req.body?.email,
      password: req.body?.password,
    });
    res.status(201).json(user);
  });

  router.post('/login', async (req, res) => {
    const user = await userService.authenticate({
      email: req.body?.email,
      password: req.body?.password,
    });
    // Nueva sesión al iniciar sesión (evita la fijación de sesión)
    await regenerate(req.session);
    req.session.userId = user.id;
    res.json(user);
  });

  // Cierra la sesión invalidándola en el servidor, no solo borrando la cookie del navegador
  router.post('/logout', async (req, res) => {
    await destroy(req.session);
    res.clearCookie(sessionCookieName);
    res.status(204).end();
  });

  // Usuario de la sesión actual: permite recuperar la sesión al recargar la página
  router.get('/me', requireUser, (req, res) => {
    res.json(req.user);
  });

  return router;
}

module.exports = { createAuthRouter };
