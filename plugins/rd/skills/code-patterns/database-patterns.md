# Database Patterns

## Migration Patterns

### Migration File Structure

```
migrations/
├── 001_create_users.sql
├── 002_add_email_index.sql
├── 003_create_posts.sql
└── 004_add_user_roles.sql
```

### Up/Down Pattern

```sql
-- 001_create_users.up.sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- 001_create_users.down.sql
DROP INDEX IF EXISTS idx_users_email;
DROP TABLE IF EXISTS users;
```

### Migration Best Practices

| Do | Don't |
|----|-------|
| Use transactions | Modify data in schema migrations |
| Test down migrations | Delete columns immediately |
| Use IF EXISTS/IF NOT EXISTS | Mix schema and data changes |
| Keep migrations small | Use ORM-generated migrations blindly |
| Version control migrations | Modify old migrations |

### Safe Column Operations

```sql
-- Safe: Add nullable column
ALTER TABLE users ADD COLUMN bio TEXT;

-- Safe: Add column with default
ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active';

-- Dangerous: Add NOT NULL without default
-- ALTER TABLE users ADD COLUMN required_field VARCHAR(255) NOT NULL;

-- Safe alternative for NOT NULL:
-- 1. Add nullable column
ALTER TABLE users ADD COLUMN required_field VARCHAR(255);
-- 2. Backfill data
UPDATE users SET required_field = 'default_value' WHERE required_field IS NULL;
-- 3. Add constraint
ALTER TABLE users ALTER COLUMN required_field SET NOT NULL;
```

## Query Patterns

### Repository Pattern

```typescript
interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserDTO): Promise<User>;
  update(id: string, data: UpdateUserDTO): Promise<User>;
  delete(id: string): Promise<void>;
}

class PostgresUserRepository implements UserRepository {
  constructor(private db: Database) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.db.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async create(data: CreateUserDTO): Promise<User> {
    const result = await this.db.query(
      `INSERT INTO users (email, name)
       VALUES ($1, $2)
       RETURNING *`,
      [data.email, data.name]
    );
    return result.rows[0];
  }
}
```

### Query Builder Pattern

```typescript
// Simple query builder
const users = await db.users
  .where('status', '=', 'active')
  .where('created_at', '>', '2024-01-01')
  .orderBy('created_at', 'desc')
  .limit(10)
  .select(['id', 'name', 'email']);

// With joins
const postsWithAuthors = await db.posts
  .join('users', 'posts.author_id', 'users.id')
  .where('posts.published', true)
  .select([
    'posts.*',
    'users.name as author_name'
  ]);
```

### Pagination Queries

```sql
-- Cursor-based (recommended)
SELECT * FROM posts
WHERE id > $1  -- cursor
ORDER BY id ASC
LIMIT $2;

-- Keyset pagination with timestamp
SELECT * FROM posts
WHERE (created_at, id) > ($1, $2)
ORDER BY created_at DESC, id DESC
LIMIT $3;

-- Offset-based (simple cases only)
SELECT * FROM posts
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;
```

## Indexing

### Index Types

| Type | Use Case |
|------|----------|
| B-Tree | Default, most queries |
| Hash | Equality only |
| GIN | Arrays, JSONB, full-text |
| GiST | Geometric, range types |
| BRIN | Large, naturally ordered tables |

### Index Guidelines

```sql
-- Single column index
CREATE INDEX idx_users_email ON users(email);

-- Composite index (order matters!)
CREATE INDEX idx_posts_author_created ON posts(author_id, created_at DESC);

-- Partial index (filtered)
CREATE INDEX idx_active_users ON users(email) WHERE status = 'active';

-- Covering index (includes all needed columns)
CREATE INDEX idx_posts_listing ON posts(author_id, created_at)
INCLUDE (title, slug);
```

### When to Index

| Index | Don't Index |
|-------|-------------|
| WHERE clause columns | Low cardinality columns |
| JOIN columns | Rarely queried columns |
| ORDER BY columns | Small tables |
| Foreign keys | Frequently updated columns |

### Analyze Query Plans

```sql
EXPLAIN ANALYZE
SELECT * FROM users WHERE email = 'test@example.com';

-- Look for:
-- - Seq Scan (might need index)
-- - Index Scan (good)
-- - Bitmap Index Scan (good for OR conditions)
```

## Transaction Patterns

### Basic Transaction

```typescript
await db.transaction(async (tx) => {
  const user = await tx.users.create({ email, name });
  await tx.accounts.create({ userId: user.id, balance: 0 });
  return user;
});
// Auto-commits on success, rollback on error
```

### Isolation Levels

| Level | Dirty Read | Non-Repeatable | Phantom |
|-------|------------|----------------|---------|
| Read Uncommitted | Yes | Yes | Yes |
| Read Committed | No | Yes | Yes |
| Repeatable Read | No | No | Yes |
| Serializable | No | No | No |

```typescript
await db.transaction(
  async (tx) => {
    // Critical operation
  },
  { isolationLevel: 'serializable' }
);
```

### Optimistic Locking

```sql
-- Add version column
ALTER TABLE accounts ADD COLUMN version INT DEFAULT 1;

-- Update with version check
UPDATE accounts
SET balance = balance - $1, version = version + 1
WHERE id = $2 AND version = $3
RETURNING *;

-- Check if row was updated
-- If 0 rows, concurrent modification occurred
```

## Connection Pooling

### Pool Configuration

```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,              // Max connections
  idleTimeoutMillis: 30000,  // Close idle connections
  connectionTimeoutMillis: 2000,  // Connection timeout
});
```

### Pool Sizing Formula

```
pool_size = (core_count * 2) + effective_spindle_count

For SSD: core_count * 4
For web apps: Start with 10-20, tune based on metrics
```

## ORM Patterns

### Entity Definition

```typescript
@Entity('users')
class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];
}
```

### Eager vs Lazy Loading

```typescript
// Eager loading (N+1 prevention)
const users = await userRepo.find({
  relations: ['posts', 'profile'],
});

// Explicit joins (more control)
const users = await userRepo
  .createQueryBuilder('user')
  .leftJoinAndSelect('user.posts', 'post')
  .where('user.status = :status', { status: 'active' })
  .getMany();
```

### N+1 Problem

```typescript
// BAD: N+1 queries
const users = await userRepo.find();
for (const user of users) {
  user.posts = await postRepo.find({ authorId: user.id }); // N queries
}

// GOOD: Single query with join
const users = await userRepo.find({ relations: ['posts'] });
```

## Common Anti-Patterns

| Anti-Pattern | Better Approach |
|--------------|-----------------|
| SELECT * | Select specific columns |
| No indexes on FK | Always index foreign keys |
| Storing JSON for relations | Use proper relations |
| String concatenation in queries | Use parameterized queries |
| Large offset pagination | Use cursor pagination |
| Missing connection pooling | Always use connection pool |
| No query timeouts | Set statement_timeout |
| Ignoring EXPLAIN | Analyze slow queries |
