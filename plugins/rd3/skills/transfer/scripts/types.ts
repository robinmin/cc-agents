export type TransferReason =
  | "token_limit"
  | "expertise_mismatch"
  | "capacity"
  | "timezone"
  | "other";

export interface TransferDocument {
  description: string;
  goal: string;
  progress: string;
  sourceCodeChanges: SourceCodeChange[];
  reason: TransferReason;
  recommendation: string;
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

export interface TransferOptions {
  description: string;
  taskFile?: string;
  goal?: string;
  progress?: string;
  reason?: TransferReason;
  recommendation?: string;
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
