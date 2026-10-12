# Imagen de La Grada Colchonera para Google Cloud Run (o cualquier plataforma de contenedores).
# Solo lleva lo necesario para ejecutar: dependencias de producción, src/ y public/.
FROM node:22-alpine

ENV NODE_ENV=production \
    PORT=8080

WORKDIR /app

# Primero las dependencias: si package*.json no cambia, Docker reutiliza esta capa
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY public ./public

# No se ejecuta como root
USER node

EXPOSE 8080
CMD ["node", "src/server.js"]
