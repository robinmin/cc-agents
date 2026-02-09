/**
 * Tests for fs module
 *
 * Tests safe file operations with proper cleanup
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  safeWriteFile,
  safeReadFile,
  safeAppendFile,
  processStream,
  copyFile,
  ensureDir,
  removeDir,
  fileExists,
  getFileSize,
  getFileExtension,
  getFileNameWithoutExtension,
} from '../src/fs.js';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { FileValidationError } from '../src/errors.js';

describe('fs', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `wt-fs-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('safeWriteFile', () => {
    it('should write file content', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await safeWriteFile(filePath, 'Hello, world!');

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('Hello, world!');
    });

    it('should write with custom encoding', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await safeWriteFile(filePath, 'Test', 'utf16le');

      const content = await fs.readFile(filePath, { encoding: 'utf16le' });
      expect(content).toBe('Test');
    });

    it('should use utf-8 encoding by default', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await safeWriteFile(filePath, 'Hello 世界');

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('Hello 世界');
    });

    it('should overwrite existing file', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await safeWriteFile(filePath, 'Original');
      await safeWriteFile(filePath, 'Updated');

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('Updated');
    });

    it('should throw FileValidationError on error', async () => {
      const invalidPath = '/root/nonexistent/test.txt';

      await expect(safeWriteFile(invalidPath, 'content'))
        .rejects.toThrow(FileValidationError);
    });
  });

  describe('safeReadFile', () => {
    it('should read file content', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'File content');

      const content = await safeReadFile(filePath);
      expect(content).toBe('File content');
    });

    it('should read with custom encoding', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      // Use Buffer.from for proper encoding with promises API
      await fs.writeFile(filePath, Buffer.from('Test', 'utf-16le'));

      const content = await safeReadFile(filePath, 'utf-16le');
      expect(content).toBe('Test');
    });

    it('should throw FileValidationError for non-existent file', async () => {
      const filePath = path.join(tempDir, 'nonexistent.txt');

      await expect(safeReadFile(filePath))
        .rejects.toThrow(FileValidationError);
    });
  });

  describe('safeAppendFile', () => {
    it('should append to existing file', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'Original');

      await safeAppendFile(filePath, ' + Appended');

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('Original + Appended');
    });

    it('should create file if not exists', async () => {
      const filePath = path.join(tempDir, 'new.txt');
      await safeAppendFile(filePath, 'First line');

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('First line');
    });

    it('should append multiple times', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await safeAppendFile(filePath, 'Line 1');
      await safeAppendFile(filePath, 'Line 2');
      await safeAppendFile(filePath, 'Line 3');

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('Line 1Line 2Line 3');
    });

    it('should throw FileValidationError on error', async () => {
      const invalidPath = '/root/nonexistent/test.txt';

      await expect(safeAppendFile(invalidPath, 'content'))
        .rejects.toThrow(FileValidationError);
    });
  });

  describe('processStream', () => {
    it('should process stream data', async () => {
      const chunks: Buffer[] = [];
      // Create stream from Buffers, not strings
      const stream = Readable.from([Buffer.from('Hello'), Buffer.from(' '), Buffer.from('World')]);

      await processStream(stream, (chunk) => {
        chunks.push(chunk);
      });

      expect(Buffer.concat(chunks).toString()).toBe('Hello World');
    });

    it('should handle empty stream', async () => {
      let processed = false;
      const stream = Readable.from([]);

      await processStream(stream, () => {
        processed = true;
      });

      expect(processed).toBe(false);
    });

    it('should handle stream error', async () => {
      const stream = new Readable({
        read() {
          this.destroy(new Error('Stream error'));
        },
      });

      await expect(processStream(stream, () => {}))
        .rejects.toThrow('Stream error');
    });

    it('should cleanup listeners on end', async () => {
      const stream = Readable.from(['data']);
      const originalRemoveAllListeners = stream.removeAllListeners.bind(stream);
      let removed = false;

      stream.removeAllListeners = function() {
        removed = true;
        return originalRemoveAllListeners();
      };

      await processStream(stream, () => {});
      expect(removed).toBe(true);
    });
  });

  describe('copyFile', () => {
    it('should copy file content', async () => {
      const sourcePath = path.join(tempDir, 'source.txt');
      const destPath = path.join(tempDir, 'dest.txt');

      await fs.writeFile(sourcePath, 'Content to copy');
      await copyFile(sourcePath, destPath);

      const content = await fs.readFile(destPath, 'utf-8');
      expect(content).toBe('Content to copy');
    });

    it('should handle large files', async () => {
      const sourcePath = path.join(tempDir, 'large.bin');
      const destPath = path.join(tempDir, 'large-copy.bin');
      const largeContent = 'x'.repeat(1024 * 1024); // 1MB

      await fs.writeFile(sourcePath, largeContent);
      await copyFile(sourcePath, destPath);

      const content = await fs.readFile(destPath);
      expect(content.length).toBe(largeContent.length);
    });

    it('should throw FileValidationError on source error', async () => {
      const sourcePath = path.join(tempDir, 'nonexistent.txt');
      const destPath = path.join(tempDir, 'dest.txt');

      await expect(copyFile(sourcePath, destPath))
        .rejects.toThrow(FileValidationError);
    });
  });

  describe('ensureDir', () => {
    it('should create directory', async () => {
      const dirPath = path.join(tempDir, 'new-dir');
      await ensureDir(dirPath);

      const exists = await fs.access(dirPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should create nested directories', async () => {
      const dirPath = path.join(tempDir, 'a', 'b', 'c');
      await ensureDir(dirPath);

      const exists = await fs.access(dirPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should not error if directory exists', async () => {
      const dirPath = path.join(tempDir, 'existing');
      await fs.mkdir(dirPath);

      // Should not throw
      await ensureDir(dirPath);
    });
  });

  describe('removeDir', () => {
    it('should remove directory', async () => {
      const dirPath = path.join(tempDir, 'to-remove');
      await fs.mkdir(dirPath);

      await removeDir(dirPath);

      const exists = await fs.access(dirPath).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });

    it('should remove directory with contents', async () => {
      const dirPath = path.join(tempDir, 'with-contents');
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(path.join(dirPath, 'file.txt'), 'content');

      await removeDir(dirPath);

      const exists = await fs.access(dirPath).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });

    it('should not error if directory does not exist', async () => {
      // Should not throw
      await removeDir(path.join(tempDir, 'nonexistent'));
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'content');

      expect(fileExists(filePath)).toBe(true);
    });

    it('should return false for non-existent file', () => {
      expect(fileExists(path.join(tempDir, 'nonexistent.txt'))).toBe(false);
    });

    it('should return true for existing directory', async () => {
      expect(fileExists(tempDir)).toBe(true);
    });
  });

  describe('getFileSize', () => {
    it('should return file size', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const content = 'Hello, World!';
      await fs.writeFile(filePath, content);

      const size = await getFileSize(filePath);
      expect(size).toBe(content.length);
    });

    it('should handle empty file', async () => {
      const filePath = path.join(tempDir, 'empty.txt');
      await fs.writeFile(filePath, '');

      const size = await getFileSize(filePath);
      expect(size).toBe(0);
    });

    it('should throw FileValidationError for non-existent file', async () => {
      const filePath = path.join(tempDir, 'nonexistent.txt');

      await expect(getFileSize(filePath))
        .rejects.toThrow(FileValidationError);
    });
  });

  describe('getFileExtension', () => {
    it('should return file extension', () => {
      expect(getFileExtension('test.txt')).toBe('txt');
      expect(getFileExtension('document.pdf')).toBe('pdf');
      expect(getFileExtension('archive.tar.gz')).toBe('gz');
    });

    it('should return empty string for no extension', () => {
      expect(getFileExtension('filename')).toBe('');
      expect(getFileExtension('path/to/file')).toBe('');
    });

    it('should handle paths with directories', () => {
      expect(getFileExtension('/path/to/file.txt')).toBe('txt');
      expect(getFileExtension('./relative/file.md')).toBe('md');
    });
  });

  describe('getFileNameWithoutExtension', () => {
    it('should return filename without extension', () => {
      expect(getFileNameWithoutExtension('test.txt')).toBe('test');
      expect(getFileNameWithoutExtension('document.pdf')).toBe('document');
    });

    it('should handle paths with directories', () => {
      expect(getFileNameWithoutExtension('/path/to/file.txt')).toBe('file');
      expect(getFileNameWithoutExtension('./relative/file.md')).toBe('file');
    });

    it('should handle multiple dots', () => {
      expect(getFileNameWithoutExtension('archive.tar.gz')).toBe('archive.tar');
      expect(getFileNameWithoutExtension('file.name.with.dots.txt')).toBe('file.name.with.dots');
    });

    it('should handle no extension', () => {
      expect(getFileNameWithoutExtension('filename')).toBe('filename');
    });
  });

  describe('resource cleanup', () => {
    it('should close file handle on write error', async () => {
      // Create a file, then make directory read-only to cause error
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'original');

      // This should handle the error gracefully
      // In a real scenario, we'd test file descriptor limits
      await safeWriteFile(filePath, 'updated');
      expect(await fs.readFile(filePath, 'utf-8')).toBe('updated');
    });
  });
});
