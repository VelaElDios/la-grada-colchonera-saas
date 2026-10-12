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

Requisitos: Node.js 20.12 o superior.

```bash
npm install
cp .env.example .env   # en Windows: copy .env.example .env
npm start              # http://localhost:3000
```

## Ejecutar las pruebas

```bash
npm test
```

## Variables de entorno y secretos

La configuración y los secretos llegan **solo por variables de entorno** ([`src/loadConfig.js`](src/loadConfig.js)); en el código y en el repositorio no hay ningún valor secreto.

- **En local:** se copian las variables en un fichero `.env` (partiendo de [`.env.example`](.env.example)). Ese fichero está en `.gitignore` y nunca se sube.
- **En producción (Render):** los valores se guardan en el panel del servicio (*Environment*). `SESSION_SECRET` lo genera Render y el resto se introduce a mano (`sync: false` en [`render.yaml`](render.yaml)).
- Si en producción falta un secreto obligatorio, la aplicación no arranca y lo indica en el log, en lugar de funcionar de forma insegura.

| Variable | Secreto | Descripción |
|---|---|---|
| `PORT` | No | Puerto HTTP del servidor (por defecto 3000) |
| `NODE_ENV` | No | `production` en el despliegue (cookies solo por HTTPS y secretos obligatorios) |
| `SESSION_SECRET` | Sí | Firma la cookie de sesión. Obligatorio en producción (mínimo 32 caracteres); en local, si falta, se genera uno aleatorio en cada arranque |
| `DATABASE_URL` | Sí | Cadena de conexión de PostgreSQL (Neon). Obligatoria en producción; en local, si falta, los datos se guardan en memoria |
| `ADMIN_EMAIL` | No | Email del primer administrador (se crea o se promociona al arrancar) |
| `ADMIN_PASSWORD` | Sí | Contraseña del primer administrador (mínimo 8 caracteres). Solo se usa si la cuenta no existe |
| `REQUIRE_EMAIL_CONFIRMATION` | No | `true` para exigir confirmar el correo antes de entrar (Hito 4). Por defecto `false` |

## API

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/health` | Público | Comprueba que el servidor está en marcha |
| POST | `/api/auth/register` | Público | Registro con email y contraseña (mínimo 8 caracteres) |
| POST | `/api/auth/login` | Público | Inicia sesión y deja la cookie `grada.sid` |
| POST | `/api/auth/logout` | Público | Cierra la sesión actual |
| GET | `/api/auth/me` | Sesión | Devuelve el usuario con sesión iniciada |
| GET | `/api/users` | Admin | Listado de usuarios (email, rol y estado) |
| GET | `/api/users/:id/active` | Propio o admin | Indica si un usuario está activo |
| PATCH | `/api/users/:id/role` | Admin | Cambia el rol (`{ "role": "admin" \| "user" }`) |
| DELETE | `/api/users/:id` | Propio o admin | Elimina una cuenta (baja lógica). Nunca se elimina al último administrador |

Los errores se devuelven como `{ "error": { "code": "...", "message": "..." } }`.
Sin una sesión válida, las rutas protegidas responden `401 UNAUTHENTICATED`; con sesión pero sin el rol necesario, `403 FORBIDDEN`.

### Roles

- **user:** gestiona su propia cuenta (ver su perfil y darse de baja).
- **admin:** además, ve el listado de usuarios, cambia roles y elimina cuentas.
- **Primer administrador:** al arrancar, si existen `ADMIN_EMAIL` y `ADMIN_PASSWORD`, se crea esa cuenta con rol de administrador (o se promociona si ya existía). Siempre debe quedar al menos un administrador activo.

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
