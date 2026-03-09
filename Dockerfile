# Multi-stage build for production
FROM node:22-alpine AS builder

WORKDIR /app

# Install deps
COPY package.json package-lock.json* ./
RUN npm ci

# Build frontend
COPY . .
RUN npm run build

# Production image
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built frontend and server
COPY --from=builder /app/dist ./dist
COPY server ./server

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "server/syncProxy.js"]
