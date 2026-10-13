# ---------------------------------------------------------------
# Cardápio Digital — Backend (API Express + Prisma + Socket.IO)
# Imagem de produção baseada em node:24-slim (Debian), alinhada ao engines.node
# do package.json. Optamos por Debian em vez de Alpine porque o motor do Prisma
# depende da detecção de libssl/OpenSSL, que é mais confiável no glibc/Debian.
# ---------------------------------------------------------------
FROM node:24-slim

LABEL org.opencontainers.image.title="cardapio-digital-backend"
LABEL org.opencontainers.image.description="API da plataforma de pedidos para balneários"

WORKDIR /app

# O pacote openssl é necessário para o Prisma detectar a versão de libssl em
# runtime (evita "failed to detect the libssl/openssl version" / "Could not
# parse schema engine response"). ca-certificates garante TLS ao Neon/Postgres.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

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

# 4) Inicia apenas a aplicação compilada.
#
# NÃO executamos `prisma migrate deploy` no start: o banco remoto (Neon) já
# está estruturado e populado, e o runner de migrations falha com P3005
# ("The database schema is not empty") ao não encontrar a tabela
# _prisma_migrations. Migrations passam a ser aplicadas de forma controlada e
# separada do boot (baseline/resolve ou pipeline dedicada).
#
# Exec form direto do Node (sem npm como PID 1) para propagar SIGINT/SIGTERM
# corretamente ao handler de shutdown em src/main.ts.
CMD ["node", "dist/main.js"]
