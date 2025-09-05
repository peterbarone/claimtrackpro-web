# ---- Base dependencies layer
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN   if [ -f pnpm-lock.yaml ]; then corepack enable && pnpm i --frozen-lockfile;   elif [ -f yarn.lock ]; then corepack enable && yarn install --frozen-lockfile;   elif [ -f package-lock.json ]; then npm ci;   else npm i; fi

# ---- Builder
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- Runtime (small, secure)
FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001  && apk add --no-cache wget
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Minimal runtime artifacts
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/package.json ./package.json

USER 1001
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

# Healthcheck hits our /health route
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3   CMD wget -qO- http://127.0.0.1:3000/health || exit 1

CMD ["node", "server.js"]
