#!/usr/bin/env bash
# Guarda en Secret Manager los secretos del Hito 4: correo (SMTP) e inicio de sesión con Google.
#
# Se ejecuta en Cloud Shell (https://shell.cloud.google.com) DESPUÉS de preparar-cloud-run.sh
# y ANTES de fusionar la rama que despliega con estos secretos:
#
#   PROJECT_ID=tu-proyecto bash configurar-hito4.sh
#
# Los valores se piden por teclado (no se muestran) y nunca llegan al repositorio.
# Se puede repetir: si un secreto ya existe, se añade una versión nueva solo si escribes un valor.
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?Indica el proyecto: PROJECT_ID=la-grada-colchonera-XXXXX}"
RUNTIME_SA="grada-runtime@${PROJECT_ID}.iam.gserviceaccount.com"
gcloud config set project "$PROJECT_ID" >/dev/null

guardar() {
  local nombre="$1" texto="$2" valor
  read -r -s -p "    ${texto}: " valor; echo
  if [ -z "$valor" ]; then
    if gcloud secrets describe "$nombre" >/dev/null 2>&1; then echo "    $nombre: sin cambios"; return 0; fi
    echo "    ERROR: $nombre es obligatorio la primera vez (el despliegue lo necesita)"; exit 1
  fi
  if gcloud secrets describe "$nombre" >/dev/null 2>&1; then
    printf '%s' "$valor" | gcloud secrets versions add "$nombre" --data-file=- >/dev/null
    echo "    $nombre: nueva versión guardada"
  else
    printf '%s' "$valor" | gcloud secrets create "$nombre" --data-file=- --replication-policy=automatic >/dev/null
    echo "    $nombre: creado"
  fi
  gcloud secrets add-iam-policy-binding "$nombre" \
    --member="serviceAccount:${RUNTIME_SA}" --role=roles/secretmanager.secretAccessor >/dev/null
}

echo "==> Correo saliente (SMTP)"
echo "    SMTP_URL con Gmail:  smtps://tucorreo%40gmail.com:CONTRASEÑA_DE_APLICACIÓN@smtp.gmail.com:465"
echo "    (la @ del usuario se escribe %40; la contraseña de aplicación, sin espacios)"
guardar smtp-url "SMTP_URL"
guardar mail-from "MAIL_FROM (p. ej.: La Grada Colchonera <tucorreo@gmail.com>)"

echo "==> Inicio de sesión con Google (OAuth)"
guardar google-client-id "GOOGLE_CLIENT_ID"
guardar google-client-secret "GOOGLE_CLIENT_SECRET"

echo "==> Listo. Ya puedes fusionar la PR del despliegue con los secretos del Hito 4."
