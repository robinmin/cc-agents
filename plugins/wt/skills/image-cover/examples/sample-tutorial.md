---
title: "How to Set Up a Complete CI/CD Pipeline with GitHub Actions"
difficulty: intermediate
time: "30 minutes"
tags: [devops, github-actions, tutorial]
---

# How to Set Up a Complete CI/CD Pipeline with GitHub Actions

Follow this step-by-step guide to build a production-ready CI/CD pipeline that tests, builds, and deploys your application automatically.

## Prerequisites

Before starting, ensure you have:
- A GitHub repository with code to deploy
- Basic knowledge of YAML syntax
- A deployment target (AWS, Vercel, Docker registry, etc.)

## Step 1: Create the Workflow File

Create `.github/workflows/ci-cd.yml` in your repository:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
```

## Step 2: Add Build Stage

Add a build job that runs after tests pass:

```yaml
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node.js
        uses: actions/setup-node@v4
      - name: Install and build
        run: |
          npm ci
          npm run build
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-output
          path: dist/
```

## Step 3: Configure Deployment

Add deployment based on your target. For Vercel:

```yaml
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## Step 4: Add Secrets

Navigate to your repository settings and add required secrets:
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add each secret your deployment needs

## Step 5: Test the Pipeline

Push your changes and watch the pipeline run:

```bash
git add .github/workflows/ci-cd.yml
git commit -m "Add CI/CD pipeline"
git push origin main
```

Check the **Actions** tab in your repository to see the workflow executing.

## Troubleshooting

**Tests failing locally but passing in CI?**
- Check Node.js version matches
- Verify all dependencies are in package.json

**Deployment fails with authentication error?**
- Verify secrets are correctly set
- Check token hasn't expired

**Build artifacts not found?**
- Ensure upload-artifact comes before build job ends
- Verify path is correct (relative to repository root)

## Next Steps

- Add environment-specific configurations
- Implement rollback strategies
- Set up status badges in your README
- Add manual approval for production deployments

Congratulations! You now have a fully automated CI/CD pipeline.
