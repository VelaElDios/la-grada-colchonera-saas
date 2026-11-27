---
type: Arquitectura
title: Arquitectura de La Grada Colchonera
description: Capas del backend y del frontend, modelo de datos, API, flujos con diagramas de secuencia, seguridad, arquitectura del juego y manejo de errores.
timestamp: 2026-11-19
---

# Arquitectura

La aplicación es cliente-servidor y está dividida en capas que solo hablan con la vecina: presentación (`public/`), API (`src/api/`), lógica (`src/services/`), datos (`src/repositories/`) e integraciones (`src/integrations/`). El juego (`public/js/game/`) es una capa más de la presentación y comparte sus reglas con el servidor. Las decisiones que llevaron a esta forma están en [decisiones.md](decisiones.md).

## Vista general

Arquitectura **cliente-servidor en capas**. El servidor (Node.js + Express) sirve también el frontend estático, así que todo vive en el mismo origen.

```mermaid
flowchart LR
    subgraph Navegador
        UI["Interfaz<br/>ui.js + ui/ + vistas/"] --> CLI["Cliente de la API<br/>api.js (único fetch)"]
        GAME["Juego<br/>game/ (canvas, Web Audio)"] --> CLI
    end
    CLI -- "HTTP + JSON<br/>cookie de sesión" --> API
    subgraph "Servidor Node.js + Express"
        API["Capa API (src/api)<br/>rutas, sesión, roles,<br/>logs, errores"] --> SRV["Lógica (src/services)<br/>usuarios, confirmación,<br/>tokens, juego"]
        SRV --> REPO["Datos (src/repositories)<br/>memoria | PostgreSQL"]
        SRV --> INT["Integraciones<br/>correo | Google"]
        SRV -. "reglas compartidas" .-> RULES["club.js, config.js,<br/>logros.js (del juego)"]
    end
    REPO --> PG[("PostgreSQL<br/>Neon")]
    INT --> SMTP["SMTP Gmail"]
    INT --> GOO["Google OAuth 2.0"]
```

| Capa | Carpeta | Responsabilidad | No hace |
|---|---|---|---|
| Presentación | `public/` | Pintar vistas, validar formularios, mostrar avisos, jugar | No habla con la base de datos ni decide permisos |
| Cliente de la API | `public/js/api.js` | Peticiones HTTP, timeout de 15 s, traducir errores a `ApiError`, avisar si caduca la sesión | No pinta nada |
| API | `src/api/` | Rutas HTTP, sesión, autenticación y autorización, registro de peticiones, formato común de errores | No contiene reglas de negocio |
| Lógica | `src/services/` | Reglas de negocio | No conoce HTTP ni SQL |
| Datos | `src/repositories/` | Guardar y leer (memoria o PostgreSQL) con el mismo contrato | No valida reglas |
| Integraciones | `src/integrations/` | Correo y Google | No decide nada |
| Composición | `src/app.js`, `src/bootstrap.js` | Conectar las capas, elegir la base de datos, migrar, crear el primer administrador | — |

## Diseño detallado

### Backend: módulos

| Módulo | Qué hace |
|---|---|
| `server.js` | Punto de entrada: carga la configuración, llama a `bootstrap` y escucha en `PORT`; para con orden al recibir `SIGTERM` |
| `bootstrap.js` | Elige PostgreSQL (si hay `DATABASE_URL`) o memoria, aplica las migraciones, crea o promociona el primer administrador y crea el correo (SMTP o registro) |
| `app.js` | Construye la app Express: JSON, sesión, `/api` y los estáticos de `public/` |
| `config.js`, `loadConfig.js` | Leen y validan las variables de entorno; en producción exigen los secretos |
| `logger.js` | Logs JSON por línea, con niveles y ocultación de datos sensibles |
| `api/index.js` | Monta el router: `requestLogger`, `currentUser`, `/health`, `/auth`, `/prueba`, `/users` y `/juego` (con `requireAuth`), 404 y manejador de errores |
| `api/auth.js` | Registro, confirmación, reenvío, login, Google, logout y `me` |
| `api/users.js` | Administración de usuarios (`requireRole('admin')`, `requireSelfOrRole('admin')`) |
| `api/juego.js` | Perfil, partidas, contratos, entrenamiento, identidad, ranking y modo pruebas |
| `api/currentUser.js` | Middlewares de identidad, autenticación y autorización |
| `api/errorHandler.js` | Traduce los errores tipados a HTTP (`{ error: { code, message } }`) |
| `services/userService.js` | Reglas de usuarios: registro, autenticación, OAuth, roles, bajas, último administrador y primer administrador |
| `services/accountConfirmationService.js` | Crea y envía el enlace de confirmación, confirma y reenvía |
| `services/tokenSigner.js` | Tokens firmados con HMAC-SHA256 y caducidad |
| `services/passwordHasher.js` | bcrypt (coste 10; en las pruebas, 4) |
| `services/juegoService.js` | Reglas del servidor del juego: perfiles, partidas, validación anti-trampas, recompensas, logros, contratos, entrenamiento, identidad y ranking |
| `services/domainPolicy.js` | Prueba técnica: dominios permitidos |
| `services/errors.js` | Errores tipados: `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `AccountPendingError`, `NotFoundError`, `ConflictError`, `ServiceUnavailableError` |
| `repositories/*` | `memoryUserRepository`, `postgresUserRepository`, `memoryJuegoRepository`, `postgresJuegoRepository` |
| `integrations/mailer.js` | Correo por SMTP (`nodemailer`) o, sin `SMTP_URL`, escrito en el registro |
| `integrations/googleOAuth.js` | URL de autorización de Google e intercambio del código por el perfil |
| `db/migrate.js`, `db/migrations/*.sql` | Migraciones versionadas (001 usuarios, 002 sesiones, 003 juego, 004 identidad, 005 email libre tras la baja) |

### Modelo de datos

```mermaid
erDiagram
    users ||--o| juego_perfiles : "tiene su club"
    users ||--o| juego_records : "tiene su mejor partida"
    users {
        UUID id PK
        TEXT email "único entre las no eliminadas"
        TEXT password_hash "null con Google"
        TEXT role "user | admin"
        TEXT status "pending | active | deleted"
        TEXT auth_provider "local | google"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ deleted_at
        TEXT apodo
        TEXT apodo_clave UK
        TEXT avatar
    }
    session {
        VARCHAR sid PK
        JSON sess
        TIMESTAMP expire
    }
    juego_perfiles {
        UUID user_id PK,FK
        JSONB datos
        INTEGER version
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

- **`users`**: una fila por cuenta. `email` normalizado (minúsculas, sin espacios) y único **entre las cuentas no eliminadas** (índice parcial de la migración 005), así que tras una baja se puede volver con el mismo email. `password_hash` es nulo en las cuentas de Google. `apodo_clave` es el mote normalizado (sin mayúsculas ni tildes) con índice único.
- **`session`**: la gestiona `connect-pg-simple`. Guarda el `userId` y, durante el acceso con Google, el `state`.
- **`juego_perfiles.datos`** (JSONB): plantilla (`jugadores` con jefes, bajas, partidas y estadísticas de entrenamiento), contadores (`jefesTotal`, `partidas`, `contratos`), logros con su fecha y la partida en curso (`partidaActual`). `version` sube en cada escritura (concurrencia optimista).
- **`juego_records`**: la mejor partida de cada usuario (más tiempo; en empate, más nivel), con el mote y el avatar para el ranking.

**Estados de una cuenta**

```mermaid
stateDiagram-v2
    [*] --> pending: registro local
    [*] --> active: primer acceso con Google
    [*] --> active: primer administrador (ADMIN_EMAIL)
    pending --> active: enlace del correo
    pending --> active: entra con Google con el mismo email
    active --> deleted: baja propia o de un administrador
    pending --> deleted: un administrador la elimina
    deleted --> [*]
    note right of deleted
        La fila se conserva, pero no puede entrar.
        Su sesión deja de valer en la siguiente petición.
        Sale del ranking y suelta su email y su mote:
        con ese email se puede crear otra cuenta (también con Google).
    end note
```

### Frontend

- **SPA con rutas por hash** (`public/js/ui.js`): `#/` inicio, `#/entrar`, `#/registro`, `#/perfil`, `#/jugar` y `#/admin`, y una vista 404 («Fuera de juego»). Cada ruta declara si es protegida, solo para invitados o solo para administradores; la interfaz redirige, pero **la protección real está en el servidor**.
- **Vistas** (`ui/vistas/*.js`): cada una exporta `montar(raiz, contexto)` y devuelve una función de limpieza. Se cargan bajo demanda con `import()`.
- **Estado** (`ui/estado.js`): el usuario actual; la cabecera (`ui/cabecera.js`) se repinta al cambiar (mote, avatar, enlaces según el rol).
- **Formularios** (`ui/formulario.js`): validación al escribir (una vez tocado el campo) y al enviar, errores enlazados con `aria-describedby`, botón «Mostrar contraseña», envío doble bloqueado con una rueda de carga.
- **Avisos** (`ui/avisos.js`): mensajes temporales en una zona `aria-live`; los errores usan `role="alert"`. Los que vienen del servidor por redirección (`?aviso=cuenta-confirmada`, `google-cuenta-creada`…) se leen al cargar y se quitan de la barra de direcciones.
- **Componentes** (`ui/componentes.js`): rueda de carga, estado vacío, estado de error con **Reintentar** y `mensajeDeError`, que traduce cualquier error a un texto legible y lo registra en la consola.
- **Diálogos** (`ui/modal.js`): confirmación accesible con el elemento nativo `<dialog>` (sustituye a `window.confirm`): el foco va al botón seguro, `Esc` cierra y el foco vuelve a donde estaba. Se usa antes de cualquier acción destructiva.
- **Cliente** (`api.js`): único sitio con `fetch`; timeout de 15 s con `AbortController`; convierte las respuestas de error en `ApiError` (estado, código y mensaje); si una petición devuelve `401` con sesión, avisa a la interfaz de que la sesión ha caducado.
- **Sistema de diseño** (`public/css/`): tokens (colores, espacios, radios), base, componentes y vistas; tipografía Plus Jakarta Sans autoalojada; modo oscuro rojiblanco; diseño responsive (la tabla de administración se convierte en tarjetas en el móvil).

### API

La lista completa de rutas, con su acceso y su contrato, está en el [README](../README.md#api). Resumen:

| Grupo | Rutas | Acceso |
|---|---|---|
| Salud | `GET /api/health` | Público |
| Autenticación | `POST register`, `POST login`, `POST logout`, `GET me`, `GET confirm`, `POST resend-confirmation`, `POST forgot-password`, `POST reset-password`, `GET providers`, `GET google`, `GET google/callback` | Público (salvo `me`) |
| Usuarios | `PUT /users/me/password`, `GET /users`, `GET /users/:id/active`, `PATCH /users/:id/role`, `DELETE /users/:id` | Admin (la contraseña y la baja, el propio usuario) |
| Juego | `GET perfil`, `POST partidas`, `POST partidas/:id/fin`, `POST contratar`, `POST entrenar`, `PUT identidad`, `GET ranking`, `POST desbloquear` | Sesión (`desbloquear`, admin) |
| Prueba técnica | `POST /api/prueba/dominio` | Público |

## Flujos con diagramas de secuencia

### Registro con email y contraseña

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant V as Vista registro.js
    participant C as api.js
    participant A as API /api/auth/register
    participant S as userService
    participant H as passwordHasher
    participant R as userRepository
    participant AC as accountConfirmation
    participant M as mailer (SMTP)
    U->>V: Escribe email y contraseña
    V->>V: Valida (email con formato, 8 o más caracteres)
    V->>C: register(email, password)
    C->>A: POST {email, password}
    A->>S: register()
    S->>S: Normaliza el email y valida
    S->>R: findByEmail(email)
    alt Ya existe
        S-->>A: ConflictError
        A-->>C: 409 CONFLICT
        C-->>V: ApiError → mensaje en el formulario
    else Nuevo
        S->>H: hash(password) (bcrypt)
        S->>R: create(role user, status pending, provider local)
        A->>AC: enviarConfirmacion(user)
        AC->>AC: token = firma HMAC {userId, propósito, caducidad 24 h}
        AC->>M: send(to, asunto, enlace /api/auth/confirm?token=…)
        alt El correo falla
            M-->>AC: error (log mail.failed)
            A-->>C: 201 + aviso «no se ha podido enviar, pide otro»
        else Enviado
            A-->>C: 201 + «te hemos enviado un correo»
        end
        C-->>V: Aviso de éxito y paso a Entrar
    end
```

### Confirmación con el enlace del correo

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant A as API GET /api/auth/confirm
    participant AC as accountConfirmation
    participant T as tokenSigner
    participant S as userService
    participant W as Interfaz (ui.js)
    U->>A: Abre el enlace (token)
    A->>AC: confirmar(token)
    AC->>T: verify(token, propósito)
    alt Firma mala, caducado o propósito distinto
        T-->>AC: null
        A-->>U: 303 → /?aviso=enlace-no-valido#/entrar (log user.confirm_failed)
    else Válido
        T-->>AC: {userId}
        AC->>S: activar(userId) (si está pending)
        A-->>U: 303 → /?aviso=cuenta-confirmada#/entrar (log user.confirmed)
    end
    U->>W: Carga la web
    W->>W: Lee ?aviso, muestra el aviso y lo quita de la URL
```

### Inicio de sesión local (incluye cuenta pendiente y reenvío)

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant V as Vista entrar.js
    participant C as api.js
    participant A as API /api/auth
    participant S as userService
    U->>V: Email y contraseña
    V->>C: login(email, password)
    C->>A: POST /login
    A->>S: authenticate()
    alt Email desconocido o contraseña mala
        S-->>A: UnauthorizedError
        A-->>C: 401 «Email o contraseña incorrectos» (log auth.login_failed)
    else Cuenta eliminada
        S-->>A: ForbiddenError
        A-->>C: 403 FORBIDDEN
    else Cuenta pendiente
        S-->>A: AccountPendingError
        A-->>C: 403 ACCOUNT_PENDING
        C-->>V: Muestra «Reenviar el correo de confirmación»
        U->>V: Pulsa Reenviar
        V->>C: resendConfirmation(email)
        C->>A: POST /resend-confirmation
        A-->>C: 202 (mismo mensaje exista o no la cuenta)
    else Correcto
        A->>A: Regenera la sesión y guarda userId
        A-->>C: 200 usuario + cookie grada.sid (httpOnly)
        C-->>V: ponerUsuario() → #/jugar
    end
```

### Inicio de sesión con Google (OAuth 2.0, código de autorización)

```mermaid
sequenceDiagram
    autonumber
    actor U as Navegador
    participant A as API /api/auth
    participant SS as Sesión (PostgreSQL)
    participant G as Google
    participant S as userService
    participant R as userRepository
    U->>A: GET /google
    A->>SS: state aleatorio (24 bytes en hexadecimal)
    A-->>U: 303 → accounts.google.com (client_id, redirect_uri, scope email, state)
    U->>G: Inicia sesión y acepta
    G-->>U: 302 → /api/auth/google/callback?code&state
    U->>A: GET /google/callback?code&state
    A->>SS: Compara el state y lo borra (un solo uso)
    alt state falso, ausente o reutilizado / el usuario canceló
        A-->>U: 303 → /?aviso=google-error | google-cancelado
    else state correcto
        A->>G: POST token (code + client_secret, desde el servidor)
        G-->>A: id del perfil: email y email_verified
        A->>S: loginWithOAuth(google, email, verificado)
        alt Email sin verificar
            S-->>A: error → 303 aviso=google-rechazado
        else No existía (o solo había una cuenta eliminada)
            S->>R: create(active, provider google, sin contraseña)
        else Existía pendiente
            S->>R: update(status active)
        end
        A->>SS: Regenera la sesión con userId
        A-->>U: 303 → /?aviso=google-cuenta-creada | google-ok#/jugar
    end
```

### Recuperar la sesión al recargar y cerrar sesión

```mermaid
sequenceDiagram
    autonumber
    participant W as ui.js (al cargar)
    participant C as api.js
    participant A as API
    participant CU as currentUser
    participant SS as Sesiones (PostgreSQL)
    W->>C: me()
    C->>A: GET /api/auth/me (cookie)
    A->>CU: Lee la sesión
    CU->>SS: sid → {userId}
    CU->>CU: Vuelve a cargar el usuario (¿sigue activo?)
    alt Activo
        A-->>C: 200 usuario
        C-->>W: ponerUsuario(usuario): cabecera con mote y avatar
    else Sin sesión, eliminado o pendiente
        A-->>C: 401
        C-->>W: ponerUsuario(null): modo invitado
    end
    Note over W,A: Más tarde, «Salir»
    W->>C: logout()
    C->>A: POST /api/auth/logout
    A->>SS: Destruye la sesión y borra la cookie
    A-->>C: 200
    C-->>W: Aviso «Has cerrado sesión» → inicio
```

### Petición protegida y autorización por roles

```mermaid
sequenceDiagram
    autonumber
    participant C as api.js
    participant RL as requestLogger
    participant CU as currentUser
    participant RA as requireAuth
    participant RR as requireRole('admin')
    participant H as GET /api/users
    participant S as userService
    C->>RL: GET /api/users (X-Request-Id)
    RL->>CU: siguiente
    CU->>CU: req.user = usuario activo de la sesión o null
    CU->>RA: siguiente
    alt req.user es null
        RA-->>C: 401 UNAUTHENTICATED
    else
        RA->>RR: siguiente
        alt rol user
            RR-->>C: 403 FORBIDDEN (log auth.forbidden)
        else rol admin
            RR->>H: siguiente
            H->>S: listUsers()
            S-->>H: usuarios sin datos sensibles
            H-->>C: 200
        end
    end
    RL->>RL: log http.request (método, ruta, estado, ms, usuario)
```

### Cambiar el rol y proteger al último administrador

```mermaid
sequenceDiagram
    autonumber
    actor AD as Administrador
    participant V as Vista admin.js
    participant A as PATCH /api/users/:id/role
    participant S as userService
    participant R as userRepository
    AD->>V: «Quitar admin» en una fila
    V->>A: {role: user}
    A->>S: changeRole(actor, id, user)
    S->>R: findAll() → cuenta administradores activos
    alt Es el último administrador activo
        S-->>A: ForbiddenError «Debe quedar al menos un administrador»
        A-->>V: 403 → aviso de error
    else Hay más administradores
        S->>R: update(id, role user)
        A-->>V: 200 (log user.role_changed) → la tabla se repinta
    end
```

### Darse de baja

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant V as Vista perfil.js
    participant D as Diálogo de confirmación
    participant A as DELETE /api/users/:id
    participant S as userService
    U->>V: «Eliminar mi cuenta»
    V->>D: ¿Eliminar tu cuenta?
    U->>D: Sí, eliminar
    D->>A: DELETE (requireSelfOrRole('admin'))
    A->>S: deleteUser(actor, id)
    alt Es el último administrador
        S-->>A: 403
    else
        S->>S: status deleted, deleted_at = ahora, suelta el mote (baja lógica)
        A->>A: juegoService.olvidarCuenta(id): sale del ranking
        A-->>V: 204 (log user.deleted) → aviso y vuelta al inicio
        Note over A: La sesión deja de valer en la siguiente petición (currentUser ya no la acepta)
    end
```

### Arranque: base de datos, migraciones y primer administrador

```mermaid
sequenceDiagram
    autonumber
    participant SV as server.js
    participant CF as loadConfig
    participant B as bootstrap
    participant DB as PostgreSQL
    participant S as userService
    SV->>CF: Lee y valida las variables
    alt Producción sin un secreto obligatorio
        CF-->>SV: Error → la app no arranca (Cloud Run sigue con la versión anterior)
    end
    SV->>B: bootstrap(config)
    alt Hay DATABASE_URL
        B->>DB: migrate(): aplica las migraciones pendientes
    else
        B->>B: Repositorios en memoria (log app.storage warn)
    end
    B->>S: ensureAdmin(ADMIN_EMAIL, ADMIN_PASSWORD)
    alt No existe
        S->>DB: create(admin, active, hash)
    else Existe y no es admin
        S->>DB: update(role admin)
    else Ya es admin
        S-->>B: sin cambios (no se toca su contraseña)
    end
    B-->>SV: app lista (log admin.bootstrap, app.start)
```

### Una partida del juego (inicio, juego y fin con validación)

```mermaid
sequenceDiagram
    autonumber
    actor J as Jugador
    participant G as juego.js (navegador)
    participant SIM as mundo.js (simulación)
    participant C as api.js
    participant A as API /api/juego
    participant JS as juegoService
    participant R as juegoRepository
    J->>G: Jugar (jugador y entrenador elegidos)
    G->>C: iniciar(personaje, entrenador)
    C->>A: POST /partidas
    A->>JS: iniciarPartida()
    JS->>R: perfil + version
    JS->>JS: ¿Está en tu plantilla? partidaActual = {id, inicio = reloj del servidor}
    JS->>R: guardarPerfil(version)
    A-->>G: 201 {partidaId, stats de entrenamiento}
    loop Cada fotograma (paso fijo 1/60 s)
        G->>SIM: avanzar(entrada)
        SIM-->>G: eventos (oleada, jefe, mejora, logro…)
        G->>G: Dibujo, HUD, sonido y música
    end
    SIM-->>G: estado fin (te eliminan)
    G->>C: terminar(id, tiempo, nivel, jefes, bajas, logros)
    C->>A: POST /partidas/:id/fin
    A->>JS: finalizarPartida()
    JS->>JS: ¿Es la partida en curso? ¿tiempo ≤ transcurrido + 15 s?<br/>¿jefes, nivel y bajas creíbles?
    alt Resultado imposible
        JS-->>A: 400 «El resultado no es creíble»
    else Válido
        JS->>JS: Reparte jefes, bajas, puntos y fichas<br/>logros creíbles + logros de plantilla
        JS->>R: guardarPerfil(version) (reintenta si otra petición ganó)
        JS->>R: guardarRecord() si es su mejor partida
        A-->>G: 200 {recompensas, logrosNuevos, record, perfil}
        G->>J: Pantalla de fin con estadísticas y logros
    end
```

### Contratar con una ficha (concurrencia optimista)

```mermaid
sequenceDiagram
    autonumber
    participant P1 as Petición 1
    participant P2 as Petición 2 (doble clic)
    participant JS as juegoService
    participant DB as juego_perfiles
    P1->>JS: contratar()
    P2->>JS: contratar()
    JS->>DB: SELECT datos, version (v = 7)
    JS->>DB: SELECT datos, version (v = 7)
    JS->>JS: P1: 1 ficha → sortea jugador
    JS->>JS: P2: 1 ficha → sortea jugador
    JS->>DB: P1: UPDATE … WHERE version = 7 → 1 fila (v = 8)
    JS->>DB: P2: UPDATE … WHERE version = 7 → 0 filas
    JS->>DB: P2 reintenta: SELECT (v = 8, 0 fichas)
    JS-->>P2: 409 «No tienes fichas de contrato»
    JS-->>P1: 200 {fichado, logrosNuevos, perfil}
```

### Integración y despliegue continuos

```mermaid
sequenceDiagram
    autonumber
    actor D as Desarrollador
    participant GH as GitHub
    participant CI as Actions: CI
    participant CD as Actions: deploy-cloud-run
    participant GC as Google Cloud (WIF)
    participant AR as Artifact Registry
    participant CR as Cloud Run
    participant RE as Render
    D->>GH: Pull request
    GH->>CI: Pruebas (PostgreSQL 17) + imagen Docker
    CI-->>GH: Check «Pruebas» verde (obligatorio para fusionar)
    D->>GH: Fusión en main
    GH->>CI: CI en main
    CI-->>CD: workflow_run: success
    CD->>GC: Token temporal con Workload Identity Federation
    CD->>AR: docker build + push (etiqueta = commit)
    CD->>CR: gcloud run deploy (variables + secretos de Secret Manager)
    CR->>CR: Arranca la revisión: migraciones y primer admin
    alt Arranca bien
        CR-->>D: Tráfico a la nueva revisión
    else Falla
        CR-->>D: Sigue la revisión anterior
    end
    GH->>RE: Webhook de main → despliegue alternativo
```

### Prueba técnica: dominio permitido

```mermaid
sequenceDiagram
    autonumber
    participant C as Cliente
    participant A as POST /api/prueba/dominio
    participant P as domainPolicy
    C->>A: {"email": "x@sub.uclm.es"}
    A->>P: isDomainAllowed(email, ALLOWED_DOMAINS)
    alt No es texto o no tiene @
        P-->>A: ValidationError
        A-->>C: 400 {"error": "mensaje"}
    else
        P-->>A: dominio completo en la lista
        A-->>C: 200 {"permitido": false}
    end
```

## Seguridad

| Amenaza | Medida | Dónde |
|---|---|---|
| Robo de contraseñas | Solo se guarda el hash **bcrypt** (sal, coste 10). Nunca la contraseña ni un cifrado reversible | `passwordHasher.js` |
| Fuerza bruta / enumeración | El mismo mensaje si el email no existe o la contraseña es incorrecta; el reenvío responde igual exista o no la cuenta; los intentos fallidos se registran con IP | `userService.js`, `auth.js` |
| Robo o fijación de sesión | Cookie `httpOnly`, `sameSite=lax`, `secure` en producción; la sesión se **regenera** al entrar y se destruye al salir; las sesiones se guardan en el servidor | `app.js`, `auth.js` |
| Sesión de una cuenta eliminada | En cada petición se vuelve a cargar el usuario; si ya no está activo, la sesión deja de valer | `currentUser.js` |
| Escalada de privilegios | Roles comprobados en el servidor (`401`/`403`); la interfaz solo oculta; siempre queda un administrador | `currentUser.js`, `userService.js` |
| Enlaces falsificados | Token HMAC-SHA256 con clave derivada, comparación en tiempo constante, propósito y caducidad (24 h) | `tokenSigner.js` |
| CSRF en OAuth | `state` aleatorio, guardado en la sesión, de un solo uso | `auth.js` |
| Robo del secreto de Google | El código se cambia por el perfil en el servidor; el `client_secret` nunca llega al navegador; solo se acepta un email verificado | `googleOAuth.js` |
| Inyección SQL | Consultas parametrizadas | `postgres*Repository.js` |
| XSS | El DOM se crea con `textContent` (helper `h()`); una prueba lo comprueba; los correos escapan el HTML | `dom.js`, `frontend.test.js`, `accountConfirmationService.js` |
| Secretos expuestos | Solo variables de entorno; Secret Manager con una cuenta de servicio de mínimo privilegio; `.env` ignorado; GitHub accede a Google Cloud sin claves (WIF) | `loadConfig.js`, workflows |
| Datos sensibles en logs | Contraseñas, hashes, cookies, tokens y secretos se sustituyen por `[oculto]` | `logger.js` |
| Trampas en el juego | Reloj del servidor, límites creíbles, logros verificables, concurrencia optimista | `juegoService.js` |
| Privacidad | Política de privacidad pública; el ranking no muestra correos | `privacidad.html`, `juegoService.ranking` |

## Arquitectura del juego

### Arquitectura del juego

```mermaid
flowchart TB
    subgraph Simulación pura - sin DOM
        MUNDO["mundo.js<br/>bucle de paso fijo"] --> ARMAS["armas.js"]
        MUNDO --> COMBATE["combate.js"]
        MUNDO --> JEFES["jefes.js"]
        MUNDO --> OLEADAS["oleadas.js / rivales.js"]
        MUNDO --> TERRENO["terreno.js"]
        MUNDO --> ULTRAS["ultras.js / ulti.js"]
        MUNDO --> MEJORAS["mejoras.js"]
        CONFIG["config.js<br/>todo el equilibrio"]
    end
    subgraph Presentación
        JUEGO["juego.js<br/>pantallas y bucle"] --> RENDER["render.js<br/>render-mundo.js<br/>render-ultras.js"]
        RENDER --> SPRITES["sprites.js<br/>muñecos chibi 32×32"]
        JUEGO --> HUD["hud.js"]
        JUEGO --> AUDIO["audio.js + musica.js"]
        JUEGO --> UI2["club-ui.js, fin-ui.js, firma.js"]
        JUEGO --> ENTRADA["entrada.js"]
    end
    JUEGO --> MUNDO
    JUEGO --> API["api.js → /api/juego"]
    subgraph Servidor
        JS["juegoService.js"] --> CLUB["club.js"]
        JS --> CONFIG
        JS --> LOGROS["logros.js"]
    end
    API --> JS
```

- **Determinismo.** `mundo.js` avanza con un paso fijo de 1/60 s y un generador aleatorio con semilla. Si el navegador va lento, se hacen varios pasos por fotograma (con un tope); el resultado no depende de los FPS y las pruebas son reproducibles.
- **Eventos.** La simulación no toca el DOM ni el audio: deja eventos (`oleada`, `aviso`, `jefe-derrotado`, `ambiente`, `ultra`…) que `juego.js` traduce a sonido, avisos y anuncios para lectores de pantalla.
- **Estadísticas.** Cada fuente de daño (arma, ultra, ulti, quemaduras) se apunta en `mundo.stats` para la pantalla de fin.
- **Rendimiento.** Búsqueda de obstáculos por celdas con claves numéricas (unas 4,5 veces más rápida que la primera versión), una textura de suelo por celda y ambiente, pintada como mucho una por fotograma y por adelantado, y muñecos cacheados.
- **Dibujo.** Canvas 2D con cámara 3/4 (el suelo se aplasta en vertical y los muñecos están de pie). Los muñecos se pintan con código en una cuadrícula de 32×32 en estilo chibi (16×20 con piernas hasta la Fase 6): cabeza grande, cuerpo y zapatones, sin piernas. Se pintan por capas y píxel a píxel: zapatos, pantalón, torso, brazos y cabeza, cada una con su contorno de color y luz desde arriba a la izquierda. Cada persona tiene sus rasgos (18 peinados, 6 tipos de barba, mandíbula, complexión, estatura, gesto, gafas, cinta, guantes, brazalete…) y caminan con 4 fotogramas. Así se generan las equipaciones y las camisetas de 26 selecciones sin imágenes. El mapa (Fase 7) se pinta con píxeles de 2 unidades en `render-suelo.js` y `render-obstaculos.js`, con las paletas de cada ambiente en `render-paletas.js`, y los efectos de las habilidades en `render-habilidades.js` (partículas con tope y azar propio en `efectos.js`, para que encenderlas o apagarlas no cambie la partida).
- **Audio.** Todo sintetizado con Web Audio: ondas de pulso (12,5 %, 25 % y 50 %), triángulo y ruido. La música es un secuenciador propio que programa las notas por adelantado; la grada usa voces con formantes de vocales y palmas.

### Servidor del juego y anti-trampas

- Al **empezar**, el servidor guarda la partida en curso con su propio reloj.
- Al **terminar**, rechaza el resultado si la partida no es la que está en curso, si el tiempo supera lo transcurrido (con 15 s de margen) o 4 horas, o si los jefes, el nivel o las bajas no son creíbles para ese tiempo (`jefes ≤ 3 + t/50`, `nivel ≤ 8 + t/3`, `bajas ≤ 20·t + 50`).
- De los **logros** que manda el cliente, solo apunta los que puede comprobar con lo que sabe (tiempo, jefes, bajas, jugador y entrenador); los de plantilla los calcula él.
- Cada cambio del perfil usa **concurrencia optimista** (`UPDATE … WHERE version = $n`) con reintentos.
- El **ranking** guarda la mejor partida de cada usuario con su mote y avatar, nunca el correo.

## Registro de actividad y manejo de errores

### Logs

Una línea JSON por evento en la salida estándar (Cloud Logging en producción), con `time`, `level`, `event`, `msg` y datos, por ejemplo `{"time":"2026-10-12T10:00:00.000Z","level":"info","event":"auth.login","msg":"Inicio de sesión","userId":"..."}`. Cada petición lleva un identificador (`X-Request-Id`) que aparece en todas sus líneas. Eventos: `app.start`, `app.stop`, `app.storage`, `app.mail`, `admin.bootstrap`, `http.request`, `http.error`, `user.registered`, `auth.login`, `auth.logout`, `auth.login_failed`, `auth.forbidden`, `mail.confirmation_sent`, `mail.failed`, `mail.not_sent`, `user.confirmed`, `user.confirm_failed`, `auth.oauth_denied`, `auth.oauth_failed`, `user.role_changed`, `user.deleted` y `juego.identidad`. Los datos sensibles se sustituyen por `[oculto]`.

### Errores de principio a fin

```mermaid
flowchart LR
    S["Lógica: lanza un error tipado<br/>(ValidationError, ConflictError…)"] --> EH["errorHandler: código HTTP +<br/>{error: {code, message}}"]
    EH --> C["api.js: ApiError<br/>(estado, código, mensaje)"]
    C --> V["Vista: aviso, error en el formulario<br/>o estado de error con Reintentar"]
    X["Error inesperado"] --> EH2["errorHandler: 500 genérico<br/>+ log http.error con la traza"]
    EH2 --> C
    T["Sin respuesta en 15 s"] --> C2["api.js: ApiError TIMEOUT"]
    C2 --> V
    R["Redirección (confirmar, Google)"] --> AV["?aviso=… → aviso legible"]
```

- El usuario nunca ve JSON ni trazas: cada error se traduce a un mensaje en español.
- La interfaz tiene estados de **carga**, **vacío** y **error con reintento**, y una captura global de promesas rechazadas.
- Los formularios marcan el campo con el error y lo explican debajo; al fallar el servidor, el formulario muestra el error arriba sin perder lo escrito (salvo la contraseña).
