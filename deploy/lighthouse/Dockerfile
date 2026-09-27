FROM node:22-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV CHROME_PATH=/usr/bin/chromium

RUN apt-get update \
 && apt-get install -y --no-install-recommends chromium ca-certificates fonts-liberation \
 && rm -rf /var/lib/apt/lists/* \
 && npm install -g lighthouse@13.5.0

WORKDIR /app
COPY worker.mjs /app/worker.mjs

CMD ["node","/app/worker.mjs"]
