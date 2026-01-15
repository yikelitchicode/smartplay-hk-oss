#!/bin/sh
set -e

echo "🚀 Starting SmartPlay HK OSS Application..."
echo "📊 Environment: ${NODE_ENV:-production}"
echo "🔗 Database URL: ${DATABASE_URL:+configured}"
echo ""
echo "⏳ Waiting for database connection..."
sleep 3

echo "📋 Starting Crawler Scheduler (background)..."
# Run the scheduler script in background using tsx
tsx /app/scripts/scheduler.ts &
SCHEDULER_PID=$!

echo "🌐 Starting Web Server (foreground)..."
# Start the web server in foreground
# The scheduler config is already in src/lib/crawler/config.ts
exec node .output/server/index.mjs
