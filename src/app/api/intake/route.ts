import { timingSafeEqual } from "node:crypto";

import { revalidatePath } from "next/cache";

import { keepIntakePhoto, photoToJpeg, prepareCover, saveCoverToBlob } from "@/lib/books/covers";
import { boiseToday, intakeChoice, IntakeError, intakePhoto, type IntakeDeps } from "@/lib/books/intake";
import { resolveGuess } from "@/lib/books/lookup";
import { getStore } from "@/lib/books/store";
import { recognizerFromEnv } from "@/lib/books/vision";

// The bot posts a cover photo here (see the README). A photo is either a
// multipart `image` file or an `image_url`, with an optional `caption`. A
// reply to a list of candidates is JSON: { "intake_id": 12, "choice": 2 }
// or { "intake_id": 12, "choice": "none" }.

const json = (body: object, status = 200) => Response.json(body, { status });

function authorized(header: string | null, token: string): boolean {
  const given = Buffer.from(header?.replace(/^Bearer\s+/i, "") ?? "");
  const want = Buffer.from(token);
  return given.length === want.length && timingSafeEqual(given, want);
}

type Body = { image?: Blob; imageUrl?: string; caption?: string; intakeId?: number; choice?: string | number };

async function readBody(request: Request): Promise<Body> {
  if (request.headers.get("content-type")?.startsWith("multipart/form-data")) {
    const form = await request.formData();
    const image = form.get("image");
    return {
      image: image instanceof Blob ? image : undefined,
      imageUrl: form.get("image_url")?.toString(),
      caption: form.get("caption")?.toString(),
    };
  }
  const body = await request.json().catch(() => {
    throw new IntakeError(400, "Send multipart form data or a JSON body.");
  });
  return {
    imageUrl: body.image_url,
    caption: body.caption,
    intakeId: body.intake_id === undefined ? undefined : Number(body.intake_id),
    choice: body.choice,
  };
}

async function photoBytes(body: Body): Promise<Buffer> {
  if (body.image) return Buffer.from(await body.image.arrayBuffer());
  if (!body.imageUrl) throw new IntakeError(400, "Send an image file, an image_url, or an intake_id with a choice.");
  const res = await fetch(body.imageUrl);
  if (!res.ok) throw new IntakeError(400, `Could not download image_url (${res.status}).`);
  return Buffer.from(await res.arrayBuffer());
}

export async function POST(request: Request) {
  const token = process.env.INTAKE_TOKEN;
  if (!token) return json({ error: "Intake is off: INTAKE_TOKEN is not set." }, 503);
  if (!authorized(request.headers.get("authorization"), token)) return json({ error: "Unauthorized." }, 401);
  const db = getStore();
  if (!db) return json({ error: "Intake is off: BOOKS_DATABASE_URL is not set." }, 503);

  try {
    const deps: IntakeDeps = {
      store: await db,
      recognizer: recognizerFromEnv(),
      resolve: (guess) => resolveGuess(guess),
      prepareCover: (c) => prepareCover(c, saveCoverToBlob),
      today: boiseToday,
    };
    const body = await readBody(request);

    let result;
    if (body.intakeId !== undefined) {
      const choice = String(body.choice).trim().toLowerCase() === "none" ? "none" : Number(body.choice);
      if (choice !== "none" && !Number.isInteger(choice)) {
        throw new IntakeError(400, 'choice must be a number from the list, or "none".');
      }
      result = await intakeChoice(deps, { intakeId: body.intakeId, choice });
    } else {
      const jpeg = await photoToJpeg(await photoBytes(body)).catch((e) => {
        throw e instanceof IntakeError ? e : new IntakeError(415, "That file is not an image I can read.");
      });
      result = await intakePhoto(deps, {
        image: { data: jpeg, mediaType: "image/jpeg" },
        imageRef: body.imageUrl ?? (await keepIntakePhoto(jpeg)),
        caption: body.caption?.trim() || null,
      });
    }

    if (result.book) revalidatePath("/books");
    return json(result, result.status === "error" ? 502 : 200);
  } catch (e) {
    if (e instanceof IntakeError) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: "Intake failed." }, 500);
  }
}
