"use client";

import { motion, MotionConfig } from "motion/react";
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

import { SpineFace } from "@/components/book-art";
import { dateLine, OpenBook } from "@/components/open-book";
import { arrange, ARRANGEMENTS, type Arrangement, type Shelf } from "@/lib/books/records";
import { CLOTH, SPINE_MAX_H, spineHeight, spineWidth } from "@/lib/books/spine";
import type { Book } from "@/lib/books/types";
import { reveal, textLink } from "@/lib/styles";

// Rearranged books slide to their new places.
const SLIDE = { type: "spring", visualDuration: 0.6, bounce: 0.12 } as const;

type Take = (book: Book, spine: HTMLElement) => void;

// The /books shelves, one per status, and the book taken down from them.
// Arrange by reorders every shelf at once. A spine lifts on hover and takes
// the book down when clicked; the arrow keys move along the spines.
export function Library({ shelves }: { shelves: Shelf[] }) {
  const [by, setBy] = useState<Arrangement>("recent");
  const [taken, setTaken] = useState<{ book: Book; spine: HTMLElement } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const name = useId();

  // While a book is down, the page behind it is out of reach and still.
  // Putting it back returns focus to its spine.
  useEffect(() => {
    const main = root.current?.closest("main");
    if (!taken || !main) return;
    main.inert = true;
    document.documentElement.style.overflow = "hidden";
    return () => {
      main.inert = false;
      document.documentElement.style.overflow = "";
      taken.spine.focus({ preventScroll: true });
    };
  }, [taken]);

  const walk = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const spines = [...(root.current?.querySelectorAll<HTMLElement>("[data-spine]") ?? [])];
    const i = spines.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    spines[i + (e.key === "ArrowRight" ? 1 : -1)]?.focus();
  };

  return (
    <MotionConfig reducedMotion="user">
      <div ref={root} onKeyDown={walk}>
        <div
          role="radiogroup"
          aria-label="Arrange by"
          className={`${reveal} mt-12 inline-flex flex-wrap items-center gap-0.5 rounded-full bg-muted p-1 text-[13px]`}
          style={{ animationDelay: "100ms" }}
        >
          <span aria-hidden className="px-2.5 text-muted-foreground">
            Arrange by
          </span>
          {ARRANGEMENTS.map(([value, label]) => (
            <label
              key={value}
              className="cursor-pointer rounded-full px-3 py-1 text-muted-foreground transition-colors hover:text-foreground has-checked:bg-background has-checked:text-foreground has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-foreground"
            >
              <input
                type="radio"
                name={name}
                value={value}
                checked={by === value}
                onChange={() => setBy(value)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>

        {shelves.map((shelf, i) => (
          <section
            key={shelf.status}
            aria-labelledby={`shelf-${shelf.status}`}
            className={`${reveal} ${i ? "mt-16" : "mt-12"}`}
            style={{ animationDelay: `${150 * (i + 1)}ms` }}
          >
            <h2 id={`shelf-${shelf.status}`} className="mb-12 text-muted-foreground">
              {shelf.title} <span className="ml-0.5 tabular-nums text-foreground/30">{shelf.books.length}</span>
            </h2>
            {shelf.books.length ? (
              <Bookshelf
                books={arrange(shelf.books, by)}
                label={shelf.title}
                shown={shelf.shown}
                takenId={taken?.book.id ?? null}
                onTake={(book, spine) => setTaken({ book, spine })}
                plant={i === shelves.length - 1}
              />
            ) : (
              <p className="text-muted-foreground">Nothing here right now.</p>
            )}
          </section>
        ))}

        <p className={`${reveal} mt-10 text-[13px] text-muted-foreground`} style={{ animationDelay: "600ms" }}>
          Pick a spine to take it down.<span className="pointer-coarse:hidden"> Arrow keys walk the shelf.</span>
        </p>
      </div>

      {taken &&
        createPortal(<OpenBook book={taken.book} spine={taken.spine} onClosed={() => setTaken(null)} />, document.body)}
    </MotionConfig>
  );
}

// One shelf, ending in a bookend; the last one also has a plant and a pile of
// books at the far end. With `shown`, only that many books are on the shelf
// until "Show all".
export function Bookshelf({
  books,
  label,
  shown,
  takenId,
  onTake,
  plant,
}: {
  books: Book[];
  label: string;
  shown: number | null;
  takenId: number | null;
  onTake: Take;
  plant: boolean;
}) {
  const [all, setAll] = useState(false);
  const listId = useId();
  const collapsible = shown !== null && books.length > shown;
  const visible = collapsible && !all ? books.slice(0, shown) : books;

  return (
    <>
      <ul
        id={listId}
        aria-label={label}
        // Clipped sideways so a tooltip near the edge never widens the page.
        className="bookshelf relative flex flex-wrap items-end gap-x-[3px] overflow-x-clip px-2"
        style={{ "--spine-h": `${SPINE_MAX_H}px` } as CSSProperties}
      >
        {visible.map((book) => (
          <Spine key={book.id} book={book} taken={takenId === book.id} onTake={onTake} />
        ))}
        {/* Decorations are a full row tall, so one that wraps still stands on a board. */}
        <motion.li layout="position" transition={SLIDE} aria-hidden className="ml-px flex items-end" style={{ height: SPINE_MAX_H }}>
          <span className="block h-16 w-[18px] rounded-t-[9px] rounded-b-[1px] bg-linear-to-r from-foreground/40 to-foreground/25 shadow-[2px_0_4px_-2px_rgb(0_0_0/0.3)]" />
        </motion.li>
        {plant && (
          <li aria-hidden className="ml-auto flex items-end gap-3 pr-1" style={{ height: SPINE_MAX_H }}>
            <Pile />
            <Plant />
          </li>
        )}
      </ul>
      {collapsible && (
        <button
          type="button"
          aria-expanded={all}
          aria-controls={listId}
          onClick={() => setAll(!all)}
          className={`${textLink} mt-5 ml-2 cursor-pointer text-muted-foreground`}
        >
          {all ? "Show fewer" : `Show all ${books.length}`}
        </button>
      )}
    </>
  );
}

function Spine({ book, taken, onTake }: { book: Book; taken: boolean; onTake: Take }) {
  const item = useRef<HTMLLIElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  const [tipLeft, setTipLeft] = useState(0);
  const width = spineWidth(book.pages);
  const height = spineHeight(book.title);
  const authors = book.authors.join(", ");
  const dates = dateLine(book);
  const hint = [authors, book.year].filter(Boolean).join(" · ");

  const description = [
    `${book.title}${authors ? ` by ${authors}` : ""}`,
    dates,
    book.rating && `rated ${book.rating} of 5`,
  ]
    .filter(Boolean)
    .join(", ");

  // Center the tooltip over the spine, kept inside the shelf.
  const placeTip = () => {
    const li = item.current;
    const ul = li?.parentElement;
    if (!li || !ul || !tip.current) return;
    const x = li.offsetLeft;
    const tw = tip.current.offsetWidth;
    setTipLeft(Math.min(Math.max((width - tw) / 2, -x), ul.clientWidth - x - tw));
  };

  return (
    <motion.li
      ref={item}
      layout="position"
      transition={SLIDE}
      className="group/book relative shrink-0 hover:z-10 has-focus-visible:z-10"
      style={{ width, height: SPINE_MAX_H }}
      onPointerEnter={placeTip}
      onFocus={placeTip}
    >
      <button
        type="button"
        data-spine
        aria-label={description}
        onClick={(e) => onTake(book, e.currentTarget)}
        className={`absolute inset-x-0 bottom-0 cursor-pointer rounded-[2px] shadow-[3px_0_6px_-3px_rgb(0_0_0/0.35)] transition-[translate,box-shadow] duration-[420ms] ease-[cubic-bezier(0.34,1.4,0.64,1)] hover:-translate-y-3.5 hover:shadow-[5px_10px_16px_-8px_rgb(0_0_0/0.42)] focus-visible:-translate-y-3.5 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-foreground active:-translate-y-2 active:duration-100 motion-reduce:transition-none ${taken ? "invisible" : ""}`}
        style={{ height }}
      >
        <SpineFace book={book} />
      </button>
      <span
        ref={tip}
        aria-hidden
        className="pointer-events-none absolute w-max max-w-48 translate-y-1 rounded-md bg-foreground px-2.5 py-1.5 text-[11px] leading-snug text-background opacity-0 shadow-md transition-[opacity,translate] duration-200 group-hover/book:translate-y-0 group-hover/book:opacity-100 group-has-focus-visible/book:translate-y-0 group-has-focus-visible/book:opacity-100"
        style={{ left: tipLeft, bottom: height + 24 }}
      >
        <span className="block font-medium">{book.title}</span>
        {hint && <span className="block opacity-65">{hint}</span>}
      </span>
    </motion.li>
  );
}

// Three books lying on their sides.
function Pile() {
  return (
    <span className="mb-px flex flex-col items-start">
      {[
        [CLOTH[1], 112, 8],
        [CLOTH[3], 100, 0],
        [CLOTH[0], 118, 4],
      ].map(([color, w, x]) => (
        <span
          key={color}
          className="mt-px block h-3.5 rounded-[2px] bg-linear-to-b from-white/15 via-transparent to-black/15 ring-1 ring-black/10 ring-inset"
          style={{ backgroundColor: color as string, width: w, marginLeft: x }}
        />
      ))}
    </span>
  );
}

// A leaf from the top of the pot to its tip, as wide as `spread`.
function leaf(tipX: number, tipY: number, spread: number) {
  const [bx, by] = [46, 84];
  const [mx, my] = [(bx + tipX) / 2, (by + tipY) / 2];
  const len = Math.hypot(tipX - bx, tipY - by);
  const [nx, ny] = [(-(tipY - by) / len) * spread, ((tipX - bx) / len) * spread];
  return `M${bx} ${by}Q${mx + nx} ${my + ny} ${tipX} ${tipY}Q${mx - nx} ${my - ny} ${bx} ${by}Z`;
}

const LEAVES = [
  [14, 30, 9, "#4f7a46"],
  [78, 26, 9, "#5b8a4f"],
  [30, 6, 8, "#3f6a3b"],
  [62, 4, 8, "#4f7a46"],
  [46, 0, 7, "#6a9a5b"],
] as const;

// A potted plant, swaying a little.
function Plant() {
  return (
    <svg width="72" height="104" viewBox="0 0 92 132" className="block">
      <g className="origin-[46px_84px] motion-safe:animate-[sway_7s_ease-in-out_infinite]">
        {LEAVES.map(([x, y, spread, fill]) => (
          <path key={`${x}-${y}`} d={leaf(x, y, spread)} fill={fill} />
        ))}
      </g>
      <path d="M24 92h44l-6 40H30z" fill="#b8643a" />
      <rect x="20" y="84" width="52" height="11" rx="2" fill="#cc7646" />
    </svg>
  );
}
