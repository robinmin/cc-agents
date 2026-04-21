/**
 * TypeScript Type Guards — Modern Patterns
 *
 * Advanced type narrowing patterns including branded types,
 * discriminated unions, and type predicates.
 */

// ============================================================================
// Branded Type Guards (Domain Modeling)
// ============================================================================

type Brand<T, B extends string> = T & { readonly __brand: B };
type UserId = Brand<string, 'UserId'>;
type Email = Brand<string, 'Email'>;

const userIdBrand = Symbol('UserId');
const emailBrand = Symbol('Email');

function isValidUserId(id: string): id is UserId {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function isValidEmail(email: string): email is Email {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function asUserId(id: string): UserId {
    if (!isValidUserId(id)) throw new Error(`Invalid UserId: ${id}`);
    return id as UserId;
}

function asEmail(email: string): Email {
    if (!isValidEmail(email)) throw new Error(`Invalid Email: ${email}`);
    return email as Email;
}

// ============================================================================
// Discriminated Union Guards
// ============================================================================

type Shape =
    | { readonly kind: 'circle'; readonly radius: number }
    | { readonly kind: 'rectangle'; readonly width: number; readonly height: number }
    | { readonly kind: 'triangle'; readonly base: number; readonly height: number };

function isCircle(shape: Shape): shape is Extract<Shape, { kind: 'circle' }> {
    return shape.kind === 'circle';
}

function isRectangle(shape: Shape): shape is Extract<Shape, { kind: 'rectangle' }> {
    return shape.kind === 'rectangle';
}

function getArea(shape: Shape): number {
    if (isCircle(shape)) return Math.PI * shape.radius ** 2;
    if (isRectangle(shape)) return shape.width * shape.height;
    return (shape.base * shape.height) / 2;
}

// ============================================================================
// Unknown / any Narrowing
// ============================================================================

function isNonNull<T>(value: T): value is NonNullable<T> {
    return value !== null && value !== undefined;
}

function isString(value: unknown): value is string {
    return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
    return typeof value === 'number' && !Number.isNaN(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Object.prototype.toString.call(value) === '[object Object]';
}

function hasProperty<K extends string>(obj: unknown, key: K): obj is Record<K, unknown> {
    return isPlainObject(obj) && key in obj;
}

// ============================================================================
// Async Result Type Guards
// ============================================================================

type Result<T, E = Error> =
    | { readonly success: true; readonly value: T }
    | { readonly success: false; readonly error: E };

function isSuccess<T, E>(result: Result<T, E>): result is Extract<Result<T, E>, { success: true }> {
    return result.success;
}

function isFailure<T, E>(result: Result<T, E>): result is Extract<Result<T, E>, { success: false }> {
    return !result.success;
}

// ============================================================================
// Typed Error Class Guards
// ============================================================================

class ValidationError extends Error {
    constructor(
        message: string,
        public readonly field?: string,
    ) {
        super(message);
        this.name = 'ValidationError';
    }
}

class NotFoundError extends Error {
    constructor(
        message: string,
        public readonly resource: string,
        public readonly id?: string,
    ) {
        super(message);
        this.name = 'NotFoundError';
    }
}

function isValidationError(err: unknown): err is ValidationError {
    return err instanceof ValidationError;
}

function isNotFoundError(err: unknown): err is NotFoundError {
    return err instanceof NotFoundError;
}

function handleError(err: unknown): string {
    if (isValidationError(err)) return `Validation failed on field: ${err.field}`;
    if (isNotFoundError(err)) return `Resource not found: ${err.resource}`;
    if (err instanceof Error) return `Unexpected error: ${err.message}`;
    return 'Unknown error occurred';
}

// ============================================================================
// Parser/Validator Pattern
// ============================================================================

type ParseResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly errors: string[] };

type ParseFn<T> = (input: unknown) => ParseResult<T>;

class Parser<T> {
    constructor(private readonly fn: ParseFn<T>) {}

    static string(): Parser<string> {
        return new Parser<string>((input) => {
            if (typeof input === 'string') return { ok: true, value: input };
            return { ok: false, errors: [`Expected string, got ${typeof input}`] };
        });
    }

    static number(): Parser<number> {
        return new Parser<number>((input) => {
            if (typeof input === 'number' && !Number.isNaN(input)) return { ok: true, value: input };
            return { ok: false, errors: [`Expected number, got ${typeof input}`] };
        });
    }

    static boolean(): Parser<boolean> {
        return new Parser<boolean>((input) => {
            if (typeof input === 'boolean') return { ok: true, value: input };
            return { ok: false, errors: [`Expected boolean, got ${typeof input}`] };
        });
    }

    static object<T extends Record<string, Parser<any>>>(
        parsers: T,
    ): Parser<{ [K in keyof T]: T[K] extends Parser<infer V> ? V : never }> {
        return new Parser((input) => {
            if (!isPlainObject(input)) return { ok: false, errors: ['Expected object'] };

            const errors: string[] = [];
            const result = {} as any;

            for (const [key, parser] of Object.entries(parsers)) {
                const parsed = parser.fn((input as any)[key]);
                if (parsed.ok) {
                    result[key] = parsed.value;
                } else {
                    const failure = parsed as Extract<ParseResult<any>, { ok: false }>;
                    errors.push(...failure.errors.map((e: string) => `${key}: ${e}`));
                }
            }

            return errors.length > 0 ? { ok: false, errors } : { ok: true, value: result };
        });
    }

    run(input: unknown): ParseResult<T> {
        return this.fn(input);
    }
}

// Usage
const userParser = Parser.object({
    name: Parser.string(),
    age: Parser.number(),
});

const result = userParser.run({ name: 'Alice', age: 30 });
if (result.ok) {
    console.log(result.value.name); // string
}

// ============================================================================
// Type Guard Combinators
// ============================================================================

function and<T>(...guards: Array<(value: T) => boolean>): (value: T) => boolean {
    return (value) => guards.every((guard) => guard(value));
}

function or<T>(...guards: Array<(value: T) => boolean>): (value: T) => boolean {
    return (value) => guards.some((guard) => guard(value));
}

function not<T>(guard: (value: T) => boolean): (value: T) => boolean {
    return (value) => !guard(value);
}

// Example: valid username = alphanumeric + length check
const isAlphanumeric = (s: string) => /^[a-z0-9]+$/i.test(s);
const hasMinLength = (min: number) => (s: string) => s.length >= min;
const hasMaxLength = (max: number) => (s: string) => s.length <= max;

const isValidUsername = and(isString, hasMinLength(3), hasMaxLength(20), isAlphanumeric);

function isValidUsernameTyped(value: unknown): value is string {
    return isValidUsername(value as string);
}

export {
    type Brand,
    type UserId,
    type Email,
    isValidUserId,
    isValidEmail,
    asUserId,
    asEmail,
    type Shape,
    isCircle,
    isRectangle,
    getArea,
    isNonNull,
    isString,
    isNumber,
    isPlainObject,
    hasProperty,
    type Result,
    isSuccess,
    isFailure,
    ValidationError,
    NotFoundError,
    isValidationError,
    isNotFoundError,
    handleError,
    type ParseResult,
    Parser,
    and,
    or,
    not,
    isAlphanumeric,
    hasMinLength,
    hasMaxLength,
    isValidUsername,
    isValidUsernameTyped,
};
