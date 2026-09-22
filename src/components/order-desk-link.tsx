import Image from "next/image";

import { Otto } from "@/components/otto";

export function OrderDeskLink({ className }: { className: string }) {
  return (
    <a href="https://www.orderdesk.com" className={`${className} relative`}>
      {/* Otto peeks over the link on hover or focus. Leaving drops him back
          faster than he rose, so a passing cursor never leaves him hanging. */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-0 bottom-full h-5 w-[22px] overflow-hidden"
      >
        <span className="block translate-y-full transition-transform duration-150 ease-out group-hover/od:translate-y-0 group-hover/od:delay-100 group-hover/od:duration-300 group-hover/od:ease-[cubic-bezier(0.23,1,0.32,1)] group-focus-visible/od:translate-y-0 motion-reduce:transition-none">
          <Otto armClassName="group-hover/od:animate-[otto-wave_480ms_ease-in-out_300ms_3]" />
        </span>
      </span>
      {/* Once he is up, Otto hints at the easter egg in ship-egg.tsx. */}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-full left-full mb-2.5 ml-0.5 rounded-md bg-popover px-1.5 py-1 text-[10px] leading-none whitespace-nowrap text-muted-foreground no-underline opacity-0 shadow-sm ring-1 ring-foreground/10 transition-opacity duration-100 group-hover/od:opacity-100 group-hover/od:delay-500 group-hover/od:duration-200 group-focus-visible/od:opacity-100"
      >
        type “ship”
      </span>
      <Image
        src="/orderdesk-mark.png"
        alt=""
        width={14}
        height={14}
        className="mr-1 inline-block size-3.5 -translate-y-px rounded-[3px] transition-transform duration-500 ease-out group-hover/od:rotate-[360deg] motion-reduce:transition-none"
        priority
      />
      Order Desk
    </a>
  );
}
