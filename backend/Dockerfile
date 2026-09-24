FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN if [ -f ./prisma/schema.prisma ]; then npx prisma generate; fi
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev && npm install prisma ts-node

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

CMD ["sh", "-c", "if [ -f ./prisma/schema.prisma ]; then npx prisma db push --skip-generate || true; npx ts-node prisma/seed.ts || true; fi && node dist/src/main.js"]
