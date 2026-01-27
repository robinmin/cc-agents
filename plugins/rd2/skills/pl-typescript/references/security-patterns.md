# Security Patterns for TypeScript

## Overview

TypeScript helps catch security issues at compile time, but runtime security remains critical. This reference covers security patterns, common vulnerabilities, and best practices.

## Input Validation

### Type-Safe Validation

```typescript
// Branded types for validated input
type ValidatedEmail = string & { readonly __brand: 'ValidatedEmail' };

function validateEmail(email: string): ValidatedEmail {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
  return email as ValidatedEmail;
}

// Usage
const email = validateEmail('user@example.com'); // ValidatedEmail
const invalid = validateEmail('invalid'); // Throws error
```

### Runtime Type Guards

```typescript
// Type guard for user input
function isUserObject(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data &&
    'email' in data &&
    typeof data.id === 'string' &&
    typeof data.name === 'string' &&
    typeof data.email === 'string'
  );
}

// Usage
function processUser(data: unknown) {
  if (!isUserObject(data)) {
    throw new Error('Invalid user data');
  }
  // data is now typed as User
  console.log(data.name);
}
```

### Zod Integration

```typescript
import { z } from 'zod';

// Define schema
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150).optional()
});

// Type inference
type User = z.infer<typeof UserSchema>;

// Validation
function parseUser(data: unknown): User {
  return UserSchema.parse(data);
}

// Safe validation
function parseUserSafe(data: unknown): User | null {
  const result = UserSchema.safeParse(data);
  return result.success ? result.data : null;
}
```

## SQL Injection Prevention

### Parameterized Queries

```typescript
// BAD - String interpolation (vulnerable)
function getUserUnsafe(id: string) {
  const query = `SELECT * FROM users WHERE id = '${id}'`;
  return db.query(query);
}

// GOOD - Parameterized query
function getUserSafe(id: string) {
  const query = 'SELECT * FROM users WHERE id = $1';
  return db.query(query, [id]);
}
```

### TypeORM Query Builder

```typescript
// Type-safe query building
const users = await userRepository
  .createQueryBuilder('user')
  .where('user.email = :email', { email: userInput })
  .setParameter('email', sanitizeInput(userInput))
  .getOne();
```

### Prisma Type Safety

```typescript
// Prisma provides type-safe queries
const user = await prisma.user.findUnique({
  where: { email: userInput } // Type-safe
});

// Input validation
const schema = z.object({
  email: z.string().email()
});

const validated = schema.parse({ email: userInput });
const user = await prisma.user.findUnique({
  where: { email: validated.email }
});
```

## XSS Prevention

### Escaping Output

```typescript
// Escape HTML entities
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Usage
const safe = escapeHtml(userInput);
document.getElementById('output').innerHTML = safe;
```

### React Automatic Escaping

```typescript
// React automatically escapes data in JSX
function UserComponent({ name }: { name: string }) {
  // name is automatically escaped
  return <div>Hello, {name}</div>;
}

// For dangerouslySetInnerHTML (avoid when possible)
function SanitizedHtml({ html }: { html: string }) {
  // Always sanitize first
  const sanitized = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

### Content Security Policy

```typescript
// Set CSP headers
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  );
  next();
});
```

## Authentication & Authorization

### JWT Type Safety

```typescript
// Typed JWT payload
interface JwtPayload {
  sub: string;
  email: string;
  role: 'admin' | 'user';
  iat: number;
  exp: number;
}

function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, SECRET) as JwtPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// Usage
const payload = verifyToken(requestToken);
if (payload.role !== 'admin') {
  throw new Error('Unauthorized');
}
```

### Role-Based Access Control

```typescript
// RBAC types
type Role = 'admin' | 'moderator' | 'user';

type Permission =
  | 'read:users'
  | 'write:users'
  | 'delete:users'
  | 'read:posts'
  | 'write:posts';

const rolePermissions: Record<Role, Permission[]> = {
  admin: ['read:users', 'write:users', 'delete:users', 'read:posts', 'write:posts'],
  moderator: ['read:users', 'write:users', 'read:posts', 'write:posts'],
  user: ['read:posts']
};

function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}

// Usage
if (!hasPermission(user.role, 'delete:users')) {
  throw new Error('Forbidden');
}
```

## Secrets Management

### Environment Variables

```typescript
// Type-safe environment variables
interface Env {
  NODE_ENV: 'development' | 'production' | 'test';
  DATABASE_URL: string;
  JWT_SECRET: string;
  API_KEY: string;
}

function getEnv(): Env {
  return {
    NODE_ENV: process.env.NODE_ENV as Env['NODE_ENV'] || 'development',
    DATABASE_URL: requireEnv('DATABASE_URL'),
    JWT_SECRET: requireEnv('JWT_SECRET'),
    API_KEY: requireEnv('API_KEY')
  };
}

function requireEnv(key: keyof Env): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// Usage
const env = getEnv();
```

### Secrets in Code

```typescript
// BAD - Secrets in code
const API_KEY = 'sk-live-1234567890abcdef'; // NEVER DO THIS

// GOOD - Environment variables
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error('API_KEY not configured');
}
```

## Data Sanitization

### Sanitizing User Input

```typescript
import * as sanitizer from 'sanitizer';

// Sanitize HTML
function sanitizeHtml(input: string): string {
  return sanitizer.sanitize(input, {
    allowedTags: ['b', 'i', 'em', 'strong', 'a'],
    allowedAttributes: {
      'a': ['href']
    }
  });
}

// Sanitize URLs
function sanitizeUrl(url: string): string {
  const parsed = new URL(url);
  // Validate protocol
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Invalid URL protocol');
  }
  return parsed.href;
}
```

### Path Traversal Prevention

```typescript
import path from 'path';

function safeResolvePath(basePath: string, userPath: string): string {
  // Normalize paths
  const resolved = path.resolve(basePath, userPath);
  const normalized = path.normalize(resolved);

  // Ensure result is within base path
  if (!normalized.startsWith(path.resolve(basePath))) {
    throw new Error('Path traversal detected');
  }

  return normalized;
}

// Usage
const safePath = safeResolvePath('/app/public', userInput);
```

## CORS Configuration

### Express CORS

```typescript
import cors from 'cors';

// Whitelist origins
const allowedOrigins = [
  'https://example.com',
  'https://www.example.com'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to all routes
app.use(limiter);

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts'
});

app.post('/auth/login', authLimiter, loginHandler);
```

## Security Headers

### Helmet.js

```typescript
import helmet from 'helmet';

app.use(helmet());

// Custom CSP
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  })
);

// HSTS
app.use(
  helmet.hsts({
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  })
);
```

## Common Vulnerabilities

### Prototype Pollution

```typescript
// BAD - Merging user input without validation
function merge(target: any, source: any) {
  for (const key in source) {
    target[key] = source[key];
  }
  return target;
}

// GOOD - Validate keys
function mergeSafe<T extends object>(target: T, source: Partial<T>): T {
  const allowedKeys = new Set<keyof T>(Object.keys(target) as Array<keyof T>);

  for (const key in source) {
    if (allowedKeys.has(key as keyof T)) {
      (target as any)[key] = source[key];
    }
  }

  return target;
}
```

### ReDoS (Regular Expression DoS)

```typescript
// BAD - Vulnerable to catastrophic backtracking
const badRegex = /(a+)+b/;

// GOOD - Use possessive quantifiers or atomic groups
const goodRegex = /a++b/;

// Validate input length before regex
function validateEmailSafe(email: string): boolean {
  if (email.length > 320) return false; // Max email length
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

## Best Practices

1. **Validate all input** - Type guards, Zod schemas
2. **Parameterized queries** - Never interpolate SQL
3. **Escape output** - Prevent XSS attacks
4. **Use HTTPS** - Encrypt all data in transit
5. **Security headers** - Helmet.js for Express
6. **CORS configuration** - Whitelist allowed origins
7. **Rate limiting** - Prevent brute force attacks
8. **Secrets management** - Environment variables, never in code
9. **Keep dependencies updated** - Regular security audits
10. **Least privilege** - Minimal required permissions

## Related References

- `api-design.md` - Secure API design
- `backend-patterns.md` - Server-side security
- `type-system.md` - Type-safe validation
