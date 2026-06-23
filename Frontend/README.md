# IRED PropertyOS - Frontend

Next.js 16 + React 19 frontend for the IRED PropertyOS commercial real estate platform.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **React:** 19
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **UI Components:** shadcn/ui
- **State Management:** TanStack Query 5
- **Forms:** React Hook Form + Zod 4
- **Tables:** TanStack Table 8
- **Icons:** Lucide React

## Local Development

```bash
# From the root monorepo directory
npm install
npm run dev:frontend
```

The frontend starts on `http://localhost:3000`.

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Required variables:

- `NEXT_PUBLIC_API_URL` - Backend API URL (default: `http://localhost:4000/api/v1`)

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, OTP, forgot/reset password
│   ├── (dashboard)/     # V1: Properties, approvals, media, settings
│   ├── (v2)/            # V2: Clients, deals, tasks, imports, exports, map
│   └── api/auth/        # Server-side auth API routes (legacy)
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── shared/          # Reusable components (forms, layouts)
│   ├── layout/          # Sidebar, TopBar, ThemeToggle
│   ├── approvals/       # Approval-specific components
│   ├── auth/            # Login/OTP forms
│   ├── dashboard/       # Dashboard stat cards
│   ├── media/           # Media upload components
│   └── properties/      # Property detail components
├── hooks/               # TanStack Query hooks for all entities
├── lib/
│   ├── api/client.ts    # Central API client with auth
│   ├── constants.ts     # Navigation, status maps
│   ├── validation.ts    # Zod schemas
│   └── utils.ts         # Utility functions
├── providers/           # Auth, Query, Theme, Data providers
└── types/               # TypeScript interfaces
```

## Testing

```bash
# Run Playwright E2E tests
npm test

# Run with UI
npm run test:ui

# Run headed (visible browser)
npm run test:headed
```

Tests run on `http://localhost:3100` (Playwright starts the dev server automatically).

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking |
| `npm test` | Run Playwright tests |
