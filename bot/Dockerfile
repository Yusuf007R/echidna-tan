# Builder Stage
FROM node:22 as builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN apt-get update \
    && apt-get install -y build-essential \
    && corepack enable pnpm \
    && pnpm install

COPY . .

RUN pnpm run build

# Production Stage
FROM node:22 as production

WORKDIR /app

COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./

RUN apt-get update \
    && apt-get install -y build-essential \
    && corepack enable pnpm \
    && pnpm install --production

# Runtime Stage
FROM node:22-slim as runtime

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=production /app/node_modules ./node_modules
COPY --from=production /app/package.json ./package.json
COPY assets ./assets 

CMD ["node", "dist/index.js"]