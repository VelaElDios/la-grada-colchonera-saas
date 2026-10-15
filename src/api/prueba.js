// Endpoint público (sin sesión) de la regla de dominios permitidos. Solo lee la petición,
// llama a la capa de lógica y devuelve la respuesta.
const express = require('express');
const { isDomainAllowed } = require('../services/domainPolicy');

function createPruebaRouter({ allowedDomains }) {
  const router = express.Router();

  router.post('/dominio', (req, res) => {
    const permitido = isDomainAllowed(req.body?.email, allowedDomains);
    res.json({ permitido });
  });

  // Contrato de este endpoint: los errores de datos se devuelven como { "error": "mensaje" }
  // eslint-disable-next-line no-unused-vars
  router.use((err, req, res, next) => {
    if (err.code === 'VALIDATION_ERROR') return res.status(400).json({ error: err.message });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON no válido' });
    return next(err);
  });

  return router;
}

module.exports = { createPruebaRouter };
