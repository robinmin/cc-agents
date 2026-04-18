import type { HandoverDocument, SourceCodeChange } from "./types.ts";

export function generateHandoverMarkdown(doc: HandoverDocument): string {
  const lines: string[] = [
    "# Handover Document",
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

  lines.push("", "---", "", "## Blocker", "", doc.blocker, "", "---", "", "## Rejected Approaches", "");

  if (doc.rejectedApproaches.length === 0) {
    lines.push("*No approaches rejected yet.*");
  } else {
    for (const rejected of doc.rejectedApproaches) {
      lines.push(`### ${rejected.approach}`, "", rejected.reason, "");
    }
  }

  lines.push("---", "", "## Next Steps", "", doc.nextSteps, "");

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
