# Base Image with Puppeteer dependencies
FROM node:10.14-alpine as base

# Installs latest Chromium (68) package.
RUN apk update && apk upgrade && \
    echo @edge http://nl.alpinelinux.org/alpine/edge/community >> /etc/apk/repositories && \
    echo @edge http://nl.alpinelinux.org/alpine/edge/main >> /etc/apk/repositories && \
    apk add --no-cache \
      chromium@edge \
      nss@edge

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV CHROMIUM_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Add user so we don't need --no-sandbox.
RUN addgroup -S pptruser && adduser -S -g pptruser pptruser \
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
ADD tsconfig.json /app
ADD src /app/src

RUN npm install
RUN npm test
RUN npm run build

# Final Image
FROM base AS final

EXPOSE 3000
ENV NODE_ENV production

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json

CMD ["npm", "start"]