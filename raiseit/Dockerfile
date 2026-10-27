# レイジット (RaiseIt) 日次ジョブ(Cloud Run Job)。ビルドコンテキストは raiseit/
FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY scripts ./scripts
ENV NODE_ENV=production
CMD ["node", "scripts/cloud/run-job.mjs"]
