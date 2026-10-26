# La Grada Colchonera

[![CI](https://github.com/VelaElDios/la-grada-colchonera-saas/actions/workflows/ci.yml/badge.svg)](https://github.com/VelaElDios/la-grada-colchonera-saas/actions/workflows/ci.yml)
[![Última versión](https://img.shields.io/github/v/release/VelaElDios/la-grada-colchonera-saas?label=versi%C3%B3n)](https://github.com/VelaElDios/la-grada-colchonera-saas/releases)
[![Desplegado en Cloud Run](https://img.shields.io/badge/demo-Google%20Cloud%20Run-4285F4)](https://la-grada-colchonera-1081564062572.europe-southwest1.run.app)

Juego web rojiblanco tipo *survivor* (pixel art, en el navegador): eliges a un jugador de la historia del Atleti, aguantas oleadas de rivales y jefes de final en final (Copa, Liga, Champions y Mundial), fichas a nuevos jugadores, los entrenas y compites en el ranking. Proyecto individual de **Procesos de Ingeniería del Software (curso 2026-2027)**, planteado como un TFG.
Por debajo es una aplicación SaaS organizada en capas: cuentas de usuario con registro y confirmación por correo, inicio de sesión local y con Google, roles, base de datos real (el progreso del juego se guarda en el servidor), despliegue continuo y gestión ágil del trabajo (Hitos 1 a 4).

> Proyecto de aficionado sin relación oficial con el Club Atlético de Madrid.

## Entrega

| | |
|---|---|
| **Repositorio** | https://github.com/VelaElDios/la-grada-colchonera-saas |
| **Aplicación desplegada** | https://la-grada-colchonera-1081564062572.europe-southwest1.run.app (Google Cloud Run) |
| **Alcance** | Hitos 1, 2, 3 y 4 del enunciado: registro y acceso locales, roles y administración, confirmación por correo e inicio de sesión con Google |
| **Política de privacidad** | https://la-grada-colchonera-1081564062572.europe-southwest1.run.app/privacidad.html (necesaria para publicar la aplicación de Google) |
| **Acceso de administrador** | Ver [Acceso como administrador para la revisión](#acceso-como-administrador-para-la-revisión). Las credenciales se envían junto con la entrega |
| **Revisión requisito a requisito** | [`docs/revision-entrega.md`](docs/revision-entrega.md) |

## Enlaces rápidos

| Qué | Dónde |
|---|---|
| Aplicación desplegada | Google Cloud Run (principal): https://la-grada-colchonera-1081564062572.europe-southwest1.run.app · Render (alternativo): https://la-grada-colchonera.onrender.com |
| Entregas por hito (releases) | [hito-1](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/hito-1) · [hito-2](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/hito-2) · [hito-3](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/hito-3) · [hito-4](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/hito-4) · [sprint-1](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/sprint-1) |
| Pull requests (uno por tarea y uno por cierre de hito) | [VelaElDios/la-grada-colchonera-saas/pulls](https://github.com/VelaElDios/la-grada-colchonera-saas/pulls?q=is%3Apr+is%3Aclosed+sort%3Acreated-asc) |
| Integración continua (GitHub Actions) | [Ejecuciones del workflow *CI*](https://github.com/VelaElDios/la-grada-colchonera-saas/actions/workflows/ci.yml) |
| Gestión del proyecto (DoneTonic: PBIs, tareas, sprint y gráficas) | [`docs/gestion/README.md`](docs/gestion/README.md) |
| Revisión de la entrega frente al enunciado | [`docs/revision-entrega.md`](docs/revision-entrega.md) |
| Memoria del proyecto (LuaLaTeX) | [`memoria/`](memoria/README.md) |

## Capturas

Las capturas están agrupadas por lo que muestran. Las de **producción** son de la aplicación desplegada en Cloud Run; las demás están hechas con la aplicación en local (con datos de ejemplo) para mostrar estados que en producción necesitarían cuentas reales, como un correo que no llega o una cuenta pendiente.

### Hitos 1–3: cuentas, roles y administración

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

### Hito 4: confirmación por correo, Google y errores

| Entrar, con el botón de Google | Registro: correo de confirmación enviado |
|---|---|
| ![Pantalla de entrar con el botón Entrar con Google](docs/capturas/hito4/01-entrar-google.png) | ![Aviso de que se ha enviado el correo de confirmación](docs/capturas/hito4/02-registro-correo-enviado.png) |
| **Cuenta pendiente: error y botón para reenviar el correo** | **Correo reenviado** |
| ![Error de cuenta pendiente con el botón Reenviar el correo de confirmación](docs/capturas/hito4/03-cuenta-pendiente-reenvio.png) | ![Aviso de reenvío del correo](docs/capturas/hito4/04-reenvio-hecho.png) |
| **Enlace de confirmación manipulado** | **Cuenta confirmada con el enlace correcto** |
| ![Aviso rojo: el enlace de confirmación no es válido o ha caducado](docs/capturas/hito4/05-enlace-invalido.png) | ![Aviso verde: cuenta confirmada](docs/capturas/hito4/06-cuenta-confirmada.png) |
| **Primer acceso tras confirmar** | **Cuenta creada con Google** |
| ![Menú del juego tras entrar con la cuenta confirmada](docs/capturas/hito4/07-primer-acceso.png) | ![Aviso de cuenta creada con Google y menú del juego](docs/capturas/hito4/08-google-cuenta-creada.png) |
| **Panel de administración con cuentas locales, de Google, pendientes y eliminadas** | **Política de privacidad** |
| ![Panel de administración con todos los estados de cuenta](docs/capturas/hito4/09-panel-admin.png) | ![Página de política de privacidad](docs/capturas/hito4/10-privacidad.png) |

### Hito 4 comprobado en producción

Pruebas hechas en la aplicación desplegada el 23/10/2026. El enlace del correo se ha tapado en la captura porque lleva un token de un solo uso.

| Correo de confirmación recibido (SMTP de Gmail) | Cuenta confirmada: primer acceso |
|---|---|
| ![Correo de confirmación recibido en Gmail](docs/capturas/produccion/01-correo-confirmacion.png) | ![Menú del juego tras confirmar la cuenta de prueba](docs/capturas/produccion/03-confirmada-primer-acceso.png) |
| **Enlace manipulado en producción** | **Acceso con Google: cuenta propia** |
| ![Aviso de enlace de confirmación no válido en la aplicación desplegada](docs/capturas/produccion/05-enlace-manipulado.png) | ![Mi cuenta tras entrar con Google: rol Aficionado, estado Activa](docs/capturas/produccion/02-google-mi-cuenta.png) |
| **Acceso con Google: cuenta ajena al proyecto** | **Aplicación de Google publicada («En producción»)** |
| ![Entrada directa al juego con otra cuenta de Google](docs/capturas/produccion/04-google-otra-cuenta.png) | ![Google Auth Platform: estado de publicación En producción, usuarios externos](docs/capturas/produccion/07-google-publicada.png) |

<details>
<summary>Despliegue continuo en verde tras fusionar los PRs del Hito 4</summary>

![GitHub Actions: CI y despliegue en Cloud Run en verde](docs/capturas/produccion/06-actions-verde.png)

</details>

### Juego

| Menú principal | Vestuario |
|---|---|
| ![Menú principal con tus tiempos y el menú de juego](docs/capturas/juego/05-menu.png) | ![Vestuario: elegir jugador](docs/capturas/juego/03-seleccion.png) |

| Partida: barro, gradas y premios | Elegir una mejora al subir de nivel |
|---|---|
| ![Partida en pixel art con barro, gradas, premios, ritmo y ulti](docs/capturas/juego/01-partida.png) | ![Menú para elegir una de tres mejoras](docs/capturas/juego/02-mejoras.png) |

| Jefe: Cristiano y su salto «Siuuu» |
|---|
| ![Cristiano salta y avisa dónde va a caer](docs/capturas/juego/04-jefe.png) |

## Qué incluye cada hito

| Hito | Contenido | PBIs (DoneTonic) | Entrega |
|---|---|---|---|
| **1. Esqueleto y backend** | Repositorio con GitHub Flow, CI con GitHub Actions, despliegue continuo en Render (al cerrar el sprint, también en Google Cloud Run), lógica de gestión de usuarios en memoria, pruebas unitarias y API REST. | P1–P6 · T1–T8 | [hito-1](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/hito-1) · PRs #1–#10 |
| **2. Autenticación y separación de capas** | Frontend separado en interfaz (`ui.js`) y cliente de la API (`api.js`), registro e inicio de sesión locales con las contraseñas guardadas como hash bcrypt (nunca en claro ni cifradas de forma reversible), sesión que se mantiene al recargar, cierre de sesión en el servidor y rutas protegidas. | P7–P10 · T9–T14 | [hito-2](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/hito-2) · PRs #11–#17 |
| **3. Persistencia, seguridad y administración** | PostgreSQL (Neon) con migraciones, sesiones guardadas en la base de datos, secretos solo en variables de entorno, roles usuario/administrador con primer administrador, panel de administración, baja de la propia cuenta y logs estructurados. | P11–P14 · T15–T20 | [hito-3](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/hito-3) · PRs #18–#24 |
| **4. Confirmación por correo, Google y errores** | Confirmación de la cuenta por correo con enlace firmado y reenvío, inicio de sesión con Google (OAuth 2.0), manejo de errores y avisos revisado de principio a fin, política de privacidad y aplicación de Google publicada. | P15–P17 · T22–T26 | PRs #37–#41 · ver [Hito 4 en detalle](#hito-4) |
| **Cierre del sprint** | README completo, capturas, documentación de la gestión, revisión de la entrega frente al enunciado, despliegue en Google Cloud Run y carpeta de la memoria. | P18–P19 · T27–T32 | [sprint-1](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/sprint-1) · PRs de `hito-4/*` |

La primera entrega se limitó a los Hitos 1–3. El Hito 4 (P15 OAuth, P16 confirmación por correo y P17 manejo de errores) se ha completado después, apoyándose en la base que ya existía: el modelo de usuario con el estado `pending` y el campo `authProvider` (`local` o `google`). Está desplegado y comprobado en producción (ver [Capturas](#capturas)).

### Hito 4

| PBI | Qué hace | Dónde |
|---|---|---|
| **P16 · Confirmación por correo** (T23, T24) | Al registrarse con email y contraseña la cuenta queda `pending` y se envía un correo con un enlace firmado (HMAC, caduca a las 24 h). `GET /api/auth/confirm` la activa. Si el correo falla la cuenta se crea igualmente y se puede pedir otro (`POST /api/auth/resend-confirmation`, que responde igual exista o no la cuenta). El login de una cuenta pendiente devuelve `403 ACCOUNT_PENDING` y la interfaz ofrece reenviar el correo. | `src/integrations/mailer.js`, `src/services/tokenSigner.js`, `src/services/accountConfirmationService.js` |
| **P15 · Inicio de sesión con Google** (T22) | OAuth 2.0 «authorization code»: `/api/auth/google` manda al usuario a Google con un `state` aleatorio guardado en su sesión; `/api/auth/google/callback` comprueba el `state` (anti-CSRF, de un solo uso), cambia el código por el email **en el servidor** (el `client_secret` nunca llega al navegador) y abre sesión. Si no existía la cuenta se crea ya activa (`authProvider: google`); una cuenta local pendiente queda confirmada; una eliminada no entra. Sin las variables de Google, el botón no aparece. | `src/integrations/googleOAuth.js`, `userService.loginWithOAuth`, `public/js/ui/google.js` |
| **P17 · Manejo de errores** | Toda la interfaz traduce los errores a avisos legibles y los registra en la consola; hay estados de carga, vacío y error con reintento, timeout de 15 s en las peticiones, captura global de promesas rechazadas, y redirecciones de OAuth/confirmación que vuelven a la web con un aviso en lugar de mostrar JSON. | `public/js/ui/componentes.js`, `public/js/ui.js`, `src/api/errorHandler.js` |
| **Secretos y despliegue** (T25) | El workflow de despliegue entrega a Cloud Run los secretos `smtp-url`, `mail-from`, `google-client-id` y `google-client-secret`. Un script de Cloud Shell los crea en Secret Manager y da acceso a la cuenta de servicio. | `.github/workflows/deploy-cloud-run.yml`, `scripts/gcp/configurar-hito4.sh`, [`docs/hito4-configuracion.md`](docs/hito4-configuracion.md) |
| **Política de privacidad** (T26) | Página pública que explica qué datos se guardan, para qué y cómo borrarlos. Google la exige para publicar la aplicación de inicio de sesión. | [`public/privacidad.html`](public/privacidad.html) |

## Arquitectura

La aplicación está dividida en capas que solo se comunican con la capa vecina. El navegador nunca habla con la base de datos, y la lógica de negocio no sabe si los datos están en memoria o en PostgreSQL.

```mermaid
flowchart LR
    subgraph Navegador
        UI["Interfaz<br/>public/js/ui.js + ui/"] --> CLI["Cliente de la API<br/>public/js/api.js"]
    end
    CLI -- "HTTP + JSON<br/>cookie de sesión" --> API
    subgraph "Servidor Node.js + Express"
        API["Capa API<br/>src/api<br/>rutas, sesión, roles, logs"] --> SRV["Lógica de negocio<br/>src/services"]
        SRV --> REPO["Acceso a datos<br/>src/repositories"]
        SRV --> INT["Integraciones<br/>src/integrations<br/>correo y Google"]
    end
    INT -- "SMTP" --> SMTP["Gmail<br/>correo de confirmación"]
    INT -- "OAuth 2.0" --> GOO["Google<br/>inicio de sesión"]
    REPO -- "producción" --> PG[("PostgreSQL<br/>Neon")]
    REPO -. "desarrollo y pruebas" .-> MEM[("Memoria")]
    API -- "sesiones" --> PG
    API -- "logs JSON" --> LOGS["stdout<br/>Cloud Logging"]
```

- **Presentación** (`public/`): HTML, CSS y JavaScript sin framework. la interfaz (`ui.js` y `ui/`) solo pinta vistas; todas las peticiones pasan por `api.js`.
- **API** (`src/api/`): traduce HTTP a llamadas a la lógica. Aquí están los middlewares de sesión (`requireAuth`), roles (`requireRole`), registro de peticiones y el manejador de errores común.
- **Lógica** (`src/services/`): reglas de negocio (registro, autenticación, roles, bajas, último administrador). Recibe sus dependencias por parámetro.
- **Datos** (`src/repositories/`): dos implementaciones del mismo contrato, en memoria y en PostgreSQL. Las mismas pruebas se pasan a las dos.
- **Integraciones** (`src/integrations/`): lo que habla con servicios externos, el correo (SMTP) y Google (OAuth 2.0). La lógica solo conoce su contrato (`mailer.send(...)`, `client.getProfile(...)`), así que en las pruebas se sustituyen por versiones falsas y no se envía nada ni se llama a Google.

## Tecnologías

Cada tecnología lleva una frase que justifica por qué se ha elegido.

| Tecnología | Para qué | Justificación |
|---|---|---|
| Node.js 22 + Express 5 | Servidor y API REST | Un único lenguaje (JavaScript) en cliente y servidor y un framework mínimo en el que las capas se ven como módulos simples. Express 5 pasa los errores asíncronos al manejador común. |
| HTML, CSS y JavaScript sin framework | Frontend | El propio backend sirve el frontend (mismo origen, sin CORS), no hace falta compilar nada y la frontera entre interfaz (`ui.js` y `ui/`) y cliente (`api.js`) se ve en dos ficheros. |
| PostgreSQL en Neon (capa gratuita) | Base de datos | Base de datos relacional real, gestionada y gratuita. Las tablas se crean con migraciones SQL versionadas. |
| `pg`, `connect-pg-simple` | Acceso a PostgreSQL y sesiones | Consultas parametrizadas (sin inyección SQL) y sesiones guardadas en la base de datos, que sobreviven a reinicios y despliegues. |
| `nodemailer` + SMTP de Gmail | Correo de confirmación | Librería estándar para enviar correo por SMTP autenticado (puerto 465), que sí funciona en Cloud Run; el SMTP directo suele estar bloqueado. Sin `SMTP_URL`, el correo se escribe en el registro, útil en local. |
| Google OAuth 2.0 (Google Auth Platform) | Inicio de sesión con Google | Flujo de código de autorización con intercambio en el servidor: el secreto del cliente nunca llega al navegador y solo se acepta un email verificado. Escrito con `fetch`, sin librerías de terceros. |
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
  integrations/        Servicios externos: correo (SMTP) y Google OAuth
  models/              Modelo de usuario (roles, estados)
  db/                  Conexión, migraciones SQL y script de migración
public/
  index.html           Página única (SPA con rutas por hash)
  privacidad.html      Política de privacidad (requisito de Google)
  css/                 Sistema de diseño: tokens, base, componentes, vistas y juego
  fonts/               Plus Jakarta Sans autoalojada (licencia OFL)
  js/ui.js             Punto de entrada: enrutador, control de acceso, foco y errores
  js/ui/               Módulos de interfaz: cabecera, formularios, avisos, diálogos, componentes
  js/ui/vistas/        Una vista por módulo (inicio, entrar, registro, perfil, admin, jugar, 404)
  js/api.js            Cliente de comunicación con la API (único sitio con fetch)
  js/game/             Juego «survivor» rojiblanco: simulación pura, dibujo en canvas, HUD, audio y entrada
tests/                 Pruebas automatizadas (unitarias, de API y de base de datos)
docs/                  Capturas, gestión del proyecto, configuración del Hito 4 y revisión de la entrega
memoria/               Memoria del proyecto en LuaLaTeX
Dockerfile             Imagen de la aplicación (Cloud Run)
scripts/gcp/           Preparación de Google Cloud y de los secretos del Hito 4 (una sola vez)
render.yaml            Despliegue en Render (Blueprint)
.github/workflows/     Integración continua y despliegue en Cloud Run
```

## El juego

La grada es un *survivor* con estética de píxeles «chibi» (cabeza grande, camiseta y botas): oleadas de rivales cada 30 segundos, experiencia, mejoras al subir de nivel y un jefe cada cuatro oleadas. Es **infinito** (siempre hay mejoras que elegir) y los rivales ganan vida, daño y velocidad sin parar: a los 20 minutos es muy difícil sobrevivir y a los 30 casi imposible (la dificultad se comprime con `COMPRESION` en `config.js`). Solo pueden jugar usuarios con sesión; tu progreso (jugadores, entrenamiento, fichas de contrato) y el **ranking de la grada** se guardan en el servidor, ligados a tu cuenta.

- **Menú principal** (al iniciar sesión se entra directo, la cabecera solo tiene *Jugar* y *Mi cuenta*): a la izquierda **Tus tiempos** (mejor tiempo, oleada y nivel máximos, partidas, rivales y jefes derrotados, últimas partidas), en el centro tu jugador paseando por el campo y a la derecha el menú: **Jugar**, **Vestuario** (elegir jugador), **Dirección** (elegir entrenador), **Ranking** (por ahora tus cinco mejores partidas; el de toda la grada llegará) y **Ajustes** (volumen de efectos, música y grada, partículas y números de daño, cámara, controles y joystick táctil).
- **Jugadores del Atleti** (19): porteros **Oblak** y **Musso**; defensas **Godín**, **Lenglet**, **Pubill**, **Nahuel Molina** y **Grimaldo**; medios **Koke**, **Marcos Llorente**, **Pablo Barrios** y **Kang-in Lee**; delanteros **Griezmann**, **Fernando Torres**, **Lookman**, **Giuliano Simeone**, **Julián Álvarez**, **Diego Costa**, **Forlán** y **Falcao**. Las estadísticas parten de la posición (el portero solo ataca cuerpo a cuerpo y es el más resistente; el defensa pega más de cerca; el mediocentro es equilibrado; el delantero tiene el mejor disparo pero poca vida) y cada jugador las retoca con sus propios rasgos (`mods`). Cada uno tiene **entre 8 y 16 habilidades que puede aprender** (los mejores, 16) y empieza con una de ellas: los porteros no aprenden armas de disparo, los defensas tiran de cabezazo, entrada y despeje, los delanteros de chilena, volea y penalti, y los jugones de regate, caño y pared. El **Vestuario** tiene filtro por posición, ficha con estadísticas reales y la lista de habilidades por tipo.
- **Moverse tiene premio.** Corriendo sube el **ritmo** (hasta +25 % de daño y +20 % de experiencia, y la ulti se carga con la distancia recorrida); parado, lo pierdes y los rivales cercanos corren un 35 % más. Por el campo aparecen **premios** (botiquín, balón de oro, energía e imán) casi siempre por delante, señalados con flechas en el borde de la pantalla.
- **El campo**: cada partida es un mundo distinto, generado con ruido como en Minecraft (ver *Mapa procedural* más abajo): barrios de estadios con gradas, plazas con tiendas, campos de entrenamiento, parques y prados con mesetas y escaleras. Hay **barro** (te frena a la mitad) y **lluvia** (los balones, tuyos y rivales, van un 70 % más rápido). Gradas, tiendas, árboles y porterías no los atraviesa nadie; los balones sí pasan por encima de taludes, vallas y bancos.
- **Ambientes (cada 5 minutos cambia la pantalla)**: pretemporada a mediodía → **Final de la Copa del Rey** (tarde de sol) → **Final de Liga** (atardecer) → **Final de la Champions** (noche con focos, mosaico y bengalas) → **Final del Mundial** (noche de gala con fuegos artificiales y confeti, y **todos con la camiseta de su selección**: tu jugador la de su país, los rivales y los jefes que son jugadores también). Cambian la luz, la paleta del césped, la afición, los carteles, la pantalla gigante y el trofeo de las plazas, sale un cartel con el nombre de la final y los rivales salen más fuertes (`AMBIENTES[].fuerza`, encima de lo que ya crecen con el tiempo).
- **Rivales con carácter**: Liverpool, Arsenal, PSG y Dortmund **embisten** a más velocidad que tú (se agachan y salen un «!» antes), y Bayern, City, Chelsea, Juventus, Milan, Inter y Nápoles **disparan balones**.
- **Entrenadores**: **Cholo Simeone** (+10 % de daño, +5 % de vida; ulti «¡Partido a partido!»: onda gigante y +30 % de daño durante 6 s) y **Luis Aragonés** (+5 % de velocidad, +12 % de experiencia; ulti «Furia Roja»: armas el doble de rápidas y más velocidad durante 7 s). La ulti se carga con las bajas, se lanza con `Espacio`/`E` o el botón **ULTI**, hace daño fijo (brilla al principio, se queda corta al final) y cada vez tarda más en cargarse.
- **Rivales**: 16 equipos famosos con jugadores genéricos (Real Madrid, Barcelona, Bayern, Liverpool, City, United, Chelsea, Arsenal, Juventus, Milan, Inter, PSG, Dortmund, Ajax, Benfica y Nápoles), que se van desbloqueando por oleadas.
- **Jefes** (10, uno cada 5 oleadas, **al azar** entre los que ya les toca salir y sin repetir hasta que han salido todos; a partir de la oleada 30 salen dos a la vez y cada vuelta completa los hace un 50 % más duros), con **tres fases** (66 % y 33 % de vida: más ataques, menos espera, más velocidad): **Pep Guardiola**, **José Mourinho**, **Cristiano Ronaldo** y **Leo Messi** (como siempre), y los nuevos **Vinicius Jr.** (embestidas en zigzag), **Lamine Yamal** (rosca, tiki-taka y extremos), **Neymar** (lluvia de impactos, saltos y espirales), **Gareth Bale** (cañonazos enormes y arrancadas de velocista), **Karim Benzema** (disparos de precisión y rondos) y **Luis Suárez** (mordiscos: embestida con pulso, muros y autobús). Los más duros no salen hasta más tarde (`desde` en `config.js`).
- **Armas** (se disparan solas, 5 niveles): de disparo (no las puede usar el portero) balón, cañonazo de falta, saque de esquina y balón con efecto; de cuerpo a cuerpo bufanda, banderines, cántico, silbato (ralentiza), tarjeta roja (daño según la vida del rival) y VAR (rayos). **Pasivas**: botas, imán, pasión, táctica, cantera, masaje, espinilleras y pulmones. Cuando ya casi todo está al máximo salen **mejoras extra sin límite**.
- **Habilidades nuevas** (22 en total): cuerpo a cuerpo **cabezazo** (aturde), **entrada rasante** (te deslizas arrollando), **barrera defensiva** (escudo temporal) y **despeje** (patadón en abanico que destruye balones rivales); de disparo **vaselina** (cae en área), **chilena**, **volea** (ráfaga) y **penalti** (al rival más duro, no falla); de movilidad **regate** (dash invulnerable), **caño** (aturde en área), **pared** (balón que va y vuelve) y **contragolpe** (más velocidad y daño un rato). Los rivales **aturdidos** se quedan quietos y no hacen daño (los jefes solo se ralentizan).
- **Combinaciones («metas»)**: 16 combinaciones que se activan al juntar ciertas habilidades a cierto nivel (por ejemplo *Muro rojiblanco*: barrera + cabezazo + despeje; *Tiki-taka*, *Pichichi*, *Catenaccio*, *Leyenda rojiblanca*…) y dan bonus de daño, velocidad, resistencia, recarga, aturdimiento o experiencia. Al subir de nivel, las mejoras que completan una combinación salen marcadas con ★ y se cuelan más a menudo en la oferta; las que consigas se guardan en el menú **Combinaciones**, donde las no descubiertas solo dan una pista y se indica si tu jugador puede conseguirlas. Todo se equilibra en `SINERGIAS` (`config.js`).
- **El menú** nunca deja al muñeco pillado: el mundo del menú tiene un pasillo libre de obstáculos por el que pasea en línea recta.
- **Controles**: WASD o flechas; en móvil, joystick flotante al arrastrar (se puede desactivar en Ajustes). `Esc`/`P` pausa; la partida se pausa sola al cambiar de pestaña.
- **Arquitectura**: `game/mundo.js` es una simulación pura (paso fijo 1/60 s, generador con semilla, sin DOM) que se prueba en `tests/game.test.js`, `tests/juego-personajes.test.js` y `tests/juego-movilidad.test.js`; todo el equilibrio está en `config.js`; `oleadas.js`, `rivales.js`, `jefes.js`, `terreno.js` (el mundo: barrios, mesetas, barro, lluvia, caminos y estructuras), `ulti.js`, `armas.js` y `mejoras.js` son módulos de la simulación; `sprites.js` dibuja los muñecos con código (sin imágenes), `render-mundo.js` pinta el suelo, los edificios, la luz y los ambientes, y `render.js` lo junta todo en un canvas 2D; `hud.js`, `audio.js` y `musica.js` (efectos, música chiptune y grada sintetizados con Web Audio), `logros.js` y `fin-ui.js` (logros y pantalla de fin), `ajustes.js`, `marca.js` (tus tiempos) y `entrada.js` son independientes entre sí; `juego.js` los conecta.
- Respeta `prefers-reduced-motion` (sin sacudidas ni partículas). Proyecto de aficionado: los dibujos son originales y no se usan escudos ni imágenes oficiales.
- Capturas en [Capturas del juego](#capturas).

### Club: contratos, entrenamiento y ranking (Fase 2)

- **Plantilla inicial**: empiezas con 1 portero, 1 defensa, 1 medio y 1 delantero al azar entre los de rareza común. El resto (36 jugadores en total, con nacionalidad y ficha) se ficha con contratos.
- **Contratar**: cada 3 jefes derrotados (acumulados en toda la cuenta) das una **ficha de contrato**; al canjearla se firma el contrato (animación de unos 5 s, en pixel art, con el boli escribiendo el nombre) y llega un jugador que no tengas. La **rareza** depende de lo que fue cada uno **en el Atleti** (`RAREZAS` en `config.js`): Común, Raro, Épico y Leyenda, con menos probabilidad cuanto más raro.
- **Entrenamiento**: cada jugador gana 1 punto por cada 3 jefes que derrota con él **y también por los rivales que elimina** (el primer punto cuesta unas 120 bajas y cada uno sale más caro, hasta 40 puntos por bajas), así que incluso sin matar jefes se sube de nivel. Estadísticas (máx. 20): **Vida** (+6 %/pt), **Defensa** (−2 % de daño recibido, tope 40 %), **Disparo** (+4 % de daño) y **Suerte** (+2 % crítico y +2 % experiencia).
- **Poderes nuevos**: Toque dorado (balones dorados que pegan más), Botas en llamas (balones con fuego que queman), Paradón (cargas de parada extra), brazalete, trébol y prórroga, más las armas *Champions* y *Bengala* y 5 sinergias nuevas. Aparecen rivales **élite** (blindado, veloz, furia) y hay menos botiquines.
- **Ranking multijugador**: un registro por usuario con su mejor tiempo (en empate, mayor nivel), jefes y bajas. Se muestra el alias (parte local del email, nunca el email completo).
- **Servidor**: `GET /api/juego/perfil`, `POST /api/juego/partidas`, `POST /api/juego/partidas/:id/fin`, `POST /api/juego/contratar`, `POST /api/juego/entrenar`, `GET /api/juego/ranking`, `POST /api/juego/desbloquear` (admin), `PUT /api/juego/identidad` (mote y avatar). El resultado se valida contra el reloj del servidor (anti-trampas). Migración `003_crear_tablas_juego.sql` (`juego_perfiles`, `juego_records`).

### Logros, estadísticas, sonido y jefes más duros (Fase 6)

- **Logros con historia** (29, `logros.js`): cada uno tiene un nombre rojiblanco y esconde un **dato curioso del Atleti** que solo se descubre al conseguirlo. Hay de recorrido (*Camino de la final*, *Campeones de Liga*, *Noche europea*, *Final del Mundial*), guiños a cada leyenda (*Tercero en París*: el Balón de Oro con Griezmann, que en 2018 se quedó tercero; *Bota de Oro charrúa* con Forlán; *El cabezazo del Camp Nou* con Godín; *Cinco Zamoras* con Oblak; *Los 27 de Costa*; *Hamburgo, 2010*…), de entrenadores, de hazañas (*El muro*, *El récord de Adelardo*, *Mil en el Metropolitano*) y hasta *El Pupas* (que te eliminen antes del minuto 2). Pantalla **Logros** en el menú, con aviso de los nuevos y un cartel en plena partida al conseguirlos.
- **Equipaciones** (10): segunda azul noche, tercera flúor, *Noche europea*, *Final del Mundial* dorada, *Centenario 1903* azul y blanca, *Doblete del 96*, *Adiós al Calderón*, la verde de portero y la gris de *El Pupas*. Se desbloquean con logros y se eligen en el **Vestuario** (en la final del Mundial manda la camiseta de tu selección).
- **Anti-trampas**: el cliente detecta los logros y el servidor solo apunta los que puede comprobar con su reloj y lo que sabe de la partida (tiempo, jefes, bajas, jugador y entrenador); los de plantilla (*Toda una vida*, *Azul y blanco*, *Paseo de Leyendas*) los calcula él. `POST /api/juego/partidas/:id/fin` acepta `logros` y devuelve `recompensas.logrosNuevos`; el perfil trae `logros` y `equipaciones`.
- **Pantalla de fin de partida** con estadísticas: tiempo, ambiente al que llegaste, oleada, nivel, bajas, jefes, daño total, golpe más fuerte, críticos, daño recibido y vida recuperada, **barras de daño por habilidad** (cada arma, ultra, ulti y quemaduras apuntan su daño en `mundo.stats`), jefes derrotados con el tiempo que te costaron, ultras y combinaciones, y los logros nuevos.
- **Música chiptune original** (`musica.js` + `audio.js`, todo sintetizado con Web Audio: ondas de pulso, triángulo y ruido): al cambiar de pantalla suena una **fanfarria** propia de cada competición (saque inicial, pasodoble de Copa, alirón de Liga, himno de la noche europea y fiesta mundial; composiciones propias, no los himnos oficiales) y después una **canción de fondo más suave** que se va animando (más capas de bajo, arpegio, melodía y batería cuanto más aguantas y cuando hay un jefe) y es más rápida en cada final. En pausa suena apagada, como desde el túnel de vestuarios.
- **La grada**: murmullo que sube al acercarte a las gradas y **cánticos** («¡A-tle-ti!» con voces sintetizadas y palmas) cuando estás cerca; ruge con las fanfarrias y al eliminar a un jefe. **Efectos nuevos**: silbato del árbitro en cada oleada y al final del partido, arpegios al subir de nivel y en logros, combinaciones y ultras, gemas que suben de tono si las coges seguidas, bocina de jefe… Ajuste nuevo **Música y grada** aparte del volumen de efectos.
- **Muñecos con más detalle**: sombreado de pelo, cara, camiseta y botas, orejas, nariz y peinados nuevos (melena, flequillo, moño, raya), brazalete de capitán (Godín, Koke, Gabi y Torres), cinta en el pelo (Forlán, Falcao), pecas (Torres), cejas marcadas, pendientes, tatuajes y los dientes de Suárez; Griezmann y Bale con moño, Messi con melena, Benzema rapado con barba y Guardiola sin gafas.
- **Jefes más duros** (el primero sigue siendo asequible): desde el segundo jefe de la partida llegan con **escolta** de élites de su equipo y piden refuerzos al cambiar de fase; si tardas en ganarles **pierden la paciencia** (furia: aura roja, más velocidad, más daño y menos espera); y en la fase 3 sacan su **jugada estrella**: espiral de tres brazos (Guardiola), doble autobús (Mourinho), triple «Siuuu» con anillo al caer (Cristiano), eslalon de cinco arrancadas (Messi), samba en zigzag (Vinicius), roscas cruzadas (Yamal), lluvia total de bicicletas (Neymar), balón gigante que revienta (Bale), francotirador con láser de aviso (Benzema) y triple mordisco (Suárez).

### Rarezas, habilidades, combinaciones y fichajes (Fase 5)

- **Rarezas por historia rojiblanca** (años en el club, títulos y peso en la historia, no la fama fuera): **Leyenda** Oblak, Godín, Koke, Griezmann, Torres, Gabi, Adelardo y Luis Aragonés; **Épico** Simeone, Futre, Diego Costa, Forlán, Miranda, Saúl, Courtois y Pantić; **Raro** Kun Agüero, Falcao, Julián Álvarez, Llorente, Savić, Trippier, Tiago y Partey; **Común** el resto. Cuanto más raro, más habilidades puede aprender (Común 8-9, Raro 10-11, Épico 12-13, Leyenda 14-16) y menos sale en un contrato. Cada rareza tiene su color (también la común).
- **Habilidades niveladas**: las muy fuertes tienen niveles que no salen hasta cierto minuto (`desdeMinuto`): el **regate** (te hace intocable) sube a nivel 3 desde el minuto 8, a 4 desde el 13 y a 5 desde el 18, y nunca se lanza más a menudo que cada 4,5 s (`cdMin`); también la entrada rasante y el contragolpe. Los poderes **Toque dorado**, **Botas en llamas**, **Paradón** y **Prórroga** ya no salen desde el principio, y los nombres de los premios de verdad (Balón de Oro, Bota de Oro, Zamora…) quedan para las ULTRAS.
- **Combinaciones y ultras a la vista**: todas con su nombre, lo que dan, lo que piden (en verde lo que tu jugador puede aprender) y para qué ultra cuentan, con filtros *Todas / Con tu jugador / Conseguidas*.
- **Hitbox**: lo que se ve es lo que choca. Edificios, gradas, puestos, porterías y bancos chocan en todo su dibujo (no te puedes esconder detrás de un tejado) y los muñecos chocan con los **pies** (`PIES` en `config.js`), como se ve en la vista 3/4. Si te pones detrás de un árbol, la copa se vuelve transparente.

### Mundo, ambientes, tu ficha y entrenamiento (Fase 4)

- **Mundo nuevo** en cada partida y **5 ambientes**, uno cada 5 minutos (ver arriba).
- **Tu ficha**: después de iniciar sesión, la primera vez que entras al juego te pide un **mote** (3 a 16 caracteres, único sin distinguir mayúsculas ni tildes) y una **cara** para el avatar: la de cualquier jugador que tengas fichado o la de un entrenador. El mote sustituye al correo en la cabecera de la web, en «Mi cuenta» y en el **ranking**, que también enseña el avatar. Se cambia cuando quieras desde la tarjeta de arriba a la izquierda del menú del juego. `PUT /api/juego/identidad` (`{ apodo, avatar }`), migración `004_identidad_en_el_juego.sql`.
- **Entrenamiento** solo enseña al jugador elegido para jugar; para entrenar a otro, se cambia en el Vestuario.

### Ultras, dificultad y modo pruebas (Fase 3)

- **6 habilidades Ultra** (`ULTRAS` en `config.js`, lógica en `ultras.js`, efectos en `render-ultras.js`): **Premio Puskás** (chilena/tiro con efecto: gol imposible con estela y onda), **Ganador del Balón de Oro**, **MVP de la Champions**, **Trofeo Zamora**, **Bota de Oro histórica** y **Mejor jugador del Mundial**. No se eligen: se **consiguen solas** al completar 2–3 combinaciones concretas (y, según la ultra, llevar armas de esas combinaciones y haber subido sus armas lo bastante). Cada una tiene un efecto visual muy marcado y un daño en parte fijo y en parte porcentual a la vida del rival (contra jefes pega bastante menos).
- **Combinaciones nuevas** (24 en total) con nombre propio: *Golazo de otro planeta*, *Remontada épica*, *Máquina de goles*, *Triple Corona*, *Noche europea*, *Estrella de la suerte*, *Capitán eterno*, *Infierno del Metropolitano*, *Plantilla completa*…
- **Dificultad con castigo**: pasado el minuto 9 los rivales crecen más rápido (`TRAMO_FINAL`) y desde el 12 aguantan mejor el daño normal (`CURTIDOS`, con aviso en pantalla). Sin ultras el techo (con una build perfecta) ronda los 25 minutos; con ellas se puede llegar a la media hora o más. Calibrado con un bot, así que las cifras son orientativas: los mandos están en `config.js`. Maxear una sola cosa al principio ya no vale. Al empezar, una **ayuda inicial** (más daño y experiencia que se apaga en ocho minutos) facilita matar al primer jefe con el personaje base.
- **Modo pruebas**: `POST /api/juego/desbloquear` (solo administradores) da los 36 jugadores y puntos de sobra sin tocar el ranking. En la web, botón «Modo pruebas» en Entrenamiento si tu cuenta es admin. Desde la terminal: `DATABASE_URL=… npm run juego:desbloquear -- tu@email.com`.

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

Son 271 pruebas automatizadas (26 suites):

- **Lógica (pruebas unitarias):** registro, email repetido, cuenta pendiente que intenta entrar, usuario normal que intenta eliminar a otro, roles, bajas y último administrador. Muchas comprueban casos de error, no solo el camino feliz.
- **Repositorios:** el mismo contrato para memoria y para PostgreSQL.
- **API:** códigos 401 y 403, sesión, cambio de rol y baja.
- **Configuración y secretos.**
- **Logs:** se comprueba también que nunca aparecen contraseñas.
- **Confirmación por correo:** el token firmado (válido, manipulado y caducado), el correo con su enlace, el reenvío sin revelar si la cuenta existe y el aviso de cuenta pendiente.
- **Google OAuth:** el `state` (falso, ausente y reutilizado), la cuenta nueva, la pendiente que se confirma, la eliminada y el email sin verificar, todo con un `fetch` falso, sin llamar a Google.
- **Interfaz y juego:** que solo `api.js` use `fetch`, que la interfaz no inserte texto de usuario como HTML, que los módulos se puedan importar y la simulación del juego (paso fijo, semilla, armas, personajes, entrenadores, jefes con escolta, furia y jugada estrella, ulti y dificultad infinita), los logros y lo que el servidor se cree de ellos, el daño por habilidad de la pantalla de fin y que la música chiptune esté bien escrita.
- **Migraciones y arranque.**
- **Recorrido completo con PostgreSQL:** registro, inicio de sesión y sesión guardada en la base de datos.

El CI ejecuta todas las pruebas contra un PostgreSQL 17 real.

## Variables de entorno y secretos

La configuración y los secretos llegan **solo por variables de entorno** ([`src/loadConfig.js`](src/loadConfig.js)); en el código y en el repositorio no hay ningún valor secreto.

- **En local:** se copian las variables en un fichero `.env` (partiendo de [`.env.example`](.env.example)). Ese fichero está en `.gitignore` y nunca se sube.
- **En producción (Cloud Run):** los secretos están en **Secret Manager** (`database-url`, `session-secret`, `admin-email`, `admin-password`, `smtp-url`, `mail-from`, `google-client-id` y `google-client-secret`) y Cloud Run los entrega a la aplicación como variables de entorno. Solo los puede leer la cuenta de servicio con la que se ejecuta la aplicación.
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
| `REQUIRE_EMAIL_CONFIRMATION` | No | Por defecto `true`: las cuentas nuevas quedan pendientes hasta confirmar el correo. Solo se desactiva a propósito con `false` |
| `PUBLIC_URL` | No | URL pública de la app, para los enlaces de los correos y la vuelta de Google. Si falta se usa la de cada petición |
| `SMTP_URL` | No | Correo saliente: `smtps://usuario:contraseña@servidor:465`. Sin ella, los correos no se envían y su enlace se escribe en el registro (útil en local) |
| `MAIL_FROM` | Con `SMTP_URL` | Remitente de los correos |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | No (las dos o ninguna) | Cliente OAuth de Google. URI de redirección autorizada: `<URL de la app>/api/auth/google/callback` |

## API

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/health` | Público | Comprueba que el servidor está en marcha |
| POST | `/api/auth/register` | Público | Registro con email y contraseña (mínimo 8 caracteres) |
| POST | `/api/auth/login` | Público | Inicia sesión y deja la cookie `grada.sid` |
| POST | `/api/auth/logout` | Público | Cierra la sesión actual |
| GET | `/api/auth/me` | Sesión | Devuelve el usuario con sesión iniciada |
| GET | `/api/auth/confirm?token=…` | Público | Confirma la cuenta (enlace del correo) y redirige a la web con un aviso |
| POST | `/api/auth/resend-confirmation` | Público | Reenvía el correo de confirmación (`{ "email": "..." }`) |
| GET | `/api/auth/providers` | Público | Indica qué proveedores externos hay disponibles (`{ "google": true \| false }`) |
| GET | `/api/auth/google` | Público | Inicia el acceso con Google (redirige a Google) |
| GET | `/api/auth/google/callback` | Público | Vuelta de Google: abre sesión y redirige a la web |
| GET | `/api/users` | Admin | Listado de usuarios (email, rol y estado) |
| GET | `/api/users/:id/active` | Admin | Indica si un usuario está activo: confirmado y no eliminado (no si está conectado) |
| PATCH | `/api/users/:id/role` | Admin | Cambia el rol (`{ "role": "admin" \| "user" }`) |
| DELETE | `/api/users/:id` | Propio o admin | Elimina una cuenta (baja lógica). Nunca se elimina al último administrador |
| GET | `/api/juego/perfil` | Sesión | Tu club: plantilla, entrenamiento, fichas, puntos, logros y equipaciones |
| PUT | `/api/juego/identidad` | Sesión | Mote y avatar (`{ "apodo": "...", "avatar": "p:koke" \| "e:cholo" }`): `409` si el mote ya lo tiene otro |
| GET | `/api/juego/ranking` | Sesión | Ranking de la grada (mote y avatar de cada uno, nunca el correo) |
| POST | `/api/prueba/dominio` | Público | Indica si el dominio de un email está permitido (`{ "email": "..." }` → `{ "permitido": true \| false }`). Ver [Prueba técnica](#prueba-técnica-del-sprint-1-variante-3) |

Los errores se devuelven como `{ "error": { "code": "...", "message": "..." } }`.
Sin una sesión válida, las rutas protegidas responden `401 UNAUTHENTICATED`; con sesión pero sin el rol necesario, `403 FORBIDDEN`.

#### Cámara y sensaciones

La cámara es 3/4: el suelo se aplasta en vertical (`CAMARA.inclinacion`) y los muñecos, balones y textos se dibujan de pie sobre él, algo más pequeños cuanto más arriba están. Sigue al jugador con suavidad y mira un poco hacia donde corres. El movimiento tiene inercia (`FISICA`), el jugador se inclina y se estira al correr, los golpes aplastan al muñeco y congelan un instante la partida, los balones dejan estela y al disparar hay destello y retroceso. Todo se ajusta en `public/js/game/config.js`.

#### Mapa procedural, gradas y pantalla completa

El campo es infinito pero siempre igual para una semilla, y cada partida usa una semilla distinta (`terreno.js`). En vez de pegar piezas, varios **ruidos suaves** deciden qué hay en cada punto y todo se mezcla con continuidad:

- **Distrito** (barrios de unos 2.600 px): ciudad, entrenamiento, parque o prado. En la ciudad, los **estadios** (un campo con porterías, focos, banquillos y vallas publicitarias) quedan separados entre sí y las parcelas de al lado se convierten en **gradas que miran al campo** (de frente, de espaldas con su fachada o de lado, con vomitorio en medio) y en explanadas con **puestos** y **tiendas deportivas**. El resto son **plazas**: con el trofeo del ambiente sobre una fuente, **calle comercial**, **pista de fútbol sala enjaulada** o **fan zone** con pantalla gigante.
- **Altura**: en parques y prados se levantan **mesetas de uno o dos niveles** por bloques, con taludes que no se pueden subir (el frente se ve de tierra y piedra, con sombra al pie) y **escaleras** cada pocas baldosas.
- **Humedad, nubes y bosque**: charcos de **barro** (nunca sobre el asfalto ni el césped de un estadio), zonas de **lluvia**, arboledas de árboles frondosos y pinos, matorrales y flores; y un ruido de **caminos** que serpentea por todo el mapa (de tierra en el campo, de piedra en la ciudad), con bancos y farolas al lado.

El suelo se pinta en una textura por celda (a píxeles de 4 unidades) y por ambiente (`render-mundo.js`), una por fotograma como mucho y por adelantado, para que no haya tirones. Las estructuras nunca caen sobre la salida, todo cabe en su celda y casi todo el mapa es alcanzable desde el inicio (hay tests). Los rivales rodean paredes y taludes siguiéndolos (`rodeo`) hasta tener camino libre. Los dibujos de los muñecos van por capas (pelo/piel, camiseta y botas) en `sprites.js`, que también hace las equipaciones de las selecciones y los avatares.

En partida la cabecera de la web se esconde (`body.en-partida`). En la esquina de la pantalla hay silenciar, **pantalla completa** (también la tecla `F`; `F11` funciona igual), **ajustes** (el engranaje pausa y abre todas las opciones) y pausa.

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

Para probar también los permisos de un usuario normal, basta con registrar una cuenta nueva desde **Registrarse**. La cuenta queda pendiente hasta que se pulsa el enlace del correo de confirmación (con Google, queda activa al momento).

### Probar el Hito 4

1. **Confirmación por correo:** en **Crear cuenta**, registrarse con un email real (sirve un alias como `tunombre+prueba@gmail.com`). Llega un correo de *La Grada Colchonera*; hasta pulsar **Confirmar mi cuenta**, entrar da el error de cuenta pendiente con el botón para reenviarlo.
2. **Enlace no válido:** cambiar el último carácter del token del enlace y abrirlo; sale el aviso rojo y la cuenta sigue pendiente.
3. **Google:** en **Entrar**, pulsar **Entrar con Google** con cualquier cuenta de Google; la cuenta se crea activa y se entra directamente al juego. (Los alias con `+` solo sirven para recibir correo, no para entrar con Google.)
4. En **Administración** se ven todas las cuentas con su estado (activa, pendiente o eliminada).

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
| `mail.confirmation_sent` / `mail.failed` | info / error | Correo de confirmación enviado o error al enviarlo (la cuenta se crea igualmente) |
| `user.confirmed` / `user.confirm_failed` | info / warn | Cuenta confirmada con el enlace; enlace rechazado por inválido o caducado |
| `auth.oauth_denied` / `auth.oauth_failed` | info / warn | El usuario cancela en Google; fallo al volver de Google (`state` no válido, cuenta rechazada) |
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
- **Secretos del Hito 4:** `scripts/gcp/configurar-hito4.sh` guarda en Secret Manager el SMTP (`smtp-url`, `mail-from`) y el cliente de Google (`google-client-id`, `google-client-secret`); el workflow los entrega a Cloud Run. Pasos completos en [`docs/hito4-configuracion.md`](docs/hito4-configuracion.md).
- **Rotar un secreto** (por ejemplo la contraseña de aplicación de Gmail): se crea una versión nueva del secreto en Secret Manager y se fuerza una revisión nueva de Cloud Run para que la lea, sin tocar el código.
- **Google OAuth:** cada URL pública de la aplicación necesita su URI de redirección autorizada (`<URL>/api/auth/google/callback`) en el cliente de Google; Cloud Run tiene dos formas de URL y cada una cuenta por separado. Si falta una, Google responde `redirect_uri_mismatch`.
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
- **Hito 4:** se hizo con una rama por tarea (T22–T26) integrada directamente en `main` con su PR (#37–#41), cada una con el CI en verde y desplegada al fusionarse. Como las ramas dependían unas de otras, se reubicaron sobre el `main` real antes de abrir los PRs.
- Antes de abrir cada PR se ejecuta `npm test` en local. Después, el CI vuelve a ejecutar las pruebas en el PR y otra vez al llegar a `main`, y entonces se despliega en Cloud Run sin intervención manual.

## Prueba técnica del Sprint 1 (variante 3)

Ejercicio de la prueba técnica del Sprint 1, realizado sobre este mismo repositorio: **solo se admiten registros de ciertos dominios de correo**, y la lista se configura por variable de entorno, sin escribirla en el código.

**Regla.** Un email está permitido si el dominio completo que hay tras la `@` (sin distinguir mayúsculas) está en la lista. Un subdominio no listado no está permitido: `ana@uclm.es` sí, `x@sub.uclm.es` no, y tampoco `x@miuclm.es`. Si el valor no es un texto o no contiene `@`, es un error de validación.

**Dónde está, capa por capa.** Es el mismo reparto que el resto de la aplicación:

| Capa | Fichero | Qué hace |
|---|---|---|
| Lógica | [`src/services/domainPolicy.js`](src/services/domainPolicy.js) | `isDomainAllowed` aplica la regla y `parseAllowedDomains` convierte el texto de la variable en una lista. Es una función pura: no accede a la base de datos ni a la configuración, la lista le llega como parámetro |
| API | [`src/api/prueba.js`](src/api/prueba.js) | `POST /api/prueba/dominio`, sin sesión. Solo lee la petición, llama a la lógica y devuelve la respuesta |
| Configuración | [`src/loadConfig.js`](src/loadConfig.js) | Lee `ALLOWED_DOMAINS` de las variables de entorno |

**Contrato del endpoint.**

- `{ "email": "ana@uclm.es" }` → `200 { "permitido": true }`
- `{ "email": "x@sub.uclm.es" }` → `200 { "permitido": false }`
- Valor sin `@`, email ausente o que no es texto, o JSON mal formado → `400 { "error": "mensaje" }`

**Configuración.** `ALLOWED_DOMAINS` (dominios separados por comas) está en [`.env.example`](.env.example) solo como nombre. En producción el workflow de despliegue ([`deploy-cloud-run.yml`](.github/workflows/deploy-cloud-run.yml)) la define con el valor `uclm.es,alu.uclm.es`, así que cada despliegue la lleva consigo. Si la variable no existe, la lista queda vacía y ningún dominio se admite.

**Pruebas.** [`tests/domainPolicy.test.js`](tests/domainPolicy.test.js) tiene 13 pruebas con la etiqueta `variante3`, de las cuales 8 comprueban rechazos o errores: dominio no listado, subdominio, sufijo parecido, lista vacía, valor sin `@`, tipo incorrecto, JSON roto y lectura de la variable. Se ejecutan con `npm test`.

**Cambio adicional.** Un JSON mal formado fallaba antes de llegar a la capa API y devolvía la página de error por defecto de Express. Ahora responde `400` en JSON en toda la API (en este endpoint, con el formato `{ "error": "..." }` que pide el contrato).

**Flujo seguido.** Rama `PruebaTecnicaSprint1` desde `main` → pruebas en local → [pull request #34](https://github.com/VelaElDios/la-grada-colchonera-saas/pull/34) con el CI en verde → integración en `main` desde GitHub, sin push directo → despliegue automático en Cloud Run.

**Comprobación en producción.** Desde la consola del navegador, una vez desplegado:

| Dominio permitido (`ana@uclm.es`) | Subdominio no listado (`x@sub.uclm.es`) |
|---|---|
| ![Respuesta permitido: true en la app desplegada](docs/capturas/prueba-tecnica/01-dominio-permitido.png) | ![Respuesta permitido: false en la app desplegada](docs/capturas/prueba-tecnica/02-subdominio-rechazado.png) |

## Gestión del proyecto

El trabajo se ha planificado y seguido en **DoneTonic** (espacio *TFG*, equipo *Colchoneros*, Sprint 1 del 29/09/2026 al 27/10/2026). Hay 19 PBIs priorizados por hito, cada uno con sus tareas, y cada tarea corresponde a una rama y a un PR de este repositorio. Los cuatro hitos están completados.

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
