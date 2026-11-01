export interface TokenUsage {
  input: number;
  output: number;
  /** Hidden reasoning tokens some models spend before answering (billed/quota-counted like output). */
  thoughts: number;
  total: number;
}

/** Implement this to plug in another AI vendor (Groq, OpenRouter, ...). */
export interface AnalysisProvider {
  readonly id: string;
  readonly label: string;
  readonly model: string;
  /** Sends the prompts and returns the model's raw JSON text. */
  generateJson(input: { system: string; user: string }): Promise<{ text: string; usage: TokenUsage | null }>;
  /** Cheap check that credentials and model are valid. Must not consume generation quota. */
  checkAccess(): Promise<{ detail: string }>;
}

export class AnalysisError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_CONFIGURED" | "QUOTA" | "RATE_LIMITED" | "UPSTREAM_ERROR" | "UPSTREAM_TIMEOUT" | "BAD_OUTPUT" | "BAD_REQUEST",
    public readonly status: number,
  ) {
    super(message);
    this.name = "AnalysisError";
  }
}
