import { describe, expect, it } from "vitest";

import {
  authorMatches,
  creditedAuthors,
  decide,
  displayTitle,
  lastName,
  rankCandidates,
  titleSimilarity,
  toIsbn13,
} from "./match";
import type { Candidate, Guess } from "./types";

const book = (title: string, authors: string[], extra: Partial<Candidate> = {}): Candidate => ({
  source: "openlibrary",
  sourceId: `OL-${title}-${authors.join()}`,
  title,
  subtitle: null,
  authors,
  year: null,
  pages: null,
  isbns: [],
  coverUrl: null,
  ...extra,
});

const guess = (title: string, authors: string[], extra: Partial<Guess> = {}): Guess => ({
  title,
  authors,
  confidence: 0.95,
  ...extra,
});

describe("titleSimilarity", () => {
  it("ignores case, punctuation and a leading article", () => {
    expect(titleSimilarity("Pursuit of God", "The pursuit of God", null)).toBe(1);
    expect(titleSimilarity("Dont Waste Your Life", "Don't Waste Your Life", null)).toBe(1);
  });

  it("matches a title without its subtitle, just below an exact match", () => {
    expect(titleSimilarity("Prayer", "Prayer", "Experiencing Awe and Intimacy with God")).toBeCloseTo(0.95);
    expect(titleSimilarity("Knowing God", "Knowing God", "Study Guide")).toBeLessThan(
      titleSimilarity("Knowing God", "Knowing God", null),
    );
  });

  it("scores different titles low", () => {
    expect(titleSimilarity("Garden City", "Prayers of the People", null)).toBeLessThan(0.5);
  });
});

describe("authors", () => {
  it("finds last names past initials, nicknames and suffixes", () => {
    expect(lastName("J. I. Packer")).toBe("packer");
    expect(lastName('Jonathan "JP" Pokluda')).toBe("pokluda");
    expect(lastName("Martin Luther King Jr.")).toBe("king");
  });

  it("matches on last name whatever the first-name form", () => {
    expect(authorMatches(["JL Collins"], ["J. L. Collins"])).toBe(true);
    expect(authorMatches(["Saint Augustine"], ["Augustine of Hippo"])).toBe(true);
    expect(authorMatches(["C.S. Lewis"], ["Philip Yancey"])).toBe(false);
    expect(authorMatches([], ["Tony Reinke"])).toBe(false);
  });

  it("credits only the authors Cole named", () => {
    expect(creditedAuthors(["Timothy Keller"], ["Timothy J. Keller", "Sean Pratt"])).toEqual(["Timothy J. Keller"]);
    expect(creditedAuthors([], ["Tony Reinke"])).toEqual(["Tony Reinke"]);
  });
});

describe("displayTitle", () => {
  it("keeps the better-capitalized form of the same words", () => {
    expect(displayTitle("Celebration of Discipline", "Celebration of discipline")).toBe("Celebration of Discipline");
    expect(displayTitle("Welcome to adulting", "Welcome to Adulting")).toBe("Welcome to Adulting");
  });

  it("never takes a title printed in capitals or a different title", () => {
    expect(displayTitle("KNOWING GOD", "Knowing God")).toBe("Knowing God");
    expect(displayTitle("Pursuit of God", "The pursuit of God")).toBe("The pursuit of God");
  });
});

describe("toIsbn13", () => {
  it("converts ISBN-10 and strips hyphens", () => {
    expect(toIsbn13("0-14-044114-X")).toBe("9780140441147");
    expect(toIsbn13("978-0-14-044114-7")).toBe("9780140441147");
    expect(toIsbn13("12345")).toBeNull();
  });
});

describe("rankCandidates", () => {
  it("merges records of one book so they are not rivals", () => {
    const g = guess("Prayer", ["Timothy Keller"]);
    const ranked = rankCandidates(g, [
      book("Prayer", ["Timothy J. Keller", "Sean Pratt"], { sourceId: "main" }),
      book("Prayer", ["Timothy Keller"], { sourceId: "reprint" }),
      book("Prayers of the People", ["Timothy J. Keller"]),
    ]);
    expect(ranked.map((c) => c.sourceId)).toEqual(["main", expect.any(String)]);
    expect(ranked).toHaveLength(2);
  });

  it("keeps the catalog's most relevant record, even when a lesser one scores higher", () => {
    const g = guess("Knowing God", ["J. I. Packer"]);
    const [top] = rankCandidates(g, [
      book("Knowing God", ["J. I. Packer"], { sourceId: "work", subtitle: "Twentieth Anniversary Edition" }),
      book("Knowing God", ["J. I. Packer"], { sourceId: "reprint" }),
    ]);
    expect(top.sourceId).toBe("work");
    expect(top.titleScore).toBe(1);
  });

  it("represents a book by the record whose ISBN matched", () => {
    const g = guess("Confessions", ["Saint Augustine"], { isbn: "014044114X" });
    const [top] = rankCandidates(g, [
      book("Confessions", ["Augustine of Hippo"], { sourceId: "loeb", isbns: ["9780674990296"] }),
      book("Confessions", ["Saint Augustine"], { sourceId: "penguin", isbns: ["9780140441147"] }),
    ]);
    expect(top.sourceId).toBe("penguin");
    expect(top.isbnMatch).toBe(true);
  });
});

describe("decide", () => {
  const clear = [book("The Running Man", ["Stephen King"]), book("The Running Man", ["Cliff Hanger"])];

  it("writes a clear match", () => {
    const g = guess("The Running Man", ["Stephen King"]);
    const d = decide(g, rankCandidates(g, clear));
    expect(d.ok && d.match.authors).toEqual(["Stephen King"]);
  });

  it("refuses a blurry photo even when the catalog agrees", () => {
    const g = guess("The Running Man", ["Stephen King"], { confidence: 0.6 });
    const d = decide(g, rankCandidates(g, clear));
    expect(d.ok).toBe(false);
    expect(!d.ok && d.reasons[0]).toMatch(/confidence 0.60/);
    expect(!d.ok && d.candidates).toHaveLength(2);
  });

  it("refuses a weak title match", () => {
    const g = guess("The Runner", ["Stephen King"]);
    expect(decide(g, rankCandidates(g, clear)).ok).toBe(false);
  });

  it("refuses when the author does not match", () => {
    const g = guess("The Running Man", ["Ted Dekker"]);
    const d = decide(g, rankCandidates(g, clear));
    expect(!d.ok && d.reasons).toContain("author does not match");
  });

  it("refuses when two different books by the author are too close", () => {
    const g = guess("Desiring God", ["John Piper"]);
    const d = decide(g, rankCandidates(g, [book("Desiring Gold", ["John Piper"]), book("Desiring Good", ["John Piper"])]));
    expect(!d.ok && d.reasons).toContain("top two matches are too close");
  });

  it("lets an exact ISBN settle two close titles", () => {
    const g = guess("Desiring God", ["John Piper"], { isbn: "978-0-88070-221-8" });
    const d = decide(
      g,
      rankCandidates(g, [book("Desiring Gold", ["John Piper"]), book("Desiring Good", ["John Piper"], { isbns: ["9780880702218"] })]),
    );
    expect(d.ok && d.match.title).toBe("Desiring Good");
  });

  it("refuses a cover with no author", () => {
    const g = guess("12 Ways Your Phone Is Changing You", []);
    expect(decide(g, rankCandidates(g, [book("12 Ways Your Phone Is Changing You", ["Tony Reinke"])])).ok).toBe(false);
  });

  it("fills a missing author from the list only when one book matches", () => {
    const g = guess("12 Ways your Phone is Changing You", [], { confidence: 1 });
    const one = [book("12 Ways Your Phone Is Changing You", ["Tony Reinke"])];
    const d = decide(g, rankCandidates(g, one), { allowNoAuthor: true });
    expect(d.ok && d.match.authors).toEqual(["Tony Reinke"]);
    const two = [...one, book("12 Ways Your Phone Is Changing You", ["Someone Else"])];
    expect(decide(g, rankCandidates(g, two), { allowNoAuthor: true }).ok).toBe(false);
  });

  it("refuses when the catalog has nothing", () => {
    const d = decide(guess("Nope", ["Nobody"]), []);
    expect(!d.ok && d.reasons).toContain("no catalog matches");
  });
});
