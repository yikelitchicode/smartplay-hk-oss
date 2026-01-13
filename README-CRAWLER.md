# SmartPlay Crawler Service

A configurable HTTP crawler service for the Hong Kong LCSD SmartPlay facility booking API. Built with TanStack Start, Prisma, and native fetch API.

## Features

- ✅ **Automated Crawling**: Cron-based scheduled crawling (configurable interval)
- ✅ **Manual Triggers**: Run crawls on-demand via API
- ✅ **Retry Logic**: Automatic retry with exponential backoff
- ✅ **Data Processing**: Flattens complex nested API responses
- ✅ **PostgreSQL Storage**: Prisma ORM with type-safe database operations
- ✅ **Job Tracking**: Complete audit trail of all crawl operations
- ✅ **Type-Safe**: Full TypeScript support with Zod validation
- ✅ **Zero Dependencies**: Uses native fetch API instead of axios

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      TanStack Start App                       │
│  ┌──────────────────┐  ┌──────────────────────────────────┐ │
│  │  React UI        │  │  Server Functions                │ │
│  │  - Dashboard     │  │  - runCrawl()                    │ │
│  │  - Controls      │  │  - getCrawlHistory()             │ │
│  │  - Results View  │  │  - getAvailableSessions()         │ │
│  └──────────────────┘  │  - getFacilityStats()            │ │
│                        └──────────────────────────────────┘ │
│                                       │                       │
│                          ┌────────────┴────────────┐        │
│                          │  Crawler Scheduler       │        │
│                          │  (Cron Jobs)             │        │
│                          └────────────┬────────────┘        │
│                                        │                       │
│                          ┌────────────┴────────────┐        │
│                          │  Crawler Orchestrator   │        │
│                          │  - HTTP Client           │        │
│                          │  - Data Processor        │        │
│                          │  - Database Operations    │        │
│                          └────────────┬────────────┘        │
└───────────────────────────────────┼─────────────────────────┘
                                    ▼
                    ┌───────────────────────────────┐
                    │  PostgreSQL + Prisma          │
                    │  - CrawlJob                   │
                    │  - CrawlResult                │
                    │  - Facility                   │
                    │  - Session                    │
                    └───────────────────────────────┘
                                    ▼
                    ┌───────────────────────────────┐
                    │  LCSD SmartPlay API           │
                    │  https://www.smartplay.lcsd.  │
                    │  gov.hk/rest/facility-...     │
                    └───────────────────────────────┘
```

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Create a `.env.local` file based on `.env.example`:

```bash
cp .env.example .env.local
```

Update the values in `.env.local`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/smartplay"

# Crawler
CRAWLER_ENABLED="true"
CRAWLER_INTERVAL="0 */30 * * * *"
CRAWLER_DISTRICTS="CW,EN,SN,WCH"
CRAWLER_FACILITY_TYPE="TENC"
```

### 3. Generate Prisma Client

```bash
pnpm db:generate
```

### 4. Push Database Schema

```bash
pnpm db:push
```

### 5. Start Development Server

```bash
pnpm dev
```

## Project Structure

```
src/
├── lib/crawler/
│   ├── types.ts              # TypeScript type definitions
│   ├── config.ts             # Configuration with environment variables
│   ├── http-client.ts        # HTTP client using fetch API
│   ├── data-processor.ts     # Response transformation logic
│   ├── orchestrator.ts       # Job coordination and database operations
│   ├── scheduler.ts          # Cron-based scheduling
│   ├── index.ts              # Module exports
│   └── server-init.ts        # Server initialization
├── server-functions/
│   └── crawler/
│       └── index.ts          # TanStack Start API routes
└── routes/
    └── crawler/              # UI pages (to be implemented)

prisma/
└── schema.prisma             # Database schema with crawler models
```

## Usage

### Server Functions (API Endpoints)

#### Manual Crawl Trigger

```typescript
import { runCrawl } from '@/server-functions/crawler';

// Run with default config
const result = await runCrawl({ data: {} });

// Run with custom parameters
const result = await runCrawl({
  data: {
    distCode: ['CW', 'EN'],
    faCode: 'TENC',
    playDate: '2026-01-15',
  },
});

// Returns: { success: true, jobId: "clm...", message: "..." }
```

#### Get Crawl History

```typescript
import { getCrawlHistory } from '@/server-functions/crawler';

const history = await getCrawlHistory({ data: { limit: 20 } });

// Returns: { success: true, data: [...] }
```

#### Get Available Sessions

```typescript
import { getAvailableSessions } from '@/server-functions/crawler';

const sessions = await getAvailableSessions({
  data: {
    date: '2026-01-15',
    districtCode: 'CW', // Optional
  },
});
```

#### Get Facility Statistics

```typescript
import { getFacilityStats } from '@/server-functions/crawler';

const stats = await getFacilityStats({ data: {} });

// Returns: { success: true, data: { totalFacilities, totalSessions, ... } }
```

### React Component Example

```tsx
import { createQuery, createMutation } from '@tanstack/react-query';
import { runCrawl, getCrawlHistory } from '@/server-functions/crawler';

function CrawlerDashboard() {
  // Fetch crawl history
  const { data: history } = createQuery({
    fn: getCrawlHistory,
    args: [{ data: { limit: 10 } }],
  });

  // Manual crawl trigger
  const crawlMutation = createMutation({
    fn: runCrawl,
  });

  return (
    <div>
      <button
        onClick={() => crawlMutation.mutate({ data: {} })}
        disabled={crawlMutation.isPending}
      >
        {crawlMutation.isPending ? 'Crawling...' : 'Run Crawl Now'}
      </button>

      <ul>
        {history?.data.map((job) => (
          <li key={job.id}>
            {job.playDate} - {job.status} ({job.sessionCount} sessions)
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CRAWLER_ENABLED` | Enable/disable automatic crawling | `true` |
| `CRAWLER_INTERVAL` | Cron expression for schedule | `0 */30 * * * *` |
| `CRAWLER_TIMEZONE` | Timezone for cron jobs | `Asia/Hong_Kong` |
| `CRAWLER_DISTRICTS` | Comma-separated district codes | `CW,EN,SN,WCH` |
| `CRAWLER_FACILITY_TYPE` | Facility type code | `TENC` |
| `CRAWLER_PLAY_DATE` | Specific date to crawl | Today |
| `CRAWLER_TIMEOUT` | API request timeout (ms) | `30000` |
| `CRAWLER_RETRY_ATTEMPTS` | Number of retry attempts | `3` |

### Programmatic Configuration

```typescript
import { loadConfig, getConfigWithOverrides } from '@/lib/crawler';

// Load default config
const config = loadConfig();

// Override parameters for specific run
const customConfig = getConfigWithOverrides({
  distCode: ['CW', 'EN'],
  playDate: '2026-01-20',
});
```

## Database Schema

### CrawlJob
Tracks individual crawl executions.

```prisma
model CrawlJob {
  id           String    @id @default(cuid())
  status       JobStatus @default(PENDING)
  distCode     String
  faCode       String
  playDate     String
  startedAt    DateTime  @default(now())
  completedAt  DateTime?
  errorMessage String?

  results      CrawlResult[]
  sessions     Session[]
}
```

### Session
Individual time slot availability records.

```prisma
model Session {
  id              String     @id
  crawlJobId      String
  venueId         Int
  date            DateTime
  startTime       String
  endTime         String
  available       Boolean
  isPeakHour      Boolean
  isOpen          Boolean

  venue           Facility   @relation(fields: [venueId], references: [id])
  crawlJob        CrawlJob   @relation(fields: [crawlJobId], references: [id])
}
```

## API Response Structure

The SmartPlay API returns nested data:

```typescript
{
  code: "0",
  message: "success",
  data: {
    morning: { distList: [...] },
    afternoon: { distList: [...] },
    evening: { distList: [...] },
    venueCountList: [...]
  },
  timestamp: 1768299402978
}
```

The crawler flattens this into:

- **Facilities**: Unique venue information
- **Sessions**: Individual time slot records with availability

## Error Handling

### HTTP Errors
- Automatic retry with exponential backoff
- Configurable retry attempts and delay
- Detailed error logging

### Processing Errors
- Validation of API response structure
- Graceful handling of malformed data
- Error tracking in CrawlJob records

### Database Errors
- Transaction rollback on failure
- Detailed error messages in job records

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
SELECT
  status,
  COUNT(*) as count,
  AVG("completedAt" - "startedAt") as avg_duration
FROM "CrawlJob"
GROUP BY status;
```

### View Available Sessions

```sql
-- Available sessions by date
SELECT
  s.date,
  f.name as venue,
  f."districtCode",
  s.startTime,
  s.endTime,
  s.available
FROM "Session" s
JOIN "Facility" f ON s."venueId" = f.id
WHERE s.date = '2026-01-15'
  AND s.available = true
ORDER BY s.date, s.startTime;
```

## Development

### Run Database Migrations

```bash
pnpm db:migrate
```

### Open Prisma Studio

```bash
pnpm db:studio
```

### Run Tests

```bash
pnpm test
```

## Production Deployment

1. **Set Production Environment Variables**

```env
CRAWLER_ENABLED=true
DATABASE_URL=<production-database-url>
```

2. **Build Application**

```bash
pnpm build
```

3. **Push Database Schema**

```bash
DATABASE_URL=<production-url> pnpm db:push
```

4. **Start Server**

The scheduler will automatically start when the server initializes.

## Troubleshooting

### Crawler Not Running

1. Check if scheduler is enabled: `CRAWLER_ENABLED=true`
2. Verify cron expression is valid
3. Check server logs for initialization errors
4. Ensure database connection is working

### API Request Failing

1. Check network connectivity to smartplay.lcsd.gov.hk
2. Verify API endpoint is accessible
3. Increase timeout: `CRAWLER_TIMEOUT=60000`
4. Check response logs for error details

### Database Issues

1. Verify `DATABASE_URL` is correct
2. Run `pnpm db:push` to ensure schema is up to date
3. Check database permissions
4. Review Prisma logs

## License

MIT

## Contributing

This is an open-source project for the Hong Kong community. Contributions welcome!
