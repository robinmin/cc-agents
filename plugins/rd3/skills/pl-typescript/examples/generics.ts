/**
 * TypeScript Generics — SOTA Patterns
 *
 * Modern generic patterns including variance annotations, NoInfer,
 * constrained inference, and type-level programming.
 */

// ============================================================================
// Variance Annotations (TS 5.0+)
// ============================================================================

// Covariant producer type
type Producer<out T> = () => T;

// Contravariant consumer type
type Consumer<in T> = (value: T) => void;

// Bivariant type (default for function parameters)
type Processor<T> = (input: T) => T;

// Covariant in output position only
interface ReadonlyRepository<out T> {
    findById(id: string): Promise<T | null>;
    findAll(): Promise<readonly T[]>;
    count(): Promise<number>;
}

// Contravariant in input position
interface Validator<in T> {
    validate(value: T): boolean;
    errorMessage: string;
}

// ============================================================================
// NoInfer for Controlled Type Inference (TS 5.4+)
// ============================================================================

// NoInfer<T> prevents type inference in a specific position
function createCache<T>(_key: string, value: NoInfer<T>): T {
    return value;
}

// Without NoInfer, T would be inferred from both arguments
// With NoInfer, T is inferred only from `value`
const cached = createCache('user', { name: 'Alice', age: 30 });
// Type is { name: string; age: number } — not "Alice" | 30 (literal types)

// Use in generic utility types
type ExtractFirst<T extends readonly unknown[]> = T extends readonly [infer First, ...infer Rest] ? First : never;

function wrapInArray<T>(value: NoInfer<T>): T[] {
    return [value];
}

const wrapped = wrapInArray(42); // number[]

// ============================================================================
// Constrained Inference with `infer` in extends
// ============================================================================

// Extract return type from async functions
type AsyncReturnType<T extends (...args: any[]) => Promise<any>> = T extends (...args: any[]) => Promise<infer R>
    ? R
    : never;

async function fetchUser(): Promise<{ id: string; name: string }> {
    return { id: '1', name: 'Alice' };
}

type _User = AsyncReturnType<typeof fetchUser>; // { id: string; name: string }

// Extract props from a React-like component
type ComponentProps<T> = T extends (props: infer P) => any ? P : never;

function Button(_props: { label: string; onClick: () => void }) {
    return null;
}

type _ButtonProps = ComponentProps<typeof Button>; // { label: string; onClick: () => void }

// ============================================================================
// Branded Types for Domain Modeling
// ============================================================================

type Brand<T, B extends string> = T & { readonly __brand: B };

type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;
type Email = Brand<string, 'Email'>;
type PositiveInt = Brand<number, 'PositiveInt'>;

function createUserId(id: string): UserId {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        throw new Error('Invalid UUID format');
    }
    return id as UserId;
}

function createEmail(email: string): Email {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Invalid email format');
    }
    return email as Email;
}

function createPositiveInt(n: number): PositiveInt {
    if (!Number.isInteger(n) || n <= 0) {
        throw new Error('Must be a positive integer');
    }
    return n as PositiveInt;
}

// Type-safe ID handling
function getUser(id: UserId): Promise<unknown> {
    return Promise.resolve({ id });
}

// getUser(createOrderId()); // Compile error: OrderId is not assignable to UserId

// ============================================================================
// Deep Utility Types with Recursion
// ============================================================================

type DeepReadonly<T> = T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;

type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

type DeepRequired<T> = T extends object ? { [K in keyof T]-?: DeepRequired<T[K]> } : T;

type DeepNonNullable<T> = T extends object ? { [K in keyof T]: DeepNonNullable<NonNullable<T[K]>> } : NonNullable<T>;

type DeepFrozen<T> = T extends object ? Readonly<{ [K in keyof T]: DeepFrozen<T[K]> }> : T;

// ============================================================================
// Heterogeneous Metadata Map
// ============================================================================

type MetadataMap = {
    stringField: { type: 'string'; default: string };
    numberField: { type: 'number'; default: number; min?: number; max?: number };
    boolField: { type: 'boolean'; default: boolean };
};

type MetadataFor<K extends keyof MetadataMap> = MetadataMap[K];

function getDefault<K extends keyof MetadataMap>(field: K): MetadataFor<K>['default'] {
    const defaults: MetadataMap = {
        stringField: { type: 'string', default: '' },
        numberField: { type: 'number', default: 0 },
        boolField: { type: 'boolean', default: false },
    };
    return defaults[field].default;
}

// ============================================================================
// Builder Pattern with Type-Safe Fluence
// ============================================================================

type BuildableConfig = {
    readonly host: string;
    readonly port: number;
    readonly secure: boolean;
    readonly timeout: number;
};

class ConfigBuilder<T extends Partial<BuildableConfig> = {}> {
    private constructor(private config: Partial<BuildableConfig>) {}

    static create<T extends Partial<BuildableConfig> = {}>(): ConfigBuilder<T> {
        return new ConfigBuilder<T>({} as Partial<BuildableConfig>);
    }

    withHost(host: string): ConfigBuilder<T & { host: string }> {
        return new ConfigBuilder({ ...this.config, host });
    }

    withPort(port: number): ConfigBuilder<T & { port: number }> {
        return new ConfigBuilder({ ...this.config, port });
    }

    withSecure(secure: boolean): ConfigBuilder<T & { secure: boolean }> {
        return new ConfigBuilder({ ...this.config, secure });
    }

    withTimeout(timeout: number): ConfigBuilder<T & { timeout: number }> {
        return new ConfigBuilder({ ...this.config, timeout });
    }

    build(this: ConfigBuilder<BuildableConfig>): BuildableConfig {
        return this.config as BuildableConfig;
    }
}

const _config = ConfigBuilder.create().withHost('localhost').withPort(8080).withSecure(true).withTimeout(5000).build();

// ============================================================================
// Type-Safe Event Emitter
// ============================================================================

type AnyFn = (...args: unknown[]) => unknown;

class TypedEmitter<T extends Record<string, (...args: unknown[]) => unknown>> {
    private handlers = new Map<string, Set<(...args: unknown[]) => unknown>>();

    on<K extends keyof T>(event: K, handler: T[K]): () => void {
        const key = String(event);
        if (!this.handlers.has(key)) {
            this.handlers.set(key, new Set());
        }
        this.handlers.get(key)!.add(handler as (...args: unknown[]) => unknown);

        return () => {
            this.handlers.get(key)?.delete(handler as (...args: unknown[]) => unknown);
        };
    }

    emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): void {
        const key = String(event);
        this.handlers.get(key)?.forEach((h) => h(...args));
    }
}

// Define event handlers interface - used as TypedEmitter's type parameter
type AppEventHandlers = {
    userLoggedIn: (userId: string, timestamp: Date) => void;
    dataLoaded: (data: unknown[], source: string) => void;
    error: (error: Error) => void;
};

// TypedEmitter requires index signature matching all specific properties.
// Using unknown[] + void return for the catch-all index signature.
type AppEvents = AppEventHandlers & Record<string, (...args: unknown[]) => void>;

const emitter = new TypedEmitter<AppEvents>();

const unsubscribe = emitter.on('userLoggedIn', (userId, ts) => {
    console.log(`User ${userId} logged in at ${ts.toISOString()}`);
});

emitter.emit('userLoggedIn', 'user-123', new Date());
unsubscribe(); // Clean removal

// ============================================================================
// Result Type with Railway-Oriented Programming
// ============================================================================

type ResultV2<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

function andThen<T, U, E>(result: ResultV2<T, E>, fn: (value: T) => ResultV2<U, E>): ResultV2<U, E> {
    if (!result.ok) return result as ResultV2<U, E>;
    return fn(result.value);
}

function map<T, U, E>(result: ResultV2<T, E>, fn: (value: T) => U): ResultV2<U, E> {
    if (!result.ok) return result as ResultV2<U, E>;
    return { ok: true, value: fn(result.value) };
}

function mapError<T, E, F>(result: ResultV2<T, E>, fn: (error: E) => F): ResultV2<T, F> {
    if (result.ok) return result;
    const err = result as Extract<ResultV2<T, E>, { ok: false }>;
    return { ok: false, error: fn(err.error) };
}

// Usage with chain
const step1: ResultV2<number, Error> = { ok: true, value: 10 };
andThen(step1, (v) => ({ ok: true, value: v * 2 }));

export {
    type Producer,
    type Consumer,
    type Processor,
    type ReadonlyRepository,
    type Validator,
    type AsyncReturnType,
    type ComponentProps,
    type Brand,
    type UserId,
    type OrderId,
    type Email,
    type PositiveInt,
    createUserId,
    createEmail,
    createPositiveInt,
    type DeepReadonly,
    type DeepPartial,
    type DeepRequired,
    type DeepNonNullable,
    type DeepFrozen,
    type MetadataMap,
    type MetadataFor,
    getDefault,
    type BuildableConfig,
    ConfigBuilder,
    type TypedEmitter,
    type ResultV2,
    andThen,
    map,
    mapError,
};
