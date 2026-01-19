#!/bin/sh
set -e

echo "🚀 Starting SmartPlay HK OSS Application..."
echo "📊 Environment: ${NODE_ENV:-production}"
echo "🔗 Database URL: ${DATABASE_URL:+configured}"
echo ""

# Function to wait for database
wait_for_db() {
    echo "⏳ Waiting for database connection..."

    # Extract host and port from DATABASE_URL
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

    # Default values if parsing fails
    DB_HOST=${DB_HOST:-postgres}
    DB_PORT=${DB_PORT:-5432}

    echo "   Host: ${DB_HOST}"
    echo "   Port: ${DB_PORT}"

    # Wait for database to be ready
    max_tries=30
    try=0
    while [ $try -lt $max_tries ]; do
        if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
            echo "✅ Database is ready!"
            return 0
        fi
        try=$((try + 1))
        echo "   Waiting... ($try/$max_tries)"
        sleep 2
    done

    echo "❌ ERROR: Database connection timeout after ${max_tries} attempts"
    exit 1
}

# Function to run Prisma migrations
run_migrations() {
    echo "📋 Running database migrations..."
    if npx prisma migrate deploy; then
        echo "✅ Migrations completed successfully"
    else
        echo "⚠️  WARNING: Migration failed or no migrations to run"
        echo "   Continuing startup anyway..."
    fi
}

# Function to start the application
start_app() {
    echo ""
    echo "📋 Starting Crawler Scheduler (background)..."
    # Run the scheduler script in background using tsx
    tsx /app/scripts/scheduler.ts &
    SCHEDULER_PID=$!
    echo "   Scheduler PID: ${SCHEDULER_PID}"

    echo ""
    echo "🌐 Starting Web Server (foreground)..."
    # Start the web server in foreground
    exec node .output/server/index.mjs
}

# Main execution flow
wait_for_db
run_migrations
start_app
