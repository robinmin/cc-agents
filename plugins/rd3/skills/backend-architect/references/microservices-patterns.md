---
name: microservices-patterns
description: "Microservices architecture: Service decomposition, Event Sourcing, CQRS, Saga patterns, service mesh, and distributed system design."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-03-23
tags: [backend, microservices, event-sourcing, cqrs, saga, distributed-systems, architecture-design]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - knowledge-only
see_also:
  - rd3:backend-architect
  - rd3:backend-architect/references/api-design
---

# Microservices Architecture Patterns

Comprehensive guide to microservices patterns including decomposition strategies, Event Sourcing, CQRS, Saga patterns, and service mesh architecture.

## Microservices Decomposition

### Decomposition Strategies

```
1. BY BUSINESS CAPABILITY (Common)
   ├── Order Service     → Order management
   ├── User Service       → User accounts, auth
   ├── Payment Service   → Payment processing
   ├── Inventory Service  → Stock management
   └── Shipping Service   → Logistics

2. BY SUBJECT AREA (DDD Bounded Contexts)
   ├── Catalog Domain    → Products, categories
   ├── Sales Domain      → Orders, pricing
   └── Customer Domain   → Accounts, profiles

3. BY VERB (Functional Decomposition)
   ├── Search Service    → Product search
   ├── Cart Service      → Shopping cart
   ├── Checkout Service  → Purchase flow
   └── Profile Service   → User profiles

4. BY TEAM (Team Topologies)
   ├── Platform Team Services
   ├── Feature Team Services
   └── Enabling Team Services
```

### Decomposition Decision Tree

```
Should you decompose?
│
├── Is the service/domain large enough to benefit?
│   └── N developer teams working on it? < 2-3 → Keep monolithic
│
├── Different scaling requirements?
│   └── Some components need 100x more capacity → Decompose
│
├── Different deployment cadences?
│   └── Teams want to deploy independently? → Decompose
│
├── Different technology needs?
│   └── Part needs Python ML, rest needs Node? → Decompose
│
├── Clear domain boundaries?
│   └── Can you define clean APIs between components? → Decompose
│
└── Organizational alignment?
    └── Service ownership matches team boundaries? → Decompose
```

## Service Communication Patterns

### Synchronous (REST/gRPC)

```typescript
// HTTP/gRPC client
class UserServiceClient {
  constructor(private baseUrl: string) {}

  async getUser(userId: string): Promise<User> {
    const response = await fetch(`${this.baseUrl}/users/${userId}`);
    if (!response.ok) {
      throw new Error(`User service error: ${response.status}`);
    }
    return response.json();
  }

  async getUsersByIds(userIds: string[]): Promise<User[]> {
    const response = await fetch(`${this.baseUrl}/users/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: userIds })
    });
    return response.json();
  }
}

// Circuit breaker integration
import { CircuitBreaker } from 'opossum';

const breaker = new CircuitBreaker(UserServiceClient.prototype.getUser, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

breaker.fallback(() => ({ id: 'unknown', name: 'Default User' }));
breaker.on('failure', (event) => logger.error('Circuit breaker failure', event));
```

### Asynchronous (Message Queue)

```typescript
// Message producer
class OrderEventPublisher {
  constructor(private kafka: Kafka) {}

  async publishOrderCreated(order: Order): Promise<void> {
    await this.kafka.send({
      topic: 'order-events',
      messages: [{
        key: order.id,
        value: {
          type: 'ORDER_CREATED',
          payload: order,
          metadata: {
            timestamp: new Date().toISOString(),
            version: '1.0'
          }
        }
      }]
    });
  }
}

// Message consumer
class InventoryEventHandler {
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    // Process with retry logic
    await withRetry(async () => {
      for (const item of event.payload.items) {
        await this.inventoryService.reserveStock(
          item.productId,
          item.quantity
        );
      }
    }, {
      maxAttempts: 3,
      backoff: 'exponential'
    });
  }
}
```

## Event Sourcing

### Event Store Structure

```typescript
interface Event<T> {
  eventId: string;        // UUID
  aggregateId: string;    // Entity ID
  eventType: string;       // 'UserCreated', 'OrderShipped'
  eventData: T;            // Event payload
  metadata: {
    version: number;       // Aggregate version
    timestamp: string;     // ISO timestamp
    correlationId: string; // For tracing
    causationId: string;   // What triggered this
  };
}

interface EventStore {
  save(event: Event<unknown>): Promise<void>;
  getById(aggregateId: string): Promise<Event<unknown>[]>;
  getByType(aggregateId: string, eventType: string): Promise<Event<unknown>>;
  getAll(from: string, to: string): Promise<Event<unknown>[]>;
}

// Implementation
class PostgresEventStore implements EventStore {
  async save(event: Event<unknown>): Promise<void> {
    await db.query(`
      INSERT INTO events (id, aggregate_id, type, data, metadata, version)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [event.eventId, event.aggregateId, event.eventType,
        JSON.stringify(event.eventData), JSON.stringify(event.metadata),
        event.metadata.version]);
  }

  async getById(aggregateId: string): Promise<Event<unknown>[]> {
    const result = await db.query(`
      SELECT * FROM events
      WHERE aggregate_id = $1
      ORDER BY metadata->>'version' ASC
    `, [aggregateId]);

    return result.rows.map(row => ({
      ...row,
      eventData: row.data,
      metadata: row.metadata
    }));
  }
}
```

### Aggregate Reconstruction

```typescript
// Aggregate root
class Order {
  private events: Event<unknown>[] = [];

  constructor(private id: string, version: number = 0) {
    this.id = id;
  }

  // Apply events to rebuild state
  static fromEvents(id: string, events: Event<unknown>[]): Order {
    const order = new Order(id);
    for (const event of events) {
      order.apply(event, false);
    }
    return order;
  }

  private apply(event: Event<unknown>, isNew: boolean = true): void {
    switch (event.eventType) {
      case 'OrderCreated':
        this.handleOrderCreated(event.eventData as OrderCreatedPayload);
        break;
      case 'ItemAdded':
        this.handleItemAdded(event.eventData as ItemAddedPayload);
        break;
      case 'OrderShipped':
        this.handleOrderShipped(event.eventData as OrderShippedPayload);
        break;
    }

    if (isNew) {
      this.events.push(event);
    }
  }

  // Business logic - raises new events
  addItem(productId: string, quantity: number, price: number): void {
    if (this.status !== 'draft') {
      throw new Error('Can only add items to draft orders');
    }

    this.apply({
      eventId: crypto.randomUUID(),
      aggregateId: this.id,
      eventType: 'ItemAdded',
      eventData: { productId, quantity, price },
      metadata: {
        version: this.events.length + 1,
        timestamp: new Date().toISOString(),
        correlationId: '',
        causationId: ''
      }
    });
  }
}
```

### Snapshot for Performance

```typescript
interface Snapshot<T> {
  aggregateId: string;
  aggregateType: string;
  version: number;           // Which event version this represents
  state: T;                 // Full state at this version
  timestamp: string;
}

// Snapshot strategy
class SnapshottingAggregate<T extends AggregateRoot> {
  private snapshotFrequency = 100;  // Snapshot every 100 events

  async save(aggregate: T): Promise<void> {
    await this.eventStore.saveAll(aggregate.getUncommittedEvents());

    // Create snapshot if needed
    if (aggregate.getVersion() % this.snapshotFrequency === 0) {
      await this.snapshotStore.save({
        aggregateId: aggregate.id,
        aggregateType: aggregate.constructor.name,
        version: aggregate.getVersion(),
        state: aggregate.getState(),
        timestamp: new Date().toISOString()
      });
    }
  }

  async load(id: string): Promise<T> {
    // Try to load from snapshot + events
    const snapshot = await this.snapshotStore.getLatest(id);

    if (snapshot) {
      const eventsAfterSnapshot = await this.eventStore.getAfterVersion(
        id,
        snapshot.version
      );
      const aggregate = T.fromSnapshot(snapshot.state);
      for (const event of eventsAfterSnapshot) {
        aggregate.apply(event);
      }
      return aggregate;
    }

    // Full replay
    const events = await this.eventStore.getById(id);
    return T.fromEvents(id, events);
  }
}
```

## CQRS (Command Query Responsibility Segregation)

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Commands      │────▶│   Command       │────▶│   Event Bus     │
│   (Write)       │     │   Handler       │     │   (Kafka)       │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Queries       │◀────│   Read Model   │◀────│   Projections   │
│   (Read)        │     │   (Materialized│     │   (Async)       │
└─────────────────┘     │    Views)       │     └─────────────────┘
                        └─────────────────┘
```

### Command Side

```typescript
// Command
interface CreateOrderCommand {
  customerId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  shippingAddress: Address;
}

// Command handler
class CreateOrderHandler {
  async handle(command: CreateOrderCommand): Promise<OrderResult> {
    // Validate
    const customer = await this.customerService.get(command.customerId);
    if (!customer.isActive) {
      throw new ValidationError('Customer is not active');
    }

    // Create aggregate
    const order = Order.create({
      customerId: command.customerId,
      items: command.items,
      shippingAddress: command.shippingAddress
    });

    // Save events
    await this.eventStore.saveAll(order.getUncommittedEvents());

    // Publish to bus
    await this.eventBus.publish(order.getUncommittedEvents());

    return {
      orderId: order.id,
      status: order.status,
      total: order.total
    };
  }
}
```

### Query Side (Read Model)

```typescript
// Read model (denormalized view)
interface OrderReadModel {
  orderId: string;
  customerName: string;
  customerEmail: string;
  items: Array<{ productName: string; quantity: number; price: number }>;
  totalAmount: number;
  status: string;
  createdAt: string;
  shippedAt: string | null;
}

// Projection
class OrderReadModelProjection {
  async project(event: Event<unknown>): Promise<void> {
    switch (event.eventType) {
      case 'OrderCreated':
        await this.createOrderReadModel(event);
        break;
      case 'OrderShipped':
        await this.updateOrderShippingInfo(event);
        break;
      case 'ItemAdded':
        await this.addItemToOrder(event);
        break;
    }
  }

  private async createOrderReadModel(event: Event<OrderCreatedPayload>): Promise<void> {
    const customer = await this.customerService.get(event.payload.customerId);

    await this.readDb.query(`
      INSERT INTO order_read_models (
        order_id, customer_name, customer_email,
        items, total_amount, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      event.aggregateId,
      customer.name,
      customer.email,
      JSON.stringify(event.payload.items),
      event.payload.total,
      'created',
      event.metadata.timestamp
    ]);
  }
}
```

## Saga Pattern

### Orchestration Saga

```typescript
// Saga orchestrator
class OrderSagaOrchestrator {
  private steps: SagaStep[] = [
    { name: 'createOrder', compensate: 'cancelOrder' },
    { name: 'reserveInventory', compensate: 'releaseInventory' },
    { name: 'processPayment', compensate: 'refundPayment' },
    { name: 'initiateShipping', compensate: 'cancelShipping' }
  ];

  async execute(orderId: string): Promise<SagaResult> {
    const context: SagaContext = { orderId, completedSteps: [] };

    for (const step of this.steps) {
      try {
        const result = await this.executeStep(step.name, context);
        context.completedSteps.push({ step: step.name, result });

        // Add delay between steps for demo purposes
        await this.delay(100);
      } catch (error) {
        // Compensate in reverse order
        await this.compensate(context);
        return { success: false, error: error.message };
      }
    }

    return { success: true, context };
  }

  private async compensate(context: SagaContext): Promise<void> {
    const completedSteps = context.completedSteps.reverse();

    for (const completed of completedSteps) {
      const step = this.steps.find(s => s.name === completed.step);
      if (step?.compensate) {
        try {
          await this.executeCompensation(step.compensate, context);
        } catch (compensateError) {
          // Log and continue compensating other steps
          logger.error('Compensation failed', { step: step.name, error: compensateError });
        }
      }
    }
  }
}
```

### Event-Choreography Saga

```typescript
// Event-driven saga (each service listens and reacts)
// Order Service publishes events
class OrderService {
  async createOrder(command: CreateOrderCommand): Promise<void> {
    const order = Order.create(command);

    await this.eventStore.saveAll(order.getUncommittedEvents());
    await this.eventBus.publish({
      type: 'ORDER_CREATED',
      payload: { orderId: order.id, items: command.items }
    });
  }
}

// Inventory Service listens and reacts
class InventoryService {
  @EventHandler('ORDER_CREATED')
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    try {
      await this.reserveInventory(event.payload.items);

      await this.eventBus.publish({
        type: 'INVENTORY_RESERVED',
        payload: { orderId: event.payload.orderId }
      });
    } catch (error) {
      await this.eventBus.publish({
        type: 'INVENTORY_RESERVATION_FAILED',
        payload: { orderId: event.payload.orderId, reason: error.message }
      });
    }
  }

  @EventHandler('ORDER_CANCELLED')
  async handleOrderCancelled(event: OrderCancelledEvent): Promise<void> {
    await this.releaseInventory(event.payload.orderId);
  }
}
```

## Service Mesh

### Sidecar Pattern

```yaml
# Istio virtual service
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: order-service
spec:
  hosts:
    - order-service
  http:
    - route:
        - destination:
            host: order-service
          weight: 100
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: gateway-error,connect-failure,refused-stream
      timeout: 10s
      circuitBreaker:
        consecutive5xxErrors: 5
        interval: 30s
        baseEjectionTime: 30s
```

### Traffic Management

```yaml
# Canary deployment
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: order-service
spec:
  hosts:
    - order-service
  http:
    - route:
        # 90% to stable
        - destination:
            host: order-service-stable
          weight: 90
        # 10% to canary
        - destination:
            host: order-service-canary
          weight: 10
```

## Resilience Patterns

### Circuit Breaker

```typescript
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number;    // Failures before opening
  successThreshold: number;    // Successes before closing (HALF_OPEN)
  timeout: number;            // Time before attempting recovery
}

class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt: Date;

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (new Date() >= this.nextAttempt) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker OPEN');
      }
    }

    try {
      const result = await operation();

      if (this.state === 'HALF_OPEN') {
        this.successCount++;
        if (this.successCount >= this.config.successThreshold) {
          this.state = 'CLOSED';
          this.failureCount = 0;
        }
      }

      return result;
    } catch (error) {
      this.failureCount++;

      if (this.state === 'HALF_OPEN' || this.failureCount >= this.config.failureThreshold) {
        this.state = 'OPEN';
        this.nextAttempt = new Date(Date.now() + this.config.timeout * 1000);
      }

      throw error;
    }
  }
}
```

### Bulkhead Isolation

```typescript
// Bulkhead pattern - isolate by workload
class BulkheadExecutor {
  private semaphores: Map<string, Semaphore> = new Map();

  constructor(private limits: Record<string, number>) {
    for (const [name, limit] of Object.entries(limits)) {
      this.semaphores.set(name, new Semaphore(limit));
    }
  }

  async execute<T>(workload: string, operation: () => Promise<T>): Promise<T> {
    const semaphore = this.semaphores.get(workload);
    if (!semaphore) {
      throw new Error(`Unknown workload: ${workload}`);
    }

    return semaphore.acquire(operation);
  }
}

// Usage
const bulkhead = new BulkheadExecutor({
  'order-service': 10,
  'payment-service': 5,
  'email-service': 20
});

// High-priority order won't be blocked by low-priority email
await bulkhead.execute('order-service', () => processHighPriorityOrder());
await bulkhead.execute('email-service', () => sendWelcomeEmail());
```
