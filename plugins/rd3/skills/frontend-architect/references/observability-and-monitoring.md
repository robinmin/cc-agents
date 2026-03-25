---
name: observability-and-monitoring
description: "Extracted section: Observability and Monitoring — metrics, logs, traces, RUM, error tracking"
see_also:
  - rd3:frontend-architect
---

# Observability and Monitoring

## Three Pillars

### 1. Metrics (RED method)

- **Rate**: Requests per second
- **Errors**: Error rate (4xx, 5xx)
- **Duration**: Response time (p50, p95, p99)

### 2. Logs

```typescript
// Structured logging (JSON)
logger.info('User logged in', {
  user_id: '123',
  timestamp: '2025-01-15T10:30:00Z',
  ip: '192.168.1.1',
  user_agent: 'Mozilla/5.0...',
})
```

### 3. Traces (OpenTelemetry)

```typescript
// Distributed tracing
import { trace } from '@opentelemetry/api'

const tracer = trace.getTracer('frontend')

async function checkout() {
  const span = tracer.startSpan('checkout')
  try {
    await validateCart()
    await processPayment()
    span.setStatus({ code: SpanStatusCode.OK })
  } catch (error) {
    span.recordException(error)
    throw error
  } finally {
    span.end()
  }
}
```

## Real User Monitoring (RUM)

```typescript
// Core Web Vitals tracking
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals'

onCLS(console.log)
onFID(console.log)
onFCP(console.log)
onLCP(console.log)
onTTFB(console.log)

// Send to analytics
onCLS((metric) => {
  analytics.track('CLS', { value: metric.value })
})
```

## Error Tracking

```typescript
// Sentry integration
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
})

// Error boundaries
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  Sentry.captureException(error)
  return <ErrorUI error={error} reset={reset} />
}
```

## Monitoring Stack

| Category | Tools |
|----------|-------|
| **Metrics** | Datadog, New Relic, Prometheus |
| **Logs** | ELK Stack, CloudWatch, Loki |
| **Traces** | Jaeger, Tempo, Datadog APM |
| **Errors** | Sentry, Bugsnag, Rollbar |
| **RUM** | Google Analytics, PostHog, Plausible |

## Performance Targets

| Metric | Target | Tool |
|--------|--------|------|
| LCP | <2.5s | Lighthouse |
| INP | <200ms | RUM / CrUX |
| CLS | <0.1 | Lighthouse |
| TTFB | <600ms | WebPageTest |
| Bundle size | <244KB | webpack-bundle-analyzer |
