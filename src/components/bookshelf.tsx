"use client";

import Image from "next/image";
import { motion, MotionConfig } from "motion/react";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";

import { lastNames, spineColor, spineInk, spineWidth } from "@/lib/books/spine";
import type { Book } from "@/lib/books/types";
import { textLink } from "@/lib/styles";

const SPINE_H = 176;
const COVER_W = 140;
const COVER_H = 210;

// Settles in about 380ms with a little overshoot, so the book feels pulled,
// not slid. Opacity eases on its own, so a closing cover never lingers half
// visible while the spring settles. The caption follows the cover a beat later.
const spring = {
  type: "spring",
  visualDuration: 0.38,
  bounce: 0.16,
  opacity: { duration: 0.18, ease: "easeOut" },
} as const;
const captionIn = { type: "spring", visualDuration: 0.32, bounce: 0.1, delay: 0.08 } as const;
const captionOut = { duration: 0.12, ease: "easeOut" } as const;

// A book opens once the mouse rests on it for a moment, so sweeping across
// the shelf doesn't fan every cover out.
const HOVER_DELAY = 70;

// A rounded spine: shadow at the hinge, a soft highlight, shadow at the edge.
const SPINE_SHADE =
  "linear-gradient(90deg, rgb(0 0 0/0.22), rgb(255 255 255/0.1) 20%, rgb(255 255 255/0) 50%, rgb(0 0 0/0.12))";
const HINGE = "linear-gradient(90deg, rgb(0 0 0/0.28), rgb(255 255 255/0.12) 5%, rgb(0 0 0/0) 9%)";
// The weave of a cloth binding, for books with no cover.
const WEAVE =
  "repeating-linear-gradient(0deg, rgb(255 255 255/0.04) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgb(0 0 0/0.06) 0 1px, transparent 1px 3px)";

function formatDate(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function dateLine(book: Book): string | null {
  if (book.status === "finished" && book.finishDate) return `Finished ${formatDate(book.finishDate)}`;
  if (book.status === "in_progress" && book.startDate) return `Started ${formatDate(book.startDate)}`;
  return null;
}

// Hovering a spine (or tapping it, or Enter on it) pulls the book off the
// shelf: the spine swings away and the cover turns to face the visitor. With
// `shown`, only that many books are on the shelf until "Show all".
export function Bookshelf({ books, label, shown }: { books: Book[]; label: string; shown: number | null }) {
  const [active, setActive] = useState<number | null>(null);
  const [all, setAll] = useState(false);
  const shelf = useRef<HTMLUListElement>(null);
  const listId = useId();
  const collapsible = shown !== null && books.length > shown;
  const visible = collapsible && !all ? books.slice(0, shown) : books;

  // A tap elsewhere or Escape puts the book back.
  useEffect(() => {
    if (active === null) return;
    const away = (e: PointerEvent) => {
      if (!shelf.current?.contains(e.target as Node)) setActive(null);
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [active]);

  return (
    <MotionConfig reducedMotion="user">
      <ul
        ref={shelf}
        id={listId}
        aria-label={label}
        // Clipped sideways so closed covers past the edge never widen the page.
        className="bookshelf flex flex-wrap items-end gap-x-[3px] overflow-x-clip px-2"
        style={{ "--spine-h": `${SPINE_H}px` } as CSSProperties}
      >
        {visible.map((book) => (
          <Spine
            key={book.id}
            book={book}
            active={active === book.id}
            setActive={(on) => setActive((cur) => (on ? book.id : cur === book.id ? null : cur))}
          />
        ))}
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
    </MotionConfig>
  );
}

function Spine({ book, active, setActive }: { book: Book; active: boolean; setActive: (on: boolean) => void }) {
  const item = useRef<HTMLLIElement>(null);
  const pointer = useRef("");
  const hover = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [left, setLeft] = useState(0);
  // Whether the cover is still animating, so a closing one stays above the
  // neighboring spines until it is gone.
  const [moving, setMoving] = useState(false);
  const width = spineWidth(book.pages);
  const color = spineColor(book);
  const ink = spineInk(color);
  const cover = book.coverCachedPath ?? book.coverUrl;
  const dates = dateLine(book);
  const authors = book.authors.join(", ");

  useEffect(() => () => clearTimeout(hover.current), []);

  // Center the cover on the spine, kept inside the shelf's padding so its
  // focus ring isn't clipped.
  const open = () => {
    const li = item.current;
    const ul = li?.parentElement;
    if (li && ul) {
      const x = li.getBoundingClientRect().left - ul.getBoundingClientRect().left;
      const inset = parseFloat(getComputedStyle(ul).paddingLeft);
      setLeft(Math.min(Math.max((width - COVER_W) / 2, inset - x), ul.clientWidth - inset - x - COVER_W));
    }
    setActive(true);
  };

  const description = [
    `${book.title}${authors ? ` by ${authors}` : ""}`,
    dates,
    book.rating && `rated ${book.rating} of 5`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    // perspective makes each item its own stack, so the open one is lifted.
    // Hover is tracked here, not on the spine, which swings out from under the
    // pointer.
    <li
      ref={item}
      className="group/book relative shrink-0"
      style={{ width, height: SPINE_H, perspective: 900, zIndex: active ? 30 : moving ? 20 : undefined }}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") hover.current = setTimeout(open, HOVER_DELAY);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "mouse") return;
        clearTimeout(hover.current);
        setActive(false);
      }}
    >
      <motion.button
        type="button"
        aria-label={description}
        onPointerDown={(e) => (pointer.current = e.pointerType)}
        // The mouse opens on hover; touch and keyboard toggle.
        onClick={() => {
          const mouse = pointer.current === "mouse";
          pointer.current = "";
          if (mouse) return;
          if (active) setActive(false);
          else open();
        }}
        onBlur={() => setActive(false)}
        initial={false}
        // Swinging away from the visitor, so perspective shrinks the spine
        // behind the cover instead of growing it past the cover's edges.
        animate={active ? { rotateY: 70, opacity: 0.35 } : { rotateY: 0, opacity: 1 }}
        transition={spring}
        // While open, the focus ring moves to the cover.
        className={`absolute inset-0 flex cursor-pointer flex-col items-center justify-between gap-2 overflow-hidden rounded-[2px] py-3.5 ring-1 ring-foreground/15 ring-inset ${active ? "focus-visible:outline-none" : "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"}`}
        style={{
          backgroundColor: color,
          backgroundImage: cover ? SPINE_SHADE : `${SPINE_SHADE}, ${WEAVE}`,
          color: ink,
          transformOrigin: "left center",
        }}
      >
        {!cover && (
          // Gilt rules at the head and foot of a cloth binding.
          <>
            <span aria-hidden className="absolute inset-x-[3px] top-[5px] h-[4px] border-y border-current opacity-40" />
            <span aria-hidden className="absolute inset-x-[3px] bottom-[5px] h-[4px] border-y border-current opacity-40" />
          </>
        )}
        {/* The title takes the room the authors leave. */}
        <span className="min-h-0 truncate text-[11px] leading-none font-medium tracking-[-0.01em] [writing-mode:vertical-rl]">
          {book.title}
        </span>
        {book.authors.length > 0 && (
          <span className="max-h-[64px] shrink-0 truncate text-[8.5px] leading-none tracking-[0.06em] uppercase opacity-70 [writing-mode:vertical-rl]">
            {lastNames(book.authors)}
          </span>
        )}
      </motion.button>

      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{ left, top: SPINE_H - COVER_H, width: COVER_W }}
      >
        <motion.div
          initial={false}
          animate={
            active
              ? { opacity: 1, rotateY: 0, scale: 1, y: 0 }
              : { opacity: 0, rotateY: 40, scale: 0.78, y: 12 }
          }
          transition={spring}
          onAnimationStart={() => setMoving(true)}
          onAnimationComplete={() => setMoving(false)}
          className="relative overflow-hidden rounded-[3px] shadow-[0_18px_40px_-12px_rgb(0_0_0/0.45),0_4px_12px_-4px_rgb(0_0_0/0.3)] group-has-focus-visible/book:outline-2 group-has-focus-visible/book:outline-offset-2 group-has-focus-visible/book:outline-foreground"
          style={{ width: COVER_W, height: COVER_H, backgroundColor: color, transformPerspective: 900, originY: 1 }}
        >
          {cover ? (
            <Image src={cover} alt="" width={COVER_W} height={COVER_H} loading="lazy" className="size-full object-cover" />
          ) : (
            <ClothCover book={book} ink={ink} />
          )}
          <span className="absolute inset-0" style={{ backgroundImage: HINGE }} />
        </motion.div>
        <motion.div
          initial={false}
          animate={
            active
              ? { opacity: 1, y: 0, transition: captionIn }
              : { opacity: 0, y: -4, transition: captionOut }
          }
          className="mt-2.5 rounded-md bg-popover/95 px-2.5 py-2 text-xs leading-snug shadow-sm ring-1 ring-foreground/10"
        >
          <p className="font-medium text-popover-foreground">{book.title}</p>
          {authors && <p className="text-muted-foreground">{authors}</p>}
          {(dates || book.rating) && (
            <p className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span>{dates}</span>
              {book.rating && (
                <span className="tracking-[0.15em] text-foreground/45">
                  {"★".repeat(book.rating)}
                  <span className="text-foreground/15">{"★".repeat(5 - book.rating)}</span>
                </span>
              )}
            </p>
          )}
        </motion.div>
      </div>
    </li>
  );
}

// A typeset front for a book whose catalog has no cover: the spine's cloth,
// a blind-stamped frame, the title, a rule, and the authors at the foot.
function ClothCover({ book, ink }: { book: Book; ink: string }) {
  return (
    <div className="relative flex size-full flex-col px-5 pt-7 pb-6" style={{ color: ink, backgroundImage: WEAVE }}>
      <span className="absolute inset-[9px] rounded-[1px] border border-current opacity-30" />
      <span className="text-[17px] leading-[1.12] font-light tracking-[-0.02em] text-balance">{book.title}</span>
      <span className="mt-3.5 h-px w-6 bg-current opacity-50" />
      <span className="mt-auto text-[8.5px] leading-snug tracking-[0.14em] uppercase opacity-75">
        {book.authors.join(" & ")}
      </span>
    </div>
  );
}
