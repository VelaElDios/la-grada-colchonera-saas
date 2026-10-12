# Configuración de latexmk para la memoria: basta con ejecutar `latexmk` en esta carpeta.
$pdf_mode = 4;          # 4 = LuaLaTeX
$bibtex_use = 2;        # ejecuta biber cuando hace falta (y borra sus ficheros al limpiar)
$out_dir = 'build';     # ficheros auxiliares y PDF en build/ (ignorada por git)
@default_files = ('main.tex');
$lualatex = 'lualatex -interaction=nonstopmode -file-line-error -synctex=1 %O %S';

# \include{carpeta/fichero} escribe su .aux en build/carpeta/: hay que crear esas carpetas antes
use File::Path qw(make_path);
make_path("$out_dir/$_") for qw(preliminares capitulos anexos);
