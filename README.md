# IRED PropertyOS

IRED PropertyOS is now organized as one monorepo with two active apps:

- `Backend/` - NestJS, Prisma, PostgreSQL, Redis, MinIO, JWT/OTP auth, Swagger.
- `Frontend/` - Next.js, TypeScript, Tailwind, shadcn-style components, Playwright tests.

The older `Backend/frontend/` folder is kept as legacy code and is not part of the root npm workspace. Use `Frontend/` for active frontend development.

## Local ports

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4000/api/v1`
- Swagger: `http://localhost:4000/api/docs`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- MinIO: `http://localhost:9000`


## First setup


```bash
npm install
cp .env.example Backend/.env
cp .env.example Frontend/.env.local
npm run infra:up
npm run db:generate
npm run db:migrate
npm run db:seed
```

`Frontend/.env.local` only needs the frontend variables from `.env.example`; keeping the full file is harmless for local development.

## Daily development

```bash
npm run dev
```

This starts the backend on port `4000` and the frontend on port `3000`.

Run one app at a time when needed:

```bash
npm run dev:backend
npm run dev:frontend
```

## Validation

```bash
npm run typecheck
npm run build
npm run test:backend
npm run test:frontend
```

Frontend Playwright tests start the Next.js dev server automatically. Backend integration tests may require local Docker infrastructure and database migrations.
