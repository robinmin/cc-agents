/**
 * File system utilities with proper resource cleanup
 *
 * Provides safe file operations with automatic cleanup to prevent
 * file descriptor leaks. All operations ensure handles are closed
 * even when errors occur.
 */

import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import { createReadStream, createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { promisify } from 'node:util';
import { pipeline } from 'node:stream/promises';
import { FileValidationError } from './errors.js';

// ============================================================================
// Safe File Operations
// ============================================================================

/**
 * Safely write file with automatic cleanup
 *
 * Ensures file handle is closed even on error.
 *
 * @param filePath - Path to the file to write
 * @param content - Content to write
 * @param encoding - File encoding (default: utf-8)
 * @throws {FileValidationError} If file cannot be written
 *
 * @example
 * ```typescript
 * await safeWriteFile('/path/to/file.txt', 'Hello, world!', 'utf-8');
 * ```
 */
export async function safeWriteFile(
  filePath: string,
  content: string,
  encoding: BufferEncoding = 'utf-8'
): Promise<void> {
  let handle: fs.FileHandle | null = null;

  try {
    handle = await fs.open(filePath, 'w');
    // FileHandle.writeFile doesn't support encoding option, convert to Buffer first
    const buffer = Buffer.from(content, encoding);
    await handle.writeFile(buffer);
  } catch (err) {
    throw new FileValidationError(filePath, `Failed to write file: ${err}`, 'WRITE_ERROR', { error: err });
  } finally {
    await handle?.close();
  }
}

/**
 * Safely read file with automatic cleanup
 *
 * Ensures file handle is closed even on error.
 *
 * @param filePath - Path to the file to read
 * @param encoding - File encoding (default: utf-8)
 * @returns File content as string
 * @throws {FileValidationError} If file cannot be read
 *
 * @example
 * ```typescript
 * const content = await safeReadFile('/path/to/file.txt', 'utf-8');
 * ```
 */
export async function safeReadFile(
  filePath: string,
  encoding: BufferEncoding = 'utf-8'
): Promise<string> {
  let handle: fs.FileHandle | null = null;

  try {
    handle = await fs.open(filePath, 'r');
    const { bytesRead, buffer } = await handle.read();
    return buffer.subarray(0, bytesRead).toString(encoding);
  } catch (err) {
    throw new FileValidationError(filePath, `Failed to read file: ${err}`, 'READ_ERROR', { error: err });
  } finally {
    await handle?.close();
  }
}

/**
 * Safely append to file with automatic cleanup
 *
 * @param filePath - Path to the file to append to
 * @param content - Content to append
 * @param encoding - File encoding (default: utf-8)
 * @throws {FileValidationError} If file cannot be appended to
 */
export async function safeAppendFile(
  filePath: string,
  content: string,
  encoding: BufferEncoding = 'utf-8'
): Promise<void> {
  let handle: fs.FileHandle | null = null;

  try {
    handle = await fs.open(filePath, 'a');
    // FileHandle.appendFile doesn't support encoding option, convert to Buffer first
    const buffer = Buffer.from(content, encoding);
    await handle.appendFile(buffer);
  } catch (err) {
    throw new FileValidationError(filePath, `Failed to append to file: ${err}`, 'APPEND_ERROR', { error: err });
  } finally {
    await handle?.close();
  }
}

// ============================================================================
// Stream Operations
// ============================================================================

/**
 * Process stream with automatic cleanup
 *
 * Processes data from a readable stream and ensures all listeners
 * are removed when done.
 *
 * @param stream - Readable stream to process
 * @param processor - Function to handle each data chunk
 * @returns Promise that resolves when stream ends
 *
 * @example
 * ```typescript
 * await processStream(readableStream, (chunk) => {
 *   console.log('Received:', chunk.length, 'bytes');
 * });
 * ```
 */
export async function processStream(
  stream: Readable,
  processor: (chunk: Buffer) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      stream.removeAllListeners();
    };

    stream.on('data', processor);
    stream.on('end', () => {
      cleanup();
      resolve();
    });
    stream.on('error', (err) => {
      cleanup();
      reject(err);
    });
  });
}

/**
 * Copy file with streams and automatic cleanup
 *
 * Copies a file using streams to handle large files efficiently.
 *
 * @param sourcePath - Source file path
 * @param destPath - Destination file path
 * @throws {FileValidationError} If copy fails
 */
export async function copyFile(sourcePath: string, destPath: string): Promise<void> {
  let readStream: ReturnType<typeof createReadStream> | null = null;
  let writeStream: ReturnType<typeof createWriteStream> | null = null;

  try {
    readStream = createReadStream(sourcePath);
    writeStream = createWriteStream(destPath);

    await pipeline(readStream, writeStream);
  } catch (err) {
    throw new FileValidationError(
      destPath,
      `Failed to copy from ${sourcePath}: ${err}`,
      'COPY_ERROR',
      { sourcePath, error: err }
    );
  } finally {
    // Ensure streams are closed
    if (readStream && !readStream.destroyed) {
      readStream.destroy();
    }
    if (writeStream && !writeStream.destroyed) {
      writeStream.destroy();
    }
  }
}

// ============================================================================
// Directory Operations
// ============================================================================

/**
 * Ensure directory exists, create if not
 *
 * Similar to `mkdir -p` but more explicit about intent.
 *
 * @param dirPath - Directory path
 * @throws {Error} If directory creation fails
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    throw new Error(`Failed to create directory ${dirPath}: ${err}`);
  }
}

/**
 * Safely remove directory and contents
 *
 * @param dirPath - Directory path to remove
 * @throws {Error} If removal fails
 */
export async function removeDir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (err) {
    throw new Error(`Failed to remove directory ${dirPath}: ${err}`);
  }
}

/**
 * Check if file exists
 *
 * @param filePath - File path to check
 * @returns True if file exists
 */
export function fileExists(filePath: string): boolean {
  try {
    return fsSync.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Get file size
 *
 * @param filePath - File path to check
 * @returns File size in bytes
 * @throws {FileValidationError} If file cannot be accessed
 */
export async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch (err) {
    throw new FileValidationError(filePath, `Cannot access file: ${err}`, 'ACCESS_ERROR', { error: err });
  }
}

// ============================================================================
// Path Operations
// ============================================================================

/**
 * Get file extension
 *
 * @param filePath - File path
 * @returns File extension without dot, or empty string
 */
export function getFileExtension(filePath: string): string {
  // Check if there's a dot in the filename (after the last slash)
  const lastSlash = filePath.lastIndexOf('/');
  const lastDot = filePath.lastIndexOf('.');
  // Only consider it an extension if there's a dot after the last slash
  // and the dot is not at the start of the filename (hidden files)
  if (lastDot > lastSlash && lastDot > (lastSlash >= 0 ? lastSlash + 1 : 0)) {
    return filePath.slice(lastDot + 1);
  }
  return '';
}

/**
 * Get file name without extension
 *
 * @param filePath - File path
 * @returns File name without extension
 */
export function getFileNameWithoutExtension(filePath: string): string {
  const fileName = filePath.split('/').pop() || filePath;
  return fileName.replace(/\.[^/.]+$/, '');
}
