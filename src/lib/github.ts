const USER = "colehollander10-netizen";

export type GitHubProfile = {
  login: string;
  location: string;
};

// Snapshot from 2026-09-22 (after the profile cleanup), used when the build cannot reach the GitHub API.
const SNAPSHOT: GitHubProfile = {
  login: USER,
  location: "Boise, ID",
};

// Runs at build time; the static export bakes the result into the page.
export async function getGitHubProfile(): Promise<GitHubProfile> {
  try {
    const headers = { Accept: "application/vnd.github+json" };
    // Rebuilds reuse cached fetches; expire them fast so profile changes show up.
    const next = { revalidate: 60 };
    const user = await fetch(`https://api.github.com/users/${USER}`, {
      headers,
      next,
    });
    if (!user.ok) return SNAPSHOT;
    const u = await user.json();
    return {
      login: u.login,
      location: u.location ?? SNAPSHOT.location,
    };
  } catch {
    return SNAPSHOT;
  }
}

export type ContributionDay = {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
};
export type RepoPushes = { name: string; count: number; href: string };
export type Contributions = { days: ContributionDay[]; repos: RepoPushes[] };

// The public contributions calendar needs no token; parse it at build time.
async function getCalendar(): Promise<ContributionDay[]> {
  const res = await fetch(`https://github.com/users/${USER}/contributions`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return [];
  const html = await res.text();
  // Counts live in sr-only tooltips ("3 contributions on …") keyed to each cell's id.
  const counts = new Map(
    [...html.matchAll(/<tool-tip[^>]*for="([^"]+)"[^>]*>([^<]*)</g)].map(
      ([, id, text]) => [id, Number(text.match(/^(\d+)/)?.[1] ?? 0)],
    ),
  );
  return [...html.matchAll(/<td[^>]*ContributionCalendar-day[^>]*>/g)]
    .map(([td]) => ({
      date: td.match(/data-date="([\d-]+)"/)?.[1] ?? "",
      count: counts.get(td.match(/id="([^"]+)"/)?.[1] ?? "") ?? 0,
      level: Math.min(4, Number(td.match(/data-level="(\d)"/)?.[1] ?? 0)) as ContributionDay["level"],
    }))
    .filter((d) => d.date)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Public events no longer list commits, so this counts pushes per repo.
async function getTopRepos(): Promise<RepoPushes[]> {
  const res = await fetch(
    `https://api.github.com/users/${USER}/events/public?per_page=100`,
    { headers: { Accept: "application/vnd.github+json" }, next: { revalidate: 60 } },
  );
  if (!res.ok) return [];
  const events: { type: string; repo?: { name: string } }[] = await res.json();
  const pushes = new Map<string, number>();
  for (const e of events) {
    if (e.type === "PushEvent" && e.repo) {
      pushes.set(e.repo.name, (pushes.get(e.repo.name) ?? 0) + 1);
    }
  }
  return [...pushes]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([full, count]) => ({
      name: full.split("/")[1],
      count,
      href: `https://github.com/${full}`,
    }));
}

export async function getContributions(): Promise<Contributions> {
  const [days, repos] = await Promise.all([
    getCalendar().catch(() => []),
    getTopRepos().catch(() => []),
  ]);
  return { days, repos };
}
