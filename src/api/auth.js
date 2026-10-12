// Rutas HTTP de autenticación: registro e inicio de sesión locales (email + contraseña).
const express = require('express');

function createAuthRouter({ userService }) {
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
    res.json(user);
  });

  return router;
}

module.exports = { createAuthRouter };
