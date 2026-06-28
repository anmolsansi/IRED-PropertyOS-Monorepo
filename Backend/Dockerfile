# ─── Stage 1: Install production dependencies ──────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY Backend/package.json ./Backend/package.json

RUN npm ci --legacy-peer-deps --omit=dev --workspace=ired-propertyos-backend && npm cache clean --force
RUN ./node_modules/.bin/prisma --version


# ─── Stage 2: Generate Prisma client ───────────────────────────
FROM node:20-alpine AS prisma
WORKDIR /app

COPY package.json package-lock.json ./
COPY Backend/package.json ./Backend/package.json

RUN npm ci --legacy-peer-deps --workspace=ired-propertyos-backend && npm cache clean --force

COPY Backend/prisma ./prisma
RUN ./node_modules/.bin/prisma generate


# ─── Stage 3: Build application ────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY Backend/package.json ./Backend/package.json

RUN npm ci --legacy-peer-deps --workspace=ired-propertyos-backend && npm cache clean --force

COPY --from=prisma /app/node_modules/.prisma ./node_modules/.prisma
COPY Backend/tsconfig.json Backend/tsconfig.build.json ./
COPY Backend/src ./src

RUN ./node_modules/.bin/nest build


# ─── Stage 4: Production image ─────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

RUN addgroup -g 1001 -S propertyos && \
    adduser -S propertyos -u 1001

COPY --from=deps /app/node_modules ./node_modules
COPY --from=prisma /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist

COPY Backend/prisma ./prisma
COPY Backend/scripts/deploy-migrations.js ./scripts/deploy-migrations.js

ENV NODE_ENV=production
ENV APP_PORT=10000
ENV PORT=10000

USER propertyos

EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-10000}/api/v1/health || exit 1

CMD ["sh", "-c", "node scripts/deploy-migrations.js && node dist/main.js"]