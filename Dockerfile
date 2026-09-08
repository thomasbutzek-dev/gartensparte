# ---- Abhängigkeiten ----
FROM node:24-bookworm-slim AS deps
WORKDIR /app
# better-sqlite3 braucht einen nativen Build (Python + g++)
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# ---- Build ----
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Laufzeit ----
FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    DATA_DIR=/app/data \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Standalone-Server + statische Dateien
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=deps /app/node_modules/pdfjs-dist/build/pdf.worker.min.mjs ./public/pdf.worker.min.mjs
# sharp liegt außerhalb des Next-Bundles (native Binaries)
COPY --from=deps /app/node_modules/sharp ./node_modules/sharp
COPY --from=deps /app/node_modules/@img ./node_modules/@img
# Migrationen werden beim Start angewendet
COPY --from=build /app/src/db/migrations ./src/db/migrations

# Datenverzeichnis (SQLite, Uploads, PDFs) – als Volume mounten!
VOLUME /app/data
EXPOSE 3000

CMD ["node", "server.js"]
