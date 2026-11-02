/** Weekly opening hours: day 1 = Monday … 7 = Sunday; minutes from midnight, end may exceed 1440 (past midnight). */
export interface DayHours { day: number; intervals: Array<[number, number]> }
export type BusinessState = "operational" | "temporarily_closed" | "permanently_closed" | "unknown";
export interface PlaceHours { state: BusinessState; week: DayHours[] }

export type OpenStatus =
  | { kind: "open"; closesAt: string }
  | { kind: "closing_soon"; closesAt: string; minutes: number }
  | { kind: "opening_soon"; opensAt: string; minutes: number }
  | { kind: "closed"; opensAt?: string | undefined; opensDay?: string | undefined }
  | { kind: "temporarily_closed" }
  | { kind: "permanently_closed" }
  | { kind: "unlisted" };

export const SOON_MINUTES = 60;
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function formatClock(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${suffix}`;
}

/** Compare the place's weekly hours against the given local time. */
export function computeOpenStatus(hours: PlaceHours | null | undefined, now = new Date()): OpenStatus {
  if (!hours) return { kind: "unlisted" };
  if (hours.state === "permanently_closed") return { kind: "permanently_closed" };
  if (hours.state === "temporarily_closed") return { kind: "temporarily_closed" };
  const byDay = new Map(hours.week.map((d) => [d.day, d.intervals]));
  if (byDay.size === 0) return { kind: "unlisted" };

  const today = ((now.getDay() + 6) % 7) + 1;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const dayAt = (offset: number) => ((today - 1 + offset + 7 * 10) % 7) + 1;

  // Open now? Check today's intervals and yesterday's past-midnight spill-over.
  const candidates: Array<[number, number]> = [
    ...(byDay.get(today) ?? []),
    ...(byDay.get(dayAt(-1)) ?? []).map(([s, e]) => [s - 1440, e - 1440] as [number, number]),
  ];
  for (const [s, e] of candidates) {
    if (nowMin >= s && nowMin < e) {
      const left = e - nowMin;
      return left <= SOON_MINUTES
        ? { kind: "closing_soon", closesAt: formatClock(e), minutes: left }
        : { kind: "open", closesAt: formatClock(e) };
    }
  }

  // Next opening within the coming week.
  for (let offset = 0; offset <= 7; offset++) {
    const starts = (byDay.get(dayAt(offset)) ?? []).map(([s]) => s + offset * 1440).filter((s) => s > nowMin).sort((a, b) => a - b);
    const next = starts[0];
    if (next === undefined) continue;
    const wait = next - nowMin;
    if (wait <= SOON_MINUTES) return { kind: "opening_soon", opensAt: formatClock(next), minutes: wait };
    return { kind: "closed", opensAt: formatClock(next), opensDay: offset === 0 ? "today" : offset === 1 ? "tomorrow" : DAY_NAMES[dayAt(offset) - 1] };
  }
  return { kind: "closed" };
}

export function describeStatus(s: OpenStatus): string {
  switch (s.kind) {
    case "open": return `Might be open · closes ${s.closesAt}`;
    case "closing_soon": return `Closing soon · closes ${s.closesAt}`;
    case "opening_soon": return `Opening soon · opens ${s.opensAt}`;
    case "closed": return s.opensAt ? `Closed · opens ${s.opensDay} ${s.opensAt}` : "Closed";
    case "temporarily_closed": return "Temporarily closed";
    case "permanently_closed": return "Permanently closed";
    case "unlisted": return "Hours unlisted";
  }
}
