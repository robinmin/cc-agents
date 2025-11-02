---
name: dokploy
description: Production-ready GitOps deployment workflows using Dokploy API-driven approach. Manages GitHub Actions pipelines, Docker image builds, environment-specific deployments, and secrets injection. Supports central repository pattern with test/prod environments. Use when deploying applications to Dokploy or setting up automated CI/CD pipelines.
---

# Dokploy GitOps Deployment

## Prerequisites

**REQUIRED: DOKPLOY_URL Environment Variable**

Before using this skill, you MUST set the `DOKPLOY_URL` environment variable:

```bash
export DOKPLOY_URL="https://your-dokploy-server.com"
```

Or add to your shell profile (~/.bashrc, ~/.zshrc):
```bash
export DOKPLOY_URL="https://your-dokploy-server.com"
```

**This skill will not function without DOKPLOY_URL configured.**

To verify:
```bash
echo $DOKPLOY_URL
# Should output: https://your-dokploy-server.com
```

## Purpose

Provides comprehensive guidance for deploying applications to Dokploy using API-driven GitOps workflows with GitHub Actions, focusing on production best practices including external builds, secrets management, and multi-environment deployments.

## Workflow

### 0. Environment Validation (Automatic)

**IMPORTANT:** Before proceeding with any Dokploy operations, validate the environment:

```bash
# This check runs automatically when the skill activates
bash plugins/rd/skills/dokploy/scripts/validate-env.sh
```

If `DOKPLOY_URL` is not set, **STOP** and configure it first:
```bash
export DOKPLOY_URL="https://your-dokploy-server.com"
```

### 1. Preparation Phase

**Check Environment Configuration:**
- [ ] `DOKPLOY_URL` environment variable verified (automatic)
- [ ] Confirm Dokploy server is accessible at $DOKPLOY_URL
- [ ] Verify you have admin/API access to Dokploy server

**Understand Deployment Context:**
- Identify if this is a new deployment or refinement of existing setup
- Determine target environment (test/staging or production)
- Identify service type (application, compose, database)
- Locate central repository structure

**Gather Required Information:**
- Project name and application name
- Docker registry (Docker Hub or GHCR)
- Git repository structure
- Environment-specific configurations

**Validation:**
- [ ] DOKPLOY_URL environment variable is set
- [ ] Dokploy server URL is accessible
- [ ] GitHub repository has proper structure
- [ ] Environment files exist in `envs/test/` or `envs/prod/`
- [ ] Service has Dockerfile in `sample/<service-name>/`

### 2. Configuration Phase

**Central Repository Structure:**

Dokploy deployments follow this pattern:
```
deployment-repo/
├── envs/
│   ├── test/               # Test/staging environment
│   │   └── service.yaml    # Environment variables for test
│   └── prod/               # Production environment
│       └── service.yaml    # Environment variables for prod
├── sample/
│   └── service-name/
│       ├── Dockerfile      # Service build configuration
│       ├── dokploy-app.yaml # Dokploy application config
│       └── src/            # Application source code
└── .github/
    └── workflows/
        └── deploy-service.yml  # GitHub Actions workflow
```

**API-Driven Deployment Model:**

Dokploy uses a **push-based GitOps** approach:
1. Git push triggers GitHub Actions
2. GitHub Actions builds Docker image
3. Image pushed to registry (Docker Hub/GHCR)
4. GitHub Actions calls Dokploy API to deploy
5. Dokploy pulls image and starts container

**Key Principle:** Build externally, deploy via API, never build on Dokploy server.

**Validation:**
- [ ] Central repo structure matches pattern
- [ ] Dockerfile exists for service
- [ ] Environment YAML files exist for target env
- [ ] GitHub Secrets configured (DOCKERHUB_TOKEN, DOKPLOY_API_KEY)

### 3. GitHub Actions Workflow Creation

**Two-Step Deployment Process:**

Production deployments MUST use this two-step API sequence:

**Step 1: Inject Environment Variables**
```bash
curl -X POST \
  "$DOKPLOY_URL/api/application.saveEnvironment" \
  -H "x-api-key: $DOKPLOY_API_KEY" \
  -d '{"applicationId": "app-id", "env": "KEY=value\nKEY2=value2"}'
```

**Step 2: Trigger Deployment**
```bash
curl -X POST \
  "$DOKPLOY_URL/api/application.deploy" \
  -H "x-api-key: $DOKPLOY_API_KEY" \
  -d '{"applicationId": "app-id"}'
```

**Complete GitHub Actions Template:**

```yaml
name: Deploy to Dokploy

on:
  push:
    branches: ["main"]
    paths:
      - "sample/SERVICE_NAME/**"
      - "envs/ENV/**"

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Log in to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: ./sample/SERVICE_NAME
          push: true
          tags: ${{ secrets.DOCKERHUB_USERNAME }}/SERVICE_NAME:latest

      - name: Load environment variables
        id: load-env
        run: |
          ENV_CONTENT=$(cat envs/ENV/SERVICE_NAME.yaml | sed 's/$/\\n/' | tr -d '\n')
          echo "env_vars=$ENV_CONTENT" >> $GITHUB_OUTPUT

      - name: Inject environment variables to Dokploy
        run: |
          max_retries=5
          retry_count=0

          while [ $retry_count -lt $max_retries ]; do
            response=$(curl -X POST \
              "${{ secrets.DOKPLOY_URL }}/api/application.saveEnvironment" \
              -H "accept: application/json" \
              -H "x-api-key: ${{ secrets.DOKPLOY_API_KEY }}" \
              -H "Content-Type: application/json" \
              -d "{\"applicationId\": \"${{ secrets.DOKPLOY_APP_ID }}\", \"env\": \"${{ steps.load-env.outputs.env_vars }}\"}" \
              -w "\n%{http_code}" -s)

            http_code=$(echo "$response" | tail -n1)

            if [ "$http_code" = "200" ]; then
              echo "✓ Environment variables injected successfully"
              break
            else
              retry_count=$((retry_count + 1))
              echo "⚠ Attempt $retry_count failed with code $http_code"
              sleep $((2 ** retry_count))
            fi
          done

      - name: Trigger Dokploy deployment
        run: |
          max_retries=5
          retry_count=0

          while [ $retry_count -lt $max_retries ]; do
            response=$(curl -X POST \
              "${{ secrets.DOKPLOY_URL }}/api/application.deploy" \
              -H "accept: application/json" \
              -H "x-api-key: ${{ secrets.DOKPLOY_API_KEY }}" \
              -H "Content-Type: application/json" \
              -d "{\"applicationId\": \"${{ secrets.DOKPLOY_APP_ID }}\"}" \
              -w "\n%{http_code}" -s)

            http_code=$(echo "$response" | tail -n1)

            if [ "$http_code" = "200" ]; then
              echo "✓ Deployment triggered successfully"
              exit 0
            else
              retry_count=$((retry_count + 1))
              echo "⚠ Attempt $retry_count failed with code $http_code"
              sleep $((2 ** retry_count))
            fi
          done

          echo "✗ Deployment failed after $max_retries attempts"
          exit 1
```

**Validation:**
- [ ] Workflow file created in `.github/workflows/`
- [ ] Service name placeholders replaced
- [ ] Environment path correct (test or prod)
- [ ] Retry logic included (5 attempts)
- [ ] GitHub Secrets referenced correctly

### 4. Secrets Management

**GitHub Secrets Required:**

For the workflow to function, configure these secrets in GitHub repository settings:

**Docker Registry:**
- `DOCKERHUB_USERNAME` - Your Docker Hub username
- `DOCKERHUB_TOKEN` - Docker Hub access token

**Dokploy API:**
- `DOKPLOY_URL` - Your Dokploy server URL (matches $DOKPLOY_URL environment variable)
- `DOKPLOY_API_KEY` - Generated from Dokploy /settings/profile
- `DOKPLOY_APP_ID` - Application ID from Dokploy

**How to Get Application ID:**

```bash
# Call Dokploy API to list all projects/apps
curl -X GET \
  "${DOKPLOY_URL}/api/project.all" \
  -H "x-api-key: ${DOKPLOY_API_KEY}"

# Find your app in the response and copy the applicationId
```

**Note:** `DOKPLOY_URL` comes from your environment variable. Ensure it's set before running API calls.

**Environment Variable Files:**

Store non-secret configs in `envs/ENV/service.yaml`:
```yaml
# envs/test/myservice.yaml
NODE_ENV=development
LOG_LEVEL=debug
API_BASE_URL=https://api-test.example.com
```

**NEVER** store secrets in these files. Use GitHub Secrets for sensitive data.

**Validation:**
- [ ] All GitHub Secrets configured
- [ ] API key has "Access API/CLI" permission in Dokploy
- [ ] Application ID verified via API call
- [ ] Environment YAML files contain only non-secret configs

### 5. Multi-Environment Strategy

**Test/Production Pattern:**

Create separate apps in Dokploy for each environment:
- `myservice-test` - Staging/testing environment
- `myservice-prod` - Production environment

Both point to the **same Docker image** but use different:
- Application IDs
- Environment variables
- GitHub Secrets (separate `DOKPLOY_APP_ID_TEST` and `DOKPLOY_APP_ID_PROD`)

**Workflow Strategy:**

Create separate workflow files:

**`.github/workflows/deploy-test.yml`** - Auto-deploy on push to main
```yaml
on:
  push:
    branches: ["main"]
```

**`.github/workflows/deploy-prod.yml`** - Manual trigger only
```yaml
on:
  workflow_dispatch:
```

**Validation:**
- [ ] Separate Dokploy apps created for test and prod
- [ ] Separate workflow files for each environment
- [ ] Production requires manual approval
- [ ] Different `DOKPLOY_APP_ID` for each environment

## Quick Reference

**When to Use:**
- Setting up new Dokploy deployment
- Migrating from webhook to API-driven approach
- Adding GitHub Actions CI/CD pipeline
- Implementing multi-environment deployments
- Troubleshooting deployment failures

**Prerequisites:**
- Dokploy server running and accessible
- GitHub repository with Dockerfile
- Docker Hub or GHCR account
- Dokploy API key with proper permissions

**Output Format:**

After workflow execution:
```
✓ Docker image built and pushed
✓ Environment variables injected
✓ Deployment triggered successfully
```

## Quality Checklist

- [ ] Uses API-driven approach (not webhooks)
- [ ] External build (GitHub Actions, not Dokploy server)
- [ ] Two-step deployment (saveEnvironment → deploy)
- [ ] Retry logic implemented (5 attempts)
- [ ] Secrets stored in GitHub Secrets only
- [ ] Environment-specific configurations separated
- [ ] Path-based triggers in workflow
- [ ] Manual approval for production deployments

## Common Issues

**Issue:** 401 Unauthorized
**Solution:**
1. Verify API key is correct
2. Check user has "Access API/CLI" permission in Dokploy
3. Generate new API key if needed

**Issue:** 404 Application not found
**Solution:**
1. Call `/api/project.all` to verify application ID
2. Ensure application exists in Dokploy
3. Check `DOKPLOY_APP_ID` secret is correct

**Issue:** Deployment triggers but container doesn't update
**Solution:**
1. Verify Dokploy has registry credentials configured
2. Check image tag matches in workflow and Dokploy app
3. Ensure Dokploy app source type is "Docker"

**Issue:** Environment variables not updating
**Solution:**
1. Verify `saveEnvironment` call succeeds before `deploy`
2. Check YAML file format (no syntax errors)
3. Ensure proper escaping in curl payload

## See Also

- REFERENCE.md for complete API documentation
- EXAMPLES.md for full deployment scenarios
- `/rd:dokploy-new` - Create new deployment
- `/rd:dokploy-refine` - Optimize existing deployment
