/**
 * Tests for constants module
 *
 * Tests configuration constants and environment variable helpers
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  DEFAULT_NETWORK_TIMEOUT,
  DEFAULT_WAIT_TIMEOUT,
  DEFAULT_NAVIGATION_TIMEOUT,
  DEFAULT_CDP_TIMEOUT,
  DEFAULT_VIDEO_UPLOAD_TIMEOUT,
  DEFAULT_LOGIN_TIMEOUT,
  DEFAULT_RETRY_COUNT,
  DEFAULT_RETRY_DELAY,
  DEFAULT_RETRY_BACKOFF_MULTIPLIER,
  DEFAULT_DOWNLOAD_CHUNK_SIZE,
  DEFAULT_MAX_FILE_SIZE,
  DEFAULT_IMAGE_UPLOAD_TIMEOUT,
  DEFAULT_VIEWPORT_WIDTH,
  DEFAULT_VIEWPORT_HEIGHT,
  DEFAULT_SLOW_MO,
  USER_AGENTS,
  VALID_THEMES,
  VALID_IMAGE_FORMATS,
  VALID_VIDEO_FORMATS,
  getTimeoutFromEnv,
  getBooleanFromEnv,
} from '../src/constants.js';

describe('constants', () => {
  describe('Timeout Constants', () => {
    it('should have correct network timeout', () => {
      expect(DEFAULT_NETWORK_TIMEOUT).toBe(30000);
    });

    it('should have correct wait timeout', () => {
      expect(DEFAULT_WAIT_TIMEOUT).toBe(10000);
    });

    it('should have correct navigation timeout', () => {
      expect(DEFAULT_NAVIGATION_TIMEOUT).toBe(60000);
    });

    it('should have correct CDP timeout', () => {
      expect(DEFAULT_CDP_TIMEOUT).toBe(30000);
    });

    it('should have correct video upload timeout', () => {
      expect(DEFAULT_VIDEO_UPLOAD_TIMEOUT).toBe(180000);
    });

    it('should have correct login timeout', () => {
      expect(DEFAULT_LOGIN_TIMEOUT).toBe(300000);
    });
  });

  describe('Retry Configuration', () => {
    it('should have correct retry count', () => {
      expect(DEFAULT_RETRY_COUNT).toBe(3);
    });

    it('should have correct retry delay', () => {
      expect(DEFAULT_RETRY_DELAY).toBe(1000);
    });

    it('should have correct backoff multiplier', () => {
      expect(DEFAULT_RETRY_BACKOFF_MULTIPLIER).toBe(2);
    });
  });

  describe('File Operation Constants', () => {
    it('should have correct download chunk size', () => {
      expect(DEFAULT_DOWNLOAD_CHUNK_SIZE).toBe(64 * 1024);
    });

    it('should have correct max file size', () => {
      expect(DEFAULT_MAX_FILE_SIZE).toBe(50 * 1024 * 1024);
    });

    it('should have correct image upload timeout', () => {
      expect(DEFAULT_IMAGE_UPLOAD_TIMEOUT).toBe(10000);
    });
  });

  describe('Browser Configuration', () => {
    it('should have correct viewport width', () => {
      expect(DEFAULT_VIEWPORT_WIDTH).toBe(1280);
    });

    it('should have correct viewport height', () => {
      expect(DEFAULT_VIEWPORT_HEIGHT).toBe(900);
    });

    it('should have correct slowMo setting', () => {
      expect(DEFAULT_SLOW_MO).toBe(100);
    });
  });

  describe('User Agents', () => {
    it('should have DEFAULT user agent', () => {
      expect(USER_AGENTS.DEFAULT).toBeTruthy();
      expect(USER_AGENTS.DEFAULT).toContain('Chrome');
    });

    it('should have CHROME user agent', () => {
      expect(USER_AGENTS.CHROME).toBeTruthy();
      expect(USER_AGENTS.CHROME).toContain('Chrome');
    });

    it('should have SAFARI user agent', () => {
      expect(USER_AGENTS.SAFARI).toBeTruthy();
      expect(USER_AGENTS.SAFARI).toContain('Safari');
    });
  });

  describe('Valid Formats', () => {
    it('should have valid themes', () => {
      expect(VALID_THEMES).toEqual(['default', 'grace', 'simple']);
    });

    it('should have valid image formats', () => {
      expect(VALID_IMAGE_FORMATS).toEqual(['png', 'jpg', 'jpeg', 'gif', 'webp']);
    });

    it('should have valid video formats', () => {
      expect(VALID_VIDEO_FORMATS).toEqual(['mp4', 'mov', 'webm']);
    });
  });

  describe('getTimeoutFromEnv', () => {
    let originalEnv: Record<string, string | undefined>;

    beforeEach(() => {
      originalEnv = { ...process.env };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return default value when env var is not set', () => {
      delete process.env.TEST_TIMEOUT;
      expect(getTimeoutFromEnv('TEST_TIMEOUT', 5000)).toBe(5000);
    });

    it('should return parsed value from env var', () => {
      process.env.TEST_TIMEOUT = '10000';
      expect(getTimeoutFromEnv('TEST_TIMEOUT', 5000)).toBe(10000);
    });

    it('should return default value when env var is NaN', () => {
      process.env.TEST_TIMEOUT = 'not-a-number';
      expect(getTimeoutFromEnv('TEST_TIMEOUT', 5000)).toBe(5000);
    });

    it('should handle zero value', () => {
      process.env.TEST_TIMEOUT = '0';
      expect(getTimeoutFromEnv('TEST_TIMEOUT', 5000)).toBe(0);
    });

    it('should handle negative values', () => {
      process.env.TEST_TIMEOUT = '-1000';
      expect(getTimeoutFromEnv('TEST_TIMEOUT', 5000)).toBe(-1000);
    });
  });

  describe('getBooleanFromEnv', () => {
    let originalEnv: Record<string, string | undefined>;

    beforeEach(() => {
      originalEnv = { ...process.env };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return default value when env var is not set', () => {
      delete process.env.TEST_BOOL;
      expect(getBooleanFromEnv('TEST_BOOL', false)).toBe(false);
      expect(getBooleanFromEnv('TEST_BOOL', true)).toBe(true);
    });

    it('should return true for "true" string', () => {
      process.env.TEST_BOOL = 'true';
      expect(getBooleanFromEnv('TEST_BOOL', false)).toBe(true);
    });

    it('should return true for "1" string', () => {
      process.env.TEST_BOOL = '1';
      expect(getBooleanFromEnv('TEST_BOOL', false)).toBe(true);
    });

    it('should return true for "TRUE" (case insensitive)', () => {
      process.env.TEST_BOOL = 'TRUE';
      expect(getBooleanFromEnv('TEST_BOOL', false)).toBe(true);
    });

    it('should return false for other values', () => {
      process.env.TEST_BOOL = 'false';
      expect(getBooleanFromEnv('TEST_BOOL', true)).toBe(false);

      process.env.TEST_BOOL = '0';
      expect(getBooleanFromEnv('TEST_BOOL', true)).toBe(false);

      process.env.TEST_BOOL = 'random';
      expect(getBooleanFromEnv('TEST_BOOL', true)).toBe(false);
    });
  });
});
