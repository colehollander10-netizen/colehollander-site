"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

import { ClothCover, HINGE, SpineFace } from "@/components/book-art";
import { SHELF_TITLES } from "@/lib/books/records";
import { spineColor } from "@/lib/books/spine";
import type { Book } from "@/lib/books/types";

const PAPER = "#f8f4ea";
const INK = "#2a2520";
const FADED = "#6f665b";
// Page edges: fine lines of paper.
const EDGE = `repeating-linear-gradient(90deg, #e7dfcd 0 1px, ${PAPER} 1px 3px)`;

const EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";
const EASE_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";

function formatDate(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function dateLine(book: Book): string | null {
  if (book.status === "finished" && book.finishDate) return `Finished ${formatDate(book.finishDate)}`;
  if (book.status === "in_progress" && book.startDate) return `Started ${formatDate(book.startDate)}`;
  return null;
}

function catalogLink(book: Book): { href: string; label: string } | null {
  if (!book.sourceId) return null;
  if (book.source === "openlibrary") return { href: `https://openlibrary.org/works/${book.sourceId}`, label: "Open Library" };
  if (book.source === "googlebooks") return { href: `https://books.google.com/books?id=${book.sourceId}`, label: "Google Books" };
  return null;
}

// The book's size in hand: as large as fits twice across the screen (it
// opens to a spread) and within most of its height, at a 2:3 page.
function handSize() {
  const w = Math.round(Math.min(250, (innerWidth - 24) / 2, (innerHeight * 0.8) / 1.5));
  return { w, h: Math.round(w * 1.5) };
}

// A book taken down from the shelf. It leaves as its spine, turns to show
// its cover on the way to the middle of the screen, and opens to a spread:
// a bookplate inside the cover, and the details on the first page. Putting
// it back runs the same way in reverse, to wherever the spine is now.
//
// The book is a box of faces in 3D. The spine face is the shelf's spine
// scaled up, and the box's depth is chosen so that, scaled back down and
// turned spine-out, it covers the spine on the shelf exactly.
export function OpenBook({ book, spine, onClosed }: { book: Book; spine: HTMLElement; onClosed: () => void }) {
  const [{ w, h }] = useState(handSize);
  const d = Math.round((spine.offsetWidth * h) / spine.offsetHeight);
  const backdrop = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);
  const shift = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const cover = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const putBack = useRef<HTMLButtonElement>(null);
  // Closing waits until the book is open, so a reversal never jumps; asking
  // to close while it opens puts it back as soon as it is open.
  const phase = useRef<"opening" | "open" | "closing">("opening");
  const closeAsked = useRef(false);
  const titleId = useId();

  // The book on the shelf, as a transform of the book in hand: moved to the
  // spine, scaled to its height, and turned spine-out. translateZ cancels the
  // turn's move toward the viewer, so perspective doesn't enlarge it.
  const onShelf = () => {
    const r = spine.getBoundingClientRect();
    const x = r.left + r.width / 2 - innerWidth / 2;
    const y = r.top + r.height / 2 - innerHeight / 2;
    return `translate3d(${x}px, ${y}px, 0px) scale(${r.height / h}) translateZ(${-w / 2}px) rotateY(90deg)`;
  };
  const inHand = "translate3d(0px, 0px, 0px) scale(1) translateZ(0px) rotateY(0deg)";
  const [start] = useState(onShelf);

  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const run = (el: HTMLElement | null, from: string, to: string, duration: number, easing = EASE) =>
    el?.animate([{ transform: from }, { transform: to }], { duration: reduced() ? 0 : duration, easing, fill: "forwards" })
      .finished;
  const fade = (el: HTMLElement | null, to: number, duration: number, delay = 0) =>
    el?.animate(
      { opacity: to },
      { duration: reduced() ? 0 : duration, delay: reduced() ? 0 : delay, easing: "ease-out", fill: "forwards" },
    ).finished;
  // The cover turns on the front edge of the spine.
  const hinge = (deg: number) => `translateZ(${d / 2}px) rotateY(${deg}deg)`;
  const turnCover = (open: boolean, duration: number) =>
    Promise.all([
      run(cover.current, hinge(open ? 0 : -180), hinge(open ? -180 : 0), duration, EASE_IN_OUT),
      // The spread, not the closed book, sits in the middle.
      run(shift.current, `translateX(${open ? 0 : w / 2}px)`, `translateX(${open ? w / 2 : 0}px)`, duration, EASE_IN_OUT),
      // Under the open spread only: half open, it would outline an empty page.
      open ? fade(shadow.current, 1, duration / 2, duration / 2) : fade(shadow.current, 0, duration / 3),
    ]);

  const close = async () => {
    closeAsked.current = true;
    if (phase.current !== "open") return;
    phase.current = "closing";
    await turnCover(false, 450);
    fade(backdrop.current, 0, 500);
    await run(body.current, inHand, onShelf(), 600, EASE_IN_OUT);
    onClosed();
  };

  useEffect(() => {
    let live = true;
    dialog.current?.focus({ preventScroll: true });
    (async () => {
      fade(backdrop.current, 1, 250);
      await run(body.current, start, inHand, 650);
      if (!live) return;
      await turnCover(true, 600);
      if (!live) return;
      phase.current = "open";
      if (closeAsked.current) close();
      else putBack.current?.focus({ preventScroll: true });
    })();
    return () => {
      live = false;
    };
    // Runs once: the book opens when it is taken down.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The book is sized for the screen it was taken down on, so a new screen
  // width (a phone turned sideways) puts it straight back. Height alone
  // changes when a phone's address bar shows or hides.
  const [openWidth] = useState(() => innerWidth);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => e.key === "Escape" && close();
    const resize = () => innerWidth !== openWidth && onClosed();
    document.addEventListener("keydown", escape);
    addEventListener("resize", resize);
    return () => {
      document.removeEventListener("keydown", escape);
      removeEventListener("resize", resize);
    };
  });

  // Tab stays inside the open book.
  const trapTab = (e: ReactKeyboardEvent) => {
    if (e.key !== "Tab") return;
    const stops = [...(dialog.current?.querySelectorAll<HTMLElement>("a[href], button") ?? [])];
    const [first, last] = [stops[0], stops.at(-1)];
    const at = document.activeElement;
    if (e.shiftKey && (at === first || at === dialog.current)) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && (at === last || at === dialog.current)) {
      e.preventDefault();
      first?.focus();
    }
  };

  const color = spineColor(book);
  const image = book.coverCachedPath ?? book.coverUrl;
  const authors = book.authors.join(", ");
  const meta = [book.year, book.pages && `${book.pages} pages`].filter(Boolean).join(" · ");
  const dates = dateLine(book);
  const link = catalogLink(book);
  const face = "absolute [backface-visibility:hidden]";

  return (
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDown={trapTab}
      className="fixed inset-0 z-50 outline-none"
      style={{ perspective: 2000 }}
    >
      <div ref={backdrop} onClick={close} className="absolute inset-0 bg-background/85 opacity-0" />
      {/* The open spread's shadow. It is drawn flat, behind the book: a
          shadow on a face of the book makes Chrome draw the faces in the
          wrong order. */}
      <div
        ref={shadow}
        className="pointer-events-none absolute top-1/2 left-1/2 rounded-[3px] opacity-0 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.5)]"
        style={{ width: 2 * w, height: h - 8, marginLeft: -w, marginTop: -(h - 8) / 2 }}
      />
      <div ref={shift} className="absolute top-1/2 left-1/2" style={{ transformStyle: "preserve-3d" }}>
        <div
          ref={body}
          className="absolute"
          style={{ width: w, height: h, left: -w / 2, top: -h / 2, transformStyle: "preserve-3d", transform: start }}
        >
          <div className={face} style={{ inset: 0, background: color, transform: `rotateY(180deg) translateZ(${d / 2}px)` }} />
          <div
            className={`${face} top-0 overflow-hidden`}
            style={{ width: d, height: h, left: (w - d) / 2, transform: `rotateY(-90deg) translateZ(${w / 2}px)` }}
          >
            <div
              style={{
                width: spine.offsetWidth,
                height: spine.offsetHeight,
                transform: `scale(${h / spine.offsetHeight})`,
                transformOrigin: "0 0",
              }}
            >
              <SpineFace book={book} />
            </div>
          </div>
          <div
            className={face}
            style={{ width: d, height: h - 6, top: 3, left: (w - d) / 2, background: EDGE, transform: `rotateY(90deg) translateZ(${w / 2 - 2}px)` }}
          />
          {[90, -90].map((turn) => (
            <div
              key={turn}
              className={face}
              style={{ width: w - 4, height: d, left: 0, top: (h - d) / 2, background: EDGE, transform: `rotateX(${turn}deg) translateZ(${h / 2 - 2}px)` }}
            />
          ))}

          {/* The first page, under the cover. */}
          <div
            className={`${face} overflow-y-auto rounded-r-[3px] [container-type:inline-size]`}
            style={{ width: w - 3, height: h - 8, top: 4, left: 0, background: PAPER, color: INK, transform: `translateZ(${d / 2 - 2}px)` }}
          >
            <div className="flex min-h-full flex-col p-[9cqw] text-[max(11px,5.6cqw)] leading-snug">
              <p className="flex items-center gap-[0.5em] text-[0.8em] tracking-[0.12em] uppercase" style={{ color: FADED }}>
                <span className="size-[0.6em] rounded-full" style={{ background: color }} />
                {SHELF_TITLES[book.status]}
              </p>
              <h2 id={titleId} className="mt-[6cqw] text-[1.8em] leading-[1.06] font-light tracking-[-0.03em] text-balance">
                {book.title}
              </h2>
              {authors && <p className="mt-[3cqw]">{authors}</p>}
              {meta && (
                <p className="mt-[1cqw] text-[0.9em] tabular-nums" style={{ color: FADED }}>
                  {meta}
                </p>
              )}
              <div className="mt-auto pt-[6cqw]">
                {(dates || book.rating) && (
                  <p className="flex items-center justify-between gap-2 border-t border-[#2a2520]/15 pt-[3cqw] text-[0.9em]" style={{ color: FADED }}>
                    <span>{dates}</span>
                    {book.rating && (
                      <span aria-label={`Rated ${book.rating} of 5`} className="tracking-[0.15em] text-[#2a2520]/60">
                        {"★".repeat(book.rating)}
                        <span className="text-[#2a2520]/15">{"★".repeat(5 - book.rating)}</span>
                      </span>
                    )}
                  </p>
                )}
                <div className="mt-[5cqw] flex flex-wrap items-center justify-between gap-2">
                  {link && (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-sm text-[0.9em] underline decoration-[#2a2520]/30 underline-offset-4 hover:decoration-[#2a2520] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2a2520]"
                    >
                      {link.label} ↗
                    </a>
                  )}
                  <button
                    ref={putBack}
                    type="button"
                    onClick={close}
                    className="ml-auto flex cursor-pointer items-center gap-[0.5em] rounded-full px-[1em] py-[0.45em] text-[0.9em] transition-transform active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2a2520]"
                    style={{ background: INK, color: PAPER }}
                  >
                    Put it back
                    <kbd className="hidden rounded-[3px] bg-white/15 px-[0.35em] font-sans text-[0.8em] sm:inline">Esc</kbd>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* The front cover, hinged at the spine. Inside it, a bookplate. */}
          <div
            ref={cover}
            className="absolute inset-0 [container-type:inline-size]"
            style={{ transformStyle: "preserve-3d", transformOrigin: "left center", transform: hinge(0) }}
          >
            <div
              className={`${face} inset-0 overflow-hidden rounded-r-[3px] text-[max(9px,6cqw)]`}
              style={{ background: color }}
            >
              {image ? (
                <Image src={image} alt="" width={w} height={h} loading="eager" className="size-full object-cover" />
              ) : (
                <ClothCover book={book} />
              )}
              <span className="absolute inset-0" style={{ backgroundImage: HINGE }} />
            </div>
            <div
              className={`${face} inset-0 flex items-center justify-center rounded-l-[3px]`}
              style={{
                background: `color-mix(in oklab, ${color} 22%, ${PAPER})`,
                transform: "rotateY(180deg)",
              }}
            >
              <div
                className="w-[68%] rounded-[2px] px-[6cqw] py-[9cqw] text-center text-[max(9px,4.6cqw)] shadow-[0_1px_3px_rgb(0_0_0/0.12)] ring-1 ring-black/10"
                style={{ background: PAPER, color: INK }}
              >
                <p className="text-[0.85em] tracking-[0.2em] uppercase" style={{ color: FADED }}>
                  Ex libris
                </p>
                <p className="mt-[3cqw] text-[1.55em] leading-tight font-light tracking-[-0.02em]">Cole Hollander</p>
                <span className="mx-auto mt-[4cqw] block h-px w-[20%] bg-[#2a2520]/25" />
                <p className="mt-[3cqw] text-[0.85em] tabular-nums" style={{ color: FADED }}>
                  No. {book.id}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
