---
description: Analyze and refine existing Dokploy deployment configuration, migrating to API-driven approach and implementing production best practices.
---

# dokploy-refine

Analyze and optimize an existing Dokploy deployment setup with automated improvements and best practice recommendations.

## Prerequisites

**REQUIRED: DOKPLOY_URL Environment Variable**

Before using this command, set the `DOKPLOY_URL` environment variable:

```bash
export DOKPLOY_URL="https://your-dokploy-server.com"
```

This command will check for `DOKPLOY_URL` and prompt you to set it if missing.

## Purpose

Improves existing Dokploy deployments by:
- Migrating from webhook-based to API-driven deployment
- Adding retry logic and error handling
- Implementing two-step deployment (saveEnvironment + deploy)
- Separating test and production environments
- Adding proper secrets management
- Optimizing GitHub Actions workflows
- Fixing common misconfigurations

## Usage

```bash
# Interactive analysis (recommended)
/rd:dokploy-refine

# Analyze specific service
/rd:dokploy-refine --service <name>

# Analyze and auto-fix issues
/rd:dokploy-refine --service <name> --auto-fix

# Dry run (show recommendations without changing files)
/rd:dokploy-refine --service <name> --dry-run
```

## Parameters

- `--service <name>` - Service name to analyze
- `--auto-fix` - Automatically apply recommended fixes
- `--dry-run` - Show analysis and recommendations without modifying files
- `--focus <area>` - Focus on specific area:
  - `workflow` - GitHub Actions workflow optimization
  - `secrets` - Secrets management improvements
  - `structure` - Repository structure refinement
  - `api` - Migration to API-driven approach
  - `all` - Comprehensive analysis (default)
- `--repo-path <path>` - Path to deployment repository (defaults to current directory)

## What Happens

### Phase 1: Discovery and Analysis

Claude will automatically:

1. **Locate Deployment Files:**
   - Find service in `sample/` directory
   - Locate environment variable files in `envs/`
   - Find GitHub Actions workflows in `.github/workflows/`
   - Identify Dokploy configuration files

2. **Analyze Current Configuration:**
   - Check deployment method (webhook vs API)
   - Verify retry logic exists
   - Check environment variable management
   - Analyze secrets handling
   - Review multi-environment setup
   - Validate GitHub Actions workflow structure

3. **Identify Issues:**
   - Missing retry logic
   - Webhook-based deployment (should be API)
   - Single-step deployment (missing saveEnvironment)
   - Missing environment separation
   - Hardcoded secrets in files
   - No path-based triggers
   - Missing manual approval for production

### Phase 2: Recommendations

Claude provides categorized recommendations:

**Critical Issues (Must Fix):**
- Using webhook instead of API
- Secrets committed to repository
- No retry logic
- Missing saveEnvironment step

**High Priority (Should Fix):**
- No test/prod environment separation
- Missing path-based triggers
- No manual approval for production
- Incorrect error handling

**Medium Priority (Nice to Have):**
- Suboptimal Docker image tagging
- Missing deployment notifications
- Could use reusable workflows
- Environment variable organization

**Low Priority (Optional):**
- Workflow naming improvements
- Additional monitoring
- Performance optimizations

### Phase 3: Automated Fixes

If `--auto-fix` is enabled, Claude will:

1. **Migrate to API-Driven Deployment:**
   - Replace webhook calls with API endpoints
   - Add two-step deployment process
   - Implement retry logic with exponential backoff

2. **Fix Secrets Management:**
   - Move hardcoded secrets to GitHub Secrets placeholders
   - Create template environment variable files
   - Add security warnings in comments

3. **Add Environment Separation:**
   - Split single workflow into test and prod
   - Add manual trigger for production
   - Create separate environment variable files

4. **Optimize Workflows:**
   - Add path-based triggers
   - Improve error handling
   - Add deployment status logging
   - Update to latest GitHub Actions versions

5. **Update Documentation:**
   - Add inline comments explaining changes
   - Update README if exists
   - Create migration guide

## Analysis Report Format

```markdown
# Dokploy Deployment Analysis: <service-name>

## Overview
- Service Type: application
- Deployment Method: webhook (⚠ should be API)
- Environments: single (⚠ should be test + prod)
- Retry Logic: missing (⚠ critical)
- Secrets Management: hardcoded (⚠ critical)

## Issues Found

### Critical Issues (4)

❌ **Using Webhook-Based Deployment**
- Location: .github/workflows/deploy.yml:45
- Impact: Fragile, no error handling, branch matching issues
- Fix: Migrate to API-driven deployment
- Effort: Medium

❌ **Missing Retry Logic**
- Location: .github/workflows/deploy.yml:50
- Impact: Deployments fail on temporary network issues
- Fix: Add 5-attempt retry with exponential backoff
- Effort: Low

❌ **Secrets Hardcoded in Files**
- Location: envs/production.yaml:12-15
- Impact: Security vulnerability
- Fix: Move to GitHub Secrets
- Effort: Low

❌ **Single-Step Deployment**
- Location: .github/workflows/deploy.yml:50
- Impact: Environment variables not updated before deploy
- Fix: Add saveEnvironment step before deploy
- Effort: Low

### High Priority Issues (3)

⚠ **No Environment Separation**
- Current: Single workflow for all environments
- Fix: Create separate test and prod workflows
- Effort: Medium

⚠ **No Manual Approval for Production**
- Current: Auto-deploys to production
- Fix: Add workflow_dispatch trigger
- Effort: Low

⚠ **Missing Path-Based Triggers**
- Current: Triggers on any push to main
- Fix: Add paths filter to workflow
- Effort: Low

### Medium Priority Issues (2)

ℹ **Using 'latest' Tag Only**
- Location: .github/workflows/deploy.yml:30
- Recommendation: Also tag with commit SHA
- Effort: Low

ℹ **No Deployment Notifications**
- Recommendation: Add success/failure notifications
- Effort: Low

## Recommended Actions

### Immediate (Critical Issues)
1. Migrate to API-driven deployment
2. Add retry logic to all API calls
3. Move secrets to GitHub Secrets
4. Implement two-step deployment

### Short-term (High Priority)
5. Create separate test and prod workflows
6. Add manual trigger for production
7. Add path-based triggers

### Long-term (Medium/Low Priority)
8. Implement commit SHA tagging
9. Add deployment notifications
10. Consider reusable workflows

## Estimated Migration Time
- Total effort: 2-3 hours
- Critical fixes: 30 minutes
- High priority: 1 hour
- Medium/Low priority: 1 hour

## Migration Path

### Step 1: Backup Current Configuration
```bash
git checkout -b dokploy-refine-backup
git add .
git commit -m "backup: current Dokploy configuration"
```

### Step 2: Apply Critical Fixes
- Migrate to API deployment
- Add retry logic
- Fix secrets management
- Add two-step deployment

### Step 3: Test Changes
- Deploy to test environment
- Verify all API calls succeed
- Check environment variables update correctly

### Step 4: Apply Remaining Fixes
- Add environment separation
- Add manual production trigger
- Optimize workflows

### Step 5: Validate
- Test both test and prod workflows
- Verify all GitHub Secrets configured
- Confirm manual approval works
```

## Examples

### Example 1: Comprehensive Analysis
```bash
/rd:dokploy-refine --service flask-api

# Claude analyzes:
# → Current workflow: .github/workflows/deploy-flask-api.yml
# → Environment files: envs/flask-api.yaml
# → Service directory: sample/flask-api/

# Reports:
# ❌ 4 critical issues found
# ⚠ 3 high priority issues found
# ℹ 2 medium priority issues found

# Provides detailed recommendations and migration path
```

### Example 2: Auto-Fix Critical Issues
```bash
/rd:dokploy-refine --service user-service --auto-fix --focus api

# Claude automatically:
# ✓ Replaced webhook with API calls
# ✓ Added retry logic (5 attempts)
# ✓ Added saveEnvironment step
# ✓ Updated error handling
# ✓ Created backup branch

# Files modified:
# - .github/workflows/deploy-user-service-test.yml
# - .github/workflows/deploy-user-service-prod.yml (created)
```

### Example 3: Dry Run Analysis
```bash
/rd:dokploy-refine --service auth-api --dry-run

# Claude shows what would change:
# → Would migrate to API deployment
# → Would add retry logic
# → Would split into test/prod workflows
# → Would move secrets to GitHub Secrets

# No files modified (dry run mode)
```

### Example 4: Focus on Secrets
```bash
/rd:dokploy-refine --service payment-service --focus secrets

# Claude analyzes only secrets management:
# ❌ Database password in envs/prod/payment-service.yaml
# ❌ API key in workflow file
# ⚠ Redis password in docker-compose.yml

# Recommendations:
# 1. Move DATABASE_PASSWORD to GitHub Secrets
# 2. Move API_KEY to GitHub Secrets
# 3. Move REDIS_PASSWORD to GitHub Secrets
```

## Automated Fixes Applied

### Fix 1: Migrate to API-Driven Deployment

**Before (webhook-based):**
```yaml
- name: Trigger deployment
  run: |
    curl -X POST "${{ secrets.WEBHOOK_URL }}"
```

**After (API-driven with retry):**
```yaml
- name: Inject environment variables
  run: |
    max_retries=5
    retry_count=0

    while [ $retry_count -lt $max_retries ]; do
      response=$(curl -X POST \
        "${{ secrets.DOKPLOY_URL }}/api/application.saveEnvironment" \
        -H "x-api-key: ${{ secrets.DOKPLOY_API_KEY }}" \
        -H "Content-Type: application/json" \
        -d "{\"applicationId\": \"${{ secrets.DOKPLOY_APP_ID }}\", \"env\": \"${{ steps.load-env.outputs.env_vars }}\"}" \
        -w "\n%{http_code}" -s)

      http_code=$(echo "$response" | tail -n1)

      if [ "$http_code" = "200" ]; then
        echo "✓ Environment variables injected"
        break
      else
        retry_count=$((retry_count + 1))
        [ $retry_count -lt $max_retries ] && sleep $((2 ** retry_count))
      fi
    done

- name: Trigger deployment
  run: |
    max_retries=5
    retry_count=0

    while [ $retry_count -lt $max_retries ]; do
      response=$(curl -X POST \
        "${{ secrets.DOKPLOY_URL }}/api/application.deploy" \
        -H "x-api-key: ${{ secrets.DOKPLOY_API_KEY }}" \
        -H "Content-Type: application/json" \
        -d "{\"applicationId\": \"${{ secrets.DOKPLOY_APP_ID }}\"}" \
        -w "\n%{http_code}" -s)

      http_code=$(echo "$response" | tail -n1)

      if [ "$http_code" = "200" ]; then
        echo "✓ Deployment successful"
        exit 0
      else
        retry_count=$((retry_count + 1))
        [ $retry_count -lt $max_retries ] && sleep $((2 ** retry_count))
      fi
    done

    exit 1
```

### Fix 2: Separate Test and Production

**Before (single workflow):**
```yaml
name: Deploy to Dokploy
on:
  push:
    branches: ["main"]
```

**After (separate workflows):**

**Test workflow:**
```yaml
name: Deploy to Dokploy Test
on:
  push:
    branches: ["main"]
    paths:
      - "sample/myservice/**"
      - "envs/test/myservice.yaml"
```

**Production workflow:**
```yaml
name: Deploy to Dokploy Production
on:
  workflow_dispatch:
    inputs:
      confirm:
        description: 'Type "deploy" to confirm'
        required: true
```

### Fix 3: Secrets Management

**Before (hardcoded):**
```yaml
# envs/prod/myservice.yaml
DATABASE_URL=postgresql://user:password123@db:5432/prod
API_KEY=sk_live_abc123xyz
```

**After (using GitHub Secrets):**
```yaml
# envs/prod/myservice.yaml
# SECURITY: Sensitive values stored in GitHub Secrets
# Configure these in repository settings:
# - DATABASE_URL (full connection string)
# - API_KEY (production API key)

LOG_LEVEL=info
PORT=8000
ENABLE_DEBUG=false
```

**Workflow updated to inject secrets:**
```yaml
- name: Load environment with secrets
  id: load-env
  run: |
    # Load non-sensitive vars from file
    ENV_CONTENT=$(cat envs/prod/myservice.yaml)

    # Append sensitive vars from GitHub Secrets
    ENV_CONTENT="${ENV_CONTENT}\nDATABASE_URL=${{ secrets.DATABASE_URL }}"
    ENV_CONTENT="${ENV_CONTENT}\nAPI_KEY=${{ secrets.API_KEY }}"

    echo "env_vars=$ENV_CONTENT" >> $GITHUB_OUTPUT
```

### Fix 4: Add Path-Based Triggers

**Before (triggers on any change):**
```yaml
on:
  push:
    branches: ["main"]
```

**After (triggers only on relevant changes):**
```yaml
on:
  push:
    branches: ["main"]
    paths:
      - "sample/myservice/**"      # Service code changes
      - "envs/test/myservice.yaml" # Environment config changes
      - ".github/workflows/deploy-myservice-test.yml" # Workflow changes
```

## Validation

After applying fixes, Claude automatically validates:
- [ ] All API calls have retry logic
- [ ] No secrets in repository files
- [ ] Test and prod workflows separated
- [ ] Manual approval required for production
- [ ] Path-based triggers configured
- [ ] Two-step deployment implemented
- [ ] Error handling present

## Output Summary

```
✅ Dokploy Deployment Refined

Service: flask-api
Issues Fixed: 9 (4 critical, 3 high, 2 medium)

🔧 Changes Applied:
  ✓ Migrated to API-driven deployment
  ✓ Added retry logic with exponential backoff
  ✓ Implemented two-step deployment
  ✓ Moved secrets to GitHub Secrets
  ✓ Split test and prod workflows
  ✓ Added manual production approval
  ✓ Added path-based triggers
  ✓ Improved error handling
  ✓ Updated documentation

📝 Files Modified:
  ✓ .github/workflows/deploy-flask-api-test.yml (updated)
  ✓ .github/workflows/deploy-flask-api-prod.yml (created)
  ✓ envs/test/flask-api.yaml (cleaned)
  ✓ envs/prod/flask-api.yaml (cleaned)

🔑 New GitHub Secrets Required:
  → DOKPLOY_URL (replace WEBHOOK_URL)
  → DOKPLOY_API_KEY (new)
  → DOKPLOY_APP_ID_FLASK_API_TEST (new)
  → DOKPLOY_APP_ID_FLASK_API_PROD (new)
  → DATABASE_URL (moved from file)
  → API_KEY (moved from file)

📋 Next Steps:
  1. Review changes in git diff
  2. Configure new GitHub Secrets
  3. Get application IDs from Dokploy:
     curl -X GET "$DOKPLOY_URL/api/project.all" \
       -H "x-api-key: $DOKPLOY_API_KEY"
  4. Test deployment to test environment
  5. Verify environment variables updated
  6. Test manual production deployment
  7. Remove old WEBHOOK_URL secret
  8. Commit changes to repository

⚠ Breaking Changes:
  - Workflow now requires DOKPLOY_API_KEY instead of WEBHOOK_URL
  - Production deployments now require manual trigger
  - Must configure new GitHub Secrets before pushing

📖 Migration Guide:
  See MIGRATION.md for detailed upgrade instructions
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Service not found" | Verify service exists in sample/ directory |
| "No workflows found" | Check .github/workflows/ directory exists |
| "Cannot parse workflow" | Workflow file may have syntax errors |
| "Backup failed" | Ensure git repository initialized |
| "Too many changes" | Use --focus to refine specific areas |

## Best Practices

1. **Always Create Backup:**
   - Create backup branch before refining
   - Test changes before merging

2. **Incremental Migration:**
   - Start with critical issues
   - Test after each major change
   - Don't apply all fixes at once

3. **Review Before Committing:**
   - Review all changes in git diff
   - Verify secrets moved correctly
   - Test workflows in test environment first

4. **Document Changes:**
   - Update README with new setup
   - Document breaking changes
   - Create migration guide for team

## Related Commands

- `/rd:dokploy-new` - Create new deployment from scratch
- `/rd:skill-evaluate dokploy` - Review Dokploy skill quality

## See Also

- `skills/dokploy/SKILL.md` - Complete workflow documentation
- `skills/dokploy/REFERENCE.md` - API reference
- `skills/dokploy/EXAMPLES.md` - Example configurations
