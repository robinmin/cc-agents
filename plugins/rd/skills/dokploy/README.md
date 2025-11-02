# Dokploy Skill

Production-ready GitOps deployment workflows using Dokploy API-driven approach with GitHub Actions.

## Prerequisites

**REQUIRED: Set DOKPLOY_URL Environment Variable**

Before using this skill, configure your Dokploy server URL as an environment variable.

**macOS / Linux:**
```bash
export DOKPLOY_URL="https://your-dokploy-server.com"
# Add to ~/.bashrc or ~/.zshrc for persistence
```

**Windows PowerShell:**
```powershell
$env:DOKPLOY_URL = "https://your-dokploy-server.com"
# Add to $PROFILE for persistence
```

**Verification:**
```bash
bash plugins/rd/skills/dokploy/scripts/validate-env.sh
```

See SKILL.md for detailed setup instructions.

## Quick Start

### For New Deployments

Use the `/rd:dokploy-new` command to create a complete deployment setup:

```bash
/rd:dokploy-new --service myservice --env both --type app
```

This creates:
- Service directory structure in `sample/myservice/`
- Environment variable files in `envs/test/` and `envs/prod/`
- GitHub Actions workflows in `.github/workflows/`
- Complete configuration with retry logic and best practices

### For Existing Deployments

Use the `/rd:dokploy-refine` command to analyze and optimize:

```bash
/rd:dokploy-refine --service myservice --auto-fix
```

This will:
- Analyze current deployment configuration
- Identify issues (webhook usage, missing retry logic, etc.)
- Apply automated fixes
- Migrate to API-driven approach

## Documentation

### Main Files

- **SKILL.md** - Complete workflow guide with 5 phases
- **REFERENCE.md** - Comprehensive API documentation
- **EXAMPLES.md** - 5 production-ready examples

### Slash Commands

- `/rd:dokploy-new` - Create new deployment
- `/rd:dokploy-refine` - Optimize existing deployment

### Scripts

- `scripts/validate-env.sh` - Validate DOKPLOY_URL configuration

## Features

✅ **API-Driven Deployment** - Production-ready push-based GitOps
✅ **GitHub Actions Only** - No GitLab, Bitbucket, or other CI systems
✅ **Retry Logic** - 5 attempts with exponential backoff
✅ **Central Repository Pattern** - Multi-service mono-repo support
✅ **Multi-Environment** - Separate test and prod configurations
✅ **Secrets Management** - GitHub Secrets integration
✅ **Path-Based Triggers** - Deploy only when relevant files change
✅ **Manual Production Approval** - Prevent accidental production deploys

## Architecture

### Central Repository Structure

```
deployment-repo/
├── envs/
│   ├── test/               # Test environment configs
│   │   └── service.yaml
│   └── prod/               # Production environment configs
│       └── service.yaml
├── sample/
│   └── service-name/
│       ├── Dockerfile
│       ├── dokploy-app.yaml
│       └── src/
└── .github/
    └── workflows/
        ├── deploy-service-test.yml    # Auto-deploy on push
        └── deploy-service-prod.yml    # Manual trigger only
```

### Deployment Flow

1. Push code to GitHub
2. GitHub Actions builds Docker image
3. Push image to registry (Docker Hub/GHCR)
4. GitHub Actions calls Dokploy API to inject environment variables
5. GitHub Actions triggers deployment via API
6. Dokploy pulls image and starts container

**Key Principle:** Build externally, deploy via API, never build on Dokploy server.

## GitHub Secrets Required

For each deployment, configure these secrets in GitHub repository settings:

```
DOCKERHUB_USERNAME        # Docker Hub username
DOCKERHUB_TOKEN           # Docker Hub access token
DOKPLOY_URL              # Your Dokploy server URL (matches $DOKPLOY_URL)
DOKPLOY_API_KEY          # Generated from Dokploy /settings/profile
DOKPLOY_APP_ID           # Application ID from Dokploy
```

## Common Use Cases

### Create New Python Flask API

```bash
/rd:dokploy-new --service flask-api --language python --env both
```

### Migrate Existing Deployment to API

```bash
/rd:dokploy-refine --service myservice --focus api --auto-fix
```

### Set Up Multi-Service Repository

```bash
/rd:dokploy-new --service auth-service --env both
/rd:dokploy-new --service user-service --env both
/rd:dokploy-new --service payment-service --env both
```

## Troubleshooting

### "DOKPLOY_URL not set" Error

**Solution:**
```bash
export DOKPLOY_URL="https://your-dokploy-server.com"
source ~/.bashrc  # or ~/.zshrc
```

### "401 Unauthorized" in GitHub Actions

**Causes:**
1. API key incorrect
2. User lacks "Access API/CLI" permission in Dokploy

**Solution:**
1. Generate new API key from Dokploy /settings/profile
2. Admin must enable "Access API/CLI" permission for user
3. Update `DOKPLOY_API_KEY` in GitHub Secrets

### "404 Application not found"

**Solution:**
Get correct application ID:
```bash
curl -X GET "${DOKPLOY_URL}/api/project.all" \
  -H "x-api-key: ${DOKPLOY_API_KEY}"
```

### Deployment Succeeds but Container Not Updated

**Causes:**
1. Registry credentials missing in Dokploy
2. Image tag mismatch

**Solution:**
1. Add registry credentials in Dokploy Registry section
2. Verify image tag matches in workflow and Dokploy app

## Best Practices

1. **Always use test environment first** - Test deployments before production
2. **Manual production approval** - Use `workflow_dispatch` for prod
3. **Path-based triggers** - Only deploy when relevant files change
4. **Commit SHA tagging** - Tag images with git commit for traceability
5. **Separate API keys** - Use different keys for test and prod
6. **Rotate secrets regularly** - Rotate API keys every 90 days

## Support

- **Documentation**: See SKILL.md, REFERENCE.md, EXAMPLES.md
- **Issues**: Report bugs in your cc-agents repository
- **Dokploy Docs**: https://docs.dokploy.com/

## Version

- **Status**: Production Ready
- **Skill Type**: Complete (with REFERENCE.md and EXAMPLES.md)

## License

Part of cc-agents plugin system. See main repository LICENSE.
