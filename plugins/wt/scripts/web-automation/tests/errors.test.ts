/**
 * Tests for errors module
 *
 * Tests custom error types with error codes
 */

import { describe, it, expect } from 'bun:test';
import {
  WtAutomationError,
  NetworkError,
  NetworkTimeoutError,
  ElementNotFoundError,
  TimeoutError,
  BrowserLaunchError,
  ValidationError,
  UrlValidationError,
  FileValidationError,
  AuthenticationError,
  LoginTimeoutError,
  UploadError,
  FileSizeError,
  FileFormatError,
  isWtAutomationError,
  getErrorCode,
  getErrorContext,
  wrapError,
} from '../src/errors.js';

describe('errors', () => {
  describe('WtAutomationError', () => {
    it('should create base error with message and code', () => {
      const error = new WtAutomationError('Test error', 'TEST_CODE');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('WtAutomationError');
      expect(error.context).toBeUndefined();
    });

    it('should create error with context', () => {
      const context = { url: 'https://example.com', attempt: 3 };
      const error = new WtAutomationError('Test error', 'TEST_CODE', context);
      expect(error.context).toEqual(context);
    });

    it('should have stack trace', () => {
      const error = new WtAutomationError('Test error', 'TEST_CODE');
      expect(error.stack).toBeTruthy();
    });

    it('should serialize to JSON', () => {
      const context = { url: 'https://example.com' };
      const error = new WtAutomationError('Test error', 'TEST_CODE', context);
      const json = error.toJSON();

      expect(json.name).toBe('WtAutomationError');
      expect(json.message).toBe('Test error');
      expect(json.code).toBe('TEST_CODE');
      expect(json.context).toEqual(context);
      expect(json.stack).toBeTruthy();
    });
  });

  describe('NetworkError', () => {
    it('should create error with status code', () => {
      const error = new NetworkError('Request failed', 404);
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Request failed');
    });

    it('should create error without status code', () => {
      const error = new NetworkError('Request failed');
      expect(error.statusCode).toBeUndefined();
    });

    it('should include context', () => {
      const error = new NetworkError('Request failed', 500, { url: 'https://example.com' });
      expect(error.context?.url).toBe('https://example.com');
      expect(error.context?.statusCode).toBe(500);
    });
  });

  describe('NetworkTimeoutError', () => {
    it('should create timeout error with correct code', () => {
      const error = new NetworkTimeoutError('Request timed out', 5000);
      expect(error.code).toBe('NETWORK_TIMEOUT');
      expect(error.timeoutMs).toBe(5000);
      expect(error.message).toBe('Request timed out');
    });

    it('should include timeout in context', () => {
      const error = new NetworkTimeoutError('Timed out', 10000);
      expect(error.context?.timeoutMs).toBe(10000);
    });

    it('should not have statusCode', () => {
      const error = new NetworkTimeoutError('Timed out', 5000);
      expect(error.statusCode).toBeUndefined();
    });
  });

  describe('ElementNotFoundError', () => {
    it('should create error with selector', () => {
      const error = new ElementNotFoundError('Element not found', '#my-element');
      expect(error.code).toBe('ELEMENT_NOT_FOUND');
      expect(error.selector).toBe('#my-element');
    });

    it('should include selector in context', () => {
      const error = new ElementNotFoundError('Not found', '.my-class');
      expect(error.context?.selector).toBe('.my-class');
    });
  });

  describe('TimeoutError', () => {
    it('should create timeout error', () => {
      const error = new TimeoutError('Operation timed out', 10000);
      expect(error.code).toBe('TIMEOUT');
      expect(error.timeoutMs).toBe(10000);
    });
  });

  describe('BrowserLaunchError', () => {
    it('should create error with executable path', () => {
      const error = new BrowserLaunchError('Browser failed to launch', '/path/to/chrome');
      expect(error.code).toBe('BROWSER_LAUNCH_ERROR');
      expect(error.executablePath).toBe('/path/to/chrome');
    });

    it('should create error without executable path', () => {
      const error = new BrowserLaunchError('Browser failed to launch');
      expect(error.executablePath).toBeUndefined();
    });
  });

  describe('ValidationError', () => {
    it('should create error with field name', () => {
      const error = new ValidationError('Invalid value', 'username');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.field).toBe('username');
    });

    it('should include invalid value', () => {
      const error = new ValidationError('Invalid value', 'email', 'not-an-email');
      expect(error.value).toBe('not-an-email');
    });
  });

  describe('UrlValidationError', () => {
    it('should create error with correct code', () => {
      const error = new UrlValidationError('not-a-url', 'Invalid format');
      expect(error.code).toBe('INVALID_URL');
      expect(error.field).toBe('url');
    });

    it('should use default reason', () => {
      const error = new UrlValidationError('bad-url');
      expect(error.message).toContain('Invalid URL: bad-url');
    });
  });

  describe('FileValidationError', () => {
    it('should create error with correct code', () => {
      const error = new FileValidationError('/path/to/file.txt', 'File too large');
      expect(error.code).toBe('INVALID_FILE');
      expect(error.field).toBe('file');
    });

    it('should use default reason', () => {
      const error = new FileValidationError('/path/to/file');
      expect(error.message).toContain('Invalid file: /path/to/file');
    });
  });

  describe('AuthenticationError', () => {
    it('should create error with default message', () => {
      const error = new AuthenticationError();
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.message).toBe('Authentication required');
    });

    it('should create error with custom message', () => {
      const error = new AuthenticationError('Login failed');
      expect(error.message).toBe('Login failed');
    });
  });

  describe('LoginTimeoutError', () => {
    it('should create timeout error with correct code', () => {
      const error = new LoginTimeoutError(300000);
      expect(error.code).toBe('LOGIN_TIMEOUT');
      expect(error.timeoutMs).toBe(300000);
      expect(error.message).toContain('300000ms');
    });

    it('should extend AuthenticationError', () => {
      const error = new LoginTimeoutError(5000);
      expect(error).toBeInstanceOf(AuthenticationError);
    });
  });

  describe('UploadError', () => {
    it('should create error with file path', () => {
      const error = new UploadError('Upload failed', '/path/to/file.jpg');
      expect(error.code).toBe('UPLOAD_ERROR');
      expect(error.filePath).toBe('/path/to/file.jpg');
    });

    it('should create error without file path', () => {
      const error = new UploadError('Upload failed');
      expect(error.filePath).toBeUndefined();
    });
  });

  describe('FileSizeError', () => {
    it('should create error with size information', () => {
      const error = new FileSizeError('/path/to/file.jpg', 5 * 1024 * 1024, 10 * 1024 * 1024);
      expect(error.code).toBe('FILE_TOO_LARGE');
      expect(error.maxSize).toBe(5 * 1024 * 1024);
      expect(error.actualSize).toBe(10 * 1024 * 1024);
    });

    it('should include sizes in message', () => {
      const error = new FileSizeError('/path/to/file.jpg', 1024 * 1024, 5 * 1024 * 1024);
      expect(error.message).toContain('5.00MB');
      expect(error.message).toContain('1.00MB');
    });

    it('should extend FileValidationError', () => {
      const error = new FileSizeError('/path', 1000, 2000);
      expect(error).toBeInstanceOf(FileValidationError);
    });
  });

  describe('FileFormatError', () => {
    it('should create error with allowed formats', () => {
      const error = new FileFormatError('/path/to/file.xyz', ['jpg', 'png', 'gif']);
      expect(error.code).toBe('INVALID_FORMAT');
      expect(error.allowedFormats).toEqual(['jpg', 'png', 'gif']);
    });

    it('should include format in message', () => {
      const error = new FileFormatError('/path/to/file.xyz', ['jpg', 'png']);
      expect(error.message).toContain('.xyz');
      expect(error.message).toContain('jpg, png');
    });
  });

  describe('isWtAutomationError', () => {
    it('should return true for WT automation errors', () => {
      const error = new NetworkError('Test', 500);
      expect(isWtAutomationError(error)).toBe(true);
    });

    it('should return true for subclasses', () => {
      const error = new NetworkTimeoutError('Test', 5000);
      expect(isWtAutomationError(error)).toBe(true);
    });

    it('should return false for generic errors', () => {
      const error = new Error('Generic error');
      expect(isWtAutomationError(error)).toBe(false);
    });

    it('should return false for non-errors', () => {
      expect(isWtAutomationError('string')).toBe(false);
      expect(isWtAutomationError(null)).toBe(false);
      expect(isWtAutomationError(undefined)).toBe(false);
    });
  });

  describe('getErrorCode', () => {
    it('should return error code for WT errors', () => {
      const error = new NetworkError('Test', 500);
      expect(getErrorCode(error)).toBe('NETWORK_ERROR');
    });

    it('should return UNKNOWN for generic errors', () => {
      const error = new Error('Generic error');
      expect(getErrorCode(error)).toBe('UNKNOWN');
    });

    it('should return UNKNOWN for non-errors', () => {
      expect(getErrorCode('string')).toBe('UNKNOWN');
      expect(getErrorCode(null)).toBe('UNKNOWN');
    });
  });

  describe('getErrorContext', () => {
    it('should return context for WT errors', () => {
      const context = { url: 'test' };
      const error = new WtAutomationError('Test', 'CODE', context);
      expect(getErrorContext(error)).toEqual(context);
    });

    it('should return undefined for errors without context', () => {
      const error = new WtAutomationError('Test', 'CODE');
      expect(getErrorContext(error)).toBeUndefined();
    });

    it('should return undefined for generic errors', () => {
      const error = new Error('Generic error');
      expect(getErrorContext(error)).toBeUndefined();
    });
  });

  describe('wrapError', () => {
    it('should return WT error unchanged', () => {
      const original = new NetworkError('Original', 500);
      const wrapped = wrapError(original, 'WRAPPED_CODE');
      expect(wrapped).toBe(original);
    });

    it('should wrap generic error', () => {
      const original = new Error('Original error');
      const wrapped = wrapError(original, 'WRAPPED_CODE');
      expect(wrapped).toBeInstanceOf(WtAutomationError);
      expect(wrapped.code).toBe('WRAPPED_CODE');
      expect(wrapped.message).toBe('Original error');
    });

    it('should wrap with custom message', () => {
      const original = new Error('Original error');
      const wrapped = wrapError(original, 'WRAPPED_CODE', 'New message');
      expect(wrapped.message).toBe('New message');
    });

    it('should include original error in context', () => {
      const original = new Error('Original error');
      const wrapped = wrapError(original, 'WRAPPED_CODE');
      expect(wrapped.context?.originalError).toBe('Original error');
      expect(wrapped.context?.originalStack).toBeTruthy();
    });

    it('should handle non-error objects', () => {
      const wrapped = wrapError('string error', 'WRAPPED_CODE');
      expect(wrapped.message).toBe('string error');
    });
  });
});
