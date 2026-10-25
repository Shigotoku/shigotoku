# RaiseIt app (Cloud Run service). Build context is raiseit/
FROM node:22-bookworm-slim AS web
WORKDIR /web
COPY app/package.json app/package-lock.json* ./
RUN npm install
COPY app ./
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY scripts ./scripts
COPY server ./server
COPY --from=web /web/dist ./app/dist
ENV NODE_ENV=production
CMD ["node", "server/index.mjs"]
