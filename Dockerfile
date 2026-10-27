
FROM node:24-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm ci

COPY server.js ./
COPY public ./public

EXPOSE 3000

CMD ["node", "server.js"]
