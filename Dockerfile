FROM oven/bun:1 AS base
WORKDIR /usr/src/app

FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile --ignore-scripts

FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

ENV NODE_ENV=production
RUN bun run test:ci
RUN bun run build

FROM base AS release
COPY --from=prerelease /usr/src/app/dist ./dist
COPY --from=prerelease /usr/src/app/package.json ./package.json

ENV NODE_ENV=production
USER bun
STOPSIGNAL SIGTERM
ENTRYPOINT [ "bun", "run", "dist/index.js" ]