import "server-only";
import { MarketDataError } from "@/services/market-data/provider";
import { YAHOO_MODULES, normalizeYahooFundamentals, type QuoteSummaryResponse, type RawFundamentals } from "./normalizers/yahoo";

/**
 * Yahoo quoteSummary (unofficial). Unlike the chart endpoint it needs a session cookie + "crumb".
 * Not verified against the live service from the build sandbox: check /health ("Fundamentals BBCA").
 */
const UA = "Mozilla/5.0 (compatible; MarketInsight/0.1)";
const TIMEOUT_MS = 8000;
const SESSION_TTL_MS = 55 * 60_000;

interface Session {
  cookie: string;
  crumb: string;
  at: number;
}
let session: Session | null = null;
let pending: Promise<Session> | null = null;

async function request(url: string, headers: Record<string, string> = {}, redirect: RequestRedirect = "follow"): Promise<Response> {
  try {
    return await fetch(url, { cache: "no-store", redirect, signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "User-Agent": UA, ...headers } });
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    throw new MarketDataError(
      timedOut ? "Fundamentals provider timed out" : "Could not reach the fundamentals provider",
      timedOut ? "UPSTREAM_TIMEOUT" : "UPSTREAM_ERROR",
      504,
    );
  }
}

async function createSession(): Promise<Session> {
  const home = await request("https://fc.yahoo.com", {}, "manual");
  const cookie = home.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .filter(Boolean)
    .join("; ");
  if (!cookie) throw new MarketDataError("Yahoo did not issue a session cookie", "UPSTREAM_ERROR");

  const res = await request("https://query1.finance.yahoo.com/v1/test/getcrumb", { Cookie: cookie });
  if (!res.ok) throw new MarketDataError(`Yahoo crumb request failed (HTTP ${res.status})`, "UPSTREAM_ERROR");
  const crumb = (await res.text()).trim();
  if (!crumb || crumb.includes("<") || crumb.length > 64) throw new MarketDataError("Yahoo returned an invalid crumb", "UPSTREAM_ERROR");
  return { cookie, crumb, at: Date.now() };
}

async function getSession(force = false): Promise<Session> {
  if (!force && session && Date.now() - session.at < SESSION_TTL_MS) return session;
  pending ??= createSession()
    .then((s) => (session = s))
    .finally(() => {
      pending = null;
    });
  return pending;
}

export async function fetchYahooFundamentals(symbol: string): Promise<RawFundamentals> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const s = await getSession(attempt > 0);
    const url =
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(`${symbol}.JK`)}` +
      `?modules=${YAHOO_MODULES.join(",")}&crumb=${encodeURIComponent(s.crumb)}`;
    const res = await request(url, { Cookie: s.cookie });
    if ((res.status === 401 || res.status === 403) && attempt === 0) {
      session = null; // stale crumb: retry once with a fresh session
      continue;
    }
    if (res.status === 404) throw new MarketDataError(`${symbol} not found on Yahoo Finance`, "NOT_FOUND", 404);
    if (res.status === 401 || res.status === 403) {
      throw new MarketDataError("Yahoo rejected the fundamentals request (blocked or crumb invalid)", "UPSTREAM_ERROR");
    }
    if (!res.ok) throw new MarketDataError(`Fundamentals provider responded with HTTP ${res.status}`, "UPSTREAM_ERROR");
    return normalizeYahooFundamentals((await res.json()) as QuoteSummaryResponse, symbol);
  }
  throw new MarketDataError("Could not establish a Yahoo session", "UPSTREAM_ERROR");
}
