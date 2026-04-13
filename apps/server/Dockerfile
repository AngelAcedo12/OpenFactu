FROM node:20-alpine

WORKDIR /app

# 1. Copiar archivos de configuración del monorepo y del server
COPY package*.json ./
COPY packages ./packages
COPY apps/server/package*.json ./apps/server/

# 2. Instalar dependencias
RUN npm install

# 3. Copiar el resto del código fuente del server
# (Incluye src/db/schema.ts y drizzle.config.ts)
COPY apps/server ./apps/server

# 4. Compilar el código
WORKDIR /app/apps/server
RUN npm run build

# 5. Ejecutar
CMD ["npm", "start"]