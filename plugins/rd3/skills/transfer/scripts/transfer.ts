#!/usr/bin/env bun
import { readFileSync, writeFileSync, mkdirSync, statSync, existsSync } from "node:fs";
import { logger } from "../../../scripts/logger";
import type { TransferOptions, TransferDocument, GitDiff, TaskFileContext, TransferReason } from "./types";
import { generateTransferMarkdown, slugify } from "./template";

const TRANSFER_DIR = "docs/handovers";

function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  } else {
    const stat = statSync(path);
    if (!stat.isDirectory) {
      logger.error(`Path exists but is not a directory: ${path}`);
      process.exit(1);
    }
  }
}

function readTaskFile(filePath: string): TaskFileContext {
  try {
    const content = readFileSync(filePath, "utf-8");
    const context: TaskFileContext = {};

    // Simple frontmatter parsing
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const fm = frontmatterMatch[1];
      const goalMatch = fm.match(/^goal:\s*(.+)$/m);
      if (goalMatch) context.goal = goalMatch[1].trim();
      const statusMatch = fm.match(/^status:\s*(.+)$/m);
      if (statusMatch) context.status = statusMatch[1].trim();
    }

    // Extract sections by headers
    const goalMatch = content.match(/##\s*Goal\n\n([\s\S]*?)(?=\n##|\n---)/);
    if (goalMatch) context.goal = goalMatch[1].trim();

    const backgroundMatch = content.match(/##\s*Background\n\n([\s\S]*?)(?=\n##|\n---)/);
    if (backgroundMatch) context.background = backgroundMatch[1].trim();

    return context;
  } catch (error) {
    logger.warn(`Could not read task file ${filePath}: ${error}`);
    return {};
  }
}

async function getGitDiff(): Promise<GitDiff> {
  try {
    const proc = Bun.spawn(["git", "diff", "--stat", "--numstat"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      return { files: [], summary: { insertions: 0, deletions: 0, filesChanged: 0 } };
    }

    const files: GitDiff["files"] = [];
    let insertions = 0;
    let deletions = 0;

    for (const line of output.trim().split("\n")) {
      if (!line || line.includes("files changed")) continue;
      const parts = line.split("\t");
      if (parts.length >= 3) {
        const file = parts[2] || parts[1];
        const statusChar = parts[0].charAt(parts[0].length - 1);

        const isBinary = parts[0].includes("-");
        const ins = isBinary ? 0 : parseInt(parts[0].split(" ")[0]) || 0;
        const del = isBinary ? 0 : parseInt(parts[1].split(" ")[0]) || 0;

        let status: "added" | "modified" | "deleted" | "renamed" = "modified";
        if (file.includes("=>")) status = "renamed";
        else if (statusChar === "A" || file.startsWith("new file")) status = "added";
        else if (statusChar === "D") status = "deleted";

        files.push({ file, status, insertions: ins, deletions: del });
        insertions += ins;
        deletions += del;
      }
    }

    return {
      files,
      summary: { insertions, deletions, filesChanged: files.length },
    };
  } catch (error) {
    logger.warn(`Could not get git diff: ${error}`);
    return { files: [], summary: { insertions: 0, deletions: 0, filesChanged: 0 } };
  }
}

async function getGitStatus(): Promise<string[]> {
  try {
    const proc = Bun.spawn(["git", "status", "--porcelain"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    if (exitCode !== 0) return [];

    return output
      .trim()
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => line.slice(3).trim());
  } catch {
    return [];
  }
}

function parseArgs(): TransferOptions {
  const args = process.argv.slice(2);
  const options: TransferOptions = {
    description: "",
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--task" && i + 1 < args.length) {
      options.taskFile = args[++i];
    } else if (arg === "--goal" && i + 1 < args.length) {
      options.goal = args[++i];
    } else if (arg === "--progress" && i + 1 < args.length) {
      options.progress = args[++i];
    } else if (arg === "--reason" && i + 1 < args.length) {
      options.reason = args[++i] as TransferReason;
    } else if (arg === "--recommendation" && i + 1 < args.length) {
      options.recommendation = args[++i];
    } else if (!arg.startsWith("--")) {
      options.description = arg;
    }
  }

  return options;
}

export async function buildTransferDocument(options: TransferOptions): Promise<TransferDocument> {
  const taskContext = options.taskFile ? readTaskFile(options.taskFile) : {};
  const gitDiff = await getGitDiff();
  const relatedFiles = await getGitStatus();

  const doc: TransferDocument = {
    description: options.description,
    goal: options.goal || taskContext.goal || "",
    progress: options.progress || taskContext.background || "",
    sourceCodeChanges: gitDiff.files,
    reason: options.reason ?? "other",
    recommendation: options.recommendation || "",
    environment: undefined,
    relatedFiles: relatedFiles.length > 0 ? relatedFiles : undefined,
    taskFile: options.taskFile,
    generatedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
  };

  return doc;
}

export async function main(): Promise<void> {
  const options = parseArgs();

  if (!options.description) {
    logger.error("Description is required. Usage: transfer.ts <description> [--task <file>]");
    process.exit(1);
  }

  ensureDir(TRANSFER_DIR);

  const doc = await buildTransferDocument(options);
  const markdown = generateTransferMarkdown(doc);

  const slug = slugify(options.description);
  const filename = `${new Date().toISOString().slice(0, 10)}-transfer-${slug}.md`;
  const filepath = `${TRANSFER_DIR}/${filename}`;

  writeFileSync(filepath, markdown, "utf-8");

  logger.info(`Transfer document created: ${filepath}`);
  console.log(`\n${markdown}\n`);
}

if (import.meta.main) {
  main().catch((error) => {
    logger.error(`Transfer failed: ${error}`);
    process.exit(1);
  });
}
