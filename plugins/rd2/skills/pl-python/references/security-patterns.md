# Python Security Patterns

Comprehensive guide to secure coding practices in Python.

## Table of Contents

1. [Input Validation](#input-validation)
2. [Command Injection Prevention](#command-injection-prevention)
3. [Path Traversal Prevention](#path-traversal-prevention)
4. [SQL Injection Prevention](#sql-injection-prevention)
5. [Secrets Management](#secrets-management)
6. [Authentication Patterns](#authentication-patterns)
7. [API Security](#api-security)
8. [Common Vulnerabilities](#common-vulnerabilities)

---

## Input Validation

### Pydantic Validation (Recommended)

```python
from pydantic import BaseModel, Field, field_validator
import re

class UserInput(BaseModel):
    username: str = Field(
        ...,
        min_length=3,
        max_length=50,
        pattern=r'^[a-zA-Z0-9_]+$'
    )
    email: str = Field(..., pattern=r'^[^@]+@[^@]+\.[^@]+$')
    age: int = Field(..., ge=18, le=120)
    url: str = Field(..., pattern=r'^https://')

    @field_validator('username')
    @classmethod
    def username_not_reserved(cls, v: str) -> str:
        reserved = ['admin', 'root', 'system']
        if v.lower() in reserved:
            raise ValueError('Reserved username')
        return v
```

### Sanitization Functions

```python
import html
import re

def sanitize_html(text: str) -> str:
    """Escape HTML to prevent XSS."""
    return html.escape(text)

def sanitize_filename(filename: str) -> str:
    """Remove dangerous characters from filenames."""
    # Remove path separators and special characters
    clean = re.sub(r'[<>:"/\\|?*]', '', filename)
    # Remove leading dots and dashes
    clean = clean.lstrip('.-')
    # Limit length
    return clean[:255]

def validate_url(url: str) -> bool:
    """Validate URL scheme and structure."""
    from urllib.parse import urlparse
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc]) and result.scheme in ['http', 'https']
    except Exception:
        return False
```

---

## Command Injection Prevention

### Safe Command Execution

```python
import subprocess
import shlex

def run_command_safe(user_arg: str) -> str:
    """
    Safely execute command with user input.

    AVOID: shell=True (vulnerable to injection)
    PREFER: List form with explicit arguments
    """
    # Validate and escape user input
    if not user_arg.replace('-', '').replace('_', '').isalnum():
        raise ValueError("Invalid argument")

    # Use list form (NOT shell=True)
    result = subprocess.run(
        ["echo", user_arg],  # List form, NOT string
        capture_output=True,
        text=True,
        timeout=30,  # Always set timeout
        check=False  # Handle return code manually
    )

    return result.stdout

# DANGER: Never do this
def run_command_unsafe(user_input: str):
    # VULNERABLE: shell=True allows command injection
    subprocess.run(f"echo {user_input}", shell=True)
```

### Controlled Execution with shutil

```python
import shutil
from pathlib import Path

def safe_copy(src: Path, dst: Path, base_dir: Path) -> None:
    """
    Safely copy file with path validation.
    """
    # Resolve paths
    src_resolved = (base_dir / src).resolve()
    dst_resolved = (base_dir / dst).resolve()

    # Validate paths are within base directory
    if not src_resolved.is_relative_to(base_dir):
        raise ValueError("Source path traversal detected")
    if not dst_resolved.is_relative_to(base_dir):
        raise ValueError("Destination path traversal detected")

    # Copy with shutil (safe alternative to subprocess)
    shutil.copy2(src_resolved, dst_resolved)
```

---

## Path Traversal Prevention

### Path Validation

```python
from pathlib import Path

def safe_read_file(base_dir: Path, user_path: str) -> str:
    """
    Safely read file, preventing path traversal attacks.
    """
    base = base_dir.resolve()

    try:
        # Resolve and validate path
        requested = (base / user_path).resolve()

        # Ensure path is within base directory
        if not requested.is_relative_to(base):
            raise ValueError("Path traversal detected")

        # Check file exists and is file (not directory)
        if not requested.is_file():
            raise FileNotFoundError("File not found")

        return requested.read_text()

    except (ValueError, FileNotFoundError) as e:
        raise
```

### Allowlist Pattern

```python
from pathlib import Path

ALLOWED_FILES = {
    'config.json',
    'data.csv',
    'template.html'
}

def safe_read_allowed(base_dir: Path, filename: str) -> str:
    """
    Read file only if in allowlist.
    """
    # Validate filename
    if filename not in ALLOWED_FILES:
        raise ValueError("File not in allowlist")

    # Validate no path traversal
    if '/' in filename or '\\' in filename:
        raise ValueError("Path separators not allowed")

    file_path = base_dir / filename
    return file_path.read_text()
```

---

## SQL Injection Prevention

### Parameterized Queries (Recommended)

```python
# BAD: String formatting (vulnerable)
def get_user_bad(user_id: str):
    query = f"SELECT * FROM users WHERE id = {user_id}"  # DANGER
    return db.execute(query)

# GOOD: Parameterized queries (safe)
def get_user_good(user_id: int):
    query = "SELECT * FROM users WHERE id = ?"  # Placeholder
    return db.execute(query, (user_id,))  # Parameters separate

# GOOD: SQLAlchemy ORM
from sqlalchemy import select
from sqlalchemy.orm import Session

def get_user_orm(db: Session, user_id: int) -> User | None:
    return db.execute(
        select(User).where(User.id == user_id)  # Type-safe
    ).scalar_one_or_none()
```

### SQLAlchemy Best Practices

```python
from sqlalchemy import text
from sqlalchemy.orm import Session

# Using text() with parameters
def find_user_by_email(db: Session, email: str) -> User | None:
    result = db.execute(
        text("SELECT * FROM users WHERE email = :email"),
        {"email": email}  # Named parameters
    ).first()
    return result

# NEVER interpolate into queries
def bad_query(db: Session, email: str):
    # DANGER: Direct interpolation
    query = text(f"SELECT * FROM users WHERE email = '{email}'")
    return db.execute(query)
```

---

## Secrets Management

### Environment Variables (Recommended)

```python
import os
from pydantic_settings import BaseSettings, Field
from typing import Literal

class Settings(BaseSettings):
    """Application settings with validation."""

    # Required secrets (raise if missing)
    database_url: str = Field(..., env="DATABASE_URL")
    api_key: str = Field(..., env="API_KEY")
    secret_key: str = Field(..., env="SECRET_KEY")

    # Optional with defaults
    debug: bool = Field(default=False, env="DEBUG")
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"

    # Environment-specific
    environment: Literal["development", "staging", "production"] = "development"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

# Raises ValidationError if required secrets missing
settings = Settings()
```

### .env File Template

```bash
# .env.example (safe to commit)
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
API_KEY=your_api_key_here
SECRET_KEY=your_secret_key_here
DEBUG=false
ENVIRONMENT=development

# .env (git-ignored)
DATABASE_URL=postgresql://...
API_KEY=sk-proj-abc123...
SECRET_KEY=super-secret-key
```

### Secrets Rotation Pattern

```python
from datetime import datetime, timedelta
from typing import Optional
import hashlib

class SecretRotator:
    """Manage secret rotation with grace period."""

    def __init__(self, current: str, previous: Optional[str] = None):
        self.current = current
        self.previous = previous
        self.rotated_at = datetime.now()

    def verify(self, secret: str) -> bool:
        """Check secret against current and previous."""
        if self._hash(secret) == self._hash(self.current):
            return True
        # Grace period for previous secret
        if self.previous and datetime.now() - self.rotated_at < timedelta(hours=24):
            return self._hash(secret) == self._hash(self.previous)
        return False

    @staticmethod
    def _hash(value: str) -> str:
        return hashlib.sha256(value.encode()).hexdigest()
```

---

## Authentication Patterns

### Password Hashing (Recommended)

```python
import bcrypt
from typing import Optional

def hash_password(password: str) -> str:
    """Hash password with bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode(), salt).decode()

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash."""
    return bcrypt.checkpw(password.encode(), hashed.encode())

# Usage
hashed = hash_password("secure_password")
is_valid = verify_password("secure_password", hashed)
```

### JWT Token Generation

```python
import jwt
from datetime import datetime, timedelta
from typing import Optional

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"

def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> dict | None:
    """Decode and verify JWT token."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None
```

---

## API Security

### Rate Limiting

```python
from functools import wraps
from typing import Dict
import time
from collections import defaultdict

class RateLimiter:
    """Simple in-memory rate limiter."""

    def __init__(self, max_calls: int, period: int):
        self.max_calls = max_calls
        self.period = period  # seconds
        self.calls: Dict[str, list] = defaultdict(list)

    def is_allowed(self, identifier: str) -> bool:
        now = time.time()
        # Clean old calls
        self.calls[identifier] = [
            call_time for call_time in self.calls[identifier]
            if now - call_time < self.period
        ]
        # Check limit
        if len(self.calls[identifier]) >= self.max_calls:
            return False
        self.calls[identifier].append(now)
        return True

# Usage
limiter = RateLimiter(max_calls=100, period=60)

def rate_limit(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        client_id = kwargs.get('client_id', 'default')
        if not limiter.is_allowed(client_id):
            raise Exception("Rate limit exceeded")
        return f(*args, **kwargs)
    return wrapper
```

### CORS Configuration

```python
from fastapi.middleware.cors import CORSMiddleware

ALLOWED_ORIGINS = [
    "https://example.com",
    "https://www.example.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Specific origins, not "*"
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

### Input Size Limits

```python
from fastapi import Request, HTTPException
from typing import Callable

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB

async def check_content_length(request: Request) -> None:
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail="File too large")
```

---

## Common Vulnerabilities

### Unsafe Deserialization

```python
import json

# GOOD: Use JSON for data exchange
def load_json(data: str) -> dict:
    return json.loads(data)

# BAD: Never pickle untrusted data
import pickle
def load_pickle_bad(data: bytes):
    # DANGER: Can execute arbitrary code
    return pickle.loads(data)
```

### Temporary File Security

```python
import tempfile
import os
from pathlib import Path

def secure_temp_file(content: str) -> Path:
    """Create secure temporary file."""
    # Create with restricted permissions
    fd, path = tempfile.mkstemp(
        prefix="secure_",
        suffix=".tmp",
        text=True
    )
    try:
        # Write content
        os.write(fd, content.encode())
        # Restrict permissions to owner only
        os.chmod(path, 0o600)
        return Path(path)
    finally:
        os.close(fd)

def cleanup_temp_file(path: Path) -> None:
    """Securely delete temporary file."""
    if path.exists():
        # Overwrite content before deletion
        path.write_bytes(os.urandom(path.stat().st_size))
        path.unlink()
```

### Logging Security

```python
import logging

def sanitize_log_data(data: dict) -> dict:
    """Remove sensitive data before logging."""
    sensitive_keys = {'password', 'token', 'api_key', 'secret', 'ssn'}
    return {
        k: "***REDACTED***" if any(s in k.lower() for s in sensitive_keys) else v
        for k, v in data.items()
    }

logger = logging.getLogger(__name__)

# Usage
user_data = {"username": "alice", "password": "secret123"}
logger.info("User data: %s", sanitize_log_data(user_data))
# Logs: User data: {'username': 'alice', 'password': '***REDACTED***'}
```

---

## Quick Reference

### Security Checklist

- [ ] Input validation on all user input
- [ ] Parameterized queries for SQL
- [ ] Path traversal protection
- [ ] Command injection prevention
- [ ] Secrets in environment variables
- [ ] HTTPS enforced in production
- [ ] CORS configured properly
- [ ] Rate limiting implemented
- [ ] Authentication implemented
- [ ] Logging sanitized
- [ ] Dependencies regularly updated
- [ ] Security scanning in CI/CD

### Security Tools

| Tool | Purpose | Command |
|------|---------|---------|
| **bandit** | Security linter | `bandit -r src/` |
| **safety** | Dependency vulnerability scanner | `safety check` |
| **pip-audit** | Dependency audit | `pip-audit` |
| **semgrep** | Custom security rules | `semgrep scan` |

### Common Attack Vectors and Mitigations

| Attack | Mitigation |
|--------|------------|
| SQL Injection | Parameterized queries, ORM |
| XSS | HTML escaping, CSP headers |
| CSRF | Tokens, SameSite cookies |
| Command Injection | shlex.quote(), list form subprocess |
| Path Traversal | Validate paths, use pathlib |
| SSRF | URL validation, IP blocking |
| Deserialization | Use JSON instead of pickle |

---

## References

- [OWASP Python Security](https://cheatsheetseries.owasp.org/cheatsheets/Python_Security_Cheat_Sheet.html)
- [bandit documentation](https://bandit.readthedocs.io/)
- [Pydantic security patterns](https://docs.pydantic.dev/latest/concepts/validators/)
