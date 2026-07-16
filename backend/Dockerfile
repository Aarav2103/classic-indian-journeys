# syntax=docker/dockerfile:1

# --- deps: production node_modules only ---
FROM node:20-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# --- runtime ---
FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
# tini = tiny init so SIGTERM reaches node -> clean shutdown / fast restarts
RUN apt-get update \
 && apt-get install -y --no-install-recommends tini \
 && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
USER node
EXPOSE 8000
# Node 20 has global fetch; probe our own /healthz (503 when the DB link is down)
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://localhost:8000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["tini", "--"]
CMD ["node", "cluster.js"]
