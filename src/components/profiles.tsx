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
import type { GitHubProfile } from "@/lib/github";

const LANGUAGE_COLORS: Record<string, string> = {
  Swift: "#F05138",
  TypeScript: "#3178C6",
  JavaScript: "#F1E05A",
  Python: "#3572A5",
};

function Profile({
  href,
  label,
  icon,
  className,
  children,
  iconOnly = false,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  className: string;
  children: ReactNode;
  iconOnly?: boolean;
}) {
  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <a
          href={href}
          aria-label={iconOnly ? label : undefined}
          className={`${className} whitespace-nowrap`}
        >
          <span
            className={`${iconOnly ? "mx-0.5 size-4 [&>svg]:size-4" : "mr-1 size-3.5 [&>svg]:size-3.5"} inline-flex -translate-y-px align-middle transition-[transform,opacity] duration-500 ease-out group-hover/od:rotate-[360deg] motion-reduce:transition-none`}
          >
            {icon}
          </span>
          {!iconOnly && label}
        </a>
      </HoverCardTrigger>
      <HoverCardContent side="top" sideOffset={8} className="w-72 p-0">
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
  linkClassName,
}: {
  github: GitHubProfile;
  linkClassName: string;
}) {
  const githubUrl = `https://github.com/${github.login}`;

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
        icon={<FaGithub aria-hidden />}
        className={linkClassName}
      >
        <div className="p-4">
          <Header
            avatar={github.avatar}
            name={github.name}
            handle={`@${github.login}`}
            icon={<FaGithub aria-hidden />}
          />
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {github.bio}
          </p>
        </div>
        <ul className="border-t border-border">
          {github.repos.map((repo) => (
            <li key={repo.name}>
              <a
                href={`${githubUrl}/${repo.name}`}
                className="block px-4 py-2 text-xs transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              >
                <span className="flex items-center gap-2">
                  <span className="font-medium">{repo.name}</span>
                  {repo.language && (
                    <span className="ml-auto flex items-center gap-1 text-muted-foreground">
                      <span
                        className="size-2 rounded-full"
                        style={{
                          background:
                            LANGUAGE_COLORS[repo.language] ?? "currentColor",
                        }}
                      />
                      {repo.language}
                    </span>
                  )}
                </span>
                {repo.description && (
                  <span className="mt-0.5 block truncate text-muted-foreground">
                    {repo.description}
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>
        <div className="border-t border-border px-4 pb-4">
          <Visit href={githubUrl}>
            {github.publicRepos} public repos on GitHub
          </Visit>
        </div>
      </Profile>
      .
    </>
  );
}
