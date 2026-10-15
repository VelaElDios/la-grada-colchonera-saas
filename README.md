# La Grada Colchonera

[![CI](https://github.com/VelaElDios/la-grada-colchonera-saas/actions/workflows/ci.yml/badge.svg)](https://github.com/VelaElDios/la-grada-colchonera-saas/actions/workflows/ci.yml)
[![Última versión](https://img.shields.io/github/v/release/VelaElDios/la-grada-colchonera-saas?label=versi%C3%B3n)](https://github.com/VelaElDios/la-grada-colchonera-saas/releases)
[![Desplegado en Cloud Run](https://img.shields.io/badge/demo-Google%20Cloud%20Run-4285F4)](https://la-grada-colchonera-1081564062572.europe-southwest1.run.app)

Red social para la afición rojiblanca. Proyecto individual de **Procesos de Ingeniería del Software (curso 2026-2027)**, planteado como un TFG.
El **Sprint 1** construye la base de una aplicación SaaS organizada en capas: gestión de usuarios con registro, inicio de sesión, roles, base de datos real, despliegue continuo y gestión ágil del trabajo.

> Proyecto de aficionado sin relación oficial con el Club Atlético de Madrid.

## Entrega del Sprint 1

| | |
|---|---|
| **Repositorio** | https://github.com/VelaElDios/la-grada-colchonera-saas |
| **Aplicación desplegada** | https://la-grada-colchonera-1081564062572.europe-southwest1.run.app (Google Cloud Run) |
| **Alcance** | Hitos 1, 2 y 3 del enunciado. El Hito 4 (OAuth y confirmación por correo) queda para la siguiente entrega |
| **Acceso de administrador** | Ver [Acceso como administrador para la revisión](#acceso-como-administrador-para-la-revisión). Las credenciales se envían junto con la entrega |
| **Revisión requisito a requisito** | [`docs/revision-entrega.md`](docs/revision-entrega.md) |

## Enlaces rápidos

| Qué | Dónde |
|---|---|
| Aplicación desplegada | Google Cloud Run (principal): https://la-grada-colchonera-1081564062572.europe-southwest1.run.app · Render (alternativo): https://la-grada-colchonera.onrender.com |
| Entregas por hito (releases) | [hito-1](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/hito-1) · [hito-2](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/hito-2) · [hito-3](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/hito-3) · [sprint-1](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/sprint-1) |
| Pull requests (uno por tarea y uno por cierre de hito) | [VelaElDios/la-grada-colchonera-saas/pulls](https://github.com/VelaElDios/la-grada-colchonera-saas/pulls?q=is%3Apr+is%3Aclosed+sort%3Acreated-asc) |
| Integración continua (GitHub Actions) | [Ejecuciones del workflow *CI*](https://github.com/VelaElDios/la-grada-colchonera-saas/actions/workflows/ci.yml) |
| Gestión del proyecto (DoneTonic: PBIs, tareas, sprint y gráficas) | [`docs/gestion/README.md`](docs/gestion/README.md) |
| Revisión de la entrega frente al enunciado | [`docs/revision-entrega.md`](docs/revision-entrega.md) |
| Memoria del proyecto (LuaLaTeX) | [`memoria/`](memoria/README.md) |

## Capturas

| Inicio | Registro con validación |
|---|---|
| ![Página de inicio](docs/capturas/app/01-inicio.png) | ![Registro con error de validación](docs/capturas/app/02-registro-validacion.png) |
| **Inicio de sesión fallido** | **Mi cuenta (usuario)** |
| ![Inicio de sesión con credenciales incorrectas](docs/capturas/app/03-entrar-error.png) | ![Perfil del usuario con opción de darse de baja](docs/capturas/app/04-perfil.png) |
| **Usuario sin permiso que intenta entrar en Administración** | **Panel de administración** |
| ![Un usuario normal es redirigido al intentar abrir el panel](docs/capturas/app/05-usuario-sin-permiso.png) | ![Panel de administración con usuarios, roles y estados](docs/capturas/app/06-panel-admin.png) |

<details>
<summary>Panel de administración en el móvil</summary>

<img src="docs/capturas/app/07-panel-admin-movil.png" alt="Panel de administración en un móvil: cada usuario es una tarjeta" width="300">

</details>

## Qué incluye cada hito

| Hito | Contenido | PBIs (DoneTonic) | Entrega |
|---|---|---|---|
| **1. Esqueleto y backend** | Repositorio con GitHub Flow, CI con GitHub Actions, despliegue continuo en Render (al cerrar el sprint, también en Google Cloud Run), lógica de gestión de usuarios en memoria, pruebas unitarias y API REST. | P1–P6 · T1–T8 | [hito-1](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/hito-1) · PRs #1–#10 |
| **2. Autenticación y separación de capas** | Frontend separado en interfaz (`ui.js`) y cliente de la API (`api.js`), registro e inicio de sesión locales con las contraseñas guardadas como hash bcrypt (nunca en claro ni cifradas de forma reversible), sesión que se mantiene al recargar, cierre de sesión en el servidor y rutas protegidas. | P7–P10 · T9–T14 | [hito-2](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/hito-2) · PRs #11–#17 |
| **3. Persistencia, seguridad y administración** | PostgreSQL (Neon) con migraciones, sesiones guardadas en la base de datos, secretos solo en variables de entorno, roles usuario/administrador con primer administrador, panel de administración, baja de la propia cuenta y logs estructurados. | P11–P14 · T15–T20 | [hito-3](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/hito-3) · PRs #18–#24 |
| **Cierre del sprint** | README completo, capturas, documentación de la gestión, revisión de la entrega frente al enunciado, despliegue en Google Cloud Run y carpeta de la memoria. | P18–P19 · T27–T32 | [sprint-1](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/sprint-1) · PRs de `hito-4/*` |

El profesor ha limitado esta primera entrega a los Hitos 1–3. Los PBIs del Hito 4 (P15 OAuth, P16 confirmación por correo y P17 manejo de errores avanzado) quedan para la siguiente entrega. La base ya está preparada: el modelo de usuario tiene el estado `pending` y el campo `authProvider` (`local` o `google`).

## Arquitectura

La aplicación está dividida en capas que solo se comunican con la capa vecina. El navegador nunca habla con la base de datos, y la lógica de negocio no sabe si los datos están en memoria o en PostgreSQL.

```mermaid
flowchart LR
    subgraph Navegador
        UI["Interfaz<br/>public/js/ui.js"] --> CLI["Cliente de la API<br/>public/js/api.js"]
    end
    CLI -- "HTTP + JSON<br/>cookie de sesión" --> API
    subgraph "Servidor Node.js + Express"
        API["Capa API<br/>src/api<br/>rutas, sesión, roles, logs"] --> SRV["Lógica de negocio<br/>src/services"]
        SRV --> REPO["Acceso a datos<br/>src/repositories"]
    end
    REPO -- "producción" --> PG[("PostgreSQL<br/>Neon")]
    REPO -. "desarrollo y pruebas" .-> MEM[("Memoria")]
    API -- "sesiones" --> PG
    API -- "logs JSON" --> LOGS["stdout<br/>Cloud Logging"]
```

- **Presentación** (`public/`): HTML, CSS y JavaScript sin framework. `ui.js` solo pinta vistas; todas las peticiones pasan por `api.js`.
- **API** (`src/api/`): traduce HTTP a llamadas a la lógica. Aquí están los middlewares de sesión (`requireAuth`), roles (`requireRole`), registro de peticiones y el manejador de errores común.
- **Lógica** (`src/services/`): reglas de negocio (registro, autenticación, roles, bajas, último administrador). Recibe sus dependencias por parámetro.
- **Datos** (`src/repositories/`): dos implementaciones del mismo contrato, en memoria y en PostgreSQL. Las mismas pruebas se pasan a las dos.

## Tecnologías

Cada tecnología lleva una frase que justifica por qué se ha elegido.

| Tecnología | Para qué | Justificación |
|---|---|---|
| Node.js 22 + Express 5 | Servidor y API REST | Un único lenguaje (JavaScript) en cliente y servidor y un framework mínimo en el que las capas se ven como módulos simples. Express 5 pasa los errores asíncronos al manejador común. |
| HTML, CSS y JavaScript sin framework | Frontend | El propio backend sirve el frontend (mismo origen, sin CORS), no hace falta compilar nada y la frontera entre interfaz (`ui.js`) y cliente (`api.js`) se ve en dos ficheros. |
| PostgreSQL en Neon (capa gratuita) | Base de datos | Base de datos relacional real, gestionada y gratuita. Las tablas se crean con migraciones SQL versionadas. |
| `pg`, `connect-pg-simple` | Acceso a PostgreSQL y sesiones | Consultas parametrizadas (sin inyección SQL) y sesiones guardadas en la base de datos, que sobreviven a reinicios y despliegues. |
| `express-session`, `bcryptjs` | Autenticación | Sesión en el servidor con cookie `httpOnly`; contraseñas guardadas solo como hash bcrypt. |
| `node:test` + `pg-mem` | Pruebas | Framework incluido en Node. `pg-mem` emula PostgreSQL en local y el CI usa un PostgreSQL 17 real. |
| GitHub Actions | Integración continua | Ejecuta las pruebas en cada PR y en cada cambio de `main` y de las ramas de hito; las ramas protegidas exigen que pasen. |
| Docker + Google Cloud Run | Despliegue continuo (principal) | Imagen reproducible y despliegue sin servidor que escala a cero (Cloud Run tiene capa gratuita y además usamos los créditos de Google Cloud para educación). Secretos en Secret Manager y acceso desde GitHub sin claves (Workload Identity Federation). |
| Render (capa gratuita) | Despliegue continuo (alternativo) | Cada cambio en `main` se publica solo. Configuración como código en `render.yaml`. |
| DoneTonic | Gestión ágil | Backlog de PBIs, sprint, tablero de tareas y gráficas (burndown, burnup y velocity). |

## Estructura del proyecto

```
src/
  server.js            Punto de entrada: arranca el servidor
  bootstrap.js         Elige la capa de datos (PostgreSQL o memoria) y crea el primer administrador
  app.js               Construye la app Express (sesión, API y estáticos)
  config.js            Lee .env y las variables de entorno
  loadConfig.js        Valida la configuración y los secretos
  logger.js            Registro de actividad en JSON
  api/                 Capa API: rutas, sesión, roles, logs de peticiones y errores
  services/            Capa de lógica de negocio
  repositories/        Capa de acceso a datos (memoria y PostgreSQL)
  models/              Modelo de usuario (roles, estados)
  db/                  Conexión, migraciones SQL y script de migración
public/
  index.html, css/     Capa de presentación (GUI)
  js/ui.js             Interfaz: vistas y navegación
  js/api.js            Cliente de comunicación con la API
tests/                 Pruebas automatizadas (unitarias, de API y de base de datos)
docs/                  Capturas, gestión del proyecto y revisión de la entrega
memoria/               Memoria del proyecto en LuaLaTeX
Dockerfile             Imagen de la aplicación (Cloud Run)
scripts/gcp/           Preparación de Google Cloud (una sola vez)
render.yaml            Despliegue en Render (Blueprint)
.github/workflows/     Integración continua y despliegue en Cloud Run
```

## Ejecutar en local

Requisitos: Node.js 20.12 o superior.

```bash
npm install
cp .env.example .env   # en Windows: copy .env.example .env
npm start              # http://localhost:3000
```

- **Sin base de datos:** si `DATABASE_URL` está vacía, los datos se guardan en memoria (se pierden al reiniciar). Es lo más rápido para probar.
- **Con PostgreSQL:** pon en `.env` la cadena de conexión de Neon (o de un PostgreSQL local) en `DATABASE_URL`. Al arrancar se aplican las migraciones pendientes. También se pueden aplicar a mano con `npm run db:migrate`.
- **Administrador:** rellena `ADMIN_EMAIL` y `ADMIN_PASSWORD` en `.env`. Al arrancar se crea esa cuenta con rol de administrador y aparece la opción *Administración* al entrar.

## Pruebas

Todas las pruebas son automáticas (`node:test`) y se ejecutan con **un único comando**:

```bash
npm test
```

No hace falta tener PostgreSQL: en local, las pruebas de base de datos usan `pg-mem`. Para lanzarlas además contra un PostgreSQL real (como hace el CI):

```bash
TEST_DATABASE_URL=postgresql://usuario:clave@localhost:5432/grada_test npm test
```

Son 80 pruebas automatizadas:

- **Lógica (pruebas unitarias):** registro, email repetido, cuenta pendiente que intenta entrar, usuario normal que intenta eliminar a otro, roles, bajas y último administrador. Muchas comprueban casos de error, no solo el camino feliz.
- **Repositorios:** el mismo contrato para memoria y para PostgreSQL.
- **API:** códigos 401 y 403, sesión, cambio de rol y baja.
- **Configuración y secretos.**
- **Logs:** se comprueba también que nunca aparecen contraseñas.
- **Migraciones y arranque.**
- **Recorrido completo con PostgreSQL:** registro, inicio de sesión y sesión guardada en la base de datos.

El CI ejecuta todas las pruebas contra un PostgreSQL 17 real.

## Variables de entorno y secretos

La configuración y los secretos llegan **solo por variables de entorno** ([`src/loadConfig.js`](src/loadConfig.js)); en el código y en el repositorio no hay ningún valor secreto.

- **En local:** se copian las variables en un fichero `.env` (partiendo de [`.env.example`](.env.example)). Ese fichero está en `.gitignore` y nunca se sube.
- **En producción (Cloud Run):** los secretos están en **Secret Manager** (`database-url`, `session-secret`, `admin-email` y `admin-password`) y Cloud Run los entrega a la aplicación como variables de entorno. Solo los puede leer la cuenta de servicio con la que se ejecuta la aplicación.
- **En Render (alternativo):** los valores se guardan en el panel del servicio (*Environment*). `SESSION_SECRET` lo genera Render y el resto se introduce a mano (`sync: false` en [`render.yaml`](render.yaml)).
- Si en producción falta un secreto obligatorio, la aplicación no arranca y lo indica en el log, en lugar de funcionar de forma insegura.

| Variable | Secreto | Descripción |
|---|---|---|
| `PORT` | No | Puerto HTTP del servidor (por defecto 3000) |
| `NODE_ENV` | No | `production` en el despliegue (cookies solo por HTTPS y secretos obligatorios) |
| `SESSION_SECRET` | Sí | Firma la cookie de sesión. Obligatorio en producción (mínimo 32 caracteres); en local, si falta, se genera uno aleatorio en cada arranque |
| `DATABASE_URL` | Sí | Cadena de conexión de PostgreSQL (Neon). Obligatoria en producción; en local, si falta, los datos se guardan en memoria |
| `ADMIN_EMAIL` | No | Email del primer administrador (se crea o se promociona al arrancar) |
| `ADMIN_PASSWORD` | Sí | Contraseña del primer administrador (mínimo 8 caracteres). Solo se usa si la cuenta no existe |
| `ALLOWED_DOMAINS` | No | Dominios de correo permitidos, separados por comas (en producción: `uclm.es,alu.uclm.es`). Lo usa `POST /api/prueba/dominio` |
| `LOG_LEVEL` | No | Nivel del registro de actividad: `debug`, `info` (por defecto), `warn`, `error` o `silent` |
| `REQUIRE_EMAIL_CONFIRMATION` | No | `true` para que las cuentas nuevas queden pendientes hasta confirmar el correo. Por defecto `false`, porque el envío de correos es del Hito 4 |

## API

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/health` | Público | Comprueba que el servidor está en marcha |
| POST | `/api/auth/register` | Público | Registro con email y contraseña (mínimo 8 caracteres) |
| POST | `/api/auth/login` | Público | Inicia sesión y deja la cookie `grada.sid` |
| POST | `/api/auth/logout` | Público | Cierra la sesión actual |
| GET | `/api/auth/me` | Sesión | Devuelve el usuario con sesión iniciada |
| GET | `/api/users` | Admin | Listado de usuarios (email, rol y estado) |
| GET | `/api/users/:id/active` | Admin | Indica si un usuario está activo: confirmado y no eliminado (no si está conectado) |
| PATCH | `/api/users/:id/role` | Admin | Cambia el rol (`{ "role": "admin" \| "user" }`) |
| DELETE | `/api/users/:id` | Propio o admin | Elimina una cuenta (baja lógica). Nunca se elimina al último administrador |

Los errores se devuelven como `{ "error": { "code": "...", "message": "..." } }`.
Sin una sesión válida, las rutas protegidas responden `401 UNAUTHENTICATED`; con sesión pero sin el rol necesario, `403 FORBIDDEN`.

### Roles

- **user:** gestiona su propia cuenta (ver su perfil y darse de baja).
- **admin:** además, ve el listado de usuarios, comprueba si un usuario está activo, cambia roles y elimina cualquier cuenta.
- **Primer administrador:** al arrancar, si existen `ADMIN_EMAIL` y `ADMIN_PASSWORD`, se crea esa cuenta con rol de administrador (o se promociona si ya existía). Siempre debe quedar al menos un administrador activo.
- Todas estas restricciones se comprueban **en el servidor** (`401` o `403`): la interfaz solo oculta lo que no se puede usar.

**Por qué el primer administrador se crea con variables de entorno.** Es lo único que no necesita entrar en la base de datos a mano ni dejar una contraseña en el código o en un script del repositorio. La contraseña llega como secreto (Secret Manager en Cloud Run, `.env` en local) y solo se guarda su hash. Además, se ejecuta en cada arranque sin repetir nada: si la cuenta ya existe, no se toca su contraseña.

## Acceso como administrador para la revisión

1. Abrir https://la-grada-colchonera-1081564062572.europe-southwest1.run.app. La primera carga puede tardar unos segundos si la aplicación estaba parada.
2. Pulsar **Entrar** e introducir el email y la contraseña del administrador. **No están en el repositorio:** se envían junto con la entrega. Son los valores de los secretos `admin-email` y `admin-password` de Secret Manager.
3. En el menú aparece **Administración**: listado de usuarios con email, rol, estado y fecha de alta, y botones para cambiar el rol o eliminar una cuenta.

Para probar también los permisos de un usuario normal, basta con registrar una cuenta nueva desde **Registrarse**. Como el envío de correos es del Hito 4, la cuenta queda activa al momento.

## Registro de actividad (logs)

La aplicación escribe cada evento relevante como una línea JSON en la salida estándar ([`src/logger.js`](src/logger.js)). En Cloud Run se consultan en **Cloud Logging**, en la pestaña *Registros* del servicio, y en Render en la pestaña *Logs*. Se pueden filtrar por texto, por ejemplo `auth.login_failed`.

| Evento | Nivel | Cuándo |
|---|---|---|
| `app.start`, `app.stop`, `app.storage` | info / warn | Arranque, parada y tipo de almacenamiento |
| `admin.bootstrap` | info | Se crea o se promociona el primer administrador |
| `http.request` | info (error si 5xx) | Cada petición a la API: método, ruta, estado, duración, usuario e id de petición (`X-Request-Id`) |
| `user.registered` | info | Registro de una cuenta |
| `auth.login` / `auth.logout` | info | Inicio y cierre de sesión |
| `auth.login_failed` | warn | Intento de inicio de sesión rechazado (email, motivo e IP) |
| `auth.forbidden` | warn | Acceso denegado por falta de permisos |
| `user.role_changed`, `user.deleted` | info | Cambios de rol y bajas (quién lo hace y sobre quién) |
| `http.error` | error | Errores inesperados, con su traza |

Las contraseñas, hashes, cookies y secretos nunca se registran: el logger los sustituye por `[oculto]`.

## Despliegue

La aplicación se despliega de forma continua en **dos plataformas** a partir de la misma rama `main`. Las dos usan la misma base de datos (Neon), así que muestran los mismos datos.

| | Google Cloud Run | Render |
|---|---|---|
| URL | https://la-grada-colchonera-1081564062572.europe-southwest1.run.app | https://la-grada-colchonera.onrender.com |
| Cómo se despliega | Workflow [`deploy-cloud-run.yml`](.github/workflows/deploy-cloud-run.yml): cuando el CI pasa en `main`, construye la imagen [`Dockerfile`](Dockerfile), la sube a Artifact Registry y la despliega | Render detecta el cambio en `main` y despliega según [`render.yaml`](render.yaml) |
| Secretos | Secret Manager, leídos por una cuenta de servicio que solo puede acceder a ellos | Variables de entorno del panel de Render |
| Acceso desde GitHub | Workload Identity Federation (token temporal, sin claves guardadas) | Integración de Render con GitHub |
| Coste | Créditos de Google Cloud para educación. Escala a cero cuando no hay tráfico | Capa gratuita |

- **Base de datos:** PostgreSQL en Neon (región Frankfurt). Al arrancar, la aplicación aplica las migraciones y crea el primer administrador.
- **Preparar Google Cloud:** solo una vez, con [`scripts/gcp/preparar-cloud-run.sh`](scripts/gcp/preparar-cloud-run.sh) en Cloud Shell. El script crea el proyecto, las APIs, Artifact Registry, los secretos, las cuentas de servicio y la federación de identidad. Al terminar, muestra las variables que hay que añadir al repositorio: `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_WIF_PROVIDER` y `GCP_DEPLOY_SA`.
- **Si una versión no arranca**, por ejemplo porque falta un secreto, ni Cloud Run ni Render la ponen en marcha: siguen sirviendo la anterior.
- **Arranque en frío:** Cloud Run (con 0 instancias mínimas) y la capa gratuita de Render detienen la aplicación cuando no hay tráfico, así que la primera petición puede tardar unos segundos.

## Flujo de trabajo

GitHub Flow organizado por hitos (ver [`CONTRIBUTING.md`](CONTRIBUTING.md)):

```mermaid
gitGraph
    commit id: "inicio"
    branch hito-1/integracion
    branch hito-1/T1-estructura-base
    commit id: "[T1]"
    checkout hito-1/integracion
    merge hito-1/T1-estructura-base id: "PR #1"
    branch hito-1/T2-github-flow
    commit id: "[T2]"
    checkout hito-1/integracion
    merge hito-1/T2-github-flow id: "PR #2 … #8"
    checkout main
    merge hito-1/integracion id: "PR #9" tag: "hito-1"
    branch hito-2/integracion
    commit id: "[T9] … [T14] (PRs #11–#16)"
    checkout main
    merge hito-2/integracion id: "PR #17" tag: "hito-2"
    branch hito-3/integracion
    commit id: "[T15] … [T20] (PRs #18–#23)"
    checkout main
    merge hito-3/integracion id: "PR #24" tag: "hito-3"
```

- `main`: versión estable y desplegada. Solo recibe cambios mediante pull request.
- `hito-N/integracion`: rama de cada hito. Reúne las tareas del hito y se integra en `main` con un PR al cerrarlo, que se publica como release `hito-N`.
- `hito-N/Tx-descripcion`: una rama por tarea de DoneTonic, que se integra en la rama de su hito mediante un PR titulado `[Tx] ...`.
- `main` y `hito-*/integracion` están protegidas: solo admiten cambios por PR y exigen que el check **Pruebas** del CI esté en verde.
- Antes de abrir cada PR se ejecuta `npm test` en local. Después, el CI vuelve a ejecutar las pruebas en el PR y otra vez al llegar a `main`, y entonces se despliega en Cloud Run sin intervención manual.

## Gestión del proyecto

El trabajo se ha planificado y seguido en **DoneTonic** (espacio *TFG*, equipo *Colchoneros*, Sprint 1 del 29/09/2026 al 27/10/2026). Hay 19 PBIs priorizados por hito, cada uno con sus tareas, y cada tarea corresponde a una rama y a un PR de este repositorio.

En [`docs/gestion/README.md`](docs/gestion/README.md) están:

- el backlog completo con el estado de cada PBI;
- la trazabilidad tarea → rama → PR → release;
- el burndown del sprint y las gráficas de seguimiento que hay en DoneTonic (burnup, burndown y velocity).
- capturas del tablero, de las gráficas y del backlog en DoneTonic.

| Tablero del Sprint 1 | Gráficas del sprint |
|---|---|
| ![Tablero del Sprint 1 en DoneTonic](docs/capturas/donetonic/01-tablero-sprint.png) | ![Sprint Burnup y Burndown en DoneTonic](docs/capturas/donetonic/02-graficas-sprint.png) |

## Memoria

La memoria del proyecto, planteada como un TFG, está en [`memoria/`](memoria/README.md). Se escribe en LaTeX y se compila con **LuaLaTeX**. Allí se explica cómo generar el PDF.
