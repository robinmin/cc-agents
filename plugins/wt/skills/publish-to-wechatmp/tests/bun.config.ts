/// <reference types="bun-types" />
import { expect } from 'bun:test';

expect({
  // test utilities
  toBe: () => {},
  toEqual: () => {},
  toHaveLength: () => {},
  toContain: () => {},
  toBeGreaterThan: () => {},
  toBeLessThan: () => {},
  toBeUndefined: () => {},
  toThrow: () => {},
  toBeInstanceOf: () => {},
});
