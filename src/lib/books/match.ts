import type { Candidate, Guess } from "./types";

// The confidence rules from the spec. A book is written without asking only
// when every one of these holds.
const THRESHOLDS = {
  vision: 0.8,
  title: 0.85,
  // The best match must beat the next different book by this much score.
  margin: 0.1,
};

export type Scored = Candidate & {
  titleScore: number;
  authorMatch: boolean;
  isbnMatch: boolean;
  score: number;
};

export type Decision =
  | { ok: true; match: Scored }
  | { ok: false; reasons: string[]; candidates: Scored[] };

// Lowercase ASCII words: no accents, punctuation, or apostrophes.
export function fold(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeTitle(s: string): string {
  return fold(s).replace(/^(the|a|an) /, "");
}

// "Prayer: Experiencing Awe…" -> "Prayer"
export function mainTitle(s: string): string {
  return s.split(/:|\(| - /)[0];
}

function levenshtein(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = row;
  }
  return prev[b.length];
}

// 1 for identical normalized titles, falling toward 0 with edit distance.
function similarity(a: string, b: string): number {
  const x = normalizeTitle(a);
  const y = normalizeTitle(b);
  if (!x || !y) return 0;
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length);
}

// Compares the full titles, and the main titles with a small penalty, so a
// guess without the subtitle still matches but an exact title wins ties
// (e.g. "Knowing God" over "Knowing God: Study Guide").
export function titleSimilarity(guess: string, title: string, subtitle: string | null): number {
  const full = subtitle ? `${title}: ${subtitle}` : title;
  return Math.max(similarity(guess, full), 0.95 * similarity(mainTitle(guess), mainTitle(full)));
}

// "Jonathan \"JP\" Pokluda" -> "pokluda", "Martin Luther King Jr." -> "king"
export function lastName(name: string): string {
  const words = fold(name.replace(/["“”][^"“”]*["“”]/g, " "))
    .split(" ")
    .filter((w) => w && !["jr", "sr", "ii", "iii", "phd", "dr"].includes(w));
  return words.at(-1) ?? "";
}

// True when any guessed author's last name is a word in a candidate author.
export function authorMatches(guessed: string[], found: string[]): boolean {
  const words = new Set(found.flatMap((a) => fold(a).split(" ")));
  return guessed.some((g) => {
    const last = lastName(g);
    return last.length > 1 && words.has(last);
  });
}

// ISBN-10s become ISBN-13s so either form compares equal.
export function toIsbn13(raw: string): string | null {
  const s = raw.replace(/[^0-9Xx]/g, "").toUpperCase();
  if (/^97[89]\d{10}$/.test(s)) return s;
  if (!/^\d{9}[\dX]$/.test(s)) return null;
  const body = `978${s.slice(0, 9)}`;
  const sum = [...body].reduce((t, d, i) => t + Number(d) * (i % 2 ? 3 : 1), 0);
  return body + ((10 - (sum % 10)) % 10);
}

function scoreCandidate(guess: Guess, c: Candidate): Scored {
  const titleScore = titleSimilarity(guess.title, c.title, c.subtitle);
  const authorMatch = authorMatches(guess.authors, c.authors);
  const want = guess.isbn ? toIsbn13(guess.isbn) : null;
  const isbnMatch = !!want && c.isbns.some((i) => toIsbn13(i) === want);
  return {
    ...c,
    titleScore,
    authorMatch,
    isbnMatch,
    score: titleScore + (authorMatch ? 0.5 : 0) + (isbnMatch ? 1 : 0),
  };
}

// Catalogs list one book under several records (reprints, study guides,
// audiobooks with the narrator as an author, translations crediting the
// translator). Records with the same main title and a shared author, or that
// both match the guessed author, are one book, so they never look like a
// rival for the margin check.
function sameBook(a: Scored, b: Scored): boolean {
  return (
    normalizeTitle(mainTitle(a.title)) === normalizeTitle(mainTitle(b.title)) &&
    ((a.authorMatch && b.authorMatch) ||
      authorMatches(a.authors, b.authors) ||
      authorMatches(b.authors, a.authors))
  );
}

// One entry per book, best first. A book is represented by the record whose
// ISBN matched, else the catalog's most relevant record (its canonical work,
// not a study guide or a one-off reprint), scored by the best evidence among
// its records.
export function rankCandidates(guess: Guess, candidates: Candidate[]): Scored[] {
  const groups: Scored[][] = [];
  for (const c of candidates.map((c) => scoreCandidate(guess, c))) {
    const group = groups.find((g) => sameBook(g[0], c));
    if (group) group.push(c);
    else groups.push([c]);
  }
  return groups
    .map((g) => ({
      ...(g.find((c) => c.isbnMatch) ?? g[0]),
      titleScore: Math.max(...g.map((c) => c.titleScore)),
      authorMatch: g.some((c) => c.authorMatch),
      isbnMatch: g.some((c) => c.isbnMatch),
      score: Math.max(...g.map((c) => c.score)),
    }))
    .sort((a, b) => b.score - a.score);
}

// Cole's own capitalization when the catalog's title is the same words in
// sentence case ("Celebration of discipline"). Covers printed in capitals
// never win.
export function displayTitle(guessed: string, catalog: string): string {
  const caps = (s: string) => (s.match(/[A-Z]/g) ?? []).length;
  const usable = fold(guessed) === fold(catalog) && guessed !== guessed.toUpperCase();
  return usable && caps(guessed) > caps(catalog) ? guessed : catalog;
}

// The matched record's authors that Cole named, dropping narrators and
// translators the catalog lists alongside them. All of them when he named none.
export function creditedAuthors(guessed: string[], found: string[]): string[] {
  const named = found.filter((f) => authorMatches(guessed, [f]));
  return named.length ? named : found;
}

// Applies the confidence rules to ranked candidates. A guess with no author
// fails, unless `allowNoAuthor` is set (the typed reading list has one
// blank author); then it passes only when exactly one book clears the title bar.
export function decide(
  guess: Guess,
  ranked: Scored[],
  { allowNoAuthor = false } = {},
): Decision {
  const [top, second] = ranked;
  const reasons: string[] = [];
  if (guess.confidence < THRESHOLDS.vision) {
    reasons.push(`cover read with confidence ${guess.confidence.toFixed(2)}`);
  }
  if (!top) {
    reasons.push("no catalog matches");
  } else {
    if (top.titleScore < THRESHOLDS.title) {
      reasons.push(`best title match is ${top.titleScore.toFixed(2)}`);
    }
    if (guess.authors.length === 0 && !allowNoAuthor) {
      reasons.push("no author on the cover");
    } else if (guess.authors.length === 0) {
      const passing = ranked.filter((c) => c.titleScore >= THRESHOLDS.title);
      if (passing.length !== 1) {
        reasons.push(`no author, and ${passing.length} books match the title`);
      }
    } else {
      if (!top.authorMatch) reasons.push("author does not match");
      if (!top.isbnMatch && second && top.score - second.score < THRESHOLDS.margin) {
        reasons.push("top two matches are too close");
      }
    }
  }
  return reasons.length === 0 && top
    ? { ok: true, match: top }
    : { ok: false, reasons, candidates: ranked.slice(0, 3) };
}
