#!/bin/bash

# Manual deployment script for SmartPlay HK OSS
# This script deploys the application to a remote machine

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REMOTE_HOST="${SSH_HOST:-}"
REMOTE_USER="${SSH_USER:-}"
REMOTE_DIR="${REMOTE_DIR:-~/smartplay-app}"
REGISTRY="ghcr.io"
IMAGE_NAME="${IMAGE_NAME:-smartplay-hk-oss}"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_env_vars() {
    log_info "Checking environment variables..."

    if [ -z "$REMOTE_HOST" ]; then
        log_error "SSH_HOST is not set"
        exit 1
    fi

    if [ -z "$REMOTE_USER" ]; then
        log_error "SSH_USER is not set"
        exit 1
    fi

    if [ -z "$GITHUB_TOKEN" ] && [ -z "$GH_PAT" ]; then
        log_error "GITHUB_TOKEN or GH_PAT is not set"
        exit 1
    fi

    log_info "Environment variables check passed"
}

setup_ssh() {
    log_info "Setting up SSH connection..."

    # Check if SSH key exists
    if [ ! -f ~/.ssh/id_rsa ]; then
        if [ -n "$SSH_PRIVATE_KEY" ]; then
            mkdir -p ~/.ssh
            echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa_deploy
            chmod 600 ~/.ssh/id_rsa_deploy
            SSH_KEY_PATH="~/.ssh/id_rsa_deploy"
        else
            log_error "No SSH key found. Set SSH_PRIVATE_KEY environment variable"
            exit 1
        fi
    else
        SSH_KEY_PATH="~/.ssh/id_rsa"
    fi

    # Add host to known_hosts
    ssh-keyscan -H "$REMOTE_HOST" >> ~/.ssh/known_hosts 2>/dev/null || true

    log_info "SSH setup completed"
}

create_env_file() {
    log_info "Creating .env file on remote machine..."

    ssh "$REMOTE_USER@$REMOTE_HOST" "mkdir -p $REMOTE_DIR"

    # Create .env file from environment variables
    ssh "$REMOTE_USER@$REMOTE_HOST" "cat > $REMOTE_DIR/.env << 'EOF'
# Database Configuration
DATABASE_URL=${DATABASE_URL}

# Node Environment
NODE_ENV=production

# Crawler Configuration
CRAWLER_ENABLED=${CRAWLER_ENABLED:-true}
CRAWLER_INTERVAL=${CRAWLER_INTERVAL:-*/30 * * * *}
CRAWLER_DISTRICTS=${CRAWLER_DISTRICTS:-CW,EN,SN,WCH}
CRAWLER_FACILITY_TYPE=${CRAWLER_FACILITY_TYPE:-TENC}
EOF"

    log_info ".env file created"
}

deploy() {
    log_info "Starting deployment to $REMOTE_USER@$REMOTE_HOST..."

    # Copy docker-compose.yml
    log_info "Copying docker-compose.yml..."
    scp docker-compose.yml "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"

    # Execute deployment commands on remote machine
    log_info "Executing deployment commands..."
    ssh "$REMOTE_USER@$REMOTE_HOST" << ENDSSH
        set -e
        cd $REMOTE_DIR

        # Login to GitHub Container Registry
        log_info "Logging in to GitHub Container Registry..."
        echo "${GITHUB_TOKEN:-$GH_PAT}" | docker login $REGISTRY -u ${GITHUB_ACTOR:-$GITHUB_USERNAME} --password-stdin

        # Pull latest image
        log_info "Pulling latest Docker image..."
        docker compose pull

        # Stop old containers and start new ones
        log_info "Restarting containers..."
        docker compose up -d --remove-orphans

        # Run database migrations
        log_info "Running database migrations..."
        docker compose exec -T app npx prisma migrate deploy

        # Clean up old images
        log_info "Cleaning up old images..."
        docker image prune -af --filter "until=24h"

        log_info "Deployment completed successfully!"
ENDSSH

    log_info "Deployment successful!"
}

health_check() {
    log_info "Running health check..."

    sleep 5

    if [ -n "$DEPLOY_URL" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL" || echo "000")

        if [ "$response" = "200" ]; then
            log_info "Health check passed with status: $response"
        else
            log_warn "Health check returned status: $response"
        fi
    else
        log_warn "DEPLOY_URL not set, skipping health check"
    fi
}

cleanup() {
    log_info "Cleaning up temporary files..."

    if [ -f ~/.ssh/id_rsa_deploy ]; then
        rm -f ~/.ssh/id_rsa_deploy
    fi

    log_info "Cleanup completed"
}

main() {
    log_info "Starting deployment process..."

    check_env_vars
    setup_ssh
    create_env_file
    deploy
    health_check
    cleanup

    log_info "Deployment process completed!"
}

# Handle script interruption
trap cleanup EXIT INT TERM

# Run main function
main "$@"
