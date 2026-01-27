/**
 * TypeScript Type Guards Examples
 *
 * Examples demonstrating type guards for narrowing types safely.
 */

// ============================================================================
// Built-in Type Guards
// ============================================================================

// typeof type guard
function process(value: string | number) {
  if (typeof value === 'string') {
    console.log(value.toUpperCase()); // Type: string
  } else {
    console.log(value.toFixed(2)); // Type: number
  }
}

// instanceof type guard
class Dog {
  bark() {
    console.log('Woof!');
  }
}

class Cat {
  meow() {
    console.log('Meow!');
  }
}

function pet(animal: Dog | Cat) {
  if (animal instanceof Dog) {
    animal.bark(); // Type: Dog
  } else {
    animal.meow(); // Type: Cat
  }
}

// in operator type guard
interface A {
  a: number;
}

interface B {
  b: string;
}

function processObj(obj: A | B) {
  if ('a' in obj) {
    console.log(obj.a); // Type: A
  } else {
    console.log(obj.b); // Type: B
  }
}

// ============================================================================
// User-Defined Type Guards
// ============================================================================

// Basic type guard
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

// Example usage of isString type guard
function processUnknown(value: unknown) {
  if (isString(value)) {
    console.log(value.toUpperCase()); // Type: string
  }
}

processUnknown('hello'); // Logs: HELLO

// Type guard with interface
interface User {
  id: string;
  name: string;
  email: string;
}

function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'email' in value &&
    typeof (value as User).id === 'string' &&
    typeof (value as User).name === 'string' &&
    typeof (value as User).email === 'string'
  );
}

// Example usage of isUser type guard
function processEntity(entity: unknown) {
  if (isUser(entity)) {
    console.log(entity.name); // Type: User
  }
}

processEntity({ id: '1', name: 'John', email: 'john@example.com' }); // Logs: John

// ============================================================================
// Discriminated Union Type Guards
// ============================================================================

type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };

function isSuccess<T>(result: Result<T, unknown>): result is { success: true; data: T } {
  return result.success;
}

function isError<E>(result: Result<unknown, E>): result is { success: false; error: E } {
  return !result.success;
}

// Example usage of Result type guards
function handleResult<T, E>(result: Result<T, E>): string {
  if (isSuccess(result)) {
    return `Success: ${JSON.stringify(result.data)}`;
  } else {
    return `Error: ${JSON.stringify(result.error)}`;
  }
}

const result: Result<number, string> = { success: true, data: 42 };
console.log(handleResult(result)); // Success: 42

// ============================================================================
// Array Type Guards
// ============================================================================

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

// Example usage of isStringArray type guard
function processArray(value: unknown) {
  if (isStringArray(value)) {
    value.forEach(s => console.log(s.toUpperCase()));
  }
}

processArray(['hello', 'world']); // Logs: HELLO WORLD

// ============================================================================
// Assertion Functions
// ============================================================================

// asserts keyword
function assertIsDefined<T>(value: T): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error('Value is not defined');
  }
}

// Example usage of assertIsDefined
function processDefined(value: string | undefined) {
  assertIsDefined(value);
  console.log(value.toUpperCase()); // Type: string (not undefined)
}

processDefined('hello'); // Logs: HELLO

// asserts for specific types
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error('Value is not a string');
  }
}

// Example usage of assertIsString
function toUpperCase(value: unknown): string {
  assertIsString(value);
  return value.toUpperCase();
}

console.log(toUpperCase('hello')); // HELLO

// ============================================================================
// Predicate Functions
// ============================================================================

type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number }
  | { kind: 'rectangle'; width: number; height: number };

function isCircle(shape: Shape): shape is { kind: 'circle'; radius: number } {
  return shape.kind === 'circle';
}

function isSquare(shape: Shape): shape is { kind: 'square'; side: number } {
  return shape.kind === 'square';
}

function isRectangle(shape: Shape): shape is { kind: 'rectangle'; width: number; height: number } {
  return shape.kind === 'rectangle';
}

function calculateArea(shape: Shape): number {
  if (isCircle(shape)) {
    return Math.PI * shape.radius ** 2;
  }
  if (isSquare(shape)) {
    return shape.side ** 2;
  }
  if (isRectangle(shape)) {
    return shape.width * shape.height;
  }
  // Should never reach here
  return 0;
}

// ============================================================================
// Type Guard Composition
// ============================================================================

interface Fish {
  swim: () => void;
  layEggs: () => void;
}

interface Bird {
  fly: () => void;
  layEggs: () => void;
}

function isFish(pet: Fish | Bird): pet is Fish {
  return 'swim' in pet;
}

function isBird(pet: Fish | Bird): pet is Bird {
  return 'fly' in pet;
}

function move(pet: Fish | Bird) {
  if (isFish(pet)) {
    pet.swim();
  } else if (isBird(pet)) {
    pet.fly();
  }
}

// Both can lay eggs
function layEgg(pet: Fish | Bird) {
  pet.layEggs();
}

// Example usage
const fish: Fish = {
  swim: () => console.log('Swimming'),
  layEggs: () => console.log('Laying fish eggs')
};
layEgg(fish); // Logs: Laying fish eggs

// ============================================================================
// Generic Type Guards
// ============================================================================

function hasProperty<K extends PropertyKey>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return typeof obj === 'object' && obj !== null && key in obj;
}

function getProperty<T>(obj: unknown, key: string, defaultValue: T): T {
  if (hasProperty(obj, key)) {
    const value = obj[key];
    if (typeof value === typeof defaultValue) {
      return value as T;
    }
  }
  return defaultValue;
}

// ============================================================================
// Null and Undefined Type Guards
// ============================================================================

function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

function isNotUndefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function isNotNullOrUndefined<T>(value: T | null | undefined): value is T {
  return value != null;
}

const values: (string | null | undefined)[] = ['hello', null, 'world', undefined];
const definedValues = values.filter(isNotNullOrUndefined);
// Type: string[]
console.log('Defined values:', definedValues); // ['hello', 'world']

// ============================================================================
// Class Type Guards
// ============================================================================

class Vehicle {
  move() {
    console.log('Moving...');
  }
}

class Car extends Vehicle {
  drive() {
    console.log('Driving...');
  }
}

class Boat extends Vehicle {
  sail() {
    console.log('Sailing...');
  }
}

function isCar(vehicle: Vehicle): vehicle is Car {
  return vehicle instanceof Car;
}

function isBoat(vehicle: Vehicle): vehicle is Boat {
  return vehicle instanceof Boat;
}

function operate(vehicle: Vehicle) {
  vehicle.move();
  if (isCar(vehicle)) {
    vehicle.drive();
  } else if (isBoat(vehicle)) {
    vehicle.sail();
  }
}

// ============================================================================
// Exhaustiveness Checking
// ============================================================================

type Color = 'red' | 'blue' | 'green';

function getColorHex(color: Color): string {
  switch (color) {
    case 'red':
      return '#FF0000';
    case 'blue':
      return '#0000FF';
    case 'green':
      return '#00FF00';
    default:
      const _exhaustive: never = color;
      return _exhaustive;
  }
}

// ============================================================================
// Type Guard Factory
// ============================================================================

function makeTypeGuard<T>(predicate: (value: unknown) => boolean): TypeGuard<unknown, T> {
  return predicate as TypeGuard<unknown, T>;
}

type TypeGuard<S, T extends S> = (value: S) => value is T;

const isNumber = makeTypeGuard<number>((value): value is number => {
  return typeof value === 'number';
});

// ============================================================================
// Union Type Guard
// ============================================================================

function isOneOf<T, U extends T>(value: T, ...values: U[]): value is U {
  return values.some(v => v === value);
}

function processStatus(status: string) {
  if (isOneOf(status, 'pending', 'processing', 'completed')) {
    // Type: 'pending' | 'processing' | 'completed'
    console.log(status);
  }
}

// ============================================================================
// Branding with Type Guards
// ============================================================================

type Brand<T, B> = T & { __brand: B };

type UserId = Brand<string, 'UserId'>;
type EmailAddress = Brand<string, 'EmailAddress'>;

function isUserId(value: string): value is UserId {
  return value.startsWith('user-');
}

function isEmailAddress(value: string): value is EmailAddress {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function processIdentifier(value: string) {
  if (isUserId(value)) {
    console.log('User ID:', value);
  } else if (isEmailAddress(value)) {
    console.log('Email:', value);
  }
}

// ============================================================================
// Type Guard with Validation
// ============================================================================

interface ValidatedUser {
  id: string;
  name: string;
  email: string;
  age: number;
}

function validateUser(user: unknown): user is ValidatedUser {
  if (typeof user !== 'object' || user === null) {
    return false;
  }

  const u = user as Partial<ValidatedUser>;

  return (
    typeof u.id === 'string' &&
    u.id.length > 0 &&
    typeof u.name === 'string' &&
    u.name.length > 0 &&
    typeof u.email === 'string' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email) &&
    typeof u.age === 'number' &&
    u.age >= 0 &&
    u.age <= 150
  );
}

// ============================================================================
// Async Type Guard
// ============================================================================

async function isValidUser(id: string): Promise<boolean> {
  // Simulate API check
  return id.startsWith('valid-');
}

async function processUser(id: string): Promise<void> {
  if (await isValidUser(id)) {
    console.log('Valid user:', id);
  } else {
    console.log('Invalid user:', id);
  }
}

export {
  process,
  pet,
  processObj,
  isString,
  isUser,
  isSuccess,
  isError,
  isStringArray,
  assertIsDefined,
  assertIsString,
  isCircle,
  isSquare,
  isRectangle,
  calculateArea,
  isFish,
  isBird,
  move,
  hasProperty,
  getProperty,
  isNotNull,
  isNotUndefined,
  isNotNullOrUndefined,
  isCar,
  isBoat,
  operate,
  getColorHex,
  makeTypeGuard,
  isNumber,
  isOneOf,
  processStatus,
  isUserId,
  isEmailAddress,
  processIdentifier,
  validateUser,
  isValidUser,
  processUser
};
