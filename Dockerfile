# syntax=docker.io/docker/dockerfile:1

# ============================================================
# Fumadocs Documentation Engine
# 
# Usage: Mount your docs directory to /app/content/docs
#   docker run -v $(pwd)/docs:/app/content/docs -p 3000:3000 fumadocs-engine
# ============================================================

FROM node:22-alpine AS base

# ============================================================
# Dependencies stage
# ============================================================
FROM base AS deps

RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files and Fumadocs config
COPY package.json pnpm-lock.yaml* ./
COPY source.config.ts next.config.mjs ./

# Install dependencies
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# ============================================================
# Development stage - for live preview with hot reload
# ============================================================
FROM base AS dev

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Remove the docs content - it will be mounted at runtime
RUN rm -rf /app/content/docs/*

# Copy and setup entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Enable pnpm
RUN corepack enable pnpm

# Expose port
EXPOSE 3000

# Use entrypoint to regenerate MDX index after volume mount
ENTRYPOINT ["/docker-entrypoint.sh"]

# ============================================================
# Builder stage - for production build
# ============================================================
FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable pnpm && pnpm run build

# ============================================================
# Production runner stage
# ============================================================
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
