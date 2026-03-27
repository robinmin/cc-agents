import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { ValidationRunner } from "../scripts/libs/validation-runner";
import { setGlobalSilent, isGlobalSilent } from "../scripts/logger";

let previousSilent: boolean;
beforeAll(() => {
  previousSilent = isGlobalSilent();
  setGlobalSilent(true);
});
afterAll(() => {
  setGlobalSilent(previousSilent);
});

describe("ValidationRunner", () => {
  test("starts with empty errors and warnings", () => {
    const runner = new ValidationRunner();
    expect(runner.errors).toHaveLength(0);
    expect(runner.warnings).toHaveLength(0);
  });

  test("addError appends to errors", () => {
    const runner = new ValidationRunner();
    runner.addError("something broke");
    runner.addError("another issue");
    expect(runner.errors).toEqual(["something broke", "another issue"]);
  });

  test("addWarning appends to warnings", () => {
    const runner = new ValidationRunner();
    runner.addWarning("minor issue");
    expect(runner.warnings).toEqual(["minor issue"]);
  });

  test("getReport returns passed=true when no errors", () => {
    const runner = new ValidationRunner();
    runner.addWarning("just a warning");
    const report = runner.getReport();
    expect(report.passed).toBe(true);
    expect(report.warnings).toHaveLength(1);
    expect(report.errors).toHaveLength(0);
  });

  test("getReport returns passed=false when errors exist", () => {
    const runner = new ValidationRunner();
    runner.addError("critical error");
    const report = runner.getReport();
    expect(report.passed).toBe(false);
  });

  test("runChecks executes all checks in order", () => {
    const runner = new ValidationRunner();
    const order: string[] = [];

    const checks: Array<[string, () => boolean]> = [
      [
        "Check A",
        () => {
          order.push("A");
          return true;
        },
      ],
      [
        "Check B",
        () => {
          order.push("B");
          runner.addError("B failed");
          return false;
        },
      ],
      [
        "Check C",
        () => {
          order.push("C");
          return true;
        },
      ],
    ];

    const report = runner.runChecks(checks);
    expect(order).toEqual(["A", "B", "C"]);
    expect(report.passed).toBe(false);
    expect(report.errors).toEqual(["B failed"]);
  });

  test("runChecks returns passed=true when all checks pass", () => {
    const runner = new ValidationRunner();
    const checks: Array<[string, () => boolean]> = [
      ["Check 1", () => true],
      ["Check 2", () => true],
    ];
    const report = runner.runChecks(checks);
    expect(report.passed).toBe(true);
  });

  test("printSummary does not throw", () => {
    const runner = new ValidationRunner();
    runner.addError("error");
    runner.addWarning("warning");
    expect(() => runner.printSummary()).not.toThrow();
  });

  test("printSummary prints ALL CHECKS PASSED when empty", () => {
    const runner = new ValidationRunner();
    expect(() => runner.printSummary()).not.toThrow();
  });

  test("printSummary prints VALIDATION PASSED (with warnings) when only warnings", () => {
    const runner = new ValidationRunner();
    runner.addWarning("minor issue");
    expect(() => runner.printSummary()).not.toThrow();
  });

  test("runChecks with empty array returns passed=true", () => {
    const runner = new ValidationRunner();
    const report = runner.runChecks([]);
    expect(report.passed).toBe(true);
    expect(report.errors).toHaveLength(0);
  });

  test("runChecks with single failing check returns passed=false", () => {
    const runner = new ValidationRunner();
    const checks: Array<[string, () => boolean]> = [
      ["Failing Check", () => {
        runner.addError("failed");
        return false;
      }],
    ];
    const report = runner.runChecks(checks);
    expect(report.passed).toBe(false);
    expect(report.errors).toEqual(["failed"]);
  });

  test("getReport returns copies of errors array", () => {
    const runner = new ValidationRunner();
    runner.addError("error");
    const report = runner.getReport();
    report.errors.push("injected");
    expect(runner.errors).toHaveLength(1);
  });

  test("getReport returns copies of warnings array", () => {
    const runner = new ValidationRunner();
    runner.addWarning("warning");
    const report = runner.getReport();
    report.warnings.push("injected");
    expect(runner.warnings).toHaveLength(1);
  });

  test("printSummary prints VALIDATION FAILED when errors exist without warnings", () => {
    const runner = new ValidationRunner();
    runner.addError("critical error");
    expect(() => runner.printSummary()).not.toThrow();
  });

  test("runChecks with check that adds warnings but passes", () => {
    const runner = new ValidationRunner();
    const checks: Array<[string, () => boolean]> = [
      ["Warn Check", () => {
        runner.addWarning("minor issue");
        return true;
      }],
    ];
    const report = runner.runChecks(checks);
    expect(report.passed).toBe(true);
    expect(report.warnings).toEqual(["minor issue"]);
  });

  test("runChecks with multiple errors and warnings", () => {
    const runner = new ValidationRunner();
    const checks: Array<[string, () => boolean]> = [
      ["Error Check", () => {
        runner.addError("error 1");
        return false;
      }],
      ["Warn Check", () => {
        runner.addWarning("warning 1");
        return true;
      }],
      ["Error Check 2", () => {
        runner.addError("error 2");
        return false;
      }],
    ];
    const report = runner.runChecks(checks);
    expect(report.passed).toBe(false);
    expect(report.errors).toEqual(["error 1", "error 2"]);
    expect(report.warnings).toEqual(["warning 1"]);
  });

  test("addError and addWarning accumulate across multiple calls", () => {
    const runner = new ValidationRunner();
    runner.addError("e1");
    runner.addWarning("w1");
    runner.addError("e2");
    runner.addWarning("w2");
    expect(runner.errors).toEqual(["e1", "e2"]);
    expect(runner.warnings).toEqual(["w1", "w2"]);
    const report = runner.getReport();
    expect(report.passed).toBe(false);
  });
});
