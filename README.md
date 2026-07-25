# Bulk Messanger

Nx monorepo for a bulk messaging platform with web, mobile (Capacitor), and API apps.

## Stack

| Layer | Technology |
| --- | --- |
| Monorepo | Nx + pnpm workspaces |
| Web | React, Vite, TypeScript, TailwindCSS, shadcn/Radix UI, Zustand, React Hook Form, React Router, tRPC, React Query |
| Mobile | React, Vite, Capacitor, Material UI (MUI), Zustand, React Hook Form, React Router, tRPC |
| API | Next.js (tRPC + Better Auth only), Prisma, PostgreSQL, T3 Env |

## Project structure

```
apps/
  api/      # Next.js backend (tRPC + Better Auth)
  web/      # Vite React web app
  mobile/   # Vite React mobile app (Capacitor + MUI)
packages/
  auth/     # Better Auth server + client helpers
  database/ # Prisma schema + client
  env/      # T3 Env (server + Vite client)
  trpc/     # tRPC router, context, types
  ui/       # Shared shadcn-style components for web
```

## Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL database running locally (or update `DATABASE_URL`)

## Setup

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Configure environment**

   Copy `.env.example` to `.env` and update values:

   ```bash
   cp .env.example .env
   cp apps/web/.env.example apps/web/.env
   cp apps/mobile/.env.example apps/mobile/.env
   cp apps/api/.env.example apps/api/.env
   ```

   Generate a Better Auth secret:

   ```bash
   pnpm exec @better-auth/cli secret
   ```

3. **Set up the database**

   ```bash
   pnpm db:generate
   pnpm db:push
   ```

4. **Run development servers**

   ```bash
   pnpm dev
   ```

   Or individually:

   ```bash
   pnpm dev:api     # http://localhost:3000
   pnpm dev:web     # http://localhost:4200
   pnpm dev:mobile  # http://localhost:4300
   ```

## Authentication

Email/password auth is powered by [Better Auth](https://www.better-auth.com/):

- **Register** — `/register` on web and mobile
- **Login** — `/login` on web and mobile
- **API routes** — `/api/auth/*`
- **Session** — cookie-based, shared across web and mobile dev servers

## Notes

- The API uses **webpack** (not Turbopack) for production builds due to Better Auth / Prisma compatibility.
- Prisma is pinned to **v6** for Better Auth compatibility.
- Mobile UI uses **Material UI** components with a Material Design 3-inspired theme.

## Mobile (Capacitor)

### Why iOS login needs extra setup

The iOS app runs in a WebView with origin `capacitor://localhost`. Session cookies from `http://localhost:3000` are **not stored** by default. This project enables **Capacitor HTTP + Cookies** so native cookie storage is used.

### Native build (Xcode / Android Studio)

1. Start the API:

   ```bash
   pnpm dev:api
   ```

2. Build and sync:

   ```bash
   pnpm exec nx build mobile
   pnpm mobile:sync
   ```

3. Open and run:

   ```bash
   pnpm mobile:ios
   # or
   pnpm mobile:android
   ```

4. **Physical device:** set `VITE_API_URL` in `apps/mobile/.env` to your Mac's LAN IP, e.g. `http://192.168.1.4:3000`, then rebuild + sync.

### Live reload dev (recommended for debugging)

Routes API through the Vite dev server (same-origin cookies):

```bash
pnpm dev:api
pnpm dev:mobile
pnpm mobile:sync:dev   # loads http://localhost:4300 in the WebView
pnpm mobile:ios
```

`apps/mobile` proxies `/api` → `http://localhost:3000`.

## Useful commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Start API, web, and mobile in parallel |
| `pnpm build` | Build all apps |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push schema to database |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm mobile:sync` | Build + Capacitor sync |
| `pnpm exec nx graph` | View project dependency graph |

## Ports

| App | Port |
| --- | --- |
| API | 3000 |
| Web | 4200 |
| Mobile | 4300 |
