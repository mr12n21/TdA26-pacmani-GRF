FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat


FROM base AS deps

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install


FROM base AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build


FROM base AS runner

WORKDIR /app

COPY --from=builder /app/.output ./.output

ENV HOST=0.0.0.0
ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", ".output/server/index.mjs"]
