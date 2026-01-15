# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SmartPlay HK OSS is a web application for tracking and booking sports facility availability in Hong Kong. The app crawls the LCSD SmartPlay API periodically to collect facility availability data and presents it through a React-based UI with multi-language support.

**Tech Stack**: TanStack Start (React SSR), Prisma + PostgreSQL, Tailwind CSS, TypeScript

## Essential Commands

### Development

```bash
pnpm dev              # Start dev server on port 3000
pnpm build            # Production build
pnpm preview          # Preview production build
```

### Code Quality

```bash
pnpm lint             # Run Biome linter (auto-fixes)
pnpm format           # Format code with Biome
pnpm check            # Run both lint and format
pnpm typecheck        # TypeScript type checking
```

### Testing

```bash
pnpm test             # Run Vitest test suite
pnpm test:crawler     # Test crawler functionality
```

### Database (requires .env.local)

```bash
pnpm db:generate      # Generate Prisma client from schema
pnpm db:push          # Push schema changes (development)
pnpm db:migrate       # Create and apply migrations (production)
pnpm db:studio        # Open Prisma Studio database browser
pnpm db:seed          # Seed database with initial data
pnpm db:reset         # Force reset database (DESTRUCTIVE)
```

## Architecture

### Full-Stack Structure

This is a **TanStack Start** application with SSR capabilities:

- **Frontend**: React 19 with file-based routing via TanStack Router
- **Backend**: Nitro server with server functions (`src/server-functions/`)
- **Database**: PostgreSQL with Prisma ORM

### Core Systems

#### 1. Crawler System (`src/lib/crawler/`)

Web crawling service that periodically fetches facility availability from the LCSD SmartPlay API.

**Key Components**:

- `orchestrator.ts` - Manages crawl operations with concurrency control (p-queue)
- `scheduler.ts` - Cron-based job scheduling with node-cron
- `http-client.ts` - HTTP client with retry logic and circuit breaker
- `data-processor.ts` - Normalizes API responses to database models
- `checkpoint.ts` - Checkpoint system for resumable multi-day crawls
- `dead-letter-queue.ts` - Failed request tracking with exponential backoff retry
- `metadata-crawler.ts` - Fetches facility/district metadata
- `repositories/` - Repository pattern for database operations (interface + prisma/mock)

**Data Flow**:

```
Scheduler → Orchestrator → HTTP Client → LCSD API
                ↓
         Data Processor
                ↓
         Prisma Repository → PostgreSQL
```

**Crawler Configuration** (via environment variables):

- `CRAWLER_ENABLED` - Enable/disable scheduled crawls
- `CRAWLER_INTERVAL` - Cron expression for scheduling
- `CRAWLER_DISTRICTS` - District codes to crawl
- `CRAWLER_FACILITY_TYPE` - Facility type code (e.g., "TENC" for tennis)

#### 2. Booking System (`src/lib/booking/`)

Frontend business logic for filtering and displaying facility availability.

**Key Modules**:

- `filter-venues.ts` - Multi-criteria filtering (district, facility, search)
- `calculate-stats.ts` - Availability statistics and sorting algorithms
- `hooks/` - Custom React hooks for state management
  - `useBookingFilters` - Filter state with URL sync
  - `useBookingStats` - Statistics calculation
  - `useBookingNavigation` - Navigation helpers
- `utils.ts` - Date/time utilities, availability theming
- `venue-utils.ts` - Venue display and filtering helpers

#### 3. Server Functions (`src/server-functions/`)

TanStack Start server functions that bridge frontend and crawler systems.

**Endpoints**:

- `crawler/runCrawl` - Manually trigger a crawl job
- `crawler/getCrawlHistory` - Fetch crawl job history
- `crawler/getAvailableSessions` - Query available sessions by date
- `booking/` - Booking-related operations

#### 4. Database Layer (`src/db.ts`, `prisma/schema.prisma`)

**Prisma Setup**:

- Client uses PostgreSQL adapter (`@prisma/adapter-pg`)
- Generated client outputs to `src/generated/prisma/`
- Singleton pattern with hot-reload persistence in development

**Key Models**:

- `CrawlJob` - Tracks individual crawl operations
- `ScheduledCrawlRun` - Multi-day crawl tracking
- `Session` - Facility availability records (with composite unique constraints)
- `Facility` - Venue metadata
- `FacilityType` - Type categories (tennis, basketball, etc.)
- `District` - Geographic districts
- `DeadLetterEntry` - Failed crawl attempts with retry tracking

**Important Indexes**:

- Composite index on `Session(venueId, date)` for venue-specific queries
- Index on `Session(date, available)` for availability filtering
- Index on `Session(available)` for global availability queries

### 5. UI Components (`src/components/`)

**Headless UI Library** (`components/ui/`):
Built with Base UI React primitives for full accessibility:

- `Button`, `Input`, `Textarea` - Form controls
- `Modal`, `Drawer` - Overlay components
- `Select`, `Checkbox`, `Switch` - Selection controls
- `Tooltip`, `Alert`, `Badge` - Feedback components
- All components use `React.forwardRef` for ref forwarding
- Exported TypeScript interfaces for all props

**Routing** (`src/routes/`):
File-based routing with TanStack Router:

- `__root.tsx` - Root layout with providers (QueryClient, I18next)
- Route files auto-generate `routeTree.gen.ts`
- Use `<Outlet />` for nested route content
- Use `Link` from `@tanstack/react-router` for navigation

## Development Patterns

### Environment Configuration

- **Required**: `.env.local` (see `.env.example` for template)
- **Database**: `DATABASE_URL` - PostgreSQL connection string
- **Crawler**: `CRAWLER_ENABLED`, `CRAWLER_INTERVAL`, etc.
- **Validation**: Zod schemas in `src/lib/env.ts`

### Path Aliases

Use `@/` prefix for project imports:

```tsx
import { Button } from '@/components/ui';
import { CrawlerOrchestrator } from '@/lib/crawler';
```

### Code Style

- **Indentation**: Tabs (enforced by Biome)
- **Quotes**: Double quotes for JS/TS
- **Imports**: Auto-organized by Biome
- **Components**: PascalCase with exported interfaces
- **Utilities**: camelCase
- Run `pnpm check` before committing

### Testing

- Framework: Vitest with @testing-library/react
- Test location: `__tests__/` directories next to source files
- Mock repository available in `src/lib/crawler/repositories/mock-repository.ts`
- Tests for crawler, scheduler recovery, and utilities included

### Internationalization (i18n)

- **Languages**: English (en), Chinese Simplified (cn), Chinese Traditional (zh)
- **Namespaces**: common, home, booking
- **Translation files**: `public/locales/{lng}/{ns}.json`
- **Usage**: `useTranslation()` hook from `react-i18next`
- **Initialization**: Async initialization in root route `beforeLoad`

### Server Initialization

The crawler scheduler initializes on server start via `src/lib/server-init.ts`:

- Import chain: `src/server-functions/crawler/index.ts` → `@/lib/server-init`
- Scheduler starts automatically in development mode
- Uses environment variables for configuration

## Common Workflows

### Adding a New Route

1. Create file in `src/routes/` (e.g., `about.tsx`)
2. TanStack Router auto-generates route tree
3. Use `<Link to="/about">` for navigation

### Modifying Database Schema

1. Edit `prisma/schema.prisma`
2. Run `pnpm db:generate` (regenerates Prisma client)
3. Run `pnpm db:push` (dev) or `pnpm db:migrate` (production)

### Adding UI Components

1. Create component in `src/components/ui/ComponentName.tsx`
2. Follow existing patterns: forwardRef, props interface, displayName
3. Export from `src/components/ui/index.ts`

### Testing Crawler Changes

1. Use mock repository: `MockCrawlRepository` in tests
2. Test file: `src/lib/crawler/*.test.ts`
3. Run: `pnpm test:crawler` for quick crawler testing

### Debugging Crawler Issues

- Check logs: Crawler uses structured logging
- View failed jobs: Query `DeadLetterEntry` table via Prisma Studio
- Check checkpoints: `CrawlCheckpoint` table tracks multi-day progress
- Circuit breaker: Automatic after repeated failures (configurable threshold)

## Important Implementation Details

### Crawler Concurrency

- Max 5 parallel requests (p-queue with concurrency: 5)
- Automatic retry with exponential backoff
- Circuit breaker opens after threshold failures
- Dead letter queue for permanently failed requests

### Session Data Uniqueness

- Database constraint: `@@unique([venueId, facilityCode, date, startTime])`
- Prevents duplicate sessions from re-crawls
- Upsert operation used in data processor

### Checkpoint System

- Enables resumable multi-day crawls
- Stores progress in `CrawlCheckpoint` table
- Automatic recovery on scheduler restart
- Manual checkpoint pruning available (`checkpoint-pruner.ts`)

### Performance Optimizations

- QueryClient caching: 5min stale time, 30min cache retention
- Composite database indexes for common query patterns
- Batch database operations where possible
- Lazy loading of translations (i18next-http-backend)

## File Structure Notes

**Auto-Generated** (do not edit manually):

- `src/generated/prisma/` - Prisma client
- `src/routeTree.gen.ts` - TanStack Router route tree
- `.output/` - Production build

**Static Assets**:

- `public/` - Served at root URL (`/logo.svg`)
- `public/locales/` - Translation files

**Configuration Files**:

- `vite.config.ts` - Vite build config with Tailwind plugin
- `tsconfig.json` - TypeScript with strict mode enabled
- `biome.json` - Linting and formatting rules
- `prisma.config.ts` - Prisma configuration
