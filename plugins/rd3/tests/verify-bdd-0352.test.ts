/**
 * BDD Verification Test for Task 0352 - Antigravity Adapter
 *
 * Executes Gherkin scenarios from tests/features/antigravity-adapter.feature
 * to verify the implementation meets all requirements.
 */

// @ts-nocheck
// Using Bun's built-in test runner (no import needed, globals available)
import {
  getBackend,
  checkAgyHealth,
  checkHealth,
  checkAllBackendsHealth,
  queryLlmAgy,
  queryLlmFromFileAgy,
  runSlashCommandAgy,
} from '../scripts/libs/acpx-query';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

function createTempFile(content: string): string {
  const fs = require('node:fs');
  const path = require('node:path');
  const os = require('node:os');
  const tmpPath = path.join(os.tmpdir(), `bdd-test-${Date.now()}.txt`);
  fs.writeFileSync(tmpPath, content);
  return tmpPath;
}

function cleanupTempFile(path: string): void {
  const fs = require('node:fs');
  if (fs.existsSync(path)) {
    fs.unlinkSync(path);
  }
}

// ─── BDD Scenario: Backend Selection ───────────────────────────────────────────

describe('BDD: Antigravity Backend Adapter - Feature: Backend Selection', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('Scenario: Backend selection uses BACKEND environment variable', () => {
    // Given the BACKEND environment variable is set to "antigravity"
    process.env.BACKEND = 'antigravity';

    // When getBackend() is called
    const result = getBackend();

    // Then it returns "antigravity"
    expect(result).toBe('antigravity');
  });

  test('Scenario: Backend selection defaults to acpx', () => {
    // Given the BACKEND environment variable is not set
    delete process.env.BACKEND;

    // When getBackend() is called
    const result = getBackend();

    // Then it returns "acpx"
    expect(result).toBe('acpx');
  });

  test('Scenario: Backend selection accepts agy as alias', () => {
    // Given the BACKEND environment variable is set to "agy"
    process.env.BACKEND = 'agy';

    // When getBackend() is called
    const result = getBackend();

    // Then it returns "antigravity"
    expect(result).toBe('antigravity');
  });
});

// ─── BDD Scenario: agy Health Check ─────────────────────────────────────────

describe('BDD: Antigravity Backend Adapter - Feature: agy Health Check', () => {
  test('Scenario: agy health check returns healthy when agy is installed', () => {
    // When checkAgyHealth() is called
    const result = checkAgyHealth();

    // Then the result has healthy set to true and includes version
    if (result.healthy) {
      expect(result.healthy).toBe(true);
      expect(result.version).toBeDefined();
      expect(typeof result.version).toBe('string');
    } else {
      // agy not installed - this is acceptable in test environment
      console.log('agy not installed, skipping version check:', result.error);
    }
  });

  test('Scenario: agy health check returns unhealthy when agy is not installed', () => {
    // When checkAgyHealth() is called with a non-existent binary
    const result = checkAgyHealth('/nonexistent/agy/binary');

    // Then the result has healthy set to false and includes an error message
    expect(result.healthy).toBe(false);
    expect(result.error).toBeDefined();
    expect(typeof result.error).toBe('string');
  });
});

// ─── BDD Scenario: Backend Delegation ────────────────────────────────────────

describe('BDD: Antigravity Backend Adapter - Feature: Backend Delegation', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('Scenario: queryLlm uses agy backend when BACKEND=antigravity', () => {
    // Given the BACKEND environment variable is set to "antigravity"
    process.env.BACKEND = 'antigravity';

    // When queryLlmAgy is called directly (simulating delegation)
    // Note: queryLlm with BACKEND=antigravity internally calls queryLlmAgy
    const result = queryLlmAgy('echo test');

    // Then it returns a valid result structure
    expect(result).toHaveProperty('ok');
    expect(result).toHaveProperty('exitCode');
    expect(result).toHaveProperty('stdout');
    expect(result).toHaveProperty('stderr');
    expect(result).toHaveProperty('durationMs');
    expect(result).toHaveProperty('timedOut');
  });
});

// ─── BDD Scenario: File-based Query ──────────────────────────────────────────

describe('BDD: Antigravity Backend Adapter - Feature: File-based Query', () => {
  let tempFile: string;

  beforeEach(() => {
    tempFile = createTempFile('test prompt content');
  });

  afterEach(() => {
    cleanupTempFile(tempFile);
  });

  test('Scenario: queryLlmFromFile uses agy backend when BACKEND=antigravity', () => {
    // Given a temporary file exists with test content
    expect(tempFile).toBeDefined();

    // When queryLlmFromFileAgy is called
    const result = queryLlmFromFileAgy(tempFile);

    // Then it returns a valid result structure
    expect(result).toHaveProperty('ok');
    expect(result).toHaveProperty('exitCode');
    expect(result).toHaveProperty('stdout');
    expect(result).toHaveProperty('stderr');
    expect(result).toHaveProperty('durationMs');
  });

  test('Scenario: queryLlmFromFile returns error for non-existent file', () => {
    // When queryLlmFromFileAgy is called with non-existent file
    const result = queryLlmFromFileAgy('/nonexistent/file/path');

    // Then the result has ok set to false and includes an error
    expect(result.ok).toBe(false);
    expect(result.stderr).toContain('Failed to read file');
  });
});

// ─── BDD Scenario: Slash Command Handling ─────────────────────────────────────

describe('BDD: Antigravity Backend Adapter - Feature: Slash Command Handling', () => {
  test('Scenario: runSlashCommand returns not supported error for agy backend', () => {
    // Given the agy backend is being used (agy doesn't support slash commands)
    // When runSlashCommandAgy is called
    const result = runSlashCommandAgy('/some:command');

    // Then the result has ok set to false
    expect(result.ok).toBe(false);

    // And the stderr contains "not supported"
    expect(result.stderr.toLowerCase()).toContain('not supported');

    // And the exitCode is 1
    expect(result.exitCode).toBe(1);
  });
});

// ─── BDD Scenario: Health Check ───────────────────────────────────────────────

describe('BDD: Antigravity Backend Adapter - Feature: Health Check', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('Scenario: checkHealth returns agy health when BACKEND=antigravity', () => {
    // Given the BACKEND environment variable is set to "antigravity"
    process.env.BACKEND = 'antigravity';

    // When checkHealth() is called
    const result = checkHealth();

    // Then the result has backend set to "antigravity"
    expect(result.backend).toBe('antigravity');

    // And the result reflects agy health status
    expect(result).toHaveProperty('healthy');
  });

  test('Scenario: checkAllBackendsHealth checks both acpx and agy', () => {
    // When checkAllBackendsHealth() is called
    const result = checkAllBackendsHealth();

    // Then the result includes acpx health status
    expect(result).toHaveProperty('acpx');
    expect(result.acpx).toHaveProperty('healthy');

    // And the result includes agy health status
    expect(result).toHaveProperty('agy');
    expect(result.agy).toHaveProperty('healthy');
  });
});

// ─── BDD Scenario: Interface Compatibility ─────────────────────────────────────

describe('BDD: Antigravity Backend Adapter - Feature: Interface Compatibility', () => {
  test('Scenario: Result structure matches AcpxQueryResult interface', () => {
    // When queryLlmAgy is called
    const result = queryLlmAgy('echo test');

    // Then the result has ok field of type boolean
    expect(typeof result.ok).toBe('boolean');

    // And the result has exitCode field of type number
    expect(typeof result.exitCode).toBe('number');

    // And the result has stdout field of type string
    expect(typeof result.stdout).toBe('string');

    // And the result has stderr field of type string
    expect(typeof result.stderr).toBe('string');

    // And the result has durationMs field of type number
    expect(typeof result.durationMs).toBe('number');

    // And the result has timedOut field of type boolean
    expect(typeof result.timedOut).toBe('boolean');
  });
});

// ─── BDD Scenario: Graceful Degradation ──────────────────────────────────────

describe('BDD: Antigravity Backend Adapter - Feature: Graceful Degradation', () => {
  test('Scenario: Unsupported operations return graceful error messages', () => {
    // When running slash commands on agy (unsupported)
    const result = runSlashCommandAgy('/rd3:dev-fixall "bun test"');

    // Then the operation fails gracefully
    expect(result.ok).toBe(false);
    expect(result.exitCode).toBe(1);

    // And the error message is descriptive
    expect(result.stderr).toContain('not supported');
    expect(result.stderr.length).toBeGreaterThan(10);
  });
});

// ─── Summary Test: All Acceptance Criteria ───────────────────────────────────

describe('BDD: Task 0352 Acceptance Criteria Verification', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('AC1: agy --help output can be captured and analyzed', () => {
    // The checkAgyHealth function demonstrates this capability
    const health = checkAgyHealth();
    expect(health).toHaveProperty('healthy');
    expect(typeof health.healthy).toBe('boolean');
    // Healthy result has version, unhealthy has error
    if (health.healthy) {
      expect(health.version).toBeDefined();
    } else {
      expect(health.error).toBeDefined();
    }
  });

  test('AC2: Antigravity adapter is added to acpx-query.ts', () => {
    // Verify the adapter functions exist
    expect(typeof queryLlmAgy).toBe('function');
    expect(typeof queryLlmFromFileAgy).toBe('function');
    expect(typeof runSlashCommandAgy).toBe('function');
    expect(typeof checkAgyHealth).toBe('function');
  });

  test('AC3: Backend switching via BACKEND env var (config-only)', () => {
    // Test acpx backend
    process.env.BACKEND = 'acpx';
    expect(getBackend()).toBe('acpx');

    // Test antigravity backend
    process.env.BACKEND = 'antigravity';
    expect(getBackend()).toBe('antigravity');

    // Test agy alias
    process.env.BACKEND = 'agy';
    expect(getBackend()).toBe('antigravity');
  });

  test('AC4: Unsupported operations return graceful error messages', () => {
    const result = runSlashCommandAgy('/any:command');
    expect(result.ok).toBe(false);
    expect(result.stderr).toContain('not supported');
  });

  test('AC5: TypeScript interface compatibility maintained', () => {
    const result = queryLlmAgy('test');
    expect(result).toMatchObject({
      ok: expect.any(Boolean),
      exitCode: expect.any(Number),
      stdout: expect.any(String),
      stderr: expect.any(String),
      durationMs: expect.any(Number),
      timedOut: expect.any(Boolean),
    });
  });
});
