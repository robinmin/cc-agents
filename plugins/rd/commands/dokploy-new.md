---
description: Create a new Dokploy deployment with GitHub Actions workflow, central repository structure, and production-ready configuration.
---

# dokploy-new

Create a complete Dokploy deployment setup for a new service with GitHub Actions CI/CD pipeline.

## Prerequisites

**REQUIRED: DOKPLOY_URL Environment Variable**

Before using this command, set the `DOKPLOY_URL` environment variable:

```bash
export DOKPLOY_URL="https://your-dokploy-server.com"
```

This command will check for `DOKPLOY_URL` and prompt you to set it if missing.

## Purpose

Automates the creation of a new Dokploy deployment including:
- Central repository structure (sample/, envs/, .github/workflows/)
- Dockerfile template (if needed)
- Environment variable files for test/prod
- GitHub Actions workflow with retry logic
- Complete deployment configuration

## Usage

```bash
# Interactive mode (recommended)
/rd:dokploy-new

# With arguments
/rd:dokploy-new --service <name> --env <test|prod> --type <app|compose>

# Specify repository path
/rd:dokploy-new --service myservice --env test --repo-path /path/to/deployment-repo
```

## Parameters

- `--service <name>` - Service name (lowercase, hyphens allowed)
- `--env <environment>` - Target environment (test, prod, or both)
- `--type <type>` - Deployment type:
  - `app` - Single application (default)
  - `compose` - Docker Compose stack
- `--repo-path <path>` - Path to deployment central repository (defaults to current directory)
- `--language <lang>` - Programming language (python, node, go, rust, java)
- `--skip-dockerfile` - Skip Dockerfile generation if one already exists

## What Happens

### Phase 1: Interactive Setup

If no arguments provided, Claude will ask:

1. **Service Information:**
   - Service name (validates format)
   - Programming language/framework
   - Deployment type (app or compose)

2. **Repository Configuration:**
   - Repository path (defaults to current directory)
   - Verify central repo structure exists
   - Create missing directories if needed

3. **Environment Selection:**
   - Test only (auto-deploy on push)
   - Production only (manual trigger)
   - Both (recommended)

4. **Docker Registry:**
   - Docker Hub or GitHub Container Registry (GHCR)
   - Verify credentials configuration

5. **Dokploy Connection:**
   - Verify `DOKPLOY_URL` environment variable is set
   - Optionally verify API connectivity

### Phase 2: File Generation

Based on your input, Claude will create:

1. **Service Directory Structure:**
```
sample/
└── <service-name>/
    ├── Dockerfile              # Generated based on language
    ├── dokploy-app.yaml       # Dokploy configuration
    └── src/                   # Application source placeholder
        └── .gitkeep
```

2. **Environment Variable Files:**
```
envs/
├── test/
│   └── <service-name>.yaml    # Test environment config
└── prod/
    └── <service-name>.yaml    # Production environment config
```

3. **GitHub Actions Workflows:**
```
.github/
└── workflows/
    ├── deploy-<service>-test.yml   # Auto-deploy on push to main
    └── deploy-<service>-prod.yml   # Manual trigger only
```

### Phase 3: Configuration Instructions

Claude will provide:

1. **GitHub Secrets to Configure:**
```
DOCKERHUB_USERNAME=<your-dockerhub-username>
DOCKERHUB_TOKEN=<your-dockerhub-token>
DOKPLOY_URL=<your-dokploy-server-url>  # Should match your $DOKPLOY_URL environment variable
DOKPLOY_API_KEY=<your-dokploy-api-key>
DOKPLOY_APP_ID_<SERVICE>_TEST=<app-id-from-dokploy>
DOKPLOY_APP_ID_<SERVICE>_PROD=<app-id-from-dokploy>
```

**Note:** The `DOKPLOY_URL` GitHub Secret should match your local `$DOKPLOY_URL` environment variable.

2. **Dokploy Setup Steps:**
   - Create project in Dokploy
   - Create applications (test and prod)
   - Configure Docker registry credentials
   - Set source type to "Docker"
   - Get application IDs via API

3. **Next Steps Checklist:**
   - [ ] Configure GitHub Secrets
   - [ ] Create Dokploy applications
   - [ ] Add application source code
   - [ ] Update environment variable files
   - [ ] Push to GitHub to trigger deployment
   - [ ] Verify deployment in Dokploy

## Generated Dockerfile Examples

### Python (Flask/FastAPI)
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

EXPOSE 8000

CMD ["python", "src/app.py"]
```

### Node.js (Express)
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/

EXPOSE 3000

CMD ["node", "src/index.js"]
```

### Go
```dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o main ./src

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/main .

EXPOSE 8080

CMD ["./main"]
```

## Generated GitHub Actions Workflow

Complete workflow with:
- Docker build and push
- Environment variable loading from YAML
- Two-step deployment (saveEnvironment + deploy)
- 5-attempt retry logic with exponential backoff
- Path-based triggers
- Clear success/failure logging

**Test Environment (auto-deploy):**
```yaml
on:
  push:
    branches: ["main"]
    paths:
      - "sample/<service-name>/**"
      - "envs/test/<service-name>.yaml"
```

**Production Environment (manual trigger):**
```yaml
on:
  workflow_dispatch:
    inputs:
      confirm:
        description: 'Type "deploy" to confirm'
        required: true
```

## Environment Variable Template

Generated YAML files include common variables:

**Test Environment:**
```yaml
# Application settings
APP_ENV=development
LOG_LEVEL=debug
PORT=8000

# External services (placeholders)
DATABASE_URL=postgresql://localhost:5432/testdb
REDIS_URL=redis://localhost:6379

# Feature flags
ENABLE_DEBUG=true
ENABLE_METRICS=true
```

**Production Environment:**
```yaml
# Application settings
APP_ENV=production
LOG_LEVEL=info
PORT=8000

# External services (placeholders - update with actual values)
DATABASE_URL=postgresql://prod-db:5432/proddb
REDIS_URL=redis://prod-redis:6379

# Feature flags
ENABLE_DEBUG=false
ENABLE_METRICS=true
```

## Dokploy Configuration File

Generated `dokploy-app.yaml`:
```yaml
name: <service-name>
type: application
sourceType: docker
dockerImage: <username>/<service-name>:latest

# Environment configuration
# Use Dokploy API to inject variables, not this file
```

## Examples

### Example 1: Python Flask API (Interactive)
```bash
/rd:dokploy-new

# Claude asks:
# → Service name: flask-api
# → Language: python
# → Type: app
# → Repository path: [current directory]
# → Environment: both (test + prod)
# → Registry: Docker Hub

# Claude creates:
# ✓ sample/flask-api/Dockerfile
# ✓ sample/flask-api/dokploy-app.yaml
# ✓ envs/test/flask-api.yaml
# ✓ envs/prod/flask-api.yaml
# ✓ .github/workflows/deploy-flask-api-test.yml
# ✓ .github/workflows/deploy-flask-api-prod.yml
```

### Example 2: Node.js API with Arguments
```bash
/rd:dokploy-new --service user-service --env test --type app --language node

# Claude creates test environment only:
# ✓ sample/user-service/ (Node.js Dockerfile)
# ✓ envs/test/user-service.yaml
# ✓ .github/workflows/deploy-user-service-test.yml
```

### Example 3: Docker Compose Stack
```bash
/rd:dokploy-new --service payment-stack --type compose --env both

# Claude creates:
# ✓ sample/payment-stack/docker-compose.yml (template)
# ✓ sample/payment-stack/Dockerfile
# ✓ envs/test/payment-stack.yaml
# ✓ envs/prod/payment-stack.yaml
# ✓ .github/workflows/deploy-payment-stack-test.yml (uses compose.update API)
# ✓ .github/workflows/deploy-payment-stack-prod.yml
```

### Example 4: Existing Dockerfile
```bash
/rd:dokploy-new --service auth-api --skip-dockerfile

# Claude creates everything except Dockerfile:
# ✓ envs/test/auth-api.yaml
# ✓ envs/prod/auth-api.yaml
# ✓ .github/workflows/deploy-auth-api-test.yml
# ✓ .github/workflows/deploy-auth-api-prod.yml
# ℹ Uses existing sample/auth-api/Dockerfile
```

## Validation

Before file generation, Claude verifies:
- [ ] Service name is valid (lowercase, hyphens, no spaces)
- [ ] Repository path exists and is writable
- [ ] No conflicting files exist
- [ ] Central repo structure is correct
- [ ] User confirmed overwrite if files exist

## Output Summary

After completion, Claude provides:

```
✅ Dokploy Deployment Setup Complete

Service: flask-api
Environment: test, prod
Type: application

📁 Files Created:
  ✓ sample/flask-api/Dockerfile
  ✓ sample/flask-api/dokploy-app.yaml
  ✓ envs/test/flask-api.yaml
  ✓ envs/prod/flask-api.yaml
  ✓ .github/workflows/deploy-flask-api-test.yml
  ✓ .github/workflows/deploy-flask-api-prod.yml

🔑 GitHub Secrets Required:
  → DOCKERHUB_USERNAME
  → DOCKERHUB_TOKEN
  → DOKPLOY_URL
  → DOKPLOY_API_KEY
  → DOKPLOY_APP_ID_FLASK_API_TEST
  → DOKPLOY_APP_ID_FLASK_API_PROD

📋 Next Steps:
  1. Configure GitHub Secrets in repository settings
  2. Create Dokploy applications:
     - flask-api-test (test environment)
     - flask-api-prod (production environment)
  3. Get application IDs:
     curl -X GET "$DOKPLOY_URL/api/project.all" \
       -H "x-api-key: $DOKPLOY_API_KEY"
  4. Add your application code to sample/flask-api/src/
  5. Review and update environment variables
  6. Push to GitHub to trigger test deployment
  7. Manually trigger production deployment when ready

📖 Documentation:
  - See skills/dokploy/SKILL.md for complete workflow
  - See skills/dokploy/EXAMPLES.md for more examples
  - See skills/dokploy/REFERENCE.md for API details
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Directory already exists" | Use `--force` to overwrite or choose different service name |
| "Invalid service name" | Use lowercase letters, numbers, hyphens only |
| "Repository structure invalid" | Ensure you're in a deployment central repository |
| "Cannot create .github/workflows/" | Check write permissions, create directory manually |

## Best Practices

1. **Service Naming:**
   - Use descriptive names: `user-api`, `auth-service`, `payment-gateway`
   - Avoid generic names: `app`, `service`, `api`
   - Keep names short but meaningful

2. **Environment Strategy:**
   - Always create both test and prod configurations
   - Use manual trigger for production
   - Test in test environment before production

3. **Secrets Management:**
   - Never commit secrets to repository
   - Store sensitive data in GitHub Secrets
   - Use environment variable files for non-sensitive configs

4. **Workflow Organization:**
   - Keep workflows in central repository
   - Use path filters to avoid unnecessary builds
   - Consider reusable workflows for multiple services

## Related Commands

- `/rd:dokploy-refine` - Optimize existing deployment
- `/rd:skill-evaluate dokploy` - Review Dokploy skill quality

## Integration with Dokploy CLI

After running `/rd:dokploy-new`, you can optionally use Dokploy CLI to create applications:

```bash
# Authenticate
dokploy authenticate

# Create project (if needed)
dokploy project create --name "my-project"

# Create applications
dokploy app create \
  --project-id "proj-123" \
  --name "flask-api-test" \
  --source-type docker \
  --docker-image "username/flask-api:latest"
```

**Note:** The workflow files created by this command use API-only approach and don't require CLI.
