import { createHash } from "node:crypto";

import { put } from "@vercel/blob";
import sharp from "sharp";

import { dominantColor } from "./color";
import type { Candidate } from "./types";

// Downloads a catalog cover. Open Library answers a missing cover with a
// blank 1px image unless told not to, so a missing cover is null here.
async function downloadCover(url: string): Promise<Buffer | null> {
  const res = await fetch(url.includes("openlibrary.org") ? `${url}?default=false` : url);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  const { width = 0 } = await sharp(buf).metadata();
  return width > 10 ? buf : null;
}

// A 400px-wide JPEG: sharp at the size the shelf shows it, small to serve.
function resizeCover(buf: Buffer): Promise<Buffer> {
  return sharp(buf).resize({ width: 400, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
}

async function spineColorOf(buf: Buffer): Promise<string> {
  const pixels = await sharp(buf).resize(24, 36, { fit: "fill" }).removeAlpha().raw().toBuffer();
  return dominantColor(pixels);
}

type SaveCover = (name: string, jpeg: Buffer) => Promise<string | null>;

// Cover URL, cached copy, and spine color for a matched book. Books whose
// catalog has no cover get nulls, and the shelf draws a plain spine.
export async function prepareCover(c: Candidate, save: SaveCover) {
  const raw = c.coverUrl ? await downloadCover(c.coverUrl) : null;
  if (!raw) return { coverUrl: null, coverCachedPath: null, spineColor: null };
  const jpeg = await resizeCover(raw);
  return {
    coverUrl: c.coverUrl,
    coverCachedPath: await save(`${c.source}-${c.sourceId}`, jpeg),
    spineColor: await spineColorOf(jpeg),
  };
}

// Caches a copy in Vercel Blob when BLOB_READ_WRITE_TOKEN is set, and
// returns its public URL; otherwise the shelf shows the catalog's URL.
export const saveCoverToBlob: SaveCover = async (name, jpeg) => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  const blob = await put(`books/covers/${name}.jpg`, jpeg, {
    access: "public",
    contentType: "image/jpeg",
    allowOverwrite: true,
  });
  return blob.url;
};

// What intake_log records for an uploaded photo: a Blob URL when Blob is
// configured, otherwise the photo's hash.
export async function keepIntakePhoto(jpeg: Buffer): Promise<string> {
  const hash = createHash("sha256").update(jpeg).digest("hex");
  if (!process.env.BLOB_READ_WRITE_TOKEN) return `sha256:${hash}`;
  const blob = await put(`books/intake/${hash}.jpg`, jpeg, {
    access: "public",
    contentType: "image/jpeg",
    allowOverwrite: true,
  });
  return blob.url;
}

// Photos arrive as JPEG, PNG, WebP…; the vision model gets a JPEG no larger
// than it needs, turned upright from the camera's EXIF orientation.
export function photoToJpeg(buf: Buffer): Promise<Buffer> {
  return sharp(buf)
    .rotate()
    .resize({ width: 1568, height: 1568, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
}
