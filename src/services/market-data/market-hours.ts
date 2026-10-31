import type { MarketStatus } from "@/types/market";

/**
 * IDX regular trading hours (WIB, UTC+7, no DST).
 *   Mon–Thu: Session I 09:00–12:00, break 12:00–13:30, Session II 13:30–15:49 (pre-close to 16:00)
 *   Fri:     Session I 09:00–11:30, break 11:30–14:00, Session II 14:00–15:49 (pre-close to 16:00)
 * Public holidays are NOT modelled; on those days the status will read OPEN
 * during trading hours while the provider data stays flat. See README.
 */
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

export function toWib(date: Date): { day: number; minutes: number } {
  const wib = new Date(date.getTime() + WIB_OFFSET_MS);
  return { day: wib.getUTCDay(), minutes: wib.getUTCHours() * 60 + wib.getUTCMinutes() };
}

export function getMarketStatus(now: Date = new Date()): MarketStatus {
  const { day, minutes } = toWib(now);
  const closed: MarketStatus = { state: "CLOSED", session: "TUTUP", label: "IDX: CLOSED (WIB)" };
  if (day === 0 || day === 6) return closed;

  const isFriday = day === 5;
  const open = 9 * 60;
  const break1Start = isFriday ? 11 * 60 + 30 : 12 * 60;
  const break1End = isFriday ? 14 * 60 : 13 * 60 + 30;
  const close = 16 * 60;

  if (minutes >= open && minutes < break1Start) {
    return { state: "OPEN", session: "SESI I", label: "IDX: OPEN - SESI I (WIB)" };
  }
  if (minutes >= break1Start && minutes < break1End) {
    return { state: "BREAK", session: "ISTIRAHAT", label: "IDX: BREAK - ISTIRAHAT (WIB)" };
  }
  if (minutes >= break1End && minutes < close) {
    return { state: "OPEN", session: "SESI II", label: "IDX: OPEN - SESI II (WIB)" };
  }
  return closed;
}

export function isTradingNow(now: Date = new Date()): boolean {
  return getMarketStatus(now).state === "OPEN";
}
