# Builder Stage
FROM node:20 as builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN apt-get update \
    && apt-get install -y build-essential \
    && npm ci

COPY . .

RUN npx prisma generate && npm run build

# Production Stage
FROM node:20 as production

WORKDIR /app

COPY --from=builder /app/package.json /app/package-lock.json ./

RUN apt-get update \
    && apt-get install -y build-essential \
    && npm ci --production

# Runtime Stage
FROM node:20-slim as runtime

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=production /app/node_modules ./node_modules
COPY --from=production /app/package.json ./package.json
COPY assets ./assets 
COPY prisma ./prisma

CMD ["node", "dist/index.js"]