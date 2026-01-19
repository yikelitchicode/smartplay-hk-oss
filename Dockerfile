# Multi-stage Dockerfile for TanStack Start application
# Optimized for build caching and smaller image size

# Stage 1: Base image with pnpm
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat wget && \
    corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Stage 2: Dependencies (cached layer - only rebuilds when lockfile changes)
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Stage 3: Build the application
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Generate Prisma client
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" pnpm prisma generate

# Build the application
RUN pnpm build

# Stage 4: Production image (minimal)
FROM node:24-alpine AS production
WORKDIR /app

# Install runtime dependencies in single layer
RUN apk add --no-cache wget netcat-openbsd && \
    corepack enable && corepack prepare pnpm@latest --activate && \
    npm install -g tsx

# Copy package files first
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built application and required files
COPY --from=build /app/.output ./.output
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/src/db.ts ./src/db.ts
COPY --from=build /app/src/lib ./src/lib
COPY --from=build /app/scripts ./scripts

# Copy startup script
COPY docker-entrypoint.sh /app/start.sh
RUN chmod +x /app/start.sh

# Set environment
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

EXPOSE 3000

CMD ["/app/start.sh"]
