#!/bin/sh
set -eu

if [ -z "${API_BACKEND_URL:-}" ]; then
  echo "API_BACKEND_URL is not set; nginx proxy will be misconfigured" >&2
fi

envsubst '$API_BACKEND_URL' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'