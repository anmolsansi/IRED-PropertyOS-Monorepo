# Rollback Procedures

## 1. Rollback to a Previous Docker Image

### Find available image versions

```bash
docker images propertyos-backend --format "table {{.Tag}}\t{{.CreatedAt}}\t{{.Size}}"
```

### Blue-green rollback (zero downtime)

```bash
# Identify which slot is active (check nginx upstream)
docker compose -f docker-compose.prod.yml exec nginx cat /etc/nginx/nginx.conf | grep "server backend"

# Point nginx to the standby slot (which already runs the previous image)
# Edit nginx/nginx.conf and change backend_active upstream:
#   - From: server backend-blue:3000;
#   - To:   server backend-green:3000;
# (or vice versa)

# Reload nginx without downtime
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

### Direct image rollback

```bash
# Stop current backend
docker compose -f docker-compose.prod.yml stop backend-blue backend-green

# Start with specific image tag
docker compose -f docker-compose.prod.yml up -d backend-blue=propertyos-backend:v1.2.3

# Verify health
curl http://localhost:3001/api/v1/health
```

---

## 2. Rollback a Database Migration

### Pre-migration backup (always take before deploying)

```bash
./scripts/db-backup.sh manual
```

### Rollback migration with backup restore

```bash
# 1. Stop the backend to prevent writes
docker compose -f docker-compose.prod.yml stop backend-blue backend-green

# 2. List available backups
ls -lh backups/postgres/

# 3. Restore from the backup taken before the migration
gunzip -c backups/postgres/manual_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres psql -U propertyos -d propertyos

# 4. Verify data integrity
docker compose -f docker-compose.prod.yml exec postgres psql -U propertyos -d propertyos \
  -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"

# 5. Restart backend with the previous image
docker compose -f docker-compose.prod.yml up -d backend-blue backend-green
```

### Rollback migration without backup (forward-fix only)

```bash
# If no backup exists, create a reverse migration
npx prisma migrate dev --create-only --name revert_<migration_name>

# Review the generated SQL, then apply
npx prisma migrate deploy
```

> **Warning:** Restoring a backup will lose all data created after the backup timestamp. Always prefer forward-fix migrations when possible.

---

## 3. Verify Rollback Success

```bash
# Health check
curl -f https://api.yourdomain.com/api/v1/health && echo " OK" || echo " FAIL"

# Check running image version
docker compose -f docker-compose.prod.yml exec backend-blue cat /app/package.json | grep version

# Verify no error spikes in logs
docker compose -f docker-compose.prod.yml logs --since 10m backend-blue 2>&1 | grep -i error

# Check database connectivity
docker compose -f docker-compose.prod.yml exec backend-blue \
  npx prisma migrate status

# Run smoke tests against the rolled-back version
# (test critical paths: login, property listing, payment flow)
```

---

## 4. Communication Steps

### Internal notification template

```
Subject: [ROLLBACK] PropertyOS Backend - Production Rollback Completed

What: Rolled back backend from vX.Y.Z to vX.W.V
Why: <brief reason - e.g., " elevated error rates on /api/v1/payments">
Impact: Brief service degradation during rollback (~2 min)
Status: RESOLVED

Next steps:
- Root cause analysis in progress
- ETA for re-deploy with fix: <time>
- Follow-up: <link to incident ticket>
```

### Escalation path

| Severity | Contact | Channel |
|----------|---------|---------|
| Critical (site down) | Backend Lead + DevOps | Phone + Slack #incidents |
| High (major feature broken) | Backend Lead | Slack #incidents |
| Medium (minor feature broken) | On-call engineer | Slack #engineering |

### Post-rollback checklist

- [ ] Verify rollback in production logs
- [ ] Confirm no user-reported errors for 15 minutes
- [ ] Update incident ticket with root cause
- [ ] Schedule post-mortem if severity was Critical or High
- [ ] Notify stakeholders of re-deploy ETA
