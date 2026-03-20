import { describe, expect, it } from "bun:test";

import {
  EVOLUTION_CHANGE_TYPES,
  EVOLUTION_COMMANDS,
  EVOLUTION_DATA_SOURCES,
  EVOLUTION_PATTERN_TYPES,
  EVOLUTION_SAFETY_LEVELS,
  type EvolutionPattern,
  type EvolutionProposal,
  type EvolutionResult,
  type EvolutionRunOptionsBase,
} from "../scripts/evolution-contract";

describe("evolution contract", () => {
  it("defines the shared evolve command surface", () => {
    expect(EVOLUTION_COMMANDS).toEqual(["analyze", "propose", "apply", "history", "rollback"]);
    expect(EVOLUTION_SAFETY_LEVELS).toEqual(["L1", "L2", "L3"]);
  });

  it("defines the shared evolution data sources and pattern taxonomy", () => {
    expect(EVOLUTION_DATA_SOURCES).toContain("git-history");
    expect(EVOLUTION_DATA_SOURCES).toContain("interaction-logs");
    expect(EVOLUTION_PATTERN_TYPES).toContain("gap");
    expect(EVOLUTION_CHANGE_TYPES).toContain("modify");
  });

  it("supports the shared proposal and result shape", () => {
    const proposal: EvolutionProposal = {
      id: "p1",
      targetSection: "workflow",
      changeType: "modify",
      description: "Tighten the workflow steps",
      rationale: "Repeated failures suggest the current workflow is vague",
      source: "git-history",
      confidence: 0.8,
      affectsCritical: false,
    };

    const result: EvolutionResult = {
      filePath: "/tmp/example.md",
      sourcesUsed: ["git-history"],
      proposals: [proposal],
      currentGrade: "C",
      predictedGrade: "B",
      safetyWarnings: [],
      timestamp: new Date().toISOString(),
    };

    expect(result.proposals[0]?.changeType).toBe("modify");
    expect(result.currentGrade).toBe("C");
    expect(result.predictedGrade).toBe("B");
  });

  it("supports the shared analysis and run option base types", () => {
    const pattern: EvolutionPattern = {
      type: "gap",
      source: "ci-results",
      description: "Coverage instructions are missing",
      evidence: ["Repeated CI failures mention uncovered cases"],
      confidence: 0.6,
      affectedSection: "testing",
    };

    const options: EvolutionRunOptionsBase = {
      command: "propose",
      safetyLevel: "L1",
      confirm: false,
    };

    expect(pattern.affectedSection).toBe("testing");
    expect(options.command).toBe("propose");
    expect(options.safetyLevel).toBe("L1");
  });
});
