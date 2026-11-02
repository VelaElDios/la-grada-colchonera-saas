# La Grada Colchonera

[![CI](https://github.com/VelaElDios/la-grada-colchonera-saas/actions/workflows/ci.yml/badge.svg)](https://github.com/VelaElDios/la-grada-colchonera-saas/actions/workflows/ci.yml)
[![Última versión](https://img.shields.io/github/v/release/VelaElDios/la-grada-colchonera-saas?label=versi%C3%B3n)](https://github.com/VelaElDios/la-grada-colchonera-saas/releases)
[![Desplegado en Cloud Run](https://img.shields.io/badge/demo-Google%20Cloud%20Run-4285F4)](https://la-grada-colchonera-1081564062572.europe-southwest1.run.app)

Juego web rojiblanco tipo *survivor* en pixel art que se juega en el navegador: eliges a un jugador de la historia del Atleti, aguantas oleadas de rivales y jefes de final en final (Copa, Liga, Champions y Mundial), fichas a nuevos jugadores, los entrenas y compites en el ranking de la grada.

Es el proyecto individual de **Procesos de Ingeniería del Software (curso 2026-2027)**, planteado como un TFG. Por debajo es una aplicación SaaS organizada en capas: cuentas de usuario con registro y confirmación por correo, inicio de sesión local y con Google, roles, base de datos PostgreSQL (el progreso del juego se guarda en el servidor), integración y despliegue continuos, y gestión ágil del trabajo. El **Sprint 1** (Hitos 1 a 4) construyó esa base y el **Sprint 2** es la lógica del juego, hecha sobre ella.

> Proyecto de aficionado sin relación oficial con el Club Atlético de Madrid. Todos los dibujos, la música y los textos son originales: no se usan escudos, imágenes ni himnos oficiales.

## Índice

1. [Entrega](#entrega) · [Enlaces rápidos](#enlaces-rápidos)
2. [Capturas del Sprint 1 (Hitos 1–4)](#capturas-del-sprint-1-hitos-14)
3. [Capturas del Sprint 2 (el juego)](#capturas-del-sprint-2-el-juego)
4. [Qué incluye cada sprint](#qué-incluye-cada-sprint): hitos del Sprint 1 y fases del Sprint 2
5. [Arquitectura](#arquitectura): capas, modelo de datos y flujos principales
6. [Tecnologías](#tecnologías) · [Estructura del proyecto](#estructura-del-proyecto)
7. [Seguridad](#seguridad) · [Roles](#roles) · [API](#api) · [Registro de actividad](#registro-de-actividad-logs)
8. [Variables de entorno y secretos](#variables-de-entorno-y-secretos) · [Ejecutar en local](#ejecutar-en-local) · [Pruebas](#pruebas)
9. [Despliegue](#despliegue) · [Flujo de trabajo](#flujo-de-trabajo) · [Gestión del proyecto](#gestión-del-proyecto-donetonic)
10. [Prueba técnica del Sprint 1](#prueba-técnica-del-sprint-1-variante-3)
11. [El juego en detalle (Sprint 2)](#el-juego-en-detalle-sprint-2)
12. [Documentación y memoria](#documentación-y-memoria)

## Entrega

| | |
|---|---|
| **Repositorio** | https://github.com/VelaElDios/la-grada-colchonera-saas |
| **Aplicación desplegada** | https://la-grada-colchonera-1081564062572.europe-southwest1.run.app (Google Cloud Run) |
| **Sprint 1** (29/09 – 27/10/2026) | Hitos 1, 2, 3 y 4 del enunciado: registro y acceso locales, roles y administración, persistencia, confirmación por correo, inicio de sesión con Google y manejo de errores. 19 PBIs, todos hechos |
| **Sprint 2** (23/10 – 29/10/2026) | La lógica del juego: partida *survivor*, jugadores y entrenadores, armas, rivales, jefes, mundo procedural, club guardado en el servidor (contratos, entrenamiento, ranking), combinaciones y ultras, logros, música y pantalla de fin. 29 PBIs, todos hechos |
| **Gestión (DoneTonic)** | [`docs/gestion/README.md`](docs/gestion/README.md): backlog de los dos sprints, historias de usuario, trazabilidad tarea → PR, evolución y capturas |
| **Política de privacidad** | https://la-grada-colchonera-1081564062572.europe-southwest1.run.app/privacidad.html (necesaria para publicar la aplicación de Google) |
| **Acceso de administrador** | Ver [Acceso como administrador para la revisión](#acceso-como-administrador-para-la-revisión). Las credenciales se envían junto con la entrega |
| **Revisión requisito a requisito** | [`docs/revision-entrega.md`](docs/revision-entrega.md) |
| **Documentación técnica completa** | [`docs/documentacion-tecnica.md`](docs/documentacion-tecnica.md) (base para la memoria, con diagramas de secuencia) |

## Enlaces rápidos

| Qué | Dónde |
|---|---|
| Aplicación desplegada | Google Cloud Run (principal): https://la-grada-colchonera-1081564062572.europe-southwest1.run.app · Render (alternativo): https://la-grada-colchonera.onrender.com |
| Entregas por hito (releases) | [hito-1](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/hito-1) · [hito-2](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/hito-2) · [hito-3](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/hito-3) · [hito-4](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/hito-4) · [sprint-1](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/sprint-1) · [sprint-2](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/sprint-2) |
| Pull requests (uno por tarea y uno por cierre de hito) | [VelaElDios/la-grada-colchonera-saas/pulls](https://github.com/VelaElDios/la-grada-colchonera-saas/pulls?q=is%3Apr+is%3Aclosed+sort%3Acreated-asc) |
| Integración continua (GitHub Actions) | [Ejecuciones del workflow *CI*](https://github.com/VelaElDios/la-grada-colchonera-saas/actions/workflows/ci.yml) |
| Gestión del proyecto (DoneTonic: PBIs, tareas, sprints y gráficas) | [`docs/gestion/README.md`](docs/gestion/README.md) |
| Revisión de la entrega frente al enunciado | [`docs/revision-entrega.md`](docs/revision-entrega.md) |
| Configuración del Hito 4 (correo y Google) | [`docs/hito4-configuracion.md`](docs/hito4-configuracion.md) |
| Memoria del proyecto (LuaLaTeX) | [`memoria/`](memoria/README.md) |

## Capturas del Sprint 1 (Hitos 1–4)

Capturas de la **versión actual** de la aplicación (27/10/2026), con la interfaz rediseñada. Solo muestran lo que piden los hitos del Sprint 1: cuentas, sesión, roles, administración, confirmación por correo, Google y errores. Están hechas en local con datos de ejemplo, porque así se pueden enseñar estados que en producción necesitarían cuentas reales (una cuenta pendiente, una eliminada, un enlace manipulado, un fallo del servidor…). Debajo están las comprobaciones hechas en producción.

### Hitos 1–3: cuentas, sesión, roles y administración

| Inicio (sin sesión) | Registro con validación |
|---|---|
| ![Página de inicio con los botones para crear cuenta o entrar](docs/capturas/app/01-inicio.png) | ![Registro con el email y la contraseña marcados en rojo y explicando el error](docs/capturas/app/02-registro-validacion.png) |
| **Inicio de sesión fallido** | **Mi cuenta (usuario normal)** |
| ![Entrar con una contraseña incorrecta: «Email o contraseña incorrectos»](docs/capturas/app/03-entrar-error.png) | ![Mi cuenta: mote, avatar, email, rol Aficionado, estado Activa, fecha de alta, cerrar sesión y darse de baja](docs/capturas/app/04-perfil.png) |
| **Darse de baja: confirmación** | **Usuario normal que intenta abrir Administración** |
| ![Diálogo «¿Eliminar tu cuenta?» antes de darse de baja](docs/capturas/app/05-confirmar-baja.png) | ![Un usuario normal es devuelto a Mi cuenta con el aviso «Esa página es solo para administradores»](docs/capturas/app/06-usuario-sin-permiso.png) |
| **Panel de administración** | **Buscar usuarios por email** |
| ![Panel de administración: cuentas, activas y admins, y tabla con email, rol, estado, alta y acciones](docs/capturas/app/07-panel-admin.png) | ![Panel filtrado por «gmail»](docs/capturas/app/08-admin-busqueda.png) |
| **Búsqueda sin resultados** | **Eliminar otra cuenta: confirmación** |
| ![Estado vacío «Sin resultados» con botón para limpiar la búsqueda](docs/capturas/app/09-admin-sin-resultados.png) | ![Diálogo «¿Eliminar esta cuenta?» desde el panel](docs/capturas/app/10-admin-confirmar-eliminar.png) |
| **Página que no existe** | |
| ![Página «Fuera de juego» para rutas que no existen](docs/capturas/app/13-pagina-no-encontrada.png) | |

<details>
<summary>En el móvil: panel de administración y Mi cuenta</summary>

<img src="docs/capturas/app/11-panel-admin-movil.png" alt="Panel de administración en un móvil: cada usuario es una tarjeta" width="300"> <img src="docs/capturas/app/12-perfil-movil.png" alt="Mi cuenta en un móvil, con el menú plegado" width="300">

</details>

### Hito 4: confirmación por correo, Google y errores

| Entrar, con el botón de Google | Registro: correo de confirmación enviado |
|---|---|
| ![Pantalla de entrar con el botón Entrar con Google](docs/capturas/hito4/01-entrar-google.png) | ![Aviso: cuenta creada y correo de confirmación enviado](docs/capturas/hito4/02-registro-correo-enviado.png) |
| **Cuenta pendiente: error y botón para reenviar el correo** | **Correo reenviado** |
| ![Error «Debes confirmar tu correo» con el botón Reenviar el correo de confirmación](docs/capturas/hito4/03-cuenta-pendiente-reenvio.png) | ![Aviso de reenvío, que no revela si la cuenta existe](docs/capturas/hito4/04-reenvio-hecho.png) |
| **Enlace de confirmación manipulado** | **Cuenta confirmada con el enlace correcto** |
| ![Aviso rojo: el enlace de confirmación no es válido o ha caducado](docs/capturas/hito4/05-enlace-invalido.png) | ![Aviso verde: cuenta confirmada, ya puedes entrar](docs/capturas/hito4/06-cuenta-confirmada.png) |
| **Primer acceso tras confirmar** | **Cuenta creada con Google** |
| ![Mi cuenta tras entrar por primera vez, con el aviso de bienvenida](docs/capturas/hito4/07-primer-acceso.png) | ![Mi cuenta de una cuenta nueva de Google con el aviso «Cuenta creada con tu cuenta de Google»](docs/capturas/hito4/08-google-cuenta-creada.png) |
| **Error del servidor: aviso y reintentar** | **Panel con cuentas locales, de Google, pendientes y eliminadas** |
| ![El panel no puede cargar los usuarios: «No hemos podido cargarlo» con botón Reintentar](docs/capturas/hito4/09-error-con-reintento.png) | ![Panel de administración con todos los estados de cuenta](docs/capturas/hito4/10-panel-admin-estados.png) |
| **Política de privacidad** | |
| ![Página de política de privacidad](docs/capturas/hito4/11-privacidad.png) | |

### Comprobado en producción

Pruebas hechas en la aplicación desplegada el 23/10/2026. El enlace del correo está tapado porque lleva un token de un solo uso.

| Correo de confirmación recibido (SMTP de Gmail) | Aplicación de Google publicada («En producción») |
|---|---|
| ![Correo de confirmación recibido en Gmail](docs/capturas/produccion/01-correo-confirmacion.png) | ![Google Auth Platform: estado de publicación En producción, usuarios externos](docs/capturas/produccion/03-google-publicada.png) |

<details>
<summary>Despliegue continuo en verde tras fusionar los PRs del Hito 4</summary>

![GitHub Actions: CI y despliegue en Cloud Run en verde](docs/capturas/produccion/02-actions-verde.png)

</details>

Las capturas de la [prueba técnica](#prueba-técnica-del-sprint-1-variante-3) y de [DoneTonic](#gestión-del-proyecto-donetonic) están en sus apartados.

## Capturas del Sprint 2 (el juego)

Capturas del juego (29/10/2026), hechas en local con datos de ejemplo: una cuenta de administrador con el *modo pruebas* (todos los jugadores fichados y Griezmann entrenado), unos cuantos logros conseguidos y un ranking con varios aficionados. Las partidas son reales: se jugaron en el navegador, manejadas por un script, y las capturas se tomaron durante la partida.

### Menú del juego y club

| Menú del juego (inicio con sesión) | Vestuario: elegir jugador y equipación |
|---|---|
| ![Menú del juego con el jugador paseando por el campo y el menú lateral](docs/capturas/juego/01-menu.png) | ![Vestuario con la lista de jugadores, la ficha de Griezmann y las equipaciones](docs/capturas/juego/02-vestuario.png) |

| Entrenamiento | Contratar con fichas |
|---|---|
| ![Entrenamiento: puntos para subir vida, defensa, disparo y suerte](docs/capturas/juego/07-entrenamiento.png) | ![Mercado de fichajes con las fichas de contrato](docs/capturas/juego/08-contratar.png) |

| Dirección: elegir entrenador | Tu ficha: mote y avatar |
|---|---|
| ![Dirección deportiva con Cholo Simeone y Luis Aragonés](docs/capturas/juego/11-direccion.png) | ![Pantalla para ponerse un mote y elegir la cara](docs/capturas/juego/13-identidad.png) |

### La partida

| En juego: oleadas, armas automáticas y HUD | Subir de nivel: elegir una mejora |
|---|---|
| ![Partida en curso con el jugador rodeado de rivales en un mundo procedural](docs/capturas/juego/03-partida.png) | ![Pantalla de subida de nivel con tres mejoras](docs/capturas/juego/04-mejora.png) |

| Un jefe (con su barra de vida) | Pausa |
|---|---|
| ![Jefe Vinicius Jr. en el campo con su barra de vida arriba](docs/capturas/juego/05-jefe.png) | ![Menú de pausa de la partida](docs/capturas/juego/15-pausa.png) |

| Final de la Copa del Rey (minuto 5) | Fin de la partida con estadísticas |
|---|---|
| ![Ambiente de la Final de la Copa del Rey a partir del minuto 5](docs/capturas/juego/16-final-copa.png) | ![Pantalla de fin con el tiempo, el daño por habilidad y un logro nuevo](docs/capturas/juego/06-fin.png) |

### Metas, ranking y ajustes

| Logros con historia rojiblanca | Combinaciones y ultras |
|---|---|
| ![Vitrina de logros, cada uno con un dato de la historia del Atleti](docs/capturas/juego/09-logros.png) | ![Las metas de la grada: ultras y combinaciones con lo que pide cada una](docs/capturas/juego/10-combinaciones.png) |

| Ranking de la grada | Ajustes de sonido, gráficos y controles |
|---|---|
| ![Ranking con la mejor partida de cada aficionado](docs/capturas/juego/12-ranking.png) | ![Ajustes de volumen, gráficos, cámara y controles](docs/capturas/juego/14-ajustes.png) |

Las capturas de DoneTonic del Sprint 2 están en [Gestión del proyecto](#gestión-del-proyecto-donetonic).

## Qué incluye cada sprint

### Sprint 1: los cuatro hitos

| Hito | Contenido | PBIs (DoneTonic) | Entrega |
|---|---|---|---|
| **1. Esqueleto y backend** | Repositorio con GitHub Flow, CI con GitHub Actions, despliegue continuo en Render (al cerrar el sprint, también en Google Cloud Run), lógica de gestión de usuarios en memoria, pruebas unitarias y API REST. | P1–P6 · T1–T8 | [hito-1](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/hito-1) · PRs #1–#10 |
| **2. Autenticación y separación de capas** | Frontend separado en interfaz (`ui.js` y `ui/`) y cliente de la API (`api.js`), registro e inicio de sesión locales con las contraseñas guardadas como hash bcrypt (nunca en claro ni cifradas de forma reversible), sesión que se mantiene al recargar, cierre de sesión en el servidor y rutas protegidas. | P7–P10 · T9–T14 | [hito-2](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/hito-2) · PRs #11–#17 |
| **3. Persistencia, seguridad y administración** | PostgreSQL (Neon) con migraciones, sesiones guardadas en la base de datos, secretos solo en variables de entorno, roles usuario/administrador con primer administrador, panel de administración, baja de la propia cuenta y logs estructurados. | P11–P14 · T15–T20 | [hito-3](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/hito-3) · PRs #18–#24 |
| **4. Confirmación por correo, Google y errores** | Confirmación de la cuenta por correo con enlace firmado y reenvío, inicio de sesión con Google (OAuth 2.0), manejo de errores y avisos revisado de principio a fin, política de privacidad y aplicación de Google publicada. | P15–P17 · T22–T26 | [hito-4](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/hito-4) · PRs #37–#41 |
| **Cierre del sprint** | README completo, capturas, documentación de la gestión, revisión de la entrega frente al enunciado, despliegue en Google Cloud Run y carpeta de la memoria. | P18–P19 · T27–T32 | [sprint-1](https://github.com/VelaElDios/la-grada-colchonera-saas/releases/tag/sprint-1) · PRs de `hito-4/*` |

La primera entrega se limitó a los Hitos 1–3. El Hito 4 (P15 OAuth, P16 confirmación por correo y P17 manejo de errores) se completó después, apoyándose en lo que ya había: el modelo de usuario con el estado `pending` y el campo `authProvider` (`local` o `google`). Está desplegado y comprobado en producción.

#### Hito 4 en detalle

| PBI | Qué hace | Dónde |
|---|---|---|
| **P16 · Confirmación por correo** (T23, T24) | Al registrarse con email y contraseña la cuenta queda `pending` y se envía un correo con un enlace firmado (HMAC-SHA256, caduca a las 24 h). `GET /api/auth/confirm` la activa. Si el correo falla la cuenta se crea igualmente y se puede pedir otro (`POST /api/auth/resend-confirmation`, que responde igual exista o no la cuenta). El login de una cuenta pendiente devuelve `403 ACCOUNT_PENDING` y la interfaz ofrece reenviar el correo. | `src/integrations/mailer.js`, `src/services/tokenSigner.js`, `src/services/accountConfirmationService.js` |
| **P15 · Inicio de sesión con Google** (T22) | OAuth 2.0 «authorization code»: `/api/auth/google` manda al usuario a Google con un `state` aleatorio guardado en su sesión; `/api/auth/google/callback` comprueba el `state` (anti-CSRF, de un solo uso), cambia el código por el email **en el servidor** (el `client_secret` nunca llega al navegador) y abre sesión. Si no existía la cuenta se crea ya activa (`authProvider: google`); una cuenta local pendiente queda confirmada; si la cuenta se había eliminado, se crea una nueva (el email queda libre tras la baja). Sin las variables de Google, el botón no aparece. | `src/integrations/googleOAuth.js`, `userService.loginWithOAuth`, `public/js/ui/google.js` |
| **P17 · Manejo de errores** | Toda la interfaz traduce los errores a avisos legibles y los registra en la consola; hay estados de carga, vacío y error con reintento, timeout de 15 s en las peticiones, captura global de promesas rechazadas, y las redirecciones de OAuth y de confirmación vuelven a la web con un aviso en lugar de mostrar JSON. | `public/js/ui/componentes.js`, `public/js/ui.js`, `src/api/errorHandler.js` |
| **Secretos y despliegue** (T25) | El workflow de despliegue entrega a Cloud Run los secretos `smtp-url`, `mail-from`, `google-client-id` y `google-client-secret`. Un script de Cloud Shell los crea en Secret Manager y da acceso a la cuenta de servicio. | `.github/workflows/deploy-cloud-run.yml`, `scripts/gcp/configurar-hito4.sh`, [`docs/hito4-configuracion.md`](docs/hito4-configuracion.md) |
| **Política de privacidad** (T26) | Página pública que explica qué datos se guardan, para qué y cómo borrarlos. Google la exige para publicar la aplicación de inicio de sesión. | [`public/privacidad.html`](public/privacidad.html) |

### Sprint 2: la lógica del juego

Cerrado el Sprint 1, el profesor fijó que el **Sprint 2 es la lógica del juego**. El backlog tiene 29 PBIs (P20–P48) con 50 tareas (T33–T82), etiquetados por fase; el detalle con las historias de usuario está en [`docs/gestion/README.md`](docs/gestion/README.md#sprint-2-la-lógica-del-juego).

| Etiqueta (fase) | Contenido | PBIs (DoneTonic) | PRs |
|---|---|---|---|
| **Base del juego** | Interfaz rediseñada con el menú del juego como inicio, motor *survivor* de paso fijo, muñecos pixel art y cámara 3/4, jugadores y entrenadores con Vestuario y Dirección, armas con 5 niveles y mejoras, rivales que embisten y disparan, jefes con tres fases, mapa con barro, lluvia y gradas, y controles con teclado, joystick táctil, pausa y pantalla completa | P20–P28 · T33–T51 | [#36](https://github.com/VelaElDios/la-grada-colchonera-saas/pull/36), [#44](https://github.com/VelaElDios/la-grada-colchonera-saas/pull/44)–[#48](https://github.com/VelaElDios/la-grada-colchonera-saas/pull/48) |
| **Fase 2 · Club** | Progreso guardado en el servidor (migración `003`) con validación anti-trampas, contratos con fichas, entrenamiento y ranking de la grada | P29–P32 · T52–T56 | [#49](https://github.com/VelaElDios/la-grada-colchonera-saas/pull/49) |
| **Fase 3 · Ultras** | Combinaciones con nombre y bonus, seis ULTRAS, dificultad calibrada y modo pruebas para administradores | P33–P34 · T57–T60 | [#50](https://github.com/VelaElDios/la-grada-colchonera-saas/pull/50) |
| **Fase 4 · Mundo** | Mundo procedural natural, cinco ambientes por finales y mote y avatar (migración `004`) | P35–P37 · T61–T63 | [#52](https://github.com/VelaElDios/la-grada-colchonera-saas/pull/52) |
| **Fase 5 · Rarezas** | Rarezas por historia rojiblanca (36 jugadores), firma del contrato, habilidades niveladas por minuto, combinaciones a la vista y colisiones exactas | P38–P41 · T64–T68 | [#53](https://github.com/VelaElDios/la-grada-colchonera-saas/pull/53) |
| **Fase 6 · Logros y sonido** | Logros con historia y equipaciones, pantalla de fin con estadísticas, música chiptune y la grada, muñecos con más detalle y jefes más duros | P42–P46 · T69–T76 | [#54](https://github.com/VelaElDios/la-grada-colchonera-saas/pull/54) |
| **Calidad** | Errores corregidos (el juego no cargaba, el primer reenvío del correo se perdía, no se podía volver con Google tras la baja), documentación y gestión del sprint | P47–P48 · T77–T82 | [#51](https://github.com/VelaElDios/la-grada-colchonera-saas/pull/51), [#55](https://github.com/VelaElDios/la-grada-colchonera-saas/pull/55), [#56](https://github.com/VelaElDios/la-grada-colchonera-saas/pull/56) y este PR |

**Requisitos funcionales del Sprint 2** (la tabla completa, con dónde se cumple cada uno y sus pruebas, está en la [documentación técnica](docs/documentacion-tecnica.md#32-requisitos-funcionales-del-juego-sprint-2)):

| Id | Requisito | PBI |
|---|---|---|
| RJ-01 | Con sesión, el inicio es el menú del juego; sin sesión no se juega | P20, P29 |
| RJ-02 | Partida *survivor* infinita: oleadas, experiencia, mejoras al subir de nivel y dificultad creciente | P21, P24, P34 |
| RJ-03 | Jugadores con estadísticas y habilidades propias, entrenadores con ulti | P23, P38 |
| RJ-04 | Rivales con comportamiento propio y jefes con fases | P25, P26, P46 |
| RJ-05 | Mundo procedural con obstáculos y ambientes que cambian cada 5 minutos | P27, P35, P36, P41 |
| RJ-06 | El progreso (plantilla, entrenamiento, fichas, logros) se guarda en el servidor | P29 |
| RJ-07 | Fichar jugadores con fichas de contrato ganadas a los jefes | P30, P38 |
| RJ-08 | Entrenar a los jugadores con puntos | P31 |
| RJ-09 | Ranking de la grada con la mejor partida de cada usuario | P32 |
| RJ-10 | Combinaciones y ULTRAS, visibles con lo que pide cada una | P33, P40 |
| RJ-11 | Modo pruebas solo para administradores | P34 |
| RJ-12 | Mote único y avatar | P37 |
| RJ-13 | Logros con datos de la historia del Atleti y equipaciones | P42 |
| RJ-14 | Estadísticas al terminar la partida | P43 |
| RJ-15 | Música, efectos y la grada, con ajustes de volumen | P44 |
| RJ-16 | Jugable con teclado, ratón y pantalla táctil; pausa y pantalla completa | P28 |
| RJ-17 | El servidor valida cada resultado (no se pueden inventar tiempos, jefes ni logros) | P29, P42 |

## Arquitectura

La aplicación es **cliente-servidor** y está dividida en capas que solo se comunican con la capa vecina. El navegador nunca habla con la base de datos, y la lógica de negocio no sabe si los datos están en memoria o en PostgreSQL.

```mermaid
flowchart LR
    subgraph Navegador
        UI["Interfaz<br/>public/js/ui.js + ui/"] --> CLI["Cliente de la API<br/>public/js/api.js"]
        GAME["Juego<br/>public/js/game/"] --> CLI
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

- **Presentación** (`public/`): HTML, CSS y JavaScript sin framework. La interfaz (`ui.js` y `ui/`) solo pinta vistas y el juego (`game/`) dibuja en un canvas; todas las peticiones pasan por `api.js`, el único fichero con `fetch` (hay una prueba que lo comprueba).
- **API** (`src/api/`): traduce HTTP a llamadas a la lógica. Aquí están los middlewares de sesión (`currentUser`, `requireAuth`), roles (`requireRole`, `requireSelfOrRole`), el registro de peticiones y el manejador de errores común.
- **Lógica** (`src/services/`): reglas de negocio (registro, autenticación, confirmación, roles, bajas, último administrador, partidas, fichajes, logros). Recibe sus dependencias por parámetro (inyección de dependencias), así que se prueba sin servidor ni base de datos.
- **Datos** (`src/repositories/`): dos implementaciones del mismo contrato, en memoria y en PostgreSQL. Las mismas pruebas se pasan a las dos.
- **Integraciones** (`src/integrations/`): lo que habla con servicios externos, el correo (SMTP) y Google (OAuth 2.0). La lógica solo conoce su contrato (`mailer.send(...)`, `client.getProfile(...)`), así que en las pruebas se sustituyen por versiones falsas y no se envía nada ni se llama a Google.
- **Composición** (`src/app.js`): el único sitio donde se «enchufan» las capas. `src/bootstrap.js` elige PostgreSQL o memoria según haya `DATABASE_URL`, aplica las migraciones y crea el primer administrador.

### Modelo de datos

```mermaid
erDiagram
    users ||--o| juego_perfiles : "tiene su club"
    users ||--o| juego_records : "tiene su mejor partida"
    users {
        UUID id PK
        TEXT email "único entre las no eliminadas"
        TEXT password_hash "null si entra con Google"
        TEXT role "user | admin"
        TEXT status "pending | active | deleted"
        TEXT auth_provider "local | google"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ deleted_at "baja lógica"
        TEXT apodo "mote en el juego"
        TEXT apodo_clave UK "mote normalizado"
        TEXT avatar "p:koke | e:cholo"
    }
    session {
        VARCHAR sid PK
        JSON sess "userId y state de OAuth"
        TIMESTAMP expire
    }
    juego_perfiles {
        UUID user_id PK,FK
        JSONB datos "plantilla, entrenamiento, logros"
        INTEGER version "concurrencia optimista"
        TIMESTAMPTZ updated_at
    }
    juego_records {
        UUID user_id PK,FK
        TEXT alias
        TEXT avatar
        TEXT personaje
        TEXT entrenador
        INTEGER tiempo
        INTEGER nivel
        INTEGER jefes
        INTEGER bajas
        TIMESTAMPTZ created_at
    }
```

Las tablas se crean con **migraciones SQL versionadas** (`src/db/migrations/001` a `005`) que se aplican solas al arrancar y quedan apuntadas para no repetirse. Las bajas son **lógicas** (`status = 'deleted'` y `deleted_at`): la fila se conserva para el historial, pero la cuenta deja de poder entrar, sale del ranking y su email y su mote quedan libres, así que el usuario puede volver más adelante con una cuenta nueva (también con Google). La tabla `session` la gestiona `connect-pg-simple`.

### Flujos principales

**Registro y confirmación por correo (Hito 4, P16)**

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant W as Interfaz (ui + api.js)
    participant A as API /api/auth
    participant S as userService y accountConfirmation
    participant R as Repositorio
    participant M as Correo (SMTP)
    U->>W: Email y contraseña en «Crear cuenta»
    W->>A: POST /register
    A->>S: register(email, password)
    S->>R: create(status: pending, password_hash bcrypt)
    S->>M: send(enlace firmado HMAC, caduca en 24 h)
    A-->>W: 201 + «te hemos enviado un correo»
    U->>A: Abre el enlace: GET /confirm?token=…
    A->>S: confirm(token): firma, caducidad y propósito
    S->>R: update(status: active)
    A-->>U: 303 → /?aviso=cuenta-confirmada#/entrar
```

**Inicio de sesión con Google (Hito 4, P15)**

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant A as API /api/auth
    participant G as Google
    participant S as userService
    U->>A: GET /google
    A->>A: state aleatorio → sesión
    A-->>U: 303 → pantalla de Google
    U->>G: Elige su cuenta y acepta
    G-->>U: 302 → /google/callback?code&state
    U->>A: GET /google/callback?code&state
    A->>A: Comprueba el state (y lo borra: un solo uso)
    A->>G: Cambia el code por el perfil (con client_secret, en el servidor)
    G-->>A: email verificado
    A->>S: loginWithOAuth(email): crea, confirma o rechaza
    A->>A: Regenera la sesión (userId)
    A-->>U: 303 → /?aviso=google-cuenta-creada#/jugar
```

**Petición protegida con roles (Hito 3, P13)**

```mermaid
sequenceDiagram
    autonumber
    participant W as api.js
    participant C as currentUser
    participant Q as requireAuth
    participant RR as requireRole('admin')
    participant H as Ruta GET /api/users
    W->>C: GET /api/users (cookie grada.sid)
    C->>C: Lee userId de la sesión y vuelve a cargar el usuario
    alt Sin sesión o cuenta no activa
        C->>Q: req.user = null
        Q-->>W: 401 UNAUTHENTICATED
    else Usuario normal
        C->>Q: req.user (role: user)
        Q->>RR: pasa
        RR-->>W: 403 FORBIDDEN (y log auth.forbidden)
    else Administrador
        C->>Q: req.user (role: admin)
        Q->>RR: pasa
        RR->>H: pasa
        H-->>W: 200 lista de usuarios (sin hashes)
    end
```

Hay más diagramas (inicio de sesión local, baja, partida del juego, fichajes y despliegue) en [`docs/documentacion-tecnica.md`](docs/documentacion-tecnica.md).

## Tecnologías

Cada tecnología lleva una frase que justifica por qué se ha elegido.

| Tecnología | Para qué | Justificación |
|---|---|---|
| Node.js 22 + Express 5 | Servidor y API REST | Un único lenguaje (JavaScript) en cliente y servidor y un framework mínimo en el que las capas se ven como módulos simples. Express 5 pasa los errores asíncronos al manejador común. |
| HTML, CSS y JavaScript sin framework | Frontend y juego | El propio backend sirve el frontend (mismo origen, sin CORS), no hace falta compilar nada y la frontera entre interfaz (`ui.js` y `ui/`) y cliente (`api.js`) se ve en dos ficheros. El juego usa Canvas 2D y Web Audio, sin librerías. |
| PostgreSQL en Neon (capa gratuita) | Base de datos | Base de datos relacional real, gestionada y gratuita. Las tablas se crean con migraciones SQL versionadas. |
| `pg`, `connect-pg-simple` | Acceso a PostgreSQL y sesiones | Consultas parametrizadas (sin inyección SQL) y sesiones guardadas en la base de datos, que sobreviven a reinicios y despliegues. |
| `nodemailer` + SMTP de Gmail | Correo de confirmación | Librería estándar para enviar correo por SMTP autenticado (puerto 465), que sí funciona en Cloud Run. Sin `SMTP_URL`, el enlace se escribe en el registro, útil en local. |
| Google OAuth 2.0 (Google Auth Platform) | Inicio de sesión con Google | Flujo de código de autorización con intercambio en el servidor: el secreto del cliente nunca llega al navegador y solo se acepta un email verificado. Escrito con `fetch`, sin librerías de terceros. |
| `express-session`, `bcryptjs` | Autenticación | Sesión en el servidor con cookie `httpOnly`; contraseñas guardadas solo como hash bcrypt (coste 10). |
| `node:test` + `pg-mem` | Pruebas | Framework incluido en Node. `pg-mem` emula PostgreSQL en local y el CI usa un PostgreSQL 17 real. |
| GitHub Actions | Integración continua | Ejecuta las pruebas y construye la imagen Docker en cada PR y en cada cambio de `main` y de las ramas de hito; las ramas protegidas exigen que pasen. Otro workflow compila la memoria. |
| Docker + Google Cloud Run | Despliegue continuo (principal) | Imagen reproducible y despliegue sin servidor que escala a cero (créditos de Google Cloud para educación). Secretos en Secret Manager y acceso desde GitHub sin claves (Workload Identity Federation). |
| Render (capa gratuita) | Despliegue continuo (alternativo) | Cada cambio en `main` se publica solo. Configuración como código en `render.yaml`. |
| DoneTonic | Gestión ágil | Backlog de PBIs, sprint, tablero de tareas y gráficas (burndown, burnup y velocity). |
| LuaLaTeX + biber | Memoria | Memoria tipo TFG en LaTeX con UTF-8 y fuentes OpenType; se compila sola en GitHub Actions. |

## Estructura del proyecto

```
src/
  server.js            Punto de entrada: arranca el servidor
  bootstrap.js         Elige la capa de datos (PostgreSQL o memoria), migra y crea el primer administrador
  app.js               Construye la app Express (sesión, API y estáticos): aquí se conectan las capas
  config.js            Lee .env y las variables de entorno
  loadConfig.js        Valida la configuración y los secretos
  logger.js            Registro de actividad en JSON (oculta los datos sensibles)
  api/                 Capa API: auth, users, juego, prueba, sesión y roles, logs de peticiones y errores
  services/            Lógica: usuarios, confirmación, tokens firmados, hash, dominios, juego y errores tipados
  repositories/        Acceso a datos: usuarios y juego, cada uno en memoria y en PostgreSQL
  integrations/        Servicios externos: correo (SMTP) y Google OAuth
  models/              Modelo de usuario (roles, estados y proveedores)
  db/                  Conexión, migraciones SQL y script de migración
public/
  index.html           Página única (SPA con rutas por hash)
  privacidad.html      Política de privacidad (requisito de Google)
  css/                 Sistema de diseño: tokens, base, componentes, vistas y juego
  fonts/               Plus Jakarta Sans autoalojada (licencia OFL)
  js/ui.js             Punto de entrada: enrutador, control de acceso, foco, avisos y errores globales
  js/ui/               Módulos de interfaz: cabecera, formulario, avisos, diálogos, componentes, Google
  js/ui/vistas/        Una vista por módulo: inicio, entrar, registro, perfil, admin, jugar y 404
  js/api.js            Cliente de comunicación con la API (único sitio con fetch, timeout de 15 s)
  js/game/             El juego: simulación pura, dibujo en canvas, HUD, sonido, logros y club
tests/                 276 pruebas automatizadas (unitarias, de API, de base de datos y del juego)
docs/                  Capturas, gestión, configuración del Hito 4, revisión de la entrega y documentación técnica
memoria/               Memoria del proyecto en LuaLaTeX
scripts/               Preparación de Google Cloud y modo pruebas del juego
Dockerfile             Imagen de la aplicación (Cloud Run)
render.yaml            Despliegue en Render (Blueprint)
.github/workflows/     CI, despliegue en Cloud Run y compilación de la memoria
```

## Seguridad

| Riesgo | Medida | Dónde |
|---|---|---|
| Robo de contraseñas | Solo se guarda el **hash bcrypt** (con sal, coste 10); nunca la contraseña ni un cifrado reversible. Las cuentas de Google no tienen contraseña | `src/services/passwordHasher.js` |
| Robo de la sesión | Cookie `grada.sid` **`httpOnly`**, `sameSite=lax`, `secure` en producción (detrás del proxy HTTPS de Cloud Run), 7 días. La sesión se **regenera** al iniciar sesión (contra la fijación de sesión) y se destruye al salir | `src/app.js`, `src/api/auth.js` |
| Sesiones de cuentas eliminadas | En cada petición se vuelve a leer el usuario: una cuenta eliminada o pendiente deja de estar autenticada aunque conserve la cookie | `src/api/currentUser.js` |
| Escalada de privilegios | Roles comprobados **en el servidor** (`401` sin sesión, `403` sin permiso). La interfaz solo oculta lo que no se puede usar. Nunca se puede quitar ni eliminar al último administrador | `src/api/currentUser.js`, `src/services/userService.js` |
| Enumeración de cuentas | El login da el mismo mensaje si el email no existe o la contraseña es incorrecta; el reenvío del correo responde igual exista o no la cuenta | `src/services/userService.js`, `src/api/auth.js` |
| Enlaces de confirmación falsos | Token **firmado con HMAC-SHA256** (clave derivada del secreto, comparación en tiempo constante), con propósito y caducidad de 24 h; no se guarda en la base de datos | `src/services/tokenSigner.js` |
| CSRF en el acceso con Google | `state` aleatorio guardado en la sesión y de un solo uso; el `code` se cambia por el perfil en el servidor y solo se acepta un email verificado | `src/api/auth.js`, `src/integrations/googleOAuth.js` |
| Inyección SQL | Consultas **parametrizadas** con `pg` | `src/repositories/postgres*.js` |
| Inyección de HTML (XSS) | La interfaz construye el DOM con `textContent` (helper `h()`); una prueba comprueba que no se mete texto de usuario como HTML | `public/js/ui/dom.js`, `tests/frontend.test.js` |
| Secretos en el código | Solo por **variables de entorno** (Secret Manager en Cloud Run); `.env` está en `.gitignore`. Si falta uno obligatorio en producción, la app no arranca | `src/loadConfig.js` |
| Datos sensibles en los logs | El logger sustituye contraseñas, hashes, cookies, tokens y secretos por `[oculto]` (también en objetos anidados) | `src/logger.js` |
| Trampas en el juego | El servidor valida el resultado de cada partida con su propio reloj y solo apunta los logros que puede comprobar; los fichajes usan concurrencia optimista | `src/services/juegoService.js` |

## Roles

- **user** (*Aficionado*): gestiona su propia cuenta (ver su perfil y darse de baja) y juega.
- **admin** (*Administrador*): además, ve el listado de usuarios, comprueba si un usuario está activo, cambia roles y elimina cualquier cuenta. En el juego puede activar el *modo pruebas*.
- **Primer administrador:** al arrancar, si existen `ADMIN_EMAIL` y `ADMIN_PASSWORD`, se crea esa cuenta con rol de administrador (o se promociona si ya existía). Siempre debe quedar al menos un administrador activo.
- Todas estas restricciones se comprueban **en el servidor** (`401` o `403`): la interfaz solo oculta lo que no se puede usar.

**Por qué el primer administrador se crea con variables de entorno.** Es lo único que no necesita entrar en la base de datos a mano ni dejar una contraseña en el código o en un script del repositorio. La contraseña llega como secreto (Secret Manager en Cloud Run, `.env` en local) y solo se guarda su hash. Además, se ejecuta en cada arranque sin repetir nada: si la cuenta ya existe, no se toca su contraseña.

## API

Todas las rutas están bajo `/api`, reciben y devuelven JSON y usan la cookie de sesión.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/health` | Público | Comprueba que el servidor está en marcha |
| POST | `/api/auth/register` | Público | Registro con email y contraseña (mínimo 8 caracteres): `201`, cuenta pendiente y correo de confirmación |
| POST | `/api/auth/login` | Público | Inicia sesión y deja la cookie `grada.sid` (`401` credenciales o cuenta eliminada, `403 ACCOUNT_PENDING`) |
| POST | `/api/auth/logout` | Público | Cierra la sesión actual |
| GET | `/api/auth/me` | Sesión | Devuelve el usuario con sesión iniciada |
| GET | `/api/auth/confirm?token=…` | Público | Confirma la cuenta (enlace del correo) y redirige a la web con un aviso |
| POST | `/api/auth/resend-confirmation` | Público | Reenvía el correo de confirmación (`{ "email": "..." }`): `202`, igual exista o no la cuenta |
| GET | `/api/auth/providers` | Público | Qué proveedores externos hay disponibles (`{ "google": true \| false }`) |
| GET | `/api/auth/google` | Público | Inicia el acceso con Google (redirige a Google) |
| GET | `/api/auth/google/callback` | Público | Vuelta de Google: abre sesión y redirige a la web |
| GET | `/api/users` | Admin | Listado de usuarios (email, rol, estado, proveedor y alta; nunca el hash) |
| GET | `/api/users/:id/active` | Admin | Indica si un usuario está activo: confirmado y no eliminado (no si está conectado) |
| PATCH | `/api/users/:id/role` | Admin | Cambia el rol (`{ "role": "admin" \| "user" }`) |
| DELETE | `/api/users/:id` | Propio o admin | Elimina una cuenta (baja lógica): sale del ranking y su email y su mote quedan libres para una cuenta nueva. Nunca se elimina al último administrador |
| GET | `/api/juego/perfil` | Sesión | Tu club: plantilla, entrenamiento, fichas, puntos, logros y equipaciones |
| POST | `/api/juego/partidas` | Sesión | Empieza una partida (`{ personaje, entrenador }`): `201 { partidaId }` |
| POST | `/api/juego/partidas/:id/fin` | Sesión | Termina la partida (`{ tiempo, nivel, jefes, bajas, logros }`): valida el resultado y devuelve recompensas, récord y logros nuevos |
| POST | `/api/juego/contratar` | Sesión | Gasta una ficha de contrato y ficha a un jugador nuevo (`409` sin fichas) |
| POST | `/api/juego/entrenar` | Sesión | Gasta un punto de entrenamiento (`{ personaje, estadistica }`) |
| PUT | `/api/juego/identidad` | Sesión | Mote y avatar (`{ "apodo": "...", "avatar": "p:koke" \| "e:cholo" }`): `409` si el mote ya lo tiene otro |
| GET | `/api/juego/ranking` | Sesión | Ranking de la grada (mote y avatar de cada uno, nunca el correo) |
| POST | `/api/juego/desbloquear` | Admin | Modo pruebas: todos los jugadores y puntos de sobra, sin tocar el ranking |
| POST | `/api/prueba/dominio` | Público | Indica si el dominio de un email está permitido (`{ "email": "..." }` → `{ "permitido": true \| false }`). Ver [Prueba técnica](#prueba-técnica-del-sprint-1-variante-3) |

Los errores se devuelven siempre como `{ "error": { "code": "...", "message": "..." } }` (excepto el endpoint de la prueba técnica, que sigue su propio contrato).

| Código | Cuándo |
|---|---|
| `400 VALIDATION_ERROR` | Datos no válidos o JSON mal formado |
| `401 UNAUTHENTICATED` | Sin sesión o credenciales incorrectas (mismo mensaje si el email no existe) |
| `403 FORBIDDEN` / `ACCOUNT_PENDING` | Sin permiso / cuenta sin confirmar |
| `404 NOT_FOUND` | El recurso o la ruta no existen |
| `409 CONFLICT` | Email o mote repetidos, sin fichas, cambio simultáneo |
| `503 SERVICE_UNAVAILABLE` | El correo no se puede enviar ahora mismo (al reenviar la confirmación) |
| `500 INTERNAL_ERROR` | Error inesperado (se registra con su traza; al usuario solo le llega un mensaje genérico) |

## Registro de actividad (logs)

La aplicación escribe cada evento relevante como una línea JSON en la salida estándar ([`src/logger.js`](src/logger.js)). En Cloud Run se consultan en **Cloud Logging** (pestaña *Registros* del servicio) y en Render en la pestaña *Logs*. Se pueden filtrar por texto, por ejemplo `auth.login_failed`.

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
| `juego.identidad` | info | Cambio de mote o avatar |
| `http.error` | error | Errores inesperados, con su traza |

Las contraseñas, hashes, cookies y secretos nunca se registran: el logger los sustituye por `[oculto]`.

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
| `SESSION_SECRET` | Sí | Firma la cookie de sesión y deriva la clave de los enlaces de confirmación. Obligatorio en producción (mínimo 32 caracteres); en local, si falta, se genera uno aleatorio en cada arranque |
| `DATABASE_URL` | Sí | Cadena de conexión de PostgreSQL (Neon). Obligatoria en producción; en local, si falta, los datos se guardan en memoria |
| `ADMIN_EMAIL` | No | Email del primer administrador (se crea o se promociona al arrancar) |
| `ADMIN_PASSWORD` | Sí | Contraseña del primer administrador (mínimo 8 caracteres). Solo se usa si la cuenta no existe |
| `ALLOWED_DOMAINS` | No | Dominios de correo permitidos, separados por comas (en producción: `uclm.es,alu.uclm.es`). Lo usa `POST /api/prueba/dominio` |
| `LOG_LEVEL` | No | Nivel del registro de actividad: `debug`, `info` (por defecto), `warn`, `error` o `silent` |
| `REQUIRE_EMAIL_CONFIRMATION` | No | Por defecto `true`: las cuentas nuevas quedan pendientes hasta confirmar el correo. Solo se desactiva a propósito con `false` |
| `PUBLIC_URL` | No | URL pública de la app, para los enlaces de los correos y la vuelta de Google. Si falta se usa la de cada petición |
| `SMTP_URL` | Sí | Correo saliente: `smtps://usuario:contraseña@servidor:465`. Sin ella, los correos no se envían y su enlace se escribe en el registro (útil en local) |
| `MAIL_FROM` | Con `SMTP_URL` | Remitente de los correos |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Sí (las dos o ninguna) | Cliente OAuth de Google. URI de redirección autorizada: `<URL de la app>/api/auth/google/callback` |

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
- **Correo:** sin `SMTP_URL`, al registrarte el enlace de confirmación sale en la consola del servidor (evento `mail.not_sent`). Para no tener que confirmar, `REQUIRE_EMAIL_CONFIRMATION=false`.
- **Docker:** `docker build -t la-grada . && docker run -p 8080:8080 la-grada` (escucha en el 8080, como en Cloud Run).

## Pruebas

Todas las pruebas son automáticas (`node:test`) y se ejecutan con **un único comando**:

```bash
npm test
```

No hace falta tener PostgreSQL: en local, las pruebas de base de datos usan `pg-mem`. Para lanzarlas además contra un PostgreSQL real (como hace el CI):

```bash
TEST_DATABASE_URL=postgresql://usuario:clave@localhost:5432/grada_test npm test
```

Son **276 pruebas** en 25 ficheros (más el recorrido con PostgreSQL real, que solo se ejecuta en el CI). Muchas comprueban casos de error, no solo el camino feliz.

| Fichero | Pruebas | Qué comprueba |
|---|---:|---|
| `userService.test.js` | 27 | Lógica de usuarios: registro, email repetido, cuenta pendiente que intenta entrar, OAuth, roles, bajas (y volver con el mismo email), último administrador y primer administrador |
| `api.auth.test.js` | 16 | Registro, login con el mismo mensaje para email o contraseña malos, cookie `HttpOnly`, `me`, sesión que se mantiene y que se invalida al salir o al borrar la cuenta, confirmación por correo y correo caído |
| `userRepository.test.js` | 16 | El mismo contrato para el repositorio en memoria y el de PostgreSQL (también que una cuenta eliminada no ocupa su email) |
| `frontend.test.js` | 14 | Que solo `api.js` use `fetch`, que la interfaz no inserte texto de usuario como HTML y que todos los módulos se puedan importar |
| `domainPolicy.test.js` | 13 | Prueba técnica: dominios permitidos, subdominios, sufijos parecidos y errores |
| `api.users.test.js` | 11 | `401`, `403`, listado, usuario activo, cambio de rol y baja (propia y de otros) |
| `googleOAuth.test.js` | 11 | `state` falso, ausente y reutilizado, cuenta nueva, pendiente que se confirma, email sin verificar y volver a entrar con Google tras darse de baja (con un Google falso) |
| `config.test.js` | 8 | Configuración y secretos obligatorios, `.env` fuera del repositorio |
| `accountConfirmation.test.js` | 6 | Correo con su enlace, confirmación, enlace manipulado o caducado, reenvío sin revelar si la cuenta existe |
| `logger.test.js` | 6 | Formato JSON, niveles y que nunca aparecen contraseñas ni secretos |
| `tokenSigner.test.js` · `mailer.test.js` · `migrate.test.js` | 3 + 3 + 3 | Tokens firmados, correo por SMTP o por el registro, migraciones que no se repiten |
| `bootstrap.test.js` · `health.test.js` | 2 + 1 | Arranque con memoria o PostgreSQL y comprobación de salud |
| `api.database.test.js` | (CI) | Recorrido completo con PostgreSQL real: registro, inicio de sesión y sesión guardada en la base de datos |
| **Juego:** `juego-club` · `juego-movilidad` · `api.juego` · `juego-personajes` · `juego-habilidades` · `juego-ultras` · `juego-logros` · `game` · `juegoRepository` | 27 · 22 · 15 · 14 · 14 · 13 · 13 · 10 · 8 | Simulación (paso fijo, semilla), mundo y colisiones, personajes, habilidades, ultras, jefes, logros, club, ranking y validación anti-trampas en el servidor |

El CI ejecuta todas las pruebas contra un **PostgreSQL 17 real** y, en otro trabajo, construye la imagen Docker y comprueba que el contenedor responde en `/api/health`.

## Despliegue

La aplicación se despliega de forma continua en **dos plataformas** a partir de la misma rama `main`. Las dos usan la misma base de datos (Neon), así que muestran los mismos datos.

| | Google Cloud Run | Render |
|---|---|---|
| URL | https://la-grada-colchonera-1081564062572.europe-southwest1.run.app | https://la-grada-colchonera.onrender.com |
| Cómo se despliega | Workflow [`deploy-cloud-run.yml`](.github/workflows/deploy-cloud-run.yml): cuando el CI pasa en `main`, construye la imagen [`Dockerfile`](Dockerfile), la sube a Artifact Registry y la despliega | Render detecta el cambio en `main` y despliega según [`render.yaml`](render.yaml) |
| Secretos | Secret Manager, leídos por una cuenta de servicio que solo puede acceder a ellos | Variables de entorno del panel de Render |
| Acceso desde GitHub | Workload Identity Federation (token temporal, sin claves guardadas) | Integración de Render con GitHub |
| Coste | Créditos de Google Cloud para educación. Escala a cero cuando no hay tráfico | Capa gratuita |

```mermaid
flowchart LR
    PR["Pull request"] --> CI1["CI: pruebas + imagen Docker"]
    CI1 -- "verde" --> MERGE["Fusión en main"]
    MERGE --> CI2["CI en main"]
    CI2 -- "verde" --> DEP["deploy-cloud-run.yml"]
    DEP --> AR["Artifact Registry"]
    AR --> CR["Cloud Run<br/>(secretos de Secret Manager)"]
    MERGE --> RENDER["Render<br/>(alternativo)"]
    CR --> NEON[("Neon PostgreSQL")]
    RENDER --> NEON
```

- **Base de datos:** PostgreSQL en Neon (región Frankfurt). Al arrancar, la aplicación aplica las migraciones y crea el primer administrador.
- **Secretos del Hito 4:** `scripts/gcp/configurar-hito4.sh` guarda en Secret Manager el SMTP (`smtp-url`, `mail-from`) y el cliente de Google (`google-client-id`, `google-client-secret`); el workflow los entrega a Cloud Run. Pasos completos en [`docs/hito4-configuracion.md`](docs/hito4-configuracion.md).
- **Rotar un secreto** (por ejemplo la contraseña de aplicación de Gmail): se crea una versión nueva del secreto en Secret Manager y se fuerza una revisión nueva de Cloud Run para que la lea, sin tocar el código.
- **Google OAuth:** cada URL pública de la aplicación necesita su URI de redirección autorizada (`<URL>/api/auth/google/callback`) en el cliente de Google; Cloud Run tiene dos formas de URL y cada una cuenta por separado. Si falta una, Google responde `redirect_uri_mismatch`.
- **Preparar Google Cloud:** solo una vez, con [`scripts/gcp/preparar-cloud-run.sh`](scripts/gcp/preparar-cloud-run.sh) en Cloud Shell. El script crea el proyecto, las APIs, Artifact Registry, los secretos, las cuentas de servicio y la federación de identidad. Al terminar, muestra las variables que hay que añadir al repositorio: `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_WIF_PROVIDER` y `GCP_DEPLOY_SA`.
- **Si una versión no arranca**, por ejemplo porque falta un secreto, ni Cloud Run ni Render la ponen en marcha: siguen sirviendo la anterior.
- **Arranque en frío:** Cloud Run (con 0 instancias mínimas) y la capa gratuita de Render detienen la aplicación cuando no hay tráfico, así que la primera petición puede tardar unos segundos.

## Acceso como administrador para la revisión

1. Abrir https://la-grada-colchonera-1081564062572.europe-southwest1.run.app. La primera carga puede tardar unos segundos si la aplicación estaba parada.
2. Pulsar **Entrar** e introducir el email y la contraseña del administrador. **No están en el repositorio:** se envían junto con la entrega. Son los valores de los secretos `admin-email` y `admin-password` de Secret Manager.
3. En el menú aparece **Administración**: listado de usuarios con email, rol, estado y fecha de alta, buscador por email, y botones para cambiar el rol o eliminar una cuenta.

Para probar también los permisos de un usuario normal, basta con registrar una cuenta nueva desde **Crear cuenta**. La cuenta queda pendiente hasta que se pulsa el enlace del correo de confirmación (con Google, queda activa al momento).

### Probar el Hito 4

1. **Confirmación por correo:** en **Crear cuenta**, registrarse con un email real (sirve un alias como `tunombre+prueba@gmail.com`). Llega un correo de *La Grada Colchonera*; hasta pulsar **Confirmar mi cuenta**, entrar da el error de cuenta pendiente con el botón para reenviarlo.
2. **Enlace no válido:** cambiar el último carácter del token del enlace y abrirlo; sale el aviso rojo y la cuenta sigue pendiente.
3. **Google:** en **Entrar**, pulsar **Entrar con Google** con cualquier cuenta de Google; la cuenta se crea activa y se entra directamente. (Los alias con `+` solo sirven para recibir correo, no para entrar con Google.)
4. En **Administración** se ven todas las cuentas con su estado (activa, pendiente o eliminada).

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
    branch hito-4/T22-google-oauth
    commit id: "[T22] … [T26] (PRs #37–#41)"
    checkout main
    merge hito-4/T22-google-oauth id: "Hito 4" tag: "hito-4"
    branch juego/movilidad-hub
    commit id: "Fases del juego (ramas juego/*)"
    checkout main
    merge juego/movilidad-hub id: "Un PR por fase"
```

- `main`: versión estable y desplegada. Solo recibe cambios mediante pull request.
- `hito-N/integracion`: rama de cada hito. Reúne las tareas del hito y se integra en `main` con un PR al cerrarlo, que se publica como release `hito-N`.
- `hito-N/Tx-descripcion`: una rama por tarea de DoneTonic, que se integra en la rama de su hito mediante un PR titulado `[Tx] ...`.
- `main` y `hito-*/integracion` están protegidas: solo admiten cambios por PR y exigen que el check **Pruebas** del CI esté en verde.
- **Hito 4:** se hizo con una rama por tarea (T22–T26) integrada directamente en `main` con su PR (#37–#41), cada una con el CI en verde y desplegada al fusionarse. Como las ramas dependían unas de otras, se reubicaron sobre el `main` real antes de abrir los PRs.
- **Sprint 2 (el juego):** ramas `feature/rediseno-y-juego` (rediseño de la interfaz), `juego/personajes-pixel` y `juego/movilidad-hub`, con **un PR a `main` por fase** (#36 y #44–#54) y el mismo CI y despliegue. Cada tarea de DoneTonic dice en su descripción en qué PR está. Los arreglos posteriores también van por PR (#51, #55, #56).
- Antes de abrir cada PR se ejecuta `npm test` en local. Después, el CI vuelve a ejecutar las pruebas en el PR y otra vez al llegar a `main`, y entonces se despliega en Cloud Run sin intervención manual.

## Gestión del proyecto (DoneTonic)

El trabajo se ha planificado y seguido en **DoneTonic** (espacio *TFG*, equipo *Colchoneros*) con Scrum y dos sprints, los dos cerrados:

| Sprint | Fechas | Backlog | Etiquetas | Estado |
|---|---|---|---|---|
| **Sprint 1** | 29/09/2026 – 27/10/2026 | 19 PBIs (P1–P19), 32 tareas (T1–T32) | Hito 1 a Hito 4 | Hecho (100 %) |
| **Sprint 2** | 23/10/2026 – 29/10/2026 | 29 PBIs (P20–P48), 50 tareas (T33–T82) | Base del juego, Fase 2 a Fase 6 y Calidad | Hecho (100 %) |

Cada PBI tiene su historia de usuario y sus criterios de aceptación, y cada tarea corresponde a una rama o a un PR de este repositorio. En [`docs/gestion/README.md`](docs/gestion/README.md) están:

- el backlog completo de los dos sprints con el estado de cada PBI;
- las historias de usuario y los criterios de aceptación del Sprint 2;
- la definición de hecho (DoD);
- la trazabilidad tarea → rama → PR → release;
- la evolución de cada sprint (burndown) y las gráficas de DoneTonic (burnup, burndown y backlog);
- capturas del backlog, de los tableros, del detalle de un PBI y de las gráficas.

| Tablero del Sprint 2 | Gráficas del Sprint 2 |
|---|---|
| ![Tablero del Sprint 2 en DoneTonic con los 29 PBIs hechos](docs/capturas/donetonic/04-tablero-sprint2.png) | ![Sprint Burndown y Burnup del Sprint 2](docs/capturas/donetonic/06-graficas-sprint2.png) |

| Tablero del Sprint 1 | Gráficas del Sprint 1 |
|---|---|
| ![Tablero del Sprint 1 en DoneTonic con los 19 PBIs hechos](docs/capturas/donetonic/01-tablero-sprint.png) | ![Sprint Burndown y Burnup del Sprint 1](docs/capturas/donetonic/02-graficas-sprint.png) |

![Backlog de DoneTonic con los dos sprints](docs/capturas/donetonic/03-backlog.png)

> El juego se programó del 23 al 26/10 y su backlog se registró en DoneTonic al cerrar el Sprint 2 (29/10), por eso las gráficas de DoneTonic del Sprint 2 marcan todo hecho ese día. La evolución real, por fechas de los PRs, está en [`docs/gestion/README.md`](docs/gestion/README.md#evolución-del-sprint-2).

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

## El juego en detalle (Sprint 2)

Cerrado el Sprint 1, el profesor dejó libertad para el diseño y fijó que el **Sprint 2** sería la lógica del juego. El proyecto pasó de la idea inicial de red social a un **juego**: un *survivor* con estética de píxeles «chibi» (cabeza grande, camiseta y botas) que reutiliza toda la base del sprint (cuentas, sesión, roles, base de datos, CI/CD). Solo pueden jugar usuarios con sesión, y el progreso (jugadores, entrenamiento, fichas, logros) y el **ranking de la grada** se guardan en el servidor.

### Cómo se juega

- Te mueves con **WASD o las flechas** (en el móvil, joystick flotante al arrastrar); **las armas atacan solas**. `Espacio`/`E` lanza la ulti, `Esc`/`P` pausa y `F` pone la pantalla completa. La partida se pausa sola al cambiar de pestaña.
- Cada **30 segundos** llega una oleada nueva y cada **cuatro oleadas** (cada 2 minutos, el primero a los 1:30) un **jefe**. Los rivales caídos sueltan experiencia; al subir de nivel eliges una de tres mejoras.
- Es **infinito**: los rivales ganan vida, daño y velocidad sin parar. Pasado el minuto 9 crecen más rápido y desde el 12 aguantan mejor el daño normal; a los 20 minutos es muy difícil seguir vivo.
- **Moverse tiene premio**: corriendo sube el *ritmo* (hasta +25 % de daño y +20 % de experiencia, y carga la ulti); parado lo pierdes y los rivales cercanos corren más. Por el campo aparecen premios (botiquín, balón de oro, energía e imán).
- Cada **5 minutos cambia la pantalla**: pretemporada → **Final de la Copa del Rey** → **Final de Liga** → **Final de la Champions** → **Final del Mundial** (todos con la camiseta de su selección). Cambian la luz, la afición y la música, y los rivales salen más fuertes.

### Contenido

| | |
|---|---|
| **Jugadores** | 36 de la historia del Atleti (4 porteros, 9 defensas, 13 medios y 10 delanteros) con **rareza según lo que fueron en el club**: Leyenda (Oblak, Godín, Koke, Griezmann, Torres, Gabi, Adelardo, Luis Aragonés), Épico (Simeone, Futre, Diego Costa, Forlán, Miranda, Saúl, Courtois, Pantić), Raro (Kun Agüero, Falcao, Julián Álvarez, Llorente, Savić, Trippier, Tiago, Partey) y Común. La posición marca las estadísticas y cada uno puede aprender de 8 a 16 habilidades según su rareza y su forma de jugar |
| **Entrenadores** | Cholo Simeone (ulti «¡Partido a partido!») y Luis Aragonés (ulti «Furia Roja») |
| **Habilidades** | 24 armas que se disparan solas, con 5 niveles (balón, cañonazo de falta, córner, cabezazo, entrada rasante, barrera, chilena, volea, penalti, regate, caño, pared, cántico, VAR, bengala…) y 14 pasivas. Las muy fuertes no suben de nivel hasta cierto minuto |
| **Combinaciones y ultras** | 24 combinaciones («metas») que se activan al juntar ciertas habilidades y dan bonus; completando varias se consiguen 6 **ULTRAS** (Premio Puskás, Ganador del Balón de Oro, MVP de la Champions, Trofeo Zamora, Bota de Oro histórica y Mejor jugador del Mundial) |
| **Rivales** | 16 equipos famosos con jugadores genéricos; unos embisten y otros disparan, y aparecen élites (blindado, veloz, furioso) |
| **Jefes** | 10 (Guardiola, Mourinho, Cristiano, Messi, Vinicius, Yamal, Neymar, Bale, Benzema y Suárez) con tres fases, escolta de élites desde el segundo, furia si tardas en ganarles y una **jugada estrella** en la fase 3. Desde la oleada 24 pueden salir dos a la vez y cada vuelta completa los hace un 25 % más duros |
| **Mundo** | Procedural e infinito, distinto en cada partida: barrios de estadios con gradas, plazas, campos de entrenamiento, parques y prados con mesetas y escaleras, barro, lluvia y caminos |
| **Club** | Empiezas con 4 jugadores comunes; cada 3 jefes ganas una **ficha de contrato** para fichar a otro (animación de la firma), y cada jugador gana puntos de **entrenamiento** (vida, defensa, disparo y suerte) por jefes y bajas |
| **Logros y equipaciones** | 29 logros con un **dato curioso de la historia del Atleti** que se descubre al conseguirlos, y 10 equipaciones que se desbloquean con ellos |
| **Sonido** | Efectos, **música chiptune original** con una fanfarria por competición y la grada, que murmura y canta «¡A-tle-ti!» cuando te acercas; todo sintetizado con Web Audio |
| **Tu ficha** | Mote único y avatar (la cara de un jugador fichado o de un entrenador), que salen en la cabecera, en Mi cuenta y en el ranking |

### Cómo está hecho

- **Simulación pura** (`public/js/game/mundo.js` y sus módulos `armas`, `combate`, `jefes`, `oleadas`, `terreno`, `ultras`, `ulti`, `mejoras`): paso fijo de 1/60 s y generador aleatorio con semilla, sin DOM, así que se prueba con `node:test` igual que el backend. Todo el equilibrio está en `config.js`.
- **Dibujo** en Canvas 2D (`render.js`, `render-mundo.js`, `render-ultras.js`) con cámara 3/4; los muñecos se pintan con código en una cuadrícula de 16×20 (`sprites.js`), sin imágenes.
- **Interfaz del juego** (`juego.js`, `hud.js`, `club-ui.js`, `fin-ui.js`), **sonido** (`audio.js` y `musica.js`), **logros** (`logros.js`), **ajustes** y **entrada** (teclado, táctil y joystick).
- **Las reglas se comparten con el servidor**: `club.js`, `config.js` y `logros.js` se cargan también en `juegoService.js`, así que cliente y servidor aplican exactamente las mismas reglas. El servidor valida cada partida con su propio reloj (no se puede decir que has aguantado más de lo que ha pasado, ni ganar jefes imposibles), solo apunta los logros que puede comprobar y usa **concurrencia optimista** (`version`) para que dos peticiones a la vez no gasten dos veces la misma ficha.
- Respeta `prefers-reduced-motion` (sin sacudidas ni partículas), las pantallas se manejan con teclado y los avisos importantes se anuncian a los lectores de pantalla.

### Evolución por fases

Cada fase es una etiqueta del Sprint 2 en DoneTonic y un PR a `main` ([qué PBIs tiene cada una](#sprint-2-la-lógica-del-juego)).

| Fase | Qué se añadió |
|---|---|
| 1 | Base del survivor: simulación, oleadas, armas, mejoras, jefes y menú |
| 2 | Club en el servidor: plantilla, contratos, entrenamiento, ranking de la grada y rivales élite |
| 3 | Ultras, 24 combinaciones, dificultad con castigo y modo pruebas para administradores |
| 4 | Mundo procedural, 5 ambientes por finales, mote y avatar |
| 5 | Rarezas por historia rojiblanca, habilidades niveladas, combinaciones a la vista, firma del contrato y colisiones exactas |
| 6 | Logros con historia, equipaciones, estadísticas de fin de partida, música chiptune y grada, muñecos con más detalle y jefes más duros |

Para el detalle de cada sistema, ver [`docs/documentacion-tecnica.md`](docs/documentacion-tecnica.md#9-el-juego).

## Documentación y memoria

- [`docs/documentacion-tecnica.md`](docs/documentacion-tecnica.md): documentación técnica completa del proyecto (requisitos, decisiones, diseño, flujos con diagramas de secuencia, pruebas, despliegue, gestión y juego), pensada como base para escribir la memoria.
- [`docs/revision-entrega.md`](docs/revision-entrega.md): revisión frase a frase del enunciado del Sprint 1.
- [`docs/gestion/README.md`](docs/gestion/README.md): gestión en DoneTonic de los dos sprints (backlog, historias de usuario, trazabilidad, evolución y capturas).
- [`docs/hito4-configuracion.md`](docs/hito4-configuracion.md): configuración del correo y de Google en producción.
- [`memoria/`](memoria/README.md): la memoria del proyecto, planteada como un TFG, en LaTeX. Se compila con **LuaLaTeX** (y sola en GitHub Actions); allí se explica cómo generar el PDF.
