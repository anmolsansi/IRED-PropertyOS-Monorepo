#!/bin/bash
# ─── Blue-Green Deployment Script ──────────────────────────
# Swaps nginx traffic between blue and green backends.
# Usage: ./scripts/blue-green-deploy.sh [blue|green|swap|status]
#
# Blue = backend (port 3000)
# Green = backend-green (port 3002)

set -euo pipefail

ACTION="${1:-status}"
COMPOSE_FILE="docker-compose.prod.yml"

case "${ACTION}" in
  blue)
    echo "🔵 Switching to BLUE backend..."
    sed -i '' 's/server backend-green:3000;/server backend:3000;/' nginx/nginx.conf
    sed -i '' 's/upstream backend_active {/upstream backend_active {\n    # Active: blue/' nginx/nginx.conf
    docker compose -f ${COMPOSE_FILE} exec -T nginx nginx -s reload
    echo "✅ Active backend: BLUE"
    ;;

  green)
    echo "🟢 Switching to GREEN backend..."
    sed -i '' 's/server backend:3000;/server backend-green:3000;/' nginx/nginx.conf
    sed -i '' 's/upstream backend_active {/upstream backend_active {\n    # Active: green/' nginx/nginx.conf
    docker compose -f ${COMPOSE_FILE} exec -T nginx nginx -s reload
    echo "✅ Active backend: GREEN"
    ;;

  swap)
    echo "🔄 Swapping active backend..."
    CURRENT=$(grep -A1 'upstream backend_active' nginx/nginx.conf | grep 'server' | awk '{print $2}')
    if echo "${CURRENT}" | grep -q "backend-green"; then
      ./scripts/blue-green-deploy.sh blue
    else
      ./scripts/blue-green-deploy.sh green
    fi
    ;;

  status)
    echo "📊 Blue-Green Deployment Status"
    echo ""
    CURRENT=$(grep -A1 'upstream backend_active' nginx/nginx.conf | grep 'server' | awk '{print $2}' | tr -d ';')
    echo "  Active: ${CURRENT}"
    echo ""
    echo "  Containers:"
    docker compose -f ${COMPOSE_FILE} ps backend backend-green --format "  {{.Name}}: {{.Status}}"
    ;;

  deploy-green)
    echo "🚀 Deploying to GREEN (zero-downtime)..."
    # Build new green image
    docker compose -f ${COMPOSE_FILE} build backend-green
    # Start green
    docker compose -f ${COMPOSE_FILE} up -d backend-green
    # Wait for health
    echo "  Waiting for green to be healthy..."
    sleep 10
    # Switch traffic
    ./scripts/blue-green-deploy.sh green
    # Stop old blue
    echo "  Stopping old blue backend..."
    docker compose -f ${COMPOSE_FILE} stop backend
    echo "✅ Deploy complete: GREEN is now active"
    ;;

  deploy-blue)
    echo "🚀 Deploying to BLUE (zero-downtime)..."
    docker compose -f ${COMPOSE_FILE} build backend
    docker compose -f ${COMPOSE_FILE} up -d backend
    echo "  Waiting for blue to be healthy..."
    sleep 10
    ./scripts/blue-green-deploy.sh blue
    docker compose -f ${COMPOSE_FILE} stop backend-green
    echo "✅ Deploy complete: BLUE is now active"
    ;;

  *)
    echo "Usage: $0 [blue|green|swap|status|deploy-green|deploy-blue]"
    echo ""
    echo "Commands:"
    echo "  blue          - Switch traffic to blue"
    echo "  green         - Switch traffic to green"
    echo "  swap          - Swap to the other backend"
    echo "  status        - Show current active backend"
    echo "  deploy-green  - Zero-downtime deploy via green"
    echo "  deploy-blue   - Zero-downtime deploy via blue"
    exit 1
    ;;
esac
