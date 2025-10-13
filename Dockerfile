FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . .

RUN npx prisma generate

RUN yarn build

FROM node:22-alpine AS production

WORKDIR /app

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

COPY package*.json yarn.lock ./

RUN yarn install --frozen-lockfile --production && yarn cache clean

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/lib/validation-message-transform.ts ./dist/lib/

EXPOSE 3000

CMD ["node", "dist/main"]
