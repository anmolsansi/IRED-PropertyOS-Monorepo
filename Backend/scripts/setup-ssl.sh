#!/bin/bash
# ─── SSL Certificate Setup (Let's Encrypt) ─────────────────
# Usage: ./scripts/setup-ssl.sh <domain> <email>
#
# Prerequisites:
#   - Docker Compose running
#   - Domain pointing to this server's IP
#   - Port 80 accessible from internet

set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"

if [ -z "${DOMAIN}" ] || [ -z "${EMAIL}" ]; then
  echo "Usage: $0 <domain> <email>"
  echo "Example: $0 api.propertyos.in admin@propertyos.in"
  exit 1
fi

CERT_DIR="./nginx/ssl"
WEBROOT="./certbot/www"

echo "🔐 Setting up SSL for ${DOMAIN}..."

# Create directories
mkdir -p "${CERT_DIR}" "${WEBROOT}"

# Step 1: Get initial certificate
echo "📥 Requesting certificate from Let's Encrypt..."
docker run --rm \
  -v "$(pwd)/${CERT_DIR}:/etc/letsencrypt" \
  -v "$(pwd)/${WEBROOT}:/var/www/certbot" \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "${EMAIL}" \
  --agree-tos \
  --no-eff-email \
  -d "${DOMAIN}"

# Step 2: Copy certs to nginx ssl dir
echo "📋 Copying certificates..."
docker run --rm \
  -v "$(pwd)/${CERT_DIR}:/etc/letsencrypt" \
  -v "$(pwd)/${CERT_DIR}:/etc/nginx/ssl" \
  alpine sh -c "
    cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem /etc/nginx/ssl/cert.pem &&
    cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem /etc/nginx/ssl/key.pem
  "

echo "✅ SSL certificates installed at ${CERT_DIR}/"
echo ""
echo "🔄 Restart nginx to pick up new certs:"
echo "   docker compose -f docker-compose.prod.yml restart nginx"
echo ""
echo "⏰ Auto-renewal cron job (add to crontab):"
echo "   0 3 * * 1 cd $(pwd) && ./scripts/renew-ssl.sh ${DOMAIN} >> /var/log/ssl-renew.log 2>&1"
