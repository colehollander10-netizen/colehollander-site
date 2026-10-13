import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

import type { Guess } from "./types";

export type CoverImage = { data: Buffer; mediaType: "image/jpeg" };

// Reads a photo of a book cover. Providers are picked by VISION_PROVIDER.
export interface CoverRecognizer {
  recognize(image: CoverImage): Promise<Guess>;
}

const CoverReading = z.object({
  title: z.string(),
  authors: z.array(z.string()),
  isbn: z.string().nullable(),
  publisher: z.string().nullable(),
  confidence: z.number(),
});

const PROMPT = `This photo should show the front cover of a book. Read it.
- title: the main title as printed, without the subtitle.
- authors: each author's name as printed. Leave out "foreword by" names.
- isbn: only if an ISBN is printed and fully legible, else null.
- publisher: the publisher or imprint if printed (e.g. "Penguin Classics"), else null.
- confidence: from 0 to 1, how sure you are that the title and authors are right. Use a low number if the photo is blurry, cropped, or not a book cover; use 0 if there is no book.`;

function anthropicRecognizer(): CoverRecognizer {
  const client = new Anthropic();
  const model = process.env.VISION_MODEL || "claude-opus-5-5";
  return {
    async recognize(image) {
      const response = await client.beta.messages.parse({
        model,
        max_tokens: 2000,
        // Reading a cover is a short extraction; low effort keeps the bot fast.
        output_config: { effort: "low", format: betaZodOutputFormat(CoverReading) },
        // On a policy decline, the API retries on a fallback model it picks.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: image.mediaType, data: image.data.toString("base64") },
              },
              { type: "text", text: PROMPT },
            ],
          },
        ],
      });
      if (response.stop_reason === "refusal" || !response.parsed_output) {
        throw new Error(`Vision model returned no reading (${response.stop_reason})`);
      }
      return response.parsed_output;
    },
  };
}

export function recognizerFromEnv(): CoverRecognizer {
  const provider = process.env.VISION_PROVIDER || "anthropic";
  if (provider === "anthropic") return anthropicRecognizer();
  throw new Error(`Unknown VISION_PROVIDER "${provider}"`);
}
