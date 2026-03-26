FROM node:20-alpine

RUN apk add --no-cache openssl libssl3 postgresql-client

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --include=dev

COPY . .

RUN npx prisma generate

RUN npm run build

COPY entrypoint-migrate.sh /entrypoint-migrate.sh
RUN chmod +x /entrypoint-migrate.sh

CMD ["sh", "start.sh"]