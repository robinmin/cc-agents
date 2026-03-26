---
name: security-implementation
description: "Secure backend coding practices: input validation, authentication (JWT/OAuth), authorization (RBAC), HTTP security headers, CSRF protection, database security, API security, and SSRF prevention."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-26
updated_at: 2026-03-26
type: pattern
tags: [backend, security, jwt, oauth, rbac, csrf, ssrf, injection, headers, api-security]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: security
  interactions:
    - knowledge-only
see_also:
  - rd3:backend-design
  - rd3:sys-debugging
---

# Security Implementation

Expert backend security coding practices, vulnerability prevention, and defensive programming.

## When to Use vs Security Auditor

| Use This Skill For | Use Security Auditor For |
|-------------------|------------------------|
| Hands-on backend security coding | High-level security audits |
| API security implementation | Compliance assessments |
| Database security configuration | Threat modeling |
| Authentication system coding | Security architecture reviews |
| Vulnerability fixes | Penetration testing planning |

**Key difference**: This skill focuses on writing secure backend code; security-auditor focuses on assessing security posture.

---

## General Secure Coding Practices

### Input Validation & Sanitization
- Use allowlist approaches (not denylist)
- Enforce data types strictly
- Validate all external input: request bodies, query params, headers, cookies

### Injection Attack Prevention
- **SQL/NoSQL injection**: Parameterized queries, ORM exclusively
- **Command injection**: Never pass user input to shell commands
- **LDAP injection**: Sanitize DN paths

### Secret Management
- Never hardcode credentials in source code
- Use environment variables or secret managers (Vault, AWS Secrets Manager)
- Rotate secrets regularly
- Never log secrets or tokens

---

## HTTP Security Headers & Cookies

### Required Security Headers

```typescript
// helmet or manual headers
res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
res.setHeader('X-Frame-Options', 'DENY')
res.setHeader('X-Content-Type-Options', 'nosniff')
res.setHeader('X-XSS-Protection', '1; mode=block')
res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
```

### Cookie Security

```typescript
res.cookie('sessionId', token, {
    httpOnly: true,    // No JavaScript access
    secure: true,      // HTTPS only
    sameSite: 'strict', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
})
```

### CORS Configuration

```typescript
const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}
```

---

## CSRF Protection

### Anti-CSRF Tokens

```typescript
// Generate token
const csrfToken = crypto.randomBytes(32).toString('hex');
// Store in session or cookie (httpOnly)
res.cookie('csrf_token', csrfToken, { httpOnly: true });

// Validate on state-changing requests
function validateCsrfToken(req: Request, token: string): boolean {
    return req.cookies.csrf_token === token;
}
```

### SameSite Cookie Enforcement

```typescript
// SameSite=Strict provides CSRF protection for cookie-based auth
res.cookie('session', sessionId, {
    sameSite: 'strict',
    httpOnly: true,
    secure: true
})
```

---

## Database Security

### Parameterized Queries (Mandatory)

```typescript
// ❌ NEVER — SQL injection risk
db.query(`SELECT * FROM users WHERE id = ${userId}`)

// ✅ ALWAYS — Parameterized
db.query('SELECT * FROM users WHERE id = $1', [userId])
```

### Field-Level Encryption

```typescript
// Encrypt sensitive fields before storage
const encrypted = encrypt(sensitiveData, ENCRYPTION_KEY);
// Store encrypted value
// Decrypt only when needed, in-memory
```

### Database User Privilege Separation

```typescript
// Read-only user for queries
// Read-write user for mutations
// Admin user only for migrations
// Each user has minimum required privileges
```

---

## API Security

### JWT Security

```typescript
interface JWTPayload {
    userId: string
    email: string
    role: string
    iat: number
    exp: number
}

const JWT_SECRET = process.env.JWT_SECRET!

export function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' })
}

export function verifyToken(token: string): JWTPayload {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
}

// ❌ NEVER decode without verifying
// ❌ NEVER trust token payload without verification
```

### Rate Limiting

```typescript
// Per-user rate limiting
const rateLimitKey = `rate:${userId}:${endpoint}`
const requests = await redis.incr(rateLimitKey)
if (requests === 1) await redis.expire(rateLimitKey, 60)
if (requests > 100) throw new ApiError(429, 'Too many requests')
```

### Request Validation

```typescript
// Size limits
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))

// Content-Type validation
app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        const ct = req.get('Content-Type')
        if (!ct?.includes('application/json')) {
            return res.status(415).json({ error: 'Unsupported Media Type' })
        }
    }
    next()
})
```

---

## External Requests Security

### SSRF Prevention

```typescript
// ❌ NEVER — SSRF vulnerability
async function fetchUrl(url: string) {
    return fetch(url) // Attacker can pass internal service URLs
}

// ✅ ALWAYS — Validate and restrict
const ALLOWED_HOSTS = ['api.example.com', 'cdn.example.com']

function isAllowedUrl(url: string): boolean {
    try {
        const parsed = new URL(url)
        if (!['http:', 'https:'].includes(parsed.protocol)) return false
        return ALLOWED_HOSTS.includes(parsed.hostname)
    } catch {
        return false
    }
}

async function safeFetch(url: string) {
    if (!isAllowedUrl(url)) throw new ApiError(400, 'Disallowed URL')
    return fetch(url)
}
```

### Timeout on External Requests

```typescript
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 5000)

try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    return response
} catch (error) {
    clearTimeout(timeout)
    if (error.name === 'AbortError') throw new ApiError(504, 'Request timeout')
    throw error
}
```

---

## Logging & Monitoring

### Security Event Logging

```typescript
// Log authentication failures
logger.warn('Auth failure', { email, ip, userAgent, attempts })

// Log authorization failures
logger.warn('Permission denied', { userId, resource, action, ip })

// Log suspicious activity
logger.warn('Rate limit exceeded', { userId, endpoint, ip })
```

### Log Sanitization

```typescript
// Never log sensitive data
function sanitizeForLogging(data: Record<string, unknown>): Record<string, unknown> {
    const sensitive = ['password', 'token', 'secret', 'authorization', 'cookie']
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
        if (sensitive.some(s => key.toLowerCase().includes(s))) {
            sanitized[key] = '[REDACTED]'
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeForLogging(value as Record<string, unknown>)
        } else {
            sanitized[key] = value
        }
    }
    return sanitized
}
```

---

## Security Checklist

- [ ] All user input validated with allowlist approach
- [ ] Parameterized queries for all database operations
- [ ] JWT tokens verified on every request
- [ ] RBAC/ABAC enforced on all protected endpoints
- [ ] Rate limiting on public endpoints
- [ ] Security headers set (HSTS, CSP, X-Frame-Options, etc.)
- [ ] CSRF protection on state-changing operations
- [ ] SSRF prevention for external request handling
- [ ] Sensitive data not logged or exposed in errors
- [ ] Secrets via environment variables, not hardcoded
- [ ] Dependencies scanned for vulnerabilities
- [ ] Error messages don't leak internal details
