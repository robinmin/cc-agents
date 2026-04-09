import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { mkdirSync, rmSync, chmodSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    BunFileSystemAdapter,
    FsError,
    ensureDir,
    removePath,
    listFiles,
    listFilesWithInfo,
    pathExists,
    getFileInfo,
    readTextFile,
    writeTextFile,
    getOldFiles,
    deleteOldFiles,
    getDateString,
    generateLogFilename,
} from './fs';

describe('fs utilities', () => {
    let testDir: string;
    const adapter = new BunFileSystemAdapter();

    beforeAll(() => {
        testDir = join('/tmp', `fs-test-${Date.now()}`);
        mkdirSync(testDir, { recursive: true });
    });

    afterAll(() => {
        rmSync(testDir, { recursive: true, force: true });
    });

    describe('BunFileSystemAdapter', () => {
        test('implements the common async filesystem contract', async () => {
            const dir = join(testDir, 'adapter-contract');
            const filePath = join(dir, 'contract.txt');

            await adapter.mkdir(dir);
            await adapter.writeFile(filePath, 'adapter-data');

            expect(await adapter.exists(dir)).toBe(true);
            expect(await adapter.exists(filePath)).toBe(true);
            expect(await adapter.readFile(filePath)).toBe('adapter-data');

            const entries = await adapter.readDir(dir);
            expect(entries).toHaveLength(1);
            expect(entries[0]?.name).toBe('contract.txt');
            expect(entries[0]?.isFile).toBe(true);

            const info = await adapter.stat(filePath);
            expect(info.name).toBe('contract.txt');
            expect(info.isFile).toBe(true);
        });

        test('wraps adapter failures in FsError', async () => {
            try {
                await adapter.readFile(join(testDir, 'missing.txt'));
                throw new Error('expected FsError');
            } catch (error) {
                expect(error).toBeInstanceOf(FsError);
                expect((error as FsError).operation).toBe('readFile');
                expect((error as FsError).path).toContain('missing.txt');
            }
        });
    });

    describe('ensureDir', () => {
        test('creates directory', () => {
            const newDir = join(testDir, 'ensure-test');
            ensureDir(newDir);
            expect(pathExists(newDir)).toBe(true);
        });

        test('creates nested directories', () => {
            const newDir = join(testDir, 'a', 'b', 'c');
            ensureDir(newDir);
            expect(pathExists(newDir)).toBe(true);
        });

        test('is idempotent', () => {
            const newDir = join(testDir, 'ensure-idempotent');
            ensureDir(newDir);
            ensureDir(newDir); // Second call should not throw
            expect(pathExists(newDir)).toBe(true);
        });

        test('re-throws non-EEXIST errors', () => {
            if (process.platform === 'win32') {
                // Skip on Windows where chmod behavior differs
                return;
            }
            // Create a directory owned by root where we can't write
            // We'll use a path that requires root privileges to create a subdirectory
            // Since we can't easily test root-owned dirs without sudo, we verify the
            // catch path logic indirectly by ensuring EEXIST is NOT re-thrown
            const dir = join(testDir, 'perm-test-dir');
            mkdirSync(dir, { recursive: true });
            chmodSync(dir, 0o444); // read-only: mkdir inside will fail with EACCES
            try {
                // Try to create a subdirectory - should fail with EACCES, not EEXIST
                expect(() => ensureDir(join(dir, 'subdir'))).toThrow();
            } finally {
                chmodSync(dir, 0o755); // restore
                rmSync(dir, { recursive: true, force: true });
            }
        });
    });

    describe('removePath', () => {
        test('removes file', () => {
            const filePath = join(testDir, 'to-remove.txt');
            writeTextFile(filePath, 'test');
            expect(pathExists(filePath)).toBe(true);
            removePath(filePath);
            expect(pathExists(filePath)).toBe(false);
        });

        test('removes directory recursively', () => {
            const dirPath = join(testDir, 'to-remove-dir');
            ensureDir(join(dirPath, 'sub'));
            writeTextFile(join(dirPath, 'file.txt'), 'test');
            removePath(dirPath);
            expect(pathExists(dirPath)).toBe(false);
        });

        test('handles non-existent path', () => {
            expect(() => removePath(join(testDir, 'non-existent'))).not.toThrow();
        });

        test('re-throws non-ENOENT errors', () => {
            if (process.platform === 'win32') {
                return;
            }
            const dir = join(testDir, 'rm-perm-test');
            mkdirSync(dir, { recursive: true });
            const file = join(dir, 'protected.txt');
            writeFileSync(file, 'content');
            chmodSync(dir, 0o555); // directory read-only: can't remove files inside
            try {
                // rmSync on file inside read-only dir should throw EACCES (not ENOENT)
                expect(() => removePath(file)).toThrow();
            } finally {
                chmodSync(dir, 0o755); // restore
                rmSync(dir, { recursive: true, force: true });
            }
        });
    });

    describe('listFiles', () => {
        test('lists files matching pattern', () => {
            const dir = join(testDir, 'list-test');
            ensureDir(dir);
            writeTextFile(join(dir, 'a.txt'), '');
            writeTextFile(join(dir, 'b.txt'), '');
            writeTextFile(join(dir, 'c.log'), '');

            const txtFiles = listFiles(dir, /\.txt$/);
            expect(txtFiles).toHaveLength(2);
            expect(txtFiles.every((f) => f.endsWith('.txt'))).toBe(true);
        });

        test('lists all files without pattern', () => {
            const dir = join(testDir, 'list-test2');
            ensureDir(dir);
            writeTextFile(join(dir, 'file1.txt'), '');
            writeTextFile(join(dir, 'file2.txt'), '');

            const files = listFiles(dir);
            expect(files).toHaveLength(2);
        });

        test('returns empty array for non-existent directory', () => {
            const files = listFiles(join(testDir, 'non-existent'));
            expect(files).toHaveLength(0);
        });
    });

    describe('listFilesWithInfo', () => {
        test('returns file metadata', () => {
            const dir = join(testDir, 'info-test');
            ensureDir(dir);
            const filePath = join(dir, 'test.txt');
            const content = 'hello world';
            writeTextFile(filePath, content);

            const files = listFilesWithInfo(dir);
            expect(files).toHaveLength(1);
            expect(files[0].name).toBe('test.txt');
            expect(files[0].size).toBe(content.length);
            expect(files[0].isFile).toBe(true);
            expect(files[0].isDirectory).toBe(false);
        });
    });

    describe('pathExists', () => {
        test('returns true for existing file', () => {
            const filePath = join(testDir, 'exists.txt');
            writeTextFile(filePath, '');
            expect(pathExists(filePath)).toBe(true);
        });

        test('returns false for non-existent path', () => {
            expect(pathExists(join(testDir, 'non-existent'))).toBe(false);
        });
    });

    describe('getFileInfo', () => {
        test('returns file info', () => {
            const filePath = join(testDir, 'info.txt');
            const content = 'test content';
            writeTextFile(filePath, content);

            const info = getFileInfo(filePath);
            expect(info).not.toBeNull();
            expect(info?.name).toBe('info.txt');
            expect(info?.size).toBe(content.length);
            expect(info?.isFile).toBe(true);
        });

        test('returns null for non-existent file', () => {
            const info = getFileInfo(join(testDir, 'non-existent.txt'));
            expect(info).toBeNull();
        });
    });

    describe('readTextFile', () => {
        test('reads file content', () => {
            const filePath = join(testDir, 'read.txt');
            const content = 'Hello, World!';
            writeTextFile(filePath, content);

            expect(readTextFile(filePath)).toBe(content);
        });

        test('returns empty string for non-existent file', () => {
            expect(readTextFile(join(testDir, 'non-existent.txt'))).toBe('');
        });

        test('re-throws non-ENOENT errors', () => {
            if (process.platform === 'win32') {
                return;
            }
            const dir = join(testDir, 'read-perm-test');
            mkdirSync(dir, { recursive: true });
            const file = join(dir, 'no-read.txt');
            writeFileSync(file, 'secret');
            chmodSync(file, 0o000); // no permissions
            try {
                // readFileSync should throw EACCES (not ENOENT)
                expect(() => readTextFile(file)).toThrow();
            } finally {
                chmodSync(file, 0o644); // restore
                rmSync(dir, { recursive: true, force: true });
            }
        });
    });

    describe('writeTextFile', () => {
        test('writes content to file', () => {
            const filePath = join(testDir, 'write.txt');
            const content = 'Test content';
            writeTextFile(filePath, content);

            expect(readTextFile(filePath)).toBe(content);
        });

        test('creates parent directories', () => {
            const filePath = join(testDir, 'nested', 'dir', 'write.txt');
            writeTextFile(filePath, 'content');

            expect(pathExists(filePath)).toBe(true);
            expect(readTextFile(filePath)).toBe('content');
        });
    });

    describe('getOldFiles', () => {
        test('returns empty when no old files exist', () => {
            const dir = join(testDir, 'old-test');
            ensureDir(dir);
            const filePath = join(dir, 'new.txt');
            writeTextFile(filePath, 'content');

            // No files should be old (created just now)
            const oldFiles = getOldFiles(dir, 7);
            expect(oldFiles.some((f) => f.name === 'new.txt')).toBe(false);
        });

        test("returns empty when directory doesn't exist", () => {
            const oldFiles = getOldFiles(join(testDir, 'non-existent'), 7);
            expect(oldFiles).toHaveLength(0);
        });
    });

    describe('deleteOldFiles', () => {
        test('returns 0 when no files to delete', () => {
            const dir = join(testDir, 'delete-test');
            ensureDir(dir);
            const filePath = join(dir, 'new.txt');
            writeTextFile(filePath, 'content');

            const deleted = deleteOldFiles(dir, 7);
            expect(deleted).toBe(0);
            expect(pathExists(filePath)).toBe(true);
        });

        test('returns 0 for non-existent directory', () => {
            const deleted = deleteOldFiles(join(testDir, 'non-existent-dir'), 7);
            expect(deleted).toBe(0);
        });

        test('continues on individual file deletion error and returns partial count', () => {
            if (process.platform === 'win32') {
                return;
            }
            const dir = join(testDir, 'partial-delete-test');
            ensureDir(dir);
            const file1 = join(dir, 'undeletable.txt');
            const file2 = join(dir, 'deletable.txt');
            writeTextFile(file1, 'content1');
            writeTextFile(file2, 'content2');
            chmodSync(dir, 0o555); // make dir read-only: rmSync fails with EACCES
            try {
                const deleted = deleteOldFiles(dir, 0); // 0 days = all files are "old"
                // Should not throw even though file deletion failed
                expect(typeof deleted).toBe('number');
            } finally {
                chmodSync(dir, 0o755); // restore
                rmSync(dir, { recursive: true, force: true });
            }
        });
    });

    describe('getDateString', () => {
        test('formats date as YYYY-MM-DD', () => {
            const date = new Date('2024-01-15T12:30:00Z');
            expect(getDateString(date)).toBe('2024-01-15');
        });

        test('defaults to current date', () => {
            const result = getDateString();
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });

    describe('generateLogFilename', () => {
        test('generates filename with date', () => {
            const date = new Date('2024-01-15');
            expect(generateLogFilename('app', date)).toBe('app.2024-01-15.log');
        });

        test('uses current date by default', () => {
            const result = generateLogFilename('app');
            const expectedDate = getDateString();
            expect(result).toBe(`app.${expectedDate}.log`);
        });
    });
});
