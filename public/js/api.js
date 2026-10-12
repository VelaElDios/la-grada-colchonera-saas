// Cliente de comunicación con el servidor: único punto del frontend que hace peticiones HTTP.
const api = {
  async getHealth() {
    const respuesta = await fetch('/api/health');
    if (!respuesta.ok) {
      throw new Error(`Error ${respuesta.status}`);
    }
    return respuesta.json();
  },
};
