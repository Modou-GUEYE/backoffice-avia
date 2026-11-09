FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_GATEWAY_BASE_URL
ARG VITE_PARTNER_ID=default
ARG VITE_ACCESS_SECURITY_CLIENT_ID=backoffice-web

ENV VITE_GATEWAY_BASE_URL=$VITE_GATEWAY_BASE_URL
ENV VITE_PARTNER_ID=$VITE_PARTNER_ID
ENV VITE_ACCESS_SECURITY_CLIENT_ID=$VITE_ACCESS_SECURITY_CLIENT_ID

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
ARG API_BACKEND_URL
ENV API_BACKEND_URL=${API_BACKEND_URL}

# COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Copier le template Nginx
COPY nginx.conf /etc/nginx/templates/nginx.conf.template

# Ensure nginx user owns the served files to avoid running processes as root
RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/run || true

# Keep the entrypoint running as root so it can generate /etc/nginx/conf.d/default.conf
USER root

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

# Démarrer Nginx
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]