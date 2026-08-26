FROM node:24-alpine AS builder

RUN corepack enable
WORKDIR /workspace
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @skillspace/web build

FROM node:24-alpine AS runner

RUN apk add --no-cache git && corepack enable
WORKDIR /workspace
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3210 \
    SKILLSPACE_REGISTRY=/registry

COPY --from=builder /workspace /workspace
COPY --chmod=755 docker/entrypoint.sh /usr/local/bin/skillspace-entrypoint

EXPOSE 3210
HEALTHCHECK --interval=15s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3210/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
ENTRYPOINT ["skillspace-entrypoint"]
