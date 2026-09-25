# ---------------------------------------------------------------
# Cardápio Digital — Backend (API Express + Prisma + Socket.IO)
# Imagem de produção baseada em node:22-alpine.
# ---------------------------------------------------------------
FROM node:22-alpine

LABEL org.opencontainers.image.title="cardapio-digital-backend"
LABEL org.opencontainers.image.description="API da plataforma de pedidos para balneários"

WORKDIR /app

# O prisma generate resolve o datasource do schema, que referencia
# env("DATABASE_URL"). Nesta etapa ele apenas valida a URL (não conecta);
# o valor real é injetado em runtime pelo Compose/Observability.
ARG DATABASE_URL=postgresql://cardapio:cardapio_password@db:5432/cardapio_digital
ENV DATABASE_URL=$DATABASE_URL

# 1) Dependências primeiro (camada cacheável). Instalação completa, sem
#    --omit=dev: o CLI do Prisma (devDependency) é usado no CMD do runtime.
COPY package.json package-lock.json ./
RUN npm install

# 2) Código-fonte + schema/migrations do Prisma.
COPY . .

# 3) Gera o Prisma Client a partir do schema e compila o TypeScript.
RUN npx prisma generate
RUN npm run build

# Ambiente de execução (definido só agora para não afetar o npm install).
ENV NODE_ENV=production

EXPOSE 4000

# 4) Aplica migrations pendentes e, em seguida, inicia o servidor compilado.
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]