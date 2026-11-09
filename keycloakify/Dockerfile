# FloodNet Keycloak theme v2 (Keycloakify): login, account, admin and email in
# one provider jar. The classic FreeMarker theme (v1) is built by ../Dockerfile.
#
# Keycloak loads it from /opt/keycloak/providers (not /opt/keycloak/themes);
# copy the jar there the same way the v1 image's themes are copied today.

# Keycloakify shells out to Maven to package the jar, so build on a Maven/JDK
# image and bring Node in from the official Node image.
FROM node:22-bookworm-slim AS node
FROM maven:3.9-eclipse-temurin-21 AS build
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx
WORKDIR /src
COPY package.json package-lock.json ./
# postinstall (keycloakify sync-extensions) needs the source tree, so skip it
# here and run it once the sources are in.
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
RUN npx keycloakify sync-extensions && npm run build-keycloak-theme

FROM alpine
COPY --from=build /src/dist_keycloak/floodnet-keycloak-theme.jar /opt/keycloak/providers/floodnet-keycloak-theme.jar
