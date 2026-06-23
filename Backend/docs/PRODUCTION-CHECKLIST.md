# Production Deployment Checklist

## Pre-Deployment Checks

- [ ] Code reviewed and approved by at least 2 reviewers
- [ ] All CI checks passing (lint, type-check, unit tests, integration tests)
- [ ] Staging deployment verified and signed off (see [STAGING-CHECKLIST.md](./STAGING-CHECKLIST.md))
- [ ] No open critical/high issues in Linear for this release
- [ ] Database migration is backwards-compatible OR migration window scheduled
- [ ] Rollback plan documented and tested on staging
- [ ] `.env.production` updated with any new required variables
- [ ] Secrets rotated if compromised (JWT secrets, API keys)
- [ ] Changelog/release notes prepared
- [ ] Stakeholders notified of deployment window

## Deployment Steps

### 1. Backup

```bash
# Create pre-deployment backup
./scripts/db-backup.sh manual

# Verify backup exists
ls -lh backups/postgres/manual_*.sql.gz
```

### 2. Build and Deploy

```bash
# Pull latest code
git pull origin main

# Build new image
docker compose -f docker-compose.prod.yml build

# Identify active slot (blue or green)
docker compose -f docker-compose.prod.yml exec nginx cat /etc/nginx/nginx.conf | grep "server backend"

# Deploy to inactive slot (zero-downtime)
# If blue is active, deploy to green:
docker compose -f docker-compose.prod.yml up -d --no-deps backend-green

# Wait for health check
docker compose -f docker-compose.prod.yml exec backend-green wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health
```

### 3. Run Migrations (if applicable)

```bash
# Run on the new slot before switching traffic
docker compose -f docker-compose.prod.yml exec backend-green npx prisma migrate deploy

# Verify migration status
docker compose -f docker-compose.prod.yml exec backend-green npx prisma migrate status
```

### 4. Switch Traffic

```bash
# Update nginx upstream to point to new slot
# Edit nginx/nginx.conf: change backend_active to new slot

# Reload nginx (zero downtime)
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

# Verify traffic is hitting new slot
curl -I https://api.yourdomain.com/api/v1/health
```

### 5. Cleanup Old Slot (after verification)

```bash
# Stop old slot (keep image for quick rollback)
docker compose -f docker-compose.prod.yml stop backend-blue
```

## Post-Deployment Verification

### Health Checks (immediate)

- [ ] Health endpoint returns 200: `curl https://api.yourdomain.com/api/v1/health`
- [ ] SSL certificate valid: `echo | openssl s_client -connect api.yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates`
- [ ] No 5xx errors in nginx access log (first 5 minutes)

### Smoke Tests (within 15 minutes)

- [ ] User registration and login flow
- [ ] Property listing and search
- [ ] Property CRUD (create, update, delete)
- [ ] File upload to S3
- [ ] OTP email delivery
- [ ] SMS notification delivery
- [ ] Push notification registration
- [ ] Payment flow (if applicable)

### Monitoring (first hour)

- [ ] Error rate within normal range: `curl -s https://api.yourdomain.com/api/v1/monitoring/metrics | jq '.errorRate'`
- [ ] Response times within SLA: p95 < 500ms
- [ ] No OOM kills: `docker stats --no-stream`
- [ ] Database connections stable: check connection pool metrics
- [ ] Redis memory usage stable

### Logs (first 30 minutes)

```bash
# Check for errors
docker compose -f docker-compose.prod.yml logs --since 30m backend-green 2>&1 | grep -i error

# Check for warnings
docker compose -f docker-compose.prod.yml logs --since 30m backend-green 2>&1 | grep -i warn

# Check nginx for 5xx
docker compose -f docker-compose.prod.yml exec nginx tail -1000 /var/log/nginx/access.log | awk '{print $9}' | sort | uniq -c | sort -rn
```

## Rollback Procedure

### Immediate rollback (< 5 minutes after switch)

```bash
# 1. Switch nginx back to previous slot
# Edit nginx/nginx.conf: change backend_active to old slot

# 2. Reload nginx
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

# 3. Verify old slot is healthy
curl https://api.yourdomain.com/api/v1/health
```

### Rollback with database restore (> 5 minutes or migration applied)

```bash
# 1. Stop all backend slots
docker compose -f docker-compose.prod.yml stop backend-blue backend-green

# 2. Restore database from pre-deployment backup
gunzip -c backups/postgres/manual_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres psql -U propertyos -d propertyos

# 3. Start previous version
docker compose -f docker-compose.prod.yml up -d backend-blue

# 4. Verify
curl https://api.yourdomain.com/api/v1/health
```

## Communication Plan

### Pre-deployment

| When | What | Who | Channel |
|------|------|-----|---------|
| T-24h | Deployment window announcement | DevOps Lead | Slack #engineering |
| T-1h | Deployment starting | Deploying engineer | Slack #incidents |
| T-0 | Deployment complete | Deploying engineer | Slack #incidents |

### During issues

| Severity | Response Time | Escalation | Channel |
|----------|--------------|------------|---------|
| Critical (site down) | Immediate | Backend Lead + DevOps | Phone + Slack #incidents |
| High (major feature broken) | 15 min | Backend Lead | Slack #incidents |
| Medium (minor issue) | 1 hour | On-call engineer | Slack #engineering |

### Post-deployment

| When | What | Who | Channel |
|------|------|-----|---------|
| T+15min | Smoke test results | QA/Deploying engineer | Slack #incidents |
| T+1hr | Monitoring check | DevOps | Slack #incidents |
| T+24h | Stability confirmation | Backend Lead | Slack #engineering |

### Incident communication template

```
Subject: [INCIDENT] PropertyOS API - <status>

What: <brief description>
Impact: <user impact>
Status: Investigating / Identified / Monitoring / Resolved
ETA: <estimated time to resolution>
Workaround: <if any>
Next update: <time>
```
