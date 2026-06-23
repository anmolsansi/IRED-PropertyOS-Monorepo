# Staging Deployment Checklist

## Pre-Deployment Checks

- [ ] Code reviewed and approved by at least 1 reviewer
- [ ] All CI checks passing (lint, type-check, tests)
- [ ] No open blocking issues in Linear for this release
- [ ] `.env.staging` updated with any new required variables
- [ ] Database migrations are backwards-compatible (or migration plan documented)
- [ ] Changelog updated for user-facing changes

## Deployment Steps

```bash
# 1. Pull latest code
git pull origin develop

# 2. Build new images
docker compose -f docker-compose.staging.yml build

# 3. Run database migrations
docker compose -f docker-compose.staging.yml exec backend npx prisma migrate deploy

# 4. Restart services
docker compose -f docker-compose.staging.yml up -d

# 5. Wait for health checks
docker compose -f docker-compose.staging.yml ps
# All services should show "healthy" or "Up"
```

## Post-Deployment Verification

- [ ] Health endpoint returns 200: `curl http://localhost:3001/api/v1/health`
- [ ] Auth flow works (register, login, refresh token)
- [ ] Property CRUD operations work
- [ ] File upload to S3/MinIO works
- [ ] SMS OTP flow works (or console fallback logs correctly)
- [ ] Push notification registration works
- [ ] No errors in backend logs: `docker compose -f docker-compose.staging.yml logs --since 5m backend`
- [ ] No errors in nginx logs: `docker compose -f docker-compose.staging.yml logs --since 5m nginx`
- [ ] API docs accessible: `http://localhost:3001/api/docs`

## Rollback Procedure

If staging verification fails:

```bash
# 1. Identify the previous working image
docker images propertyos-backend --format "table {{.Tag}}\t{{.CreatedAt}}"

# 2. Roll back to previous version
git log --oneline -5  # find the last known good commit
git checkout <commit-hash>
docker compose -f docker-compose.staging.yml build
docker compose -f docker-compose.staging.yml up -d

# 3. Roll back migration if needed (only if migration was applied)
docker compose -f docker-compose.staging.yml exec backend npx prisma migrate reset --force

# 4. Verify rollback
curl http://localhost:3001/api/v1/health
```

## Sign-Off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Developer | | | [ ] |
| QA | | | [ ] |
