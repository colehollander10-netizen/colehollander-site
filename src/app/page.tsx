import { KineticName } from "@/components/kinetic-name";
import { OrderDeskLink } from "@/components/order-flow";
import { Portrait } from "@/components/portrait";
import { Profiles } from "@/components/profiles";
import { ShipEgg } from "@/components/ship-egg";
import { Toaster } from "@/components/ui/sonner";
import { toLevels } from "@/components/heatmap";
import { AiUsage, type ModelRow } from "@/components/ai-usage";
import usage from "@/data/ai-usage.json";
import { getContributions, getGitHubProfile } from "@/lib/github";

const reveal =
  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-1000 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe:fill-mode-both";

const textLink =
  "group/od rounded-sm underline decoration-foreground/25 decoration-1 underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export default async function Home() {
  const [github, contributions] = await Promise.all([
    getGitHubProfile(),
    getContributions(),
  ]);
  const usageDays = toLevels(
    usage.days.map((d) => ({ date: d.date, value: d.codex + d.claude })),
  );
  const usageTotals = {
    codex: usage.days.reduce((n, d) => n + d.codex, 0),
    claude: usage.days.reduce((n, d) => n + d.claude, 0),
  };

  return (
    <main className="mx-auto w-full max-w-[34rem] px-6 pt-20 pb-24 text-sm leading-relaxed sm:pt-32">
      <header className={reveal}>
        <div className="mb-8">
          <Portrait />
        </div>
        <KineticName />
        <p className="mt-4 text-muted-foreground">Updated September 2026</p>
      </header>

      <section
        className={`${reveal} mt-12 space-y-4 motion-safe:delay-150`}
        aria-label="About"
      >
        <p>
          I’m an AI operations specialist at{" "}
          <OrderDeskLink className={textLink} />, where we help
          merchants automate order management across hundreds of ecommerce
          services.
        </p>
        <p>
          I test{" "}
          <AiUsage
            days={usageDays}
            totals={usageTotals}
            models={usage.models as ModelRow[]}
            since={usage.days[0]?.date ?? usage.generatedAt}
            className={textLink}
          >
            the latest AI models
          </AiUsage>{" "}
          as they come out and build the ones worth
          keeping into how Order Desk works.
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
