---
description: Deploy application to staging environment
allowed-tools: Bash
model: opus
argument-hint: "<environment> [--dry-run]"
disable-model-invocation: true
---

# Deploy App

Deploy the application to the specified environment.

## Usage

Provide the target environment as the first argument:
- `staging` - Deploy to staging
- `production` - Deploy to production (requires approval)

## Steps

1. Validate environment argument from $1
2. Run pre-deployment checks via !`npm run lint`
3. Build the application via !`npm run build`
4. Deploy to target environment
5. Verify deployment health
