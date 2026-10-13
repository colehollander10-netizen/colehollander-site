import { createClient } from "@libsql/client";
import { beforeEach, describe, expect, it } from "vitest";

import { intakeChoice, intakePhoto, IntakeError, type IntakeDeps } from "./intake";
import { resolveGuess } from "./lookup";
import { libsqlStore, type BookStore } from "./store";
import type { Candidate, Guess } from "./types";

const knowingGod: Candidate = {
  source: "openlibrary",
  sourceId: "OL68979W",
  title: "Knowing God",
  subtitle: null,
  authors: ["J. I. Packer"],
  year: 1973,
  pages: 256,
  isbns: ["9780830816507"],
  coverUrl: "https://covers.openlibrary.org/b/id/15179875-L.jpg",
};
const studyGuide: Candidate = { ...knowingGod, sourceId: "OL1W", title: "Knowing God Journal", isbns: [] };
const otherBook: Candidate = { ...knowingGod, sourceId: "OL2W", title: "Packer on Prayer", isbns: [] };

const image = { data: Buffer.from("photo"), mediaType: "image/jpeg" as const };

let store: BookStore;
let reading: Guess;

function deps(): IntakeDeps {
  return {
    store,
    recognizer: { recognize: async () => reading },
    resolve: (guess) =>
      resolveGuess(guess, { catalogs: [{ name: "Open Library", search: async () => [knowingGod, studyGuide, otherBook] }] }),
    prepareCover: async (c) => ({ coverUrl: c.coverUrl, coverCachedPath: null, spineColor: "#f6f7e9" }),
    today: () => "2026-10-12",
  };
}

const photo = (caption: string | null) => intakePhoto(deps(), { image, imageRef: "sha256:abc", caption });

beforeEach(async () => {
  store = await libsqlStore(createClient({ url: ":memory:" }));
  reading = { title: "Knowing God", authors: ["J. I. Packer"], isbn: null, publisher: null, confidence: 0.93 };
});

describe("intake", () => {
  it("adds a clear photo with the official cover and no human step", async () => {
    const res = await photo("started");
    expect(res.status).toBe("added");
    expect(res.book).toMatchObject({
      title: "Knowing God",
      status: "in_progress",
      startDate: "2026-10-12",
      coverUrl: knowingGod.coverUrl,
      spineColor: "#f6f7e9",
      source: "openlibrary",
      sourceId: "OL68979W",
      isbn: "9780830816507",
    });
    const [log] = await store.listIntakes(1);
    expect(log).toMatchObject({ decision: "added", bookId: res.book!.id, image: "sha256:abc", caption: "started" });
  });

  it("writes nothing for a blurry photo and offers candidates", async () => {
    reading = { ...reading, confidence: 0.5 };
    const res = await photo(null);
    expect(res.status).toBe("needs_choice");
    expect(res.candidates?.map((c) => c.title)).toEqual(["Knowing God", "Knowing God Journal", "Packer on Prayer"]);
    expect(res.message).toMatch(/Reply with a number, or "none":\n1\. Knowing God by J\. I\. Packer \(1973\)/);
    expect(await store.listBooks()).toEqual([]);
  });

  it("writes the candidate Cole picks, once", async () => {
    reading = { ...reading, confidence: 0.5 };
    const asked = await photo("to read");
    const res = await intakeChoice(deps(), { intakeId: asked.intakeId, choice: 1 });
    expect(res.status).toBe("added");
    expect(res.book).toMatchObject({ sourceId: "OL68979W", status: "want_to_read", startDate: null });
    expect((await store.getIntake(asked.intakeId))?.decision).toBe("chosen");
    await expect(intakeChoice(deps(), { intakeId: asked.intakeId, choice: 1 })).rejects.toThrow(IntakeError);
  });

  it("writes nothing when Cole replies none", async () => {
    reading = { ...reading, confidence: 0.5 };
    const asked = await photo(null);
    expect((await intakeChoice(deps(), { intakeId: asked.intakeId, choice: "none" })).status).toBe("declined");
    expect(await store.listBooks()).toEqual([]);
  });

  it("rejects a number that is not on the list", async () => {
    reading = { ...reading, confidence: 0.5 };
    const asked = await photo(null);
    await expect(intakeChoice(deps(), { intakeId: asked.intakeId, choice: 7 })).rejects.toThrow(/1 to 3/);
  });

  it("never adds the same book twice", async () => {
    await photo(null);
    const again = await photo(null);
    expect(again.status).toBe("duplicate");
    expect(await store.listBooks()).toHaveLength(1);
  });

  it('moves an in-progress book to finished on "finished"', async () => {
    const first = await photo("reading");
    const done = await photo("finished!");
    expect(done.status).toBe("updated");
    expect(done.book).toMatchObject({
      id: first.book!.id,
      status: "finished",
      startDate: "2026-10-12",
      finishDate: "2026-10-12",
    });
    expect(await store.listBooks()).toHaveLength(1);
  });

  it("logs a cover the model cannot read", async () => {
    const failing = { ...deps(), recognizer: { recognize: () => Promise.reject(new Error("overloaded")) } };
    const res = await intakePhoto(failing, { image, imageRef: "sha256:abc", caption: null });
    expect(res.status).toBe("error");
    expect((await store.getIntake(res.intakeId))?.message).toMatch(/overloaded/);
  });
});
