FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY packages ./packages
COPY apps/web/package*.json ./apps/web/
# Instalar todo en el root y common
RUN npm install
COPY apps/web ./apps/web
WORKDIR /app/apps/web
RUN npm run build

FROM nginx:alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
