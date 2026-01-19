# SmartPlay Crawler System

Comprehensive documentation for the Hong Kong LCSD SmartPlay facility booking crawler service. Built with TanStack Start, Prisma, and native fetch API.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Components](#components)
- [Setup & Configuration](#setup--configuration)
- [Usage](#usage)
- [Database Schema](#database-schema)
- [Error Handling](#error-handling)
- [Monitoring & Debugging](#monitoring--debugging)
- [Testing](#testing)
- [Performance Optimizations](#performance-optimizations)

## Overview

The crawler system automatically collects facility availability data from the LCSD SmartPlay API and stores it in PostgreSQL for real-time querying by the booking interface.

### Key Features

- ✅ **Automated Crawling**: Cron-based scheduled crawling with configurable intervals
- ✅ **Manual Triggers**: Run crawls on-demand via API endpoints
- ✅ **Retry Logic**: Automatic retry with exponential backoff (3 attempts)
- ✅ **Circuit Breaker**: Prevents cascading failures during API outages
- ✅ **Checkpoint System**: Resumable multi-day crawls with progress tracking
- ✅ **Dead Letter Queue**: Failed request tracking with exponential backoff retry
- ✅ **Data Processing**: Flattens complex nested API responses into relational models
- ✅ **Type-Safe**: Full TypeScript support with Zod validation
- ✅ **Zero Dependencies**: Uses native fetch API instead of axios
- ✅ **Concurrent Processing**: p-queue with max 5 parallel requests

## Architecture

### System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        TanStack Start Server                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Crawler Scheduler (node-cron)                             │ │
│  │  - Automatic execution at configured intervals              │ │
│  │  - Server startup initialization                            │ │
│  └────────────────────────┬───────────────────────────────────┘ │
│                           │                                      │
│  ┌────────────────────────▼───────────────────────────────────┐ │
│  │  Crawler Orchestrator                                      │ │
│  │  - Job management & coordination                            │ │
│  │  - Checkpoint management                                   │ │
│  │  - Concurrency control (p-queue)                           │ │
│  └────────────────────────┬───────────────────────────────────┘ │
│                           │                                      │
│  ┌────────────────────────▼───────────────────────────────────┐ │
│  │  HTTP Client (native fetch)                                │ │
│  │  - Retry logic with exponential backoff                    │ │
│  │  - Circuit breaker pattern                                 │ │
│  │  - Timeout handling                                        │ │
│  └────────────────────────┬───────────────────────────────────┘ │
│                           │                                      │
│                           ▼                                      │
│              ┌─────────────────────┐                            │
│              │  LCSD SmartPlay API │                            │
│              │  (External Service) │                            │
│              └─────────────────────┘                            │
│                           │                                      │
│  ┌────────────────────────▼───────────────────────────────────┐ │
│  │  Data Processor                                            │ │
│  │  - Response validation (Zod)                               │ │
│  │  - Data normalization                                      │ │
│  │  - Entity mapping (Facilities, Sessions)                   │ │
│  └────────────────────────┬───────────────────────────────────┘ │
│                           │                                      │
│  ┌────────────────────────▼───────────────────────────────────┐ │
│  │  Repository Layer (Prisma)                                 │ │
│  │  - Upsert operations                                       │ │
│  │  - Transaction management                                  │ │
│  │  - Dead letter queue handling                              │ │
│  └────────────────────────┬───────────────────────────────────┘ │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────┐
              │   PostgreSQL DB     │
              │  - CrawlJob         │
              │  - ScheduledRun     │
              │  - Checkpoint       │
              │  - Facility         │
              │  - Session          │
              │  - DeadLetterEntry  │
              └─────────────────────┘
                           │
                           ▼
              ┌─────────────────────┐
              │  Booking UI Query   │
              │  (Frontend)         │
              └─────────────────────┘
```

### Data Flow

```
1. SCHEDULER triggers crawl job
   ↓
2. ORCHESTRATOR creates CrawlJob record
   ↓
3. HTTP CLIENT fetches data from LCSD API
   ↓
4. DATA PROCESSOR validates & normalizes response
   ↓
5. REPOSITORY upserts Facilities & Sessions
   ↓
6. ORCHESTRATOR updates CrawlJob status
   ↓
7. BOOKING UI queries available sessions
```

## Components

### 1. Scheduler (`scheduler.ts`)

**Purpose**: Manages automated crawl execution using node-cron.

**Features**:

- Cron-based scheduling with configurable intervals
- Automatic server startup initialization
- Graceful shutdown handling
- Manual trigger support

**Configuration**:

```env
CRAWLER_ENABLED="true"           # Enable/disable scheduler
CRAWLER_INTERVAL="0 */30 * * * *" # Run every 30 minutes
CRAWLER_TIMEZONE="Asia/Hong_Kong" # Timezone for scheduling
```

**Usage**:

```typescript
import { initializeScheduler, shutdownScheduler } from '@/lib/crawler/scheduler';

// Start on server initialization
initializeScheduler();

// Cleanup on shutdown
await shutdownScheduler();
```

### 2. Orchestrator (`orchestrator.ts`)

**Purpose**: Coordinates crawl operations, manages checkpoints, and handles errors.

**Responsibilities**:

- Job lifecycle management (create → execute → complete/fail)
- Checkpoint system for multi-day crawls
- Dead letter queue management
- Concurrency control via p-queue

**Key Functions**:

```typescript
// Execute crawl with configuration
const result = await executeCrawl(config);

// Manual trigger with overrides
const job = await runManualCrawl({
  distCode: ['CW', 'EN'],
  playDate: '2026-01-20',
});

// Checkpoint management
const checkpoint = await loadCheckpoint(districts, dateRange);
await saveCheckpoint(checkpoint);
```

**Concurrency**:

- Max 5 parallel requests (configurable via p-queue)
- Automatic queue management
- Progress tracking

### 3. HTTP Client (`http-client.ts`)

**Purpose**: Makes HTTP requests to LCSD SmartPlay API with resilience features.

**Features**:

- Native fetch API (no axios dependency)
- Automatic retry with exponential backoff
- Circuit breaker pattern
- Timeout handling

**Configuration**:

```typescript
interface HttpClientConfig {
  baseUrl: string;
  timeout: number;        // Default: 30000ms
  retryAttempts: number;  // Default: 3
  retryDelay: number;     // Exponential backoff base
}
```

**Circuit Breaker**:

- Opens after threshold failures (configurable)
- Half-open state for recovery testing
- Automatic reset after cooldown period

**Usage**:

```typescript
import { createHttpClient } from '@/lib/crawler/http-client';

const client = createHttpClient({
  baseUrl: 'https://www.smartplay.lcsd.gov.hk/rest/',
  timeout: 30000,
});

const response = await client.get('/facilities', {
  distCode: 'CW',
  faCode: 'TENC',
});
```

### 4. Data Processor (`data-processor.ts`)

**Purpose**: Validates, normalizes, and transforms API responses.

**Process**:

1. **Validation**: Zod schema validation of API response structure
2. **Normalization**: Flatten nested morning/afternoon/evening structure
3. **Entity Mapping**: Map to Prisma models (Facility, Session)
4. **Deduplication**: Handle duplicate session detection

**API Response Structure**:

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

**Normalized Output**:

- **Facilities**: Unique venue information with geolocation
- **Sessions**: Individual time slot records with availability flags

**Zod Schemas** (`schemas.ts`):

```typescript
const SmartPlayResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  data: z.object({
    morning: ApiResponseDataSchema,
    afternoon: ApiResponseDataSchema,
    evening: ApiResponseDataSchema,
  }),
  timestamp: z.number(),
});
```

### 5. Checkpoint System (`checkpoint.ts`)

**Purpose**: Enables resumable multi-day crawls with progress tracking.

**Features**:

- Track completed districts/date ranges
- Automatic recovery on scheduler restart
- Checkpoint pruning for old data

**Checkpoint Structure**:

```typescript
interface CrawlCheckpoint {
  id: string;
  distCode: string;
  playDate: string;
  completed: boolean;
  sessionCount: number;
  createdAt: DateTime;
  completedAt?: DateTime;
}
```

**Usage**:

```typescript
// Save checkpoint after successful district crawl
await saveCheckpoint({
  distCode: 'CW',
  playDate: '2026-01-20',
  completed: true,
  sessionCount: 150,
});

// Load checkpoints to resume multi-day crawl
const checkpoints = await loadCheckpoint(['CW', 'EN'], dateRange);

// Prune old checkpoints (older than 7 days)
await pruneOldCheckpoints(7);
```

### 6. Dead Letter Queue (`dead-letter-queue.ts`)

**Purpose**: Tracks failed requests with exponential backoff retry mechanism.

**Features**:

- Failed request logging with context
- Automatic retry with increasing delays
- Max retry limit configuration
- Status tracking (PENDING → RETRYING → FAILED)

**Entry Structure**:

```typescript
interface DeadLetterEntry {
  id: string;
  distCode: string;
  playDate: string;
  attemptCount: number;
  lastAttemptAt: DateTime;
  nextRetryAt: DateTime;
  errorMessage: string;
  status: 'PENDING' | 'RETRYING' | 'FAILED' | 'SUCCESS';
}
```

**Retry Logic**:

- Exponential backoff: 2^attempt minutes
- Max attempts: 5 (configurable)
- Automatic cleanup after successful retries

**Usage**:

```typescript
// Add to dead letter queue
await addToDeadLetterQueue({
  distCode: 'CW',
  playDate: '2026-01-20',
  errorMessage: 'ETIMEDOUT',
});

// Process retry queue
await processDeadLetterQueue();

// Get failed entries for analysis
const failed = await getDeadLetterEntries({
  status: 'FAILED',
  limit: 50,
});
```

### 7. Metadata Crawler (`metadata-crawler.ts`)

**Purpose**: Fetches static facility and district metadata.

**Endpoints**:

- Facility list with geolocation
- District information
- Facility type categories

**Usage**:

```typescript
import { crawlFacilityMetadata } from '@/lib/crawler/metadata-crawler';

const facilities = await crawlFacilityMetadata();
// Upserts to Facility table
```

### 8. Circuit Breaker (`circuit-breaker.ts`)

**Purpose**: Implements circuit breaker pattern to prevent cascading failures.

**States**:

- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Circuit tripped, requests fail immediately
- **HALF-OPEN**: Testing if service has recovered

**Configuration**:

```typescript
interface CircuitBreakerConfig {
  failureThreshold: number;  // Trip after N failures (default: 5)
  resetTimeout: number;      // Stay open for N ms (default: 60000)
  monitoringPeriod: number;  // Consider failures in N ms window
}
```

**Usage**:

```typescript
import { circuitBreaker } from '@/lib/crawler/circuit-breaker';

try {
  const response = await circuitBreaker.execute(async () => {
    return await httpClient.get('/endpoint');
  });
} catch (error) {
  if (error instanceof CircuitOpenError) {
    // Circuit is open, fail fast
  }
}
```

### 9. Stats Calculator (`stats-calculator.ts`)

**Purpose**: Calculates availability statistics for UI display.

**Metrics**:

- Total facilities
- Available sessions count
- Utilization percentage
- Peak hour availability

**Usage**:

```typescript
import { calculateVenueStats } from '@/lib/crawler/stats-calculator';

const stats = await calculateVenueStats({
  districtCode: 'CW',
  date: '2026-01-20',
});

// Returns: { totalSessions, availableSessions, utilization, ... }
```

### 10. Session Cleanup (`session-cleanup.ts`)

**Purpose**: Removes outdated session records to manage database size.

**Strategy**:

- Delete sessions older than retention period
- Keep crawl job history for auditing
- Batch deletion for performance

**Usage**:

```typescript
import { cleanupOldSessions } from '@/lib/crawler/session-cleanup';

// Delete sessions older than 30 days
const deleted = await cleanupOldSessions(30);
```

## Setup & Configuration

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

**Required Variables**:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/smartplay"

# Crawler Control
CRAWLER_ENABLED="true"              # Enable/disable scheduler
CRAWLER_INTERVAL="0 */30 * * * *"   # Cron expression
CRAWLER_TIMEZONE="Asia/Hong_Kong"   # Timezone

# Crawler Parameters
CRAWLER_DISTRICTS="CW,EN,SN,WCH"    # Comma-separated districts
CRAWLER_FACILITY_TYPE="TENC"        # Facility type code
CRAWLER_TIMEOUT="30000"             # Request timeout (ms)
CRAWLER_RETRY_ATTEMPTS="3"          # Max retry attempts
CRAWLER_CONCURRENCY="5"             # Max parallel requests

# Circuit Breaker
CIRCUIT_BREAKER_THRESHOLD="5"       # Failures before trip
CIRCUIT_BREAKER_TIMEOUT="60000"     # Time before retry (ms)
```

### 3. Generate Prisma Client

```bash
pnpm db:generate
```

### 4. Push Database Schema

```bash
pnpm db:push
```

### 5. Seed Metadata (Optional)

```bash
pnpm db:seed
```

### 6. Start Development Server

```bash
pnpm dev
```

The scheduler will automatically initialize if `CRAWLER_ENABLED=true`.

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
    playDate: '2026-01-20',
  },
});

// Returns: { success: true, jobId: "clm...", message: "..." }
```

#### Get Crawl History

```typescript
import { getCrawlHistory } from '@/server-functions/crawler';

const history = await getCrawlHistory({
  data: {
    limit: 20,
    status: 'COMPLETED', // Optional filter
  },
});

// Returns: { success: true, data: CrawlJob[] }
```

#### Get Available Sessions

```typescript
import { getAvailableSessions } from '@/server-functions/crawler';

const sessions = await getAvailableSessions({
  data: {
    date: '2026-01-20',
    districtCode: 'CW', // Optional
    venueId: 123,       // Optional
    availableOnly: true, // Optional
  },
});
```

#### Get Facility Statistics

```typescript
import { getFacilityStats } from '@/server-functions/crawler';

const stats = await getFacilityStats({
  data: {
    districtCode: 'CW',
    date: '2026-01-20',
  },
});

// Returns: { totalFacilities, totalSessions, availableSessions, ... }
```

### React Component Example

```tsx
import { createQuery, createMutation } from '@tanstack/react-query';
import { runCrawl, getCrawlHistory } from '@/server-functions/crawler';

function CrawlerDashboard() {
  // Fetch crawl history
  const { data: history } = createQuery({
    queryKey: ['crawlHistory'],
    queryFn: async () => {
      const result = await getCrawlHistory({ data: { limit: 10 } });
      return result.success ? result.data : [];
    },
  });

  // Manual crawl trigger
  const crawlMutation = createMutation({
    mutationFn: async () => {
      const result = await runCrawl({ data: {} });
      return result.success ? result.jobId : null;
    },
    onSuccess: (jobId) => {
      // Invalidate queries to refetch history
      queryClient.invalidateQueries({ queryKey: ['crawlHistory'] });
    },
  });

  return (
    <div>
      <button
        onClick={() => crawlMutation.mutate()}
        disabled={crawlMutation.isPending}
      >
        {crawlMutation.isPending ? 'Crawling...' : 'Run Crawl Now'}
      </button>

      <ul>
        {history?.map((job) => (
          <li key={job.id}>
            {job.playDate} - {job.status} ({job.sessionCount} sessions)
          </li>
        ))}
      </ul>
    </div>
  );
}
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
  sessionCount Int       @default(0)

  results      CrawlResult[]
  sessions     Session[]
}
```

**JobStatus Enum**: `PENDING | RUNNING | COMPLETED | FAILED`

### ScheduledCrawlRun

Multi-day crawl tracking.

```prisma
model ScheduledCrawlRun {
  id              String    @id @default(cuid())
  startDate       DateTime
  endDate         DateTime
  status          RunStatus @default(PENDING)
  totalJobs       Int       @default(0)
  completedJobs   Int       @default(0)
  failedJobs      Int       @default(0)
  startedAt       DateTime?
  completedAt     DateTime?

  jobs            CrawlJob[]
}
```

### Checkpoint

Resumable crawl progress tracking.

```prisma
model CrawlCheckpoint {
  id            String    @id @default(cuid())
  distCode      String
  playDate      String
  completed     Boolean   @default(false)
  sessionCount  Int       @default(0)
  createdAt     DateTime  @default(now())
  completedAt   DateTime?

  @@unique([distCode, playDate])
  @@index([distCode, playDate])
}
```

### DeadLetterEntry

Failed request tracking.

```prisma
model DeadLetterEntry {
  id              String        @id @default(cuid())
  distCode        String
  playDate        String
  attemptCount    Int           @default(0)
  lastAttemptAt   DateTime      @default(now())
  nextRetryAt     DateTime
  errorMessage    String
  status          DeadLetterStatus @default(PENDING)

  @@index([status, nextRetryAt])
}
```

### Session

Individual time slot availability.

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

  @@unique([venueId, facilityCode, date, startTime])
  @@index([venueId, date])
  @@index([date, available])
  @@index([available])
}
```

### Facility

Venue metadata.

```prisma
model Facility {
  id              Int       @id @default(autoincrement())
  name            String
  nameCn          String?
  districtCode    String
  address         String?
  latitude        Float?
  longitude       Float?
  facilityType    FacilityType @relation(fields: [facilityTypeId], references: [id])

  sessions        Session[]
}
```

## Error Handling

### HTTP Errors

**Strategy**: Automatic retry with exponential backoff

```typescript
// Retry logic in http-client.ts
1. Request fails
2. Wait: 2^attempt * baseDelay ms
3. Retry up to maxAttempts (default: 3)
4. If all retries exhausted → Dead Letter Queue
```

**Example**:

```
Attempt 1 fails → Wait 1s → Retry
Attempt 2 fails → Wait 2s → Retry
Attempt 3 fails → Dead Letter Queue
```

### Circuit Breaker Errors

**Trigger**: Consecutive failures exceed threshold

```typescript
// Circuit breaker states
CLOSED → (failures >= threshold) → OPEN
OPEN → (timeout elapsed) → HALF-OPEN
HALF-OPEN → (success) → CLOSED
HALF-OPEN → (failure) → OPEN
```

**Handling**:

```typescript
try {
  const response = await circuitBreaker.execute(request);
} catch (error) {
  if (error instanceof CircuitOpenError) {
    // Circuit is OPEN, fail fast
    logger.warn('Circuit breaker is OPEN, skipping request');
    return;
  }
  throw error;
}
```

### Processing Errors

**Validation Errors** (Zod):

```typescript
// Invalid API response structure
try {
  const data = SmartPlayResponseSchema.parse(response);
} catch (error) {
  logger.error('Invalid API response', { error, response });
  // Mark job as FAILED with validation error
}
```

**Database Errors**:

```typescript
// Transaction rollback on failure
try {
  await prisma.$transaction(async (tx) => {
    await tx.session.createMany({ data: sessions });
  });
} catch (error) {
  logger.error('Database transaction failed', { error });
  // Update CrawlJob with error message
}
```

### Dead Letter Queue

**Automatic Retry**:

```typescript
// Background job processes DLQ
cron.schedule('*/15 * * * *', async () => {
  const entries = await getDeadLetterEntries({
    status: 'PENDING',
    nextRetryAt: { lte: new Date() },
  });

  for (const entry of entries) {
    await retryDeadLetterEntry(entry);
  }
});
```

**Exponential Backoff**:

```
Attempt 1: nextRetryAt = now + 2^1 minutes = 2 min
Attempt 2: nextRetryAt = now + 2^2 minutes = 4 min
Attempt 3: nextRetryAt = now + 2^3 minutes = 8 min
Attempt 4: nextRetryAt = now + 2^4 minutes = 16 min
Attempt 5: nextRetryAt = now + 2^5 minutes = 32 min
```

## Monitoring & Debugging

### Database Queries

**Recent Jobs**:

```sql
SELECT
  id,
  status,
  "distCode",
  "playDate",
  "startedAt",
  "completedAt",
  "sessionCount"
FROM "CrawlJob"
ORDER BY "startedAt" DESC
LIMIT 10;
```

**Failed Jobs**:

```sql
SELECT
  id,
  "distCode",
  "playDate",
  "errorMessage",
  "startedAt"
FROM "CrawlJob"
WHERE status = 'FAILED'
ORDER BY "startedAt" DESC
LIMIT 20;
```

**Job Performance**:

```sql
SELECT
  status,
  COUNT(*) as count,
  AVG("completedAt" - "startedAt") as avg_duration,
  MIN("completedAt" - "startedAt") as min_duration,
  MAX("completedAt" - "startedAt") as max_duration
FROM "CrawlJob"
GROUP BY status;
```

**Dead Letter Queue**:

```sql
SELECT
  "distCode",
  "playDate",
  "attemptCount",
  "errorMessage",
  "nextRetryAt",
  status
FROM "DeadLetterEntry"
WHERE status != 'SUCCESS'
ORDER BY "nextRetryAt" ASC;
```

**Available Sessions**:

```sql
SELECT
  s.date,
  f.name as venue,
  f."districtCode",
  s.startTime,
  s.endTime,
  s.available
FROM "Session" s
JOIN "Facility" f ON s."venueId" = f.id
WHERE s.date = '2026-01-20'
  AND s.available = true
ORDER BY s.date, s.startTime;
```

**Checkpoint Progress**:

```sql
SELECT
  "distCode",
  "playDate",
  completed,
  "sessionCount",
  "createdAt",
  "completedAt"
FROM "CrawlCheckpoint"
ORDER BY "createdAt" DESC;
```

### Prisma Studio

```bash
pnpm db:studio
```

Browse tables:

- **CrawlJob**: View job history and errors
- **DeadLetterEntry**: Monitor failed requests
- **CrawlCheckpoint**: Check multi-day crawl progress
- **Session**: Query available sessions
- **Facility**: View venue metadata

### Logging

**Structured Logging with Pino**:

```typescript
import logger from '@/lib/crawler/logger';

logger.info({
  msg: 'Crawl job started',
  jobId: job.id,
  distCode: config.distCode,
  playDate: config.playDate,
});

logger.error({
  msg: 'Crawl job failed',
  jobId: job.id,
  error: error.message,
  stack: error.stack,
});
```

**Log Levels**:

- `trace`: Detailed debugging
- `debug`: Development information
- `info`: General operational messages
- `warn`: Warning conditions
- `error`: Error conditions
- `fatal`: Critical failures

## Testing

### Test Files

- `src/lib/crawler/crawler.test.ts` - Core crawler functionality
- `src/lib/crawler/scheduler-recovery.test.ts` - Scheduler recovery logic
- `src/lib/crawler/session-cleanup.test.ts` - Session cleanup operations

### Running Tests

```bash
# All tests
pnpm test

# Crawler tests only
pnpm test:crawler
```

### Mock Repository

Available in `src/lib/crawler/repositories/mock-repository.ts`:

```typescript
import { MockCrawlRepository } from '@/lib/crawler/repositories/mock-repository';

const mockRepo = new MockCrawlRepository();
// Use in tests instead of Prisma repository
```

### Test Coverage

- ✅ Crawler orchestrator execution
- ✅ Scheduler recovery after restart
- ✅ Session cleanup logic
- ✅ Data processor normalization
- ✅ HTTP client retry logic

## Performance Optimizations

### Concurrency Control

**p-queue Configuration**:

```typescript
import PQueue from 'p-queue';

const queue = new PQueue({
  concurrency: 5, // Max 5 parallel requests
  timeout: 30000, // 30s per request
  throwOnTimeout: true,
});
```

**Benefits**:

- Prevents API rate limiting
- Controls memory usage
- Manages database connection pool

### Database Indexes

**Composite Indexes**:

```prisma
// Venue-specific queries
@@index([venueId, date])

// Availability filtering
@@index([date, available])

// Global availability queries
@@index([available])
```

**Query Performance**:

```sql
EXPLAIN ANALYZE
SELECT * FROM "Session"
WHERE "venueId" = 123 AND "date" = '2026-01-20';
-- Uses: Session_venueId_date_idx (index scan)
```

### Batch Operations

**Bulk Insert**:

```typescript
await prisma.session.createMany({
  data: sessions,
  skipDuplicates: true, // Ignore unique constraint violations
});
```

**Transaction Batching**:

```typescript
await prisma.$transaction(async (tx) => {
  // Multiple operations in single transaction
  await tx.facility.upsert(...);
  await tx.session.createMany(...);
  await tx.crawlJob.update(...);
});
```

### Query Caching

**TanStack Query Configuration**:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 minutes
      gcTime: 30 * 60 * 1000,    // 30 minutes
    },
  },
});
```

### Checkpoint Pruning

**Automatic Cleanup**:

```typescript
// Run daily to remove old checkpoints
cron.schedule('0 2 * * *', async () => {
  await pruneOldCheckpoints(7); // Keep last 7 days
});
```

## Production Deployment

### 1. Environment Configuration

```env
# Production settings
CRAWLER_ENABLED=true
CRAWLER_INTERVAL="0 */30 * * * *"
DATABASE_URL=<production-postgres-url>
NODE_ENV=production

# Performance tuning
CRAWLER_CONCURRENCY=10
CRAWLER_TIMEOUT=60000

# Circuit breaker
CIRCUIT_BREAKER_THRESHOLD=10
CIRCUIT_BREAKER_TIMEOUT=120000
```

### 2. Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to production
DATABASE_URL=<production-url> pnpm db:push

# Seed metadata
DATABASE_URL=<production-url> pnpm db:seed
```

### 3. Build & Deploy

```bash
# Build application
pnpm build

# Start production server
NODE_ENV=production node .output/server/index.mjs
```

### 4. Monitoring

**Health Checks**:

```typescript
// Endpoint: /api/health
{
  status: 'ok',
  scheduler: 'running',
  lastCrawl: '2026-01-20T10:30:00Z',
  deadLetterQueue: 5,
}
```

**Metrics to Track**:

- Crawl job success rate
- Average crawl duration
- Dead letter queue size
- Circuit breaker state
- Database query performance

## Troubleshooting

### Crawler Not Running

**Symptoms**: No jobs being created, scheduler not triggering

**Diagnosis**:

```bash
# Check environment
echo $CRAWLER_ENABLED  # Should be "true"

# Check logs
tail -f logs/crawler.log  # Look for initialization errors

# Check database
psql $DATABASE_URL -c "SELECT * FROM \"CrawlJob\" ORDER BY \"startedAt\" DESC LIMIT 5;"
```

**Solutions**:

1. Verify `CRAWLER_ENABLED=true`
2. Check cron expression validity: <https://crontab.guru/>
3. Restart server to reinitialize scheduler
4. Check database connection

### API Request Failing

**Symptoms**: High dead letter queue count, timeout errors

**Diagnosis**:

```sql
SELECT COUNT(*) FROM "DeadLetterEntry" WHERE status = 'FAILED';

SELECT "errorMessage", COUNT(*) as count
FROM "DeadLetterEntry"
WHERE "createdAt" > NOW() - INTERVAL '1 hour'
GROUP BY "errorMessage";
```

**Solutions**:

1. Check network connectivity: `curl https://www.smartplay.lcsd.gov.hk`
2. Increase timeout: `CRAWLER_TIMEOUT=60000`
3. Reduce concurrency: `CRAWLER_CONCURRENCY=3`
4. Check circuit breaker state

### Database Issues

**Symptoms**: Transaction errors, constraint violations

**Diagnosis**:

```bash
# Check connection
psql $DATABASE_URL -c "SELECT 1;"

# Check table sizes
psql $DATABASE_URL -c "
  SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

**Solutions**:

1. Verify `DATABASE_URL` is correct
2. Run `pnpm db:push` to sync schema
3. Check database permissions
4. Review Prisma logs: `LOG_LEVEL=debug pnpm dev`

### High Memory Usage

**Symptoms**: OOM errors, slow performance

**Diagnosis**:

```bash
# Check memory usage
ps aux | grep node

# Check session count
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Session\";"
```

**Solutions**:

1. Run session cleanup: `await cleanupOldSessions(30)`
2. Reduce concurrency: `CRAWLER_CONCURRENCY=3`
3. Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096`
4. Enable checkpoint pruning

## Contributing

This crawler system is part of the SmartPlay HK OSS project. Contributions welcome!

**Areas for Improvement**:

- Additional facility types beyond tennis
- Enhanced error recovery strategies
- Real-time webhook notifications
- Advanced analytics and reporting
- Multi-region crawling support

## License

MIT

---

**Built for the Hong Kong community** 🇭🇰
