# Docker Patterns

## Overview

This reference provides production-ready patterns for containerizing applications with Docker. Use these patterns when creating Dockerfiles, setting up Docker Compose, or preparing applications for deployment.

## Multi-Stage Builds

### Node.js Application

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

USER appuser
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Python Application

```dockerfile
# Stage 1: Builder
FROM python:3.12-slim AS builder
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Production
FROM python:3.12-slim
WORKDIR /app

# Copy virtual environment
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Non-root user
RUN useradd --create-home appuser
USER appuser

COPY --chown=appuser:appuser . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0"]
```

## Security Best Practices

### Non-Root User

```dockerfile
# Create and use non-root user
RUN addgroup --system --gid 1001 appgroup \
    && adduser --system --uid 1001 --gid 1001 appuser

USER appuser
```

### Minimal Base Images

| Image | Size | Use Case |
|-------|------|----------|
| `alpine` | ~5MB | Smallest, musl libc |
| `slim` | ~70MB | Debian-based, small |
| `distroless` | ~20MB | No shell, secure |
| `scratch` | 0MB | Static binaries only |

### Security Scanning

```dockerfile
# .trivyignore
CVE-2023-xxxxx  # Ignored with justification
```

```bash
# Scan image
trivy image myapp:latest

# Fail on high/critical
trivy image --severity HIGH,CRITICAL --exit-code 1 myapp:latest
```

### Read-Only Root Filesystem

```yaml
# docker-compose.yml
services:
  app:
    image: myapp
    read_only: true
    tmpfs:
      - /tmp
      - /var/run
```

## Layer Optimization

### Cache-Friendly Ordering

```dockerfile
# BAD - Invalidates cache on any code change
COPY . .
RUN npm install

# GOOD - Dependencies cached separately
COPY package*.json ./
RUN npm ci
COPY . .
```

### Combine RUN Commands

```dockerfile
# BAD - Multiple layers
RUN apt-get update
RUN apt-get install -y curl
RUN rm -rf /var/lib/apt/lists/*

# GOOD - Single layer, cleanup in same layer
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
```

### .dockerignore

```
# .dockerignore
node_modules
.git
.env
*.md
Dockerfile
docker-compose*.yml
.github
coverage
dist
```

## Health Checks

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

### Health Check Patterns

```typescript
// /health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: 'connected',
      cache: 'connected',
    }
  });
});
```

## Docker Compose

### Development Setup

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      target: builder
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgres://user:pass@db:5432/app
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=app

  redis:
    image: redis:7-alpine

volumes:
  postgres_data:
```

### Production Overrides

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build:
      context: .
      target: runner
    restart: unless-stopped
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

## Environment Variables

### Best Practices

```dockerfile
# Define defaults
ENV NODE_ENV=production \
    PORT=3000

# Document required variables
# Required: DATABASE_URL, API_KEY
# Optional: LOG_LEVEL (default: info)
```

### Secrets (Don't Hardcode)

```yaml
# docker-compose.yml with secrets
services:
  app:
    secrets:
      - db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

## Logging

### Stdout/Stderr Pattern

```dockerfile
# Log to stdout (Docker collects)
CMD ["node", "dist/main.js"]

# Don't log to files inside container
```

### Log Configuration

```yaml
services:
  app:
    logging:
      driver: json-file
      options:
        max-size: '10m'
        max-file: '3'
```

## Networking

### Service Discovery

```yaml
services:
  app:
    depends_on:
      - db
    # Access db by service name: postgres://db:5432

  db:
    image: postgres:15-alpine
```

### Port Mapping

```yaml
ports:
  - '3000:3000'     # host:container
  - '3000'          # random host port
  - '127.0.0.1:3000:3000'  # localhost only
```

## Common Anti-Patterns

| Anti-Pattern | Better Approach |
|--------------|-----------------|
| Running as root | Use non-root user |
| Latest tag | Pin specific versions |
| No .dockerignore | Always use .dockerignore |
| Secrets in ENV | Use Docker secrets or mount |
| Fat images | Multi-stage builds |
| No health check | Add HEALTHCHECK |
| Logs to files | Log to stdout |
