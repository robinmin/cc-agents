/**
 * File system abstraction for rd3 plugin.
 *
 * Exposes a Bun-oriented async adapter for production code and compatibility
 * wrappers so existing sync utilities can migrate without importing node:fs
 * directly.
 */

import {
    existsSync as nativeExistsSync,
    mkdirSync as nativeMkdirSync,
    readdirSync as nativeReaddirSync,
    readFileSync as nativeReadFileSync,
    rmSync as nativeRmSync,
    statSync as nativeStatSync,
    writeFileSync as nativeWriteFileSync,
    type Dirent,
    type PathLike,
    type Stats,
} from 'node:fs';
import {
    access as nativeAccess,
    mkdir as nativeMkdir,
    open as nativeOpen,
    readdir as nativeReaddir,
    rm as nativeRm,
    stat as nativeStat,
    type FileHandle,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface FileInfo {
    path: string;
    name: string;
    size: number;
    mtime: Date;
    isFile: boolean;
    isDirectory: boolean;
}

export interface FileSystemEntry {
    name: string;
    path: string;
    isFile: boolean;
    isDirectory: boolean;
}

export interface ReadFileOptions {
    encoding?: BufferEncoding;
}

export interface WriteFileOptions {
    ensureDir?: boolean;
}

export interface MakeDirOptions {
    recursive?: boolean;
}

export interface RemoveOptions {
    recursive?: boolean;
    force?: boolean;
}

export interface FileSystem {
    readFile(path: string, options?: ReadFileOptions): Promise<string>;
    writeFile(path: string, content: string | Uint8Array, options?: WriteFileOptions): Promise<void>;
    exists(path: string): Promise<boolean>;
    readDir(path: string): Promise<FileSystemEntry[]>;
    mkdir(path: string, options?: MakeDirOptions): Promise<void>;
    remove(path: string, options?: RemoveOptions): Promise<void>;
    stat(path: string): Promise<FileInfo>;
}

export class FsError extends Error {
    readonly operation: string;
    readonly path: string;
    readonly code: string | undefined;

    constructor(operation: string, path: string, cause?: unknown) {
        const detail = cause instanceof Error ? cause.message : String(cause ?? 'unknown error');
        super(`FS ${operation} failed for ${path}: ${detail}`);
        this.name = 'FsError';
        this.operation = operation;
        this.path = path;
        this.code = typeof cause === 'object' && cause !== null && 'code' in cause ? String(cause.code) : undefined;
        this.cause = cause;
    }
}

function normalizeInfo(path: string, stats: Stats): FileInfo {
    return {
        path,
        name: path.split('/').pop() ?? path,
        size: stats.size,
        mtime: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
    };
}

function normalizeDirent(basePath: string, entry: Dirent): FileSystemEntry {
    return {
        name: entry.name,
        path: join(basePath, entry.name),
        isFile: entry.isFile(),
        isDirectory: entry.isDirectory(),
    };
}

function toFsError(operation: string, path: string, error: unknown): FsError {
    return error instanceof FsError ? error : new FsError(operation, path, error);
}

/**
 * Bun-backed adapter for new async code. Bun.file/Bun.write handle file payloads
 * while directory and metadata operations fall back to Bun-compatible Node APIs.
 */
export class BunFileSystemAdapter implements FileSystem {
    async readFile(path: string, options: ReadFileOptions = {}): Promise<string> {
        try {
            const file = Bun.file(path);
            return options.encoding && options.encoding !== 'utf8' ? await file.text() : await file.text();
        } catch (error) {
            throw toFsError('readFile', path, error);
        }
    }

    async writeFile(path: string, content: string | Uint8Array, options: WriteFileOptions = {}): Promise<void> {
        try {
            if (options.ensureDir !== false) {
                await nativeMkdir(dirname(path), { recursive: true });
            }
            await Bun.write(path, content);
        } catch (error) {
            throw toFsError('writeFile', path, error);
        }
    }

    async exists(path: string): Promise<boolean> {
        try {
            await nativeAccess(path);
            return true;
        } catch (error) {
            if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
                return false;
            }
            throw toFsError('exists', path, error);
        }
    }

    async readDir(path: string): Promise<FileSystemEntry[]> {
        try {
            const entries = await nativeReaddir(path, { withFileTypes: true });
            return entries.map((entry) => normalizeDirent(path, entry));
        } catch (error) {
            throw toFsError('readDir', path, error);
        }
    }

    async mkdir(path: string, options: MakeDirOptions = {}): Promise<void> {
        try {
            await nativeMkdir(path, { recursive: options.recursive ?? true });
        } catch (error) {
            throw toFsError('mkdir', path, error);
        }
    }

    async remove(path: string, options: RemoveOptions = {}): Promise<void> {
        try {
            await nativeRm(path, {
                recursive: options.recursive ?? true,
                force: options.force ?? true,
            });
        } catch (error) {
            throw toFsError('remove', path, error);
        }
    }

    async stat(path: string): Promise<FileInfo> {
        try {
            const stats = await nativeStat(path);
            return normalizeInfo(path, stats);
        } catch (error) {
            throw toFsError('stat', path, error);
        }
    }
}

export const defaultFileSystem = new BunFileSystemAdapter();
export type { FileHandle };

// Compatibility exports for legacy sync consumers inside plugins/rd3/scripts.
export function existsSync(path: PathLike): boolean {
    return nativeExistsSync(path);
}

export function mkdirSync(path: PathLike, options?: Parameters<typeof nativeMkdirSync>[1]): string | undefined {
    return nativeMkdirSync(path, options);
}

export function readFileSync(path: PathLike, encoding: BufferEncoding = 'utf-8'): string {
    return nativeReadFileSync(path, encoding);
}

export function readdirSync(path: PathLike): string[];
export function readdirSync(path: PathLike, options: { withFileTypes: true }): Dirent[];
export function readdirSync(path: PathLike, options?: { withFileTypes?: boolean }): string[] | Dirent[] {
    return options?.withFileTypes ? nativeReaddirSync(path, { withFileTypes: true }) : nativeReaddirSync(path);
}

export function rmSync(path: PathLike, options?: Parameters<typeof nativeRmSync>[1]): void {
    nativeRmSync(path, options);
}

export function statSync(path: PathLike): Stats {
    return nativeStatSync(path);
}

export function writeFileSync(
    path: PathLike,
    data: string | NodeJS.ArrayBufferView,
    options?: Parameters<typeof nativeWriteFileSync>[2],
): void {
    nativeWriteFileSync(path, data, options);
}

export async function access(path: PathLike): Promise<void> {
    await nativeAccess(path);
}

export async function mkdir(path: PathLike, options?: MakeDirOptions): Promise<void> {
    await nativeMkdir(path, { recursive: options?.recursive ?? true });
}

export async function open(path: PathLike, flags: Parameters<typeof nativeOpen>[1]): Promise<FileHandle> {
    return await nativeOpen(path, flags);
}

export async function readdir(path: PathLike): Promise<string[]> {
    return await nativeReaddir(path);
}

export async function rm(path: PathLike, options?: RemoveOptions): Promise<void> {
    await nativeRm(path, {
        recursive: options?.recursive ?? true,
        force: options?.force ?? true,
    });
}

/**
 * Ensure a directory exists, creating it if necessary.
 * Safe to call multiple times - no-op if directory exists.
 */
export function ensureDir(dirPath: string): void {
    try {
        mkdirSync(dirPath, { recursive: true });
    } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code !== 'EEXIST') {
            throw error;
        }
    }
}

/**
 * Remove a file or directory recursively.
 * Safe to call on non-existent paths.
 */
export function removePath(targetPath: string): void {
    try {
        rmSync(targetPath, { recursive: true, force: true });
    } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code !== 'ENOENT') {
            throw error;
        }
    }
}

/**
 * List files in a directory with optional pattern filter.
 */
export function listFiles(dirPath: string, pattern?: RegExp): string[] {
    try {
        const entries = readdirSync(dirPath);
        const files: string[] = [];

        for (const entry of entries) {
            const fullPath = join(dirPath, entry);
            const info = statSync(fullPath);

            if (info.isFile() && (!pattern || pattern.test(entry))) {
                files.push(fullPath);
            }
        }

        return files.sort();
    } catch {
        return [];
    }
}

/**
 * List files with full FileInfo metadata.
 */
export function listFilesWithInfo(dirPath: string, pattern?: RegExp): FileInfo[] {
    try {
        const entries = readdirSync(dirPath);
        const files: FileInfo[] = [];

        for (const entry of entries) {
            const fullPath = join(dirPath, entry);
            const info = statSync(fullPath);

            if (info.isFile() && (!pattern || pattern.test(entry))) {
                files.push(normalizeInfo(fullPath, info));
            }
        }

        return files.sort((a, b) => a.name.localeCompare(b.name));
    } catch {
        return [];
    }
}

/**
 * Check if a path exists (file or directory).
 */
export function pathExists(targetPath: string): boolean {
    return existsSync(targetPath);
}

/**
 * Get file stats. Returns null if file doesn't exist.
 */
export function getFileInfo(filePath: string): FileInfo | null {
    try {
        return normalizeInfo(filePath, statSync(filePath));
    } catch {
        return null;
    }
}

/**
 * Read file contents as string.
 * Returns empty string if file doesn't exist.
 */
export function readTextFile(filePath: string): string {
    try {
        return readFileSync(filePath, 'utf8');
    } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
            return '';
        }
        throw error;
    }
}

/**
 * Write text content to a file.
 * Creates parent directories if they don't exist.
 */
export function writeTextFile(filePath: string, content: string): void {
    const dir = dirname(filePath);
    if (dir && dir !== '.') {
        ensureDir(dir);
    }
    writeFileSync(filePath, content, 'utf8');
}

/**
 * Get files older than specified days.
 */
export function getOldFiles(dirPath: string, maxAgeDays: number, pattern?: RegExp): FileInfo[] {
    const files = listFilesWithInfo(dirPath, pattern);
    const cutoffTime = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;

    return files.filter((file) => file.mtime.getTime() < cutoffTime);
}

/**
 * Delete old files from a directory.
 * Returns number of files deleted.
 */
export function deleteOldFiles(dirPath: string, maxAgeDays: number, pattern?: RegExp): number {
    const oldFiles = getOldFiles(dirPath, maxAgeDays, pattern);
    let deleted = 0;

    for (const file of oldFiles) {
        try {
            rmSync(file.path, { force: true });
            deleted += 1;
        } catch {
            // Ignore deletion errors, continue with other files
        }
    }

    return deleted;
}

/**
 * Get the current date string in YYYY-MM-DD format.
 */
export function getDateString(date: Date = new Date()): string {
    return date.toISOString().split('T')[0];
}

/**
 * Generate a log filename with date.
 */
export function generateLogFilename(baseName: string, date?: Date): string {
    const dateStr = getDateString(date);
    return `${baseName}.${dateStr}.log`;
}
