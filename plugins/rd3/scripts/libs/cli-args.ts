/**
 * Shared CLI argument parsing utilities.
 *
 * Thin wrapper around `node:util` parseArgs that replaces hand-rolled
 * for-loop parsing across deep-research scripts.
 */

import { parseArgs } from "node:util";
import { logger } from "../logger";

export interface CliOption {
  type: "string" | "boolean";
  short?: string;
  required?: boolean;
  default?: string | boolean;
}

export interface CliSpec {
  name: string;
  description: string;
  options: Record<string, CliOption>;
  allowPositionals?: boolean;
  examples?: string[];
}

export interface ParsedCli {
  values: Record<string, string | boolean | undefined>;
  positionals: string[];
}

/**
 * Format a usage string from a CLI spec.
 */
export function formatUsage(spec: CliSpec): string {
  const lines: string[] = [];
  lines.push(`Usage: ${spec.name} [options]${spec.allowPositionals ? " [args...]" : ""}`);
  lines.push(`\n${spec.description}`);
  lines.push("\nOptions:");

  for (const [name, opt] of Object.entries(spec.options)) {
    const shortFlag = opt.short ? `-${opt.short}, ` : "    ";
    const required = opt.required ? " (required)" : "";
    const defaultVal =
      opt.default !== undefined ? ` (default: ${JSON.stringify(opt.default)})` : "";
    lines.push(`  ${shortFlag}--${name}  <${opt.type}>${required}${defaultVal}`);
  }

  lines.push("      --help, -h  Show this help message");

  if (spec.examples && spec.examples.length > 0) {
    lines.push("\nExamples:");
    for (const example of spec.examples) {
      lines.push(`  ${example}`);
    }
  }

  return lines.join("\n");
}

/**
 * Parse CLI arguments according to a spec.
 *
 * - Handles --help/-h automatically (prints usage, exits 0)
 * - Validates required options (prints error, exits 1)
 * - Applies default values
 *
 * Pass `argv` for testing; defaults to `process.argv.slice(2)`.
 */
export function parseCli(spec: CliSpec, argv?: string[]): ParsedCli {
  const args = argv ?? process.argv.slice(2);

  // Check for --help/-h before parsing (to avoid strict mode errors)
  if (args.includes("--help") || args.includes("-h")) {
    logger.log(formatUsage(spec));
    process.exit(0);
  }

  // Build parseArgs options
  const options: Record<string, { type: "string" | "boolean"; short?: string }> = {};
  for (const [name, opt] of Object.entries(spec.options)) {
    options[name] = { type: opt.type };
    if (opt.short) {
      options[name].short = opt.short;
    }
  }

  const parsed = parseArgs({
    args,
    options,
    allowPositionals: spec.allowPositionals ?? false,
    strict: true,
  });

  // Apply defaults and validate required
  const values: Record<string, string | boolean | undefined> = { ...parsed.values };

  for (const [name, opt] of Object.entries(spec.options)) {
    if (values[name] === undefined && opt.default !== undefined) {
      values[name] = opt.default;
    }

    if (opt.required && (values[name] === undefined || values[name] === "")) {
      logger.error(`Error: --${name} is required`);
      logger.log(formatUsage(spec));
      process.exit(1);
    }
  }

  return {
    values,
    positionals: parsed.positionals,
  };
}
