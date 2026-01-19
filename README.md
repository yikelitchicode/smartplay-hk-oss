# SmartPlay HK OSS

A modern web application for tracking and booking sports facility availability across Hong Kong's LCSD SmartPlay system. Built with TanStack Start, featuring automated crawling, real-time availability tracking, and multi-language support.

## Features

- **Automated Facility Crawling**: Periodic data collection from LCSD SmartPlay API with configurable scheduling
- **Real-Time Availability**: Live session availability tracking across multiple facilities and districts
- **Multi-Language Support**: English, Simplified Chinese, and Traditional Chinese
- **Modern UI**: Accessible components built with Base UI React and Tailwind CSS
- **Type-Safe**: Full TypeScript with Zod validation
- **Booking System**: Advanced filtering, date selection, and venue search capabilities

## Tech Stack

### Core Framework

- **TanStack Start** (v1.150.0) - Full-stack React framework with SSR
- **React** (v19.2.3) - UI library
- **TypeScript** (v5.9.3) - Type-safe development
- **Vite** (v7.3.1) - Build tool and dev server

### Database & ORM

- **Prisma** (v7.2.0) - Type-safe database ORM
- **PostgreSQL** - Production database with pg adapter
- **Prisma Studio** - Database browser and editor

### UI & Styling

- **Tailwind CSS** (v4.1.18) - Utility-first CSS framework
- **Base UI React** (v1.1.0) - Accessible headless UI components
- **Lucide React** - Icon library

### State Management & Data Fetching

- **TanStack Query** (v5.90.17) - Server state management
- **TanStack Form** (v1.27.7) - Form state management
- **TanStack Router SSR Query** - Seamless data loading

### Internationalization

- **i18next** (v25.7.4) - Internationalization framework
- **react-i18next** (v16.5.3) - React bindings
- **i18next-http-backend** - Lazy loading translations
- **chinese-conv** - Chinese conversion utilities

### Crawler & Background Jobs

- **node-cron** (v4.2.1) - Cron-based job scheduling
- **p-queue** (v9.1.0) - Concurrency control for crawl operations
- **Pino** (v10.2.0) - Structured logging

### Development Tools

- **Biome** (v2.3.11) - Linting and formatting
- **Vitest** (v4.0.17) - Testing framework
- **Testing Library** (v16.3.1) - Component testing
- **pnpm** - Fast, disk space efficient package manager

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database
- `.env.local` configuration file

### Installation

1. **Clone and install dependencies**

```bash
git clone <repository-url>
cd smartplay-hk-oss
pnpm install
```

1. **Configure environment variables**

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/smartplay"

# Server
PORT=3000

# Crawler
CRAWLER_ENABLED="true"
CRAWLER_INTERVAL="0 */30 * * * *"
CRAWLER_DISTRICTS="CW,EN,SN,WCH"
CRAWLER_FACILITY_TYPE="TENC"
CRAWLER_TIMEOUT="30000"
```

1. **Initialize database**

```bash
pnpm db:generate  # Generate Prisma client
pnpm db:push      # Push schema to database
pnpm db:seed      # Seed initial data (optional)
```

1. **Start development server**

```bash
pnpm dev
```

Visit `http://localhost:3000` to see the application.

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

### Database

```bash
pnpm db:generate      # Generate Prisma client from schema
pnpm db:push          # Push schema changes (development)
pnpm db:migrate       # Create and apply migrations (production)
pnpm db:studio        # Open Prisma Studio database browser
pnpm db:seed          # Seed database with initial data
pnpm db:reset         # Force reset database (DESTRUCTIVE)
```

## Project Architecture

### Full-Stack Structure

TanStack Start provides SSR capabilities with unified frontend and backend:

```
┌─────────────────────────────────────────────────────────────┐
│                      TanStack Start App                      │
│  ┌────────────────────┐  ┌────────────────────────────────┐ │
│  │  React UI          │  │  Nitro Server                  │ │
│  │  - Routes          │  │  - Server Functions            │ │
│  │  - Components      │  │  - Crawler Scheduler           │ │
│  │  - State (Query)   │  │  - API Endpoints               │ │
│  └────────────────────┘  └────────────────────────────────┘ │
│                               │                              │
│                    ┌──────────┴──────────┐                  │
│                    │  Prisma Client     │                  │
│                    └──────────┬──────────┘                  │
└──────────────────────────────┼──────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   PostgreSQL DB     │
                    └─────────────────────┘
```

### Key Systems

#### 1. Crawler System (`src/lib/crawler/`)

Automated web crawling service for facility availability data.

**Components**:

- `orchestrator.ts` - Manages crawl operations with concurrency control
- `scheduler.ts` - Cron-based job scheduling with node-cron
- `http-client.ts` - HTTP client with retry logic and circuit breaker
- `data-processor.ts` - Normalizes API responses to database models
- `checkpoint.ts` - Checkpoint system for resumable multi-day crawls
- `dead-letter-queue.ts` - Failed request tracking with retry
- `metadata-crawler.ts` - Fetches facility/district metadata
- `circuit-breaker.ts` - Circuit breaker pattern for API resilience
- `stats-calculator.ts` - Availability statistics calculation

**Data Flow**:

```
Scheduler → Orchestrator → HTTP Client → LCSD API
                ↓
         Data Processor
                ↓
         Prisma Repository → PostgreSQL
```

#### 2. Booking System (`src/lib/booking/`)

Frontend business logic for facility availability display and filtering.

**Modules**:

- `hooks/` - Custom React hooks (useBookingFilters, useBookingStats)
- `filter-venues.ts` - Multi-criteria filtering (district, facility, search)
- `calculate-stats.ts` - Availability statistics and sorting
- `utils.ts` - Date/time utilities and theming
- `venue-utils.ts` - Venue display and filtering helpers

#### 3. Server Functions (`src/server-functions/`)

TanStack Start server functions bridging frontend and backend.

**Endpoints**:

- `crawler/runCrawl` - Manually trigger crawl jobs
- `crawler/getCrawlHistory` - Fetch crawl job history
- `crawler/getAvailableSessions` - Query sessions by date
- `booking/` - Booking-related operations

#### 4. UI Components (`src/components/`)

**Headless UI Library** (`components/ui/`):
Built with Base UI React primitives for full accessibility:

- Form Controls: `Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`
- Overlays: `Modal`, `Drawer`, `Tooltip`
- Feedback: `Alert`, `Badge`, `Progress`
- Navigation: `NavigationList`

All components use `React.forwardRef` for ref forwarding and export TypeScript interfaces for props.

**Routing** (`src/routes/`):
File-based routing with TanStack Router:

- `__root.tsx` - Root layout with providers (QueryClient, I18next)
- Route files auto-generate `routeTree.gen.ts`
- Use `<Outlet />` for nested route content
- Use `Link` from `@tanstack/react-router` for navigation

### Database Schema

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

## Development Patterns

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

### Adding Routes

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

## Internationalization (i18n)

**Languages**: English (en), Chinese Simplified (cn), Chinese Traditional (zh)

**Translation files**: `src/locales/{lng}/{ns}.json`

**Usage**:

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t('common:welcome')}</h1>;
}
```

Initialization happens in root route `beforeLoad` with lazy loading via `i18next-http-backend`.

## Testing

**Framework**: Vitest with Testing Library

**Test location**: `__tests__/` directories next to source files

**Mock repository**: Available in `src/lib/crawler/repositories/mock-repository.ts`

**Test coverage**:

- Crawler functionality and scheduler recovery
- Session cleanup operations
- Utility functions

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `CRAWLER_ENABLED` | Enable/disable scheduled crawls | `true` |
| `CRAWLER_INTERVAL` | Cron expression for scheduling | `0 */30 * * * *` |
| `CRAWLER_DISTRICTS` | Comma-separated district codes | `CW,EN,SN,WCH` |
| `CRAWLER_FACILITY_TYPE` | Facility type code | `TENC` |
| `CRAWLER_TIMEOUT` | API request timeout (ms) | `30000` |
| `CRAWLER_RETRY_ATTEMPTS` | Number of retry attempts | `3` |
| `PORT` | Server port | `3000` |

### Crawler Configuration

The crawler uses environment variables for runtime configuration:

```typescript
// Load config
import { loadConfig } from '@/lib/crawler/config';

const config = loadConfig();

// Override for specific run
import { getConfigWithOverrides } from '@/lib/crawler/config';
const customConfig = getConfigWithOverrides({
  distCode: ['CW', 'EN'],
  playDate: '2026-01-20',
});
```

## API Integration

The application integrates with the LCSD SmartPlay API:

- **Base URL**: `https://www.smartplay.lcsd.gov.hk/rest/`
- **Endpoints**: Facility availability, venue metadata
- **Response Format**: Nested JSON with morning/afternoon/evening sessions
- **Rate Limiting**: Concurrency controlled via p-queue (max 5 parallel)
- **Error Handling**: Circuit breaker + exponential backoff retry

## Performance Optimizations

- **QueryClient Caching**: 5min stale time, 30min cache retention
- **Composite Database Indexes**: Optimized for common query patterns
- **Batch Operations**: Database operations batched where possible
- **Lazy Loading**: Translations loaded on-demand
- **Concurrency Control**: Max 5 parallel API requests

## Production Deployment

1. **Set production environment variables**

```env
CRAWLER_ENABLED=true
DATABASE_URL=<production-database-url>
NODE_ENV=production
```

1. **Build application**

```bash
pnpm build
```

1. **Push database schema**

```bash
DATABASE_URL=<production-url> pnpm db:push
# OR for production:
DATABASE_URL=<production-url> pnpm db:migrate
```

1. **Start server**

```bash
node .output/server/index.mjs
```

The scheduler will automatically start when the server initializes.

## Monitoring & Debugging

### View Crawl Jobs

```sql
-- Recent jobs
SELECT * FROM "CrawlJob"
ORDER BY "startedAt" DESC
LIMIT 10;

-- Failed jobs
SELECT * FROM "CrawlJob"
WHERE status = 'FAILED'
ORDER BY "startedAt" DESC;

-- Job statistics
SELECT status, COUNT(*) as count,
  AVG("completedAt" - "startedAt") as avg_duration
FROM "CrawlJob"
GROUP BY status;
```

### Prisma Studio

```bash
pnpm db:studio
```

Browse database, view failed jobs, check checkpoints, and inspect sessions.

### Logs

Crawler uses structured logging with Pino:

- Check logs for crawl initialization
- DeadLetterEntry table tracks failed requests
- Checkpoint table shows multi-day crawl progress

## Troubleshooting

### Crawler Not Running

1. Check `CRAWLER_ENABLED=true` in environment
2. Verify cron expression is valid
3. Check server logs for initialization errors
4. Ensure database connection is working

### API Request Failing

1. Check network connectivity to smartplay.lcsd.gov.hk
2. Verify API endpoint is accessible
3. Increase timeout: `CRAWLER_TIMEOUT=60000`
4. Check DeadLetterEntry table for failure details

### Database Issues

1. Verify `DATABASE_URL` is correct
2. Run `pnpm db:push` to ensure schema is current
3. Check database permissions
4. Review Prisma logs

## Documentation

- **README.md** - This file, main project documentation
- **README-CRAWLER.md** - Detailed crawler system documentation
- **CLAUDE.md** - Project-specific guidance for Claude Code
- **src/components/ui/README.md** - UI component library documentation

## Contributing

This is an open-source project for the Hong Kong community. Contributions welcome!

Please:

1. Follow the code style guidelines
2. Run `pnpm check` before committing
3. Add tests for new features
4. Update documentation as needed

## License

MIT

---

**Built with** ❤️ **for the Hong Kong community using TanStack Start**
