FROM node:20-alpine

WORKDIR /app

# 1. Copiar todo el monorepo (packages + server)
COPY package*.json ./
COPY packages ./packages
COPY apps/server ./apps/server

# 2. Instalar dependencias
RUN npm install

# 3. Compilar paquetes compartidos
RUN cd packages/pdf && npm run build || true
RUN cd packages/common && npm run build || true
RUN cd packages/ui && npm run build || true

# 4. Compilar el servidor
WORKDIR /app/apps/server
RUN npm run build

# 5. Ejecutar
CMD ["npm", "start"]
