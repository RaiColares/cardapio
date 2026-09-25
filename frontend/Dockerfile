# ---------------------------------------------------------------
# Cardápio Digital — Frontend (SPA React)
# Dockerfile multi-stage:
#   Estágio 1 — build: node:22-alpine compila a SPA (Vite).
#   Estágio 2 — runtime: nginx:alpine entrega o dist estático.
# ---------------------------------------------------------------

# ---------- Estágio 1: build ----------
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# A URL consumida pelo Axios é embutida no bundle em build-time (variável
# VITE_ do Vite). O Compose injeta o valor real via build-arg.
ARG VITE_API_BASE_URL=http://localhost:4000/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ---------- Estágio 2: servidor estático ----------
FROM nginx:alpine

LABEL org.opencontainers.image.title="cardapio-digital-frontend"
LABEL org.opencontainers.image.description="Interface da plataforma de pedidos para balneários"

# Build da SPA (HTML/CSS/JS) + configuração do nginx com fallback SPA.
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]