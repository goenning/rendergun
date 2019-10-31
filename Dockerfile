# Base Image with Puppeteer dependencies
FROM node:12-slim as base

# Installs latest Chromium dependencies
# Reference: https://github.com/GoogleChrome/puppeteer/blob/master/.ci/node8/Dockerfile.linux
RUN apt-get update && \
    apt-get -y install xvfb gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 \
      libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 \
      libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 \
      libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 \
      libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Add user so we don't need --no-sandbox.
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app

# Run everything after as non-privileged user.
USER pptruser

# Builder Image
FROM base AS builder

ADD package-lock.json /app
ADD package.json /app
ADD jest.config.js /app
ADD tslint.json /app
ADD adblock-hosts.txt /app
ADD tsconfig.json /app
ADD src /app/src

RUN npm ci
RUN npm test
RUN npm run lint
RUN npm run build

# Final Image
FROM base AS final

EXPOSE 3000
ENV NODE_ENV production

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/adblock-hosts.txt /app/adblock-hosts.txt
COPY --from=builder /app/package.json /app/package.json

HEALTHCHECK CMD curl --fail http://localhost:3000/-/health || exit 1

CMD ["npm", "start"]