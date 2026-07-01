FROM node:26-alpine AS base
# node 26 no longer bundles corepack; install it, then let it honor the
# packageManager pin in package.json.
RUN npm install -g corepack@latest && corepack enable pnpm

# ---- deps ----
FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/core/package.json ./packages/core/
RUN pnpm install --frozen-lockfile

# ---- build ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules
COPY . .
# `pnpm build` builds @credit-generator/core, then the Next.js app.
RUN pnpm build

# ---- runtime ----
FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000
# Docker sets HOSTNAME to the container ID, and Next standalone binds to it —
# so 127.0.0.1 healthchecks can't reach the server. Bind all interfaces.
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
