#!/usr/bin/env bun
/**
 * Agent evolution workflow for rd3:cc-agents.
 *
 * This script provides a lightweight longitudinal improvement loop:
 * - analyze current evaluation quality and available data sources
 * - generate persisted refine-backed proposals
 * - apply proposals through deterministic refine.ts flows
 * - keep version history for safe rollback
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

import type {
  EvolutionAnalysis,
  EvolutionRunOptionsBase,
  EvolutionRunResultBase,
  EvolutionVersionSnapshot,
} from "../../../scripts/evolution-contract";
import {
  analyzeEvaluationReport,
  createBackup,
  formatAnalysis,
  formatHistory,
  formatProposals,
  getNextVersionId,
  generateRefineBackedProposals,
  loadProposalSet,
  loadVersionHistory,
  rollbackSingleFile,
  runScript,
  saveProposalSet,
  saveVersionSnapshot,
  type GenericEvaluationReport,
  type StoredProposalSet,
} from "../../../scripts/evolution-engine";
import { logger } from "../../../scripts/logger";
import { evaluateAgent } from "./evaluate";

const EVOLUTION_NAMESPACE = ".cc-agents";
const PLACEHOLDER_EXIT_CODE = 2;

type AgentPatternAnalysis = EvolutionAnalysis;

export interface AgentEvolveOptions extends EvolutionRunOptionsBase {
  agentPath: string;
}

export interface AgentEvolveRunResult
  extends EvolutionRunResultBase<AgentPatternAnalysis, StoredProposalSet, EvolutionVersionSnapshot<string>> {}

export function printUsage(): void {
  logger.log("Usage: evolve.ts <agent-path> --analyze|--propose|--apply <id>|--history|--rollback <ver>");
  logger.log("");
  logger.log("Arguments:");
  logger.log("  <agent-path>        Path to the agent .md file");
  logger.log("");
  logger.log("Commands:");
  logger.log("  --analyze           Analyze longitudinal improvement signals");
  logger.log("  --propose           Generate refine-backed improvement proposals");
  logger.log("  --apply <id>        Apply a saved proposal (requires --confirm)");
  logger.log("  --history           Show applied version history");
  logger.log("  --rollback <ver>    Restore a previous version (requires --confirm)");
  logger.log("");
  logger.log("Options:");
  logger.log("  --confirm           Required for apply and rollback");
  logger.log("  -h, --help          Show this help message");
}

function exitWithUsage(message: string): never {
  logger.error(message);
  printUsage();
  process.exit(1);
}

export function parseCliArgs(argv: string[] = process.argv.slice(2)): AgentEvolveOptions {
  const args = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      analyze: { type: "boolean", default: false },
      propose: { type: "boolean", default: false },
      apply: { type: "string", default: "" },
      history: { type: "boolean", default: false },
      rollback: { type: "string", default: "" },
      confirm: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (args.values.help) {
    printUsage();
    process.exit(0);
  }

  const agentPath = args.positionals[0];
  if (!agentPath) {
    exitWithUsage("Missing required argument <agent-path>.");
  }

  const resolvedPath = resolve(agentPath);
  if (!existsSync(resolvedPath)) {
    exitWithUsage(`Agent path does not exist: ${resolvedPath}`);
  }

  const commandFlags = [
    { active: args.values.analyze, command: "analyze" as const },
    { active: args.values.propose, command: "propose" as const },
    { active: Boolean(args.values.apply), command: "apply" as const },
    { active: args.values.history, command: "history" as const },
    { active: Boolean(args.values.rollback), command: "rollback" as const },
  ];

  const activeCommands = commandFlags.filter((entry) => entry.active);
  if (activeCommands.length !== 1) {
    exitWithUsage("Specify exactly one evolve command.");
  }

  return {
    agentPath: resolvedPath,
    command: activeCommands[0]!.command,
    proposalId: args.values.apply || undefined,
    versionId: args.values.rollback || undefined,
    confirm: args.values.confirm,
  };
}

async function buildEvaluationReport(agentPath: string): Promise<GenericEvaluationReport> {
  const report = await evaluateAgent(agentPath, "full");

  return {
    targetPath: report.agentPath,
    targetName: report.agentName,
    percentage: report.percentage,
    passed: report.passed,
    grade: report.grade,
    rejected: report.rejected,
    rejectReason: report.rejectReason,
    dimensions: report.dimensions.map((dimension) => ({
      name: dimension.name,
      displayName: dimension.displayName,
      score: dimension.score,
      maxScore: dimension.maxScore,
      findings: dimension.findings,
      recommendations: dimension.recommendations,
    })),
  };
}

async function analyzeAgent(agentPath: string): Promise<AgentPatternAnalysis> {
  const report = await buildEvaluationReport(agentPath);
  return analyzeEvaluationReport(report);
}

async function proposeAgentEvolution(agentPath: string): Promise<StoredProposalSet> {
  const report = await buildEvaluationReport(agentPath);
  const analysis = analyzeEvaluationReport(report);
  const proposalSet = generateRefineBackedProposals(report, analysis, {
    defaultFlags: ["--eval", "--best-practices"],
    migrateFlags: ["--migrate"],
    applySupported: true,
  });

  saveProposalSet(EVOLUTION_NAMESPACE, agentPath, proposalSet);
  return proposalSet;
}

async function applyAgentProposal(agentPath: string, proposalId?: string) {
  if (!proposalId) {
    return { success: false, error: "Proposal id is required" };
  }

  const proposalSet = loadProposalSet(EVOLUTION_NAMESPACE, agentPath);
  if (!proposalSet) {
    return { success: false, error: "No saved proposals found. Run --propose first." };
  }

  const proposal = proposalSet.proposals.find((entry) => entry.id === proposalId);
  if (!proposal) {
    return { success: false, error: `Proposal ${proposalId} not found` };
  }

  const baselineReport = await buildEvaluationReport(agentPath);
  let history = loadVersionHistory(EVOLUTION_NAMESPACE, agentPath);
  const currentContent = readFileSync(agentPath, "utf-8");
  const backupPath = createBackup(EVOLUTION_NAMESPACE, agentPath, currentContent);

  if (history.length === 0) {
    saveVersionSnapshot(EVOLUTION_NAMESPACE, agentPath, {
      version: "v0",
      timestamp: new Date().toISOString(),
      content: currentContent,
      grade: baselineReport.grade || "unknown",
      changeDescription: "Baseline before first evolve apply",
      proposalsApplied: [],
    });
    history = loadVersionHistory(EVOLUTION_NAMESPACE, agentPath);
  }

  const refineScript = join(import.meta.dir, "refine.ts");
  const refineResult = await runScript(refineScript, [agentPath, ...proposal.action.flags]);

  if (refineResult.exitCode !== 0) {
    return {
      success: false,
      backupPath,
      error: (refineResult.stderr || refineResult.stdout || "refine.ts failed").trim(),
    };
  }

  const updatedReport = await buildEvaluationReport(agentPath);
  const updatedContent = readFileSync(agentPath, "utf-8");
  const version = getNextVersionId(history);

  saveVersionSnapshot(EVOLUTION_NAMESPACE, agentPath, {
    version,
    timestamp: new Date().toISOString(),
    content: updatedContent,
    grade: updatedReport.grade || "unknown",
    changeDescription: proposal.description,
    proposalsApplied: [proposal.id],
  });

  return { success: true, backupPath };
}

export async function runEvolve(options: AgentEvolveOptions): Promise<AgentEvolveRunResult> {
  switch (options.command) {
    case "analyze":
      return { analysis: await analyzeAgent(options.agentPath) };
    case "propose":
      return { proposals: await proposeAgentEvolution(options.agentPath) };
    case "apply":
      return { applyResult: await applyAgentProposal(options.agentPath, options.proposalId) };
    case "history":
      return { versions: loadVersionHistory(EVOLUTION_NAMESPACE, options.agentPath) };
    case "rollback":
      if (!options.versionId) {
        return { rollbackResult: { success: false, error: "Version id is required" } };
      }
      return { rollbackResult: rollbackSingleFile(EVOLUTION_NAMESPACE, options.agentPath, options.versionId) };
    default:
      return {
        applyResult: {
          success: false,
          error: `Unsupported evolve command: ${String(options.command)}`,
        },
      };
  }
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseCliArgs(argv);

  if ((options.command === "apply" || options.command === "rollback") && !options.confirm) {
    logger.error(`--${options.command} requires --confirm for safety.`);
    process.exit(1);
  }

  const result = await runEvolve(options);

  if (result.analysis) {
    const report = await buildEvaluationReport(options.agentPath);
    logger.log(formatAnalysis(report, result.analysis));
    process.exit(0);
  }

  if (result.proposals) {
    logger.log(formatProposals(result.proposals));
    process.exit(0);
  }

  if (result.versions) {
    logger.log(formatHistory(result.versions));
    process.exit(0);
  }

  if (result.applyResult) {
    if (!result.applyResult.success) {
      logger.error(result.applyResult.error || "Failed to apply proposal");
      process.exit(1);
    }

    logger.log(`Proposal ${options.proposalId} applied successfully.`);
    if (result.applyResult.backupPath) {
      logger.log(`Backup created: ${result.applyResult.backupPath}`);
    }
    process.exit(0);
  }

  if (result.rollbackResult) {
    if (!result.rollbackResult.success) {
      logger.error(result.rollbackResult.error || "Failed to rollback version");
      process.exit(1);
    }

    logger.log(`Rolled back to ${options.versionId} successfully.`);
    process.exit(0);
  }

  logger.error("No evolve result produced.");
  process.exit(PLACEHOLDER_EXIT_CODE);
}

if (import.meta.main) {
  await main();
}
