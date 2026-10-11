FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY --chown=node:node . .
RUN npm run build

ENV NODE_ENV=production \
    CLOUD_RUN_EPHEMERAL=1 \
    DATA_DIR=/tmp/devlog \
    PORT=8080

USER node
EXPOSE 8080

CMD ["npm", "start"]
