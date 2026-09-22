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

export type ContributionDay = { date: string; level: number };
export type Contributions = { days: ContributionDay[] };

// The public contributions calendar needs no token; parse it at build time.
export async function getContributions(): Promise<Contributions> {
  try {
    const res = await fetch(`https://github.com/users/${USER}/contributions`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { days: [] };
    const html = await res.text();
    const days = [...html.matchAll(/<td[^>]*ContributionCalendar-day[^>]*>/g)]
      .map(([td]) => ({
        date: td.match(/data-date="([\d-]+)"/)?.[1] ?? "",
        level: Number(td.match(/data-level="(\d)"/)?.[1] ?? 0),
      }))
      .filter((d) => d.date)
      .sort((a, b) => a.date.localeCompare(b.date));
    return { days };
  } catch {
    return { days: [] };
  }
}
