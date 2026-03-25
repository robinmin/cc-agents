/**
 * TypeScript Discriminated Unions — SOTA Patterns
 *
 * Modern discriminated union patterns for type-safe state management,
 * error handling, and domain modeling.
 */

// ============================================================================
// Async State Machine
// ============================================================================

type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T; cachedAt?: Date }
  | { status: "error"; error: Error; retryable: boolean };

function transition<T>(state: AsyncState<T>, action: "fetch" | "resolve" | "reject" | "reset"): AsyncState<T> {
  switch (state.status) {
    case "idle":
      return action === "fetch" ? { status: "loading" } : state;
    case "loading":
      if (action === "resolve") return { status: "success", data: null as T };
      if (action === "reject") return { status: "error", error: new Error("Rejected"), retryable: true };
      return state;
    case "success":
    case "error":
      return action === "reset" ? { status: "idle" } : state;
  }
}

// ============================================================================
// Result Type with Typed Errors
// ============================================================================

type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INTERNAL_ERROR";

interface TypedError {
  readonly code: ErrorCode;
  readonly message: string;
  readonly timestamp: number;
}

type Result<T, E extends TypedError = TypedError> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly error: E };

function success<T>(value: T): Result<T> {
  return { success: true, value };
}

function failure<E extends TypedError>(error: E): Result<never, E> {
  return { success: false, error };
}

function isSuccess<T, E extends TypedError>(result: Result<T, E>): result is Result<T, E> & { success: true } {
  return result.success;
}

// ============================================================================
// Domain-Modeled Payment Types
// ============================================================================

type PaymentMethod =
  | {
      readonly type: "credit_card";
      readonly network: "visa" | "mastercard" | "amex";
      readonly lastFour: string;
      readonly expiryMonth: number;
      readonly expiryYear: number;
    }
  | {
      readonly type: "debit_card";
      readonly network: "visa" | "mastercard";
      readonly lastFour: string;
    }
  | {
      readonly type: "bank_transfer";
      readonly accountNumber: string;
      readonly routingNumber: string;
    }
  | {
      readonly type: "crypto";
      readonly network: "ethereum" | "bitcoin";
      readonly address: string;
    };

function formatPaymentMethod(method: PaymentMethod): string {
  switch (method.type) {
    case "credit_card":
      return `${method.network.toUpperCase()} ****${method.lastFour}`;
    case "debit_card":
      return `Debit ${method.network.toUpperCase()} ****${method.lastFour}`;
    case "bank_transfer":
      return `ACH ****${method.accountNumber.slice(-4)}`;
    case "crypto":
      return `${method.network} wallet`;
  }
}

// ============================================================================
// Notification System
// ============================================================================

type Notification<T = void> =
  | { readonly type: "info"; readonly message: string }
  | { readonly type: "success"; readonly message: string; readonly data: T }
  | { readonly type: "warning"; readonly message: string; readonly severity: 1 | 2 | 3 }
  | { readonly type: "error"; readonly message: string; readonly error: Error; readonly code: string };

function getNotificationIcon(notification: Notification): string {
  switch (notification.type) {
    case "info": return "ℹ️";
    case "success": return "✅";
    case "warning": return "⚠️";
    case "error": return "❌";
  }
}

// ============================================================================
// Type-Safe API Routes
// ============================================================================

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type RouteDefinition<P = never, Q = never, B = never, R = unknown> = {
  readonly path: string;
  readonly method: HttpMethod;
  readonly params?: P;
  readonly query?: Q;
  readonly body?: B;
  readonly response: R;
};

// Example routes
interface UserRoutes {
  readonly "/users": {
    readonly GET: RouteDefinition<never, { page?: number; limit?: number }, never, { users: unknown[]; total: number }>;
    readonly POST: RouteDefinition<never, never, { name: string; email: string }, { id: string }>;
  };
  readonly "/users/:id": {
    readonly GET: RouteDefinition<{ id: string }, never, never, unknown>;
    readonly PUT: RouteDefinition<{ id: string }, never, { name?: string; email?: string }, unknown>;
    readonly DELETE: RouteDefinition<{ id: string }, never, never, void>;
  };
}

// ============================================================================
// Tree-Structured Navigation State
// ============================================================================

type TreeNode<T> = {
  readonly id: string;
  readonly label: string;
  readonly data: T;
  readonly children?: readonly TreeNode<T>[];
  readonly expanded: boolean;
};

function flattenTree<T>(node: TreeNode<T>): readonly T[] {
  const result: T[] = [node.data];
  if (node.children) {
    for (const child of node.children) {
      result.push(...flattenTree(child));
    }
  }
  return result;
}

function findNode<T>(node: TreeNode<T>, id: string): TreeNode<T> | undefined {
  if (node.id === id) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return undefined;
}

// ============================================================================
// Command Pattern with Typed Payloads
// ============================================================================

type Command =
  | { readonly type: "CREATE_USER"; readonly payload: { name: string; email: string } }
  | { readonly type: "UPDATE_USER"; readonly payload: { id: string; name?: string; email?: string } }
  | { readonly type: "DELETE_USER"; readonly payload: { id: string; soft?: boolean } }
  | { readonly type: "ASSIGN_ROLE"; readonly payload: { userId: string; role: "admin" | "editor" | "viewer" } };

function executeCommand(command: Command): void {
  switch (command.type) {
    case "CREATE_USER":
      console.log("Creating user:", command.payload.name);
      break;
    case "UPDATE_USER":
      console.log("Updating user:", command.payload.id);
      break;
    case "DELETE_USER":
      console.log("Deleting user:", command.payload.id, command.payload.soft ? "(soft)" : "");
      break;
    case "ASSIGN_ROLE":
      console.log("Assigning role:", command.payload.role, "to user:", command.payload.userId);
      break;
  }
}

export {
  type AsyncState,
  transition,
  type Result,
  success,
  failure,
  isSuccess,
  type PaymentMethod,
  formatPaymentMethod,
  type Notification,
  getNotificationIcon,
  type RouteDefinition,
  type UserRoutes,
  type TreeNode,
  flattenTree,
  findNode,
  type Command,
  executeCommand,
};
