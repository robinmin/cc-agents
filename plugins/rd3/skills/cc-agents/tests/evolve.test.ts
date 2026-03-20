import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = "/tmp/cc-agents-evolve-test";
const __dirname = dirname(fileURLToPath(import.meta.url));
const EVOLVE_SCRIPT = join(__dirname, "..", "scripts", "evolve.ts");

describe("Integration: evolve command", () => {
  beforeEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("should show help", async () => {
    const proc = Bun.spawn(["bun", "run", EVOLVE_SCRIPT, "--help"], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
  });

  it("should analyze agent evolution signals", async () => {
    const agentPath = join(TEST_DIR, "test-agent.md");
    writeFileSync(
      agentPath,
      `---
name: test-agent
description: Use PROACTIVELY for placeholder evolution tests
---

# Test Agent
`,
      "utf-8",
    );

    const proc = Bun.spawn(["bun", "run", EVOLVE_SCRIPT, agentPath, "--analyze"], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const [exitCode, stdout, stderr] = await Promise.all([
      proc.exited,
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);

    expect(exitCode).toBe(0);
    expect(`${stdout}\n${stderr}`).toContain("Evolution Analysis");
  });

  it("should generate proposals, apply one, and roll back successfully", async () => {
    const agentPath = join(TEST_DIR, "test-agent.md");
    writeFileSync(
      agentPath,
      `---
name: test-agent
description: helper
---

# Test Agent
`,
      "utf-8",
    );

    const proposeProc = Bun.spawn(["bun", "run", EVOLVE_SCRIPT, agentPath, "--propose"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const proposeExit = await proposeProc.exited;
    expect(proposeExit).toBe(0);

    const proposalsPath = join(TEST_DIR, ".cc-agents", "evolution", "proposals", "test-agent.proposals.json");
    expect(existsSync(proposalsPath)).toBe(true);

    const proposalSet = JSON.parse(readFileSync(proposalsPath, "utf-8")) as {
      proposals: Array<{ id: string }>;
    };
    expect(proposalSet.proposals.length).toBeGreaterThan(0);

    const applyProc = Bun.spawn(
      ["bun", "run", EVOLVE_SCRIPT, agentPath, "--apply", proposalSet.proposals[0]!.id, "--confirm"],
      {
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const [applyExit, applyStdout, applyStderr] = await Promise.all([
      applyProc.exited,
      new Response(applyProc.stdout).text(),
      new Response(applyProc.stderr).text(),
    ]);

    expect(applyExit).toBe(0);
    expect(`${applyStdout}\n${applyStderr}`).toContain("applied successfully");

    const historyPath = join(TEST_DIR, ".cc-agents", "evolution", "versions", "test-agent.proposals.history.json");
    const fallbackHistoryPath = join(TEST_DIR, ".cc-agents", "evolution", "versions", "test-agent.history.json");
    expect(existsSync(historyPath) || existsSync(fallbackHistoryPath)).toBe(true);

    const rollbackProc = Bun.spawn(["bun", "run", EVOLVE_SCRIPT, agentPath, "--rollback", "v0", "--confirm"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const [rollbackExit, rollbackStdout, rollbackStderr] = await Promise.all([
      rollbackProc.exited,
      new Response(rollbackProc.stdout).text(),
      new Response(rollbackProc.stderr).text(),
    ]);

    expect(rollbackExit).toBe(0);
    expect(`${rollbackStdout}\n${rollbackStderr}`).toContain("Rolled back to v0 successfully");
  });
});
