# Multi-stage build for NestJS backend
FROM node:18-alpine AS builder

# Install build dependencies (Python, make, g++ for bcrypt and other native modules)
RUN apk add --no-cache python3 py3-setuptools make g++ openssl-dev

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY shared ./shared
COPY backend/package.json ./backend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy backend source
COPY backend ./backend

# Generate Prisma client
WORKDIR /app/backend
RUN pnpm db:generate

# Build backend
RUN pnpm build

# Production stage
FROM node:18-alpine

# Install runtime dependencies (openssl for Prisma, build tools for bcrypt)
RUN apk add --no-cache openssl python3 py3-setuptools make g++

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY shared ./shared
COPY backend/package.json ./backend/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma

WORKDIR /app/backend

# Generate Prisma client in production (this will create node_modules/.prisma)
RUN pnpm db:generate

EXPOSE 80

# Run migrations and start server
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/main.js"]
