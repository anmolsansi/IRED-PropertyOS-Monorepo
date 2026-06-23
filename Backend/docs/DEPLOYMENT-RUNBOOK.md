# Deployment Runbook

## Prerequisites

- Docker & Docker Compose v2+
- PostgreSQL 16+ (or use Docker service)
- Redis 7+ (or use Docker service)
- Node.js 20+ (for local dev only)
- Access to domain DNS settings
- SSL certificate (Let's Encrypt or CA-issued)

---

## 1. Initial Setup

### 1.1 Clone and configure

```bash
git clone https://github.com/your-org/ired-propertyos-backend.git
cd ired-propertyos-backend

# Create .env from template
cp .env.production.example .env

# Edit .env with real values
nano .env
```

### 1.2 Required environment variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_ACCESS_SECRET` | JWT signing key (min 32 chars) | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Refresh token signing key | `openssl rand -hex 32` |
| `REDIS_HOST` | Redis host | `redis` |
| `SMTP_HOST` | SMTP server host | `smtp.resend.com` |
| `SMTP_USER` | SMTP username | `resend` |
| `SMTP_PASS` | SMTP password | `re_xxxxx` |

### 1.3 Generate secrets

```bash
# JWT secrets
echo "JWT_ACCESS_SECRET=$(openssl rand -hex 32)"
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 32)"

# Database password
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)"
```

---

## 2. Staging Deployment

```bash
# Start all services
docker compose -f docker-compose.staging.yml up -d

# Run migrations
docker compose -f docker-compose.staging.yml exec backend npx prisma migrate deploy

# Seed reference data
docker compose -f docker-compose.staging.yml exec backend npx prisma db seed

# Verify health
curl http://localhost:3001/api/v1/health
```

---

## 3. Production Deployment

### 3.1 First deploy

```bash
# Start infrastructure
docker compose -f docker-compose.prod.yml up -d postgres redis minio

# Wait for health checks
docker compose -f docker-compose.prod.yml ps

# Start backend
docker compose -f docker-compose.prod.yml up -d backend

# Run migrations
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Seed data (first time only)
docker compose -f docker-compose.prod.yml exec backend npx prisma db seed

# Start nginx (after SSL setup)
docker compose -f docker-compose.prod.yml up -d nginx
```

### 3.2 Subsequent deploys

```bash
# Pull latest code
git pull origin main

# Build new image
docker compose -f docker-compose.prod.yml build backend

# Rolling restart (zero downtime with blue-green)
docker compose -f docker-compose.prod.yml up -d --no-deps backend

# Verify
curl https://api.yourdomain.com/api/v1/health
```

### 3.3 Database migrations

```bash
# Always backup before migrations
./scripts/db-backup.sh manual

# Run migration
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Verify migration status
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate status
```

---

## 4. SSL Setup

```bash
# Initial SSL certificate
./scripts/setup-ssl.sh api.yourdomain.com admin@yourdomain.com

# Auto-renewal (add to crontab)
crontab -e
# Add: 0 3 * * 1 cd /opt/propertyos && ./scripts/renew-ssl.sh api.yourdomain.com >> /var/log/ssl-renew.log 2>&1
```

---

## 5. Backup & Restore

### 5.1 Manual backup

```bash
./scripts/db-backup.sh manual
```

### 5.2 Automated backups (cron)

```bash
# Add to crontab
crontab -e

# Daily at 2am
0 2 * * * cd /opt/propertyos && ./scripts/db-backup.sh daily >> /var/log/backup.log 2>&1

# Weekly on Sunday at 3am
0 3 * * 0 cd /opt/propertyos && ./scripts/db-backup.sh weekly >> /var/log/backup.log 2>&1
```

### 5.3 Restore from backup

```bash
# List available backups
ls -lh backups/postgres/

# Restore specific backup
gunzip -c backups/postgres/daily_20250601_020000.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres psql -U propertyos -d propertyos
```

### 5.4 Verify backup integrity

```bash
./scripts/verify-backup.sh backups/postgres/daily_20250601_020000.sql.gz
```

---

## 6. Monitoring

### 6.1 Check metrics

```bash
# JSON metrics
curl https://api.yourdomain.com/api/v1/monitoring/metrics

# Prometheus format
curl https://api.yourdomain.com/api/v1/monitoring/metrics/prometheus
```

### 6.2 Check queue stats

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.yourdomain.com/api/v1/notifications/stats
```

### 6.3 View logs

```bash
# Backend logs
docker compose -f docker-compose.prod.yml logs -f backend

# Nginx access logs
docker compose -f docker-compose.prod.yml exec nginx tail -f /var/log/nginx/access.log

# All services
docker compose -f docker-compose.prod.yml logs -f
```

---

## 7. Troubleshooting

### 7.1 Common issues

| Issue | Cause | Fix |
|-------|-------|-----|
| `ECONNREFUSED` on postgres | PG not ready | `docker compose restart postgres` |
| `JWT verification failed` | Secret mismatch | Ensure `JWT_ACCESS_SECRET` matches across deploys |
| `Rate limit exceeded` | Too many requests | Check `THROTTLE_LIMIT` config |
| `SMTP not configured` | Missing env vars | Set `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` |
| Migration failed | Schema drift | Run `npx prisma migrate reset` (dev only) |

### 7.2 Emergency procedures

**Rollback to previous version:**
```bash
# Find previous image
docker images propertyos-backend

# Deploy specific version
docker compose -f docker-compose.prod.yml up -d backend=<image-tag>
```

**Reset database (DESTRUCTIVE):**
```bash
# ONLY in development
docker compose -f docker-compose.staging.yml exec backend npx prisma migrate reset
```

**Force restart all services:**
```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

---

## 8. Scaling

### 8.1 Horizontal scaling

```bash
# Scale backend instances
docker compose -f docker-compose.prod.yml up -d --scale backend=3

# Update nginx upstream (if not using Docker networking)
docker compose -f docker-compose.prod.yml restart nginx
```

### 8.2 Database connection pooling

Configure PgBouncer or use Prisma's built-in connection pool:

```env
DATABASE_URL=postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10
```

---

## 9. Security Checklist

- [ ] All secrets in `.env` (never committed to git)
- [ ] `.env` has `600` permissions: `chmod 600 .env`
- [ ] SSL certificates auto-renewing
- [ ] Firewall only exposes ports 80, 443
- [ ] Database not exposed to public internet
- [ ] Redis protected with password
- [ ] Admin passwords are strong (20+ chars)
- [ ] Audit logging enabled
- [ ] Backup tested with restore
- [ ] Rate limiting active
- [ ] CORS restricted to known origins

---

## 10. Contacts

| Role | Contact |
|------|---------|
| Backend Lead | [your-name] |
| DevOps | [devops-contact] |
| On-call | [oncall-contact] |
