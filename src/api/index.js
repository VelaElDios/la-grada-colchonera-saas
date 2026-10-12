// Capa API (presentación del backend): define las rutas HTTP y delega en la capa de lógica.
const express = require('express');

const router = express.Router();

// Comprobación de que el servidor está vivo (útil para el despliegue y el CI)
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = router;
