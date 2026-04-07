/**
 * fs.ts — unit tests
 */

import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { isFile, isDirectory, getFileSize, isEmptyFile, ensureDirectory } from "./fs";

const TEST_DIR = "/tmp/rd3-fs-test";

describe("fs utils", () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe("isFile", () => {
    it("returns true for existing file", () => {
      writeFileSync(`${TEST_DIR}/file.txt`, "hello");
      expect(isFile(`${TEST_DIR}/file.txt`)).toBe(true);
    });

    it("returns false for directory", () => {
      expect(isFile(TEST_DIR)).toBe(false);
    });

    it("returns false for non-existent path", () => {
      expect(isFile(`${TEST_DIR}/does-not-exist`)).toBe(false);
    });
  });

  describe("isDirectory", () => {
    it("returns true for existing directory", () => {
      expect(isDirectory(TEST_DIR)).toBe(true);
    });

    it("returns false for file", () => {
      writeFileSync(`${TEST_DIR}/file.txt`, "hello");
      expect(isDirectory(`${TEST_DIR}/file.txt`)).toBe(false);
    });

    it("returns false for non-existent path", () => {
      expect(isDirectory(`${TEST_DIR}/does-not-exist`)).toBe(false);
    });
  });

  describe("getFileSize", () => {
    it("returns correct size", () => {
      writeFileSync(`${TEST_DIR}/file.txt`, "hello world");
      expect(getFileSize(`${TEST_DIR}/file.txt`)).toBe(11);
    });

    it("returns 0 for non-existent path", () => {
      expect(getFileSize(`${TEST_DIR}/does-not-exist`)).toBe(0);
    });
  });

  describe("isEmptyFile", () => {
    it("returns true for empty file", () => {
      writeFileSync(`${TEST_DIR}/empty.txt`, "");
      expect(isEmptyFile(`${TEST_DIR}/empty.txt`)).toBe(true);
    });

    it("returns false for non-empty file", () => {
      writeFileSync(`${TEST_DIR}/file.txt`, "hello");
      expect(isEmptyFile(`${TEST_DIR}/file.txt`)).toBe(false);
    });

    it("returns true for non-existent path (size=0)", () => {
      expect(isEmptyFile(`${TEST_DIR}/does-not-exist`)).toBe(true);
    });
  });

  describe("ensureDirectory", () => {
    it("creates directory", () => {
      const nested = `${TEST_DIR}/nested/deep`;
      ensureDirectory(nested);
      expect(isDirectory(nested)).toBe(true);
    });

    it("does not throw on existing directory", () => {
      ensureDirectory(TEST_DIR);
      expect(isDirectory(TEST_DIR)).toBe(true);
    });
  });
});
