# GitHub Secrets Configuration Guide

This guide walks you through setting up all required secrets for the CI/CD pipeline.

## Quick Setup Checklist

- [ ] Database connection configured
- [ ] SSH access to deployment server
- [ ] Cloudflare Turnstile keys
- [ ] Production URL configured
- [ ] CI/CD workflow tested

## Step-by-Step Setup

### 1. Navigate to GitHub Secrets Settings

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Click **Secrets and variables** > **Actions** in left sidebar
4. Click **New repository secret** button

### 2. Configure Database Secret

**Secret Name:** `DATABASE_URL`
**Description:** PostgreSQL connection string

**Format:**

```
postgresql://username:password@hostname:port/database_name
```

**Example:**

```
postgresql://smartplay:secure_password_here@postgres:5432/smartplay
```

**Steps:**

1. Generate a strong password (use a password manager)
2. Copy the connection string
3. Paste into secret value field
4. Click **Add secret**

**Security Tips:**

- Use at least 32 characters
- Include uppercase, lowercase, numbers, and symbols
- Never reuse passwords
- Rotate password regularly

### 3. Configure SSH Access

#### 3.1 Generate SSH Key Pair

On your local machine:

```bash
# Generate new SSH key
ssh-keygen -t rsa -b 4096 -C "github-actions" -f ~/.ssh/smartplay_deploy

# Display public key
cat ~/.ssh/smartplay_deploy.pub
```

#### 3.2 Add Public Key to Remote Server

```bash
# Copy public key to server
ssh-copy-id -i ~/.ssh/smartplay_deploy.pub user@your-server.com

# Or manually add to server
cat ~/.ssh/smartplay_deploy.pub | ssh user@your-server.com "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

#### 3.3 Add SSH Secrets to GitHub

**Secret 1:** `SSH_PRIVATE_KEY`

- Copy private key content: `cat ~/.ssh/smartplay_deploy`
- Paste into secret value
- **Include** the `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----` lines

**Secret 2:** `SSH_HOST`

- Your server's hostname or IP
- Example: `192.168.1.100` or `server.example.com`

**Secret 3:** `SSH_USER`

- SSH username on remote server
- Example: `ubuntu`, `root`, or `deploy`

#### 3.4 Test SSH Connection

```bash
# Test SSH connection with key
ssh -i ~/.ssh/smartplay_deploy user@your-server.com

# You should be able to login without password
```

### 4. Configure Cloudflare Turnstile

#### 4.1 Get Cloudflare Turnstile Keys

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Turnstile** section
3. Click **Add site**
4. Configure site settings:
   - **Site name**: SmartPlay HK OSS
   - **Domain**: Your production domain
   - **Widget Mode**: Managed
5. Copy **Site Key** and **Secret Key**

#### 4.5 Add Turnstile Secrets to GitHub

**Secret 1:** `TURNSTILE_SITE_KEY`

- Copy site key from Cloudflare
- Example: `0x4AAAAAAxxxxx...`
- This is a public key (used in client-side)

**Secret 2:** `TURNSTILE_SECRET_KEY`

- Copy secret key from Cloudflare
- Example: `0x4AAAAAAxxxxx...`
- This is a secret key (used in server-side)

**Important:** Never share your secret key!

### 5. Configure Deployment URL

**Secret Name:** `DEPLOY_URL`
**Description:** Production application URL

**Examples:**

- `https://smartplay.hk`
- `https://www.smartplay.hk`
- `http://your-server.com:3000` (for testing)

**Usage:**

- Health check after deployment
- BASE_URL configuration for the application

**Setup:**

1. Enter your production URL
2. Include protocol (https:// or http://)
3. Include port if not using default (80/443)

### 6. Verify All Secrets

Your secrets list should look like this:

```
✅ DATABASE_URL                    - PostgreSQL connection
✅ DEPLOY_URL                      - Production URL
✅ SSH_PRIVATE_KEY                 - SSH private key
✅ SSH_HOST                        - Server hostname/IP
✅ SSH_USER                        - SSH username
✅ TURNSTILE_SITE_KEY              - Cloudflare site key
✅ TURNSTILE_SECRET_KEY            - Cloudflare secret key
```

## Testing the Configuration

### Manual Workflow Trigger

1. Go to **Actions** tab in your repository
2. Select **CI/CD Pipeline** workflow
3. Click **Run workflow** button
4. Select `main` branch
5. Click **Run workflow** green button
6. Monitor the workflow execution

### What to Check

**Test Job:**

- All tests pass
- Type check succeeds
- Linter completes without errors

**Build Job:**

- Docker image builds successfully
- Image pushed to GHCR
- Tags are correct

**Deploy Job:**

- SSH connection succeeds
- `.env.docker` file created
- Docker Compose pulls images
- Containers start successfully
- Health check passes

## Troubleshooting

### SSH Authentication Failed

**Problem:** `Permission denied (publickey)`

**Solutions:**

1. Verify private key format (include BEGIN/END lines)
2. Check SSH user has permission on server
3. Ensure public key is in `~/.ssh/authorized_keys`
4. Test SSH connection locally first

### Database Connection Failed

**Problem:** `Connection refused` or `Access denied`

**Solutions:**

1. Verify DATABASE_URL format
2. Check database server is running
3. Verify user credentials
4. Test connection: `psql $DATABASE_URL`

### Docker Registry Login Failed

**Problem:** `unauthorized: authentication required`

**Solutions:**

1. Verify GHCR permissions in repository settings
2. Check GITHUB_TOKEN is properly configured
3. Ensure repository is public or user has access

### Health Check Failed

**Problem:** `Deployment health check failed`

**Solutions:**

1. Wait longer for application startup
2. Verify DEPLOY_URL is accessible
3. Check application logs on server
4. Verify container is running: `docker compose ps`

## Security Best Practices

### Rotation Schedule

- **SSH Keys**: Rotate every 90 days
- **Database Password**: Rotate every 60 days
- **Turnstile Keys**: Rotate if compromised
- **API Keys**: Rotate every 30-90 days

### Access Control

1. **Limit GitHub Actions permissions:**
   - Go to Settings > Actions > General
   - Workflow permissions: Read and write permissions
   - Require approval for fork PRs

2. **Use environment protection rules:**
   - Settings > Environments > Production
   - Add required reviewers
   - Add wait timer
   - Restrict deployment branches

3. **Enable branch protection:**
   - Settings > Branches > Branch protection rule
   - Protect `main` branch
   - Require PR reviews
   - Require status checks to pass
   - Require linear history

### Monitoring

1. **Regular secret audits:**
   - Review who has access to secrets
   - Check secret usage logs
   - Remove unused secrets

2. **Deployment monitoring:**
   - Monitor workflow runs
   - Check deployment logs
   - Set up alerts for failures

## Next Steps

After configuring secrets:

1. **Test deployment** with workflow dispatch
2. **Verify application** is running correctly
3. **Check logs** for any errors
4. **Monitor first automatic deployment** on next push

For more information, see:

- [CI/CD Pipeline Documentation](./README.md)
- [Docker Deployment Guide](../../README-CRAWLER.md)
