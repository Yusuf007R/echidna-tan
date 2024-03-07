# Builder Stage
FROM node:20 as builder

WORKDIR /app

COPY package.json yarn.lock ./

RUN apt-get update \
    && apt-get install -y build-essential \
    && yarn --pure-lockfile 

COPY . .

RUN yarn prisma generate && yarn build

# Production Stage
FROM node:20 as production

WORKDIR /app

COPY --from=builder /app/package.json /app/yarn.lock ./

RUN apt-get update \
    && apt-get install -y build-essential \
    && yarn --pure-lockfile --production

# Runtime Stage
FROM node:20-slim as runtime

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=production /app/node_modules ./node_modules
COPY --from=production /app/package.json ./package.json
COPY assets ./assets 
COPY prisma ./prisma

CMD ["node", "dist/index.js"]