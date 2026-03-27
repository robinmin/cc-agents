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

  test("getReport returns copies of arrays", () => {
    const runner = new ValidationRunner();
    runner.addError("error");
    const report = runner.getReport();
    report.errors.push("injected");
    expect(runner.errors).toHaveLength(1);
  });
});
