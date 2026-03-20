export type Severity = "danger" | "warning" | "accent" | "success";

export interface ReviewIssue {
  line: number;
  column?: number;
  severity: Severity;
  rule: string;
  message: string;
  suggestion?: string;
}

export interface ReviewResult {
  id: string;
  filename: string;
  language: string;
  linesAnalysed: number;
  durationMs: number;
  issues: ReviewIssue[];
  createdAt: Date;
}

export interface ReviewRequest {
  code: string;
  language?: string;
  filename?: string;
}
