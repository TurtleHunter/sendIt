FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src/ ./src/
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY templates/ ./templates/

ENV NODE_ENV=production PORT=3000
EXPOSE 3000
RUN addgroup -S sendit && adduser -S sendit -G sendit
USER sendit
CMD ["node", "dist/index.js"]