# IRED PropertyOS Backend

Commercial Real Estate Operations Platform API built with NestJS, Prisma, and PostgreSQL.

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** NestJS 11
- **Language:** TypeScript 5.6
- **ORM:** Prisma 6 (PostgreSQL)
- **Auth:** JWT (access + refresh tokens), Argon2 password hashing
- **Queue:** BullMQ (Redis) for email/SMS/push notifications
- **Real-time:** WebSocket (Socket.IO) for live notifications
- **File Storage:** AWS S3 / MinIO (presigned URLs)
- **PDF:** PDFKit for proposal generation
- **Validation:** Zod schemas
- **API Docs:** Swagger/OpenAPI

## Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- MinIO or S3-compatible storage (for file uploads)

## Quick Start

```bash
# Clone and install
git clone <repo-url>
cd IRED-PropertyOS-Backend
npm install

# Start infrastructure
docker-compose up -d

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Setup database
npx prisma migrate dev
npx prisma db seed

# Start development server
npm run start:dev
```

The API runs at `http://localhost:3000` and Swagger docs at `http://localhost:3000/api/docs`.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start development server with watch |
| `npm run build` | Build for production |
| `npm run start:prod` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed reference data |
| `npm run db:studio` | Open Prisma Studio |

## API Overview

### Authentication (`/api/v1/auth`)
- `POST /login` — Email + password login
- `POST /verify-email-otp` — Verify email OTP for activation
- `POST /refresh-token` — Refresh access token
- `POST /logout` — Revoke all refresh tokens
- `POST /forgot-password` — Request password reset OTP
- `POST /reset-password` — Reset password with OTP
- `GET /me` — Get current user profile

### Core Entities
- **Buildings** — CRUD + soft delete + change request flow for workers
- **Floors** — Nested under buildings, CRUD + soft delete
- **Units** — CRUD + soft delete + assignment to workers
- **Contacts** — CRUD + soft delete + view audit logging

### CRM
- **Clients** — CRUD + contacts + requirements + shortlists
- **Deals** — Pipeline management with status transitions + commissions + invoices
- **Site Visits** — Scheduling with status workflow (scheduled → confirmed → completed)
- **Proposals** — Generate client proposals with PDF export

### Operations
- **Tasks** — Task management with follow-ups and status transitions
- **Change Requests** — Worker-initiated edits requiring admin approval
- **Imports** — CSV data import with column mapping and validation
- **Exports** — CSV-ready data export for buildings/units/contacts/clients/deals

### Reference Data
- States, Cities, Localities, Micro Markets, Zones
- Property Types, Furnishing Statuses, Availability Statuses
- Verification Statuses, Contact Roles, Document Categories, Sources

### System
- **Dashboard** — Admin and worker metrics + activity feed
- **Search** — Advanced search for properties, units, contacts
- **Map** — Geographic bounds and nearby property queries
- **Media** — S3 presigned URL upload/download
- **Notifications** — Email/SMS/push queue with real-time WebSocket

## Roles

| Role | Description |
|------|-------------|
| `ADMIN` | Full access, can approve change requests, manage users |
| `WORKER` | Limited access, edits go through change request flow |

## Change Request Flow

Workers cannot directly edit buildings/floors/units/contacts. Instead:
1. Worker submits changes → creates a change request
2. Admin reviews the diff → approves, rejects, or resolves conflicts
3. Approved changes are applied and version snapshots are saved

## WebSocket Events

Connect to `/notifications` with a JWT token:

```javascript
const socket = io('http://localhost:3000/notifications', {
  auth: { token: 'your-jwt-access-token' }
});

socket.on('change-request', (data) => { /* new change request */ });
socket.on('approval-result', (data) => { /* request approved/rejected */ });
socket.on('task-assigned', (data) => { /* task assigned to you */ });
socket.on('site-visit-reminder', (data) => { /* site visit reminder */ });
```

## Environment Variables

See `.env.example` for all required configuration. Key variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_HOST` | Redis host for BullMQ |
| `JWT_ACCESS_SECRET` | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens |
| `SMTP_HOST` | SMTP server (falls back to console logging if not set) |
| `S3_ENDPOINT` | S3/MinIO endpoint for file storage |

## Project Structure

```
src/
├── main.ts                    # Application entry point
├── app.module.ts              # Root module
├── config/                    # Environment validation and config
├── prisma/                    # Prisma service (global)
├── shared/                    # Guards, decorators, interceptors, pipes, utils
│   ├── guards/                # JWT, Roles, Geography guards
│   ├── decorators/            # @CurrentUser, @Roles, @GeographyScope
│   ├── interceptors/          # Audit, Transform interceptors
│   ├── pipes/                 # ZodValidationPipe
│   └── utils/                 # CSV parser utility
├── health/                    # Health check endpoint
├── generated/                 # Generated Prisma client
└── modules/
    ├── auth/                  # Authentication + OTP
    ├── users/                 # User management
    ├── reference/             # Reference data (states, cities, etc.)
    ├── buildings/             # Building CRUD
    ├── floors/                # Floor CRUD (nested under buildings)
    ├── units/                 # Unit CRUD
    ├── contacts/              # Contact CRUD
    ├── media/                 # File upload/download (S3)
    ├── change-requests/       # Change request workflow
    ├── search/                # Advanced search
    ├── dashboard/             # Dashboard metrics
    ├── clients/               # Client + requirements + shortlists
    ├── deals/                 # Deal pipeline + commissions + invoices
    ├── tasks/                 # Tasks + follow-ups
    ├── site-visits/           # Site visit scheduling
    ├── proposals/             # Proposal generation + PDF
    ├── imports/               # CSV data import
    ├── exports/               # Data export
    ├── map/                   # Geographic queries
    ├── notifications/         # Email/SMS/push queues + WebSocket
    ├── email/                 # SMTP mail service
    ├── audit/                 # Audit event query (admin-only)
    └── monitoring/            # System metrics + export scheduler
```

## License

Proprietary — Indian Real Estate Dimensions
