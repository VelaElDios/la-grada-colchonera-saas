---
type: Requisitos
title: Requisitos de La Grada Colchonera
description: Contexto, objetivos y alcance, y estado de cada requisito funcional y no funcional de los dos sprints, con dónde se cumple y qué pruebas lo cubren.
timestamp: 2026-11-19
---

# Requisitos

## Contexto, objetivos y alcance

### Contexto

El trabajo de PIS se plantea como si fuera un TFG: un producto software real, desarrollado con un proceso de ingeniería (Scrum, control de versiones, integración y despliegue continuos, pruebas automáticas) y documentado con una memoria. El enunciado del Sprint 1 fija cuatro hitos comunes a todos los proyectos, centrados en la base de cualquier aplicación SaaS: gestión de usuarios, autenticación, persistencia, roles, seguridad y despliegue.

### Objetivos

1. **Producto:** una aplicación web pública en la que los aficionados del Atlético de Madrid se registran, entran (con email o con Google) y juegan a un juego propio, con su progreso guardado en el servidor.
2. **Proceso:** aplicar Scrum con un backlog en DoneTonic, GitHub Flow con una rama y un pull request por tarea, integración continua con pruebas automáticas y despliegue continuo en la nube.
3. **Calidad:** arquitectura en capas con responsabilidades separadas, pruebas de los casos de error (no solo del camino feliz), seguridad desde el diseño (hash de contraseñas, secretos fuera del código, permisos en el servidor) y una interfaz accesible y responsive.
4. **Documentación:** que todo el trabajo, incluida la gestión, se pueda revisar desde el repositorio (README, `docs/` y memoria).

### Alcance y cambio de enfoque

| Etapa | Alcance |
|---|---|
| **Sprint 1, Hitos 1–3** (29/09 – 12/10/2026) | Repositorio, CI, despliegue continuo, lógica de usuarios con pruebas, API REST, frontend separado en interfaz y cliente, registro e inicio de sesión locales, sesión, rutas protegidas, PostgreSQL, secretos, roles, panel de administración y logs |
| **Sprint 1, Hito 4** (hasta el 23/10/2026) | Confirmación de cuenta por correo, inicio de sesión con Google, manejo de errores de principio a fin, política de privacidad y aplicación de Google publicada |
| **Cierre del sprint** (24/10/2026) | README, capturas, revisión de la entrega frente al enunciado, despliegue en Google Cloud Run y estructura de la memoria |
| **Sprint 2** (23/10 – 29/10/2026) | La lógica del juego: rediseño de la interfaz y el juego en seis fases (29 PBIs, P20–P48) |

**Por qué un juego y no una red social.** La idea inicial era una red social tipo Twitter para aficionados del Atleti. Cerrado el Sprint 1, el profesor dejó libertad para la lógica y el diseño del producto (y fijó después que el Sprint 2 sería esa lógica), y se decidió hacer un juego porque: (1) es más original y diferenciador que otro clon de red social; (2) permite trabajar problemas técnicos más ricos (simulación determinista, rendimiento en canvas, generación procedural, sonido sintetizado, validación anti-trampas en el servidor); y (3) reutiliza entera la base SaaS del sprint: un juego con cuentas, progreso en el servidor, ranking y roles necesita exactamente lo que piden los hitos.

**Fuera de alcance (por ahora):** multijugador en tiempo real, amigos y partidas en grupo, y aplicaciones nativas (ver la [sprint-2.md](sprint-2.md#trabajo-futuro)).

## Requisitos funcionales del Sprint 1

Los requisitos del enunciado (Hitos 1–4) y la prueba técnica. La revisión frase a frase del enunciado está en [sprint-1.md](sprint-1.md#revisión-de-la-entrega-frente-al-enunciado).

| ID | Requisito | Estado | Hito | PBI | Dónde se cumple | Pruebas |
|---|---|---|---|---|---|---|
| RF-01 | Registro con email y contraseña (validación, email único, contraseña de 8 o más caracteres) | hecho | 2 | P8 | `userService.register`, `POST /api/auth/register`, vista `registro.js` | `userService`, `api.auth` |
| RF-02 | Inicio de sesión local, con el mismo mensaje si el email no existe o la contraseña es incorrecta | hecho | 2 | P8 | `userService.authenticate`, `POST /api/auth/login` | `api.auth` |
| RF-03 | Mantener la sesión al recargar y cerrarla en el servidor | hecho | 2 | P9 | `express-session` + tabla `session`, `GET /api/auth/me`, `POST /api/auth/logout` | `api.auth`, `api.database` (CI) |
| RF-04 | Rutas protegidas en el servidor (`401` sin sesión) | hecho | 2 | P10 | `requireAuth` | `api.users`, `api.auth` |
| RF-05 | Persistencia en una base de datos real | hecho | 3 | P11 | PostgreSQL (Neon), `postgresUserRepository`, migraciones | `userRepository`, `migrate`, `api.database` |
| RF-06 | Roles usuario y administrador, con un primer administrador | hecho | 3 | P13 | `requireRole`, `requireSelfOrRole`, `userService.ensureAdmin` | `userService`, `api.users`, `bootstrap` |
| RF-07 | Listar usuarios, ver si un usuario está activo y cambiar roles (solo administrador) | hecho | 3 | P13 | `GET /api/users`, `GET /api/users/:id/active`, `PATCH /api/users/:id/role`, vista `admin.js` | `api.users` |
| RF-08 | Darse de baja (y que el administrador pueda eliminar cuentas); nunca eliminar al último administrador; tras la baja se puede volver con el mismo email | hecho | 3 | P13 | `DELETE /api/users/:id` (baja lógica), vistas `perfil.js` y `admin.js` | `userService`, `api.users` |
| RF-09 | Registro de la actividad relevante | hecho | 3 | P14 | `src/logger.js`, `requestLogger` | `logger` |
| RF-10 | Confirmación de la cuenta por correo, con reenvío | hecho | 4 | P16 | `accountConfirmationService`, `tokenSigner`, `mailer`, `GET /api/auth/confirm`, `POST /api/auth/resend-confirmation` | `accountConfirmation`, `tokenSigner`, `mailer`, `api.auth` |
| RF-11 | Inicio de sesión con un proveedor externo (Google, OAuth 2.0) | hecho | 4 | P15 | `googleOAuth.js`, `GET /api/auth/google`, `GET /api/auth/google/callback`, `userService.loginWithOAuth` | `googleOAuth`, `userService` |
| RF-12 | Manejo de errores con información clara al usuario | hecho | 4 | P17 | `errorHandler.js`, `componentes.js`, `avisos.js`, `api.js` (timeout) | `api.*`, `frontend` |
| RF-13 | Prueba técnica: solo dominios de correo permitidos | hecho | Prueba | — | `domainPolicy.js`, `POST /api/prueba/dominio` | `domainPolicy` (13) |
| RF-14 | Repetir la contraseña al registrarse, recuperarla por correo y cambiarla desde «Mi cuenta»; al cambiarla se cierran las sesiones de otros dispositivos (issue #61) | hecho | Sprint 3 | — | `formulario.js`, `passwordResetService`, `userService.changePassword`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `PUT /api/users/me/password`, `currentUser` (huella) | `contrasenas`, `frontend` |
| RF-15 | Correos (confirmación y recuperación) con una plantilla HTML con la marca y versión en texto plano (issue #61) | hecho | Sprint 3 | — | `plantillaCorreo.js` | `contrasenas` |

## Requisitos funcionales del juego (Sprint 2)

Cada requisito sale de uno o varios PBIs del Sprint 2 (sus historias de usuario y criterios de aceptación están en [sprint-2.md](sprint-2.md#historias-de-usuario-y-criterios-de-aceptación)).

| ID | Requisito | Estado | PBI | Dónde se cumple | Pruebas |
|---|---|---|---|---|---|
| RJ-01 | Con sesión, el inicio es el menú del juego; sin sesión no se juega y el progreso va ligado a la cuenta | hecho | P20, P29 | `ui.js` (ruta `#/jugar`), `requireAuth` en `/api/juego`, tablas `juego_perfiles` y `juego_records` | `api.juego`, `frontend` |
| RJ-02 | Partida *survivor* infinita: oleadas, experiencia, mejoras al subir de nivel y dificultad creciente | hecho | P21, P24, P34 | `mundo.js`, `oleadas.js`, `mejoras.js`, `config.js` | `game`, `juego-personajes`, `juego-club` |
| RJ-03 | Gráficos pixel art generados por código y cámara 3/4 | hecho | P22, P45 | `sprites.js`, `render.js`, `render-mundo.js` | `juego-movilidad`, `juego-habilidades` |
| RJ-04 | Elegir jugador (36, con estadísticas por posición, habilidades propias y rareza por historia) y entrenador (2, con ulti) | hecho | P23, P38 | Vestuario y Dirección (`juego.js`), `config.js`, `ulti.js` | `juego-personajes`, `juego-club` |
| RJ-05 | Armas automáticas con 5 niveles, pasivas y habilidades que solo suben a partir de cierto minuto | hecho | P24, P39 | `armas.js`, `mejoras.js`, `combate.js` | `juego-habilidades` |
| RJ-06 | Rivales con comportamiento propio (embisten, disparan, rodean obstáculos, élites) | hecho | P25 | `rivales.js`, `oleadas.js` | `juego-movilidad`, `juego-personajes` |
| RJ-07 | Jefes con tres fases, avisos de ataque, escolta, furia y jugada estrella | hecho | P26, P46 | `jefes.js`, `oleadas.js` | `juego-movilidad`, `juego-logros` |
| RJ-08 | Mundo procedural con terreno, obstáculos macizos y colisiones exactas | hecho | P27, P35, P41 | `terreno.js`, `mundo.js` | `juego-movilidad` |
| RJ-09 | Ambientes que cambian cada 5 minutos (de la pretemporada a la Final del Mundial) | hecho | P36 | `config.js`, `render-mundo.js`, `musica.js` | `juego-movilidad` |
| RJ-10 | Jugable con teclado, ratón y pantalla táctil; pausa, pantalla completa y ajustes | hecho | P28 | `entrada.js`, `ajustes.js`, `juego.js` | `game`, `frontend` |
| RJ-11 | Club guardado en el servidor con validación anti-trampas de cada partida | hecho | P29 | `juegoService.finalizarPartida`, migración `003` | `api.juego`, `juegoRepository` |
| RJ-12 | Fichar jugadores con fichas de contrato (una por cada 3 jefes), sorteadas por rareza | hecho | P30, P38 | `club.js`, `POST /api/juego/contratar`, `firma.js` | `juego-club`, `api.juego`, `frontend` |
| RJ-13 | Entrenar a los jugadores con puntos ganados por bajas y jefes | hecho | P31 | `club.js`, `POST /api/juego/entrenar` | `juego-club`, `api.juego` |
| RJ-14 | Ranking de la grada con la mejor partida de cada usuario (sin mostrar el correo) | hecho | P32 | `juego_records`, `GET /api/juego/ranking` | `api.juego`, `juegoRepository` |
| RJ-15 | Combinaciones y ULTRAS, con una pantalla que muestra lo que pide cada una | hecho | P33, P40 | `ultras.js`, `render-ultras.js`, pantalla Combinaciones | `juego-ultras`, `juego-habilidades`, `frontend` |
| RJ-16 | Modo pruebas solo para administradores | hecho | P34 | `POST /api/juego/desbloquear`, `scripts/desbloquear-juego.js` | `api.juego` |
| RJ-17 | Mote único y avatar, en la cabecera, Mi cuenta y el ranking | hecho | P37 | `PUT /api/juego/identidad`, migración `004` | `api.juego`, `juegoRepository`, `frontend` |
| RJ-18 | Logros con datos de la historia del Atleti, validados en el servidor, y equipaciones desbloqueables | hecho | P42 | `logros.js`, `juegoService` | `juego-logros`, `api.juego` |
| RJ-19 | Pantalla de fin con estadísticas y daño por habilidad | hecho | P43 | `fin-ui.js`, `combate.js` | `juego-logros` |
| RJ-20 | Música chiptune, efectos y la grada, con ajustes de volumen | hecho | P44 | `audio.js`, `musica.js`, `ajustes.js` | `juego-logros` |

## Requisitos no funcionales

| ID | Requisito | Estado | Cómo se cumple |
|---|---|---|---|
| RNF-01 | **Seguridad** de credenciales y sesiones | hecho | Hash bcrypt, cookie `httpOnly` + `secure` + `sameSite`, regeneración de la sesión, permisos en el servidor, consultas parametrizadas ([arquitectura.md](arquitectura.md#seguridad)) |
| RNF-02 | **Secretos fuera del código** | hecho | Variables de entorno; Secret Manager en producción; la app no arranca si falta un secreto obligatorio |
| RNF-03 | **Separación en capas** | hecho | API → lógica → datos/integraciones, con inyección de dependencias ([arquitectura.md](arquitectura.md)) |
| RNF-04 | **Pruebas automáticas** y CI obligatorio | hecho | 322 pruebas con `node:test`; las ramas protegidas exigen el CI en verde |
| RNF-05 | **Despliegue continuo** en una URL pública | hecho | Cloud Run (principal) y Render (alternativo), sin intervención manual |
| RNF-06 | **Disponibilidad y coste** | hecho | Escala a cero (capas gratuitas y créditos de educación); si una versión no arranca, sigue sirviendo la anterior |
| RNF-07 | **Accesibilidad** | hecho | HTML semántico, foco gestionado al navegar, `aria-live` en los avisos, errores de formulario enlazados con `aria-describedby`, manejo con teclado, `prefers-reduced-motion` |
| RNF-08 | **Responsive** | hecho | Diseño adaptable: el panel de administración pasa a tarjetas en el móvil; joystick táctil en el juego |
| RNF-09 | **Rendimiento del juego** | hecho | 60 FPS en un portátil normal: simulación de paso fijo, búsqueda espacial por celdas, texturas por celda cacheadas y precargadas |
| RNF-10 | **Trazabilidad** | hecho | Requisito → PBI → tarea → rama → PR → release ([sprint-1.md](sprint-1.md) y [sprint-2.md](sprint-2.md)) |
| RNF-11 | **Privacidad** | hecho | Política de privacidad pública; el ranking nunca muestra el correo; los logs ocultan los datos sensibles |
| RNF-12 | **Mantenibilidad** | hecho | Sin frameworks ni compilación en el frontend; todo el equilibrio del juego en un fichero de configuración; módulos pequeños y comentados |

## Estado

Todos los requisitos de las tablas anteriores están **hechos**: integrados en `main`, desplegados en Cloud Run y cubiertos por la suite automática (322 pruebas con `node:test`). Lo que queda fuera de alcance se recoge en [sprint-2.md](sprint-2.md#trabajo-futuro).
