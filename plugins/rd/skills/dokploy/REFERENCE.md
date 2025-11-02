# Dokploy API Reference

Comprehensive API documentation for Dokploy GitOps deployments with GitHub Actions.

## Prerequisites

All examples use `$DOKPLOY_URL` environment variable. See SKILL.md or README.md for setup instructions.

## Table of Contents

### Core API Documentation
- [API Authentication](#api-authentication)
  - [API Key Generation](#api-key-generation)
  - [Authentication Methods](#authentication-methods)
  - [Permissions Required](#permissions-required)
- [API Endpoint Categories](#api-endpoint-categories)
- [Core API Endpoints](#core-api-endpoints)
  - [Project Discovery](#project-discovery)
  - [Application Deployment](#application-deployment)
  - [Docker Compose Services](#docker-compose-services)
  - [Deployment History](#deployment-history)
- [GitHub Integration](#github-integration)
  - [GitHub App Method](#github-app-method-recommended)
  - [Repository Access](#repository-access)

### Error Handling & Best Practices
- [Retry Logic and Error Handling](#retry-logic-and-error-handling)
  - [Recommended Retry Strategy](#recommended-retry-strategy)
  - [HTTP Status Codes](#http-status-codes)
  - [Common Error Patterns](#common-error-patterns)
- [Environment Variable Management](#environment-variable-management)
  - [Variable Precedence](#variable-precedence)
  - [Variable Format](#variable-format)
  - [Loading from YAML Files](#loading-from-yaml-files-in-github-actions)

### Deployment Patterns
- [Central Repository Pattern](#central-repository-pattern)
  - [Directory Structure](#directory-structure)
  - [Workflow Triggers with Path Filters](#workflow-triggers-with-path-filters)
  - [Multi-Service Deployment Matrix](#multi-service-deployment-matrix)

### Docker Compose
- [Docker Compose Best Practices](#docker-compose-best-practices)
  - [Modern Compose File Format (2025)](#modern-compose-file-format-2025)
  - [Security Best Practices](#security-best-practices)
  - [Data Persistence & Backups](#data-persistence--backups)
  - [Production Commands](#production-commands)
  - [Advanced Deployment Strategies](#advanced-deployment-strategies)
  - [CI/CD Integration](#cicd-integration)
  - [Dokploy-Specific Best Practices](#dokploy-specific-best-practices)
  - [2025 New Features](#2025-new-features)
- [Docker Compose Advanced Features](#docker-compose-advanced-features)
  - [Watch Mode for Development](#watch-mode-for-development)
  - [GPU Support for LLM Deployments](#gpu-support-for-llm-deployments)
  - [Multi-Architecture Support](#multi-architecture-support)
  - [Health Checks and Dependencies](#health-checks-and-dependencies)
  - [Resource Limits](#resource-limits)

### Advanced Topics
- [Advanced Usage](#advanced-usage)
  - [Docker Registry Configuration](#docker-registry-configuration)
  - [Image Tag Strategies](#image-tag-strategies)
  - [Manual vs. Automatic Deployment](#manual-vs-automatic-deployment)

### Troubleshooting
- [Troubleshooting](#troubleshooting)
  - [Docker Compose Issues](#docker-compose-issues)
  - [Dokploy API Issues](#dokploy-api-issues)
  - [401 Unauthorized](#401-unauthorized)
  - [404 Application Not Found](#404-application-not-found)
  - [Deployment Triggered But Container Not Updated](#deployment-triggered-but-container-not-updated)
  - [Environment Variables Not Applied](#environment-variables-not-applied)
  - [Build Queue Locked](#build-queue-locked)
  - [Network Timeout During Deployment](#network-timeout-during-deployment)

### Security & Administration
- [Security Best Practices](#security-best-practices)
  - [Secrets Storage](#secrets-storage)
  - [API Key Rotation](#api-key-rotation)
  - [Least Privilege](#least-privilege)
- [API Rate Limits](#api-rate-limits)

### CLI & Alternative Methods
- [CLI Reference](#cli-reference)
  - [Installation](#installation)
  - [Authentication](#authentication)
  - [Available Commands](#available-commands)
  - [Limitations](#limitations)
- [Auto-Deploy Methods Comparison](#auto-deploy-methods-comparison)
  - [GitHub App Method](#1-github-app-method-recommended-for-auto-deploy)
  - [API-Driven Method](#2-api-driven-method-recommended-for-production)
  - [Webhook Method](#3-webhook-method-not-recommended)

---

## API Authentication

### API Key Generation

1. Log in to Dokploy server
2. Navigate to `/settings/profile`
3. Open "API/CLI Section"
4. Click "Generate" to create new API key
5. Copy the token immediately (shown only once)

### Authentication Methods

**Recommended Method (x-api-key header):**
```bash
curl -X POST \
  "${DOKPLOY_URL}/api/application.deploy" \
  -H "x-api-key: ${DOKPLOY_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"applicationId": "app-123"}'
```

**Alternative Method (Bearer token):**
```bash
curl -X POST \
  "${DOKPLOY_URL}/api/application.deploy" \
  -H "Authorization: Bearer ${DOKPLOY_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"applicationId": "app-123"}'
```

### Permissions Required

For API access, the user must have **"Access API/CLI"** permission enabled:
1. Admin logs into Dokploy
2. Navigate to Users section
3. Edit the target user
4. Check "Access API/CLI" permission
5. Save changes

**Without this permission**, all API calls will return `401 Unauthorized`.

## API Endpoint Categories

Dokploy provides a comprehensive REST API organized into the following categories:

- **Admin** - Administrative operations
- **Application** - Application deployment and management
- **Auth** - Authentication and authorization
- **Backup** - Backup operations for databases
- **Bitbucket** - Bitbucket integration
- **Certificates** - SSL/TLS certificate management
- **Cluster** - Multi-server cluster operations
- **Compose** - Docker Compose service management
- **Deployment** - Deployment history and logs
- **Destination** - S3-compatible storage destinations
- **Docker** - Docker operations
- **Domain** - Domain and routing configuration
- **Github** - GitHub integration
- **Gitlab** - GitLab integration
- **Git Provider** - Generic Git provider operations
- **Mariadb** - MariaDB database management
- **Mongo** - MongoDB database management
- **Mounts** - Volume mount configuration
- **Mysql** - MySQL database management
- **Notification** - Notification integrations (Discord, Slack, Telegram, Email)
- **Port** - Port mapping configuration
- **Postgres** - PostgreSQL database management
- **Project** - Project management
- **Redirects** - URL redirect configuration
- **Redis** - Redis database management
- **Registry** - Docker registry configuration
- **Security** - Security settings
- **Server** - Server management
- **Settings** - Global settings
- **Ssh Key** - SSH key management
- **User** - User management

**This reference covers the most commonly used endpoints for deployment workflows.**

## Core API Endpoints

### Project Discovery

#### GET /api/project.all

Lists all projects, applications, and services accessible to the authenticated user.

**Request:**
```bash
curl -X GET \
  "${DOKPLOY_URL}/api/project.all" \
  -H "x-api-key: $DOKPLOY_API_KEY"
```

**Response:**
```json
{
  "projects": [
    {
      "projectId": "proj-123",
      "name": "my-project",
      "applications": [
        {
          "applicationId": "app-456",
          "name": "myservice-test",
          "sourceType": "docker",
          "dockerImage": "username/myservice:latest"
        }
      ],
      "compose": [],
      "databases": []
    }
  ]
}
```

**Use Case:** Find `applicationId` or `composeId` for deployment operations.

### Application Deployment

#### POST /api/application.saveEnvironment

Updates environment variables for an application. **Must** be called before deployment to inject latest configs.

**Request:**
```bash
curl -X POST \
  "${DOKPLOY_URL}/api/application.saveEnvironment" \
  -H "x-api-key: $DOKPLOY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "app-456",
    "env": "NODE_ENV=production\nLOG_LEVEL=info\nAPI_KEY=secret123"
  }'
```

**Parameters:**
- `applicationId` (string, required) - Application ID from Dokploy
- `env` (string, required) - Newline-delimited environment variables
- `buildArgs` (string, optional) - Docker build arguments (usually null for external builds)

**Important:** Environment variables must be newline-delimited (`\n`), not JSON objects.

**Response:**
```json
{
  "success": true,
  "message": "Environment variables updated"
}
```

#### POST /api/application.deploy

Triggers deployment of an application. Dokploy pulls the Docker image and starts the container.

**Request:**
```bash
curl -X POST \
  "${DOKPLOY_URL}/api/application.deploy" \
  -H "x-api-key: $DOKPLOY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"applicationId": "app-456"}'
```

**Parameters:**
- `applicationId` (string, required) - Application ID from Dokploy

**Response:**
```json
{
  "success": true,
  "deploymentId": "deploy-789"
}
```

### Docker Compose Services

#### POST /api/compose.update

Updates environment variables for a Docker Compose service.

**Request:**
```bash
curl -X POST \
  "${DOKPLOY_URL}/api/compose.update" \
  -H "x-api-key: $DOKPLOY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "composeId": "compose-123",
    "env": "DATABASE_URL=postgres://...\nREDIS_URL=redis://..."
  }'
```

**Parameters:**
- `composeId` (string, required) - Compose service ID
- `env` (string, required) - Newline-delimited environment variables

#### POST /api/compose.deploy

Triggers deployment of a Docker Compose service.

**Request:**
```bash
curl -X POST \
  "${DOKPLOY_URL}/api/compose.deploy" \
  -H "x-api-key: $DOKPLOY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"composeId": "compose-123"}'
```

### Deployment History

#### GET /api/deployment.all

Retrieves deployment history for an application.

**Request:**
```bash
curl -X GET \
  "${DOKPLOY_URL}/api/deployment.all?applicationId=app-456" \
  -H "x-api-key: $DOKPLOY_API_KEY"
```

**Response:**
```json
{
  "deployments": [
    {
      "deploymentId": "deploy-789",
      "status": "success",
      "createdAt": "2025-11-02T10:30:00Z",
      "logPath": "/path/to/logs"
    }
  ]
}
```

## GitHub Integration

### GitHub App Method (Recommended)

This is the only method that supports auto-deploy without manual webhook configuration.

**Setup Steps:**
1. Navigate to Dokploy Git section
2. Select "GitHub"
3. Click "Create Github App" → Redirects to GitHub
4. Set unique app name and create
5. Return to Dokploy, click "Install Button"
6. Authorize app and select repositories

**Features:**
- Auto-deploy on push (no webhook setup needed)
- Watch Paths support (deploy only on specific directory changes)
- Branch-specific deployments

### Repository Access

#### GET /api/github.getGithubRepositories

Lists accessible GitHub repositories.

**Request:**
```bash
curl -X GET \
  "${DOKPLOY_URL}/api/github.getGithubRepositories?githubId=github-123" \
  -H "x-api-key: $DOKPLOY_API_KEY"
```

## Retry Logic and Error Handling

### Recommended Retry Strategy

For production deployments, implement exponential backoff with maximum 5 retries:

```bash
max_retries=5
retry_count=0

while [ $retry_count -lt $max_retries ]; do
  response=$(curl -X POST \
    "${DOKPLOY_URL}/api/application.deploy" \
    -H "x-api-key: $DOKPLOY_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"applicationId": "app-456"}' \
    -w "\n%{http_code}" -s)

  http_code=$(echo "$response" | tail -n1)

  if [ "$http_code" = "200" ]; then
    echo "✓ Success"
    exit 0
  else
    retry_count=$((retry_count + 1))
    echo "⚠ Attempt $retry_count failed with code $http_code"
    sleep $((2 ** retry_count))  # Exponential backoff: 2, 4, 8, 16, 32 seconds
  fi
done

echo "✗ Failed after $max_retries attempts"
exit 1
```

### HTTP Status Codes

| Code | Meaning | Cause | Action |
|------|---------|-------|--------|
| 200 | Success | Request completed | Proceed with next step |
| 401 | Unauthorized | Invalid API key or missing permissions | Check API key in secrets, verify "Access API/CLI" permission |
| 403 | Forbidden | User lacks access to resource | Verify user has access to application/project |
| 404 | Not Found | Application/resource doesn't exist | Call `/api/project.all` to verify ID |
| 422 | Unprocessable Entity | Invalid request payload | Check request format, verify required fields |
| 500 | Internal Server Error | Server-side error | Retry with exponential backoff (max 5 attempts) |
| 503 | Service Unavailable | Server overloaded or maintenance | Retry with exponential backoff, check server status |

### Common Error Patterns

**"Branch Not Match" Error:**
- **Cause:** Configured branch in Dokploy doesn't match push branch
- **Solution:** Verify branch names match exactly (case-sensitive)

**"Pull Access Denied" Error:**
- **Cause:** Registry credentials missing or invalid
- **Solution:** Add registry credentials in Dokploy Registry section

**"Deployment Queued Forever" Error:**
- **Cause:** Previous deployment stuck
- **Solution:** Cancel stuck deployment in Dokploy UI, retry

**"Environment Variables Not Applied" Error:**
- **Cause:** `saveEnvironment` not called before `deploy`
- **Solution:** Verify two-step sequence in workflow

## Environment Variable Management

### Variable Precedence

Dokploy has three levels of variables (highest precedence wins):

| Scope | Definition Location | Syntax | Precedence |
|-------|-------------------|---------|-----------|
| Project-level | Project shared variables | `${{project.VAR_NAME}}` | 3 (Lowest) |
| Environment-level | Environment variables | `${{environment.VAR_NAME}}` | 2 (Medium) |
| Service-level | Service env tab or API | `${{VAR_NAME}}` | 1 (Highest) |

**API calls update Service-level variables**, which override all other levels.

### Variable Format

Environment variables must be newline-delimited strings:

**Correct:**
```bash
"env": "KEY1=value1\nKEY2=value2\nKEY3=value3"
```

**Incorrect:**
```bash
"env": {"KEY1": "value1", "KEY2": "value2"}  # Wrong: Not a string
"env": "KEY1=value1,KEY2=value2"             # Wrong: Comma-separated
```

### Loading from YAML Files in GitHub Actions

```yaml
- name: Load environment variables
  id: load-env
  run: |
    # Read YAML file and convert to newline-delimited string
    ENV_CONTENT=$(cat envs/test/myservice.yaml | sed 's/$/\\n/' | tr -d '\n')
    echo "env_vars=$ENV_CONTENT" >> $GITHUB_OUTPUT

- name: Inject to Dokploy
  run: |
    curl -X POST \
      "${{ secrets.DOKPLOY_URL }}/api/application.saveEnvironment" \
      -H "x-api-key: ${{ secrets.DOKPLOY_API_KEY }}" \
      -H "Content-Type: application/json" \
      -d "{\"applicationId\": \"${{ secrets.DOKPLOY_APP_ID }}\", \"env\": \"${{ steps.load-env.outputs.env_vars }}\"}"
```

## Central Repository Pattern

### Directory Structure

```
deployment-repo/
├── envs/
│   ├── test/
│   │   ├── service1.yaml
│   │   └── service2.yaml
│   └── prod/
│       ├── service1.yaml
│       └── service2.yaml
├── sample/
│   ├── service1/
│   │   ├── Dockerfile
│   │   ├── dokploy-app.yaml
│   │   └── src/
│   └── service2/
│       ├── Dockerfile
│       ├── dokploy-app.yaml
│       └── src/
└── .github/
    └── workflows/
        ├── deploy-service1-test.yml
        ├── deploy-service1-prod.yml
        ├── deploy-service2-test.yml
        └── deploy-service2-prod.yml
```

### Workflow Triggers with Path Filters

Trigger deployments only when specific service or env changes:

```yaml
on:
  push:
    branches: ["main"]
    paths:
      - "sample/service1/**"      # Trigger on service code changes
      - "envs/test/service1.yaml"  # Trigger on env config changes
```

### Multi-Service Deployment Matrix

For managing multiple services in one repository:

```yaml
strategy:
  matrix:
    service: [service1, service2, service3]
    env: [test, prod]
```

## Docker Compose Best Practices

### Modern Compose File Format (2025)

**Important Changes:**
- ❌ The `version` field is **deprecated**
- ✅ Use `compose.yaml` instead of `docker-compose.yaml`
- ✅ Compose Specification unifies 2.x and 3.x formats into one standard

**Modern Format:**
```yaml
# compose.yaml (no version field needed)
services:
  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/myapp
    depends_on:
      - db

  db:
    image: postgres:15.4  # Always use explicit tags
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Security Best Practices

**Image Versioning:**
- ✅ Always use explicit tags: `postgres:15.4`, `redis:7.2`
- ❌ Never use `latest` tag in production
- ✅ Use official images from Docker Hub or verified publishers

**Secrets Management:**
```yaml
# Use .env files for sensitive data
services:
  app:
    environment:
      - DB_PASSWORD=${POSTGRES_PASSWORD}
      - API_KEY=${API_KEY}
```

Create `.env` file (never commit to Git):
```bash
POSTGRES_PASSWORD=your_secure_password
API_KEY=your_api_key_here
```

**Docker Secrets (Swarm Mode):**
```yaml
services:
  app:
    secrets:
      - db_password
      - api_key

secrets:
  db_password:
    external: true
  api_key:
    external: true
```

**Network Segmentation:**
```yaml
services:
  frontend:
    networks:
      - frontend_net

  backend:
    networks:
      - frontend_net
      - backend_net

  database:
    networks:
      - backend_net  # Not exposed to frontend

networks:
  frontend_net:
  backend_net:
```

### Data Persistence & Backups

**Dokploy Recommended Pattern:**
Use `../files` directory for persistent data:
```yaml
services:
  postgres:
    volumes:
      - ../files/database:/var/lib/postgresql/data

  uploads:
    volumes:
      - ../files/uploads:/app/uploads
```

**Safe Volume Management:**
```bash
# ✅ Preserve volumes (safe)
docker compose down

# ❌ Delete volumes (destructive)
docker compose down --volumes
```

**Backup Strategy:**
```bash
# Backup before changes
docker compose exec postgres pg_dump -U user dbname > backup.sql

# Backup volumes
tar -czf backup.tar.gz ../files/
```

### Production Commands

**Launch Services:**
```bash
docker compose up -d              # Background mode
docker compose up --build         # Rebuild images first
docker compose up -d --no-deps web # Update single service
```

**Monitoring & Debugging:**
```bash
docker compose logs -f            # Real-time logs (all services)
docker compose logs web           # Specific service
docker compose logs --since=1h    # Last hour only
docker compose logs --filter service=web # Filter by service

docker compose ps                 # Service status
docker stats                      # Resource usage
docker compose exec web /bin/bash # Access container
```

**Service Management:**
```bash
docker compose stop [service]     # Stop service
docker compose restart [service]  # Restart service
docker compose scale web=3        # Scale to 3 instances
```

### Advanced Deployment Strategies

**Rolling Updates (Without Restarting Dependencies):**
```bash
# Update only web service, don't restart db/redis
docker compose up -d --no-deps web
```

**Blue-Green Deployments:**
```bash
# Deploy blue environment
docker compose -p blue up -d

# Deploy green environment
docker compose -p green up -d

# Switch traffic via load balancer
# Then remove old environment:
docker compose -p blue down
```

**Multi-Environment Configuration:**
```bash
# Base configuration
compose.yaml

# Environment overlays
compose.prod.yaml
compose.test.yaml

# Deploy to production
docker compose -f compose.yaml -f compose.prod.yaml up -d

# Deploy to test
docker compose -f compose.yaml -f compose.test.yaml up -d
```

**Profile System (Conditional Services):**
```yaml
services:
  app:
    # Always runs

  debug_tools:
    profiles: ["development"]  # Only in dev
    image: debug-tools:latest

  monitoring:
    profiles: ["production"]   # Only in prod
    image: prometheus:latest
```

```bash
# Development with debug tools
docker compose --profile development up -d

# Production with monitoring
docker compose --profile production up -d
```

### CI/CD Integration

**Test Execution:**
```bash
# Run tests and exit
docker compose -f compose.test.yml up --abort-on-container-exit

# Exit code propagates to CI/CD
echo $?  # 0 = success, non-zero = failure
```

**Health Check Verification:**
```bash
# Wait for service to be healthy
until docker compose exec web curl -f http://localhost:8000/health; do
  echo "Waiting for service..."
  sleep 5
done
```

**Multi-Stage Pipelines:**
```yaml
# .github/workflows/deploy.yml
- name: Test
  run: docker compose -f compose.test.yml up --abort-on-container-exit

- name: Build
  run: docker compose build

- name: Deploy
  run: docker compose -f compose.yaml -f compose.prod.yaml up -d
```

### Dokploy-Specific Best Practices

**Container Naming:**
❌ **Never use `container_name` in Dokploy:**
```yaml
# Bad - breaks Dokploy logging
services:
  app:
    container_name: my-app  # Don't do this!
```

```yaml
# Good - let Dokploy manage names
services:
  app:
    image: myapp:latest  # Dokploy handles naming
```

**Directory Structure:**
Use `../files` for all persistent data:
```
deployment-repo/
├── compose.yaml
└── files/              # Persistent data (outside compose dir)
    ├── database/
    ├── uploads/
    └── logs/
```

**Traefik Configuration:**
```yaml
services:
  web:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.web.rule=Host(`example.com`)"
      - "traefik.http.routers.web.entrypoints=websecure"
      - "traefik.http.routers.web.tls.certresolver=letsencrypt"
```

**Git Integration Workflow:**
1. Push `compose.yaml` to Git repository
2. Connect repository in Dokploy dashboard
3. Specify deployment branch (main/production)
4. Dokploy auto-deploys on push

### 2025 New Features

**Bake (Default Build Tool):**
```bash
# Multi-platform builds
docker buildx bake --set *.platform=linux/amd64,linux/arm64
```

**Enhanced Logging:**
```bash
# Time-filtered logs
docker compose logs --since=1h --until=30m

# Service-filtered logs
docker compose logs --filter service=web

# Combine filters
docker compose logs --since=2h --filter service=web,api
```

**AI/LLM Model Support:**
```yaml
# Docker Model Runner (2025)
services:
  llm:
    image: ollama/ollama:latest
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    models:
      - name: llama3
        source: ollama
```

## Docker Compose Advanced Features

### Watch Mode for Development

Docker Compose includes real-time file synchronization for development:

```yaml
# docker-compose.yml
services:
  app:
    build: .
    develop:
      watch:
        - action: sync
          path: ./src
          target: /app/src
        - action: rebuild
          path: package.json
```

**Usage:**
```bash
docker compose watch
```

Changes to `./src` sync automatically; changes to `package.json` trigger rebuild.

### GPU Support for LLM Deployments

Deploy LLMs with GPU acceleration:

```yaml
services:
  llm:
    image: ollama/ollama:latest
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

**Requirements:**
- NVIDIA GPU on host
- NVIDIA Container Toolkit installed
- Docker configured with GPU support

### Multi-Architecture Support

Build and deploy across AMD64 and ARM64:

```yaml
# GitHub Actions workflow
- name: Build multi-arch image
  uses: docker/build-push-action@v4
  with:
    platforms: linux/amd64,linux/arm64
    push: true
    tags: username/app:latest
```

**Supported platforms:**
- Amazon Linux 2023 and 2
- Windows, macOS, Linux
- AMD64 and ARM64 architectures

### Health Checks and Dependencies

Ensure services are ready before dependent services start:

```yaml
services:
  postgres:
    image: postgres:15
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    depends_on:
      postgres:
        condition: service_healthy
```

### Resource Limits

Prevent containers from consuming excessive resources:

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## Advanced Usage

### Docker Registry Configuration

If deploying private images, Dokploy needs registry credentials:

1. Navigate to Dokploy Registry section
2. Add credentials for your registry:
   - Docker Hub: username + token
   - GHCR: username + GitHub PAT
   - Custom: registry URL + credentials

**Without registry access**, deployment will fail with `pull access denied`.

### Image Tag Strategies

**Latest tag (simple but risky):**
```yaml
tags: username/myservice:latest
```

**Commit SHA (recommended for traceability):**
```yaml
tags: |
  username/myservice:latest
  username/myservice:${{ github.sha }}
```

**Semantic versioning:**
```yaml
tags: |
  username/myservice:v1.2.3
  username/myservice:latest
```

### Manual vs. Automatic Deployment

**Test Environment (auto-deploy on push):**
```yaml
on:
  push:
    branches: ["main"]
```

**Production Environment (manual trigger only):**
```yaml
on:
  workflow_dispatch:
    inputs:
      confirm:
        description: 'Type "deploy" to confirm'
        required: true
```

## Troubleshooting

### Docker Compose Issues

**Container Won't Start:**
- **Check logs first:** `docker compose logs [service-name]`
- **Common causes:**
  - Missing environment variables
  - Incorrect file permissions
  - Port already in use on host

**Network Connectivity Problems:**
- **Symptom:** Services can't communicate
- **Cause:** Using `localhost` instead of service names
- **Solution:** Use service names in connection strings
  ```yaml
  # ❌ Wrong
  DATABASE_URL=postgresql://localhost:5432/db

  # ✅ Correct
  DATABASE_URL=postgresql://postgres:5432/db
  ```

**Volume Permission Issues (Linux):**
- **Symptom:** Permission denied errors in containers
- **Solution 1:** Use `user` directive
  ```yaml
  services:
    app:
      user: "${UID}:${GID}"
  ```
- **Solution 2:** Adjust host file ownership
  ```bash
  sudo chown -R $USER:$USER ../files/
  ```

**Port Conflicts:**
- **Symptom:** "Port is already allocated" error
- **Solution:** Find and stop conflicting process
  ```bash
  sudo lsof -i :8000  # Find process using port 8000
  sudo kill -9 [PID]  # Stop process
  ```

**Out of Memory (Exit Code 137):**
- **Symptom:** Container exits with code 137
- **Cause:** Container exceeded memory limit
- **Solution:** Increase memory or optimize application
  ```yaml
  services:
    app:
      deploy:
        resources:
          limits:
            memory: 2G  # Increase from 512M
  ```

**SSL Certificate Errors:**
- **Symptom:** Traefik can't provision certificates
- **Cause:** DNS not pointing to correct IP or ports blocked
- **Solution:**
  1. Verify DNS A record points to server IP
  2. Ensure ports 80 and 443 are open
  3. Check firewall rules

**Service Dependency Issues:**
- **Symptom:** Application starts before database is ready
- **Solution:** Add health checks and proper depends_on
  ```yaml
  services:
    db:
      healthcheck:
        test: ["CMD-SHELL", "pg_isready"]
        interval: 10s

    app:
      depends_on:
        db:
          condition: service_healthy
  ```

### Dokploy API Issues

### 401 Unauthorized

**Symptom:** All API calls return 401
**Cause:** API key invalid or user lacks permissions
**Solution:**
1. Verify API key in GitHub Secrets
2. Check user has "Access API/CLI" permission in Dokploy
3. Generate new API key if expired

### 404 Application Not Found

**Symptom:** `/api/application.deploy` returns 404
**Cause:** Application ID incorrect or application deleted
**Solution:**
1. Call `/api/project.all` to list all apps
2. Verify `applicationId` in response
3. Update `DOKPLOY_APP_ID` in GitHub Secrets

### Deployment Triggered But Container Not Updated

**Symptom:** API returns 200, but old container still running
**Cause:** Image tag not updated, or registry credentials missing
**Solution:**
1. Check Dokploy app points to correct image tag
2. Verify registry credentials in Dokploy
3. Check deployment logs in Dokploy UI

### Environment Variables Not Applied

**Symptom:** Application starts with old environment variables
**Cause:** `saveEnvironment` not called before `deploy`, or API call failed
**Solution:**
1. Verify two-step sequence: `saveEnvironment` → `deploy`
2. Check `saveEnvironment` returns 200
3. Review environment variable format (newline-delimited)

### Build Queue Locked

**Symptom:** Deployment queued but never starts
**Cause:** Previous deployment still running (Dokploy processes one at a time)
**Solution:**
1. Check Dokploy deployment tab for stuck deployments
2. Cancel ongoing deployment if stuck
3. Retry deployment

### Network Timeout During Deployment

**Symptom:** API call times out after 30+ seconds
**Cause:** Server overloaded or network issues
**Solution:**
1. Implement retry logic with exponential backoff
2. Check Dokploy server status
3. Increase timeout in curl (add `--max-time 60`)

## Security Best Practices

### Secrets Storage

**GitHub Secrets (sensitive data):**
- DOCKERHUB_TOKEN
- DOKPLOY_API_KEY
- Database passwords
- API keys

**Environment YAML files (non-sensitive):**
- Log levels
- Feature flags
- Public URLs
- Port numbers

### API Key Rotation

1. Generate new API key in Dokploy
2. Update GitHub Secrets with new key
3. Test deployment with new key
4. Delete old API key in Dokploy

**Rotate keys every 90 days** or when team members leave.

### Least Privilege

Create separate Dokploy users for each environment:
- `deploy-test` - Access to test apps only
- `deploy-prod` - Access to prod apps only

Generate separate API keys and store in environment-specific GitHub Secrets.

## API Rate Limits

Dokploy does not publicly document API rate limits. Based on usage patterns:

- Recommended: Max 10 API calls per minute per service
- Deployment calls are sequential (not parallel)
- Use retry logic with exponential backoff to handle rate limiting

## CLI Reference

The Dokploy CLI is a command-line tool for remotely managing your Dokploy server. It has **limited functionality** compared to the API.

### Installation

```bash
npm install -g @dokploy/cli
```

### Authentication

```bash
# Authenticate with your Dokploy server
dokploy authenticate

# Verify authentication status
dokploy verify
```

### Available Commands

**Project Management:**
```bash
dokploy project create --name "my-project"
dokploy project list
```

**Application Management:**
```bash
dokploy app create --project-id "proj-123" --name "my-app"
dokploy app list --project-id "proj-123"
```

**Database Management:**
```bash
dokploy database create --type postgres --name "mydb"
dokploy database list
```

**Environment Variables:**
```bash
dokploy env list --app-id "app-123"
```

### Limitations

- ❌ Cannot trigger deployments (use API `application.deploy`)
- ❌ Cannot update environment variables in bulk (use API `application.saveEnvironment`)
- ❌ No retry logic built-in
- ✅ Can create projects and applications
- ✅ Can list resources

**Recommendation:** Use CLI for initial setup, use API for deployment automation.

## Auto-Deploy Methods Comparison

Dokploy supports three auto-deploy methods. Choose based on your requirements:

### 1. GitHub App Method (Recommended for Auto-Deploy)

**Setup:**
1. Navigate to Dokploy Git section
2. Select "GitHub"
3. Click "Create Github App" → Redirects to GitHub
4. Set unique app name and create
5. Return to Dokploy, click "Install Button"
6. Authorize app and select repositories

**Features:**
- ✅ Auto-deploy on push (no webhook configuration needed)
- ✅ Watch Paths support (deploy only on specific directory changes)
- ✅ Branch-specific deployments
- ✅ No manual webhook URL setup
- ❌ Builds on Dokploy server (not external)

**Best for:** Simple applications, single-service repos, Git-based auto-deploy

### 2. API-Driven Method (Recommended for Production)

**Setup:**
- Configure GitHub Actions workflow
- Call Dokploy API endpoints
- Build Docker images externally

**Features:**
- ✅ External builds (GitHub Actions/GitLab CI)
- ✅ Full control over deployment process
- ✅ Retry logic and error handling
- ✅ Environment variable injection
- ✅ Multi-environment support
- ✅ Path-based triggers

**Best for:** Production deployments, multi-service repos, complex workflows

### 3. Webhook Method (Not Recommended)

**Setup:**
1. Enable Auto Deploy in application settings
2. Retrieve webhook URL from deployment logs
3. Configure webhook in GitHub/GitLab/Bitbucket

**Issues:**
- ❌ Strict branch matching (fails if branch doesn't match exactly)
- ❌ No retry logic
- ❌ No environment variable injection support
- ❌ Tag matching issues for Docker deployments
- ❌ Fragile error handling

**Best for:** Quick testing only, not production

### Comparison Table

| Feature | GitHub App | API-Driven | Webhook |
|---------|-----------|-----------|---------|
| Auto-deploy on push | ✅ | ✅ (via workflow) | ✅ |
| External builds | ❌ | ✅ | ❌ |
| Retry logic | ❌ | ✅ | ❌ |
| Env injection | ❌ | ✅ | ❌ |
| Path filters | ✅ | ✅ | ❌ |
| Multi-environment | ❌ | ✅ | ❌ |
| Production-ready | ⚠️ | ✅ | ❌ |

**This skill focuses on the API-driven method for production deployments.**
