/**
 * Class Patterns Examples
 *
 * This file demonstrates various class patterns for JavaScript development.
 */

// ============================================================================
// BASIC CLASS
// ============================================================================

/**
 * Basic class with constructor and methods
 */
class User {
  constructor(name, email) {
    this.name = name;
    this.email = email;
  }

  get displayName() {
    return this.name;
  }

  set displayName(value) {
    this.name = value;
  }

  getInfo() {
    return `${this.name} (${this.email})`;
  }
}

// Usage:
const user = new User('Alice', 'alice@example.com');
console.log(user.displayName);  // 'Alice'
user.displayName = 'Bob';
console.log(user.getInfo());  // 'Bob (alice@example.com)'

// ============================================================================
// PRIVATE FIELDS
// ============================================================================

/**
 * Class with private fields (ES2022)
 */
class BankAccount {
  #balance = 0;

  constructor(initialBalance = 0) {
    this.#balance = initialBalance;
  }

  deposit(amount) {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }
    this.#balance += amount;
    return this.#balance;
  }

  withdraw(amount) {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }
    if (amount > this.#balance) {
      throw new Error('Insufficient funds');
    }
    this.#balance -= amount;
    return this.#balance;
  }

  get balance() {
    return this.#balance;
  }

  #validateAmount(amount) {
    return amount > 0;
  }
}

// Usage:
const account = new BankAccount(100);
account.deposit(50);
console.log(account.balance);  // 150
// account.#balance;  // SyntaxError: Private field

// ============================================================================
// STATIC MEMBERS
// ============================================================================

/**
 * Class with static methods and properties
 */
class MathUtils {
  static PI = 3.14159;

  static add(a, b) {
    return a + b;
  }

  static multiply(a, b) {
    return a * b;
  }

  static circleArea(radius) {
    return this.PI * radius * radius;
  }
}

// Usage:
console.log(MathUtils.PI);  // 3.14159
console.log(MathUtils.add(2, 3));  // 5
console.log(MathUtils.circleArea(5));  // 78.53975

// ============================================================================
// INHERITANCE
// ============================================================================

/**
 * Base class
 */
class Animal {
  constructor(name) {
    this.name = name;
  }

  speak() {
    return `${this.name} makes a sound`;
  }

  eat() {
    return `${this.name} is eating`;
  }
}

/**
 * Derived class
 */
class Dog extends Animal {
  constructor(name, breed) {
    super(name);  // Call parent constructor
    this.breed = breed;
  }

  speak() {
    return `${this.name} barks`;
  }

  fetch() {
    return `${this.name} fetches the ball`;
  }
}

/**
 * Further derived class
 */
class GoldenRetriever extends Dog {
  constructor(name) {
    super(name, 'Golden Retriever');
  }

  fetch() {
    return `${this.name} happily fetches the ball`;
  }

  swim() {
    return `${this.name} loves to swim`;
  }
}

// Usage:
const animal = new Animal('Generic');
console.log(animal.speak());  // 'Generic makes a sound'

const dog = new Dog('Buddy', 'Labrador');
console.log(dog.speak());  // 'Buddy barks'
console.log(dog.eat());  // 'Buddy is eating'

const golden = new GoldenRetriever('Max');
console.log(golden.speak());  // 'Max barks'
console.log(golden.swim());  // 'Max loves to swim'

// ============================================================================
// MIXINS
// ============================================================================

/**
 * Mixin for event handling
 */
const Eventful = (Base) => class extends Base {
  constructor(...args) {
    super(...args);
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
};

/**
 * Apply mixin to class
 */
class Widget {
  constructor(name) {
    this.name = name;
  }
}

const EventfulWidget = Eventful(Widget);

// Usage:
const widget = new EventfulWidget('MyWidget');
widget.on('click', (data) => console.log('Clicked:', data));
widget.emit('click', { x: 10, y: 20 });

// ============================================================================
// FACTORY PATTERN
// ============================================================================

/**
 * Factory class for creating instances
 */
class UserFactory {
  static create(type, ...args) {
    switch (type) {
      case 'admin':
        return new AdminUser(...args);
      case 'guest':
        return new GuestUser(...args);
      default:
        return new User(...args);
    }
  }
}

class AdminUser extends User {
  constructor(name, email, permissions) {
    super(name, email);
    this.permissions = permissions;
  }

  hasPermission(permission) {
    return this.permissions.includes(permission);
  }
}

class GuestUser extends User {
  constructor(name) {
    super(name, 'guest@example.com');
    this.isGuest = true;
  }
}

// Usage:
const admin = UserFactory.create('admin', 'Alice', 'alice@example.com', ['read', 'write']);
const guest = UserFactory.create('guest', 'Bob');

console.log('Admin:', admin);
console.log('Guest:', guest);

// ============================================================================
// BUILDER PATTERN
// ============================================================================

/**
 * Builder for complex objects
 */
class QueryBuilder {
  constructor() {
    this.select = [];
    this.where = [];
    this.orderBy = null;
    this.limit = null;
  }

  addSelect(field) {
    this.select.push(field);
    return this;
  }

  addWhere(condition) {
    this.where.push(condition);
    return this;
  }

  setOrderBy(field) {
    this.orderBy = field;
    return this;
  }

  setLimit(value) {
    this.limit = value;
    return this;
  }

  build() {
    const query = {};

    if (this.select.length > 0) {
      query.select = this.select;
    }

    if (this.where.length > 0) {
      query.where = this.where;
    }

    if (this.orderBy) {
      query.orderBy = this.orderBy;
    }

    if (this.limit) {
      query.limit = this.limit;
    }

    return query;
  }
}

// Usage:
const query = new QueryBuilder()
  .addSelect('name')
  .addSelect('email')
  .addWhere('age > 18')
  .addWhere('active = true')
  .setOrderBy('name')
  .setLimit(10)
  .build();

console.log(query);
// { select: ['name', 'email'], where: ['age > 18', 'active = true'], orderBy: 'name', limit: 10 }

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

/**
 * Singleton class
 */
class Database {
  static #instance = null;

  constructor() {
    if (Database.#instance) {
      return Database.#instance;
    }
    this.connection = null;
    Database.#instance = this;
  }

  static getInstance() {
    if (!Database.#instance) {
      Database.#instance = new Database();
    }
    return Database.#instance;
  }

  connect() {
    this.connection = 'connected';
  }

  disconnect() {
    this.connection = null;
  }
}

// Usage:
const db1 = Database.getInstance();
const db2 = Database.getInstance();
console.log(db1 === db2);  // true

// ============================================================================
// OBSERVER PATTERN
// ============================================================================

/**
 * Subject class
 */
class Subject {
  constructor() {
    this.observers = [];
  }

  subscribe(observer) {
    this.observers.push(observer);
  }

  unsubscribe(observer) {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  notify(data) {
    this.observers.forEach(observer => observer.update(data));
  }
}

/**
 * Observer class
 */
class Observer {
  constructor(name) {
    this.name = name;
  }

  update(data) {
    console.log(`${this.name} received:`, data);
  }
}

// Usage:
const subject = new Subject();
const observer1 = new Observer('Observer 1');
const observer2 = new Observer('Observer 2');

subject.subscribe(observer1);
subject.subscribe(observer2);

subject.notify({ message: 'Hello observers!' });
// Observer 1 received: { message: 'Hello observers!' }
// Observer 2 received: { message: 'Hello observers!' }

// ============================================================================
// ASYNC METHODS
// ============================================================================

/**
 * Class with async methods
 */
class APIClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async get(endpoint) {
    const response = await fetch(`${this.baseURL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  async post(endpoint, data) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  async delete(endpoint) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }
}

// Usage:
const api = new APIClient('https://api.example.com');
// Demo: APIClient (commented - requires actual API)
// const users = await api.get('/users');
// const newUser = await api.post('/users', { name: 'Alice' });
// await api.delete('/users/1');
console.log('APIClient created for:', api.baseURL);

// ============================================================================
// DECORATOR PATTERN
// ============================================================================

/**
 * Class decorator (when decorator syntax is supported)
 * For now, using manual wrapping
 */
function withLogging(Class) {
  return class extends Class {
    constructor(...args) {
      super(...args);
      console.log(`${Class.name} instantiated with args:`, args);
    }

    async save() {
      console.log(`Saving ${this.constructor.name}...`);
      const result = await super.save();
      console.log(`Saved ${this.constructor.name}`);
      return result;
    }
  };
}

class Document {
  constructor(title, content) {
    this.title = title;
    this.content = content;
  }

  async save() {
    // Save logic
    return { success: true };
  }
}

const LoggedDocument = withLogging(Document);

// Usage:
const doc = new LoggedDocument('My Doc', 'Content');
await doc.save();
// Document instantiated with args: ['My Doc', 'Content']
// Saving LoggedDocument...
// Saved LoggedDocument

export {
  User,
  BankAccount,
  MathUtils,
  Animal,
  Dog,
  GoldenRetriever,
  Eventful,
  UserFactory,
  QueryBuilder,
  Database,
  Subject,
  Observer,
  APIClient,
  withLogging
};
