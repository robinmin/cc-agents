---
name: quick-reference
description: "Quick reference tables for common decisions"
see_also:
  - rd3:frontend-architect
---

# Quick Reference

### Rendering Strategy Quick Decision

| Requirement | Recommended Strategy |
|-------------|---------------------|
| SEO-critical + dynamic | SSR |
| SEO-critical + cacheable | ISR |
| No SEO + highly interactive | SPA |
| Static content | SSG |
| Complex page + slow components | SSR + Streaming |
| Geo-specific + personalization | Edge SSR |

### Microfrontends Signal

**Consider microfrontends when:**
- 10+ frontend teams
- Different technology stacks required
- Independent deployment cycles needed
- Teams have different release cadences

**Avoid microfrontends when:**
- Small team (<10 developers)
- Single technology stack preferred
- Shared state is complex
- Simple deployment is valued

### Performance Targets

| Metric | Target | Tool |
|--------|--------|------|
| LCP | <2.5s | Lighthouse |
| INP | <200ms | RUM / CrUX |
| CLS | <0.1 | Lighthouse |
| TTFB | <600ms | WebPageTest |
| Bundle size | <244KB | webpack-bundle-analyzer |

### Monitoring Stack

```json
{
  "metrics": "Datadog / New Relic / Prometheus",
  "logs": "ELK Stack / CloudWatch / Loki",
  "traces": "Jaeger / Tempo / Datadog APM",
  "errors": "Sentry / Bugsnag / Rollbar",
  "rum": "Google Analytics / Posthog / Plausible"
}
```
