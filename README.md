# colehollander.com

The source for [colehollander.com](https://colehollander.com). Next.js on Vercel, Tailwind, shadcn/ui, Geist. Pages are prerendered; the bookshelf intake is the one server route.

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build
pnpm test       # unit tests (Vitest)
pnpm lint
```

Content lives in `src/app/page.tsx`. The Order Desk mark in `public/` comes from orderdesk.com. The GitHub hover card uses [GitHub Activity](https://rareui.com/components) from [Rare UI](https://rareui.com) (MIT + Commons Clause + Attribution), in `src/components/ui/github-activity.tsx`.

## Bookshelf

`/books` shows three shelves: Reading now, Finished, and To read, each newest first (by start date, finish date, and date added; undated books follow, most recently added first). Finished shows the first 12, with a toggle for the rest. Each book is a spine colored from its cover, or a cloth color for a book with no cover; its height and lettering (plain, paper label, gold foil, or raised bands) are picked from the title, so they never change. "Arrange by" reorders every shelf by Recent (the order above), Color, Length (pages), or Author, and the books slide into place; the 12 on Finished are the first 12 in that order. Hovering a spine lifts it and names the book. Clicking, tapping, or pressing Enter on it takes the book down (`src/components/open-book.tsx`): it turns from spine to cover on its way to the middle of the screen and opens to a bookplate and the book's details, with a link to its catalog page. Esc, the backdrop, or "Put it back" returns it to the shelf. The arrow keys move between spines. The page is regenerated at most once a minute, and right away after the intake writes a book. The homepage links to it from the site nav and from a strip of the Reading now spines; the homepage is only rendered at deploy, so the strip changes on the next deploy.

**Data.** With `BOOKS_DATABASE_URL` set, the shelf reads the database. Without it (local builds, previews), it reads `src/data/books/shelf.json`, so a build needs no network or credentials. That file is the starting list: `src/data/books/seed.json` (the old reading tracker, oldest first, then the four photographed books, which are the newest) resolved against Open Library by `pnpm books:seed`, which also writes the covers to `public/books/covers/` and prints which books matched. The tracker had no reading dates, so seeded books have none, and the list's order (as IDs) decides which come first on each shelf.

**Database.** [libSQL](https://docs.turso.tech/sdk/ts/reference): Turso in production, or a local SQLite file. `src/lib/books/store.ts` creates the `books` and `intake_log` tables on first use. Another database plugs in by implementing the `BookStore` interface there. To fill a new database with the starting list, run `pnpm books import`.

**Intake.** A bot sends a photo of a cover to `POST /api/intake`. The vision model reads the title, author, and any ISBN; Open Library (then Google Books) supplies the official title, authors, year, pages, ISBN, and cover. A book is written only when the cover was read with confidence of at least 0.8, the best match's title similarity is at least 0.85 with a matching author last name, and it beats the next different book by a clear margin (or its ISBN matched). Otherwise nothing is written and the reply lists up to three candidates. The same book is never added twice (matched by catalog ID, then ISBN). Every request is logged in `intake_log`.

```bash
# A photo, with an optional caption: "started"/"reading", "finished"/"done", "to read".
# No status word means Reading now for a new book, and no change for one already on the shelf.
curl -X POST https://colehollander.com/api/intake \
  -H "Authorization: Bearer $INTAKE_TOKEN" \
  -F image=@cover.jpg -F caption="finished"

# Or by URL
curl -X POST https://colehollander.com/api/intake \
  -H "Authorization: Bearer $INTAKE_TOKEN" -H "Content-Type: application/json" \
  -d '{"image_url": "https://…/cover.jpg", "caption": "started"}'
```

The reply is JSON with a `status` and a `message` to show Cole:

- `added`, `updated` (e.g. "finished" moved a book from Reading now), or `duplicate`, with the `book`.
- `needs_choice`: the checks failed. `message` lists the candidates. Send Cole's reply back with the `intake_id`: `{"intake_id": 12, "choice": 2}` or `{"intake_id": 12, "choice": "none"}`.
- `no_match` or `error` (502): nothing was written.

Vercel limits request bodies to 4.5 MB, so the bot should send large photos by `image_url`.

**Fixing a record.** `pnpm books list`, `pnpm books set <id> status=finished finish_date=2026-10-12 rating=4`, `pnpm books delete <id>`, `pnpm books log`. These use the same database variables.

### Environment variables

| Variable | Needed for | |
| --- | --- | --- |
| `INTAKE_TOKEN` | intake | Shared secret the bot sends as `Authorization: Bearer …`. Intake is off without it. |
| `BOOKS_DATABASE_URL` | intake, shelf | `libsql://….turso.io`, or `file:books.db` locally. Intake is off and the shelf reads `shelf.json` without it. |
| `BOOKS_DATABASE_AUTH_TOKEN` | Turso | The database's auth token. |
| `ANTHROPIC_API_KEY` | intake | For the vision model. |
| `VISION_PROVIDER` | optional | Which cover reader to use. `anthropic` (the default) is the one built in. |
| `VISION_MODEL` | optional | Defaults to `claude-opus-5-5`. |
| `BLOB_READ_WRITE_TOKEN` | optional | Vercel Blob. When set, covers and intake photos are cached there; otherwise the shelf links to the catalog's cover and the log keeps a photo hash. |
| `GOOGLE_BOOKS_API_KEY` | optional | Raises Google Books' anonymous quota. |
