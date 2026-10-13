import { decide, fold, lastName, rankCandidates, type Decision } from "./match";
import type { Candidate, Guess } from "./types";

// Open Library asks API users to identify themselves.
const USER_AGENT = "colehollander.com bookshelf (https://colehollander.com)";

const OL_FIELDS = [
  "key",
  "title",
  "author_name",
  "first_publish_year",
  "number_of_pages_median",
  "cover_i",
  "editions",
  "editions.key",
  "editions.title",
  "editions.subtitle",
  "editions.isbn",
  "editions.cover_i",
].join(",");

type OlDoc = {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  number_of_pages_median?: number;
  cover_i?: number;
  editions?: {
    docs: { key: string; title?: string; subtitle?: string; isbn?: string[]; cover_i?: number }[];
  };
};

async function olSearch(params: Record<string, string>): Promise<OlDoc[]> {
  const url = new URL("https://openlibrary.org/search.json");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("fields", OL_FIELDS);
  url.searchParams.set("limit", "10");
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Open Library search ${res.status}`);
  return (await res.json()).docs;
}

// The search returns works, each with the edition that best fits the query
// (by ISBN or publisher when given). ISBN and cover come from that edition so
// they describe the same printing; the work's cover fills in when it has none.
// Work titles are often in sentence case ("Celebration of discipline"), so
// the edition's title wins when it differs only in case and punctuation.
function fromOpenLibrary(doc: OlDoc): Candidate {
  const edition = doc.editions?.docs[0];
  const isbns = edition?.isbn ?? [];
  const coverId = edition?.cover_i ?? doc.cover_i;
  const editionTitle = edition?.title;
  return {
    source: "openlibrary",
    sourceId: doc.key.replace("/works/", ""),
    title: editionTitle && fold(editionTitle) === fold(doc.title) ? editionTitle : doc.title,
    subtitle: edition?.subtitle ?? null,
    authors: doc.author_name ?? [],
    year: doc.first_publish_year ?? null,
    pages: doc.number_of_pages_median ?? null,
    isbns: [...isbns.filter((i) => i.length === 13), ...isbns.filter((i) => i.length !== 13)],
    coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null,
  };
}

async function searchOpenLibrary(guess: Guess): Promise<Candidate[]> {
  if (guess.isbn) {
    const docs = await olSearch({ isbn: guess.isbn.replace(/[^0-9Xx]/g, "") });
    if (docs.length) return docs.map(fromOpenLibrary);
  }
  const title = guess.title;
  const author = guess.authors[0];
  const attempts: Record<string, string>[] = [];
  if (author && guess.publisher) attempts.push({ title, author, publisher: guess.publisher });
  if (author) attempts.push({ title, author });
  // A misread author still yields candidates to offer.
  attempts.push({ title });
  for (const params of attempts) {
    const docs = await olSearch(params);
    if (docs.length) return docs.map(fromOpenLibrary);
  }
  return [];
}

type GbVolume = {
  id: string;
  volumeInfo: {
    title: string;
    subtitle?: string;
    authors?: string[];
    publishedDate?: string;
    pageCount?: number;
    industryIdentifiers?: { type: string; identifier: string }[];
    imageLinks?: Record<string, string>;
  };
};

// Search results carry only the small thumbnail; ask Google for a larger
// rendering of the same image.
function largestCover(links?: Record<string, string>): string | null {
  const url = links?.extraLarge ?? links?.large ?? links?.medium ?? links?.thumbnail;
  if (!url) return null;
  return url.replace(/^http:/, "https:").replace("&edge=curl", "").replace(/&zoom=\d/, "") + "&fife=w800";
}

function fromGoogleBooks(v: GbVolume): Candidate {
  const info = v.volumeInfo;
  const ids = info.industryIdentifiers ?? [];
  return {
    source: "googlebooks",
    sourceId: v.id,
    title: info.title,
    subtitle: info.subtitle ?? null,
    authors: info.authors ?? [],
    year: info.publishedDate ? Number(info.publishedDate.slice(0, 4)) || null : null,
    pages: info.pageCount || null,
    isbns: [
      ...ids.filter((i) => i.type === "ISBN_13"),
      ...ids.filter((i) => i.type === "ISBN_10"),
    ].map((i) => i.identifier),
    coverUrl: largestCover(info.imageLinks),
  };
}

async function searchGoogleBooks(guess: Guess): Promise<Candidate[]> {
  const q = guess.isbn
    ? `isbn:${guess.isbn.replace(/[^0-9Xx]/g, "")}`
    : [`intitle:${guess.title}`, guess.authors[0] && `inauthor:${lastName(guess.authors[0])}`]
        .filter(Boolean)
        .join(" ");
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", q);
  url.searchParams.set("printType", "books");
  url.searchParams.set("maxResults", "10");
  if (process.env.GOOGLE_BOOKS_API_KEY) url.searchParams.set("key", process.env.GOOGLE_BOOKS_API_KEY);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Books search ${res.status}`);
  return ((await res.json()).items ?? []).map(fromGoogleBooks);
}

export type Resolution = Decision & { notes: string[] };

type Catalog = { name: string; search: (guess: Guess) => Promise<Candidate[]> };

const CATALOGS: Catalog[] = [
  { name: "Open Library", search: searchOpenLibrary },
  { name: "Google Books", search: searchGoogleBooks },
];

// Open Library first; Google Books only when Open Library gives no confident
// match. Without one, the best few from both are offered to choose from.
export async function resolveGuess(
  guess: Guess,
  { allowNoAuthor = false, catalogs = CATALOGS } = {},
): Promise<Resolution> {
  const notes: string[] = [];
  const reasons: string[] = [];
  const all: Candidate[] = [];
  for (const { name, search } of catalogs) {
    let found: Candidate[] = [];
    try {
      found = await search(guess);
    } catch (e) {
      notes.push(e instanceof Error ? e.message : String(e));
    }
    all.push(...found);
    const decision = decide(guess, rankCandidates(guess, found), { allowNoAuthor });
    if (decision.ok) return { ...decision, notes };
    reasons.push(`${name}: ${decision.reasons.join(", ")}`);
  }
  return { ok: false, reasons, candidates: rankCandidates(guess, all).slice(0, 3), notes };
}
