# Free-Tier Deployment Guide

This guide deploys IRED PropertyOS with:

- Frontend: Vercel
- Backend: Render
- Database: Neon Postgres
- Media storage: Cloudflare R2
- OTP email: Gmail SMTP first, Resend later after domain verification

This setup is good for staging, demos, and very small internal usage. For dependable production, upgrade the backend first because free web services can sleep and cold start.

## Repository layout

```text
IRED-PropertyOS-Monorepo/
├── Backend/      # NestJS API, Prisma, PostgreSQL, S3-compatible media
├── Frontend/     # Next.js app
├── docs/
└── render.yaml   # Render backend blueprint
```

## 1. Create Neon Postgres

1. Create a Neon project.
2. Create a database for PropertyOS.
3. Copy the connection string.
4. Use this shape for Render:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST.neon.tech/DB?sslmode=require&connect_timeout=15
```

For this free-tier Render setup, use the direct Neon connection string first. When you add Prisma migrations and higher traffic later, keep `DATABASE_URL` for the app and add `DIRECT_URL` for Prisma migrations.

## 2. Create Cloudflare R2 storage

1. Create an R2 bucket named `propertyos-media`.
2. Create an R2 API token with read/write access to that bucket.
3. Copy the account ID, access key ID, and secret access key.
4. Set these backend env vars:

```env
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_BUCKET=propertyos-media
S3_ACCESS_KEY=<r2-access-key-id>
S3_SECRET_KEY=<r2-secret-access-key>
S3_REGION=auto
S3_PUBLIC_URL=https://your-public-r2-domain-or-worker-url
```

Use an R2 public bucket URL, custom domain, or Worker URL for `S3_PUBLIC_URL`. The API still uses signed URLs for upload and download, but this public URL is useful when listing already uploaded media.

## 3. Deploy backend on Render

The repo now includes `render.yaml` at the root. It creates one Render web service from the `Backend` folder.

### Option A: Blueprint deployment

1. Open Render.
2. New > Blueprint.
3. Select this GitHub repo.
4. Render will detect `render.yaml`.
5. Fill the prompted secret values.

Required values:

```env
DATABASE_URL=postgresql://...
APP_FRONTEND_URL=https://your-vercel-app.vercel.app
CORS_ORIGIN=https://your-vercel-app.vercel.app
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_PUBLIC_URL=https://your-public-r2-domain-or-worker-url
SMTP_USER=yourapp.notifications@gmail.com
SMTP_PASS=your-google-app-password
SMTP_FROM=yourapp.notifications@gmail.com
MASTER_ADMIN_EMAIL=admin@yourdomain.com
MASTER_ADMIN_PASSWORD=change-this-before-seeding
```

Leave Resend values blank until you have a verified sending domain.

### Option B: Manual Render service

Use these settings:

| Setting | Value |
|---|---|
| Runtime | Node |
| Root Directory | `Backend` |
| Build Command | `npm ci --legacy-peer-deps && npx prisma generate && npm run build` |
| Pre-Deploy Command | `npx prisma db push` |
| Start Command | `npm run start:prod` |
| Health Check Path | `/api/v1/health` |
| Region | Singapore |
| Plan | Free for staging, Starter or higher for production |

Set all env vars from `Backend/.env.render.example`.

## 4. Deploy frontend on Vercel

1. Import the same GitHub repo into Vercel.
2. Set Root Directory to `Frontend`.
3. Keep Framework Preset as Next.js.
4. Add the frontend env vars:

```env
NEXT_PUBLIC_API_URL=https://ired-propertyos-api.onrender.com/api/v1
NEXT_PUBLIC_GOOGLE_MAPS_KEY=
AUTH_SECRET=generate-a-long-random-value
AUTH_URL=https://your-vercel-app.vercel.app
```

After Vercel gives you the final frontend URL, update the Render backend env vars:

```env
APP_FRONTEND_URL=https://your-vercel-app.vercel.app
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

Then redeploy the Render backend.

## 5. Seed the database once

The backend currently has a seed script that creates reference data, sample users, sample buildings, sample clients, tasks, deals, and site visits.

Run it once after the backend deploys and the database schema exists:

```bash
cd Backend
npm ci --legacy-peer-deps
npx prisma generate
export DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DB?sslmode=require&connect_timeout=15"
export MASTER_ADMIN_EMAIL="admin@yourdomain.com"
export MASTER_ADMIN_PASSWORD="change-this-password"
npm run db:seed
```

Do not leave default demo credentials active in a real production database.

## 6. Smoke tests

After both apps are deployed, test these URLs:

```text
https://ired-propertyos-api.onrender.com/
https://ired-propertyos-api.onrender.com/api/v1/health
https://your-vercel-app.vercel.app
```

Expected backend root response:

```json
{
  "name": "IRED PropertyOS API",
  "status": "ok"
}
```

If frontend calls fail, check these first:

1. `NEXT_PUBLIC_API_URL` in Vercel must end with `/api/v1`.
2. `CORS_ORIGIN` in Render must exactly match the Vercel URL.
3. Render backend must be awake. Free instances can sleep.
4. Neon may take a few seconds to wake after inactivity.
5. R2 bucket credentials must have read and write access.

## 7. Production upgrade path

Use the free stack for demos first, then upgrade in this order:

1. Render backend paid instance, to avoid sleep and reduce cold starts.
2. Add proper Prisma migrations and replace `prisma db push` with `prisma migrate deploy`.
3. Add Redis or Render Key Value when queue-backed notifications are turned on.
4. Add a domain and move OTP email from Gmail SMTP to Resend.
5. Add database backups, monitoring, and object lifecycle rules for R2.
