import { describe, expect, it } from "vitest";

import { resolveGuess } from "./lookup";
import type { Candidate } from "./types";

const book = (source: Candidate["source"], title: string, authors: string[]): Candidate => ({
  source,
  sourceId: `${source}-${title}`,
  title,
  subtitle: null,
  authors,
  year: null,
  pages: null,
  isbns: [],
  coverUrl: null,
});

const guess = { title: "Stand Firm and Act Like Men", authors: ["Joby Martin"], confidence: 0.9 };

describe("resolveGuess", () => {
  it("stops at Open Library when it is confident", async () => {
    let googleAsked = false;
    const res = await resolveGuess(guess, {
      catalogs: [
        { name: "Open Library", search: async () => [book("openlibrary", guess.title, ["Joby Martin", "Charles Martin"])] },
        { name: "Google Books", search: async () => ((googleAsked = true), []) },
      ],
    });
    expect(res.ok && res.match.source).toBe("openlibrary");
    expect(googleAsked).toBe(false);
  });

  it("falls back to Google Books, noting a failed catalog", async () => {
    const res = await resolveGuess(guess, {
      catalogs: [
        { name: "Open Library", search: async () => Promise.reject(new Error("Open Library search 503")) },
        { name: "Google Books", search: async () => [book("googlebooks", guess.title, ["Joby Martin"])] },
      ],
    });
    expect(res.ok && res.match.source).toBe("googlebooks");
    expect(res.notes).toEqual(["Open Library search 503"]);
  });

  it("offers the best of both when neither is confident", async () => {
    const res = await resolveGuess(guess, {
      catalogs: [
        { name: "Open Library", search: async () => [book("openlibrary", guess.title, ["Someone Else"])] },
        { name: "Google Books", search: async () => [book("googlebooks", "Act Like Men", ["Other"])] },
      ],
    });
    expect(res.ok).toBe(false);
    expect(!res.ok && res.reasons[0]).toMatch(/^Open Library: /);
    expect(!res.ok && res.candidates.map((c) => c.source)).toEqual(["openlibrary", "googlebooks"]);
  });
});
