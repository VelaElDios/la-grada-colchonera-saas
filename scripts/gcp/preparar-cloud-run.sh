#!/usr/bin/env bash
# Prepara Google Cloud para desplegar La Grada Colchonera en Cloud Run desde GitHub Actions.
#
# Se ejecuta UNA sola vez en Cloud Shell (https://shell.cloud.google.com):
#
#   BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX bash preparar-cloud-run.sh
#
# Qué hace (se puede repetir sin problema: lo que ya existe no se toca):
#   1. Crea el proyecto y lo enlaza con la cuenta de facturación (créditos de educación).
#   2. Activa las APIs necesarias y crea un repositorio de imágenes en Artifact Registry.
#   3. Guarda los secretos en Secret Manager. Se piden por teclado, no se muestran y
#      nunca llegan al repositorio. SESSION_SECRET se genera aleatoriamente.
#   4. Crea dos cuentas de servicio:
#        - grada-runtime: con la que se ejecuta la app (solo puede leer sus secretos).
#        - grada-deploy: la que usa GitHub Actions para desplegar.
#   5. Configura Workload Identity Federation: GitHub Actions se identifica ante Google
#      con un token temporal, así que no hace falta guardar ninguna clave en GitHub.
#   6. Muestra los valores (no secretos) que hay que poner como variables del repositorio.
set -euo pipefail

REPO="${REPO:-VelaElDios/la-grada-colchonera-saas}"
REGION="${REGION:-europe-southwest1}"   # Madrid
BILLING_ACCOUNT="${BILLING_ACCOUNT:?Indica la cuenta de facturación: BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX}"
PROJECT_ID="${PROJECT_ID:-la-grada-colchonera-$((RANDOM % 90000 + 10000))}"

existe() { "$@" >/dev/null 2>&1; }

echo "==> Proyecto: $PROJECT_ID (región $REGION)"
existe gcloud projects describe "$PROJECT_ID" || gcloud projects create "$PROJECT_ID" --name="La Grada Colchonera"
gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT" >/dev/null
gcloud config set project "$PROJECT_ID" >/dev/null
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"

echo "==> Activando APIs (puede tardar un par de minutos)"
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  cloudresourcemanager.googleapis.com

echo "==> Repositorio de imágenes (Artifact Registry)"
existe gcloud artifacts repositories describe grada --location="$REGION" || \
  gcloud artifacts repositories create grada --repository-format=docker --location="$REGION" \
    --description="Imágenes de La Grada Colchonera"

echo "==> Cuentas de servicio"
RUNTIME_SA="grada-runtime@${PROJECT_ID}.iam.gserviceaccount.com"
DEPLOY_SA="grada-deploy@${PROJECT_ID}.iam.gserviceaccount.com"
existe gcloud iam service-accounts describe "$RUNTIME_SA" || \
  gcloud iam service-accounts create grada-runtime --display-name="La Grada Colchonera (ejecución)"
existe gcloud iam service-accounts describe "$DEPLOY_SA" || \
  gcloud iam service-accounts create grada-deploy --display-name="La Grada Colchonera (despliegue desde GitHub)"
sleep 5 # las cuentas recién creadas tardan unos segundos en estar disponibles

echo "==> Secretos (Secret Manager)"
crear_secreto() {
  local nombre="$1" texto="$2" valor
  if existe gcloud secrets describe "$nombre"; then
    echo "    $nombre ya existe: no se cambia"
  else
    if [ "$nombre" = "session-secret" ]; then
      valor="$(openssl rand -hex 32)"
    else
      read -r -s -p "    $texto: " valor; echo
    fi
    printf '%s' "$valor" | gcloud secrets create "$nombre" --data-file=- --replication-policy=automatic >/dev/null
    echo "    $nombre creado"
  fi
  gcloud secrets add-iam-policy-binding "$nombre" \
    --member="serviceAccount:${RUNTIME_SA}" --role=roles/secretmanager.secretAccessor >/dev/null
}
crear_secreto database-url   "DATABASE_URL (cadena de conexión de Neon)"
crear_secreto admin-email    "ADMIN_EMAIL (email del primer administrador)"
crear_secreto admin-password "ADMIN_PASSWORD (mínimo 8 caracteres)"
crear_secreto session-secret ""

echo "==> Permisos de la cuenta de despliegue"
for rol in roles/run.admin roles/artifactregistry.writer; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${DEPLOY_SA}" --role="$rol" --condition=None >/dev/null
done
# Puede desplegar servicios que se ejecutan como grada-runtime
gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" \
  --member="serviceAccount:${DEPLOY_SA}" --role=roles/iam.serviceAccountUser >/dev/null

echo "==> Workload Identity Federation para GitHub Actions"
existe gcloud iam workload-identity-pools describe github --location=global || \
  gcloud iam workload-identity-pools create github --location=global --display-name="GitHub Actions"
existe gcloud iam workload-identity-pools providers describe la-grada --location=global --workload-identity-pool=github || \
  gcloud iam workload-identity-pools providers create-oidc la-grada \
    --location=global --workload-identity-pool=github --display-name="Repositorio la-grada" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition="assertion.repository == '${REPO}'"
# Solo los workflows de este repositorio pueden actuar como grada-deploy
gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_SA" \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/attribute.repository/${REPO}" >/dev/null

cat <<RESUMEN

==========================================================================
 Listo. Añade estas VARIABLES (no son secretos) en GitHub:
 ${REPO} > Settings > Secrets and variables > Actions > Variables

   GCP_PROJECT_ID   = ${PROJECT_ID}
   GCP_REGION       = ${REGION}
   GCP_WIF_PROVIDER = projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/providers/la-grada
   GCP_DEPLOY_SA    = ${DEPLOY_SA}
==========================================================================
RESUMEN
