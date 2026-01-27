/**
 * TypeScript Discriminated Unions Examples
 *
 * Examples demonstrating discriminated unions for type-safe state management,
 * error handling, and data modeling.
 */

// ============================================================================
// Basic Discriminated Union
// ============================================================================

type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number }
  | { kind: 'triangle'; base: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'square':
      return shape.side ** 2;
    case 'triangle':
      return (shape.base * shape.height) / 2;
  }
}

// TypeScript ensures all cases are covered
const circle: Shape = { kind: 'circle', radius: 5 };
console.log(area(circle)); // 78.5398...

// ============================================================================
// Result Type (Success/Error)
// ============================================================================

type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };

function handleResult<T, E>(result: Result<T, E>): string {
  if (result.success) {
    return `Success: ${JSON.stringify(result.data)}`;
  } else {
    const errorResult = result as Extract<Result<T, E>, { success: false }>;
    return `Error: ${JSON.stringify(errorResult.error)}`;
  }
}

const successResult: Result<number, string> = { success: true, data: 42 };
const errorResult: Result<number, string> = { success: false, error: 'Failed' };

console.log(handleResult(successResult)); // Success: 42
console.log(handleResult(errorResult)); // Error: "Failed"

// ============================================================================
// API Response Types
// ============================================================================

type ApiResponse<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

function renderResponse<T>(response: ApiResponse<T>): string {
  switch (response.status) {
    case 'loading':
      return 'Loading...';
    case 'success':
      return `Data: ${JSON.stringify(response.data)}`;
    case 'error':
      return `Error: ${response.error}`;
  }
}

// ============================================================================
// State Management
// ============================================================================

type State =
  | { status: 'idle' }
  | { status: 'pending'; startTime: number }
  | { status: 'fulfilled'; value: string }
  | { status: 'rejected'; error: Error };

function transition(state: State, action: 'start' | 'resolve' | 'reject' | 'reset'): State {
  switch (state.status) {
    case 'idle':
      if (action === 'start') {
        return { status: 'pending', startTime: Date.now() };
      }
      return state;
    case 'pending':
      if (action === 'resolve') {
        return { status: 'fulfilled', value: 'Done' };
      }
      if (action === 'reject') {
        return { status: 'rejected', error: new Error('Failed') };
      }
      return state;
    case 'fulfilled':
    case 'rejected':
      if (action === 'reset') {
        return { status: 'idle' };
      }
      return state;
  }
}

let currentState: State = { status: 'idle' };
currentState = transition(currentState, 'start');
currentState = transition(currentState, 'resolve');

// ============================================================================
// Authentication States
// ============================================================================

type AuthState =
  | { status: 'unauthenticated' }
  | { status: 'authenticating' }
  | { status: 'authenticated'; user: { id: string; name: string } }
  | { status: 'error'; error: string };

function login(state: AuthState): AuthState {
  if (state.status === 'unauthenticated') {
    return { status: 'authenticating' };
  }
  return state;
}

function loginSuccess(state: AuthState, user: { id: string; name: string }): AuthState {
  if (state.status === 'authenticating') {
    return { status: 'authenticated', user };
  }
  return state;
}

function logout(state: AuthState): AuthState {
  if (state.status === 'authenticated') {
    return { status: 'unauthenticated' };
  }
  return state;
}

// ============================================================================
// File System Operations
// ============================================================================

type FileOperation =
  | { type: 'read'; path: string }
  | { type: 'write'; path: string; content: string }
  | { type: 'delete'; path: string }
  | { type: 'copy'; source: string; destination: string };

function executeOperation(operation: FileOperation): string {
  switch (operation.type) {
    case 'read':
      return `Reading file: ${operation.path}`;
    case 'write':
      return `Writing to ${operation.path}: ${operation.content}`;
    case 'delete':
      return `Deleting file: ${operation.path}`;
    case 'copy':
      return `Copying ${operation.source} to ${operation.destination}`;
  }
}

// ============================================================================
// Message Types
// ============================================================================

type Message =
  | { type: 'text'; content: string; timestamp: number }
  | { type: 'image'; url: string; alt: string; timestamp: number }
  | { type: 'file'; url: string; filename: string; size: number; timestamp: number };

function formatMessage(message: Message): string {
  switch (message.type) {
    case 'text':
      return `[${new Date(message.timestamp).toLocaleTimeString()}] ${message.content}`;
    case 'image':
      return `[${new Date(message.timestamp).toLocaleTimeString()}] Image: ${message.alt}`;
    case 'file':
      return `[${new Date(message.timestamp).toLocaleTimeString()}] File: ${message.filename} (${message.size} bytes)`;
  }
}

// ============================================================================
// Network Request States
// ============================================================================

type NetworkRequest<T> =
  | { state: 'idle' }
  | { state: 'fetching' }
  | { state: 'success'; data: T; cached: boolean }
  | { state: 'failure'; error: string; retryable: boolean };

function handleRequest<T>(request: NetworkRequest<T>): string {
  switch (request.state) {
    case 'idle':
      return 'No request initiated';
    case 'fetching':
      return 'Request in progress...';
    case 'success':
      return request.cached
        ? `Data (cached): ${JSON.stringify(request.data)}`
        : `Data: ${JSON.stringify(request.data)}`;
    case 'failure':
      return request.retryable
        ? `Error: ${request.error} (retryable)`
        : `Error: ${request.error} (not retryable)`;
  }
}

// ============================================================================
// Payment Methods
// ============================================================================

type PaymentMethod =
  | { type: 'credit_card'; number: string; expiry: string; cvv: string }
  | { type: 'debit_card'; number: string; expiry: string; cvv: string }
  | { type: 'paypal'; email: string }
  | { type: 'bank_transfer'; accountNumber: string; routingNumber: string };

function processPayment(method: PaymentMethod, amount: number): string {
  switch (method.type) {
    case 'credit_card':
      return `Charging $${amount} to credit card ${method.number}`;
    case 'debit_card':
      return `Charging $${amount} to debit card ${method.number}`;
    case 'paypal':
      return `Charging $${amount} via PayPal (${method.email})`;
    case 'bank_transfer':
      return `Transferring $${amount} from account ${method.accountNumber}`;
  }
}

// ============================================================================
// Notification Types
// ============================================================================

type Notification =
  | { type: 'info'; message: string }
  | { type: 'success'; message: string }
  | { type: 'warning'; message: string }
  | { type: 'error'; message: string; code: number };

function getNotificationIcon(notification: Notification): string {
  switch (notification.type) {
    case 'info':
      return 'ℹ️';
    case 'success':
      return '✅';
    case 'warning':
      return '⚠️';
    case 'error':
      return '❌';
  }
}

// ============================================================================
// Exhaustiveness Checking with Never
// ============================================================================

function assertNever(value: never): never {
  throw new Error('Unexpected value: ' + value);
}

function getShapeDescription(shape: Shape): string {
  switch (shape.kind) {
    case 'circle':
      return `Circle with radius ${shape.radius}`;
    case 'square':
      return `Square with side ${shape.side}`;
    case 'triangle':
      return `Triangle with base ${shape.base} and height ${shape.height}`;
    default:
      return assertNever(shape); // Compile-time check for missing cases
  }
}

// ============================================================================
// Type Guards for Discriminated Unions
// ============================================================================

function isSuccess<T>(result: Result<T, unknown>): result is { success: true; data: T } {
  return result.success;
}

function isError<E>(result: Result<unknown, E>): result is { success: false; error: E } {
  return !result.success;
}

function processData(result: Result<string, Error>): void {
  if (isSuccess(result)) {
    console.log('Data:', result.data.toUpperCase());
  } else {
    console.error('Error:', result.error.message);
  }
}

// ============================================================================
// Mapping Discriminated Unions
// ============================================================================

type AsyncState<T> =
  | { status: 'pending' }
  | { status: 'success'; value: T }
  | { status: 'error'; error: Error };

function mapAsyncState<T, U>(
  state: AsyncState<T>,
  fn: (value: T) => U
): AsyncState<U> {
  switch (state.status) {
    case 'pending':
      return { status: 'pending' };
    case 'success':
      return { status: 'success', value: fn(state.value) };
    case 'error':
      return { status: 'error', error: state.error };
  }
}

const pendingState: AsyncState<number> = { status: 'pending' };
const successState: AsyncState<number> = { status: 'success', value: 42 };
const errorState: AsyncState<number> = { status: 'error', error: new Error('Failed') };

// Demonstrate mapping async state
const mappedSuccess = mapAsyncState(successState, x => x.toString());
// Type: AsyncState<string>
console.log('Mapped success:', mappedSuccess); // { status: 'success', value: '42' }

export {
  Shape,
  area,
  Result,
  handleResult,
  ApiResponse,
  renderResponse,
  State,
  transition,
  AuthState,
  login,
  loginSuccess,
  logout,
  FileOperation,
  executeOperation,
  Message,
  formatMessage,
  NetworkRequest,
  handleRequest,
  PaymentMethod,
  processPayment,
  Notification,
  getNotificationIcon,
  getShapeDescription,
  isSuccess,
  isError,
  processData,
  AsyncState,
  mapAsyncState
};
