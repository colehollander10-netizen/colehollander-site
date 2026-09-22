import { OrderDeskLink } from "@/components/order-desk-link";
import { Portrait } from "@/components/portrait";
import { Profiles } from "@/components/profiles";
import { ShipEgg } from "@/components/ship-egg";
import { Toaster } from "@/components/ui/sonner";
import { AiUsage } from "@/components/ai-usage";
import { getContributions, getGitHubProfile } from "@/lib/github";
import { usageWindow } from "@/lib/usage";
import { loadUsage } from "@/lib/usage-data";

const reveal =
  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-1000 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe:fill-mode-both";

const textLink =
  "group/od rounded-sm underline decoration-foreground/25 decoration-1 underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export default async function Home() {
  const [github, contributions] = await Promise.all([
    getGitHubProfile(),
    getContributions(),
  ]);
  const usage = loadUsage();
  const usageDays = usageWindow(usage.days);
  // The page is prerendered, so this is the date of the last deploy.
  const updated = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "America/Boise",
  });

  return (
    <main className="mx-auto w-full max-w-[34rem] px-6 pt-20 pb-24 text-[15px] leading-relaxed sm:text-sm sm:pt-32">
      <header className={reveal}>
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
