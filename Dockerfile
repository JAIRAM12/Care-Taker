FROM node:22-bookworm-slim

WORKDIR /app

# Prisma's MongoDB engine needs OpenSSL in the runtime image.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run db:generate
RUN npm run build

ENV NODE_ENV=production
ENV PORT=10000
EXPOSE 10000

CMD ["npm", "run", "start:prod"]
