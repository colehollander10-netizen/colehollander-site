import { OrderDeskLink } from "@/components/order-desk-link";
import { Portrait } from "@/components/portrait";
import { Profiles } from "@/components/profiles";
import { ShipEgg } from "@/components/ship-egg";
import { Toaster } from "@/components/ui/sonner";
import { AiUsage } from "@/components/ai-usage";
import { ReadingStrip } from "@/components/reading-strip";
import { SiteNav } from "@/components/site-nav";

import { readingStrip } from "@/lib/books/records";
import { loadBooks } from "@/lib/books/store";
import { getContributions, getGitHubProfile } from "@/lib/github";
import { reveal, textLink } from "@/lib/styles";
import { usageWindow } from "@/lib/usage";
import { loadUsage } from "@/lib/usage-data";

export default async function Home() {
  const [github, contributions, books] = await Promise.all([
    getGitHubProfile(),
    getContributions(),
    loadBooks(),
  ]);
  const usage = loadUsage();
  const usageDays = usageWindow(usage.days);
  // The page is prerendered, so this is the date of the last deploy. The
  // reading strip is from then too; /books itself updates within a minute.
  const updated = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "America/Boise",
  });

  return (
    <main className="mx-auto w-full max-w-[34rem] px-6 pt-20 pb-24 text-[15px] leading-relaxed sm:text-sm sm:pt-32">
      <header className={reveal}>
        <div className="mb-10">
          <SiteNav current="/" />
        </div>
        <div className="mb-8">
          <Portrait />
        </div>
        <h1 className="-ml-[0.04em] text-[clamp(2.5rem,11vw,3.75rem)] leading-[0.95] font-light tracking-[-0.045em]">
          Cole Hollander
        </h1>
        <p className="mt-4 text-muted-foreground">Updated {updated}</p>
      </header>

      <section
        className={`${reveal} mt-12 space-y-4 motion-safe:delay-150`}
        aria-label="About"
      >
        <p>
          I’m an AI Operations Specialist at{" "}
          <OrderDeskLink className={textLink} />, where we help
          merchants automate order management across hundreds of ecommerce
          services.
        </p>
        <p>
          I test{" "}
          <AiUsage
            days={usageDays}
            models={usage.models}
            className={textLink}
          >
            new AI models
          </AiUsage>{" "}
          and build practical tools that help the Order Desk team work faster.
        </p>
        <ReadingStrip books={readingStrip(books)} />
        <p>
          You can find me on{" "}
          <Profiles
            github={github}
            contributions={contributions}
            linkClassName={textLink}
          />
        </p>
      </section>

      <ShipEgg />
      <Toaster position="bottom-center" />
    </main>
  );
}
