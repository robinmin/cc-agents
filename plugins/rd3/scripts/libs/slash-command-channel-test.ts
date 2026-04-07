#!/usr/bin/env bun
/**
 * Slash Command Channel Verification Tests
 *
 * Verifies that acpx can execute slash commands on each supported channel.
 * This validates our translation assumptions before hardcoding them.
 *
 * Usage: bun run plugins/rd3/scripts/libs/slash-command-channel-test.ts
 */

import { execAcpxSync } from './acpx-query';

type ChannelTest = {
  channel: string;
  /** The slash command format to test (as acpx would receive it) */
  command: string;
  /** Expected behavior description */
  expectedBehavior: string;
};

const CHANNEL_TESTS: ChannelTest[] = [
  // Claude Code — canonical format
  {
    channel: 'claude-code',
    command: '/rd3:dev-fixall "echo test"',
    expectedBehavior: 'Direct slash command execution',
  },
  // PI — uses /skill: prefix
  {
    channel: 'pi',
    command: '/skill:rd3-dev-fixall "echo test"',
    expectedBehavior: 'Slash command via skill wrapper',
  },
  // Codex — uses $ prefix without slash
  {
    channel: 'codex',
    command: '$rd3-dev-fixall "echo test"',
    expectedBehavior: 'Dollar-prefixed command',
  },
  // OpenClaw — no prefix transformation needed
  {
    channel: 'openclaw',
    command: '/rd3-dev-fixall "echo test"',
    expectedBehavior: 'Standard slash format',
  },
  // OpenCode — no prefix transformation needed
  {
    channel: 'opencode',
    command: '/rd3-dev-fixall "echo test"',
    expectedBehavior: 'Standard slash format',
  },
  // Antigravity — no prefix transformation needed
  {
    channel: 'antigravity',
    command: '/rd3-dev-fixall "echo test"',
    expectedBehavior: 'Standard slash format',
  },
];

interface TestResult {
  channel: string;
  command: string;
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  notes: string;
}

function runChannelTest(test: ChannelTest): TestResult {
  const start = Date.now();

  console.log(`\nTesting ${test.channel}: ${test.command}`);

  // Build acpx exec command
  const args = [
    'acpx',
    '--format', 'quiet',
    '--timeout', '30', // 30 second timeout for tests
    test.channel,
    'exec',
    test.command,
  ];

  const result = execAcpxSync(args, 35_000);

  const success = result.ok && result.exitCode === 0;
  const notes = success
    ? '✓ Channel supports this command format'
    : result.timedOut
      ? '✗ Timed out — channel may not support this format'
      : `✗ Failed (${result.exitCode}) — ${result.stderr.slice(0, 100)}`;

  console.log(`  ${notes}`);

  return {
    channel: test.channel,
    command: test.command,
    success,
    exitCode: result.exitCode ?? -1,
    stdout: result.stdout.slice(0, 500),
    stderr: result.stderr.slice(0, 500),
    durationMs: Date.now() - start,
    notes,
  };
}

async function main(): Promise<void> {
  console.log('='.repeat(70));
  console.log('Slash Command Channel Verification Tests');
  console.log('='.repeat(70));
  console.log('\nThis test verifies acpx can execute slash commands on each channel.');
  console.log('Results will inform the translation map implementation.\n');

  const results: TestResult[] = [];

  for (const test of CHANNEL_TESTS) {
    try {
      const result = runChannelTest(test);
      results.push(result);
    } catch (err) {
      console.log(`  ✗ Error: ${err instanceof Error ? err.message : String(err)}`);
      results.push({
        channel: test.channel,
        command: test.command,
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: err instanceof Error ? err.message : String(err),
        durationMs: 0,
        notes: `Error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('Summary');
  console.log('='.repeat(70));

  const supported = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`\n✓ Supported: ${supported.length}/${results.length}`);
  for (const r of supported) {
    console.log(`  - ${r.channel}: ${r.command}`);
  }

  if (failed.length > 0) {
    console.log(`\n✗ Not Supported: ${failed.length}/${results.length}`);
    for (const r of failed) {
      console.log(`  - ${r.channel}: ${r.command}`);
      console.log(`    ${r.notes}`);
    }
  }

  // Output JSON for programmatic consumption
  console.log(`\n${'='.repeat(70)}`);
  console.log('JSON Output (for implementation)');
  console.log('='.repeat(70));
  console.log(JSON.stringify(results, null, 2));

  // Generate translation map from results
  console.log(`\n${'='.repeat(70)}`);
  console.log('Suggested Translation Map');
  console.log('='.repeat(70));

  const getTransformForChannel = (r: TestResult): string => {
    if (r.channel === 'claude-code') {
      return '(cmd) => cmd'; // Pass through
    } else if (r.channel === 'pi') {
      return "(cmd) => cmd.replace('rd3:', 'skill:rd3-')";
    } else if (r.channel === 'codex') {
      return "(cmd) => `$${cmd.replace('rd3:', '')}`";
    } else {
      return "(cmd) => cmd.replace('rd3:', '')";
    }
  };

  console.log('\nconst SLASH_COMMAND_TRANSFORMS: Record<string, (cmd: string) => string> = {');
  for (const r of results) {
    if (r.success) {
      console.log(`  '${r.channel}': ${getTransformForChannel(r)},`);
    }
  }
  console.log('};\n');

  // Exit with failure if any channel fails (to catch issues early)
  if (failed.length > 0) {
    console.log('\n⚠️  WARNING: Some channels failed. Review results above.');
  }
}

main().catch(console.error);
