import { afterEach, beforeEach, describe, expect, test, spyOn } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { showConfig, setActiveFolder, addFolder } from '../scripts/commands/config';
import { logger, setGlobalSilent } from '../../../scripts/logger';

const BASE_CONFIG = (folder = 'docs/tasks') =>
    JSON.stringify({
        $schema_version: 1,
        active_folder: folder,
        folders: {
            [folder]: { base_counter: 0 },
        },
    });

function writeConfig(tempDir: string, configContent?: string, folder = 'docs/tasks'): void {
    mkdirSync(join(tempDir, 'docs', '.tasks'), { recursive: true });
    mkdirSync(join(tempDir, folder), { recursive: true });
    writeFileSync(join(tempDir, 'docs', '.tasks', 'config.jsonc'), configContent ?? BASE_CONFIG(folder));
}

describe('showConfig', () => {
    let tempDir: string;
    let logSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
        tempDir = mkdtempSync(join(tmpdir(), 'tasks-conffn-show-test-'));
        writeConfig(tempDir);
        setGlobalSilent(true);
        logSpy = spyOn(logger, 'log');
    });

    afterEach(() => {
        setGlobalSilent(false);
        logSpy.mockRestore();
        rmSync(tempDir, { recursive: true, force: true });
    });

    test('returns config and configPath', () => {
        const result = showConfig(tempDir, true);
        expect(result.config).toBeDefined();
        expect(result.config.active_folder).toBe('docs/tasks');
        expect(result.configPath).toContain('config.jsonc');
    });

    test('returns folders from config', () => {
        const result = showConfig(tempDir, true);
        expect(result.config.folders['docs/tasks']).toBeDefined();
    });

    test('logs output when quiet=false', () => {
        const result = showConfig(tempDir, false);
        expect(result.config).toBeDefined();
        expect(logSpy).toHaveBeenCalled();
    });

    test('logs folder with label when label is set', () => {
        writeFileSync(
            join(tempDir, 'docs', '.tasks', 'config.jsonc'),
            JSON.stringify({
                $schema_version: 1,
                active_folder: 'docs/tasks',
                folders: { 'docs/tasks': { base_counter: 0, label: 'Phase 1' } },
            }),
        );
        const result = showConfig(tempDir, false);
        expect(result.config.folders['docs/tasks'].label).toBe('Phase 1');
        expect(logSpy).toHaveBeenCalled();
    });
});

describe('setActiveFolder', () => {
    let tempDir: string;
    let successSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
        tempDir = mkdtempSync(join(tmpdir(), 'tasks-conffn-setactive-test-'));
        const config = JSON.stringify({
            $schema_version: 1,
            active_folder: 'docs/tasks',
            folders: {
                'docs/tasks': { base_counter: 0 },
                'docs/prompts': { base_counter: 100 },
            },
        });
        mkdirSync(join(tempDir, 'docs', '.tasks'), { recursive: true });
        mkdirSync(join(tempDir, 'docs', 'tasks'), { recursive: true });
        mkdirSync(join(tempDir, 'docs', 'prompts'), { recursive: true });
        writeFileSync(join(tempDir, 'docs', '.tasks', 'config.jsonc'), config);
        setGlobalSilent(true);
        successSpy = spyOn(logger, 'success');
    });

    afterEach(() => {
        setGlobalSilent(false);
        successSpy.mockRestore();
        rmSync(tempDir, { recursive: true, force: true });
    });

    test('returns error when folder is not configured', () => {
        const result = setActiveFolder(tempDir, 'docs/nonexistent', true);
        expect(result.ok).toBe(false);
        expect(result.error).toContain('not configured');
    });

    test('sets active folder to a configured folder', () => {
        const result = setActiveFolder(tempDir, 'docs/prompts', true);
        expect(result.ok).toBe(true);
        expect(result.activeFolder).toBe('docs/prompts');

        const saved = JSON.parse(readFileSync(join(tempDir, 'docs', '.tasks', 'config.jsonc'), 'utf-8'));
        expect(saved.active_folder).toBe('docs/prompts');
    });

    test('logs success when quiet=false', () => {
        const result = setActiveFolder(tempDir, 'docs/prompts', false);
        expect(result.ok).toBe(true);
        expect(successSpy).toHaveBeenCalledWith('Set active folder: docs/prompts');
    });

    test('returns error when config cannot be saved', () => {
        const result = setActiveFolder('/nonexistent/root', 'docs/tasks', true);
        expect(result.ok).toBe(false);
    });
});

describe('addFolder', () => {
    let tempDir: string;
    let successSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
        tempDir = mkdtempSync(join(tmpdir(), 'tasks-conffn-addfolder-test-'));
        writeConfig(tempDir);
        setGlobalSilent(true);
        successSpy = spyOn(logger, 'success');
    });

    afterEach(() => {
        setGlobalSilent(false);
        successSpy.mockRestore();
        rmSync(tempDir, { recursive: true, force: true });
    });

    test('adds a new folder to config', () => {
        const result = addFolder(tempDir, 'docs/archive', 500, undefined, true);
        expect(result.ok).toBe(true);
        expect(result.folder).toBe('docs/archive');
        expect(result.baseCounter).toBe(500);

        const saved = JSON.parse(readFileSync(join(tempDir, 'docs', '.tasks', 'config.jsonc'), 'utf-8'));
        expect(saved.folders['docs/archive']).toBeDefined();
        expect(saved.folders['docs/archive'].base_counter).toBe(500);
    });

    test('adds a folder with label', () => {
        const result = addFolder(tempDir, 'docs/sprint', 200, 'Sprint 1', true);
        expect(result.ok).toBe(true);
        expect(result.label).toBe('Sprint 1');

        const saved = JSON.parse(readFileSync(join(tempDir, 'docs', '.tasks', 'config.jsonc'), 'utf-8'));
        expect(saved.folders['docs/sprint'].label).toBe('Sprint 1');
    });

    test('returns error if folder already exists', () => {
        const result = addFolder(tempDir, 'docs/tasks', 0, undefined, true);
        expect(result.ok).toBe(false);
        expect(result.error).toContain('already configured');
    });

    test('logs success when quiet=false', () => {
        const result = addFolder(tempDir, 'docs/new-folder', 300, undefined, false);
        expect(result.ok).toBe(true);
        expect(successSpy).toHaveBeenCalledWith('Added folder: docs/new-folder (base: 300)');
    });

    test('returns error when config cannot be saved', () => {
        const result = addFolder('/nonexistent/root', 'docs/new', 0, undefined, true);
        expect(result.ok).toBe(false);
    });

    test('result does not include label when label is undefined', () => {
        const result = addFolder(tempDir, 'docs/nolabel', 10, undefined, true);
        expect(result.ok).toBe(true);
        expect(result.label).toBeUndefined();
    });
});
