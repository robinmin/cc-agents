# Dokploy Deployment Examples

Complete, real-world examples for deploying applications to Dokploy using GitHub Actions and central repository pattern.

## Prerequisites

All examples use `$DOKPLOY_URL` environment variable. See SKILL.md for setup. GitHub Secrets `DOKPLOY_URL` should match your environment variable.

## Example 1: New Python Web Application (Test Environment)

**Context:** Deploy a Python Flask application to Dokploy test environment with auto-deployment on push to main branch.

**Repository Structure:**
```
deployment-repo/
├── sample/
│   └── flask-api/
│       ├── Dockerfile
│       ├── requirements.txt
│       └── src/
│           └── app.py
├── envs/
│   └── test/
│       └── flask-api.yaml
└── .github/
    └── workflows/
        └── deploy-flask-api-test.yml
```

**Input Files:**

`sample/flask-api/Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

EXPOSE 5000

CMD ["python", "src/app.py"]
```

`envs/test/flask-api.yaml`:
```yaml
FLASK_ENV=development
LOG_LEVEL=debug
DATABASE_URL=postgresql://testdb:5432/flask
API_TIMEOUT=30
CORS_ORIGINS=http://localhost:3000,https://test.example.com
```

`.github/workflows/deploy-flask-api-test.yml`:
```yaml
name: Deploy Flask API to Dokploy Test

on:
  push:
    branches: ["main"]
    paths:
      - "sample/flask-api/**"
      - "envs/test/flask-api.yaml"

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
          context: ./sample/flask-api
          push: true
          tags: |
            ${{ secrets.DOCKERHUB_USERNAME }}/flask-api:latest
            ${{ secrets.DOCKERHUB_USERNAME }}/flask-api:${{ github.sha }}

      - name: Load environment variables from YAML
        id: load-env
        run: |
          ENV_CONTENT=$(cat envs/test/flask-api.yaml | sed 's/$/\\n/' | tr -d '\n')
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
              -d "{\"applicationId\": \"${{ secrets.DOKPLOY_APP_ID_FLASK_TEST }}\", \"env\": \"${{ steps.load-env.outputs.env_vars }}\"}" \
              -w "\n%{http_code}" -s)

            http_code=$(echo "$response" | tail -n1)

            if [ "$http_code" = "200" ]; then
              echo "✓ Environment variables injected successfully"
              break
            else
              retry_count=$((retry_count + 1))
              echo "⚠ Attempt $retry_count failed with code $http_code"
              [ $retry_count -lt $max_retries ] && sleep $((2 ** retry_count))
            fi
          done

          if [ $retry_count -eq $max_retries ]; then
            echo "✗ Failed to inject environment variables after $max_retries attempts"
            exit 1
          fi

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
              -d "{\"applicationId\": \"${{ secrets.DOKPLOY_APP_ID_FLASK_TEST }}\"}" \
              -w "\n%{http_code}" -s)

            http_code=$(echo "$response" | tail -n1)

            if [ "$http_code" = "200" ]; then
              echo "✓ Deployment triggered successfully"
              exit 0
            else
              retry_count=$((retry_count + 1))
              echo "⚠ Attempt $retry_count failed with code $http_code"
              [ $retry_count -lt $max_retries ] && sleep $((2 ** retry_count))
            fi
          done

          echo "✗ Deployment failed after $max_retries attempts"
          exit 1
```

**GitHub Secrets Required:**
```
DOCKERHUB_USERNAME=myusername
DOCKERHUB_TOKEN=dckr_pat_abc123...
DOKPLOY_URL=https://your-dokploy-server.com  # Use your actual Dokploy server URL
DOKPLOY_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DOKPLOY_APP_ID_FLASK_TEST=app-flask-test-456
```

**Output:**
```
✓ Docker image built: myusername/flask-api:latest
✓ Docker image built: myusername/flask-api:abc123def
✓ Environment variables injected successfully
✓ Deployment triggered successfully
```

---

## Example 2: Production Deployment (Manual Trigger)

**Context:** Deploy the same Flask API to production with manual approval required.

**Input File:**

`.github/workflows/deploy-flask-api-prod.yml`:
```yaml
name: Deploy Flask API to Dokploy Production

on:
  workflow_dispatch:
    inputs:
      confirm:
        description: 'Type "deploy" to confirm production deployment'
        required: true
        default: ''

jobs:
  validate-confirmation:
    runs-on: ubuntu-latest
    steps:
      - name: Validate deployment confirmation
        run: |
          if [ "${{ github.event.inputs.confirm }}" != "deploy" ]; then
            echo "✗ Deployment cancelled. You must type 'deploy' to confirm."
            exit 1
          fi
          echo "✓ Deployment confirmed"

  build-and-deploy:
    needs: validate-confirmation
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
          context: ./sample/flask-api
          push: true
          tags: |
            ${{ secrets.DOCKERHUB_USERNAME }}/flask-api:latest
            ${{ secrets.DOCKERHUB_USERNAME }}/flask-api:prod-${{ github.sha }}

      - name: Load production environment variables
        id: load-env
        run: |
          ENV_CONTENT=$(cat envs/prod/flask-api.yaml | sed 's/$/\\n/' | tr -d '\n')
          echo "env_vars=$ENV_CONTENT" >> $GITHUB_OUTPUT

      - name: Inject environment variables to Dokploy Production
        run: |
          max_retries=5
          retry_count=0

          while [ $retry_count -lt $max_retries ]; do
            response=$(curl -X POST \
              "${{ secrets.DOKPLOY_URL }}/api/application.saveEnvironment" \
              -H "accept: application/json" \
              -H "x-api-key: ${{ secrets.DOKPLOY_API_KEY }}" \
              -H "Content-Type: application/json" \
              -d "{\"applicationId\": \"${{ secrets.DOKPLOY_APP_ID_FLASK_PROD }}\", \"env\": \"${{ steps.load-env.outputs.env_vars }}\"}" \
              -w "\n%{http_code}" -s)

            http_code=$(echo "$response" | tail -n1)

            if [ "$http_code" = "200" ]; then
              echo "✓ Production environment variables injected"
              break
            else
              retry_count=$((retry_count + 1))
              echo "⚠ Attempt $retry_count failed with code $http_code"
              [ $retry_count -lt $max_retries ] && sleep $((2 ** retry_count))
            fi
          done

      - name: Deploy to Dokploy Production
        run: |
          max_retries=5
          retry_count=0

          while [ $retry_count -lt $max_retries ]; do
            response=$(curl -X POST \
              "${{ secrets.DOKPLOY_URL }}/api/application.deploy" \
              -H "accept: application/json" \
              -H "x-api-key: ${{ secrets.DOKPLOY_API_KEY }}" \
              -H "Content-Type: application/json" \
              -d "{\"applicationId\": \"${{ secrets.DOKPLOY_APP_ID_FLASK_PROD }}\"}" \
              -w "\n%{http_code}" -s)

            http_code=$(echo "$response" | tail -n1)

            if [ "$http_code" = "200" ]; then
              echo "✓ Production deployment successful"
              exit 0
            else
              retry_count=$((retry_count + 1))
              echo "⚠ Attempt $retry_count failed with code $http_code"
              [ $retry_count -lt $max_retries ] && sleep $((2 ** retry_count))
            fi
          done

          echo "✗ Production deployment failed"
          exit 1

      - name: Post-deployment notification
        if: success()
        run: |
          echo "🎉 Production deployment completed successfully"
          echo "Image: ${{ secrets.DOCKERHUB_USERNAME }}/flask-api:prod-${{ github.sha }}"
```

**Additional GitHub Secret:**
```
DOKPLOY_APP_ID_FLASK_PROD=app-flask-prod-789
```

**Usage:**
1. Go to GitHub Actions tab
2. Select "Deploy Flask API to Dokploy Production"
3. Click "Run workflow"
4. Type "deploy" in confirmation field
5. Click "Run workflow" button

---

## Example 3: Multi-Service Deployment (Node.js + PostgreSQL)

**Context:** Deploy a Node.js API with PostgreSQL database using Docker Compose on Dokploy.

**Repository Structure:**
```
deployment-repo/
├── sample/
│   └── node-postgres-app/
│       ├── Dockerfile
│       ├── docker-compose.yml
│       ├── dokploy-compose.yaml
│       ├── package.json
│       └── src/
│           └── index.js
├── envs/
│   └── test/
│       └── node-postgres-app.yaml
└── .github/
    └── workflows/
        └── deploy-node-postgres-test.yml
```

**Input Files:**

`sample/node-postgres-app/docker-compose.yml`:
```yaml
version: '3.8'

services:
  api:
    image: ${DOCKERHUB_USERNAME}/node-api:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NODE_ENV=${NODE_ENV}
    depends_on:
      - postgres

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

`envs/test/node-postgres-app.yaml`:
```yaml
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@postgres:5432/testdb
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=testdb
API_PORT=3000
```

`.github/workflows/deploy-node-postgres-test.yml`:
```yaml
name: Deploy Node.js + PostgreSQL to Dokploy Test

on:
  push:
    branches: ["main"]
    paths:
      - "sample/node-postgres-app/**"
      - "envs/test/node-postgres-app.yaml"

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

      - name: Build and push Node.js API image
        uses: docker/build-push-action@v4
        with:
          context: ./sample/node-postgres-app
          file: ./sample/node-postgres-app/Dockerfile
          push: true
          tags: ${{ secrets.DOCKERHUB_USERNAME }}/node-api:latest

      - name: Load environment variables
        id: load-env
        run: |
          # Add DOCKERHUB_USERNAME to environment variables
          echo "DOCKERHUB_USERNAME=${{ secrets.DOCKERHUB_USERNAME }}" > temp_env.yaml
          cat envs/test/node-postgres-app.yaml >> temp_env.yaml

          ENV_CONTENT=$(cat temp_env.yaml | sed 's/$/\\n/' | tr -d '\n')
          echo "env_vars=$ENV_CONTENT" >> $GITHUB_OUTPUT

          rm temp_env.yaml

      - name: Update Compose environment variables
        run: |
          max_retries=5
          retry_count=0

          while [ $retry_count -lt $max_retries ]; do
            response=$(curl -X POST \
              "${{ secrets.DOKPLOY_URL }}/api/compose.update" \
              -H "accept: application/json" \
              -H "x-api-key: ${{ secrets.DOKPLOY_API_KEY }}" \
              -H "Content-Type: application/json" \
              -d "{\"composeId\": \"${{ secrets.DOKPLOY_COMPOSE_ID_NODE_TEST }}\", \"env\": \"${{ steps.load-env.outputs.env_vars }}\"}" \
              -w "\n%{http_code}" -s)

            http_code=$(echo "$response" | tail -n1)

            if [ "$http_code" = "200" ]; then
              echo "✓ Compose environment updated"
              break
            else
              retry_count=$((retry_count + 1))
              echo "⚠ Attempt $retry_count failed"
              [ $retry_count -lt $max_retries ] && sleep $((2 ** retry_count))
            fi
          done

      - name: Deploy Compose stack
        run: |
          max_retries=5
          retry_count=0

          while [ $retry_count -lt $max_retries ]; do
            response=$(curl -X POST \
              "${{ secrets.DOKPLOY_URL }}/api/compose.deploy" \
              -H "accept: application/json" \
              -H "x-api-key: ${{ secrets.DOKPLOY_API_KEY }}" \
              -H "Content-Type: application/json" \
              -d "{\"composeId\": \"${{ secrets.DOKPLOY_COMPOSE_ID_NODE_TEST }}\"}" \
              -w "\n%{http_code}" -s)

            http_code=$(echo "$response" | tail -n1)

            if [ "$http_code" = "200" ]; then
              echo "✓ Compose stack deployed"
              exit 0
            else
              retry_count=$((retry_count + 1))
              echo "⚠ Attempt $retry_count failed"
              [ $retry_count -lt $max_retries ] && sleep $((2 ** retry_count))
            fi
          done

          echo "✗ Deployment failed"
          exit 1
```

**GitHub Secret:**
```
DOKPLOY_COMPOSE_ID_NODE_TEST=compose-node-123
```

---

## Example 4: Central Repository with Multiple Services

**Context:** Manage deployments for multiple microservices in a single central repository.

**Repository Structure:**
```
deployment-central-repo/
├── sample/
│   ├── auth-service/
│   │   ├── Dockerfile
│   │   └── src/
│   ├── user-service/
│   │   ├── Dockerfile
│   │   └── src/
│   └── payment-service/
│       ├── Dockerfile
│       └── src/
├── envs/
│   ├── test/
│   │   ├── auth-service.yaml
│   │   ├── user-service.yaml
│   │   └── payment-service.yaml
│   └── prod/
│       ├── auth-service.yaml
│       ├── user-service.yaml
│       └── payment-service.yaml
└── .github/
    └── workflows/
        ├── deploy-auth-test.yml
        ├── deploy-auth-prod.yml
        ├── deploy-user-test.yml
        ├── deploy-user-prod.yml
        ├── deploy-payment-test.yml
        └── deploy-payment-prod.yml
```

**Shared Workflow Template:**

`.github/workflows/deploy-auth-test.yml`:
```yaml
name: Deploy Auth Service to Test

on:
  push:
    branches: ["main"]
    paths:
      - "sample/auth-service/**"
      - "envs/test/auth-service.yaml"

jobs:
  deploy:
    uses: ./.github/workflows/_deploy-template.yml
    with:
      service_name: "auth-service"
      environment: "test"
      dockerfile_path: "./sample/auth-service"
    secrets:
      DOCKERHUB_USERNAME: ${{ secrets.DOCKERHUB_USERNAME }}
      DOCKERHUB_TOKEN: ${{ secrets.DOCKERHUB_TOKEN }}
      DOKPLOY_URL: ${{ secrets.DOKPLOY_URL }}
      DOKPLOY_API_KEY: ${{ secrets.DOKPLOY_API_KEY }}
      DOKPLOY_APP_ID: ${{ secrets.DOKPLOY_APP_ID_AUTH_TEST }}
```

`.github/workflows/_deploy-template.yml` (Reusable Workflow):
```yaml
name: Reusable Deploy Template

on:
  workflow_call:
    inputs:
      service_name:
        required: true
        type: string
      environment:
        required: true
        type: string
      dockerfile_path:
        required: true
        type: string
    secrets:
      DOCKERHUB_USERNAME:
        required: true
      DOCKERHUB_TOKEN:
        required: true
      DOKPLOY_URL:
        required: true
      DOKPLOY_API_KEY:
        required: true
      DOKPLOY_APP_ID:
        required: true

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: ${{ inputs.dockerfile_path }}
          push: true
          tags: ${{ secrets.DOCKERHUB_USERNAME }}/${{ inputs.service_name }}:latest

      - name: Load environment variables
        id: load-env
        run: |
          ENV_CONTENT=$(cat envs/${{ inputs.environment }}/${{ inputs.service_name }}.yaml | sed 's/$/\\n/' | tr -d '\n')
          echo "env_vars=$ENV_CONTENT" >> $GITHUB_OUTPUT

      - name: Inject and deploy
        run: |
          # Save environment
          curl -X POST \
            "${{ secrets.DOKPLOY_URL }}/api/application.saveEnvironment" \
            -H "x-api-key: ${{ secrets.DOKPLOY_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d "{\"applicationId\": \"${{ secrets.DOKPLOY_APP_ID }}\", \"env\": \"${{ steps.load-env.outputs.env_vars }}\"}"

          # Deploy
          curl -X POST \
            "${{ secrets.DOKPLOY_URL }}/api/application.deploy" \
            -H "x-api-key: ${{ secrets.DOKPLOY_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d "{\"applicationId\": \"${{ secrets.DOKPLOY_APP_ID }}\"}"
```

**Benefits:**
- Single reusable workflow template
- Path-based triggers (only deploy changed services)
- Consistent deployment process across all services
- Easy to add new services (just copy workflow file and update parameters)

---

## Example 5: Rollback Strategy

**Context:** Rollback to a previous Docker image version if deployment fails.

```yaml
name: Deploy with Rollback

on:
  push:
    branches: ["main"]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Get current deployment info
        id: current
        run: |
          response=$(curl -X GET \
            "${{ secrets.DOKPLOY_URL }}/api/deployment.all?applicationId=${{ secrets.DOKPLOY_APP_ID }}" \
            -H "x-api-key: ${{ secrets.DOKPLOY_API_KEY }}")

          # Extract last successful deployment image tag
          echo "previous_tag=$(echo $response | jq -r '.deployments[0].imageTag')" >> $GITHUB_OUTPUT

      - name: Build and push new image
        uses: docker/build-push-action@v4
        with:
          context: ./sample/myservice
          push: true
          tags: |
            ${{ secrets.DOCKERHUB_USERNAME }}/myservice:latest
            ${{ secrets.DOCKERHUB_USERNAME }}/myservice:${{ github.sha }}

      - name: Deploy new version
        id: deploy
        continue-on-error: true
        run: |
          # Deploy logic here
          curl -X POST "${{ secrets.DOKPLOY_URL }}/api/application.deploy" \
            -H "x-api-key: ${{ secrets.DOKPLOY_API_KEY }}" \
            -d "{\"applicationId\": \"${{ secrets.DOKPLOY_APP_ID }}\"}"

      - name: Rollback on failure
        if: steps.deploy.outcome == 'failure'
        run: |
          echo "⚠ Deployment failed, rolling back to ${{ steps.current.outputs.previous_tag }}"

          # Update app to use previous image tag
          curl -X POST "${{ secrets.DOKPLOY_URL }}/api/application.update" \
            -H "x-api-key: ${{ secrets.DOKPLOY_API_KEY }}" \
            -d "{\"applicationId\": \"${{ secrets.DOKPLOY_APP_ID }}\", \"dockerImage\": \"${{ secrets.DOCKERHUB_USERNAME }}/myservice:${{ steps.current.outputs.previous_tag }}\"}"

          # Trigger deployment
          curl -X POST "${{ secrets.DOKPLOY_URL }}/api/application.deploy" \
            -H "x-api-key: ${{ secrets.DOKPLOY_API_KEY }}" \
            -d "{\"applicationId\": \"${{ secrets.DOKPLOY_APP_ID }}\"}"

          echo "✓ Rolled back successfully"
          exit 1
```

**This rollback pattern:**
- Captures current deployment state before deploying
- Attempts new deployment
- Automatically rolls back to previous version on failure
- Provides clear logging of rollback actions
