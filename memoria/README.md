# Memoria del proyecto

La memoria de **La Grada Colchonera** está planteada como un TFG. Se escribe en LaTeX y se compila con **LuaLaTeX**, que trabaja en UTF-8 y con fuentes OpenType (`fontspec`). La bibliografía usa `biblatex` con `biber`.

> **Estado:** la estructura está preparada (portada, resumen, capítulos, anexos y bibliografía). El texto se escribirá más adelante; cada sección lleva un comentario con lo que debe contar.

## Estructura

```
memoria/
  main.tex              Documento principal: paquetes, datos del trabajo y orden de los capítulos
  .latexmkrc            Configuración de latexmk (LuaLaTeX + biber, salida en build/)
  bibliografia.bib      Referencias (biblatex, estilo IEEE)
  preliminares/
    portada.tex         Portada
    resumen.tex         Resumen, abstract y palabras clave
  capitulos/
    01-introduccion.tex      Contexto, objetivos y alcance
    02-gestion.tex           Scrum, backlog en DoneTonic, seguimiento y GitHub Flow
    03-arquitectura.tex      Cliente-servidor, capas, modelo de datos y tecnologías
    04-implementacion.tex    Usuarios, sesión, persistencia, roles, seguridad e interfaz
    05-pruebas.tex           Estrategia de pruebas, errores y registro de actividad
    06-cicd.tex              Integración y despliegue continuos
    07-conclusiones.tex      Conclusiones y trabajo futuro
  anexos/
    A-manual-usuario.tex     Manual de usuario
    B-trazabilidad.tex       Requisito → PBI → tarea → PR → evidencia
  figuras/              Figuras propias (diagramas, capturas de DoneTonic...)
```

Las capturas de la aplicación **no se copian**: `\graphicspath` también busca en `../docs/capturas/app/`, así que basta con `\includegraphics{06-panel-admin}`.

Los datos del trabajo (título, autor, URL del repositorio y de la aplicación) están en `main.tex`, en los `\newcommand` del principio.

## Compilar

Hace falta una distribución de TeX con LuaLaTeX, `biber` y `latexmk`: [TeX Live](https://tug.org/texlive/) o [MiKTeX](https://miktex.org/) en Windows.

```bash
cd memoria
latexmk            # genera build/main.pdf (LuaLaTeX + biber, las pasadas que hagan falta)
latexmk -pvc       # recompila sola cada vez que se guarda un fichero
latexmk -c         # borra los ficheros auxiliares
```

Sin `latexmk`, a mano:

```bash
lualatex main && biber main && lualatex main && lualatex main
```

(Así los ficheros auxiliares quedan junto a `main.tex` en lugar de en `build/`, pero están en `.gitignore`.)

### En VS Code

Con la extensión **LaTeX Workshop**, abrir `memoria/main.tex` y usar la receta *latexmk* (`Ctrl+Alt+B`). Como hay un `.latexmkrc`, compila con LuaLaTeX y deja el PDF en `build/`.

### En Overleaf

Subir la carpeta `memoria/` y elegir *Menu → Compiler → LuaLaTeX*. Overleaf no tiene la carpeta `docs/`: hay que subir también las capturas que se usen, a `figuras/`.

## PDF en GitHub

El workflow [`memoria.yml`](../.github/workflows/memoria.yml) compila la memoria con LuaLaTeX cada vez que cambia algo en `memoria/`. El PDF se descarga desde la ejecución correspondiente, en *Artifacts → memoria-pdf*. El PDF no se sube al repositorio: `build/` está en `.gitignore`.
