import type { Resolution } from "./lookup";
import { creditedAuthors, displayTitle, type Scored } from "./match";
import { datesForNewBook, findDuplicate, SHELF_TITLES, statusChange, statusFromCaption } from "./records";
import type { BookStore, IntakeDecision } from "./store";
import type { Book, BookStatus, Candidate, Guess } from "./types";
import type { CoverImage, CoverRecognizer } from "./vision";

export type IntakeDeps = {
  store: BookStore;
  recognizer: CoverRecognizer;
  resolve: (guess: Guess) => Promise<Resolution>;
  prepareCover: (c: Candidate) => Promise<Pick<Book, "coverUrl" | "coverCachedPath" | "spineColor">>;
  today: () => string;
};

export type IntakeResult = {
  status: IntakeDecision;
  intakeId: number;
  message: string;
  book?: Book;
  candidates?: { number: number; title: string; authors: string[]; year: number | null }[];
};

// A request the endpoint should refuse (bad choice, nothing waiting).
export class IntakeError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// YYYY-MM-DD in Boise, where Cole reads.
export function boiseToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Boise" });
}

const byline = (c: { title: string; authors: string[] }) =>
  c.authors.length ? `${c.title} by ${c.authors.join(", ")}` : c.title;

// Adds the matched book, or updates the copy already on the shelf.
async function write(deps: IntakeDeps, guess: Guess, match: Candidate, status: BookStatus | null) {
  const { store, today } = deps;
  const isbn = match.isbns[0] ?? null;
  const title = displayTitle(guess.title, match.title);
  const authors = creditedAuthors(guess.authors, match.authors);
  const existing = findDuplicate(await store.listBooks(), { ...match, title, authors, isbn });
  if (existing) {
    const change = statusChange(existing, status, today());
    if (!change) {
      return { decision: "duplicate" as const, book: existing, message: `${byline(existing)} is already on the shelf.` };
    }
    const book = await store.updateBook(existing.id, change);
    return { decision: "updated" as const, book, message: `Moved ${byline(book)} to ${SHELF_TITLES[book.status]}.` };
  }
  const next = status ?? "in_progress";
  const book = await store.insertBook({
    title,
    authors,
    status: next,
    rating: null,
    ...datesForNewBook(next, today()),
    ...(await deps.prepareCover(match)),
    source: match.source,
    sourceId: match.sourceId,
    isbn,
    year: match.year,
    pages: match.pages,
  });
  return { decision: "added" as const, book, message: `Added ${byline(book)} to ${SHELF_TITLES[next]}.` };
}

// Catalog records without scoring, as stored in intake_log for a later reply.
function plain(s: Scored): Candidate {
  const { source, sourceId, title, subtitle, authors, year, pages, isbns, coverUrl } = s;
  return { source, sourceId, title, subtitle, authors, year, pages, isbns, coverUrl };
}

// A photo: read the cover, look it up, and write it only if every check passes.
export async function intakePhoto(
  deps: IntakeDeps,
  input: { image: CoverImage; imageRef: string; caption: string | null },
): Promise<IntakeResult> {
  const { store } = deps;
  const log = { image: input.imageRef, caption: input.caption };
  let guess: Guess;
  try {
    guess = await deps.recognizer.recognize(input.image);
  } catch (e) {
    const message = `Could not read the cover: ${e instanceof Error ? e.message : e}`;
    const intakeId = await store.logIntake({ ...log, guess: null, candidates: null, decision: "error", bookId: null, message });
    return { status: "error", intakeId, message };
  }

  const resolution = await deps.resolve(guess);
  if (!resolution.ok) {
    const candidates = resolution.candidates.map(plain);
    const why = resolution.reasons.join("; ");
    if (!candidates.length) {
      const message = `Couldn't find this book (${why}). Nothing was added.`;
      const intakeId = await store.logIntake({ ...log, guess, candidates: [], decision: "no_match", bookId: null, message });
      return { status: "no_match", intakeId, message };
    }
    const list = candidates.map((c, i) => `${i + 1}. ${byline(c)}${c.year ? ` (${c.year})` : ""}`);
    const message = `Not sure which book this is (${why}). Reply with a number, or "none":\n${list.join("\n")}`;
    const intakeId = await store.logIntake({ ...log, guess, candidates, decision: "needs_choice", bookId: null, message });
    return {
      status: "needs_choice",
      intakeId,
      message,
      candidates: candidates.map((c, i) => ({ number: i + 1, title: c.title, authors: c.authors, year: c.year })),
    };
  }

  const result = await write(deps, guess, plain(resolution.match), statusFromCaption(input.caption));
  const intakeId = await store.logIntake({
    ...log,
    guess,
    candidates: [plain(resolution.match)],
    decision: result.decision,
    bookId: result.book.id,
    message: result.message,
  });
  return { status: result.decision, intakeId, message: result.message, book: result.book };
}

// Cole's reply to a list of candidates: a number writes that book, "none"
// writes nothing. Each list can be answered once.
export async function intakeChoice(
  deps: IntakeDeps,
  input: { intakeId: number; choice: number | "none" },
): Promise<IntakeResult> {
  const { store } = deps;
  const entry = await store.getIntake(input.intakeId);
  if (!entry || entry.decision !== "needs_choice") {
    throw new IntakeError(409, `Intake ${input.intakeId} is not waiting for a choice.`);
  }
  if (input.choice === "none") {
    const message = "Okay, nothing was added.";
    await store.updateIntake(entry.id, { decision: "declined", message });
    return { status: "declined", intakeId: entry.id, message };
  }
  const candidates = entry.candidates as Candidate[];
  const picked = candidates[input.choice - 1];
  if (!picked) {
    throw new IntakeError(400, `Choose a number from 1 to ${candidates.length}, or "none".`);
  }
  const result = await write(deps, entry.guess as Guess, picked, statusFromCaption(entry.caption));
  await store.updateIntake(entry.id, { decision: "chosen", bookId: result.book.id, message: result.message });
  return { status: result.decision, intakeId: entry.id, message: result.message, book: result.book };
}
