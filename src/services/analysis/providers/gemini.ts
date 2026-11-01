import "server-only";
import { AnalysisError, type AnalysisProvider, type TokenUsage } from "../provider";

/**
 * Google Gemini API (Google AI Studio key, free tier). Docs: https://ai.google.dev/gemini-api/docs
 * Free-tier quotas change often: check AI Studio for the limits that apply to your project.
 */
const DEFAULT_BASE = "https://generativelanguage.googleapis.com/v1beta";
/** Generation can take a while on free tiers (especially "thinking" models). Keep below the route's maxDuration (60 s). */
function generateTimeoutMs(): number {
  const n = Number(process.env.GEMINI_TIMEOUT_MS);
  return Number.isFinite(n) && n >= 5_000 ? Math.min(n, 55_000) : 45_000;
}
const CHECK_TIMEOUT_MS = 10_000;

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new AnalysisError("GEMINI_API_KEY is not set. Create a key in Google AI Studio and add it to .env.local.", "NOT_CONFIGURED", 503);
  }
  return key;
}

interface ModelList {
  models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
}

interface GeminiBody {
  candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number; totalTokenCount?: number };
  error?: { code?: number; message?: string; status?: string };
}

function thinkingBudget(): number | null {
  const raw = process.env.GEMINI_THINKING_BUDGET?.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function mapHttpError(status: number, body: GeminiBody | null): AnalysisError {
  const msg = body?.error?.message ?? "";
  if (status === 429) {
    return new AnalysisError("Gemini free quota is used up or too many requests were sent. Try again later.", "QUOTA", 429);
  }
  if (status === 400 && /api key/i.test(msg)) return new AnalysisError("GEMINI_API_KEY is invalid.", "NOT_CONFIGURED", 503);
  if (status === 401 || status === 403) return new AnalysisError("Gemini rejected the API key (invalid, restricted, or not allowed in this region).", "NOT_CONFIGURED", 503);
  if (status === 404) return new AnalysisError("The configured Gemini model was not found. Check GEMINI_MODEL.", "NOT_CONFIGURED", 503);
  return new AnalysisError(`Gemini responded with HTTP ${status}.`, "UPSTREAM_ERROR", 502);
}

export class GeminiProvider implements AnalysisProvider {
  readonly id = "gemini";
  readonly label = "GOOGLE GEMINI";

  get model(): string {
    return process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest";
  }
  private get base(): string {
    return process.env.GEMINI_API_BASE_URL?.trim() || DEFAULT_BASE;
  }

  private async call(url: string, init: RequestInit, timeoutMs: number): Promise<{ status: number; body: GeminiBody | null }> {
    try {
      const res = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
      return { status: res.status, body: (await res.json().catch(() => null)) as GeminiBody | null };
    } catch (e) {
      const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
      throw new AnalysisError(
        timedOut
          ? `Gemini did not answer within ${Math.round(timeoutMs / 1000)}s (model: ${this.model}). The model may be slow or spending too long "thinking": set GEMINI_MODEL to a Flash-Lite model and GEMINI_THINKING_BUDGET=0, or check that your network can reach generativelanguage.googleapis.com.`
          : "Could not reach Gemini. Check your network, proxy or firewall.",
        timedOut ? "UPSTREAM_TIMEOUT" : "UPSTREAM_ERROR",
        timedOut ? 504 : 502,
      );
    }
  }

  async generateJson({ system, user }: { system: string; user: string }): Promise<{ text: string; usage: TokenUsage | null }> {
    const key = apiKey();
    const url = `${this.base}/models/${encodeURIComponent(this.model)}:generateContent`;
    const send = (withThinking: boolean) =>
      this.call(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        // Room for the model's own reasoning tokens as well as the JSON answer.
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          // Optional lever to cut hidden reasoning tokens (0 = off). Only some models accept it.
          ...(withThinking && thinkingBudget() !== null ? { thinkingConfig: { thinkingBudget: thinkingBudget() } } : {}),
        },
      }),
    }, generateTimeoutMs());

    let { status, body } = await send(true);
    // Some models reject the optional thinking setting: retry once without it instead of failing.
    if (status === 400 && thinkingBudget() !== null && /think/i.test(body?.error?.message ?? "")) {
      console.warn(`[gemini] ${this.model} rejected GEMINI_THINKING_BUDGET; retrying without it. Remove it from .env.local.`);
      ({ status, body } = await send(false));
    }
    if (status < 200 || status >= 300) throw await this.failure(status, body);

    if (body?.promptFeedback?.blockReason) {
      throw new AnalysisError(`Gemini blocked the request (${body.promptFeedback.blockReason}).`, "BAD_OUTPUT", 502);
    }
    const cand = body?.candidates?.[0];
    const text = (cand?.content?.parts ?? []).filter((p) => !p.thought).map((p) => p.text ?? "").join("").trim();
    if (!text) throw new AnalysisError("Gemini returned an empty answer.", "BAD_OUTPUT", 502);
    if (cand?.finishReason === "MAX_TOKENS") throw new AnalysisError("Gemini's answer was cut off. Try again.", "BAD_OUTPUT", 502);
    const u = body?.usageMetadata;
    const usage: TokenUsage | null = u
      ? {
          input: u.promptTokenCount ?? 0,
          output: u.candidatesTokenCount ?? 0,
          thoughts: u.thoughtsTokenCount ?? 0,
          total: u.totalTokenCount ?? (u.promptTokenCount ?? 0) + (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0),
        }
      : null;
    return { text, usage };
  }

  /** Maps an HTTP failure; for "model not found" it also lists the model names this key can use. */
  private async failure(status: number, body: GeminiBody | null): Promise<AnalysisError> {
    if (status !== 404) return mapHttpError(status, body);
    const names = await this.listUsableModels();
    const hint = names.length
      ? ` Models available to your key that can generate text: ${names.join(", ")}. Set GEMINI_MODEL to one of these.`
      : " Could not list the available models; check the names in Google AI Studio.";
    return new AnalysisError(`Gemini model "${this.model}" was not found.${hint}`, "NOT_CONFIGURED", 503);
  }

  private async listUsableModels(): Promise<string[]> {
    try {
      const { status, body } = await this.call(`${this.base}/models?pageSize=100`, { headers: { "x-goog-api-key": apiKey() } }, CHECK_TIMEOUT_MS);
      if (status !== 200) return [];
      const names = ((body as ModelList | null)?.models ?? [])
        .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m) => (m.name ?? "").replace(/^models\//, ""))
        .filter((n) => /^gemini-/.test(n));
      const flash = names.filter((n) => /flash/.test(n));
      return (flash.length ? flash : names).slice(0, 12);
    } catch {
      return [];
    }
  }

  /** Reads model metadata only: validates the key and model name without generating text. */
  async checkAccess(): Promise<{ detail: string }> {
    const key = apiKey();
    const { status, body } = await this.call(`${this.base}/models/${encodeURIComponent(this.model)}`, {
      headers: { "x-goog-api-key": key },
    }, CHECK_TIMEOUT_MS);
    if (status < 200 || status >= 300) throw await this.failure(status, body);
    return { detail: `Key accepted, model "${this.model}" is available.` };
  }
}
