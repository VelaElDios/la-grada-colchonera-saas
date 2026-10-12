// Punto de entrada: arranca el servidor HTTP.
const { createApp } = require('./app');

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`La Grada Colchonera escuchando en http://localhost:${PORT}`);
});
