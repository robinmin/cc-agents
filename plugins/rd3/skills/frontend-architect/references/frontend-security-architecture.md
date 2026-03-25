---
name: frontend-security-architecture
description: "Extracted section: Frontend Security Architecture — auth, RBAC, CSP, CORS"
see_also:
  - rd3:frontend-architect
---

# Frontend Security Architecture

## Authentication Patterns

**Client-side Auth (SPA):**
```typescript
// Store tokens securely
// Use httpOnly cookies for server sessions
// Use memory or httpOnly cookies for JWT (never localStorage)

// Bad (vulnerable to XSS):
localStorage.setItem('token', jwt)  // DON'T DO THIS

// Good (httpOnly cookie):
fetch('/api/login', {
  method: 'POST',
  credentials: 'include',  // Sends cookies
})

// Good (memory + refresh token):
let accessToken = null
async function refreshToken() {
  const res = await fetch('/api/refresh', {
    credentials: 'include',  // httpOnly refresh token
  })
  accessToken = await res.json()
}
```

## Authorization Architecture

**Role-Based Access Control (RBAC):**
```typescript
// Middleware-based authorization
export async function requireRole(role: string) {
  const session = await getSession()
  if (!session?.roles.includes(role)) {
    throw new RedirectError('/403')
  }
}

// Component-level authorization
export function withRole<P>(
  Component: React.ComponentType<P>,
  role: string
) {
  return function ProtectedComponent(props: P) {
    const { roles } = useSession()
    if (!roles.includes(role)) {
      return <Forbidden />
    }
    return <Component {...props} />
  }
}
```

## Security Headers

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // WARNING: 'unsafe-inline' and 'unsafe-eval' weaken CSP significantly
      // Only use in development; production should use nonces or hashes
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; ')
  },
]

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}
```

## CORS Configuration

```typescript
// API routes (Next.js)
export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://app.example.com',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}
```

## Security Checklist

- [ ] No hardcoded secrets (use environment variables)
- [ ] All user inputs validated
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitized HTML, CSP headers)
- [ ] CSRF protection enabled
- [ ] Authentication/authorization verified
- [ ] Rate limiting on all endpoints
- [ ] Error messages don't leak sensitive data
- [ ] Security headers configured
- [ ] CORS configured correctly
