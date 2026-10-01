# Etapa 1: Compilar Frontend (React Vite)
FROM node:20-alpine AS builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Etapa 2: Levantar Backend (Node.js) + Servir Frontend
FROM node:20-alpine
WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=4000

COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ ./
COPY --from=builder /app/frontend/dist /app/backend/public

# Directorio para la base de datos persistente
RUN mkdir -p /app/data
ENV DB_DIR=/app/data

EXPOSE 4000
CMD ["node", "server.js"]
