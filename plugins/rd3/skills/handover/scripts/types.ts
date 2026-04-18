export interface HandoverDocument {
  description: string;
  goal: string;
  progress: string;
  sourceCodeChanges: SourceCodeChange[];
  blocker: string;
  rejectedApproaches: RejectedApproach[];
  nextSteps: string;
  environment: string | undefined;
  relatedFiles: string[] | undefined;
  taskFile: string | undefined;
  generatedAt: string;
}

export interface SourceCodeChange {
  file: string;
  status: "added" | "modified" | "deleted" | "renamed";
  insertions?: number;
  deletions?: number;
}

export interface RejectedApproach {
  approach: string;
  reason: string;
}

export interface HandoverOptions {
  description: string;
  taskFile?: string;
  goal?: string;
  progress?: string;
  blocker?: string;
  rejectedApproaches?: RejectedApproach[];
  nextSteps?: string;
  environment?: string;
}

export interface GitDiff {
  files: SourceCodeChange[];
  summary: {
    insertions: number;
    deletions: number;
    filesChanged: number;
  };
}

export interface TaskFileContext {
  goal?: string;
  background?: string;
  requirements?: string[];
  status?: string;
  wbs?: string;
}
