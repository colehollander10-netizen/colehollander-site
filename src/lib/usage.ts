export type UsageDay = {
  date: string;
  codex: number;
  claude: number;
  cursor: number;
};

const DAY = 86_400_000;
// Past six weeks the daily bars get too thin to hover, so the window slides.
const MAX_DAYS = 42;

const toTime = (date: string) => Date.parse(`${date}T00:00:00Z`);
const toDate = (time: number) => new Date(time).toISOString().slice(0, 10);

// Every calendar day from the first active one to the last, so the chart
// starts when the work started. Quiet days inside the range stay as zeros.
export function usageWindow(days: UsageDay[]): UsageDay[] {
  const active = days
    .filter((d) => d.codex + d.claude + d.cursor > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (active.length === 0) return [];

  const byDate = new Map(days.map((d) => [d.date, d]));
  const last = toTime(active[active.length - 1].date);
  const first = Math.max(toTime(active[0].date), last - (MAX_DAYS - 1) * DAY);

  const window: UsageDay[] = [];
  for (let t = first; t <= last; t += DAY) {
    const date = toDate(t);
    window.push(byDate.get(date) ?? { date, codex: 0, claude: 0, cursor: 0 });
  }
  return window;
}
