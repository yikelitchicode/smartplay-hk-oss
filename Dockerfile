# Multi-stage Dockerfile for TanStack Start application
# Automatically builds for the current machine's architecture
#
# Supported architectures: linux/amd64, linux/arm64
# Build platform is auto-detected from your machine

# Build arguments for platform detection
ARG BUILDPLATFORM=${BUILDPLATFORM:-linux/amd64}
ARG TARGETPLATFORM=${TARGETPLATFORM:-linux/amd64}
ARG TARGETARCH

# Stage 1: Base image with pnpm
FROM --platform=$BUILDPLATFORM node:24-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Stage 2: Dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Stage 3: Build the application
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN pnpm db:generate || pnpm prisma generate

# Build the application
RUN pnpm build

# Stage 4: Production image
FROM --platform=$BUILDPLATFORM node:24-alpine AS production
WORKDIR /app

# Install pnpm for production
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy necessary files
COPY package.json pnpm-lock.yaml ./
COPY --from=build /app/.output ./.output
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src/generated ./src/generated

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Install tsx for running TypeScript scripts
RUN npm install -g tsx

# Copy startup script
COPY docker-entrypoint.sh /app/start.sh
RUN chmod +x /app/start.sh

# Install Prisma CLI for potential migrations
RUN npx prisma migrate deploy || true

# Set environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Expose port
EXPOSE 3000

# Run the application with startup script
CMD ["/app/start.sh"]
