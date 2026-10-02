"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { ArrowUpRight, MapPin } from "lucide-react";
import { FaGithub, FaLinkedin, FaXTwitter } from "react-icons/fa6";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { GitHubActivity } from "@/components/ui/github-activity";
import type { Contributions, GitHubProfile } from "@/lib/github";

const GITHUB_GREENS: [string, string, string, string, string] = [
  "var(--heat-0)",
  "#9be9a8",
  "#40c463",
  "#30a14e",
  "#216e39",
];

const GITHUB_MONTHS = 5;
// Matches the component's own month-to-week math, so the total covers what it draws.
const GITHUB_WEEKS = Math.ceil((GITHUB_MONTHS * 365.25) / 12 / 7);

function Profile({
  href,
  label,
  icon,
  className,
  children,
  iconOnly = false,
  cardClassName = "w-72",
}: {
  href: string;
  label: string;
  icon: ReactNode;
  className: string;
  children?: ReactNode;
  iconOnly?: boolean;
  cardClassName?: string;
}) {
  const link = (
    <a
      href={href}
      aria-label={iconOnly ? label : undefined}
      // Icon-only links are 20×18; pad the hit area to 24×42 for thumbs
      // without touching the neighbors across the comma.
      className={`${className} whitespace-nowrap ${iconOnly ? "relative after:absolute after:-inset-x-0.5 after:-inset-y-3" : ""}`}
    >
      <span
        className={`${iconOnly ? "mx-0.5 size-4 [&>svg]:size-4" : "mr-1 size-3.5 [&>svg]:size-3.5"} inline-flex -translate-y-px align-middle transition-[transform,opacity] duration-500 ease-out group-hover/od:rotate-[360deg] motion-reduce:transition-none`}
      >
        {icon}
      </span>
      {!iconOnly && label}
    </a>
  );

  if (children == null) return link;

  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>{link}</HoverCardTrigger>
      <HoverCardContent
        side="top"
        sideOffset={8}
        collisionPadding={8}
        className={`${cardClassName} p-0`}
      >
        {children}
      </HoverCardContent>
    </HoverCard>
  );
}

function Header({
  avatar,
  name,
  handle,
  icon,
}: {
  avatar: string;
  name: string;
  handle: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <Image
        src={avatar}
        alt=""
        width={40}
        height={40}
        className="size-10 rounded-full object-cover ring-1 ring-foreground/10"
      />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="font-medium">{name}</p>
        <p className="truncate text-muted-foreground">{handle}</p>
      </div>
      <span className="text-muted-foreground [&>svg]:size-4">{icon}</span>
    </div>
  );
}

function Visit({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="mt-4 flex items-center justify-center gap-1 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    >
      {children}
      <ArrowUpRight aria-hidden className="size-3" />
    </a>
  );
}

const X_URL = "https://x.com/colehollander10";
const LINKEDIN_URL = "https://www.linkedin.com/in/cole-hollander-gt5";

export function Profiles({
  github,
  contributions,
  linkClassName,
}: {
  github: GitHubProfile;
  contributions: Contributions;
  linkClassName: string;
}) {
  const githubUrl = `https://github.com/${github.login}`;
  // The calendar starts on a Sunday, so whole weeks from the end keep columns aligned.
  const weeks = Math.ceil(contributions.days.length / 7);
  const recent = contributions.days.slice(Math.max(0, weeks - GITHUB_WEEKS) * 7);
  const total = recent.reduce((sum, d) => sum + d.count, 0);

  return (
    <>
      <Profile
        href={X_URL}
        label="X"
        iconOnly
        icon={<FaXTwitter aria-hidden />}
        className={linkClassName}
      >
        <div className="p-4">
          <Header
            avatar="/cole.jpg"
            name="Cole Hollander"
            handle="@colehollander10"
            icon={<FaXTwitter aria-hidden />}
          />
          <Visit href={X_URL}>Follow on X</Visit>
        </div>
      </Profile>
      ,{" "}
      <Profile
        href={LINKEDIN_URL}
        label="LinkedIn"
        iconOnly
        icon={<FaLinkedin aria-hidden />}
        className={linkClassName}
      >
        <div className="p-4">
          <Header
            avatar="/cole.jpg"
            name="Cole Hollander"
            handle="in/cole-hollander-gt5"
            icon={<FaLinkedin aria-hidden />}
          />
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Image
              src="/orderdesk-mark.png"
              alt=""
              width={12}
              height={12}
              className="size-3"
            />
            Order Desk
            <span aria-hidden>·</span>
            <MapPin aria-hidden className="size-3" />
            {github.location}
          </div>
          <Visit href={LINKEDIN_URL}>Connect on LinkedIn</Visit>
        </div>
      </Profile>
      , and{" "}
      <Profile
        href={githubUrl}
        label="GitHub"
        iconOnly
        cardClassName="w-auto"
        icon={<FaGithub aria-hidden />}
        className={linkClassName}
      >
        {recent.length > 0 ? (
          <GitHubActivity
            contributions={recent}
            repos={contributions.repos}
            months={GITHUB_MONTHS}
            accent={GITHUB_GREENS}
            showMonths
            heading={`${total} contributions in the last ${GITHUB_MONTHS} months`}
            label="Most pushes lately:"
            className="rounded-none bg-transparent dark:bg-transparent"
          />
        ) : null}
      </Profile>
      .
    </>
  );
}
