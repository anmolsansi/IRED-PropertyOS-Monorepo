#!/bin/bash
# ─── SSL Certificate Renewal ───────────────────────────────
# Run weekly via cron: 0 3 * * 1 /path/to/renew-ssl.sh <domain>

set -euo pipefail

DOMAIN="${1:-}"
CERT_DIR="./nginx/ssl"
WEBROOT="./certbot/www"

if [ -z "${DOMAIN}" ]; then
  echo "Usage: $0 <domain>"
  exit 1
fi

echo "🔄 Checking SSL certificate renewal for ${DOMAIN}..."

# Attempt renewal
docker run --rm \
  -v "$(pwd)/${CERT_DIR}:/etc/letsencrypt" \
  -v "$(pwd)/${WEBROOT}:/var/www/certbot" \
  certbot/certbot renew \
  --webroot \
  --webroot-path=/var/www/certbot \
  --quiet

# Copy renewed certs
if [ -f "${CERT_DIR}/live/${DOMAIN}/fullchain.pem" ]; then
  cp "${CERT_DIR}/live/${DOMAIN}/fullchain.pem" "${CERT_DIR}/cert.pem"
  cp "${CERT_DIR}/live/${DOMAIN}/privkey.pem" "${CERT_DIR}/key.pem"

  # Reload nginx
  docker compose -f docker-compose.prod.yml exec -T nginx nginx -s reload
  echo "✅ Certificate renewed and nginx reloaded"
else
  echo "ℹ️  No renewal needed"
fi
