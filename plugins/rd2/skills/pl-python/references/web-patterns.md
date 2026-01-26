# Python Web Programming Patterns

Complete guide to web framework selection, patterns, and best practices for Python web applications.

## Table of Contents

1. [Framework Selection Guide](#framework-selection-guide)
2. [FastAPI Patterns](#fastapi-patterns)
3. [Django REST Framework Patterns](#django-rest-framework-patterns)
4. [Flask Patterns](#flask-patterns)
5. [API Versioning](#api-versioning)
6. [Configuration Management](#configuration-management)
7. [Authentication & Security](#authentication--security)
8. [Deployment Patterns](#deployment-patterns)

---

## Framework Selection Guide

### Comparison Matrix

| Framework | Best For | Scale | Async | Type Safety | Learning Curve |
|-----------|----------|-------|-------|-------------|----------------|
| **FastAPI** | High-performance APIs | Small-Medium | Native | Pydantic | Low |
| **Django + DRF** | Full-stack apps | Large | Optional | Pydantic | Medium |
| **Flask** | Microservices, simple APIs | Small | Extension | Manual | Low |
| **aiohttp** | Async web services | Medium | Native | Manual | Medium |

### Decision Framework

**Choose FastAPI when:**
- Building REST/GraphQL APIs
- Need async I/O performance
- Want automatic OpenAPI docs
- Type safety is important

**Choose Django + DRF when:**
- Building full-stack web apps
- Need admin interface
- ORM and auth out-of-the-box
- Large team/project

**Choose Flask when:**
- Building microservices
- Need maximum flexibility
- Simple CRUD APIs
- Minimal dependencies required

**Choose aiohttp when:**
- Building pure async web services
- Need low-level control
- WebSocket-heavy applications
- Already using asyncio ecosystem

---

## FastAPI Patterns

### Dependency Injection Pattern

```python
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from typing import AsyncGenerator

app = FastAPI()

# Dependency as a function
async def get_db():
    """Database session dependency."""
    async with SessionLocal() as session:
        yield session
        await session.close()

# Using dependency in endpoint
@app.post("/users/")
async def create_user(
    user: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    db_user = await create_user_in_db(db, user)
    return db_user

# Class-based dependency
class AuthService:
    def __init__(self, api_key: str = Depends(get_api_key)):
        self.api_key = api_key

@app.get("/protected")
async def protected_route(auth: AuthService = Depends()):
    return {"message": "authenticated"}
```

### Background Tasks

```python
from fastapi import FastAPI, BackgroundTasks
from typing import Callable

app = FastAPI()

def send_email(email: str, message: str):
    """Send email (synchronous)."""
    import time
    time.sleep(1)
    print(f"Email sent to {email}")

@app.post("/notify/")
async def send_notification(
    email: str,
    message: str,
    background_tasks: BackgroundTasks
):
    """Queue background task and return immediately."""
    background_tasks.add_task(send_email, email, message)
    return {"message": "Notification queued"}
```

### WebSocket Support

```python
from fastapi import WebSocket, WebSocketDisconnect
from typing import List

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(f"Received: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
```

### Exception Handling

```python
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

app = FastAPI()

class AppException(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail

@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.get("/items/{item_id}")
async def read_item(item_id: int):
    if item_id == 0:
        raise AppException(status_code=404, detail="Item not found")
    return {"item_id": item_id}
```

### Request Validation with Pydantic

```python
from pydantic import BaseModel, Field, field_validator

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., pattern=r'^[^@]+@[^@]+\.[^@]+$')
    age: int = Field(..., ge=18, le=120)

    @field_validator('username')
    @classmethod
    def username_reserved(cls, v: str) -> str:
        if v.lower() in ['admin', 'root']:
            raise ValueError('Reserved username')
        return v

@app.post("/users/")
async def create_user(user: UserCreate):
    # Validation happens automatically
    return {"username": user.username, "email": user.email}
```

---

## Django REST Framework Patterns

### Viewsets and Routers

```python
from rest_framework import viewsets, routers, serializers
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'date_joined']
        read_only_fields = ['id', 'date_joined']

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

# Automatic URL routing
router = routers.DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('api/', include(router.urls)),
]
```

### Custom Actions

```python
from rest_framework.decorators import action
from rest_framework.response import Response

class UserViewSet(viewsets.ModelViewSet):
    # ... standard CRUD actions ...

    @action(detail=True, methods=['post'])
    def set_password(self, request, pk=None):
        """Custom action: POST /api/users/{id}/set_password/"""
        user = self.get_object()
        password = request.data.get('password')
        user.set_password(password)
        user.save()
        return Response({'status': 'password set'})

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Custom action: GET /api/users/me/"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
```

### Serializers with Validation

```python
from rest_framework import serializers
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError

class UserSerializer(serializers.ModelSerializer):
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'password_confirm']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise ValidationError("Passwords don't match")
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User(**validated_data)
        user.set_password(validated_data['password'])
        user.save()
        return user
```

### Permission Classes

```python
from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # Read permissions allowed for any request
        if request.method in permissions.SAFE_METHODS:
            return True
        # Write permissions only for owner
        return obj.owner == request.user

class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [IsOwnerOrReadOnly]
```

---

## Flask Patterns

### Application Factory Pattern

```python
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()

def create_app(config_name='development'):
    app = Flask(__name__)
    app.config.from_object(f'config.{config_name.title()}Config')

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)

    # Register blueprints
    from .api import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')

    return app
```

### Blueprint Organization

```python
from flask import Blueprint, jsonify, request

api_bp = Blueprint('api', __name__)

@api_bp.route('/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([u.to_dict() for u in users])

@api_bp.route('/users', methods=['POST'])
def create_user():
    data = request.get_json()
    user = User(**data)
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201
```

### Error Handling

```python
from flask import jsonify

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500
```

---

## API Versioning

### URL Path Versioning (Recommended)

```python
# FastAPI
@app.get("/api/v1/users")
async def list_users_v1():
    return {"version": "v1", "data": []}

@app.get("/api/v2/users")
async def list_users_v2():
    return {"version": "v2", "data": [], "extended": True}

# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_VERSIONING_CLASS': 'rest_framework.versioning.URLPathVersioning',
    'DEFAULT_VERSION': 'v1',
    'ALLOWED_VERSIONS': ['v1', 'v2'],
    'VERSION_PARAM': 'version',
}
```

### Header-Based Versioning

```python
from fastapi import Header

@app.get("/api/users")
async def list_users(x_api_version: str = Header("v1")):
    if x_api_version == "v1":
        return {"version": "v1", "data": []}
    elif x_api_version == "v2":
        return {"version": "v2", "data": [], "extended": True}
    else:
        raise HTTPException(status_code=400, detail="Unsupported version")
```

---

## Configuration Management

### Pydantic Settings (Recommended)

```python
from pydantic_settings import BaseSettings, Field
from typing import Optional

class Settings(BaseSettings):
    # Database
    database_url: str = Field(..., env="DATABASE_URL")

    # API Keys
    api_key: str = Field(..., env="API_KEY")

    # Application
    debug: bool = False
    max_workers: int = Field(default=4, ge=1, le=16)

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

settings = Settings()
```

### Django Settings Pattern

```python
# settings/base.py
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent

class Base:
    SECRET_KEY = os.environ.get('SECRET_KEY')
    DEBUG = os.environ.get('DEBUG', 'False') == 'True'
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME'),
            'USER': os.environ.get('DB_USER'),
            'PASSWORD': os.environ.get('DB_PASSWORD'),
            'HOST': os.environ.get('DB_HOST'),
            'PORT': os.environ.get('DB_PORT', '5432'),
        }
    }

# settings/production.py
from .base import Base

class Production(Base):
    DEBUG = False
    ALLOWED_HOSTS = ['api.example.com']
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
```

---

## Authentication & Security

### JWT Authentication (FastAPI)

```python
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from datetime import datetime, timedelta

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

SECRET_KEY = settings.secret_key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid credentials")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = get_user(username)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user
```

### OAuth2 with Scopes

```python
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="token",
    scopes={
        "read": "Read access",
        "write": "Write access",
        "admin": "Admin access"
    }
)

@app.get("/users/", dependencies=[Depends(oauth2_scheme)])
async def read_users():
    return {"users": []}

@app.get("/admin/", dependencies=[Depends(oauth2_scheme)])
async def admin_panel():
    return {"message": "Admin panel"}
```

### CORS Configuration

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Security Headers Middleware

```python
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000"
        return response

app.add_middleware(SecurityHeadersMiddleware)
```

---

## Deployment Patterns

### WSGI vs ASGI

| Server Type | Use Case | Framework | Command |
|-------------|----------|-----------|---------|
| **Gunicorn** | WSGI (Django/Flask) | sync apps | `gunicorn app:app -w 4 -k sync` |
| **Uvicorn** | ASGI (FastAPI) | async apps | `uvicorn app:app` |
| **Gunicorn + Uvicorn** | Hybrid | FastAPI production | `gunicorn app:app -w 1 -k uvicorn.workers.UvicornWorker` |

### Docker Configuration

```dockerfile
# Multi-stage build for Python apps
FROM python:3.12-slim as builder

WORKDIR /app
COPY pyproject.toml .
RUN pip install --no-cache-dir -e .

FROM python:3.12-slim
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY . .

# Non-root user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Kubernetes Probes

```yaml
# FastAPI deployment with health checks
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fastapi-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: fastapi
  template:
    metadata:
      labels:
        app: fastapi
    spec:
      containers:
      - name: fastapi
        image: fastapi-app:latest
        ports:
        - containerPort: 8000
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 10
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static {
        alias /app/static;
    }
}
```

---

## Quick Reference

### Common Security Threats and Mitigations

| Threat | Mitigation | Tool |
|--------|------------|------|
| SQL Injection | Parameterized queries, ORM | SQLAlchemy, Django ORM |
| XSS | Input sanitization, output encoding | bleach, DOMPurify |
| CSRF | Tokens, SameSite cookies | Django CSRF middleware |
| Command Injection | shlex.quote(), list form subprocess | shlex module |
| SSRF | URL validation, IP blocking | ipaddress, urllib.parse |
| Rate Limiting | slowapi, user-specific limits | slowapi, built-in decorators |

### Library Recommendations

| Purpose | Library | Version Notes |
|---------|---------|---------------|
| Web Framework | FastAPI | 0.115+ |
| Database ORM | SQLAlchemy | 2.0+ (async support) |
| Validation | Pydantic | 2.0+ |
| Async HTTP | httpx | 0.27+ |
| Testing | pytest | 8.0+ |
| Type Checking | mypy | 1.8+ |

---

## References

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
