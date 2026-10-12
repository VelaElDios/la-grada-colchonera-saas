// Capa de presentación: solo pinta la interfaz y usa el cliente `api`, nunca fetch directamente.
async function mostrarEstadoServidor() {
  const elemento = document.getElementById('estado-servidor');
  try {
    const { status } = await api.getHealth();
    elemento.textContent = status === 'ok' ? 'en marcha ✅' : status;
  } catch (error) {
    elemento.textContent = 'sin conexión ❌';
  }
}

mostrarEstadoServidor();
