FROM node:20

WORKDIR /app

COPY package.json yarn.lock ./

RUN apt-get update && apt-get install build-essential -y && 

RUN yarn --pure-lockfile

FROM 