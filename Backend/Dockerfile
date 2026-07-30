# syntax=docker/dockerfile:1
#
# WatchTower backend — serves the API *and* the built SPA from public/dist.
#
# BUILD CONTEXT IS THE REPOSITORY ROOT, not ./Backend:
#     docker build -f Backend/Dockerfile -t watchtower-backend .
# The image builds the frontend itself, so it is self-contained. Previously the
# SPA had to be built on the host first and the image silently shipped whatever
# happened to be lying in public/dist — or nothing at all.

# ---------------------------------------------------------------------------
# Stage 1 — build the SPA
# ---------------------------------------------------------------------------
FROM node:26-bookworm-slim AS frontend-builder

WORKDIR /build

# Dependencies first so the (slow) install layer is cached independently of
# source changes.
COPY Frontend/package.json Frontend/package-lock.json ./Frontend/
RUN npm ci --prefix Frontend

COPY Frontend ./Frontend
# vite.config.js emits to ../Backend/public/dist, so that path must exist.
RUN mkdir -p Backend/public && npm --prefix Frontend run build

# ---------------------------------------------------------------------------
# Stage 2 — production dependencies only
# ---------------------------------------------------------------------------
FROM node:26-bookworm-slim AS deps

WORKDIR /app
COPY Backend/package.json Backend/package-lock.json ./
# `npm ci --omit=dev` against the lockfile: reproducible, and devDependencies
# (jest, supertest, mongodb-memory-server — which downloads a mongod binary)
# never enter the runtime image.
RUN npm ci --omit=dev && npm cache clean --force

# ---------------------------------------------------------------------------
# Stage 3 — runtime
# ---------------------------------------------------------------------------
FROM node:26-alpine AS runtime

# dumb-init as PID 1. The previous image ran `npm start`, which means npm was
# PID 1 and did NOT forward SIGTERM to node — so the graceful shutdown added in
# Phase 2 (drain in-flight checks, release the scheduler lease) never ran in a
# container. Every deploy left monitoring paused until the lease expired.
# dumb-init also reaps zombies, which PID 1 is responsible for.
#
# `apk upgrade` pulls security fixes published for the base image's OS packages
# since the tag was built. Without it the image ships whatever libssl/libcrypto
# was current when node:20-alpine was last pushed, and Trivy flags it.
RUN apk upgrade --no-cache \
 && apk add --no-cache dumb-init \
 # Remove npm and corepack from the RUNTIME image.
 #
 # The container's command is `node server.js` — it never invokes a package
 # manager. But npm ships its own vendored dependency tree (tar, minimatch,
 # glob, cross-spawn, sigstore …), and those account for the large majority of
 # CVEs reported against a plain Node base image. Deleting a tool we do not use
 # removes that entire attack surface rather than suppressing the findings, and
 # takes ~30 MB with it.
 #
 # Dependencies are installed in the `deps` stage and copied in, so nothing in
 # the build needs npm to be present here.
 && rm -rf /usr/local/lib/node_modules/npm \
           /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm \
           /usr/local/bin/npx \
           /usr/local/bin/corepack \
           /opt/yarn-* \
           /usr/local/bin/yarn \
           /usr/local/bin/yarnpkg

ENV NODE_ENV=production \
    PORT=8000 \
    # Node does not know about the container's memory limit by default.
    NODE_OPTIONS=--max-old-space-size=384

WORKDIR /app

# Copy as the unprivileged user so no chown layer is needed afterwards.
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node Backend/package.json ./package.json
COPY --chown=node:node Backend/server.js ./server.js
COPY --chown=node:node Backend/src ./src
COPY --from=frontend-builder --chown=node:node /build/Backend/public/dist ./public/dist

# Drop privileges. The `node` user (uid 1000) ships with the base image.
# Running as root means a container escape starts with root on the host kernel.
USER node

EXPOSE 8000

# Uses the app's own health route, so the check exercises the real stack.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
# `node server.js` rather than `npm start`: one less process between the init
# system and the signal handlers that need to receive SIGTERM.
CMD ["node", "server.js"]
