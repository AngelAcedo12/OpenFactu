FROM node:20-alpine

WORKDIR /app

# 1. Copiar manifiestos y server
COPY package*.json ./
COPY apps/server ./apps/server

# 2. Instalar dependencias (incluye @openfactu/* desde npm)
RUN npm install

# 3. Compilar el servidor
WORKDIR /app/apps/server
RUN npm run build

# 4. Ejecutar
CMD ["npm", "start"]
