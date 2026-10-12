# Revisión de la entrega (Sprint 1, Hitos 1–3)

Comprobación, frase a frase, de la especificación del proyecto (*Procesos de Ingeniería del Software, curso 2026-2027*). Cada fila indica cómo se cumple el requisito y dónde está la prueba.

| | |
|---|---|
| **Repositorio** | https://github.com/VelaElDios/la-grada-colchonera-saas |
| **Aplicación desplegada** | https://la-grada-colchonera-1081564062572.europe-southwest1.run.app (Google Cloud Run) |
| **Alcance** | Hitos 1, 2 y 3. El profesor ha limitado esta primera entrega a esos tres hitos; el Hito 4 queda para la siguiente |
| **Estado** | Todos los requisitos de los Hitos 1–3 están cumplidos, integrados en `main` y desplegados |

**Leyenda:** ✅ cumplido · ⏳ pertenece al Hito 4 (siguiente entrega)

## Cómo comprobarlo en cinco minutos

1. Abrir https://la-grada-colchonera-1081564062572.europe-southwest1.run.app. Si la aplicación estaba parada, la primera carga tarda unos segundos. El inicio muestra *Estado del servidor: en marcha*.
2. **Registrarse** con cualquier email y una contraseña de 8 caracteres o más. Una contraseña corta o un email repetido se rechazan con un mensaje claro.
3. **Entrar** con esa cuenta y **recargar la página**: la sesión se mantiene.
4. Ir a `#/admin`: un usuario normal vuelve a *Mi cuenta*. La API responde `403` en `/api/users`.
5. **Salir** y abrir `/api/users` directamente: responde `401`.
6. Desde *Mi cuenta*, **eliminar la cuenta**: ya no se puede volver a entrar con ella.
7. **Entrar como administrador** con las credenciales enviadas con la entrega: aparece *Administración* con el listado de usuarios (email, rol y estado). Ver [README › Acceso como administrador](../README.md#acceso-como-administrador-para-la-revisión).

## 3. Arquitectura obligatoria

| Requisito | | Cómo se cumple | Evidencia |
|---|---|---|---|
| El backend sirve el frontend (mismo origen) | ✅ | Express sirve `public/` con `express.static` en el mismo servidor que la API | [`src/app.js`](../src/app.js), [`tests/frontend.test.js`](../tests/frontend.test.js) |
| El cliente no accede a la base de datos ni ejecuta lógica de negocio | ✅ | El navegador solo habla con `/api`. Las reglas (permisos, último administrador, hash…) están en `src/services` | [README › Arquitectura](../README.md#arquitectura) |
| Comunicación cliente-servidor solo a través de una API | ✅ | API REST JSON bajo `/api` | [README › API](../README.md#api) |
| Backend: capas API, lógica y datos en módulos separados | ✅ | `src/api/` → `src/services/` → `src/repositories/`. La lógica recibe el repositorio por parámetro, así que no sabe si los datos están en memoria o en PostgreSQL | [`src/api/`](../src/api), [`src/services/`](../src/services), [`src/repositories/`](../src/repositories) |
| Frontend: presentación y cliente de comunicación separados | ✅ | `public/js/ui.js` solo pinta vistas; todas las peticiones pasan por `public/js/api.js` | [`ui.js`](../public/js/ui.js), [`api.js`](../public/js/api.js) |

**Dónde está la frontera entre capas:**

- `src/api/users.js` llama a `userService.*` (API → lógica).
- `src/services/userService.js` llama a `userRepository.*` (lógica → datos).
- `src/app.js` es el único sitio donde se conectan las tres.
- En el navegador, `ui.js` llama a `api.*` (presentación → cliente).

## 4.1. Gestión de usuarios

| Requisito | | Cómo se cumple | Evidencia |
|---|---|---|---|
| Registro de usuario local | ✅ | `POST /api/auth/register` valida el email y la contraseña (mínimo 8) y rechaza los emails repetidos (`409`) | [`src/api/auth.js`](../src/api/auth.js), captura 02 |
| … con confirmación por correo (la cuenta queda pendiente) | ⏳ | Hito 4. El modelo ya tiene el estado `pending` y la lógica impide entrar a una cuenta pendiente (hay una prueba de ello). Se activa con `REQUIRE_EMAIL_CONFIRMATION=true` cuando exista el envío de correos | [`src/models/user.js`](../src/models/user.js), [`tests/userService.test.js`](../tests/userService.test.js) |
| Inicio de sesión local (email + contraseña) | ✅ | `POST /api/auth/login`. El mensaje es el mismo si el email no existe o si la contraseña es incorrecta, para no revelar qué cuentas existen | [`src/services/userService.js`](../src/services/userService.js), captura 03 |
| Inicio de sesión con un proveedor externo (OAuth) | ⏳ | Hito 4. El modelo ya distingue `authProvider: local \| google` | [`src/models/user.js`](../src/models/user.js) |
| Cierre de sesión invalidando la sesión | ✅ | `POST /api/auth/logout` destruye la sesión **en el servidor** (en la tabla `session`) y borra la cookie; la cookie antigua deja de valer | [`tests/api.auth.test.js`](../tests/api.auth.test.js) |
| La sesión se mantiene entre recargas | ✅ | Cookie `httpOnly` con la sesión guardada en PostgreSQL. Al cargar, la interfaz llama a `GET /api/auth/me` | [`src/app.js`](../src/app.js), [`public/js/ui.js`](../public/js/ui.js) (`iniciar`) |

## 4.2. Roles y consultas sobre usuarios

| Requisito | | Cómo se cumple | Evidencia |
|---|---|---|---|
| Dos roles como mínimo: usuario y administrador | ✅ | `ROLES = { user, admin }` | [`src/models/user.js`](../src/models/user.js) |
| Listar usuarios (solo admin), con email, rol y estado | ✅ | `GET /api/users` con `requireRole('admin')`. El panel *Administración* muestra email, rol, estado y fecha de alta | [`src/api/users.js`](../src/api/users.js), captura 06 |
| Comprobar si un usuario está activo (solo admin) | ✅ | `GET /api/users/:id/active` con `requireRole('admin')`. Un usuario normal recibe `403`, también si pregunta por su propia cuenta | [`tests/api.users.test.js`](../tests/api.users.test.js) |
| «Activo» = cuenta confirmada (u OAuth) y no eliminada; no es «conectado» | ✅ | `isUserActive` devuelve `status === 'active'`; las cuentas pendientes y eliminadas no están activas | [`src/services/userService.js`](../src/services/userService.js) |
| El admin elimina a cualquiera; un usuario solo su propia cuenta | ✅ | La API comprueba el permiso (`requireSelfOrRole`) y la lógica vuelve a comprobarlo (`deleteUser`). Además, nunca se elimina al último administrador | [`tests/userService.test.js`](../tests/userService.test.js) |
| Un usuario eliminado no puede volver a iniciar sesión | ✅ | Baja lógica (`status = 'deleted'`): el login se rechaza y una sesión abierta deja de valer en la siguiente petición | [`src/api/currentUser.js`](../src/api/currentUser.js), [`tests/api.users.test.js`](../tests/api.users.test.js) |
| Las restricciones se aplican en el servidor | ✅ | `requireAuth` (`401`), `requireRole` y `requireSelfOrRole` (`403`). La interfaz solo oculta los enlaces | [`src/api/currentUser.js`](../src/api/currentUser.js), captura 05 |
| Cómo se crea el primer administrador (justificado) | ✅ | Con las variables `ADMIN_EMAIL` y `ADMIN_PASSWORD` al arrancar (`ensureAdmin`): no hay contraseñas en el código y no hace falta tocar la base de datos a mano | [README › Roles](../README.md#roles), [`src/bootstrap.js`](../src/bootstrap.js) |

## 5. Requisitos no funcionales y seguridad

| Requisito | | Cómo se cumple | Evidencia |
|---|---|---|---|
| Persistencia real: los datos sobreviven a un reinicio | ✅ | PostgreSQL en Neon con migraciones versionadas; las sesiones también se guardan en la base de datos | [`src/db/`](../src/db), [`tests/api.database.test.js`](../tests/api.database.test.js) |
| Ningún secreto en el código ni en el repositorio | ✅ | Solo variables de entorno: Secret Manager en Cloud Run y `.env` (ignorado por git) en local. En producción la aplicación no arranca si falta un secreto | [`src/loadConfig.js`](../src/loadConfig.js), [`tests/config.test.js`](../tests/config.test.js) |
| Archivo de ejemplo con los nombres de las variables, sin valores | ✅ | `.env.example` | [`.env.example`](../.env.example) |
| Contraseñas con una función de hash segura | ✅ | bcrypt (`bcryptjs`, coste 10). La API nunca devuelve el hash y el registro de actividad lo oculta | [`src/services/passwordHasher.js`](../src/services/passwordHasher.js) |
| Las rutas autenticadas rechazan peticiones sin sesión; las de admin, a quien no tiene el rol | ✅ | `401 UNAUTHENTICATED` y `403 FORBIDDEN` | [`tests/api.users.test.js`](../tests/api.users.test.js) |
| Desplegada en un proveedor cloud con capa gratuita y URL pública | ✅ | Google Cloud Run (capa gratuita y créditos de educación). Render se mantiene como alternativa | [README › Despliegue](../README.md#despliegue) |

## 6. Calidad y pruebas

| Requisito | | Cómo se cumple | Evidencia |
|---|---|---|---|
| Al menos 5 pruebas unitarias de la capa de lógica sobre gestión de usuarios | ✅ | `tests/userService.test.js`: registro con email repetido, cuenta pendiente que intenta entrar, usuario normal que intenta eliminar a otro, último administrador… | [`tests/userService.test.js`](../tests/userService.test.js) |
| Al menos una comprueba un caso de error | ✅ | Muchas: `ConflictError`, `ForbiddenError`, `ValidationError`, `NotFoundError`… | [`tests/userService.test.js`](../tests/userService.test.js) |
| Pruebas automatizadas, con un framework y un único comando documentado | ✅ | `node:test`; se ejecutan con `npm test` (80 pruebas) | [README › Pruebas](../README.md#pruebas) |
| Manejo explícito de errores con feedback claro | ✅ (base) | Errores de negocio tipados que la API traduce a un formato común `{ error: { code, message } }`; la interfaz muestra cada mensaje. El pulido (P17) es del Hito 4 | [`src/api/errorHandler.js`](../src/api/errorHandler.js), capturas 02 y 03 |
| Registro (log) de la actividad relevante | ✅ | Una línea JSON por evento (peticiones, logins, intentos fallidos, bajas, cambios de rol…), visible en Cloud Logging. Las contraseñas y los secretos se ocultan | [README › Logs](../README.md#registro-de-actividad-logs) |
| Historial de commits incremental | ✅ | Un commit por paso, con la tarea en el título (`[Tx] …`), en ramas y PRs separados | [commits](https://github.com/VelaElDios/la-grada-colchonera-saas/commits/main) |

## 7. Flujo de trabajo y pipeline de CI/CD

| Requisito | | Cómo se cumple | Evidencia |
|---|---|---|---|
| Rama por cambio; no se trabaja sobre `main` | ✅ | Una rama por tarea (`hito-N/Tx-…`) | [ramas](https://github.com/VelaElDios/la-grada-colchonera-saas/branches/all), [`CONTRIBUTING.md`](../CONTRIBUTING.md) |
| Pruebas en local antes de abrir el PR | ✅ | Paso obligatorio de `CONTRIBUTING.md` (`npm test`) | [`CONTRIBUTING.md`](../CONTRIBUTING.md) |
| Integración mediante pull request | ✅ | Un PR por tarea y otro por cierre de hito | [PRs](https://github.com/VelaElDios/la-grada-colchonera-saas/pulls?q=is%3Apr+is%3Aclosed+sort%3Acreated-asc) |
| CI en cada PR y en cada cambio de `main`; no se integra con el CI en rojo | ✅ | GitHub Actions (*Pruebas* con PostgreSQL 17 real e *Imagen Docker*). `main` está protegida y exige el check en verde | [`ci.yml`](../.github/workflows/ci.yml), [ejecuciones](https://github.com/VelaElDios/la-grada-colchonera-saas/actions/workflows/ci.yml) |
| Despliegue continuo de cada cambio en `main`, sin desplegar a mano | ✅ | Cuando el CI pasa en `main`, [`deploy-cloud-run.yml`](../.github/workflows/deploy-cloud-run.yml) construye la imagen y la despliega en Cloud Run (Workload Identity Federation, sin claves) | [ejecuciones del despliegue](https://github.com/VelaElDios/la-grada-colchonera-saas/actions/workflows/deploy-cloud-run.yml) |
| La configuración del CI y del despliegue está en el repositorio | ✅ | `.github/workflows/`, `Dockerfile`, `render.yaml` y `scripts/gcp/preparar-cloud-run.sh` | [README › Despliegue](../README.md#despliegue) |
| Etiqueta al terminar cada hito | ✅ | Releases `hito-1`, `hito-2`, `hito-3` y `sprint-1` | [releases](https://github.com/VelaElDios/la-grada-colchonera-saas/releases) |

## 8. Entrega del Sprint 1

| Requisito | | Cómo se cumple |
|---|---|---|
| URL del repositorio | ✅ | https://github.com/VelaElDios/la-grada-colchonera-saas |
| URL pública funcionando durante la evaluación | ✅ | https://la-grada-colchonera-1081564062572.europe-southwest1.run.app. Puede tardar unos segundos en la primera petición si estaba parada |
| README: tecnologías con una frase que justifique cada una | ✅ | [README › Tecnologías](../README.md#tecnologías) |
| README: cómo ejecutar en local | ✅ | [README › Ejecutar en local](../README.md#ejecutar-en-local) |
| README: cómo ejecutar las pruebas | ✅ | [README › Pruebas](../README.md#pruebas) |
| README: variables de entorno (solo nombres) | ✅ | [README › Variables](../README.md#variables-de-entorno-y-secretos) y [`.env.example`](../.env.example) |
| README: cómo acceder como administrador (sin publicar contraseñas) | ✅ | [README › Acceso como administrador](../README.md#acceso-como-administrador-para-la-revisión). Las credenciales se envían con la entrega |

## Gestión del proyecto

| Qué | Dónde |
|---|---|
| Backlog (19 PBIs), sprint, tareas y su trazabilidad con ramas y PRs | [`docs/gestion/README.md`](gestion/README.md) |
| Memoria del proyecto (LuaLaTeX) | [`memoria/`](../memoria/README.md) |

## Pendiente para la siguiente entrega (Hito 4)

- **P15:** inicio de sesión con un proveedor externo (OAuth, Google).
- **P16:** confirmación de la cuenta por correo electrónico mediante un servicio de correo transaccional. Cuando esté, `REQUIRE_EMAIL_CONFIRMATION` pasará a `true`.
- **P17:** manejo de errores y feedback al usuario, revisado de principio a fin.
