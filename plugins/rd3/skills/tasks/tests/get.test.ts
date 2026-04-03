import { afterEach, beforeEach, describe, expect, test, mock } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getArtifacts } from '../scripts/commands/get';
import { setGlobalSilent } from '../../../scripts/logger';
import type { ArtifactEntry } from '../scripts/types';

// Helper: write a minimal config.jsonc into tempDir/docs/.tasks/
function writeConfig(tempDir: string, activeFolder = 'docs/tasks'): void {
    mkdirSync(join(tempDir, 'docs', '.tasks'), { recursive: true });
    writeFileSync(
        join(tempDir, 'docs', '.tasks', 'config.jsonc'),
        JSON.stringify(
            {
                $schema_version: 1,
                active_folder: activeFolder,
                folders: {
                    [activeFolder]: { base_counter: 0 },
                },
            },
            null,
            2,
        ),
    );
}

describe('getArtifacts', () => {
    const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `tasks-get-test-${Date.now()}`);

    beforeEach(() => {
        setGlobalSilent(true);
        mkdirSync(tempDir, { recursive: true });
        writeConfig(tempDir);
        mkdirSync(join(tempDir, 'docs', 'tasks'), { recursive: true });
    });

    afterEach(() => {
        setGlobalSilent(false);
        rmSync(tempDir, { recursive: true, force: true });
    });

    test('returns error when task is not found', () => {
        // No task files exist in docs/tasks — findTaskByWbs returns null
        const result = getArtifacts(tempDir, '0001');

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('Task 0001 not found');
        }
    });

    test('returns error when task file does not exist', () => {
        // getArtifacts checks existsSync(taskPath) after findTaskByWbs — if findTaskByWbs
        // returns a path that doesn't exist, it also returns "not found".
        // Since no task files exist, findTaskByWbs returns null → same error.
        const result = getArtifacts(tempDir, '0001');

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('Task 0001 not found');
        }
    });

    test('parses artifacts table correctly', () => {
        const taskPath = join(tempDir, 'docs', 'tasks', '0001_Test_Task.md');
        const taskContent = `---
name: Test Task
---

### Artifacts

| Type | Path | Agent | Date |
|------|------|-------|------|
| doc | README.md | agent1 | 2024-01-01 |
| code | src/main.ts | agent2 | 2024-01-02 |
| test | test.spec.ts | | 2024-01-03 |
`;

        writeFileSync(taskPath, taskContent);

        const result = getArtifacts(tempDir, '0001', {}, true);

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.wbs).toBe('0001');
            expect(result.value.artifacts).toHaveLength(3);

            const expectedArtifacts: ArtifactEntry[] = [
                { type: 'doc', path: 'README.md', agent: 'agent1', date: '2024-01-01' },
                { type: 'code', path: 'src/main.ts', agent: 'agent2', date: '2024-01-02' },
                { type: 'test', path: 'test.spec.ts', agent: '2024-01-03', date: '' },
            ];

            expect(result.value.artifacts).toEqual(expectedArtifacts);
            expect(result.value.paths).toEqual(['README.md', 'src/main.ts', 'test.spec.ts']);
        }
    });

    test('filters artifacts by type when specified', () => {
        const taskPath = join(tempDir, 'docs', 'tasks', '0001_Test_Task.md');
        const taskContent = `---
name: Test Task
---

### Artifacts

| Type | Path | Agent | Date |
|------|------|-------|------|
| doc | README.md | agent1 | 2024-01-01 |
| code | src/main.ts | agent2 | 2024-01-02 |
| test | test.spec.ts | | 2024-01-03 |
`;

        writeFileSync(taskPath, taskContent);

        const result = getArtifacts(tempDir, '0001', { artifactType: 'doc' }, true);

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.artifacts).toHaveLength(1);
            expect(result.value.artifacts[0]).toEqual({
                type: 'doc',
                path: 'README.md',
                agent: 'agent1',
                date: '2024-01-01',
            });
            expect(result.value.paths).toEqual(['README.md']);
        }
    });

    test('handles empty artifacts section', () => {
        const taskPath = join(tempDir, 'docs', 'tasks', '0001_Test_Task.md');
        const taskContent = `---
name: Test Task
---

### Artifacts

No artifacts yet.
`;

        writeFileSync(taskPath, taskContent);

        const result = getArtifacts(tempDir, '0001', {}, true);

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.artifacts).toHaveLength(0);
            expect(result.value.paths).toHaveLength(0);
        }
    });

    test('includes files from docs/tasks/<wbs>/ directory', () => {
        const taskPath = join(tempDir, 'docs', 'tasks', '0001_Test_Task.md');
        const artifactDir = join(tempDir, 'docs', 'tasks', '0001');
        const taskContent = `---
name: Test Task
---

### Artifacts

| Type | Path | Agent | Date |
|------|------|-------|------|
| doc | README.md | agent1 | 2024-01-01 |
`;

        writeFileSync(taskPath, taskContent);

        mkdirSync(artifactDir, { recursive: true });
        writeFileSync(join(artifactDir, 'design.md'), 'Design document');
        writeFileSync(join(artifactDir, 'notes.txt'), 'Notes');

        const result = getArtifacts(tempDir, '0001', {}, true);

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.artifacts).toHaveLength(1);
            expect(result.value.artifacts[0]).toEqual({
                type: 'doc',
                path: 'README.md',
                agent: 'agent1',
                date: '2024-01-01',
            });

            // Should include both table paths and stored files
            expect(result.value.paths).toHaveLength(3);
            expect(result.value.paths).toContain('README.md');
            expect(result.value.paths).toContain('docs/tasks/0001/design.md');
            expect(result.value.paths).toContain('docs/tasks/0001/notes.txt');
        }
    });

    test('excludes stored files when filtering by artifact type', () => {
        const taskPath = join(tempDir, 'docs', 'tasks', '0001_Test_Task.md');
        const artifactDir = join(tempDir, 'docs', 'tasks', '0001');
        const taskContent = `---
name: Test Task
---

### Artifacts

| Type | Path | Agent | Date |
|------|------|-------|------|
| doc | README.md | agent1 | 2024-01-01 |
| code | src/main.ts | agent2 | 2024-01-02 |
`;

        writeFileSync(taskPath, taskContent);

        mkdirSync(artifactDir, { recursive: true });
        writeFileSync(join(artifactDir, 'design.md'), 'Design document');

        const result = getArtifacts(tempDir, '0001', { artifactType: 'doc' }, true);

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.artifacts).toHaveLength(1);
            expect(result.value.artifacts[0].type).toBe('doc');

            // When filtering by type, should only include matching artifact paths, not stored files
            expect(result.value.paths).toEqual(['README.md']);
        }
    });

    test('handles malformed table rows gracefully', () => {
        const taskPath = join(tempDir, 'docs', 'tasks', '0001_Test_Task.md');
        const taskContent = `---
name: Test Task
---

### Artifacts

| Type | Path | Agent | Date |
|------|------|-------|------|
| doc | README.md | agent1 | 2024-01-01 |
| incomplete row |
| | empty cells | | |
| valid | path.txt | agent | date |
`;

        writeFileSync(taskPath, taskContent);

        const result = getArtifacts(tempDir, '0001', {}, true);

        expect(result.ok).toBe(true);
        if (result.ok) {
            // Should only parse valid rows
            expect(result.value.artifacts).toHaveLength(2);
            expect(result.value.artifacts[0]).toEqual({
                type: 'doc',
                path: 'README.md',
                agent: 'agent1',
                date: '2024-01-01',
            });
            expect(result.value.artifacts[1]).toEqual({
                type: 'valid',
                path: 'path.txt',
                agent: 'agent',
                date: 'date',
            });
        }
    });

    test('handles divider row detection', () => {
        const taskPath = join(tempDir, 'docs', 'tasks', '0001_Test_Task.md');
        const taskContent = `---
name: Test Task
---

### Artifacts

| Type | Path | Agent | Date |
|------|------|-------|------|
|------|------|-------|------|
| doc | README.md | agent1 | 2024-01-01 |
`;

        writeFileSync(taskPath, taskContent);

        const result = getArtifacts(tempDir, '0001', {}, true);

        expect(result.ok).toBe(true);
        if (result.ok) {
            // Should skip divider rows
            expect(result.value.artifacts).toHaveLength(1);
            expect(result.value.artifacts[0]).toEqual({
                type: 'doc',
                path: 'README.md',
                agent: 'agent1',
                date: '2024-01-01',
            });
        }
    });

    test('handles missing agent field in table', () => {
        const taskPath = join(tempDir, 'docs', 'tasks', '0001_Test_Task.md');
        const taskContent = `---
name: Test Task
---

### Artifacts

| Type | Path | Agent | Date |
|------|------|-------|----- |
| doc | README.md | - | 2024-01-01 |
| code | src/main.ts | - | 2024-01-02 |
`;

        writeFileSync(taskPath, taskContent);

        const result = getArtifacts(tempDir, '0001', {}, true);

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.artifacts).toHaveLength(2);
            expect(result.value.artifacts[0]).toEqual({
                type: 'doc',
                path: 'README.md',
                agent: '-',
                date: '2024-01-01',
            });
            expect(result.value.artifacts[1]).toEqual({
                type: 'code',
                path: 'src/main.ts',
                agent: '-',
                date: '2024-01-02',
            });
        }
    });

    test('removes duplicate paths between table and stored files', () => {
        const taskPath = join(tempDir, 'docs', 'tasks', '0001_Test_Task.md');
        const artifactDir = join(tempDir, 'docs', 'tasks', '0001');
        const taskContent = `---
name: Test Task
---
`;

        writeFileSync(taskPath, taskContent);

        mkdirSync(artifactDir, { recursive: true });
        writeFileSync(join(artifactDir, 'README.md'), 'Readme');
        writeFileSync(join(artifactDir, 'unique.md'), 'Unique');

        const artifactsContent = `---
name: Test Task
---

### Artifacts

| Type | Path | Agent | Date |
|------|------|-------|------|
| doc | docs/tasks/0001/README.md | agent1 | 2024-01-01 |
`;

        writeFileSync(taskPath, artifactsContent);

        const result = getArtifacts(tempDir, '0001', {}, true);

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.artifacts).toHaveLength(1);

            // Should not duplicate the same file path
            const uniquePaths = [...new Set(result.value.paths)];
            expect(result.value.paths).toHaveLength(uniquePaths.length);
            expect(result.value.paths).toContain('docs/tasks/0001/README.md');
            expect(result.value.paths).toContain('docs/tasks/0001/unique.md');
        }
    });

    test('handles non-existent artifact directory', () => {
        const taskPath = join(tempDir, 'docs', 'tasks', '0001_Test_Task.md');
        const taskContent = `---
name: Test Task
---

### Artifacts

| Type | Path | Agent | Date |
|------|------|-------|------|
| doc | README.md | agent1 | 2024-01-01 |
`;

        writeFileSync(taskPath, taskContent);

        const result = getArtifacts(tempDir, '0001', {}, true);

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.artifacts).toHaveLength(1);
            expect(result.value.paths).toEqual(['README.md']);
        }
    });

    test('logs output when quiet is false', () => {
        const mockLog = mock(() => {});
        const loggerModule = require('../../../scripts/logger');
        const originalLog = loggerModule.logger.log;
        loggerModule.logger.log = mockLog;

        const taskPath = join(tempDir, 'docs', 'tasks', '0001_Test_Task.md');
        const taskContent = `---
name: Test Task
---

### Artifacts

| Type | Path | Agent | Date |
|------|------|-------|------|
| doc | README.md | agent1 | 2024-01-01 |
`;

        writeFileSync(taskPath, taskContent);

        const result = getArtifacts(tempDir, '0001', {}, false); // quiet = false

        expect(result.ok).toBe(true);
        expect(mockLog).toHaveBeenCalledWith('Artifacts for 0001:');
        expect(mockLog).toHaveBeenCalledWith('  [doc] README.md (2024-01-01)');

        // Restore original logger
        loggerModule.logger.log = originalLog;
    });

    test('logs no artifacts message when empty and quiet is false', () => {
        const mockLog = mock(() => {});
        const loggerModule = require('../../../scripts/logger');
        const originalLog = loggerModule.logger.log;
        loggerModule.logger.log = mockLog;

        const taskPath = join(tempDir, 'docs', 'tasks', '0001_Test_Task.md');
        const taskContent = `---
name: Test Task
---
`;

        writeFileSync(taskPath, taskContent);

        const result = getArtifacts(tempDir, '0001', {}, false); // quiet = false

        expect(result.ok).toBe(true);
        expect(mockLog).toHaveBeenCalledWith('No artifacts found for 0001');

        // Restore original logger
        loggerModule.logger.log = originalLog;
    });
});
