# La Grada Colchonera

Red social para la afición rojiblanca. Proyecto individual de **Procesos de Ingeniería del Software (curso 2026-2027)**.
El Sprint 1 cubre la estructura base de una aplicación SaaS organizada en capas y con gestión de usuarios.

> Proyecto de aficionado sin relación oficial con el Club Atlético de Madrid.

## Tecnologías

| Tecnología | Justificación |
|---|---|
| Node.js + Express | Un único lenguaje (JavaScript) en cliente y servidor y un framework mínimo en el que las capas se ven como módulos simples. |
| HTML, CSS y JavaScript sin framework | El propio backend sirve el frontend (mismo origen) sin herramientas de compilación. |
| `node:test` | Framework de pruebas incluido en Node: sin dependencias extra y ejecutable con un solo comando. |

| Render (capa gratuita) | Despliegue continuo desde GitHub: cada cambio en `main` se publica solo, sin pasos manuales. |
| GitHub Actions | Integración continua integrada en el propio repositorio. |

_(Se completará con la base de datos y el resto de servicios según avance el proyecto.)_

## Estructura del proyecto

```
src/
  server.js          Punto de entrada (arranca el servidor)
  app.js             Construcción de la app Express
  api/               Capa API: rutas HTTP
  services/          Capa de lógica de negocio
  repositories/      Capa de acceso a datos
public/
  index.html, css/   Capa de presentación (GUI)
  js/ui.js           Interfaz
  js/api.js          Cliente de comunicación con la API
tests/               Pruebas automatizadas
memoria/             Memoria del proyecto (LuaLaTeX)
```

## Ejecutar en local

Requisitos: Node.js 20 o superior.

```bash
npm install
cp .env.example .env   # en Windows: copy .env.example .env
npm start              # http://localhost:3000
```

## Ejecutar las pruebas

```bash
npm test
```

## Variables de entorno

Ver [`.env.example`](.env.example). Solo se documentan los nombres; los valores reales nunca se suben al repositorio.

| Variable | Descripción |
|---|---|
| `PORT` | Puerto HTTP del servidor (por defecto 3000) |
| `NODE_ENV` | `production` en el despliegue (cookies solo por HTTPS) |
| `SESSION_SECRET` | Secreto para firmar la cookie de sesión. Obligatorio en producción; en Render lo genera el Blueprint |
| `REQUIRE_EMAIL_CONFIRMATION` | `true` para exigir confirmar el correo antes de entrar (Hito 4). Por defecto `false` |

## API

| Método | Ruta | Sesión | Descripción |
|---|---|---|---|
| GET | `/api/health` | No | Comprueba que el servidor está en marcha |
| POST | `/api/auth/register` | No | Registro con email y contraseña (mínimo 8 caracteres) |
| POST | `/api/auth/login` | No | Inicia sesión y deja la cookie `grada.sid` |
| POST | `/api/auth/logout` | No | Cierra la sesión actual |
| GET | `/api/auth/me` | Sí | Devuelve el usuario con sesión iniciada |
| GET | `/api/users` | Sí | Listado de usuarios (email, rol y estado) |
| GET | `/api/users/:id/active` | Sí | Indica si un usuario está activo |
| DELETE | `/api/users/:id` | Sí | Elimina un usuario (admin: cualquiera; usuario: solo su cuenta) |

Los errores se devuelven como `{ "error": { "code": "...", "message": "..." } }`.
Las rutas marcadas con sesión responden `401 UNAUTHENTICATED` si no hay una sesión válida.

## Despliegue

- **URL pública:** https://la-grada-colchonera.onrender.com
- Configuración en [`render.yaml`](render.yaml): Render construye con `npm ci`, arranca con `npm start` y comprueba la salud en `/api/health`.
- Cada merge en `main` se despliega automáticamente. La capa gratuita suspende la app tras un rato de inactividad: la primera petición puede tardar unos segundos.

## Flujo de trabajo

GitHub Flow organizado por hitos (ver [`CONTRIBUTING.md`](CONTRIBUTING.md)):

- `main`: versión estable y desplegada. Solo recibe cambios mediante pull request.
- `hito-N/integracion`: rama de cada hito; reúne las tareas del hito y se integra en `main` con un PR al cerrarlo.
- `hito-N/Tx-descripcion`: una rama por tarea de DoneTonic, que se integra en la rama de su hito mediante PR.

Las tareas se gestionan en DoneTonic (proyecto *Colchoneros*) y cada rama y PR lleva el identificador de su tarea (`Tx`) y PBI (`Px`).
