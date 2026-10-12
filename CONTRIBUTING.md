# Guía de trabajo

Este repositorio sigue **GitHub Flow**, organizado según los hitos y las tareas del backlog en DoneTonic (proyecto *Colchoneros*).

## Ramas

```
main                                  ← versión estable; se despliega automáticamente
 └── hito-1/integracion               ← rama del Hito 1
      ├── hito-1/T1-estructura-base   ← una rama por tarea de DoneTonic
      ├── hito-1/T2-github-flow
      └── ...
 └── hito-2/integracion
      └── ...
```

| Rama | Se crea desde | Se integra en | Cómo |
|---|---|---|---|
| `hito-N/integracion` | `main` | `main` | PR al cerrar el hito, con el CI en verde |
| `hito-N/Tx-descripcion` | `hito-N/integracion` | `hito-N/integracion` | PR al terminar la tarea, con el CI en verde |

- Nunca se trabaja directamente sobre `main` ni sobre las ramas `hito-N/integracion`.
- `Tx` es el identificador de la tarea en DoneTonic (por ejemplo `T5`). El PR indica también su PBI (`Px`).

## Antes de abrir un pull request

```bash
npm test
```

Las pruebas tienen que pasar en local. El CI las vuelve a ejecutar en cada PR y no se integra ningún PR con el CI en rojo.

## Commits

Mensajes en español, en imperativo y con el identificador de la tarea:

```
[T5] Añade el repositorio de usuarios en memoria
```

## Cierre de un hito

1. Todas las tareas del hito están integradas en `hito-N/integracion` y el CI está en verde.
2. PR de `hito-N/integracion` a `main`.
3. Tras el merge, se etiqueta el commit de `main` como `hito-N` y se comprueba que el despliegue funciona.
4. En DoneTonic, las tareas y PBIs del hito pasan a *Hecho*.
