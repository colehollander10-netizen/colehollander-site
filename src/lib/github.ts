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
  bio: "Student software builder focused on AI, automation, and real‑world SaaS.",
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
    // Rebuilds reuse cached fetches; expire them so repo changes show up.
    const next = { revalidate: 3600 };
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
