# Builder Stage
FROM node:23 AS builder

WORKDIR /app

RUN apt-get update \
    && apt-get install -y build-essential

COPY package.json pnpm-lock.yaml ./

RUN corepack enable pnpm && pnpm install 

COPY . .

RUN pnpm run build:prod

# Runtime Stage
FROM node:23 AS runtime

WORKDIR /app



COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY assets ./assets 

CMD ["node", "--enable-source-maps", "dist/index.js"]