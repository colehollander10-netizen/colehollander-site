const USER = "colehollander10-netizen";
const HIDDEN = new Set([
  "colehollander-site",
  USER,
  "orderdesk-kb",
  "finn-waitlist",
]);

export type GitHubProfile = {
  login: string;
  name: string;
  bio: string;
  avatar: string;
  location: string;
  publicRepos: number;
  repos: { name: string; description: string; language: string | null }[];
};

// Snapshot from 2026-09-22 (after the profile cleanup), used when the build cannot reach the GitHub API.
const SNAPSHOT: GitHubProfile = {
  login: USER,
  name: "Cole Hollander",
  bio: "Testing the latest AI models at Order Desk.",
  avatar: "https://avatars.githubusercontent.com/u/241008441?v=4",
  location: "Boise, ID",
  publicRepos: 4,
  repos: [
    {
      name: "lidfold",
      description: "The iPhone Duo fold effect for your MacBook lid.",
      language: "Swift",
    },
    {
      name: "canvas-student-mcp-server",
      description: "MCP server for Canvas LMS",
      language: "JavaScript",
    },
  ],
};

const firstSentence = (text: string | null) =>
  (text ?? "").split(/(?<=\.)\s/)[0].replace(/\s*—.*$/, "");

// Runs at build time; the static export bakes the result into the page.
export async function getGitHubProfile(): Promise<GitHubProfile> {
  try {
    const headers = { Accept: "application/vnd.github+json" };
    // Rebuilds reuse cached fetches; expire them fast so profile changes show up.
    const next = { revalidate: 60 };
    const [user, repos] = await Promise.all([
      fetch(`https://api.github.com/users/${USER}`, { headers, next }),
      fetch(
        `https://api.github.com/users/${USER}/repos?per_page=100&type=owner&sort=pushed`,
        { headers, next },
      ),
    ]);
    if (!user.ok || !repos.ok) return SNAPSHOT;
    const u = await user.json();
    const r: {
      name: string;
      description: string | null;
      language: string | null;
      fork: boolean;
    }[] = await repos.json();
    return {
      login: u.login,
      name: u.name ?? SNAPSHOT.name,
      bio: firstSentence(u.bio) || SNAPSHOT.bio,
      avatar: u.avatar_url,
      location: u.location ?? SNAPSHOT.location,
      publicRepos: u.public_repos,
      repos: r
        .filter((repo) => !repo.fork && !HIDDEN.has(repo.name))
        .slice(0, 3)
        .map((repo) => ({
          name: repo.name,
          description: firstSentence(repo.description),
          language: repo.language,
        })),
    };
  } catch {
    return SNAPSHOT;
  }
}

export type ContributionDay = { date: string; level: number };
export type Contributions = { total: number | null; days: ContributionDay[] };

// The public contributions calendar needs no token; parse it at build time.
export async function getContributions(): Promise<Contributions> {
  try {
    const res = await fetch(`https://github.com/users/${USER}/contributions`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { total: null, days: [] };
    const html = await res.text();
    const days = [...html.matchAll(/<td[^>]*ContributionCalendar-day[^>]*>/g)]
      .map(([td]) => ({
        date: td.match(/data-date="([\d-]+)"/)?.[1] ?? "",
        level: Number(td.match(/data-level="(\d)"/)?.[1] ?? 0),
      }))
      .filter((d) => d.date)
      .sort((a, b) => a.date.localeCompare(b.date));
    const total = html.match(/([\d,]+)\s+contributions?\s+in the last year/);
    return {
      total: total ? Number(total[1].replace(/,/g, "")) : null,
      days,
    };
  } catch {
    return { total: null, days: [] };
  }
}
