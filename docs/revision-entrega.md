# Revisión de la entrega (Sprint 1, Hitos 1–3)

Comprobación, requisito a requisito, de que la entrega cumple lo pedido en la especificación del Sprint 1. Cada fila indica dónde está la prueba.

**Estado:** todos los requisitos de los Hitos 1, 2 y 3 están cumplidos, integrados en `main` y desplegados en **Google Cloud Run** (https://la-grada-colchonera-1081564062572.europe-southwest1.run.app) y en **Render** (https://la-grada-colchonera.onrender.com).

## Cómo comprobarlo en cinco minutos

1. Abrir https://la-grada-colchonera-1081564062572.europe-southwest1.run.app (o la URL de Render). La aplicación se apaga cuando no hay tráfico, así que la primera carga puede tardar unos segundos. El inicio muestra *Estado del servidor: en marcha*.
2. **Registrarse** con cualquier email y una contraseña de 8 caracteres o más. Una contraseña corta se rechaza.
3. **Entrar** con esa cuenta y **recargar la página**: la sesión se mantiene.
4. Ir a `#/admin`: como usuario normal, la aplicación devuelve a *Mi cuenta*. La API responde `403` en `/api/users`.
5. **Salir** y abrir `/api/users` directamente: responde `401`.
6. Desde *Mi cuenta*, **eliminar la cuenta**: ya no se puede volver a entrar con ella.
7. El panel de administración se ve en las [capturas del README](../README.md#capturas). Las credenciales del administrador son secretos y no están en el repositorio.

## Hito 1: esqueleto y backend · release [hito-1](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/hito-1)

| Requisito | Cómo se cumple | Evidencia |
|---|---|---|
| Repositorio en GitHub con un flujo de trabajo definido | GitHub Flow por hitos: `main` ← `hito-N/integracion` ← `hito-N/Tx-…`. Ramas protegidas que exigen PR y CI en verde | [`CONTRIBUTING.md`](https://github.com/VelaElDios/la-grada-colchonera-saas/blob/main/CONTRIBUTING.md), [ramas](https://github.com/VelaElDios/la-grada-colchonera-saas/branches/all), [PRs](https://github.com/VelaElDios/la-grada-colchonera-saas/pulls?q=is%3Apr+is%3Aclosed+sort%3Acreated-asc) |
| Arquitectura en capas | Presentación (`public/`), API (`src/api`), lógica (`src/services`) y datos (`src/repositories`) | [README › Arquitectura](../README.md#arquitectura) |
| Integración continua | GitHub Actions ejecuta las pruebas en cada PR y en cada cambio de `main` y de las ramas de hito | [`.github/workflows/ci.yml`](https://github.com/VelaElDios/la-grada-colchonera-saas/blob/main/.github/workflows/ci.yml), [ejecuciones](https://github.com/VelaElDios/la-grada-colchonera-saas/actions/workflows/ci.yml) |
| Despliegue continuo en una URL pública | Cada cambio en `main` con el CI en verde se despliega solo en Google Cloud Run (imagen Docker, Artifact Registry, Secret Manager y Workload Identity Federation) y en Render | [`deploy-cloud-run.yml`](https://github.com/VelaElDios/la-grada-colchonera-saas/blob/main/.github/workflows/deploy-cloud-run.yml), [`Dockerfile`](https://github.com/VelaElDios/la-grada-colchonera-saas/blob/main/Dockerfile), [`render.yaml`](https://github.com/VelaElDios/la-grada-colchonera-saas/blob/main/render.yaml) |
| Lógica de gestión de usuarios (alta, listado con email, rol y estado, comprobar si está activo, eliminar) | `userService`: el administrador elimina a cualquiera y un usuario solo a sí mismo | [`src/services/userService.js`](https://github.com/VelaElDios/la-grada-colchonera-saas/blob/main/src/services/userService.js) |
| Pruebas unitarias automatizadas de la lógica (al menos 5) | 80 pruebas con `node:test`; las de la lógica, en `tests/userService.test.js` | [`tests/`](https://github.com/VelaElDios/la-grada-colchonera-saas/tree/main/tests) |
| Capa API que expone la lógica | API REST JSON con un formato de error común | [README › API](../README.md#api), [`src/api/`](https://github.com/VelaElDios/la-grada-colchonera-saas/tree/main/src/api) |

## Hito 2: autenticación y separación de capas · release [hito-2](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/hito-2)

| Requisito | Cómo se cumple | Evidencia |
|---|---|---|
| Frontend con la interfaz separada del cliente de comunicación | `ui.js` solo pinta vistas; todas las peticiones pasan por `api.js` | [`public/js/ui.js`](https://github.com/VelaElDios/la-grada-colchonera-saas/blob/main/public/js/ui.js), [`public/js/api.js`](https://github.com/VelaElDios/la-grada-colchonera-saas/blob/main/public/js/api.js) |
| Registro e inicio de sesión locales | `POST /api/auth/register` y `/login`. Contraseñas guardadas solo como hash bcrypt; error genérico ante credenciales incorrectas | [`src/api/auth.js`](https://github.com/VelaElDios/la-grada-colchonera-saas/blob/main/src/api/auth.js), capturas 02 y 03 |
| La sesión se mantiene y se puede cerrar | Cookie `httpOnly` y `sameSite`, `secure` en producción. `GET /api/auth/me` la recupera al recargar y `POST /api/auth/logout` la destruye en el servidor | [`src/app.js`](https://github.com/VelaElDios/la-grada-colchonera-saas/blob/main/src/app.js), [`tests/api.auth.test.js`](https://github.com/VelaElDios/la-grada-colchonera-saas/blob/main/tests/api.auth.test.js) |
| Rutas protegidas en el servidor | El middleware `requireAuth` responde `401` sin sesión válida (también con cookies inventadas) | [`src/api/currentUser.js`](https://github.com/VelaElDios/la-grada-colchonera-saas/blob/main/src/api/currentUser.js), [`tests/api.users.test.js`](https://github.com/VelaElDios/la-grada-colchonera-saas/blob/main/tests/api.users.test.js) |

## Hito 3: persistencia, seguridad y administración · release [hito-3](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/hito-3)

| Requisito | Cómo se cumple | Evidencia |
|---|---|---|
| Persistencia en una base de datos real | PostgreSQL en Neon con migraciones SQL versionadas. El repositorio de PostgreSQL sustituye al de memoria con el mismo contrato, y las sesiones también se guardan en la base de datos | [`src/db/`](https://github.com/VelaElDios/la-grada-colchonera-saas/tree/main/src/db), [`src/repositories/postgresUserRepository.js`](https://github.com/VelaElDios/la-grada-colchonera-saas/blob/main/src/repositories/postgresUserRepository.js), [`tests/userRepository.test.js`](https://github.com/VelaElDios/la-grada-colchonera-saas/blob/main/tests/userRepository.test.js) |
| Gestión de secretos | Los secretos solo llegan por variables de entorno (panel de Render y `.env` local ignorado por git). En producción la aplicación no arranca si falta alguno | [`src/loadConfig.js`](https://github.com/VelaElDios/la-grada-colchonera-saas/blob/main/src/loadConfig.js), [`.env.example`](https://github.com/VelaElDios/la-grada-colchonera-saas/blob/main/.env.example), [README › Variables](../README.md#variables-de-entorno-y-secretos) |
| Roles de usuario y administrador | Autorización en el servidor (`403`). Primer administrador creado desde `ADMIN_EMAIL` y `ADMIN_PASSWORD`, y siempre queda al menos un administrador | [`src/api/users.js`](https://github.com/VelaElDios/la-grada-colchonera-saas/blob/main/src/api/users.js), [README › Roles](../README.md#roles) |
| Panel de administración y baja de la propia cuenta | Vista *Administración*: listado de usuarios, cambio de rol y eliminación. *Mi cuenta*: «Eliminar mi cuenta» | capturas 04, 05, 06 y 07 |
| Registro (log) de la actividad | Una línea JSON por evento (peticiones, logins, intentos fallidos, bajas, cambios de rol…) visible en los logs de Render; las contraseñas y secretos se ocultan | [`src/logger.js`](https://github.com/VelaElDios/la-grada-colchonera-saas/blob/main/src/logger.js), [README › Logs](../README.md#registro-de-actividad-logs) |

## Gestión, documentación y entrega

| Requisito | Cómo se cumple | Evidencia |
|---|---|---|
| Gestión ágil del trabajo (PBIs, sprint, tareas) | 18 PBIs priorizados y Sprint 1 en DoneTonic. Cada tarea tiene su rama y su PR | [`docs/gestion/README.md`](gestion/README.md) |
| README completo | Descripción, capturas, arquitectura, tecnologías, ejecución, pruebas, variables, API, despliegue y flujo de trabajo | [`README.md`](../README.md) |
| Etiquetas por hito | Releases `hito-1`, `hito-2` y `hito-3`, más `sprint-1` al cerrar la entrega | [releases](https://github.com/VelaElDios/la-grada-colchonera-saas/releases) |
| Uso de Google Cloud (créditos de educación) | Despliegue en Cloud Run preparado con un script reproducible | [`scripts/gcp/preparar-cloud-run.sh`](https://github.com/VelaElDios/la-grada-colchonera-saas/blob/main/scripts/gcp/preparar-cloud-run.sh), [README › Despliegue](../README.md#despliegue) |
| Sin secretos en el repositorio | `.env` en `.gitignore`; en Cloud Run, en Secret Manager. Una prueba automática lo comprueba | [`.gitignore`](https://github.com/VelaElDios/la-grada-colchonera-saas/blob/main/.gitignore), [`tests/config.test.js`](https://github.com/VelaElDios/la-grada-colchonera-saas/blob/main/tests/config.test.js) |

## Fuera del alcance de esta entrega (Hito 4)

- **P15:** inicio de sesión con proveedor externo (OAuth). El modelo de usuario ya distingue `authProvider: local | google`.
- **P16:** confirmación de cuenta por correo. La lógica ya admite el estado `pending` y se activa con `REQUIRE_EMAIL_CONFIRMATION=true`.
- **P17:** manejo de errores y feedback avanzados. Ya existe un manejador de errores común y mensajes de error y de éxito en la interfaz.
