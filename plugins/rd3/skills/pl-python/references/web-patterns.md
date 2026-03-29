---
name: web-patterns
description: "FastAPI, Flask, and Django patterns for Python web development"
see_also:
  - rd3:pl-python
  - rd3:libraries
---

# Python Web Programming Patterns

Complete guide to web framework patterns in Python.

## Framework Selection Guide

### Comparison Matrix

| Framework | Best For | Scale | Async | Type Safety | Learning Curve |
|-----------|----------|-------|-------|-------------|----------------|
| **FastAPI** | High-performance APIs | Small-Medium | Native | Pydantic | Low |
| **Django + DRF** | Full-stack apps | Large | Optional | Pydantic | Medium |
| **Flask** | Microservices, simple APIs | Small | Extension | Manual | Low |
| **httpx + Starlette** | Lightweight async APIs | Small-Medium | Native | Manual | Medium |

---

## FastAPI Patterns

### Dependency Injection

```python
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

app = FastAPI()

# Dependency as a function
async def get_db():
    async with AsyncSession(engine) as session:
        yield session

# Using dependency in endpoint
@app.post("/users/")
async def create_user(
    user: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    db_user = await create_user_in_db(db, user)
    return db_user
```

### Background Tasks

```python
from fastapi import FastAPI, BackgroundTasks

app = FastAPI()

def send_email(email: str, message: str):
    import time
    time.sleep(1)
    print(f"Email sent to {email}")

@app.post("/notify/")
async def send_notification(
    email: str,
    message: str,
    background_tasks: BackgroundTasks
):
    background_tasks.add_task(send_email, email, message)
    return {"message": "Notification queued"}
```

### WebSocket Support

```python
from fastapi import WebSocket, WebSocketDisconnect
from typing import List

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

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
    return {"username": user.username, "email": user.email}
```

### Exception Handling

```python
from fastapi import FastAPI, Request
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

---

## Django REST Framework Patterns

### Viewsets and Routers

```python
from rest_framework import viewsets, routers, serializers

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'date_joined']
        read_only_fields = ['id', 'date_joined']

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

router = routers.DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('api/', include(router.urls)),
]
```

### Custom Actions

```python
class UserViewSet(viewsets.ModelViewSet):
    @action(detail=True, methods=['post'])
    def set_password(self, request, pk=None):
        user = self.get_object()
        password = request.data.get('password')
        user.set_password(password)
        user.save()
        return Response({'status': 'password set'})

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
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

    db.init_app(app)
    migrate.init_app(app, db)

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

---

## Authentication Patterns

### JWT Authentication (FastAPI)

```python
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

SECRET_KEY = settings.secret_key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
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
RUN pip install uv && uv sync --frozen

FROM python:3.12-slim
WORKDIR /app
COPY --from=builder /app/.venv /app/.venv
COPY . .

ENV PATH="/app/.venv/bin:$PATH"
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Kubernetes Probes

```yaml
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

---

## Security Patterns

### CORS Configuration (FastAPI)

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

### Security Headers

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

## Quick Reference

### Common Security Threats

| Threat | Mitigation |
|--------|------------|
| SQL Injection | Parameterized queries, ORM |
| XSS | Input sanitization, output encoding |
| CSRF | Tokens, SameSite cookies |
| Command Injection | `shlex.quote()`, list form subprocess |
| SSRF | URL validation, IP blocking |
| Rate Limiting | slowapi |

### Framework Quick Reference

```python
# FastAPI route
@app.get("/items/{item_id}")
async def read_item(item_id: int):
    return {"item_id": item_id}

# Flask route
@app.route("/items/<int:item_id>")
def read_item(item_id):
    return {"item_id": item_id}

# Django CBV
class ItemDetailView(DetailView):
    model = Item
    template_name = "items/detail.html"
```
