# Multi-stage Dockerfile for TanStack Start application
# Target platform: linux/amd64 for production


# Stage 1: Base image with pnpm
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat wget
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
FROM node:24-alpine AS production
WORKDIR /app

# Install pnpm for production
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install wget for healthcheck
RUN apk add --no-cache wget netcat-openbsd

# Copy necessary files
COPY package.json pnpm-lock.yaml ./
COPY --from=build /app/.output ./.output
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/src/lib ./src/lib

# Install production dependencies only (include tsx for scheduler)
RUN pnpm install --prod --frozen-lockfile
RUN npm install -g tsx

# Copy startup script
COPY docker-entrypoint.sh /app/start.sh
RUN chmod +x /app/start.sh

# Set environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Expose port
EXPOSE 3000

# Run the application with startup script
CMD ["/app/start.sh"]
