# CI/CD Pipeline Documentation

This directory contains GitHub Actions workflows for automated testing, building, and deploying the SmartPlay HK OSS application.

## Workflows

### CI/CD Pipeline (`ci-cd.yml`)

Automated pipeline that runs on every push and pull request to the `main` branch.

#### Jobs

**1. Test & Quality Checks**

- Runs on: `ubuntu-latest`
- Node version: `24`
- Steps:
  - Checkout code
  - Setup pnpm and Node.js
  - Install dependencies
  - Run Biome linter
  - Run TypeScript type check
  - Run tests
  - Generate Prisma Client

**2. Build Docker Image**

- Runs on: `ubuntu-latest`
- Needs: `test` job
- Permissions: `contents: read`, `packages: write`
- Platform: `linux/amd64` only
- Steps:
  - Setup Docker Buildx
  - Login to GitHub Container Registry (GHCR)
  - Extract metadata (tags, labels)
  - Build and push Docker image with caching

**3. Deploy to Production**

- Runs on: `ubuntu-latest`
- Needs: `build` job
- Condition: Only on `main` branch pushes
- Steps:
  - Setup SSH connection
  - Create `.env.docker` file on remote server
  - Copy `docker-compose.yml` to remote server
  - Deploy using Docker Compose
  - Health check (optional)

## Required GitHub Secrets

Configure these secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

### Database & Application

- **`DATABASE_URL`**: PostgreSQL connection string
  - Format: `postgresql://user:password@host:port/database`
  - Example: `postgresql://smartplay:your_password@postgres:5432/smartplay`

- **`DEPLOY_URL`**: Production application URL
  - Example: `https://smartplay.hk`
  - Used for health checks and BASE_URL configuration

### SSH Connection

- **`SSH_PRIVATE_KEY`**: Private SSH key for remote server access
  - Generate: `ssh-keygen -t rsa -b 4096`
  - Add public key to remote server's `~/.ssh/authorized_keys`
  - Copy private key content to this secret

- **`SSH_HOST`**: Remote server hostname or IP
  - Example: `192.168.1.100` or `server.example.com`

- **`SSH_USER`**: SSH username for remote server
  - Example: `ubuntu`, `root`, or deploy user

### Cloudflare Turnstile (Bot Protection)

- **`TURNSTILE_SITE_KEY`**: Cloudflare Turnstile site key
  - Get from: [Cloudflare Dashboard](https://dash.cloudflare.com/)
  - Public key used in client-side validation

- **`TURNSTILE_SECRET_KEY`**: Cloudflare Turnstile secret key
  - Get from: [Cloudflare Dashboard](https://dash.cloudflare.com/)
  - Secret key used for server-side validation

### Optional

- **`GITHUB_TOKEN`**: Automatically provided by GitHub Actions
  - Used for GHCR authentication
  - No manual configuration needed

## Deployment Process

### Automatic Deployment

1. Push to `main` branch
2. CI runs tests and quality checks
3. Docker image built and pushed to GHCR
4. Deployment triggered automatically:
   - SSH connects to remote server
   - Creates `.env.docker` with secrets
   - Pulls latest Docker image
   - Restarts containers with migrations
   - Runs health check

### Manual Deployment

Use `workflow_dispatch` trigger:

```bash
# Via GitHub UI:
# Actions > CI/CD Pipeline > Run workflow > Select branch
```

## Docker Image Tags

Images are tagged with:

- `latest` - Latest build from `main` branch
- `main-<sha>` - Commit SHA for traceability
- `<version>` - Semantic version tags (if tagged)

## Health Check

After deployment, a health check runs if `DEPLOY_URL` is configured:

- Waits 10 seconds for application startup
- Sends HTTP request to `DEPLOY_URL`
- Expects `200` status code
- Fails deployment if health check fails

## Troubleshooting

### Deployment Failures

**SSH Connection Issues**

```bash
# Test SSH connection locally
ssh -i ~/.ssh/id_rsa user@host

# Verify SSH key permissions
chmod 600 ~/.ssh/id_rsa
```

**Docker Registry Authentication**

```bash
# Test GHCR login
echo $GITHUB_TOKEN | docker login ghcr.io -u username --password-stdin
```

**Database Connection**

```bash
# Test DATABASE_URL
psql $DATABASE_URL

# Check database migrations
docker compose exec app npx prisma migrate status
```

**Workflow Validation Warnings**

You may see warnings like "Context access might be invalid" for various secrets in your IDE:
- `SSH_PRIVATE_KEY`
- `SSH_HOST`
- `SSH_USER`
- `DATABASE_URL`
- `DEPLOY_URL`
- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

**These are normal!** They appear because the secrets haven't been configured yet in GitHub. Once you add the secrets in repository settings, these warnings will disappear. The workflow will work correctly once the secrets are properly configured.

### Health Check Failures

```bash
# Manual health check
curl -I https://your-app.com

# Check application logs
docker compose logs app

# Check container status
docker compose ps
```

### Rollback

If deployment fails:

```bash
# SSH into server
ssh user@host
cd ~/smartplay-hk-oss

# Pull previous image version
docker compose --env-file .env.docker pull app:previous-tag

# Restart with previous version
docker compose --env-file .env.docker up -d
```

## Security Best Practices

1. **Never commit secrets** to repository
2. **Use strong passwords** for `DATABASE_URL`
3. **Rotate SSH keys** regularly
4. **Limit SSH access** to specific IPs
5. **Use separate environments** (staging, production)
6. **Enable branch protection** on `main`
7. **Require PR reviews** before merge
8. **Monitor deployment logs** for suspicious activity

## Local Testing

Test deployment locally before pushing:

```bash
# Build Docker image locally
docker build -t smartplay-test .

# Test with docker-compose
cp .env.docker.example .env.docker
# Edit .env.docker with your values
docker compose --env-file .env.docker up -d

# Check logs
docker compose logs -f

# Run health check
curl http://localhost:3000
```

## Contributing

When modifying CI/CD workflows:

1. Test changes in a feature branch first
2. Use `workflow_dispatch` for manual testing
3. Verify all secrets are properly configured
4. Document new requirements in this README
5. Tag maintainers for review
