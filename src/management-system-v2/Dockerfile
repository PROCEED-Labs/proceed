FROM node:20-alpine AS base

# 1. Step skipped because we are in a monorepo and use local packages that would be missing in a local install.
# Also removed COPY --from=builder for all steps below.

# Step 1. Rebuild the source code only when needed
# FROM base AS builder

# WORKDIR /app

# # Install dependencies
# COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
# RUN yarn --frozen-lockfile

# COPY app ./app
# COPY components ./components
# COPY lib ./lib
# COPY public ./public
# COPY scripts ./scripts
# COPY types ./types
# COPY next.config.js .
# COPY tsconfig.json .
# COPY tsconfig.node.json .
# COPY .eslintrc.json .

# # Next.js collects completely anonymous telemetry data about general usage. Learn more here: https://nextjs.org/telemetry
# # Uncomment the following line to disable telemetry at build time
# ENV NEXT_TELEMETRY_DISABLED 1

# # Build Next.js
# RUN yarn build

# Note: It is not necessary to add an intermediate step that does a full copy of `node_modules` here

# Step 2. Production image, copy all the files and run next
FROM base AS runner

WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --chown=nextjs:nodejs .next/standalone/src/management-system-v2 ./
COPY --chown=nextjs:nodejs .next/standalone/node_modules ./node_modules
COPY --chown=nextjs:nodejs .next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]
