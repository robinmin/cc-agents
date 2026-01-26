# Python Architecture Patterns

Complete guide to software architecture patterns for Python applications.

## Table of Contents

1. [Pattern Selection Guide](#pattern-selection-guide)
2. [Layered Architecture](#layered-architecture)
3. [Hexagonal Architecture](#hexagonal-architecture)
4. [Clean Architecture](#clean-architecture)
5. [Event-Driven Architecture](#event-driven-architecture)
6. [Pattern Comparison](#pattern-comparison)

---

## Pattern Selection Guide

### Decision Framework

| Factor | Layered | Hexagonal | Clean | Event-Driven |
|--------|---------|-----------|-------|--------------|
| **Complexity** | Low | Medium | High | High |
| **Learning Curve** | Low | Medium | High | Medium |
| **Testability** | Medium | High | Very High | Medium |
| **Scalability** | Medium | High | High | Very High |
| **Team Size** | Small | Medium | Large | Any |
| **Domain Complexity** | Simple | Moderate | Complex | Any |

### When to Use Each Pattern

**Layered Architecture:**
- CRUD applications
- Simple APIs
- Small teams (< 5 developers)
- Tight deadlines

**Hexagonal Architecture:**
- Domain-driven design
- Multiple interfaces (REST, CLI, tests)
- Medium complexity domains
- Need for testability

**Clean Architecture:**
- Enterprise applications
- Complex business logic
- Large teams
- Long-term maintenance

**Event-Driven Architecture:**
- Async data pipelines
- Microservices
- Real-time systems
- High scalability needs

---

## Layered Architecture

### Structure

```
src/
└── myapp/
    ├── __init__.py
    ├── presentation/     # HTTP API, CLI
    │   ├── __init__.py
    │   ├── api.py        # FastAPI/Flask routes
    │   └── schemas.py    # Request/response models
    ├── business/         # Business logic
    │   ├── __init__.py
    │   ├── services.py   # Use cases
    │   └── models.py     # Domain models
    ├── data/             # Data access
    │   ├── __init__.py
    │   ├── repositories.py
    │   └── database.py
    └── config/
        └── settings.py
```

### Dependency Flow

```
presentation → business → data
              ↓
           config
```

**Key Rules:**
- Presentation depends on business
- Business depends on data
- No upward dependencies

### Example Implementation

```python
# src/myapp/data/models.py (Database models)
from dataclasses import dataclass

@dataclass
class UserEntity:
    id: int
    username: str
    email: str

# src/myapp/data/repositories.py (Data access)
class UserRepository:
    def __init__(self, db_session):
        self.db = db_session

    def get_by_id(self, user_id: int) -> UserEntity | None:
        return self.db.query(UserEntity).filter_by(id=user_id).first()

# src/myapp/business/models.py (Domain models)
from dataclasses import dataclass

@dataclass
class User:
    id: int
    username: str
    email: str

    def validate_email(self) -> bool:
        return "@" in self.email

# src/myapp/business/services.py (Business logic)
class UserService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    def get_user(self, user_id: int) -> User | None:
        entity = self.user_repo.get_by_id(user_id)
        if not entity:
            return None
        return User(id=entity.id, username=entity.username, email=entity.email)

# src/myapp/presentation/api.py (HTTP interface)
from fastapi import FastAPI, Depends

app = FastAPI()

@app.get("/users/{user_id}")
def get_user(user_id: int, service: UserService = Depends()):
    user = service.get_user(user_id)
    if not user:
        return {"error": "User not found"}
    return {"id": user.id, "username": user.username}
```

### Pros/Cons

| Pros | Cons |
|------|------|
| Simple to understand | Business logic leaks into presentation |
| Easy to implement | Testing can be difficult |
| Clear separation of concerns | Tight coupling to data layer |
| Good for CRUD apps | Not ideal for complex domains |

---

## Hexagonal Architecture

### Structure

```
src/
└── myapp/
    ├── __init__.py
    ├── domain/           # Core business logic (no external deps)
    │   ├── __init__.py
    │   ├── models.py
    │   ├── services.py
    │   └── ports/        # Interfaces for external interactions
    │       ├── __init__.py
    │       ├── repository.py   # Abstract base classes
    │       └── publisher.py    # Message publishing interface
    ├── infrastructure/   # External system implementations
    │   ├── __init__.py
    │   ├── persistence/
    │   │   ├── __init__.py
    │   │   └── sql_repository.py  # Implements repository port
    │   └── messaging/
    │       ├── __init__.py
    │       └── rabbitmq_publisher.py  # Implements publisher port
    └── application/      # Use cases / application services
        ├── __init__.py
        └── use_cases.py
```

### Dependency Flow

```
infrastructure → domain ← application
```

**Key Principles:**
1. Domain layer has ZERO external dependencies
2. Ports (interfaces) defined in domain
3. Adapters (implementations) in infrastructure
4. Application orchestrates use cases

### Example Implementation

```python
# src/myapp/domain/ports/repository.py (Port definition)
from abc import ABC, abstractmethod
from myapp.domain.models import User

class UserRepositoryPort(ABC):
    """Abstract repository interface."""

    @abstractmethod
    def find_by_id(self, user_id: int) -> User | None:
        pass

    @abstractmethod
    def save(self, user: User) -> None:
        pass

# src/myapp/domain/models.py (Domain model)
from dataclasses import dataclass

@dataclass
class User:
    id: int
    username: str
    email: str

    def can_login(self) -> bool:
        return len(self.username) >= 3

# src/myapp/domain/services.py (Domain services)
class UserDomainService:
    def __init__(self, user_repo: UserRepositoryPort):
        self.user_repo = user_repo

    def get_user(self, user_id: int) -> User | None:
        return self.user_repo.find_by_id(user_id)

    def create_user(self, username: str, email: str) -> User:
        user = User(id=None, username=username, email=email)
        self.user_repo.save(user)
        return user

# src/myapp/infrastructure/persistence/sql_repository.py (Adapter)
class SQLUserRepository(UserRepositoryPort):
    """SQL implementation of repository port."""

    def __init__(self, db_session):
        self.db = db_session

    def find_by_id(self, user_id: int) -> User | None:
        row = self.db.execute(
            "SELECT id, username, email FROM users WHERE id = ?",
            (user_id,)
        ).fetchone()
        if row:
            return User(id=row[0], username=row[1], email=row[2])
        return None

    def save(self, user: User) -> None:
        self.db.execute(
            "INSERT INTO users (username, email) VALUES (?, ?)",
            (user.username, user.email)
        )

# src/myapp/application/use_cases.py (Application/orchestration)
class CreateUserUseCase:
    def __init__(self, user_service: UserDomainService):
        self.user_service = user_service

    def execute(self, username: str, email: str) -> User:
        # Business validation
        if len(username) < 3:
            raise ValueError("Username too short")

        # Create user via domain service
        return self.user_service.create_user(username, email)
```

### Pros/Cons

| Pros | Cons |
|------|------|
| Highly testable (mock ports easily) | More upfront design work |
| Easy to swap implementations | More files/indirection |
| Domain logic isolated | Learning curve |
| Multiple interfaces possible | Overkill for simple apps |

---

## Clean Architecture

### Structure

```
src/
└── myapp/
    ├── __init__.py
    ├── entities/         # Core business rules (enterprise-wide)
    │   ├── __init__.py
    │   └── user.py
    ├── use_cases/        # Application-specific business rules
    │   ├── __init__.py
    │   ├── create_user.py
    │   └── get_user.py
    ├── interface_adapters/ # Convert data for external systems
    │   ├── __init__.py
    │   ├── controllers/   # Handle external input
    │   │   ├── __init__.py
    │   │   └── api.py
    │   ├── presenters/    # Format output
    │   │   ├── __init__.py
    │   │   └── user_presenter.py
    │   └── repositories/  # Data access interfaces
    │       ├── __init__.py
    │       └── user_repo.py
    ├── frameworks/        # External tools (DB, web, etc.)
    │   ├── __init__.py
    │   ├── database/
    │   │   └── postgres_repo.py
    │   └── web/
    │       └── fastapi_routes.py
    └── config/
        └── settings.py
```

### Dependency Rule

**Source code dependencies must only point INWARD, toward high-level policies.**

```
frameworks → interface_adapters → use_cases → entities
```

### Example Implementation

```python
# src/myapp/entities/user.py (Core entity - no framework deps)
from dataclasses import dataclass

@dataclass
class User:
    id: int | None
    username: str
    email: str

    def validate(self) -> list[str]:
        """Core validation - business rules."""
        errors = []
        if len(self.username) < 3:
            errors.append("Username must be at least 3 characters")
        if "@" not in self.email:
            errors.append("Invalid email")
        return errors

# src/myapp/use_cases/create_user.py (Use case - application logic)
from myapp.entities.user import User
from myapp.interface_adapters.repositories.user_repo import UserRepository

class CreateUserInput:
    """Input boundary (DTO)."""
    username: str
    email: str

class CreateUserOutput:
    """Output boundary (DTO)."""
    user_id: int
    username: str

class CreateUserUseCase:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    def execute(self, input: CreateUserInput) -> CreateUserOutput:
        # Create entity
        user = User(id=None, username=input.username, email=input.email)

        # Validate
        errors = user.validate()
        if errors:
            raise ValueError("\n".join(errors))

        # Save via repository
        self.user_repo.save(user)

        # Return output
        return CreateUserOutput(user_id=user.id, username=user.username)

# src/myapp/interface_adapters/repositories/user_repo.py (Interface)
from abc import ABC, abstractmethod
from myapp.entities.user import User

class UserRepository(ABC):
    """Repository interface - defined at adapter layer."""

    @abstractmethod
    def save(self, user: User) -> User:
        pass

# src/myapp/frameworks/database/postgres_repo.py (Implementation)
from myapp.interface_adapters.repositories.user_repo import UserRepository
from myapp.entities.user import User

class PostgresUserRepository(UserRepository):
    """PostgreSQL implementation of repository."""

    def __init__(self, db_session):
        self.db = db_session

    def save(self, user: User) -> User:
        cursor = self.db.execute(
            "INSERT INTO users (username, email) VALUES (%s, %s) RETURNING id",
            (user.username, user.email)
        )
        user.id = cursor.fetchone()[0]
        return user

# src/myapp/frameworks/web/fastapi_routes.py (HTTP interface)
from fastapi import FastAPI, Depends
from myapp.use_cases.create_user import CreateUserUseCase, CreateUserInput

app = FastAPI()

@app.post("/users")
def create_user(
    username: str,
    email: str,
    use_case: CreateUserUseCase = Depends()
):
    input_dto = CreateUserInput(username=username, email=email)
    output = use_case.execute(input_dto)
    return {"user_id": output.user_id, "username": output.username}
```

### Pros/Cons

| Pros | Cons |
|------|------|
| Maximum testability | Significant boilerplate |
| Framework-agnostic core | Steep learning curve |
| Easy to swap implementations | Overkill for small projects |
| Scales to large teams | Can feel over-engineered |

---

## Event-Driven Architecture

### Structure

```
src/
└── myapp/
    ├── __init__.py
    ├── domain/
    │   ├── __init__.py
    │   ├── events.py      # Event definitions
    │   └── models.py
    ├── producers/
    │   ├── __init__.py
    │   └── user_producer.py
    ├── consumers/
    │   ├── __init__.py
    │   ├── user_consumer.py
    │   └── email_consumer.py
    ├── handlers/
    │   ├── __init__.py
    │   └── event_handlers.py
    └── infrastructure/
        ├── __init__.py
        └── message_bus.py
```

### Key Concepts

**Events:** Immutable facts about something that happened
**Producers:** Emit events when actions occur
**Consumers:** React to events asynchronously
**Message Bus:** Transports events between producers/consumers

### Example Implementation

```python
# src/myapp/domain/events.py (Event definitions)
from dataclasses import dataclass
from datetime import datetime

@dataclass
class UserCreatedEvent:
    user_id: int
    username: str
    email: str
    created_at: datetime

@dataclass
class EmailRequestedEvent:
    to: str
    subject: str
    body: str

# src/myapp/infrastructure/message_bus.py (Event bus)
import asyncio
from typing import Callable, Dict, Type
from myapp.domain.events import UserCreatedEvent

class MessageBus:
    def __init__(self):
        self.handlers: Dict[Type, list[Callable]] = {}

    def subscribe(self, event_type: Type, handler: Callable):
        if event_type not in self.handlers:
            self.handlers[event_type] = []
        self.handlers[event_type].append(handler)

    async def publish(self, event):
        event_type = type(event)
        if event_type in self.handlers:
            tasks = [handler(event) for handler in self.handlers[event_type]]
            await asyncio.gather(*tasks)

# src/myapp/producers/user_producer.py (Event producer)
class UserProducer:
    def __init__(self, message_bus: MessageBus):
        self.bus = message_bus

    async def create_user(self, username: str, email: str) -> int:
        # Create user in database
        user_id = 123  # Simulated

        # Emit event
        event = UserCreatedEvent(
            user_id=user_id,
            username=username,
            email=email,
            created_at=datetime.now()
        )
        await self.bus.publish(event)

        return user_id

# src/myapp/consumers/email_consumer.py (Event consumer)
class EmailConsumer:
    def __init__(self, message_bus: MessageBus, email_service):
        self.bus = message_bus
        self.email_service = email_service
        self.bus.subscribe(UserCreatedEvent, self.on_user_created)

    async def on_user_created(self, event: UserCreatedEvent):
        """Send welcome email when user is created."""
        await self.email_service.send_email(
            to=event.email,
            subject="Welcome!",
            body=f"Hi {event.username}, welcome to our platform!"
        )

# src/myapp/handlers/event_handlers.py (Additional handlers)
class AuditLogHandler:
    def __init__(self, message_bus: MessageBus, audit_logger):
        self.bus = message_bus
        self.audit_logger = audit_logger
        self.bus.subscribe(UserCreatedEvent, self.log_user_created)

    async def log_user_created(self, event: UserCreatedEvent):
        await self.audit_logger.log(f"User created: {event.user_id}")
```

### Event-Driven Patterns

**1. Event Notification:**
```python
# Producers don't care who listens
await bus.publish(UserCreatedEvent(user_id=1, username="alice"))
```

**2. Event Carried State Transfer:**
```python
# Event contains all relevant data
@dataclass
class OrderPlacedEvent:
    order_id: int
    items: list[OrderItem]
    total: Decimal
    customer_id: int
```

**3. Event Sourcing:**
```python
# Store all events as the source of truth
class EventStore:
    async def append(self, stream_id: str, events: list[Event]):
        await self.db.save_events(stream_id, events)

    async def replay(self, stream_id: str) -> list[Event]:
        return await self.db.get_events(stream_id)
```

### Pros/Cons

| Pros | Cons |
|------|------|
| Highly scalable | Debugging is harder |
| Loose coupling | Event schema evolution is tricky |
| Natural async processing | Eventual consistency |
| Easy to add consumers | Requires message broker infrastructure |

---

## Pattern Comparison

### Complexity vs. Team Size

```
Clean Architecture    ████████████████████ (Large teams 10+)
Hexagonal             ██████████████ (Medium teams 5-10)
Layered               ████████ (Small teams 2-5)
Event-Driven          ████████████ (Any size, distributed)
```

### Testability Comparison

| Pattern | Unit Test Ease | Integration Test Ease | Mock Required |
|---------|----------------|----------------------|---------------|
| Layered | Medium | Easy | DB, API |
| Hexagonal | Easy | Medium | Ports only |
| Clean | Very Easy | Medium | All adapters |
| Event-Driven | Easy | Hard | Message bus |

### When to Evolve

```
Start with Layered
    ↓
Pain points: Hard to test, tight coupling?
    ↓ Yes
Evolve to Hexagonal
    ↓
Pain points: Complex domain, multiple boundaries?
    ↓ Yes
Evolve to Clean Architecture
    ↓
Pain points: Need horizontal scaling?
    ↓ Yes
Evolve to Event-Driven (partial or full)
```

---

## Quick Reference

### Pattern Selection Checklist

- [ ] Is this a CRUD app? → Layered
- [ ] Do I need multiple interfaces (REST, CLI, test)? → Hexagonal
- [ ] Is business logic complex and enterprise-critical? → Clean
- [ ] Do I need high horizontal scalability? → Event-Driven
- [ ] Is my team small (<5)? → Start with Layered
- [ ] Do I have strict testing requirements? → Hexagonal or Clean

### Common Pitfalls

| Pitfall | Pattern | Solution |
|---------|---------|----------|
| Anemic domain models | All | Put business logic in entities |
| Database-driven design | Layered | Start with domain, not DB schema |
| Over-engineering | Clean/Hexagonal | Start simple, evolve |
| Event chaos | Event-Driven | Document event schemas clearly |

---

## References

- [Clean Architecture by Robert C. Martin](https://www.oreilly.com/library/view/clean-architecture-a/9780134494272/)
- [Hexagonal Architecture (Ports and Adapters)](https://alistair.cockburn.us/hexagonal-architecture/)
- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)
- [Enterprise Integration Patterns](https://www.enterpriseintegrationpatterns.com/)
