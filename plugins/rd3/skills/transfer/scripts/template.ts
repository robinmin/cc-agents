import type { TransferDocument, SourceCodeChange } from "./types";

export function generateTransferMarkdown(doc: TransferDocument): string {
  const lines: string[] = [
    "# Transfer Document",
    "",
    `**Generated:** ${doc.generatedAt}`,
    doc.taskFile ? `**Task File:** ${doc.taskFile}` : "",
    "",
    "---",
    "",
    "## Description",
    "",
    doc.description,
    "",
    "---",
    "",
    "## Goal",
    "",
    doc.goal,
    "",
    "---",
    "",
    "## Progress",
    "",
    doc.progress,
    "",
    "---",
    "",
    "## Source Code Changes",
    "",
  ];

  if (doc.sourceCodeChanges.length === 0) {
    lines.push("*No source code changes detected.*");
  } else {
    lines.push("| File | Status | Changes |");
    lines.push("|------|--------|---------|");
    for (const change of doc.sourceCodeChanges) {
      const changes = formatChangeStats(change);
      lines.push(`| \`${change.file}\` | ${change.status} | ${changes} |`);
    }
  }

  lines.push("", "---", "", "## Reason", "", doc.reason, "", "---", "", "## Recommendation", "", doc.recommendation, "");

  if (doc.environment) {
    lines.push("---", "", "## Environment", "", doc.environment, "");
  }

  if (doc.relatedFiles && doc.relatedFiles.length > 0) {
    lines.push("---", "", "## Related Files", "");
    for (const file of doc.relatedFiles) {
      lines.push(`- \`${file}\``);
    }
  }

  return lines.join("\n");
}

function formatChangeStats(change: SourceCodeChange): string {
  if (change.status === "deleted") return "0 / 0";
  const ins = change.insertions ?? 0;
  const del = change.deletions ?? 0;
  return `+${ins} / -${del}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}
